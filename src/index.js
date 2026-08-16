// 宿主半体 — StatsService：读 DSH 落盘数据（workspace.json + session_projcache.json
// + session.jsonl.zstd），聚合项目级统计 + 精确 30 分钟时间线 + 每会话模型 + 每槽 token。
// 通过 Typert Remote 暴露 stats/aggregate 给浏览器端。
//
// 注：直接读 ~/.dsh 文件而非走 sessionPersistence/sessionQuery 服务，是为了
// 避免对注入服务名的耦合；数据格式已由 reference/server.mjs 验证。

import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { zstdDecompressSync } from "node:zlib";

// ES decorators 运行时（与官方编译产物一致）
var __runInitializers = function (thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
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
		context.addInitializer = function (f) {
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

// ---------------------------------------------------------------------------
// 常量与工具
// ---------------------------------------------------------------------------
const SLOT_MINUTES = 30;
const SLOT_MS = SLOT_MINUTES * 60 * 1000;
const GAP_MS = 10 * 60 * 1000;
const MIN_INTERVAL_MS = 60 * 1000;
const ZSTD_MAGIC = 4247762216;

function dshHome() {
	return process.env.DSH_HOME || join(homedir(), ".dsh");
}

function scanZstdFrames(buffer) {
	const frames = [];
	let offset = 0;
	while (offset < buffer.length) {
		const start = offset;
		if (buffer.length - offset < 4) break;
		if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) throw new Error("corrupt Zstandard session log: invalid frame magic");
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

function readJson(file) {
	try {
		return JSON.parse(readFileSync(file, "utf8"));
	} catch {
		return null;
	}
}

// 北京时间（UTC+8，无夏令时）：日期/时段切分显式用北京时区，与宿主机时区无关
function beijingDate(ms) {
	return new Date(ms + 8 * 3600 * 1000);
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

// 从事件时间戳提取活跃区间（相邻间隔 <= GAP_MS 归一段；孤立事件计 1 分钟）
function activityIntervals(times) {
	if (!times.length) return [];
	const intervals = [];
	let s = times[0], last = times[0];
	for (let i = 1; i < times.length; i++) {
		const t = times[i];
		if (t - last <= GAP_MS) last = t;
		else { intervals.push([s, last]); s = last = t; }
	}
	intervals.push([s, last]);
	return intervals.map(([a, b]) => [a, Math.max(b, a + MIN_INTERVAL_MS)]);
}

// 定位会话 JSONL 文件（sessions/<encoded-workspace>/<id>/session.jsonl.zstd）
let sessionsDirCache = { at: 0, dirs: [] };
function sessionDirs(home) {
	const now = Date.now();
	if (now - sessionsDirCache.at > 5000) {
		try { sessionsDirCache = { at: now, dirs: readdirSync(join(home, "sessions")) }; }
		catch { sessionsDirCache = { at: now, dirs: [] }; }
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

// 解码一个会话：返回时间戳、模型、按 (turn,step) 去重的 usage 样本。
// seedLength fork 边界：fork 子代理日志前 N 条是父继承上下文，seq < seedLength 的事件丢弃。
// 结果按文件 mtime 缓存（会话日志 append 后 mtime 变化，自动失效）。
const sessionInfoCache = new Map(); // filePath -> { mtimeMs, info }
const SESSION_CACHE_LIMIT = 300; // LRU 上限，防长期运行内存膨胀
function sessionInfo(home, sessionId) {
	const file = findSessionFile(home, sessionId);
	if (!file) return { times: [], model: null, usages: [], origin: null, parentSession: null, seedLength: null };
	let mtimeMs;
	try { mtimeMs = statSync(file).mtimeMs; } catch { return { times: [], model: null, usages: [], origin: null, parentSession: null, seedLength: null }; }
	const cached = sessionInfoCache.get(file);
	if (cached && cached.mtimeMs === mtimeMs) {
		// LRU 提升：命中后移到最新
		sessionInfoCache.delete(file);
		sessionInfoCache.set(file, cached);
		return cached.info;
	}
	const buf = readFileSync(file);
	const frames = scanZstdFrames(buf);
	const times = [];
	let currentModel = null; // 最近 request/header 声明的模型（chunk 兜底用）
	let origin = null, parentSession = null, seedLength = null;
	// 计算 fork 边界：firstOwnSeq = parentSession ? (seedLength ?? 0) : 0
	let firstOwnSeq = 0;
	const usageByStep = new Map();
	for (const frame of frames) {
		const text = zstdDecompressSync(buf.subarray(frame.start, frame.end)).toString("utf8");
		for (const line of text.split("\n")) {
			if (!line) continue;
			let ev;
			try { ev = JSON.parse(line); } catch { continue; }
			// 读 seq（事件顶层字段）
			const evSeq = ev.seq;
			// session 头部事件不参与 seed 过滤（evSeq === undefined，过滤表达式永远为 false）
			if (evSeq !== undefined && evSeq < firstOwnSeq) continue;
			const t = ev.time ?? ev.time0;
			if (typeof t === "number") times.push(t);
			if (ev.type === "session") {
				origin = ev.origin ?? null;
				parentSession = ev.parentSession ?? null;
				seedLength = ev.seedLength ?? null;
				if (parentSession !== null) firstOwnSeq = seedLength ?? 0;
			} else if (ev.type === "request/header") {
				const m = ev.data?.header?.config?.model;
				if (m) currentModel = m;
			} else if (ev.type === "assistant/chunk" && ev.data?.chunk?.type === "usage" && typeof t === "number") {
				const u = ev.data.chunk.usage;
				if (evSeq !== undefined) {
					usageByStep.set(`${ev.data.turn}:${ev.data.step}`, {
						time: t,
						model: currentModel,
						uncached: u.inputTokens ?? 0, output: u.outputTokens ?? 0,
						cacheRead: u.cacheReadTokens ?? 0, cacheWrite: u.cacheWriteTokens ?? 0,
						reasoning: u.reasoningTokens ?? 0
					});
				}
			} else if (ev.type === "assistant/message" && ev.data?.usage !== void 0 && typeof t === "number") {
				const u = ev.data.usage;
				// 每个消息的实际模型来自 message.source.model（会话内可切换模型，见参考实现）
				const msgModel = ev.data?.message?.source?.model || currentModel;
				if (evSeq !== undefined) {
					usageByStep.set(`${ev.data.turn}:${ev.data.step}`, {
						time: t,
						model: msgModel,
						uncached: u.inputTokens ?? 0, output: u.outputTokens ?? 0,
						cacheRead: u.cacheReadTokens ?? 0, cacheWrite: u.cacheWriteTokens ?? 0,
						reasoning: u.reasoningTokens ?? 0
					});
				}
			}
		}
	}
	times.sort((a, b) => a - b);
	// session 主要模型 = 按 token 量（cacheRead+output+uncached）加权最大的模型，
	// 避免会话中途切换模型时整体被错误归到最后一个模型。
	const modelTokens = new Map();
	for (const u of usageByStep.values()) {
		const mk = u.model || "(unknown)";
		const weight = (u.cacheRead || 0) + (u.output || 0) + (u.uncached || 0);
		modelTokens.set(mk, (modelTokens.get(mk) || 0) + weight);
	}
	let model = null, modelWeight = -1;
	for (const [mk, w] of modelTokens) {
		if (w > modelWeight) { modelWeight = w; model = mk; }
	}
	if (model === null) model = currentModel;
	const info = { times, model, usages: [...usageByStep.values()], origin, parentSession, seedLength };
	sessionInfoCache.set(file, { mtimeMs, info });
	// LRU 淘汰：超限删除最旧条目
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
	a.turns += b.turns; a.steps += b.steps; a.llmMs += b.llmMs; a.toolMs += b.toolMs;
	a.ttftMs += b.ttftMs; a.ttftSteps += b.ttftSteps; a.decodeMs += b.decodeMs; a.decodeTokens += b.decodeTokens;
	a.uncached += b.uncached; a.output += b.output; a.cacheRead += b.cacheRead; a.cacheWrite += b.cacheWrite; a.reasoning += b.reasoning;
}

// 把活跃区间按 30 分钟绝对槽切分累计
function slotDurations(times) {
	const slotMs = new Map();
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

// 把 usage 样本按 30 分钟绝对槽聚合 token
function slotUsages(usages) {
	const m = new Map();
	for (const u of usages) {
		const k = Math.floor(u.time / SLOT_MS);
		const cur = m.get(k) || { uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
		cur.uncached += u.uncached; cur.output += u.output; cur.cacheRead += u.cacheRead; cur.cacheWrite += u.cacheWrite;
		cur.reasoning += u.reasoning;
		m.set(k, cur);
	}
	return [...m.entries()].map(([slot, b]) => ({ slot, uncached: b.uncached, output: b.output, cacheRead: b.cacheRead, cacheWrite: b.cacheWrite, reasoning: b.reasoning }));
}

let StatsService = (() => {
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
			// 触发 @Remote 装饰器 initializer，把 aggregate 标记注册到 Typert（mark 幂等）。
			__runInitializers(this, _instanceExtraInitializers);
		}

		async aggregate() {
			const home = dshHome();
			const wsJson = readJson(join(home, "storages", "workspace.json"));
			const workspaces = wsJson?.tables?.workspaces ?? {};
			const archivedSet = new Set(wsJson?.global?.archivedSessionIds ?? []);
			const sessionsTable = readJson(join(home, "storages", "session_projcache.json"))?.tables?.sessions ?? {};
			const seen = new Set();

			// 处理一个会话：容错（坏日志不拖垮整体），返回会话记录或 null
			const processSession = (sessionId, cwdFallback) => {
				seen.add(sessionId);
				const entry = sessionsTable[sessionId];
				const statsRow = entry?.rows?.sessionStats?.val;
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
					console.warn(`[dsh-stats] 会话 ${sessionId} 日志解码失败（跳过其时间线数据）:`, err?.message);
					info = { times: [], model: null, usages: [] };
				}
				// token 口径统一走日志 usages（已按 seedLength 过滤 fork 继承、按 turn:step 去重），
				// 与 slotUsage / 趋势页 / 成本完全一致。不用 projcache usageTotals：它把 fork
				// 子代理继承的父上下文 cacheRead 也计入了，导致总览页与趋势页不一致。
				let totalUncached = 0, totalOutput = 0, totalCacheRead = 0, totalCacheWrite = 0, totalReasoning = 0;
				// 按模型聚合的 token 分布（消息粒度：跨模型会话的各模型 token 各归其位）
				const modelUsageMap = new Map();
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
				const modelUsage = [...modelUsageMap.values()];
				const raw = {
					turns: statsRow?.turns ?? 0, steps: statsRow?.steps ?? 0,
					llmMs: statsRow?.llmMs ?? 0, toolMs: statsRow?.toolMs ?? 0,
					ttftMs: statsRow?.ttftMs ?? 0, ttftSteps: statsRow?.ttftSteps ?? 0,
					decodeMs: statsRow?.decodeMs ?? 0, decodeTokens: statsRow?.decodeTokens ?? 0,
					uncached: totalUncached, output: totalOutput,
					cacheRead: totalCacheRead, cacheWrite: totalCacheWrite,
					reasoning: totalReasoning
				};
				return {
					id: sessionId,
					title: title ?? null,
					updatedAt: lastPromptAt ?? createdAt,
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
					slotUsage: slotUsages(info.usages),
					cwd
				};
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
					if (s.archived) continue;
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

			// 未归入任何工作区的会话：按 cwd 分组兜底（与客户端近似模式一致）；
			// cwd 与已有项目路径相同时合并进去，避免出现两个同名项目。
			const strayByCwd = new Map();
			for (const sessionId of Object.keys(sessionsTable)) {
				if (seen.has(sessionId)) continue;
				const s = processSession(sessionId, null);
				if (s.blank) continue;
				if (s.archived) continue;
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

			const projectIndex = new Map();
			projects.forEach((p, i) => projectIndex.set(p.id, i));

			// 时间线：把每会话 slots 聚合到 (day, slotOfDay, project)
			const daysMap = new Map();
			for (const p of projects) {
				for (const s of p.sessions) {
					for (const { slot, ms } of s.slots) {
						const slotStartMs = slot * SLOT_MS;
						const date = localDayKey(slotStartMs);
						const slotOfDay = Math.floor(minutesOfDay(slotStartMs) / SLOT_MINUTES);
						let day = daysMap.get(date);
						if (!day) { day = { date, dayTotalMs: 0, slotBlocks: [] }; daysMap.set(date, day); }
						day.dayTotalMs += ms;
						day.slotBlocks.push({ slot: slotOfDay, projectId: p.id, name: p.name, colorIndex: projectIndex.get(p.id), ms });
					}
				}
			}
			const days = [...daysMap.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
			days.forEach((d) => d.slotBlocks.sort((a, b) => a.slot - b.slot));

			return { projects, timeline: { days } };
		}
	};
})();

export { StatsService, StatsService as default };
