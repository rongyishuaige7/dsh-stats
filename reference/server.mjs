// DSH 项目统计面板 — 独立自托管后端
//
// 只读 DSH 落盘数据，不修改任何 DSH 文件，不依赖 DSH 运行：
//   - ~/.dsh/storages/workspace.json         项目(工作区)清单 + 会话 ID
//   - ~/.dsh/storages/session_projcache.json 每个会话的 sessionStats / tokenUsage 聚合
//   - ~/.dsh/sessions/<path>/<id>/session.jsonl.zstd 完整事件流(带 time/time0 时间戳)
//
// 用法: node server.mjs [--port 4173]
// 端点: GET /           → 静态前端
//       GET /api/stats  → 聚合 JSON (?days=7|30|90|all，默认 30)

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { zstdDecompressSync } from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || parseArg("--port") || 4173);
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), ".dsh");
const SESSIONS_DIR = path.join(DSH_HOME, "sessions");
const WORKSPACE_FILE = path.join(DSH_HOME, "storages", "workspace.json");
const PROJCACHE_FILE = path.join(DSH_HOME, "storages", "session_projcache.json");

const SLOT_MINUTES = 30;
const SLOT_MS = SLOT_MINUTES * 60 * 1000;
const GAP_MS = 10 * 60 * 1000;      // 两次活动间隔超过 10 分钟视为断档
const MIN_INTERVAL_MS = 60 * 1000;  // 孤立事件也计 1 分钟活动

function parseArg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// ---------------------------------------------------------------------------
// Zstandard 多帧容器解码
// ---------------------------------------------------------------------------
const ZSTD_MAGIC = 4247762216;

function scanZstdFrames(buffer) {
  const frames = [];
  let offset = 0;
  while (offset < buffer.length) {
    const start = offset;
    if (buffer.length - offset < 4) break;
    if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) {
      throw new Error("corrupt Zstandard session log: invalid frame magic");
    }
    offset += 4;
    const descriptor = buffer.readUInt8(offset);
    offset += 1;
    const contentSizeFlag = descriptor >>> 6;
    const singleSegment = (descriptor & 32) !== 0;
    const checksum = (descriptor & 4) !== 0;
    const dictionaryFlag = descriptor & 3;
    const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
    const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : (1 << contentSizeFlag);
    offset += (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
    for (;;) {
      const blockHeader = buffer.readUIntLE(offset, 3);
      offset += 3;
      const lastBlock = (blockHeader & 1) !== 0;
      const blockType = (blockHeader >>> 1) & 3;
      const blockSize = blockHeader >>> 3;
      offset += blockType === 1 ? 1 : blockSize;
      if (lastBlock) break;
    }
    if (checksum) offset += 4;
    frames.push({ start, end: offset });
  }
  return frames;
}

const TIME_RE = /"(time|time0)":(\d+)/g;

// 解码一个会话的完整事件流，返回全部时间戳(epoch ms，升序)。
// 结果按文件 mtime 缓存，避免每次请求重复解码。
const timelineCache = new Map(); // sessionId -> { mtimeMs, times }

function sessionTimes(sessionId) {
  // 定位会话文件：sessions/<encoded-workspace>/<sessionId>/session.jsonl.zstd
  let file = null;
  try {
    for (const enc of fs.readdirSync(SESSIONS_DIR)) {
      const candidate = path.join(SESSIONS_DIR, enc, sessionId, "session.jsonl.zstd");
      if (fs.existsSync(candidate)) { file = candidate; break; }
    }
  } catch {
    /* sessions dir 不存在 */
  }
  if (!file) return [];
  const mtimeMs = fs.statSync(file).mtimeMs;
  const cached = timelineCache.get(sessionId);
  if (cached && cached.mtimeMs === mtimeMs) return cached.times;

  const buf = fs.readFileSync(file);
  const frames = scanZstdFrames(buf);
  const times = [];
  for (const frame of frames) {
    const text = zstdDecompressSync(buf.subarray(frame.start, frame.end)).toString("utf8");
    TIME_RE.lastIndex = 0;
    let m;
    while ((m = TIME_RE.exec(text)) !== null) times.push(Number(m[2]));
  }
  times.sort((a, b) => a - b);
  timelineCache.set(sessionId, { mtimeMs, times });
  return times;
}

// ---------------------------------------------------------------------------
// 数据读取
// ---------------------------------------------------------------------------
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function localDayKey(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function minutesOfDay(ms) {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

function dayStart(dayKey) {
  return new Date(`${dayKey}T00:00:00`).getTime();
}

// 把一段活跃区间 [startMs, endMs] 按 30 分钟绝对槽切成时长，累计进 map。
function addIntervalToSlots(map, startMs, endMs) {
  const startSlot = Math.floor(startMs / SLOT_MS);
  const endSlot = Math.floor(endMs / SLOT_MS);
  for (let k = startSlot; k <= endSlot; k++) {
    const overlap = Math.min(endMs, (k + 1) * SLOT_MS) - Math.max(startMs, k * SLOT_MS);
    if (overlap > 0) map.set(k, (map.get(k) || 0) + overlap);
  }
}

// 从事件时间戳提取活跃区间(相邻事件间隔 <= GAP_MS 归为同一段)。
function activityIntervals(times) {
  if (!times.length) return [];
  const intervals = [];
  let s = times[0];
  let last = times[0];
  for (let i = 1; i < times.length; i++) {
    const t = times[i];
    if (t - last <= GAP_MS) {
      last = t;
    } else {
      intervals.push([s, last]);
      s = last = t;
    }
  }
  intervals.push([s, last]);
  // 展开成 >= MIN_INTERVAL_MS 的时长(孤立事件也可见)
  return intervals.map(([a, b]) => [a, Math.max(b, a + MIN_INTERVAL_MS)]);
}

// ---------------------------------------------------------------------------
// 聚合
// ---------------------------------------------------------------------------
function emptyStats() {
  return {
    turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0,
    decodeMs: 0, decodeTokens: 0,
    uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0,
  };
}

function deriveStats(s) {
  const inputTokens = s.uncachedInputTokens + s.cacheReadTokens + s.cacheWriteTokens;
  return {
    ...s,
    inputTokens,
    cacheHitPct: inputTokens > 0 ? Math.round((s.cacheReadTokens / inputTokens) * 100) : null,
    tps: s.decodeMs > 0 ? s.decodeTokens / (s.decodeMs / 1000) : null,
    ttftAvgMs: s.ttftSteps > 0 ? s.ttftMs / s.ttftSteps : null,
  };
}

function addStats(a, b) {
  for (const k of Object.keys(emptyStats())) a[k] += b[k];
}

function buildStats() {
  const workspaces = readJson(WORKSPACE_FILE)?.tables?.workspaces ?? {};
  const projcache = readJson(PROJCACHE_FILE)?.tables?.sessions ?? {};

  const projects = [];
  const sessionsById = {};

  for (const [wsId, ws] of Object.entries(workspaces)) {
    const sessionsDetail = [];
    const agg = emptyStats();
    let firstActiveAt = null;
    let lastActiveAt = null;

    for (const sessionId of ws.sessionIds ?? []) {
      const entry = projcache[sessionId];
      const rows = entry?.rows ?? {};
      const statsRow = rows.sessionStats?.val;
      const usage = rows.tokenUsage?.val?.totals ?? {};
      const identity = entry?.identity ?? {};
      const meta = rows.sessionListMetadata?.val ?? {};

      const sessionStats = {
        id: sessionId,
        title: rows.title?.val ?? null,
        createdAt: identity.createdAt ?? null,
        lastPromptAt: meta.lastPromptAt ?? null,
        stats: deriveStats({
          turns: statsRow?.turns ?? 0,
          steps: statsRow?.steps ?? 0,
          llmMs: statsRow?.llmMs ?? 0,
          toolMs: statsRow?.toolMs ?? 0,
          ttftMs: statsRow?.ttftMs ?? 0,
          ttftSteps: statsRow?.ttftSteps ?? 0,
          decodeMs: statsRow?.decodeMs ?? 0,
          decodeTokens: statsRow?.decodeTokens ?? 0,
          uncachedInputTokens: usage.uncachedInputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          cacheReadTokens: usage.cacheReadTokens ?? 0,
          cacheWriteTokens: usage.cacheWriteTokens ?? 0,
        }),
      };
      sessionsDetail.push(sessionStats);
      sessionsById[sessionId] = { wsId, ...sessionStats };

      addStats(agg, sessionStats.stats);
      if (identity.createdAt != null && (firstActiveAt == null || identity.createdAt < firstActiveAt)) {
        firstActiveAt = identity.createdAt;
      }
      if (meta.lastPromptAt != null && (lastActiveAt == null || meta.lastPromptAt > lastActiveAt)) {
        lastActiveAt = meta.lastPromptAt;
      }
    }

    sessionsDetail.sort((a, b) => (b.lastPromptAt ?? 0) - (a.lastPromptAt ?? 0));
    projects.push({
      id: wsId,
      name: ws.title || path.basename(ws.path || "?"),
      path: ws.path || "",
      sessionCount: sessionsDetail.length,
      firstActiveAt,
      lastActiveAt,
      stats: deriveStats(agg),
      sessionsDetail,
    });
  }

  // 按最近活跃时间倒序，保证颜色/顺序稳定
  projects.sort((a, b) => (b.lastActiveAt ?? 0) - (a.lastActiveAt ?? 0));

  // 项目 -> 顺序索引(用于配色)
  const projectIndex = {};
  projects.forEach((p, i) => { projectIndex[p.id] = i; });

  return { projects, sessionsById, projectIndex };
}

function buildTimeline(sessionsById, projects) {
  const projectIndex = {};
  const projectName = {};
  projects.forEach((p, i) => { projectIndex[p.id] = i; projectName[p.id] = p.name; });

  // slotIdx(绝对) -> Map(projectId -> ms)
  const slotProjects = new Map();

  for (const [sessionId, info] of Object.entries(sessionsById)) {
    const times = sessionTimes(sessionId);
    const intervals = activityIntervals(times);
    for (const [s, e] of intervals) {
      const startSlot = Math.floor(s / SLOT_MS);
      const endSlot = Math.floor(e / SLOT_MS);
      for (let k = startSlot; k <= endSlot; k++) {
        const overlap = Math.min(e, (k + 1) * SLOT_MS) - Math.max(s, k * SLOT_MS);
        if (overlap <= 0) continue;
        let m = slotProjects.get(k);
        if (!m) { m = new Map(); slotProjects.set(k, m); }
        m.set(info.wsId, (m.get(info.wsId) || 0) + overlap);
      }
    }
  }

  // 组织成 days：每天带逐槽项目块 + 每天项目总时长 + 每槽总时长
  const daysMap = new Map(); // dayKey -> { projects: Map, slotTotals: Map, slotBlocks: [], dayTotalMs }
  let maxSlotMs = 0;

  for (const [slotIdx, pmap] of slotProjects) {
    const slotStartMs = slotIdx * SLOT_MS;
    const dayKey = localDayKey(slotStartMs);
    const slotOfDay = Math.floor(minutesOfDay(slotStartMs) / SLOT_MINUTES);
    let day = daysMap.get(dayKey);
    if (!day) { day = { projects: new Map(), slotTotals: new Map(), slotBlocks: [], dayTotalMs: 0 }; daysMap.set(dayKey, day); }

    let slotTotal = 0;
    for (const [projectId, ms] of pmap) {
      day.projects.set(projectId, (day.projects.get(projectId) || 0) + ms);
      day.slotBlocks.push({
        slot: slotOfDay,
        projectId,
        name: projectName[projectId] ?? projectId,
        colorIndex: projectIndex[projectId] ?? 0,
        ms,
      });
      slotTotal += ms;
    }
    day.slotTotals.set(slotOfDay, (day.slotTotals.get(slotOfDay) || 0) + slotTotal);
    day.dayTotalMs += slotTotal;
    if (slotTotal > maxSlotMs) maxSlotMs = slotTotal;
  }

  const days = [...daysMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, d]) => ({
      date,
      dayTotalMs: d.dayTotalMs,
      projects: Object.fromEntries(
        [...d.projects.entries()]
          .sort((a, b) => (b[1] - a[1]))
          .map(([projectId, ms]) => [projectId, ms])
      ),
      slotTotals: Object.fromEntries(d.slotTotals),
      slotBlocks: d.slotBlocks.sort((a, b) => a.slot - b.slot),
    }));

  return { days, maxSlotMs };
}

function handler(req, res) {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/api/stats") {
    try {
      const { projects, sessionsById } = buildStats();
      const timeline = buildTimeline(sessionsById, projects);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify({
        generatedAt: Date.now(),
        slotMinutes: SLOT_MINUTES,
        projects,
        timeline,
      }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: String(err?.stack || err) }));
    }
    return;
  }

  // 静态文件服务
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safe = path.normalize(filePath).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(__dirname, safe);
  const ext = path.extname(full).toLowerCase();
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".json": "application/json; charset=utf-8",
  }[ext] || "application/octet-stream";

  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
}

const server = http.createServer(handler);
server.listen(PORT, () => {
  console.log(`DSH 项目统计面板已启动: http://127.0.0.1:${PORT}`);
  console.log(`数据源: ${DSH_HOME}`);
});
