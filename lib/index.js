// src/index.js
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { zstdDecompressSync } from "node:zlib";
var __runInitializers = function(thisArg, initializers, value) {
  var useValue = arguments.length > 2;
  for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
  return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
  function accept(f) {
    if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
    return f;
  }
  var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
  var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
  var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
  var _, done = false;
  for (var i = decorators.length - 1; i >= 0; i--) {
    var context = {};
    for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
    for (var p in contextIn.access) context.access[p] = contextIn.access[p];
    context.addInitializer = function(f) {
      if (done) throw new TypeError("Cannot add initializers after decoration has completed");
      extraInitializers.push(accept(f || null));
    };
    var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
    if (kind === "accessor") {
      if (result === void 0) continue;
      if (result === null || typeof result !== "object") throw new TypeError("Object expected");
      if (_ = accept(result.get)) descriptor.get = _;
      if (_ = accept(result.set)) descriptor.set = _;
      if (_ = accept(result.init)) initializers.unshift(_);
    } else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
    else descriptor[key] = _;
  }
  if (target) Object.defineProperty(target, contextIn.name, descriptor);
  done = true;
};
var SLOT_MINUTES = 30;
var SLOT_MS = SLOT_MINUTES * 60 * 1e3;
var GAP_MS = 10 * 60 * 1e3;
var MIN_INTERVAL_MS = 60 * 1e3;
var ZSTD_MAGIC = 4247762216;
function dshHome() {
  return process.env.DSH_HOME || join(homedir(), ".dsh");
}
function scanZstdFrames(buffer) {
  const frames = [];
  let truncated = false;
  let offset = 0;
  while (offset < buffer.length) {
    const start = offset;
    if (buffer.length - offset < 4) {
      truncated = true;
      break;
    }
    if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) throw new Error("corrupt Zstandard session log: invalid frame magic");
    offset += 4;
    if (offset >= buffer.length) {
      truncated = true;
      break;
    }
    const descriptor = buffer.readUInt8(offset);
    offset += 1;
    const contentSizeFlag = descriptor >>> 6;
    const singleSegment = (descriptor & 32) !== 0;
    const checksum = (descriptor & 4) !== 0;
    const dictionaryFlag = descriptor & 3;
    const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
    const contentSizeBytes = contentSizeFlag === 0 ? singleSegment ? 1 : 0 : 1 << contentSizeFlag;
    const headerBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
    if (offset + headerBytes > buffer.length) {
      truncated = true;
      break;
    }
    offset += headerBytes;
    for (; ; ) {
      if (offset + 3 > buffer.length) {
        truncated = true;
        offset = buffer.length;
        break;
      }
      const blockHeader = buffer.readUIntLE(offset, 3);
      offset += 3;
      const lastBlock = (blockHeader & 1) !== 0;
      const blockType = blockHeader >>> 1 & 3;
      const blockSize = blockHeader >>> 3;
      const storedBytes = blockType === 1 ? 1 : blockSize;
      if (blockType === 3) throw new Error("corrupt Zstandard session log: reserved block type");
      if (offset + storedBytes > buffer.length) {
        truncated = true;
        offset = buffer.length;
        break;
      }
      offset += storedBytes;
      if (lastBlock) break;
    }
    if (truncated) break;
    if (checksum && offset + 4 > buffer.length) {
      truncated = true;
      break;
    }
    if (checksum) offset += 4;
    frames.push({ start, end: offset });
  }
  return { frames, truncated };
}
function readJson(file) {
  try {
    return { ok: true, value: JSON.parse(readFileSync(file, "utf8")), error: null };
  } catch (error) {
    return { ok: false, value: null, error };
  }
}
function readStable(file, attempts = 3) {
  let last = null;
  for (let i = 0; i < attempts; i++) {
    const before = statSync(file);
    const buf = readFileSync(file);
    const after = statSync(file);
    last = { buf, mtimeMs: after.mtimeMs, size: after.size, stable: before.mtimeMs === after.mtimeMs && before.size === after.size };
    if (last.stable) return last;
  }
  return last;
}
function beijingDate(ms) {
  return new Date(ms + 8 * 3600 * 1e3);
}
function localDayKey(ms) {
  const d = beijingDate(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function minutesOfDay(ms) {
  const d = beijingDate(ms);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
function basename(p) {
  return (p || "").replace(/[/\\]+$/, "").split(/[/\\]/).pop() || "";
}
function nonNegativeNumber(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
function activityIntervals(times) {
  if (!times.length) return [];
  const intervals = [];
  let s = times[0], last = times[0];
  for (let i = 1; i < times.length; i++) {
    const t = times[i];
    if (t - last <= GAP_MS) last = t;
    else {
      intervals.push([s, last]);
      s = last = t;
    }
  }
  intervals.push([s, last]);
  return intervals.map(([a, b]) => [a, Math.max(b, a + MIN_INTERVAL_MS)]);
}
var sessionsDirCache = { home: null, at: 0, dirs: [] };
function sessionDirs(home) {
  const now = Date.now();
  if (sessionsDirCache.home !== home || now - sessionsDirCache.at > 5e3) {
    try {
      sessionsDirCache = { home, at: now, dirs: readdirSync(join(home, "sessions")) };
    } catch {
      sessionsDirCache = { home, at: now, dirs: [] };
    }
  }
  return sessionsDirCache.dirs;
}
function findSessionFile(home, sessionId) {
  for (const enc of sessionDirs(home)) {
    const cand = join(home, "sessions", enc, sessionId, "session.jsonl.zstd");
    if (existsSync(cand)) return cand;
  }
  return null;
}
function expandStorageRecord(record) {
  if (!record || typeof record !== "object") return [record];
  const type = record.type;
  if (type !== "text-chunks" && type !== "reasoning-chunks" && type !== "tool-call-chunks") return [record];
  const data = record.data;
  const members = type === "tool-call-chunks" ? data?.args : data?.texts;
  if (!data || !Array.isArray(members) || !Array.isArray(data.dt)) throw new Error("corrupt session log: malformed packed chunk row");
  if (!members.length) return [];
  if (!Number.isFinite(record.time0) || !Number.isInteger(record.seq0) || data.dt.length < members.length - 1 || data.dt.slice(0, members.length - 1).some((dt) => !Number.isFinite(dt) || dt < 0)) {
    throw new Error("corrupt session log: invalid packed chunk offsets");
  }
  let time = record.time0;
  return members.map((value, index) => {
    if (index > 0) time += data.dt[index - 1];
    let chunk;
    if (type === "text-chunks") chunk = { type: "text-delta", index: data.index, text: value };
    else if (type === "reasoning-chunks") chunk = { type: "reasoning-delta", index: data.index, text: value };
    else chunk = { type: "tool-call-delta", index: data.index, id: data.id, ...data.name !== void 0 ? { name: data.name } : {}, argumentsDelta: value };
    return { type: "assistant/chunk", seq: record.seq0 + index, time, data: { turn: data.turn, step: data.step, chunk } };
  });
}
function isTokenDelta(chunk) {
  if (!chunk || typeof chunk !== "object") return false;
  if (chunk.type === "text-delta" || chunk.type === "reasoning-delta") return chunk.text !== "";
  return chunk.type === "tool-call-delta" && (chunk.argumentsDelta !== "" || chunk.name !== void 0);
}
var sessionInfoCache = /* @__PURE__ */ new Map();
var SESSION_CACHE_LIMIT = 300;
function sessionInfo(home, sessionId) {
  const file = findSessionFile(home, sessionId);
  if (!file) return { times: [], lastTime: null, model: null, usages: [], origin: null, parentSession: null, seedLength: null, stats: null, slotStats: [], partial: false, stale: false, missing: true };
  const cached = sessionInfoCache.get(file);
  let snapshot;
  try {
    snapshot = readStable(file);
  } catch (error) {
    if (cached) return { ...cached.info, stale: true, readError: error.message };
    throw error;
  }
  const { mtimeMs, size } = snapshot;
  if (cached && cached.mtimeMs === mtimeMs && cached.size === size) {
    sessionInfoCache.delete(file);
    sessionInfoCache.set(file, cached);
    return cached.info;
  }
  const buf = snapshot.buf;
  const scanned = scanZstdFrames(buf);
  const times = [];
  let currentModel = null;
  let origin = null, parentSession = null, seedLength = null;
  let firstOwnSeq = 0;
  const usageByStep = /* @__PURE__ */ new Map();
  const derived = emptyRaw();
  const slotStats = /* @__PURE__ */ new Map();
  const addSlot = (time, field, value) => {
    if (typeof time !== "number" || !Number.isFinite(time) || !value) return;
    const slot = Math.floor(time / SLOT_MS);
    const row = slotStats.get(slot) || { slot, turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 };
    row[field] += value;
    slotStats.set(slot, row);
  };
  const addInterval = (field, start, end) => {
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    const first = Math.floor(start / SLOT_MS), last = Math.floor((end - 1) / SLOT_MS);
    for (let slot = first; slot <= last; slot++) {
      const overlap = Math.min(end, (slot + 1) * SLOT_MS) - Math.max(start, slot * SLOT_MS);
      if (overlap > 0) addSlot(slot * SLOT_MS, field, overlap);
    }
  };
  let openStep = null;
  let lastTurn = null;
  const pendingCalls = /* @__PURE__ */ new Map();
  let derivedEvents = 0;
  let malformedRecords = 0;
  for (const frame of scanned.frames) {
    const text = zstdDecompressSync(buf.subarray(frame.start, frame.end)).toString("utf8");
    for (const line of text.split("\n")) {
      if (!line) continue;
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        malformedRecords++;
        continue;
      }
      let events;
      try {
        events = expandStorageRecord(record);
      } catch {
        malformedRecords++;
        continue;
      }
      for (const ev of events) {
        const evSeq = ev?.seq;
        if (evSeq !== void 0 && evSeq < firstOwnSeq) continue;
        const t = ev?.time;
        if (Number.isFinite(t)) times.push(t);
        if (!ev || typeof ev !== "object") continue;
        if (ev.type === "session") {
          origin = ev.origin ?? null;
          parentSession = ev.parentSession ?? null;
          seedLength = ev.seedLength ?? null;
          if (parentSession !== null) firstOwnSeq = seedLength ?? 0;
        } else if (ev.type === "request/header") {
          const m = ev.data?.header?.config?.model;
          if (m) currentModel = m;
        } else if (ev.type === "step/start") {
          openStep = Number.isFinite(t) ? { turn: ev.data?.turn, step: ev.data?.step, startTime: t, firstTokenTime: null } : null;
        } else if (ev.type === "assistant/chunk") {
          if (ev.data?.chunk?.type === "usage" && Number.isFinite(t)) {
            const u = ev.data.chunk.usage || {};
            usageByStep.set(`${ev.data.turn}:${ev.data.step}`, {
              time: t,
              model: currentModel,
              uncached: nonNegativeNumber(u.inputTokens),
              output: nonNegativeNumber(u.outputTokens),
              cacheRead: nonNegativeNumber(u.cacheReadTokens),
              cacheWrite: nonNegativeNumber(u.cacheWriteTokens),
              reasoning: nonNegativeNumber(u.reasoningTokens)
            });
          } else if (openStep && openStep.turn === ev.data?.turn && openStep.step === ev.data?.step && openStep.firstTokenTime === null && Number.isFinite(t) && isTokenDelta(ev.data?.chunk)) {
            openStep.firstTokenTime = t;
          }
        } else if (ev.type === "assistant/message") {
          const u = ev.data?.usage;
          const msgModel = ev.data?.message?.source?.model || currentModel;
          if (u !== void 0 && Number.isFinite(t)) usageByStep.set(`${ev.data.turn}:${ev.data.step}`, {
            time: t,
            model: msgModel,
            uncached: nonNegativeNumber(u.inputTokens),
            output: nonNegativeNumber(u.outputTokens),
            cacheRead: nonNegativeNumber(u.cacheReadTokens),
            cacheWrite: nonNegativeNumber(u.cacheWriteTokens),
            reasoning: nonNegativeNumber(u.reasoningTokens)
          });
          if (openStep && openStep.turn === ev.data?.turn && openStep.step === ev.data?.step && Number.isFinite(t)) {
            const llm = Math.max(0, t - openStep.startTime);
            derived.llmMs += llm;
            addInterval("llmMs", openStep.startTime, t);
            if (openStep.firstTokenTime !== null) {
              const ttft = Math.max(0, openStep.firstTokenTime - openStep.startTime);
              derived.ttftMs += ttft;
              derived.ttftSteps++;
              addSlot(openStep.firstTokenTime, "ttftMs", ttft);
              addSlot(openStep.firstTokenTime, "ttftSteps", 1);
              const out = Number.isFinite(u?.outputTokens) && u.outputTokens >= 0 ? u.outputTokens : null;
              if (out !== null) {
                const decode = Math.max(0, t - openStep.firstTokenTime);
                derived.decodeMs += decode;
                derived.decodeTokens += out;
                addInterval("decodeMs", openStep.firstTokenTime, t);
                addSlot(t, "decodeTokens", out);
              }
            }
            derivedEvents++;
            openStep = null;
          }
        } else if (ev.type === "tool/call") {
          const callId = ev.data?.callId;
          if (callId !== void 0 && Number.isFinite(t)) pendingCalls.set(callId, t);
        } else if (ev.type === "tool/result") {
          const callId = ev.data?.message?.source?.callId;
          if (pendingCalls.has(callId) && Number.isFinite(t)) {
            const start = pendingCalls.get(callId);
            const tool = Math.max(0, t - start);
            derived.toolMs += tool;
            addInterval("toolMs", start, t);
            pendingCalls.delete(callId);
            derivedEvents++;
          }
        } else if (ev.type === "step/end") {
          derived.steps++;
          addSlot(t, "steps", 1);
          derivedEvents++;
          if (lastTurn !== ev.data?.turn) {
            derived.turns++;
            addSlot(t, "turns", 1);
            lastTurn = ev.data?.turn;
          }
          openStep = null;
        } else if (ev.type === "turn/end") {
          pendingCalls.clear();
        }
      }
    }
  }
  times.sort((a, b) => a - b);
  const modelTokens = /* @__PURE__ */ new Map();
  for (const u of usageByStep.values()) {
    const mk = u.model || "(unknown)";
    const weight = (u.cacheRead || 0) + (u.output || 0) + (u.uncached || 0);
    modelTokens.set(mk, (modelTokens.get(mk) || 0) + weight);
  }
  let model = null, modelWeight = -1;
  for (const [mk, w] of modelTokens) {
    if (w > modelWeight) {
      modelWeight = w;
      model = mk;
    }
  }
  if (model === null) model = currentModel;
  const info = {
    times,
    lastTime: times.length ? times[times.length - 1] : null,
    model,
    usages: [...usageByStep.values()],
    origin,
    parentSession,
    seedLength,
    stats: derivedEvents ? derived : null,
    slotStats: [...slotStats.values()].sort((a, b) => a.slot - b.slot),
    partial: scanned.truncated || !snapshot.stable || malformedRecords > 0,
    stale: false,
    missing: false
  };
  sessionInfoCache.set(file, { mtimeMs, size, info });
  while (sessionInfoCache.size > SESSION_CACHE_LIMIT) {
    const oldest = sessionInfoCache.keys().next().value;
    sessionInfoCache.delete(oldest);
  }
  return info;
}
function emptyRaw() {
  return { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
}
function addRaw(a, b) {
  a.turns += b.turns;
  a.steps += b.steps;
  a.llmMs += b.llmMs;
  a.toolMs += b.toolMs;
  a.ttftMs += b.ttftMs;
  a.ttftSteps += b.ttftSteps;
  a.decodeMs += b.decodeMs;
  a.decodeTokens += b.decodeTokens;
  a.uncached += b.uncached;
  a.output += b.output;
  a.cacheRead += b.cacheRead;
  a.cacheWrite += b.cacheWrite;
  a.reasoning += b.reasoning;
}
function slotDurations(times) {
  const slotMs = /* @__PURE__ */ new Map();
  for (const [s, e] of activityIntervals(times)) {
    const startSlot = Math.floor(s / SLOT_MS);
    const endSlot = Math.floor(e / SLOT_MS);
    for (let k = startSlot; k <= endSlot; k++) {
      const overlap = Math.min(e, (k + 1) * SLOT_MS) - Math.max(s, k * SLOT_MS);
      if (overlap > 0) slotMs.set(k, (slotMs.get(k) || 0) + overlap);
    }
  }
  return [...slotMs.entries()].map(([slot, ms]) => ({ slot, ms }));
}
function slotUsages(usages) {
  const m = /* @__PURE__ */ new Map();
  for (const u of usages) {
    const k = Math.floor(u.time / SLOT_MS);
    const mk = u.model || "(unknown)";
    const key = mk + "\0" + k;
    const cur = m.get(key) || { model: mk, slot: k, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
    cur.uncached += u.uncached;
    cur.output += u.output;
    cur.cacheRead += u.cacheRead;
    cur.cacheWrite += u.cacheWrite;
    cur.reasoning += u.reasoning;
    m.set(key, cur);
  }
  return [...m.values()];
}
var StatsService = (() => {
  let _classSuper = TypertRemoteService;
  let _instanceExtraInitializers = [];
  let _aggregate_decorators;
  return class StatsService extends _classSuper {
    static {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _aggregate_decorators = [Remote("aggregate")];
      __esDecorate(this, null, _aggregate_decorators, {
        kind: "method",
        name: "aggregate",
        static: false,
        private: false,
        access: { has: (obj) => "aggregate" in obj, get: (obj) => obj.aggregate },
        metadata: _metadata
      }, null, _instanceExtraInitializers);
      if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    }
    constructor(ctx) {
      super(ctx, "stats");
      __runInitializers(this, _instanceExtraInitializers);
    }
    async aggregate() {
      const home = dshHome();
      const warnings = [];
      const wsRead = readJson(join(home, "storages", "workspace.json"));
      const sessionsRead = readJson(join(home, "storages", "session_projcache.json"));
      if (!wsRead.ok) warnings.push({ code: "WORKSPACE_READ_FAILED", message: wsRead.error?.message || "workspace storage read failed" });
      if (!sessionsRead.ok) warnings.push({ code: "SESSION_CACHE_READ_FAILED", message: sessionsRead.error?.message || "session projection cache read failed" });
      const wsJson = wsRead.value;
      const workspaces = wsJson?.tables?.workspaces ?? {};
      const archivedSet = new Set(wsJson?.global?.archivedSessionIds ?? []);
      const sessionsTable = sessionsRead.value?.tables?.sessions ?? {};
      const seen = /* @__PURE__ */ new Set();
      const processSession = (sessionId, cwdFallback) => {
        seen.add(sessionId);
        const entry = sessionsTable[sessionId];
        const statsRow = entry?.rows?.sessionStats?.val;
        const usageTotals = entry?.rows?.tokenUsage?.val?.totals;
        const title = entry?.rows?.title?.val;
        const meta = entry?.rows?.sessionListMetadata?.val;
        const createdAt = entry?.identity?.createdAt ?? null;
        const lastPromptAt = meta?.lastPromptAt ?? null;
        const cwd = entry?.identity?.cwd ?? cwdFallback ?? null;
        const archived = archivedSet.has(sessionId);
        let info;
        try {
          info = sessionInfo(home, sessionId);
        } catch (err) {
          const message = err?.message || String(err);
          console.warn(`[dsh-stats] \u4F1A\u8BDD ${sessionId} \u65E5\u5FD7\u89E3\u7801\u5931\u8D25\uFF08\u4F7F\u7528 projection cache\uFF09:`, message);
          warnings.push({ code: "SESSION_DECODE_FAILED", sessionId, message });
          info = { times: [], lastTime: null, model: null, usages: [], slotStats: [], stats: null, partial: false, stale: false, missing: false, unavailable: true };
        }
        if (info.missing) warnings.push({ code: "SESSION_LOG_MISSING", sessionId, message: "session log was not found; projection cache was used where available" });
        if (info.partial) warnings.push({ code: "SESSION_LOG_PARTIAL", sessionId, message: "session log was incomplete or malformed; only valid committed records were used" });
        if (info.stale) warnings.push({ code: "SESSION_LOG_STALE", sessionId, message: info.readError || "cached session snapshot was used" });
        let totalUncached = 0, totalOutput = 0, totalCacheRead = 0, totalCacheWrite = 0, totalReasoning = 0;
        const modelUsageMap = /* @__PURE__ */ new Map();
        for (const u of info.usages) {
          totalUncached += u.uncached || 0;
          totalOutput += u.output || 0;
          totalCacheRead += u.cacheRead || 0;
          totalCacheWrite += u.cacheWrite || 0;
          totalReasoning += u.reasoning || 0;
          const mk = u.model || "(unknown)";
          const cur = modelUsageMap.get(mk) || { model: mk, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
          cur.uncached += u.uncached || 0;
          cur.output += u.output || 0;
          cur.cacheRead += u.cacheRead || 0;
          cur.cacheWrite += u.cacheWrite || 0;
          cur.reasoning += u.reasoning || 0;
          modelUsageMap.set(mk, cur);
        }
        const projectionUsage = {
          uncached: nonNegativeNumber(usageTotals?.uncachedInputTokens),
          output: nonNegativeNumber(usageTotals?.outputTokens),
          cacheRead: nonNegativeNumber(usageTotals?.cacheReadTokens),
          cacheWrite: nonNegativeNumber(usageTotals?.cacheWriteTokens),
          reasoning: 0
        };
        const projectionTokens = projectionUsage.uncached + projectionUsage.output + projectionUsage.cacheRead + projectionUsage.cacheWrite;
        const usedProjectionUsage = info.usages.length === 0 && projectionTokens > 0;
        if (usedProjectionUsage) {
          totalUncached = projectionUsage.uncached;
          totalOutput = projectionUsage.output;
          totalCacheRead = projectionUsage.cacheRead;
          totalCacheWrite = projectionUsage.cacheWrite;
          modelUsageMap.set("(unknown)", { model: "(unknown)", ...projectionUsage });
          warnings.push({ code: "SESSION_USAGE_FALLBACK", sessionId, message: "token usage came from the projection cache and may include inherited fork context" });
        }
        const modelUsage = [...modelUsageMap.values()];
        const eventStats = info.stats || statsRow || {};
        const raw = {
          turns: nonNegativeNumber(eventStats.turns),
          steps: nonNegativeNumber(eventStats.steps),
          llmMs: nonNegativeNumber(eventStats.llmMs),
          toolMs: nonNegativeNumber(eventStats.toolMs),
          ttftMs: nonNegativeNumber(eventStats.ttftMs),
          ttftSteps: nonNegativeNumber(eventStats.ttftSteps),
          decodeMs: nonNegativeNumber(eventStats.decodeMs),
          decodeTokens: nonNegativeNumber(eventStats.decodeTokens),
          uncached: totalUncached,
          output: totalOutput,
          cacheRead: totalCacheRead,
          cacheWrite: totalCacheWrite,
          reasoning: totalReasoning
        };
        const updatedAt = Math.max(info.lastTime ?? 0, lastPromptAt ?? 0, createdAt ?? 0) || null;
        let perSlotUsage = slotUsages(info.usages);
        if (usedProjectionUsage && updatedAt !== null) perSlotUsage = [{ model: "(unknown)", slot: Math.floor(updatedAt / SLOT_MS), ...projectionUsage }];
        const session = {
          id: sessionId,
          title: title ?? null,
          updatedAt,
          createdAt,
          model: info.model ?? null,
          modelUsage,
          archived,
          blank: meta?.blank === true,
          subagent: info.origin === "subagent",
          origin: info.origin ?? null,
          parentSession: info.parentSession ?? null,
          seedLength: info.seedLength ?? null,
          calls: info.usages.length,
          stats: raw,
          durMs: raw.llmMs + raw.toolMs,
          slots: slotDurations(info.times),
          slotStats: info.slotStats || [],
          slotUsage: perSlotUsage,
          quality: info.stale ? "stale" : info.partial || info.missing || info.unavailable || usedProjectionUsage ? "partial" : "exact",
          cwd
        };
        Object.defineProperty(session, "_intervals", { value: activityIntervals(info.times), enumerable: false });
        return session;
      };
      const projects = [];
      for (const [wsId, ws] of Object.entries(workspaces)) {
        const sessions = [];
        const agg = emptyRaw();
        let lastActiveAt = null;
        let subagentCount = 0;
        for (const sessionId of ws.sessionIds ?? []) {
          const s = processSession(sessionId, ws.path);
          if (s.blank) continue;
          addRaw(agg, s.stats);
          sessions.push(s);
          if (s.subagent) subagentCount++;
          if (s.updatedAt != null && (lastActiveAt == null || s.updatedAt > lastActiveAt)) lastActiveAt = s.updatedAt;
        }
        sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        projects.push({
          id: wsId,
          name: ws.title || basename(ws.path) || "?",
          path: ws.path || "",
          sessionCount: sessions.length,
          subagentCount,
          lastActiveAt,
          stats: agg,
          sessions
        });
      }
      const strayByCwd = /* @__PURE__ */ new Map();
      for (const sessionId of Object.keys(sessionsTable)) {
        if (seen.has(sessionId)) continue;
        const s = processSession(sessionId, null);
        if (s.blank) continue;
        const cwd = s.cwd || "(uncategorized)";
        if (!strayByCwd.has(cwd)) strayByCwd.set(cwd, []);
        strayByCwd.get(cwd).push(s);
      }
      strayByCwd.forEach((sessions, cwd) => {
        const existing = projects.find((p) => p.path === cwd);
        const target = existing ?? {
          id: "cwd-" + cwd,
          name: cwd === "(uncategorized)" ? cwd : basename(cwd),
          path: cwd,
          sessionCount: 0,
          subagentCount: 0,
          lastActiveAt: null,
          stats: emptyRaw(),
          sessions: []
        };
        if (!existing) projects.push(target);
        sessions.forEach((s) => {
          target.sessions.push(s);
          if (s.subagent) target.subagentCount++;
          addRaw(target.stats, s.stats);
          if (s.updatedAt != null && (target.lastActiveAt == null || s.updatedAt > target.lastActiveAt)) target.lastActiveAt = s.updatedAt;
        });
        target.sessionCount = target.sessions.length;
        target.sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      });
      projects.sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));
      const projectIndex = /* @__PURE__ */ new Map();
      projects.forEach((p, i) => projectIndex.set(p.id, i));
      const daysMap = /* @__PURE__ */ new Map();
      for (const p of projects) {
        const intervals = p.sessions.flatMap((s) => s._intervals || []).sort((a, b) => a[0] - b[0]);
        const merged = [];
        for (const interval of intervals) {
          const last = merged[merged.length - 1];
          if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]);
          else merged.push([...interval]);
        }
        const projectSlots = /* @__PURE__ */ new Map();
        for (const [start, end] of merged) {
          const first = Math.floor(start / SLOT_MS), last = Math.floor((end - 1) / SLOT_MS);
          for (let slot = first; slot <= last; slot++) {
            const overlap = Math.min(end, (slot + 1) * SLOT_MS) - Math.max(start, slot * SLOT_MS);
            if (overlap > 0) projectSlots.set(slot, (projectSlots.get(slot) || 0) + overlap);
          }
        }
        for (const [slot, ms] of projectSlots) {
          const slotStartMs = slot * SLOT_MS;
          const date = localDayKey(slotStartMs);
          const slotOfDay = Math.floor(minutesOfDay(slotStartMs) / SLOT_MINUTES);
          let day = daysMap.get(date);
          if (!day) {
            day = { date, dayTotalMs: 0, slotBlocks: [] };
            daysMap.set(date, day);
          }
          day.dayTotalMs += ms;
          day.slotBlocks.push({ slot: slotOfDay, projectId: p.id, name: p.name, colorIndex: projectIndex.get(p.id), ms });
        }
      }
      const days = [...daysMap.values()].sort((a, b) => a.date < b.date ? -1 : 1);
      days.forEach((d) => d.slotBlocks.sort((a, b) => a.slot - b.slot));
      return {
        projects,
        timeline: { slotMinutes: SLOT_MINUTES, days },
        meta: { source: "host", generatedAt: Date.now(), degraded: warnings.length > 0, warnings }
      };
    }
  };
})();
export {
  StatsService,
  StatsService as default
};
