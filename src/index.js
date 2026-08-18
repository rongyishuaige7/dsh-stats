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
import pricing from "./pricing.cjs";
import { collectAccounts, providerViews } from "./accounts.js";

const { normalizeIdentity, priceUsage, summarizeCosts, mergeCostSummaries } = pricing;

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
const LONG_CONTEXT_TOKENS = 512_000;
const ZSTD_MAGIC = 4247762216;
const STATS_SCHEMA_VERSION = 2;

// DeepSeek 余额查询与统计聚合解耦：余额是宿主凭证能力，不应让统计日志
// 读取失败或网络波动改变现有 stats/aggregate 的语义。
const DEEPSEEK_BALANCE_API = "https://api.deepseek.com/user/balance";
const DEEPSEEK_TOP_UP_URL = "https://platform.deepseek.com/top_up";
const DEEPSEEK_API_KEY_REF = "DEEPSEEK_API_KEY";
const BALANCE_CACHE_MS = 60 * 1000;
const BALANCE_TIMEOUT_MS = 15 * 1000;

const BALANCE_ERROR_MESSAGES = {
	"no-api-key": "未配置 DEEPSEEK_API_KEY",
	"credential-failed": "读取 DeepSeek 凭证失败",
	"fetch-unavailable": "当前宿主不支持网络请求",
	"fetch-timeout": "DeepSeek 余额请求超时",
	"fetch-failed": "DeepSeek 余额请求失败",
	"http-401": "DeepSeek 凭证无效或已过期",
	"http-403": "DeepSeek 凭证没有余额查询权限",
	"http-429": "DeepSeek 余额请求过于频繁",
	"http-4xx": "DeepSeek 余额请求被拒绝",
	"http-5xx": "DeepSeek 服务暂时不可用",
	"invalid-response": "DeepSeek 返回的余额数据无效",
	"balance-unavailable": "DeepSeek 余额暂不可用"
};

class DeepSeekBalanceError extends Error {
	constructor(code) {
		super(BALANCE_ERROR_MESSAGES[code] || "DeepSeek 余额查询失败");
		this.name = "DeepSeekBalanceError";
		this.code = code;
	}
}

function balanceErrorCode(error) {
	return error?.code && typeof error.code === "string" ? error.code : "fetch-failed";
}

function parseBalanceAmount(value) {
	if (value === undefined || value === null || value === "") return null;
	const number = typeof value === "string" ? Number(value.trim()) : value;
	return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeBalanceInfo(info) {
	if (!info || typeof info !== "object" || Array.isArray(info)) throw new DeepSeekBalanceError("invalid-response");
	const currency = typeof info.currency === "string" && info.currency.trim() ? info.currency.trim().toUpperCase() : null;
	const total = parseBalanceAmount(info.total_balance);
	const toppedUp = parseBalanceAmount(info.topped_up_balance);
	const granted = parseBalanceAmount(info.granted_balance);
	if (!currency || total === null || (info.topped_up_balance != null && toppedUp === null) || (info.granted_balance != null && granted === null)) {
		throw new DeepSeekBalanceError("invalid-response");
	}
	return {
		provider: "deepseek",
		name: currency === "CNY" ? "DeepSeek" : `DeepSeek ${currency}`,
		status: "ok",
		currency,
		total,
		toppedUp,
		granted,
		fetchedAt: null,
		topUpUrl: DEEPSEEK_TOP_UP_URL,
		errorCode: null
	};
}

function balancePayload(generatedAt, accounts, warnings = []) {
	return { generatedAt, accounts, warnings };
}

function unavailableBalancePayload(now, status, code) {
	const message = BALANCE_ERROR_MESSAGES[code] || BALANCE_ERROR_MESSAGES["fetch-failed"];
	return balancePayload(now, [{
		provider: "deepseek", name: "DeepSeek", status, currency: "CNY",
		total: null, toppedUp: null, granted: null, fetchedAt: null,
		topUpUrl: DEEPSEEK_TOP_UP_URL, errorCode: code
	}], [{ code: `BALANCE_${code.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`, message }]);
}

function staleBalancePayload(cached, now, error) {
	const code = balanceErrorCode(error);
	const message = BALANCE_ERROR_MESSAGES[code] || BALANCE_ERROR_MESSAGES["fetch-failed"];
	return balancePayload(now, cached.accounts.map((account) => ({ ...account, status: "stale", errorCode: code })), [{
		code: `BALANCE_${code.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
		message
	}]);
}

/**
 * 请求并校验 DeepSeek 官方余额响应。该函数不缓存、不暴露凭证，便于测试。
 */
async function fetchDeepSeekBalance(credentials, fetchImpl = globalThis.fetch, now = Date.now()) {
	let resolved;
	if (!credentials || typeof credentials.resolve !== "function") throw new DeepSeekBalanceError("no-api-key");
	try {
		resolved = await credentials.resolve(DEEPSEEK_API_KEY_REF);
	} catch {
		throw new DeepSeekBalanceError("credential-failed");
	}
	const apiKey = typeof resolved === "string" ? resolved : resolved?.value;
	if (typeof apiKey !== "string" || !apiKey.trim()) throw new DeepSeekBalanceError("no-api-key");
	if (typeof fetchImpl !== "function") throw new DeepSeekBalanceError("fetch-unavailable");

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), BALANCE_TIMEOUT_MS);
	try {
		let response;
		try {
			response = await fetchImpl(DEEPSEEK_BALANCE_API, {
				headers: { authorization: `Bearer ${apiKey}` },
				signal: controller.signal
			});
		} catch (error) {
			if (error?.name === "AbortError" || error?.name === "TimeoutError" || controller.signal.aborted) {
				throw new DeepSeekBalanceError("fetch-timeout");
			}
			throw new DeepSeekBalanceError("fetch-failed");
		}
		if (!response || !response.ok) {
			const status = Number(response?.status);
			if (status === 401) throw new DeepSeekBalanceError("http-401");
			if (status === 403) throw new DeepSeekBalanceError("http-403");
			if (status === 429) throw new DeepSeekBalanceError("http-429");
			if (status >= 500) throw new DeepSeekBalanceError("http-5xx");
			throw new DeepSeekBalanceError("http-4xx");
		}
		let body;
		try { body = await response.json(); } catch { throw new DeepSeekBalanceError("invalid-response"); }
		if (body?.is_available === false) throw new DeepSeekBalanceError("balance-unavailable");
		if (!Array.isArray(body?.balance_infos) || body.balance_infos.length === 0) throw new DeepSeekBalanceError("invalid-response");
		const accounts = body.balance_infos.map(normalizeBalanceInfo).map((account) => ({ ...account, fetchedAt: now }));
		return balancePayload(now, accounts);
	} finally {
		clearTimeout(timer);
	}
}

const balanceStateByService = new WeakMap();
function balanceState(service) {
	let state = balanceStateByService.get(service);
	if (!state) {
		state = { cache: null, inflight: null };
		balanceStateByService.set(service, state);
	}
	return state;
}

function credentialsService(ctx) {
	try {
		// StatsService deliberately does not require credentials as a class dependency:
		// a missing credential provider must not disable the existing stats RPC.
		return ctx?.reflect?.get?.("credentials", false) || ctx?.credentials || null;
	} catch {
		return null;
	}
}

function dshHome() {
	return process.env.DSH_HOME || join(homedir(), ".dsh");
}

function scanZstdFrames(buffer) {
	const frames = [];
	let truncated = false;
	let offset = 0;
	while (offset < buffer.length) {
		const start = offset;
		if (buffer.length - offset < 4) { truncated = true; break; }
		if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) throw new Error("corrupt Zstandard session log: invalid frame magic");
		offset += 4;
		if (offset >= buffer.length) { truncated = true; break; }
		const descriptor = buffer.readUInt8(offset);
		offset += 1;
		const contentSizeFlag = descriptor >>> 6;
		const singleSegment = (descriptor & 32) !== 0;
		const checksum = (descriptor & 4) !== 0;
		const dictionaryFlag = descriptor & 3;
		const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
		const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : (1 << contentSizeFlag);
		const headerBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
		if (offset + headerBytes > buffer.length) { truncated = true; break; }
		offset += headerBytes;
		for (;;) {
			if (offset + 3 > buffer.length) { truncated = true; offset = buffer.length; break; }
			const blockHeader = buffer.readUIntLE(offset, 3);
			offset += 3;
			const lastBlock = (blockHeader & 1) !== 0;
			const blockType = (blockHeader >>> 1) & 3;
			const blockSize = blockHeader >>> 3;
			const storedBytes = blockType === 1 ? 1 : blockSize;
			if (blockType === 3) throw new Error("corrupt Zstandard session log: reserved block type");
			if (offset + storedBytes > buffer.length) { truncated = true; offset = buffer.length; break; }
			offset += storedBytes;
			if (lastBlock) break;
		}
		if (truncated) break;
		if (checksum && offset + 4 > buffer.length) { truncated = true; break; }
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

// JSONL persistence appends while the host may be reading it. Retry a stable
// stat/read/stat snapshot so an active file is never decoded from a torn tail.
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

function nonNegativeNumber(value) {
	return Number.isFinite(value) && value >= 0 ? value : 0;
}

function firstString(...values) {
	for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
	return null;
}

function accountTypeOf(source, fallback = "api") {
	return firstString(source?.accountType, source?.account_type, source?.billingMode, source?.billing_mode, fallback) || "api";
}

function rawIdentity(providerId, modelRaw, accountType, at) {
	return normalizeIdentity(providerId || "unknown", modelRaw || "(unknown)", accountType || "api", at);
}

function identityKey(identity) {
	return [identity.providerId, identity.modelRaw, identity.accountType].join("\u0000");
}

function identityFields(identity) {
	return {
		providerId: identity.providerId,
		providerFamily: identity.providerFamily,
		modelRaw: identity.modelRaw,
		modelCanonical: identity.modelCanonical,
		accountType: identity.accountType
	};
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
let sessionsDirCache = { home: null, at: 0, dirs: [] };
function sessionDirs(home) {
	const now = Date.now();
	if (sessionsDirCache.home !== home || now - sessionsDirCache.at > 5000) {
		try { sessionsDirCache = { home, at: now, dirs: readdirSync(join(home, "sessions")) }; }
		catch { sessionsDirCache = { home, at: now, dirs: [] }; }
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
		else chunk = { type: "tool-call-delta", index: data.index, id: data.id, ...(data.name !== undefined ? { name: data.name } : {}), argumentsDelta: value };
		return { type: "assistant/chunk", seq: record.seq0 + index, time, data: { turn: data.turn, step: data.step, chunk } };
	});
}

function isTokenDelta(chunk) {
	if (!chunk || typeof chunk !== "object") return false;
	if (chunk.type === "text-delta" || chunk.type === "reasoning-delta") return chunk.text !== "";
	return chunk.type === "tool-call-delta" && (chunk.argumentsDelta !== "" || chunk.name !== undefined);
}

// 解码一个会话：返回时间戳、模型、按 (turn,step) 去重的 usage 样本和逐槽统计。
// seedLength fork 边界：fork 子代理日志前 N 条是父继承上下文，seq < seedLength 的事件丢弃。
// 读取使用 stat/read/stat 稳定快照，并只消费完整 zstd frame；活跃尾部会标记 partial。
const sessionInfoCache = new Map(); // filePath -> { mtimeMs, size, info }
const SESSION_CACHE_LIMIT = 300; // LRU 上限，防长期运行内存膨胀
function sessionInfo(home, sessionId) {
	const file = findSessionFile(home, sessionId);
	if (!file) return { times: [], lastTime: null, model: null, providerId: "unknown", accountType: "api", usages: [], origin: null, parentSession: null, seedLength: null, stats: null, slotStats: [], partial: false, stale: false, missing: true };
	const cached = sessionInfoCache.get(file);
	let snapshot;
	try { snapshot = readStable(file); } catch (error) {
		if (cached) return { ...cached.info, stale: true, readError: error.message };
		throw error;
	}
	const { mtimeMs, size } = snapshot;
	if (cached && cached.mtimeMs === mtimeMs && cached.size === size) {
		// LRU 提升：命中后移到最新
		sessionInfoCache.delete(file);
		sessionInfoCache.set(file, cached);
		return cached.info;
	}
	const buf = snapshot.buf;
	const scanned = scanZstdFrames(buf);
	const times = [];
	let currentModel = null; // 最近 request/header 声明的模型（chunk 兜底用）
	let currentProvider = "unknown";
	let currentAccountType = "api";
	let currentServiceTier = "standard";
	let origin = null, parentSession = null, seedLength = null;
	// 计算 fork 边界：firstOwnSeq = parentSession ? (seedLength ?? 0) : 0
	let firstOwnSeq = 0;
	const usageByStep = new Map();
	const derived = emptyRaw();
	const slotStats = new Map();
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
	const pendingCalls = new Map();
	let derivedEvents = 0;
	let malformedRecords = 0;
	for (const frame of scanned.frames) {
		const text = zstdDecompressSync(buf.subarray(frame.start, frame.end)).toString("utf8");
		for (const line of text.split("\n")) {
			if (!line) continue;
			let record;
			try { record = JSON.parse(line); } catch { malformedRecords++; continue; }
			let events;
			try { events = expandStorageRecord(record); } catch { malformedRecords++; continue; }
			for (const ev of events) {
				const evSeq = ev?.seq;
				if (evSeq !== undefined && evSeq < firstOwnSeq) continue;
				const t = ev?.time;
				if (Number.isFinite(t)) times.push(t);
				if (!ev || typeof ev !== "object") continue;
				if (ev.type === "session") {
					origin = ev.origin ?? null;
					parentSession = ev.parentSession ?? null;
					seedLength = ev.seedLength ?? null;
					if (parentSession !== null) firstOwnSeq = seedLength ?? 0;
				} else if (ev.type === "request/header") {
					const header = ev.data?.header;
					const config = header?.config;
					const m = config?.model;
					if (m) currentModel = m;
					const provider = firstString(config?.provider, config?.providerId, config?.provider_id, header?.provider);
					if (provider) currentProvider = provider;
					currentAccountType = accountTypeOf(config, currentAccountType);
					currentServiceTier = config?.serviceTier === "priority" || config?.service_tier === "priority" ? "priority" : "standard";
				} else if (ev.type === "step/start") {
					openStep = Number.isFinite(t) ? { turn: ev.data?.turn, step: ev.data?.step, startTime: t, firstTokenTime: null } : null;
				} else if (ev.type === "assistant/chunk") {
					if (ev.data?.chunk?.type === "usage" && Number.isFinite(t)) {
						const u = ev.data.chunk.usage || {};
						usageByStep.set(`${ev.data.turn}:${ev.data.step}`, { time: t, model: currentModel, providerId: currentProvider, accountType: currentAccountType, serviceTier: currentServiceTier,
							uncached: nonNegativeNumber(u.inputTokens), output: nonNegativeNumber(u.outputTokens),
							cacheRead: nonNegativeNumber(u.cacheReadTokens), cacheWrite: nonNegativeNumber(u.cacheWriteTokens), reasoning: nonNegativeNumber(u.reasoningTokens) });
					} else if (openStep && openStep.turn === ev.data?.turn && openStep.step === ev.data?.step && openStep.firstTokenTime === null && Number.isFinite(t) && isTokenDelta(ev.data?.chunk)) {
						openStep.firstTokenTime = t;
					}
				} else if (ev.type === "assistant/message") {
					const u = ev.data?.usage;
					const source = ev.data?.message?.source;
					const msgModel = source?.model || currentModel;
					const msgProvider = firstString(source?.provider, source?.providerId, source?.provider_id, currentProvider) || "unknown";
					const msgAccountType = accountTypeOf(source, currentAccountType);
					const msgServiceTier = source?.serviceTier === "priority" || source?.service_tier === "priority" ? "priority" : currentServiceTier;
					if (u !== undefined && Number.isFinite(t)) usageByStep.set(`${ev.data.turn}:${ev.data.step}`, { time: t, model: msgModel, providerId: msgProvider, accountType: msgAccountType, serviceTier: msgServiceTier,
						uncached: nonNegativeNumber(u.inputTokens), output: nonNegativeNumber(u.outputTokens),
						cacheRead: nonNegativeNumber(u.cacheReadTokens), cacheWrite: nonNegativeNumber(u.cacheWriteTokens), reasoning: nonNegativeNumber(u.reasoningTokens) });
					if (openStep && openStep.turn === ev.data?.turn && openStep.step === ev.data?.step && Number.isFinite(t)) {
						const llm = Math.max(0, t - openStep.startTime);
						derived.llmMs += llm; addInterval("llmMs", openStep.startTime, t);
						if (openStep.firstTokenTime !== null) {
							const ttft = Math.max(0, openStep.firstTokenTime - openStep.startTime);
							derived.ttftMs += ttft; derived.ttftSteps++; addSlot(openStep.firstTokenTime, "ttftMs", ttft); addSlot(openStep.firstTokenTime, "ttftSteps", 1);
							const out = Number.isFinite(u?.outputTokens) && u.outputTokens >= 0 ? u.outputTokens : null;
							if (out !== null) { const decode = Math.max(0, t - openStep.firstTokenTime); derived.decodeMs += decode; derived.decodeTokens += out; addInterval("decodeMs", openStep.firstTokenTime, t); addSlot(t, "decodeTokens", out); }
						}
						derivedEvents++;
						openStep = null;
					}
				} else if (ev.type === "tool/call") {
					const callId = ev.data?.callId;
					if (callId !== undefined && Number.isFinite(t)) pendingCalls.set(callId, t);
				} else if (ev.type === "tool/result") {
					const callId = ev.data?.message?.source?.callId;
					if (pendingCalls.has(callId) && Number.isFinite(t)) { const start = pendingCalls.get(callId); const tool = Math.max(0, t - start); derived.toolMs += tool; addInterval("toolMs", start, t); pendingCalls.delete(callId); derivedEvents++; }
				} else if (ev.type === "step/end") {
					derived.steps++; addSlot(t, "steps", 1); derivedEvents++;
					if (lastTurn !== ev.data?.turn) { derived.turns++; addSlot(t, "turns", 1); lastTurn = ev.data?.turn; }
					openStep = null;
				} else if (ev.type === "turn/end") {
					pendingCalls.clear();
				}
			}
		}
	}
	times.sort((a, b) => a - b);
	// 主要路由 = 按 token 量加权最大的 provider/model/accountType。
	// 同一模型由不同 provider 提供时必须保持分离。
	const modelTokens = new Map();
	for (const u of usageByStep.values()) {
		const identity = rawIdentity(u.providerId, u.model, u.accountType, u.time);
		const mk = identityKey(identity);
		const weight = (u.cacheRead || 0) + (u.output || 0) + (u.uncached || 0);
		const row = modelTokens.get(mk) || { identity, weight: 0 };
		row.weight += weight;
		modelTokens.set(mk, row);
	}
	let primary = null, modelWeight = -1;
	for (const row of modelTokens.values()) {
		if (row.weight > modelWeight) { modelWeight = row.weight; primary = row.identity; }
	}
	if (primary === null) primary = rawIdentity(currentProvider, currentModel, currentAccountType, times[times.length - 1]);
	const info = {
		times, lastTime: times.length ? times[times.length - 1] : null,
		model: primary.modelRaw === "(unknown)" ? null : primary.modelRaw,
		providerId: primary.providerId,
		accountType: primary.accountType,
		usages: [...usageByStep.values()],
		origin, parentSession, seedLength, stats: derivedEvents ? derived : null,
		slotStats: [...slotStats.values()].sort((a, b) => a.slot - b.slot), partial: scanned.truncated || !snapshot.stable || malformedRecords > 0, stale: false, missing: false
	};
	sessionInfoCache.set(file, { mtimeMs, size, info });
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

// 按「provider + 模型 + 账户类型 + 服务档 + 上下文 + 30 分钟槽」聚合。
// 上下文 token 数保留到请求粒度，避免 OpenAI/Gemini/MiniMax 的不同阈值被槽聚合破坏。
function slotUsages(usages) {
	const m = new Map();
	for (const u of usages) {
		const k = Math.floor(u.time / SLOT_MS);
		const identity = rawIdentity(u.providerId, u.model, u.accountType, u.time);
		const serviceTier = u.serviceTier === "priority" ? "priority" : "standard";
		const contextTokens = u.uncached + u.cacheRead + u.cacheWrite;
		const contextOver512k = contextTokens > LONG_CONTEXT_TOKENS;
		const key = identityKey(identity) + "\u0000" + serviceTier + "\u0000" + contextTokens + "\u0000" + k;
		const cur = m.get(key) || {
			model: identity.modelRaw,
			...identityFields(identity),
			serviceTier,
			contextTokens,
			contextOver512k,
			slot: k,
			uncached: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			reasoning: 0
		};
		cur.uncached += u.uncached; cur.output += u.output; cur.cacheRead += u.cacheRead; cur.cacheWrite += u.cacheWrite;
		cur.reasoning += u.reasoning;
		m.set(key, cur);
	}
	return [...m.values()].map((row) => ({ ...row, cost: priceUsage(row, row) }));
}

function modelUsages(rows) {
	const grouped = new Map();
	for (const row of rows) {
		const identity = rawIdentity(row.providerId, row.modelRaw || row.model, row.accountType, row.slot * SLOT_MS);
		const key = identityKey(identity);
		const current = grouped.get(key) || {
			model: identity.modelRaw,
			...identityFields(identity),
			uncached: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			reasoning: 0,
			_costs: []
		};
		current.uncached += row.uncached || 0;
		current.output += row.output || 0;
		current.cacheRead += row.cacheRead || 0;
		current.cacheWrite += row.cacheWrite || 0;
		current.reasoning += row.reasoning || 0;
		current._costs.push(row.cost || priceUsage(row, row));
		grouped.set(key, current);
	}
	return [...grouped.values()].map(({ _costs, ...row }) => ({ ...row, cost: summarizeCosts(_costs) }));
}

function projectionSlotUsage(info, usage, updatedAt) {
	const identity = rawIdentity(info.providerId, info.model, info.accountType, updatedAt);
	const contextTokens = usage.uncached + usage.cacheRead + usage.cacheWrite;
	const row = {
		model: identity.modelRaw,
		...identityFields(identity),
		serviceTier: "standard",
		contextTokens,
		contextOver512k: contextTokens > LONG_CONTEXT_TOKENS,
		slot: Math.floor(updatedAt / SLOT_MS),
		...usage
	};
	return { ...row, cost: priceUsage(row, row) };
}

let StatsService = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _aggregate_decorators;
	let _current_decorators;
	let _providers_decorators;
	let _account_decorators;
	return class StatsService extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_aggregate_decorators = [Remote("aggregate")];
			_current_decorators = [Remote("current")];
			_providers_decorators = [Remote("providers")];
			_account_decorators = [Remote("account")];
			__esDecorate(this, null, _aggregate_decorators, {
				kind: "method",
				name: "aggregate",
				static: false,
				private: false,
				access: { has: (obj) => "aggregate" in obj, get: (obj) => obj.aggregate },
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _current_decorators, {
				kind: "method",
				name: "current",
				static: false,
				private: false,
				access: { has: (obj) => "current" in obj, get: (obj) => obj.current },
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _providers_decorators, {
				kind: "method",
				name: "providers",
				static: false,
				private: false,
				access: { has: (obj) => "providers" in obj, get: (obj) => obj.providers },
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _account_decorators, {
				kind: "method",
				name: "account",
				static: false,
				private: false,
				access: { has: (obj) => "account" in obj, get: (obj) => obj.account },
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
			const warnings = [];
			const wsRead = readJson(join(home, "storages", "workspace.json"));
			const sessionsRead = readJson(join(home, "storages", "session_projcache.json"));
			if (!wsRead.ok) warnings.push({ code: "WORKSPACE_READ_FAILED", message: wsRead.error?.message || "workspace storage read failed" });
			if (!sessionsRead.ok) warnings.push({ code: "SESSION_CACHE_READ_FAILED", message: sessionsRead.error?.message || "session projection cache read failed" });
			const wsJson = wsRead.value;
			const workspaces = wsJson?.tables?.workspaces ?? {};
			const archivedSet = new Set(wsJson?.global?.archivedSessionIds ?? []);
			const sessionsTable = sessionsRead.value?.tables?.sessions ?? {};
			const seen = new Set();

			// 处理一个会话：容错（坏日志不拖垮整体），返回会话记录或 null
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
					console.warn(`[dsh-stats] 会话 ${sessionId} 日志解码失败（使用 projection cache）:`, message);
					warnings.push({ code: "SESSION_DECODE_FAILED", sessionId, message });
					info = { times: [], lastTime: null, model: null, providerId: "unknown", accountType: "api", usages: [], slotStats: [], stats: null, partial: false, stale: false, missing: false, unavailable: true };
				}
				if (info.missing) warnings.push({ code: "SESSION_LOG_MISSING", sessionId, message: "session log was not found; projection cache was used where available" });
				if (info.partial) warnings.push({ code: "SESSION_LOG_PARTIAL", sessionId, message: "session log was incomplete or malformed; only valid committed records were used" });
				if (info.stale) warnings.push({ code: "SESSION_LOG_STALE", sessionId, message: info.readError || "cached session snapshot was used" });
				// token 口径统一走日志 usages（已按 seedLength 过滤 fork 继承、按 turn:step 去重），
				// 与 slotUsage / 趋势页 / 成本完全一致。不用 projcache usageTotals：它把 fork
				// 子代理继承的父上下文 cacheRead 也计入了，导致总览页与趋势页不一致。
				let totalUncached = 0, totalOutput = 0, totalCacheRead = 0, totalCacheWrite = 0, totalReasoning = 0;
				for (const u of info.usages) {
					totalUncached += u.uncached || 0;
					totalOutput += u.output || 0;
					totalCacheRead += u.cacheRead || 0;
					totalCacheWrite += u.cacheWrite || 0;
					totalReasoning += u.reasoning || 0;
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
					totalUncached = projectionUsage.uncached; totalOutput = projectionUsage.output;
					totalCacheRead = projectionUsage.cacheRead; totalCacheWrite = projectionUsage.cacheWrite;
					warnings.push({ code: "SESSION_USAGE_FALLBACK", sessionId, message: "token usage came from the projection cache and may include inherited fork context" });
				}
				const eventStats = info.stats || statsRow || {};
				const raw = {
					turns: nonNegativeNumber(eventStats.turns), steps: nonNegativeNumber(eventStats.steps),
					llmMs: nonNegativeNumber(eventStats.llmMs), toolMs: nonNegativeNumber(eventStats.toolMs),
					ttftMs: nonNegativeNumber(eventStats.ttftMs), ttftSteps: nonNegativeNumber(eventStats.ttftSteps),
					decodeMs: nonNegativeNumber(eventStats.decodeMs), decodeTokens: nonNegativeNumber(eventStats.decodeTokens),
					uncached: totalUncached, output: totalOutput,
					cacheRead: totalCacheRead, cacheWrite: totalCacheWrite,
					reasoning: totalReasoning
				};
				const updatedAt = Math.max(info.lastTime ?? 0, lastPromptAt ?? 0, createdAt ?? 0) || null;
				let perSlotUsage = slotUsages(info.usages);
				if (usedProjectionUsage && updatedAt !== null) perSlotUsage = [projectionSlotUsage(info, projectionUsage, updatedAt)];
				const modelUsage = modelUsages(perSlotUsage);
				const primaryIdentity = rawIdentity(info.providerId, info.model, info.accountType, updatedAt);
				const sessionCost = summarizeCosts(perSlotUsage.map((row) => row.cost));
				const session = {
					id: sessionId,
					title: title ?? null,
					updatedAt,
					createdAt,
					model: info.model ?? null,
					...identityFields(primaryIdentity),
					modelUsage,
					cost: sessionCost,
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
					quality: info.stale ? "stale" : (info.partial || info.missing || info.unavailable || usedProjectionUsage) ? "partial" : "exact",
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
						cost: mergeCostSummaries(sessions.map((session) => session.cost)),
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
						target.cost = mergeCostSummaries(target.sessions.map((session) => session.cost));
					});
					projects.sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));
					const cost = mergeCostSummaries(projects.map((project) => project.cost));

			const projectIndex = new Map();
			projects.forEach((p, i) => projectIndex.set(p.id, i));

			// 时间线：先合并同项目并发会话区间，再按槽切分，避免父/子代理重叠计时。
			const daysMap = new Map();
			for (const p of projects) {
				const intervals = p.sessions.flatMap((s) => s._intervals || []).sort((a, b) => a[0] - b[0]);
				const merged = [];
				for (const interval of intervals) {
					const last = merged[merged.length - 1];
					if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]);
					else merged.push([...interval]);
				}
				const projectSlots = new Map();
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
						if (!day) { day = { date, dayTotalMs: 0, slotBlocks: [] }; daysMap.set(date, day); }
						day.dayTotalMs += ms;
						day.slotBlocks.push({ slot: slotOfDay, projectId: p.id, name: p.name, colorIndex: projectIndex.get(p.id), ms });
				}
			}
			const days = [...daysMap.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
			days.forEach((d) => d.slotBlocks.sort((a, b) => a.slot - b.slot));

			return {
						projects,
						cost,
						timeline: { slotMinutes: SLOT_MINUTES, days },
						meta: { schemaVersion: STATS_SCHEMA_VERSION, source: "host", generatedAt: Date.now(), degraded: warnings.length > 0, warnings }
					};
				}

				async providers() {
					return providerViews(this, this.ctx || {});
				}

				async account() {
					return collectAccounts(this, this.ctx || {});
				}

		async current() {
			const state = balanceState(this);
			const now = Date.now();
			if (state.cache && now - state.cache.at < BALANCE_CACHE_MS) return state.cache.payload;
			if (state.inflight) return state.inflight;
			state.inflight = (async () => {
				try {
					const payload = await fetchDeepSeekBalance(credentialsService(this.ctx), globalThis.fetch, Date.now());
					state.cache = { at: Date.now(), payload };
					return payload;
				} catch (error) {
					const code = balanceErrorCode(error);
					if (code === "no-api-key") return unavailableBalancePayload(Date.now(), "unconfigured", code);
					if (state.cache?.payload) return staleBalancePayload(state.cache.payload, Date.now(), error);
					return unavailableBalancePayload(Date.now(), "error", code);
				} finally {
					state.inflight = null;
				}
			})();
			return state.inflight;
		}
	};
})();

export { StatsService, StatsService as default, fetchDeepSeekBalance, normalizeBalanceInfo };
