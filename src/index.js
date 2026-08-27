// 宿主半体 — StatsService：读 DSH 落盘数据（workspace.json + session_projcache.json
// + session.jsonl.zstd），聚合项目级统计 + 精确 30 分钟时间线 + 每会话模型 + 每槽 token。
// 通过 Typert Remote 暴露 stats/aggregate 给浏览器端。
//
// 宿主优先使用 workspace/session persistence、projection 和 query 服务；
// 只有旧 rc6 宿主未注入这些能力时，才回退到本地 JSONL 解码器。

import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { readFileSync, readdirSync, lstatSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { homedir } from "node:os";
import { zstdDecompressSync } from "node:zlib";
import pricing from "./pricing.cjs";
import { collectAccounts, providerViews } from "./accounts.js";

const { normalizeIdentity, priceUsage, convertCostToCny, summarizeCostsCny, mergeCostSummariesCny } = pricing;

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
const SESSION_PROJECTION_DOMAIN_VERSION = 3;
const PROJECTION_ROW_VERSIONS = Object.freeze({ sessionStats: 1, tokenUsage: 1, title: 1, sessionListMetadata: 1, statsRoute: 1 });

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
		if ((descriptor & 8) !== 0) throw new Error("corrupt Zstandard session log: reserved frame-header bit");
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
		last = {
			buf, mtimeMs: after.mtimeMs, ctimeMs: after.ctimeMs, size: after.size, ino: after.ino,
			stable: before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs && before.size === after.size && before.ino === after.ino
		};
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

function objectRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}

// The rc2/rc6 projection registry exposes a view with `routes: []`, while a
// persisted state row keeps the same routes in an object keyed by route key.
// Accept both shapes at the host boundary so a cold read never loses model
// attribution just because it came from a state checkpoint.
function projectionRouteRows(route) {
	if (!objectRecord(route)) return [];
	const raw = route.routes;
	const rows = Array.isArray(raw) ? raw : objectRecord(raw) ? Object.values(raw) : [];
	return rows.filter((row) => objectRecord(row)
		&& typeof row.model === "string" && row.model.trim()
		&& Number.isFinite(row.time) && row.time >= 0
		&& (row.slot === undefined || (Number.isSafeInteger(row.slot) && row.slot >= 0)));
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
	if (typeof sessionId !== "string" || !sessionId) return null;
	let root;
	try { root = realpathSync(join(home, "sessions")); } catch { return null; }
	const encodedId = encodeSegment(sessionId);
	// The current JSONL backend always uses encodeSegment(). A few rc6
	// installations wrote safe ids literally, so retain that compatibility path
	// only when the raw id itself cannot alter path resolution.
	const rawIdIsSafe = sessionId !== "." && sessionId !== ".." && !/[/\\\0]/.test(sessionId);
	for (const enc of sessionDirs(home)) {
		const dirIds = rawIdIsSafe && encodedId !== sessionId ? [encodedId, sessionId] : [encodedId];
		for (const dirId of dirIds) for (const suffix of ["session.jsonl.zstd", "session.jsonl"]) {
			const cand = join(root, enc, dirId, suffix);
			try {
				const stat = lstatSync(cand);
				if (!stat.isFile() || stat.isSymbolicLink()) continue;
				const real = realpathSync(cand);
				const rel = relative(root, real);
				if (rel && rel !== ".." && !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) && !isAbsolute(rel)) return real;
			} catch { /* Missing or unsafe candidate. */ }
		}
	}
	return null;
}

// Official JSONL persistence uses an injective UTF-16 path segment encoding.
// Keep this local fallback because the plugin must also load against a host
// that does not expose the persistence-jsonl helper package as a dependency.
function encodeSegment(raw) {
	if (raw.length === 0) throw new Error("cannot encode an empty path segment");
	if (raw === ".") return "~002E";
	if (raw === "..") return "~002E~002E";
	let out = "";
	for (let i = 0; i < raw.length; i++) {
		const code = raw.charCodeAt(i);
		const ch = String.fromCharCode(code);
		out += ch !== "~" && /^[A-Za-z0-9._-]$/.test(ch) ? ch : `~${code.toString(16).toUpperCase().padStart(4, "0")}`;
	}
	return out;
}

function projectKey(cwd) {
	if (typeof cwd !== "string" || cwd.length === 0) return "_no-cwd";
	let readable = "", separatorRun = false;
	for (let i = 0; i < cwd.length; i++) {
		const code = cwd.charCodeAt(i), ch = String.fromCharCode(code);
		if (ch === "/" || ch === "\\" || ch === ":") {
			if (!separatorRun) readable += "-";
			separatorRun = true;
		} else if (ch !== "~" && /^[A-Za-z0-9._-]$/.test(ch)) {
			readable += ch;
			separatorRun = false;
		} else {
			readable += `~${code.toString(16).toUpperCase().padStart(4, "0")}`;
			separatorRun = false;
		}
	}
	return `--${(readable.replace(/^-+/, "") || "root").slice(0, 251)}--`;
}

function expandStorageRecord(record) {
	if (!record || typeof record !== "object") return [record];
	const type = record.type;
	if (type !== "text-chunks" && type !== "reasoning-chunks" && type !== "tool-call-chunks") return [record];
	const exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
		&& Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
	const data = record.data;
	const envelopeKeys = ["type", "seq0", "time0", "data"];
	if (!exactKeys(record, envelopeKeys) || !Number.isSafeInteger(record.seq0) || record.seq0 < 0 || !Number.isSafeInteger(record.time0)) {
		throw new Error("corrupt session log: malformed packed chunk envelope");
	}
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("corrupt session log: malformed packed chunk data");
	const membersKey = type === "tool-call-chunks" ? "args" : "texts";
	const members = data[membersKey];
	const keys = type === "tool-call-chunks"
		? (Object.prototype.hasOwnProperty.call(data, "name") ? ["turn", "step", "index", "id", "name", "dt", "args"] : ["turn", "step", "index", "id", "dt", "args"])
		: ["turn", "step", "index", "dt", "texts"];
	if (!exactKeys(data, keys) || !Number.isFinite(data.turn) || !Number.isFinite(data.step) || !Number.isFinite(data.index)) {
		throw new Error("corrupt session log: malformed packed chunk data");
	}
	if (!Array.isArray(members) || members.length === 0 || members.some((value) => typeof value !== "string")) throw new Error("corrupt session log: packed chunk members must be non-empty strings");
	if (!Array.isArray(data.dt) || data.dt.length !== members.length - 1 || data.dt.some((dt) => !Number.isSafeInteger(dt))) throw new Error("corrupt session log: invalid packed chunk offsets");
	if (type === "tool-call-chunks" && (typeof data.id !== "string" || (Object.prototype.hasOwnProperty.call(data, "name") && typeof data.name !== "string"))) throw new Error("corrupt session log: invalid packed tool call");
	if (!Number.isSafeInteger(record.seq0 + members.length - 1)) throw new Error("corrupt session log: packed chunk sequence overflow");
	let time = record.time0;
	return members.map((value, index) => {
		if (index > 0) {
			time += data.dt[index - 1];
			if (!Number.isSafeInteger(time)) throw new Error("corrupt session log: packed chunk time overflow");
		}
		let chunk;
		if (type === "text-chunks") chunk = { type: "text-delta", index: data.index, text: value };
		else if (type === "reasoning-chunks") chunk = { type: "reasoning-delta", index: data.index, text: value };
		else chunk = { type: "tool-call-delta", index: data.index, id: data.id, ...(data.name !== undefined ? { name: data.name } : {}), argumentsDelta: value };
		return { type: "assistant/chunk", seq: record.seq0 + index, time, data: { turn: data.turn, step: data.step, chunk } };
	});
}

function contextService(ctx, name) {
	try {
		if (!ctx) return null;
		if (typeof ctx.get === "function") {
			const value = ctx.get(name);
			if (value !== undefined) return value;
		}
		if (typeof ctx.reflect?.get === "function") {
			const value = ctx.reflect.get(name, false);
			if (value !== undefined) return value;
		}
		return ctx[name] || null;
	} catch {
		return null;
	}
}

function normalizeProjectionUsage(value) {
	const totals = objectRecord(value?.totals) || value;
	if (!totals) return null;
	return {
		uncached: nonNegativeNumber(totals.uncachedInputTokens),
		output: nonNegativeNumber(totals.outputTokens),
		cacheRead: nonNegativeNumber(totals.cacheReadTokens),
		cacheWrite: nonNegativeNumber(totals.cacheWriteTokens),
		reasoning: 0
	};
}

function projectionCheckpoint(entry, sessionId, header, warnings, domainVersion) {
	const checkpoint = {};
	if (!objectRecord(entry)) return checkpoint;
	if (domainVersion !== undefined && domainVersion !== SESSION_PROJECTION_DOMAIN_VERSION) {
		warnings.push({ code: "SESSION_CACHE_DOMAIN_VERSION_UNSUPPORTED", sessionId, message: `projection cache domain version ${String(domainVersion)} is not supported` });
		return checkpoint;
	}
	const identity = objectRecord(entry.identity);
	if (identity) {
		if (identity.id !== undefined && identity.id !== sessionId) {
			warnings.push({ code: "SESSION_CACHE_IDENTITY_MISMATCH", sessionId, message: "projection cache identity id did not match the requested session" });
			return checkpoint;
		}
		if (header?.id && identity.id && identity.id !== header.id) return checkpoint;
		if (header?.cwd !== undefined && identity.cwd !== undefined && identity.cwd !== header.cwd) {
			warnings.push({ code: "SESSION_CACHE_CWD_MISMATCH", sessionId, message: "projection cache cwd did not match the session header" });
			return checkpoint;
		}
		if (header?.createdAt !== undefined && identity.createdAt !== undefined && identity.createdAt !== header.createdAt) {
			warnings.push({ code: "SESSION_CACHE_CREATED_AT_MISMATCH", sessionId, message: "projection cache createdAt did not match the session header" });
			return checkpoint;
		}
		for (const key of ["parentSession", "seedLength"]) {
			if (header?.[key] !== undefined && identity[key] !== undefined && identity[key] !== header[key]) {
				warnings.push({ code: "SESSION_CACHE_LIFECYCLE_MISMATCH", sessionId, message: `projection cache ${key} did not match the session lifecycle` });
				return checkpoint;
			}
		}
	}
	const rows = objectRecord(entry.rows);
	if (!rows) return checkpoint;
	for (const [key, row] of Object.entries(rows)) {
		if (!objectRecord(row) || !Number.isSafeInteger(row.ver) || row.ver < 0 || !Number.isSafeInteger(row.seq) || row.seq < -1) {
			warnings.push({ code: "SESSION_CACHE_ROW_INVALID", sessionId, message: `projection row ${key} had invalid ver/seq and was ignored` });
			continue;
		}
		if (PROJECTION_ROW_VERSIONS[key] !== undefined && row.ver !== PROJECTION_ROW_VERSIONS[key]) {
			warnings.push({ code: "SESSION_CACHE_ROW_VERSION_UNSUPPORTED", sessionId, message: `projection row ${key} version ${row.ver} is not supported` });
			continue;
		}
		checkpoint[key] = { ver: row.ver, seq: row.seq, val: row.val };
	}
	return checkpoint;
}

function projectionLifecycleMismatch(route, ...expectedValues) {
	if (!objectRecord(route)) return null;
	for (const key of ["parentSession", "seedLength"]) {
		if (route[key] === undefined) continue;
		for (const expected of expectedValues) {
			if (!objectRecord(expected) || expected[key] === undefined) continue;
			if (route[key] !== expected[key]) return key;
		}
	}
	return null;
}

// The official token/session projections intentionally do not retain the
// provider route. Keep that attribution in a small first-party projection so a
// cold aggregate can use the official watermark without reopening the log.
function routeProjectionState() {
	return {
		origin: null,
		parentSession: null,
		seedLength: null,
		current: { providerId: "unknown", model: null, accountType: "api", serviceTier: "standard" },
		routes: {},
		samples: {}
	};
}

function routeProjectionSchema(value) {
	const record = objectRecord(value);
	if (!record || !objectRecord(record.current) || !Array.isArray(record.routes)) throw new TypeError("invalid statsRoute projection");
	if (record.origin !== null && typeof record.origin !== "string") throw new TypeError("invalid statsRoute origin");
	if (record.parentSession !== null && typeof record.parentSession !== "string") throw new TypeError("invalid statsRoute parentSession");
	if (record.seedLength !== null && (!Number.isSafeInteger(record.seedLength) || record.seedLength < 0)) throw new TypeError("invalid statsRoute seedLength");
	if (typeof record.current.providerId !== "string" || (record.current.model !== null && typeof record.current.model !== "string") || typeof record.current.accountType !== "string" || !["standard", "priority"].includes(record.current.serviceTier)) throw new TypeError("invalid statsRoute current route");
	for (const row of record.routes) {
		if (!objectRecord(row) || (row.model !== null && typeof row.model !== "string") || typeof row.providerId !== "string" || typeof row.accountType !== "string" || !["standard", "priority"].includes(row.serviceTier) || !Number.isSafeInteger(row.slot) || row.slot < 0 || !Number.isFinite(row.time) || row.time < 0) throw new TypeError("invalid statsRoute row");
		for (const key of ["uncached", "output", "cacheRead", "cacheWrite", "reasoning"]) if (!Number.isFinite(row[key]) || row[key] < 0) throw new TypeError("invalid statsRoute token count");
	}
	return value;
}

// rc2 persists the fold state separately from its client-visible wire view,
// while rc6 validates only the view. Keep one validator for both contracts so
// a malformed checkpoint cannot be accepted on either host generation.
function routeProjectionStateSchema(value) {
	const record = objectRecord(value);
	if (!record || !objectRecord(record.routes) || !objectRecord(record.samples)) throw new TypeError("invalid statsRoute state");
	routeProjectionSchema(routeProjectionView(record));
	for (const [key, sample] of Object.entries(record.samples)) {
		if (!objectRecord(sample) || typeof sample.routeKey !== "string") throw new TypeError(`invalid statsRoute sample ${key}`);
		for (const field of ["uncached", "output", "cacheRead", "cacheWrite", "reasoning"]) {
			if (!Number.isFinite(sample[field]) || sample[field] < 0) throw new TypeError(`invalid statsRoute sample ${key}.${field}`);
		}
	}
	return value;
}

// Legacy hosts may expose only the JSON projection cache. Validate the route
// row before using it, then let the same cold-value normalizer handle both the
// persisted state (`routes: {}`) and the client view (`routes: []`).
function routeProjectionValueFromEntry(entry, sessionId, header, warnings, domainVersion) {
	if (domainVersion !== undefined && domainVersion !== SESSION_PROJECTION_DOMAIN_VERSION) return null;
	const row = entry?.rows?.statsRoute;
	if (!objectRecord(row) || !Object.prototype.hasOwnProperty.call(row, "val")) return null;
	const versioned = Object.prototype.hasOwnProperty.call(row, "ver") || Object.prototype.hasOwnProperty.call(row, "seq");
	if (versioned && (!Number.isSafeInteger(row.ver) || row.ver < 0 || !Number.isSafeInteger(row.seq) || row.seq < -1)) {
		warnings.push({ code: "SESSION_CACHE_ROW_INVALID", sessionId, message: "projection row statsRoute had invalid ver/seq and was ignored" });
		return null;
	}
	if (versioned && row.ver !== PROJECTION_ROW_VERSIONS.statsRoute) {
		warnings.push({ code: "SESSION_CACHE_ROW_VERSION_UNSUPPORTED", sessionId, message: `projection row statsRoute version ${String(row.ver)} is not supported` });
		return null;
	}
	const value = row.val;
	try {
		if (objectRecord(value?.routes) && objectRecord(value?.samples)) routeProjectionStateSchema(value);
		else routeProjectionSchema(value);
	} catch {
		warnings.push({ code: "SESSION_CACHE_ROUTE_INVALID", sessionId, message: "projection row statsRoute was malformed and was ignored" });
		return null;
	}
	const lifecycleMismatch = projectionLifecycleMismatch(value, entry?.identity, header);
	if (lifecycleMismatch) {
		warnings.push({ code: "SESSION_CACHE_LIFECYCLE_MISMATCH", sessionId, message: `projection cache ${lifecycleMismatch} did not match the session lifecycle` });
		return null;
	}
	return value;
}

function routeProjectionRoute(config, current) {
	const requestedTier = firstString(config?.serviceTier, config?.service_tier);
	return {
		providerId: firstString(config?.provider, config?.providerId, config?.provider_id, current?.providerId) || "unknown",
		model: firstString(config?.model, current?.model),
		accountType: accountTypeOf(config, current?.accountType || "api"),
		serviceTier: requestedTier === "priority" ? "priority" : requestedTier === "standard" ? "standard" : (current?.serviceTier === "priority" ? "priority" : "standard")
	};
}

function routeProjectionUsage(event) {
	if (event?.type === "assistant/chunk" && event.data?.chunk?.type === "usage") return event.data.chunk.usage || {};
	if (event?.type === "assistant/message" && event.data?.usage !== undefined) return event.data.usage || {};
	return null;
}

function routeProjectionApply(state, event) {
	if (!event || typeof event !== "object") return state;
	if (event.type === "session") {
		const next = { ...state };
		if (typeof event.origin === "string") next.origin = event.origin;
		if (typeof event.parentSession === "string") next.parentSession = event.parentSession;
		if (Number.isSafeInteger(event.seedLength) && event.seedLength >= 0) next.seedLength = event.seedLength;
		return next;
	}
	// Fork logs begin with inherited seed events. Their usage belongs to the
	// parent and must never enter this child projection.
	const firstOwnSeq = state.parentSession !== null ? state.seedLength ?? 0 : 0;
	if (Number.isSafeInteger(event.seq) && event.seq < firstOwnSeq) return state;
	let current = state.current;
	if (event.type === "request/header") {
		const header = event.data?.header;
		const config = header?.config;
		current = routeProjectionRoute({ ...config, provider: firstString(config?.provider, config?.providerId, config?.provider_id, header?.provider) }, current);
		return { ...state, current };
	}
	const usage = routeProjectionUsage(event);
	if (!usage || !Number.isFinite(event.time) || event.time < 0) return state;
	const source = event.type === "assistant/message" ? event.data?.message?.source : null;
	const route = routeProjectionRoute({
		provider: firstString(source?.provider, source?.providerId, source?.provider_id),
		model: source?.model,
		accountType: accountTypeOf(source, current.accountType),
		serviceTier: source?.serviceTier,
		service_tier: source?.service_tier
	}, current);
	if (!route.model) return { ...state, current: route };
	const uncached = nonNegativeNumber(usage.inputTokens);
	const output = nonNegativeNumber(usage.outputTokens);
	const cacheRead = nonNegativeNumber(usage.cacheReadTokens);
	const cacheWrite = nonNegativeNumber(usage.cacheWriteTokens);
	const reasoning = nonNegativeNumber(usage.reasoningTokens);
	const contextTokens = uncached + cacheRead + cacheWrite;
	const slot = Math.floor(event.time / SLOT_MS);
	const routeKey = JSON.stringify([route.providerId, route.model, route.accountType, route.serviceTier, slot, contextTokens]);
	const sampleKey = Number.isSafeInteger(event.data?.turn) && Number.isSafeInteger(event.data?.step)
		? `${event.data.turn}:${event.data.step}` : `event:${Number.isSafeInteger(event.seq) ? event.seq : Object.keys(state.samples).length}`;
	const routes = { ...state.routes };
	const adjust = (key, delta) => {
		const previous = routes[key];
		if (!previous) return;
		const next = { ...previous };
		for (const field of ["uncached", "output", "cacheRead", "cacheWrite", "reasoning"]) next[field] = Math.max(0, next[field] + delta * (state.samples[sampleKey]?.[field] || 0));
		if (next.uncached + next.output + next.cacheRead + next.cacheWrite + next.reasoning === 0) delete routes[key];
		else routes[key] = next;
	};
	const previous = state.samples[sampleKey];
	if (previous) adjust(previous.routeKey, -1);
	const row = routes[routeKey] || { providerId: route.providerId, model: route.model, accountType: route.accountType, serviceTier: route.serviceTier, slot, time: event.time, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
	routes[routeKey] = { ...row, time: Math.max(row.time, event.time), uncached: row.uncached + uncached, output: row.output + output, cacheRead: row.cacheRead + cacheRead, cacheWrite: row.cacheWrite + cacheWrite, reasoning: row.reasoning + reasoning };
	const samples = { ...state.samples, [sampleKey]: { routeKey, uncached, output, cacheRead, cacheWrite, reasoning } };
	return { ...state, current: route, routes, samples };
}

function routeProjectionView(state) {
	const routes = Object.values(state.routes).map((row) => ({ ...row })).sort((a, b) => a.slot - b.slot || a.providerId.localeCompare(b.providerId) || String(a.model ?? "").localeCompare(String(b.model ?? "")));
	let primary = state.current;
	let weight = -1;
	for (const row of routes) {
		const nextWeight = row.uncached + row.output + row.cacheRead + row.cacheWrite;
		if (nextWeight > weight) { weight = nextWeight; primary = row; }
	}
	return {
		origin: state.origin,
		parentSession: state.parentSession,
		seedLength: state.seedLength,
		current: { providerId: primary.providerId, model: primary.model, accountType: primary.accountType, serviceTier: primary.serviceTier },
		routes
	};
}

const STATS_ROUTE_PROJECTION = Object.freeze({
	key: "statsRoute",
	stateVersion: 1,
	schema: { parse: routeProjectionSchema },
	stateSchema: { parse: routeProjectionStateSchema },
	init: routeProjectionState,
	apply: routeProjectionApply,
	view: routeProjectionView,
	wire: { viewSchema: { parse: routeProjectionSchema }, view: routeProjectionView }
});

function deriveSessionInfoFromEvents(rawEvents, header = null, quality = {}) {
	const events = [];
	let malformedRecords = 0;
	for (const raw of Array.isArray(rawEvents) ? rawEvents : []) {
		try {
			const expanded = expandStorageRecord(raw);
			for (const event of expanded) events.push(event);
		} catch {
			malformedRecords++;
		}
	}
	const times = [];
	let currentModel = null;
	let currentProvider = "unknown";
	let currentAccountType = "api";
	let currentServiceTier = "standard";
	let origin = typeof header?.origin === "string" ? header.origin : null;
	let parentSession = typeof header?.parentSession === "string" ? header.parentSession : null;
	let seedLength = Number.isSafeInteger(header?.seedLength) && header.seedLength >= 0 ? header.seedLength : null;
	let firstOwnSeq = parentSession !== null ? seedLength ?? 0 : 0;
	const usageByStep = new Map();
	const derived = emptyRaw();
	const slotStats = new Map();
	const addSlot = (time, field, value) => {
		if (!Number.isFinite(time) || !value) return;
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
	let lastSeq = -1;
	let expectedSeq = 0;
	let seqGap = false;
	for (const ev of events) {
		const evSeq = ev?.seq;
		if (evSeq !== undefined && (!Number.isSafeInteger(evSeq) || evSeq < 0)) { malformedRecords++; continue; }
		if (Number.isSafeInteger(evSeq)) {
			if (evSeq !== expectedSeq) {
				// Fork logs may omit inherited seed rows in a compatibility fixture;
				// the first own row still establishes a valid post-seed boundary.
				if (!(evSeq === firstOwnSeq && expectedSeq < firstOwnSeq)) seqGap = true;
			}
			if (evSeq >= expectedSeq) expectedSeq = evSeq + 1;
			lastSeq = Math.max(lastSeq, evSeq);
		}
		if (evSeq !== undefined && evSeq < firstOwnSeq) continue;
		const t = ev?.time;
		if (Object.prototype.hasOwnProperty.call(ev || {}, "time") && (!Number.isFinite(t) || t < 0)) { malformedRecords++; continue; }
		if (Number.isFinite(t)) times.push(t);
		if (!ev || typeof ev !== "object") continue;
		if (ev.type === "session") {
			origin = typeof ev.origin === "string" ? ev.origin : origin;
			parentSession = typeof ev.parentSession === "string" ? ev.parentSession : parentSession;
			seedLength = Number.isSafeInteger(ev.seedLength) && ev.seedLength >= 0 ? ev.seedLength : seedLength;
			if (parentSession !== null) firstOwnSeq = seedLength ?? 0;
		} else if (ev.type === "request/header") {
			const config = ev.data?.header?.config;
			if (config?.model) currentModel = config.model;
			const provider = firstString(config?.provider, config?.providerId, config?.provider_id, ev.data?.header?.provider);
			if (provider) currentProvider = provider;
			currentAccountType = accountTypeOf(config, currentAccountType);
			currentServiceTier = config?.serviceTier === "priority" || config?.service_tier === "priority" ? "priority" : "standard";
		} else if (ev.type === "step/start") {
			openStep = Number.isFinite(t) ? { turn: ev.data?.turn, step: ev.data?.step, startTime: t, firstTokenTime: null } : null;
		} else if (ev.type === "assistant/chunk") {
			if (ev.data?.chunk?.type === "usage" && Number.isFinite(t)) {
				const u = ev.data.chunk.usage || {};
				const key = ev.data?.turn !== undefined && ev.data?.step !== undefined ? `${ev.data.turn}:${ev.data.step}` : `event:${evSeq ?? events.indexOf(ev)}`;
				usageByStep.set(key, { time: t, model: currentModel, providerId: currentProvider, accountType: currentAccountType, serviceTier: currentServiceTier,
					uncached: nonNegativeNumber(u.inputTokens), output: nonNegativeNumber(u.outputTokens), cacheRead: nonNegativeNumber(u.cacheReadTokens), cacheWrite: nonNegativeNumber(u.cacheWriteTokens), reasoning: nonNegativeNumber(u.reasoningTokens) });
			} else if (openStep && openStep.turn === ev.data?.turn && openStep.step === ev.data?.step && openStep.firstTokenTime === null && Number.isFinite(t) && isTokenDelta(ev.data?.chunk)) openStep.firstTokenTime = t;
		} else if (ev.type === "assistant/message") {
			const u = ev.data?.usage;
			const source = ev.data?.message?.source;
			const msgModel = source?.model || currentModel;
			const msgProvider = firstString(source?.provider, source?.providerId, source?.provider_id, currentProvider) || "unknown";
			const msgAccountType = accountTypeOf(source, currentAccountType);
			const msgServiceTier = source?.serviceTier === "priority" || source?.service_tier === "priority" ? "priority" : currentServiceTier;
			if (u !== undefined && Number.isFinite(t)) {
				const key = ev.data?.turn !== undefined && ev.data?.step !== undefined ? `${ev.data.turn}:${ev.data.step}` : `event:${evSeq ?? events.indexOf(ev)}`;
				usageByStep.set(key, { time: t, model: msgModel, providerId: msgProvider, accountType: msgAccountType, serviceTier: msgServiceTier,
					uncached: nonNegativeNumber(u.inputTokens), output: nonNegativeNumber(u.outputTokens), cacheRead: nonNegativeNumber(u.cacheReadTokens), cacheWrite: nonNegativeNumber(u.cacheWriteTokens), reasoning: nonNegativeNumber(u.reasoningTokens) });
			}
			if (openStep && openStep.turn === ev.data?.turn && openStep.step === ev.data?.step && Number.isFinite(t)) {
				const llm = Math.max(0, t - openStep.startTime); derived.llmMs += llm; addInterval("llmMs", openStep.startTime, t);
				if (openStep.firstTokenTime !== null) {
					const ttft = Math.max(0, openStep.firstTokenTime - openStep.startTime); derived.ttftMs += ttft; derived.ttftSteps++; addSlot(openStep.firstTokenTime, "ttftMs", ttft); addSlot(openStep.firstTokenTime, "ttftSteps", 1);
					const out = Number.isFinite(u?.outputTokens) && u.outputTokens >= 0 ? u.outputTokens : null;
					if (out !== null) { const decode = Math.max(0, t - openStep.firstTokenTime); derived.decodeMs += decode; derived.decodeTokens += out; addInterval("decodeMs", openStep.firstTokenTime, t); addSlot(t, "decodeTokens", out); }
				}
				derivedEvents++; openStep = null;
			}
		} else if (ev.type === "tool/call") {
			const callId = ev.data?.callId;
			if (typeof callId === "string" && Number.isFinite(t)) pendingCalls.set(callId, t);
		} else if (ev.type === "tool/result") {
			const callId = ev.data?.message?.source?.callId;
			if (typeof callId === "string" && pendingCalls.has(callId) && Number.isFinite(t)) { const start = pendingCalls.get(callId); const tool = Math.max(0, t - start); derived.toolMs += tool; addInterval("toolMs", start, t); pendingCalls.delete(callId); derivedEvents++; }
		} else if (ev.type === "step/end") {
			derived.steps++; addSlot(t, "steps", 1); derivedEvents++;
			if (lastTurn !== ev.data?.turn) { derived.turns++; addSlot(t, "turns", 1); lastTurn = ev.data?.turn; }
			openStep = null;
		} else if (ev.type === "turn/end") pendingCalls.clear();
	}
	times.sort((a, b) => a - b);
	const modelTokens = new Map();
	for (const u of usageByStep.values()) {
		const identity = rawIdentity(u.providerId, u.model, u.accountType, u.time);
		const key = identityKey(identity);
		const row = modelTokens.get(key) || { identity, weight: 0 };
		row.weight += (u.cacheRead || 0) + (u.cacheWrite || 0) + (u.output || 0) + (u.uncached || 0);
		modelTokens.set(key, row);
	}
	let primary = null, modelWeight = -1;
	for (const row of modelTokens.values()) if (row.weight > modelWeight) { modelWeight = row.weight; primary = row.identity; }
	if (primary === null) primary = rawIdentity(currentProvider, currentModel, currentAccountType, times[times.length - 1]);
	return {
		times, lastTime: times.length ? times[times.length - 1] : null,
		model: primary.modelRaw === "(unknown)" ? null : primary.modelRaw,
		providerId: primary.providerId, accountType: primary.accountType,
		usages: [...usageByStep.values()], origin, parentSession, seedLength,
		stats: derivedEvents ? derived : null, slotStats: [...slotStats.values()].sort((a, b) => a.slot - b.slot),
		partial: Boolean(quality.partial) || malformedRecords > 0 || seqGap || (header?.version !== undefined && header.version !== 0), stale: Boolean(quality.stale), missing: false, unavailable: false,
		malformedRecords, lastSeq, seqGap, formatVersion: header?.version, futureVersion: header?.version !== undefined && header.version > 0,
		header: header || null
	};
}

async function officialSessionSource(ctx, sessionId) {
	const sessions = contextService(ctx, "sessions");
	const live = sessions?.get?.(sessionId);
	if (live && Array.isArray(live.events)) return { header: live.header, events: live.events, source: "live", liveSession: live };
	const query = contextService(ctx, "sessionQuery");
	if (query && typeof query.readSession === "function") {
		const loaded = await query.readSession(sessionId);
		if (loaded && Array.isArray(loaded.events)) return { header: loaded.header || loaded.meta || loaded.session, events: loaded.events, source: "sessionQuery" };
	}
	const persistence = contextService(ctx, "sessionPersistence");
	if (persistence && typeof persistence.inspect === "function") {
		const loaded = await persistence.inspect(sessionId);
		if (loaded && Array.isArray(loaded.events)) return { header: loaded.meta || loaded.header || loaded.session, events: loaded.events, source: "sessionPersistence" };
	}
	if (persistence && typeof persistence.load === "function") {
		const loaded = await persistence.load(sessionId);
		if (loaded && Array.isArray(loaded.events)) return { header: loaded.meta || loaded.header || loaded.session, events: loaded.events, source: "sessionPersistence" };
	}
	return null;
}

async function officialProjectionValues(ctx, source, entry, warnings, sessionId, domainVersion) {
	const projections = contextService(ctx, "sessionProjections");
	const projectionCache = contextService(ctx, "sessionProjectionCache");
	try {
		// Live sessions already have an authoritative in-memory projection cut;
		// never turn that read into a cold persistence round trip.
		if (source?.source === "live" && source.liveSession && typeof projections?.snapshot === "function") {
			return projections.snapshot(source.liveSession)?.values || null;
		}
		// The shipped projection-cache service owns the cache identity, version,
		// watermark and stale-log recovery rules. Prefer its cold-read ladder when
		// available; the explicit restore path below is retained for rc6/partial
		// hosts that expose the registry but not the cache service.
			if (projectionCache && typeof projectionCache.coldSnapshot === "function") {
			try {
				const snapshot = await projectionCache.coldSnapshot(sessionId);
				const snapshotSeq = snapshot?.asOfSeq;
				const snapshotDomain = snapshot?.domain ?? snapshot?.unit;
				const snapshotVersion = snapshot?.version;
				const snapshotIdentity = objectRecord(snapshot?.identity);
				const expectedIdentity = objectRecord(entry?.identity) || objectRecord(source?.header);
				const lifecycleMismatch = projectionLifecycleMismatch(snapshot?.values?.statsRoute, entry?.identity, source?.header);
				const identityMismatch = snapshotIdentity && expectedIdentity &&
					(snapshotIdentity.id !== undefined && expectedIdentity.id !== undefined && snapshotIdentity.id !== expectedIdentity.id
						|| snapshotIdentity.createdAt !== undefined && expectedIdentity.createdAt !== undefined && snapshotIdentity.createdAt !== expectedIdentity.createdAt
						|| snapshotIdentity.cwd !== undefined && expectedIdentity.cwd !== undefined && snapshotIdentity.cwd !== expectedIdentity.cwd);
				if (snapshotDomain !== undefined && snapshotDomain !== "session_projcache") {
					warnings.push({ code: "SESSION_CACHE_DOMAIN_MISMATCH", sessionId, message: "official projection snapshot belonged to a different domain" });
				} else if (identityMismatch) {
					warnings.push({ code: "SESSION_CACHE_IDENTITY_MISMATCH", sessionId, message: "official projection snapshot identity did not match the requested lifecycle" });
				} else if (lifecycleMismatch) {
					warnings.push({ code: "SESSION_CACHE_LIFECYCLE_MISMATCH", sessionId, message: `official projection snapshot ${lifecycleMismatch} did not match the session lifecycle` });
				} else if (snapshotVersion !== undefined && snapshotVersion !== SESSION_PROJECTION_DOMAIN_VERSION) {
					warnings.push({ code: "SESSION_CACHE_DOMAIN_VERSION_UNSUPPORTED", sessionId, message: `official projection snapshot version ${String(snapshotVersion)} is not supported` });
				} else if (snapshotSeq !== undefined && (!Number.isSafeInteger(snapshotSeq) || snapshotSeq < -1)) {
					warnings.push({ code: "SESSION_CACHE_WATERMARK_INVALID", sessionId, message: "official projection snapshot watermark was invalid" });
				} else if (snapshot?.values && typeof snapshot.values === "object" && !Array.isArray(snapshot.values)) {
					warnings.push({ code: "OFFICIAL_PROJECTION_CACHE_USED", sessionId, message: "projection values loaded through sessionProjectionCache coldSnapshot" });
					return snapshot.values;
				}
			} catch {
				// A cache miss or an unavailable cache must not hide the persistence
				// and registry fallback paths below.
			}
		}
		if (!projections) return null;
		const persistence = contextService(ctx, "sessionPersistence");
		if (persistence && typeof persistence.readFrom === "function" && typeof projections.restore === "function" && typeof projections.restoreFloor === "function") {
			const checkpoint = projectionCheckpoint(entry, sessionId, source?.header, warnings, domainVersion);
			const floor = projections.restoreFloor(checkpoint);
			if (floor !== undefined) {
				const suffix = await persistence.readFrom(sessionId, floor);
				if (suffix && Array.isArray(suffix.events)) {
					const restored = projections.restore(checkpoint, suffix.events, floor);
					return restored?.snapshot?.values || null;
				}
			}
		}
		if (typeof projections.restore === "function" && source?.events) {
			const checkpoint = projectionCheckpoint(entry, sessionId, source.header, warnings, domainVersion);
			const restored = projections.restore(checkpoint, source.events, 0);
			return restored?.snapshot?.values || null;
		}
	} catch (error) {
		warnings.push({ code: "OFFICIAL_PROJECTION_FAILED", sessionId, message: error?.message || String(error) });
	}
	return null;
}

// A cold projection snapshot can be sufficient for an archived/missing log.
// Keep that path explicit so the host never has to synchronously scan files
// merely to recover token totals from the official cache service.
function infoFromProjectionValues(values, entry) {
	const metadata = objectRecord(values?.sessionListMetadata) || objectRecord(entry?.rows?.sessionListMetadata?.val) || {};
	const identity = objectRecord(entry?.identity) || {};
	const createdAt = Number.isFinite(identity.createdAt) && identity.createdAt >= 0 ? identity.createdAt : null;
	const lastPromptAt = Number.isFinite(metadata.lastPromptAt) && metadata.lastPromptAt >= 0 ? metadata.lastPromptAt : null;
	const routeProjection = objectRecord(values?.statsRoute);
	const routeRows = projectionRouteRows(routeProjection);
	const routeTimes = routeRows.map((row) => row.time).filter((value) => Number.isFinite(value) && value >= 0);
	const times = [createdAt, lastPromptAt, ...routeTimes].filter((value, index, list) => value !== null && list.indexOf(value) === index).sort((a, b) => a - b);
	const usages = routeRows.map((row) => ({
		time: row.time,
		model: row.model,
		providerId: firstString(row.providerId) || "unknown",
		accountType: accountTypeOf(row, "api"),
		serviceTier: row.serviceTier === "priority" ? "priority" : "standard",
		uncached: nonNegativeNumber(row.uncached),
		output: nonNegativeNumber(row.output),
		cacheRead: nonNegativeNumber(row.cacheRead),
		cacheWrite: nonNegativeNumber(row.cacheWrite),
		reasoning: nonNegativeNumber(row.reasoning)
	}));
	// `current` in a persisted state is the most recently observed route, not
	// necessarily the route carrying the most tokens. Derive the primary
	// identity from all buckets so multi-model cold sessions remain billable and
	// are displayed under the same model as the event-based path.
	let primary = null;
	let primaryWeight = -1;
	for (const row of usages) {
		const weight = row.uncached + row.output + row.cacheRead + row.cacheWrite;
		if (weight > primaryWeight) {
			primaryWeight = weight;
			primary = row;
		}
	}
	const current = primary || objectRecord(routeProjection?.current) || {};
	return {
		times,
		lastTime: times.length ? times.at(-1) : null,
		model: firstString(current.model, metadata.model, identity.model),
		providerId: firstString(current.providerId, metadata.providerId, identity.providerId) || "unknown",
		accountType: firstString(current.accountType, metadata.accountType, identity.accountType) || "api",
		usages,
		origin: firstString(routeProjection?.origin, metadata.origin, identity.origin),
		parentSession: firstString(routeProjection?.parentSession, metadata.parentSession, identity.parentSession),
		seedLength: Number.isSafeInteger(routeProjection?.seedLength) && routeProjection.seedLength >= 0 ? routeProjection.seedLength : Number.isSafeInteger(metadata.seedLength) && metadata.seedLength >= 0 ? metadata.seedLength : null,
		stats: objectRecord(values?.sessionStats),
		slotStats: [],
		partial: true,
		cacheOnly: true,
		stale: false,
		missing: false,
		unavailable: false,
		seqGap: false,
		futureVersion: false,
		lastSeq: -1
	};
}

function isTokenDelta(chunk) {
	if (!chunk || typeof chunk !== "object") return false;
	if (chunk.type === "text-delta" || chunk.type === "reasoning-delta") return chunk.text !== "";
	return chunk.type === "tool-call-delta" && (chunk.argumentsDelta !== "" || chunk.name !== undefined);
}

function readSessionRecords(file, snapshot) {
	const records = [];
	let truncated = false;
	if (file.endsWith(".jsonl")) {
		const text = snapshot.buf.toString("utf8");
		const lines = text.split("\n");
		if (lines.length && lines.at(-1) !== "") {
			truncated = true;
			lines.pop();
		}
		for (const line of lines) {
			if (!line) continue;
			try { records.push(JSON.parse(line)); }
			catch { records.push(null); }
		}
		return { records, truncated };
	}
	const scanned = scanZstdFrames(snapshot.buf);
	truncated = scanned.truncated;
	for (const frame of scanned.frames) {
		const text = zstdDecompressSync(snapshot.buf.subarray(frame.start, frame.end)).toString("utf8");
		const lines = text.split("\n");
		// Official writers terminate every committed JSONL batch. A missing
		// newline inside a complete frame is still a malformed committed row.
		if (lines.at(-1) !== "") truncated = true;
		for (const line of lines) {
			if (!line) continue;
			try { records.push(JSON.parse(line)); }
			catch { records.push(null); }
		}
	}
	return { records, truncated };
}

// 解码一个会话：返回时间戳、模型、按 (turn,step) 去重的 usage 样本和逐槽统计。
// seedLength fork 边界：fork 子代理日志前 N 条是父继承上下文，seq < seedLength 的事件丢弃。
// 读取使用 stat/read/stat 稳定快照，并只消费完整 zstd frame；活跃尾部会标记 partial。
const sessionInfoCache = new Map(); // filePath -> { mtimeMs, ctimeMs, size, ino, info }
const SESSION_CACHE_LIMIT = 300; // LRU 上限，防长期运行内存膨胀
function sessionInfo(home, sessionId) {
	const file = findSessionFile(home, sessionId);
	if (!file) return { times: [], lastTime: null, model: null, providerId: "unknown", accountType: "api", usages: [], origin: null, parentSession: null, seedLength: null, stats: null, slotStats: [], partial: false, stale: false, missing: true, seqGap: false, futureVersion: false, header: null };
	const cached = sessionInfoCache.get(file);
	let snapshot;
	try { snapshot = readStable(file); } catch (error) {
		if (cached) return { ...cached.info, stale: true, readError: error.message };
		throw error;
	}
	const { mtimeMs, ctimeMs, size, ino } = snapshot;
	if (cached && cached.mtimeMs === mtimeMs && cached.ctimeMs === ctimeMs && cached.size === size && cached.ino === ino) {
		// LRU 提升：命中后移到最新
		sessionInfoCache.delete(file);
		sessionInfoCache.set(file, cached);
		return cached.info;
	}
	const decoded = readSessionRecords(file, snapshot);
	const records = decoded.records;
	const times = [];
	let currentModel = null; // 最近 request/header 声明的模型（chunk 兜底用）
	let currentProvider = "unknown";
	let currentAccountType = "api";
	let currentServiceTier = "standard";
	let sessionHeader = null;
	for (const record of records) {
		try {
			for (const ev of expandStorageRecord(record)) if (ev?.type === "session") { sessionHeader = ev; break; }
		} catch { /* The main pass records malformed rows. */ }
		if (sessionHeader) break;
	}
	let origin = typeof sessionHeader?.origin === "string" ? sessionHeader.origin : null;
	let parentSession = typeof sessionHeader?.parentSession === "string" ? sessionHeader.parentSession : null;
	let seedLength = Number.isInteger(sessionHeader?.seedLength) && sessionHeader.seedLength >= 0 ? sessionHeader.seedLength : null;
	const invalidSessionHeader = !!sessionHeader && (
		(sessionHeader.origin !== undefined && sessionHeader.origin !== null && typeof sessionHeader.origin !== "string")
		|| (sessionHeader.parentSession !== undefined && sessionHeader.parentSession !== null && typeof sessionHeader.parentSession !== "string")
		|| (sessionHeader.seedLength !== undefined && sessionHeader.seedLength !== null && seedLength === null)
	);
	// 计算 fork 边界：firstOwnSeq = parentSession ? (seedLength ?? 0) : 0
	let firstOwnSeq = parentSession !== null ? (Number.isInteger(seedLength) && seedLength >= 0 ? seedLength : 0) : 0;
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
	let malformedRecords = invalidSessionHeader ? 1 : 0;
	let decodedEvents = sessionHeader ? 1 : 0;
	let lastSeq = -1;
	let expectedSeq = 0;
	let seqGap = false;
	let futureVersion = false;
	let usageFallbackIndex = 0;
	for (const record of records) {
			if (record === null) { malformedRecords++; continue; }
			let events;
			try { events = expandStorageRecord(record); } catch { malformedRecords++; continue; }
			for (const ev of events) {
				const evSeq = ev?.seq;
				if (evSeq !== undefined && (!Number.isInteger(evSeq) || evSeq < 0)) { malformedRecords++; continue; }
				if (Number.isSafeInteger(evSeq)) {
					if (evSeq !== expectedSeq && !(evSeq === firstOwnSeq && expectedSeq < firstOwnSeq)) seqGap = true;
					if (evSeq >= expectedSeq) expectedSeq = evSeq + 1;
					lastSeq = Math.max(lastSeq, evSeq);
				}
				if (evSeq !== undefined && evSeq < firstOwnSeq) continue;
				const t = ev?.time;
				if (ev && Object.prototype.hasOwnProperty.call(ev, "time") && (!Number.isFinite(t) || t < 0)) { malformedRecords++; continue; }
				if (Number.isFinite(t)) times.push(t);
				if (!ev || typeof ev !== "object") continue;
				decodedEvents++;
				if (ev.type === "session") {
					if (ev.origin !== undefined && ev.origin !== null && typeof ev.origin !== "string") malformedRecords++;
					if (ev.parentSession !== undefined && ev.parentSession !== null && typeof ev.parentSession !== "string") malformedRecords++;
					origin = typeof ev.origin === "string" ? ev.origin : null;
					parentSession = typeof ev.parentSession === "string" ? ev.parentSession : null;
					if (ev.seedLength !== undefined && ev.seedLength !== null && (!Number.isInteger(ev.seedLength) || ev.seedLength < 0)) malformedRecords++;
					seedLength = Number.isInteger(ev.seedLength) && ev.seedLength >= 0 ? ev.seedLength : null;
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
						const hasStepIdentity = ev.data?.turn !== undefined && ev.data?.step !== undefined;
						if (!hasStepIdentity) malformedRecords++;
						const usageKey = hasStepIdentity ? `${ev.data.turn}:${ev.data.step}` : `event:${evSeq ?? "missing"}:${usageFallbackIndex++}`;
						usageByStep.set(usageKey, { time: t, model: currentModel, providerId: currentProvider, accountType: currentAccountType, serviceTier: currentServiceTier,
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
					if (u !== undefined && Number.isFinite(t)) {
						const hasStepIdentity = ev.data?.turn !== undefined && ev.data?.step !== undefined;
						if (!hasStepIdentity) malformedRecords++;
						const usageKey = hasStepIdentity ? `${ev.data.turn}:${ev.data.step}` : `event:${evSeq ?? "missing"}:${usageFallbackIndex++}`;
						usageByStep.set(usageKey, { time: t, model: msgModel, providerId: msgProvider, accountType: msgAccountType, serviceTier: msgServiceTier,
							uncached: nonNegativeNumber(u.inputTokens), output: nonNegativeNumber(u.outputTokens),
							cacheRead: nonNegativeNumber(u.cacheReadTokens), cacheWrite: nonNegativeNumber(u.cacheWriteTokens), reasoning: nonNegativeNumber(u.reasoningTokens) });
					}
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
	if (sessionHeader && sessionHeader.version !== 0) futureVersion = sessionHeader.version > 0;
	times.sort((a, b) => a - b);
	// 主要路由 = 按 token 量加权最大的 provider/model/accountType。
	// 同一模型由不同 provider 提供时必须保持分离。
	const modelTokens = new Map();
	for (const u of usageByStep.values()) {
		const identity = rawIdentity(u.providerId, u.model, u.accountType, u.time);
		const mk = identityKey(identity);
		const weight = (u.cacheRead || 0) + (u.cacheWrite || 0) + (u.output || 0) + (u.uncached || 0);
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
		times, lastTime: times.length ? times[times.length - 1] : null, lastSeq,
		model: primary.modelRaw === "(unknown)" ? null : primary.modelRaw,
		providerId: primary.providerId,
		accountType: primary.accountType,
		usages: [...usageByStep.values()],
		origin, parentSession, seedLength, stats: derivedEvents ? derived : null,
		slotStats: [...slotStats.values()].sort((a, b) => a.slot - b.slot), partial: decoded.truncated || !snapshot.stable || malformedRecords > 0 || decodedEvents === 0 || seqGap || futureVersion, stale: false, missing: false, seqGap, formatVersion: sessionHeader?.version, futureVersion, header: sessionHeader
	};
	sessionInfoCache.set(file, { mtimeMs, ctimeMs, size, ino, info });
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
	return [...m.values()].map((row) => ({ ...row, cost: convertCostToCny(priceUsage(row, row)) }));
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
		current._costs.push(convertCostToCny(row.cost || priceUsage(row, row)));
		grouped.set(key, current);
	}
	return [...grouped.values()].map(({ _costs, ...row }) => ({ ...row, cost: summarizeCostsCny(_costs) }));
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
	return { ...row, cost: convertCostToCny(priceUsage(row, row)) };
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
			// Register the route projection only when the host exposes the official
			// registry. The registration is scoped to this service's Cordis fiber and
			// is therefore removed automatically when the plugin unloads.
			if (ctx && typeof ctx.inject === "function") {
				ctx.inject(["sessionProjections"], (projectionCtx) => {
					const registry = projectionCtx?.sessionProjections;
					if (registry && typeof registry.register === "function") registry.register(STATS_ROUTE_PROJECTION);
				});
			}
		}

		async aggregate() {
			const home = dshHome();
			const warnings = [];
			const hostCtx = this.ctx || {};
			const workspaceRegistry = contextService(hostCtx, "workspaceRegistry");
			const persistence = contextService(hostCtx, "sessionPersistence");
			const sessionQuery = contextService(hostCtx, "sessionQuery");
			const sessionProjections = contextService(hostCtx, "sessionProjections");
			const projectionCache = contextService(hostCtx, "sessionProjectionCache");
			const officialWorkspaceAvailable = typeof workspaceRegistry?.list === "function";
			const officialProjectionAvailable = typeof projectionCache?.coldSnapshot === "function"
				|| typeof sessionProjections?.restoreFloor === "function" && typeof persistence?.readFrom === "function";

			// Official registries own storage-domain consistency and incremental reads.
			// Only use the JSON files when the host does not expose those services (rc6
			// compatibility and older installations).
			let wsRead = { ok: false, value: null, error: null };
			let sessionsRead = { ok: false, value: null, error: null };
			let wsJson = null;
			if (!officialWorkspaceAvailable) {
				wsRead = readJson(join(home, "storages", "workspace.json"));
				if (!wsRead.ok) warnings.push({ code: "WORKSPACE_READ_FAILED", message: wsRead.error?.message || "workspace storage read failed" });
				wsJson = wsRead.value;
			}
			if (!officialProjectionAvailable) {
				sessionsRead = readJson(join(home, "storages", "session_projcache.json"));
				if (!sessionsRead.ok) warnings.push({ code: "SESSION_CACHE_READ_FAILED", message: sessionsRead.error?.message || "session projection cache read failed" });
			}
			if (officialWorkspaceAvailable) {
				try {
					const records = {};
					for (const entity of workspaceRegistry.list()) {
						if (!entity || typeof entity.id !== "string") continue;
						records[entity.id] = { title: typeof entity.title === "string" ? entity.title : "", path: typeof entity.path === "string" ? entity.path : "", sessionIds: Array.isArray(entity.sessionIds) ? [...entity.sessionIds] : [] };
					}
					wsJson = { tables: { workspaces: records }, global: { archivedSessionIds: Array.isArray(workspaceRegistry.archivedSessionIds) ? [...workspaceRegistry.archivedSessionIds] : [] } };
				} catch (error) {
					warnings.push({ code: "OFFICIAL_WORKSPACE_FAILED", message: error?.message || String(error) });
				}
			}
			if (!wsJson) {
				wsRead = readJson(join(home, "storages", "workspace.json"));
				if (!wsRead.ok) warnings.push({ code: "WORKSPACE_READ_FAILED", message: wsRead.error?.message || "workspace storage read failed" });
				wsJson = wsRead.value;
			}
			const rawWorkspaces = wsJson?.tables?.workspaces;
			const workspaces = objectRecord(rawWorkspaces) || {};
			if (wsRead.ok && !objectRecord(rawWorkspaces)) warnings.push({ code: "WORKSPACE_SHAPE_INVALID", message: "workspace table was missing or not an object; invalid entries were ignored" });
			const rawArchivedIds = wsJson?.global?.archivedSessionIds;
			if (wsRead.ok && rawArchivedIds !== undefined && !Array.isArray(rawArchivedIds)) warnings.push({ code: "ARCHIVED_IDS_SHAPE_INVALID", message: "archivedSessionIds was not an array; the value was ignored" });
			const archivedSet = new Set((Array.isArray(rawArchivedIds) ? rawArchivedIds : []).filter((id) => typeof id === "string" && id));
			const rawSessionsTable = sessionsRead.value?.tables?.sessions;
			const sessionsTable = objectRecord(rawSessionsTable) || {};
			const projectionDomainVersion = sessionsRead.value?.unit?.version;
			if (projectionDomainVersion !== undefined && projectionDomainVersion !== SESSION_PROJECTION_DOMAIN_VERSION) warnings.push({ code: "SESSION_CACHE_DOMAIN_VERSION_UNSUPPORTED", message: `projection cache domain version ${String(projectionDomainVersion)} is not supported` });
			if (sessionsRead.ok && !objectRecord(rawSessionsTable)) warnings.push({ code: "SESSION_TABLE_SHAPE_INVALID", message: "session projection table was missing or not an object; the value was ignored" });
			let persistedHeaders = [];
			let sessionListResolved = false;
			// session-query owns the live-preferred logical corpus and delegates the
			// persisted listing to the official persistence seam. Prefer it so a
			// transient backend error cannot be mistaken for an empty workspace.
			if (sessionQuery && typeof sessionQuery.listSessions === "function") {
				try {
					const records = await sessionQuery.listSessions();
					persistedHeaders = records.map((record) => record?.header).filter((header) => header && typeof header.id === "string");
					sessionListResolved = true;
				} catch (error) {
					warnings.push({ code: "OFFICIAL_SESSION_LIST_FAILED", message: error?.message || String(error) });
				}
			}
			if (!sessionListResolved && persistence && typeof persistence.list === "function") {
				try {
					persistedHeaders = await persistence.list();
				} catch (error) {
					warnings.push({ code: "OFFICIAL_SESSION_LIST_FAILED", message: error?.message || String(error) });
				}
			}
			for (const header of persistedHeaders) if (header?.id && !sessionsTable[header.id]) {
				sessionsTable[header.id] = { identity: { id: header.id, createdAt: header.createdAt, cwd: header.cwd, parentSession: header.parentSession, seedLength: header.seedLength } };
			}
			const seen = new Set();

			const workspaceEntries = [];
			for (const [wsId, ws] of Object.entries(workspaces)) {
				if (!objectRecord(ws)) {
					warnings.push({ code: "WORKSPACE_ENTRY_INVALID", message: `workspace ${wsId} was not an object and was ignored` });
					continue;
				}
				const rawSessionIds = ws.sessionIds;
				if (rawSessionIds !== undefined && !Array.isArray(rawSessionIds)) warnings.push({ code: "SESSION_IDS_SHAPE_INVALID", message: `workspace ${wsId} sessionIds was not an array; the value was ignored` });
				const sessionIds = [];
				const localIds = new Set();
				for (const id of Array.isArray(rawSessionIds) ? rawSessionIds : []) {
					if (typeof id !== "string" || !id) {
						warnings.push({ code: "SESSION_ID_INVALID", message: `workspace ${wsId} contained an invalid session id` });
						continue;
					}
					if (localIds.has(id)) {
						warnings.push({ code: "SESSION_ID_DUPLICATE", sessionId: id, message: `session ${id} appeared more than once in workspace ${wsId}` });
						continue;
					}
					localIds.add(id);
					sessionIds.push(id);
				}
				const title = typeof ws.title === "string" ? ws.title : "";
				const path = typeof ws.path === "string" ? ws.path : "";
				if (ws.title !== undefined && typeof ws.title !== "string") warnings.push({ code: "WORKSPACE_METADATA_INVALID", message: `workspace ${wsId} title was not a string` });
				if (ws.path !== undefined && typeof ws.path !== "string") warnings.push({ code: "WORKSPACE_METADATA_INVALID", message: `workspace ${wsId} path was not a string` });
				workspaceEntries.push({ wsId, ws: { title, path }, sessionIds });
			}

			const memberships = new Map();
			for (const entry of workspaceEntries) for (const sessionId of entry.sessionIds) {
				const owners = memberships.get(sessionId) || [];
				owners.push(entry);
				memberships.set(sessionId, owners);
			}
			const ownerBySession = new Map();
			for (const [sessionId, owners] of memberships) {
				const cwd = sessionsTable[sessionId]?.identity?.cwd;
				const owner = owners.find((entry) => typeof cwd === "string" && cwd && entry.ws.path === cwd) || owners[0];
				ownerBySession.set(sessionId, owner.wsId);
				if (owners.length > 1) warnings.push({ code: "SESSION_MULTIPLE_WORKSPACES", sessionId, message: `session ${sessionId} belonged to multiple workspaces and was counted only in ${owner.wsId}` });
			}

			// 处理一个会话：容错（坏日志不拖垮整体），返回会话记录或 null
			const processSession = async (sessionId, cwdFallback) => {
				seen.add(sessionId);
				const entry = sessionsTable[sessionId];
				let statsRow = objectRecord(entry?.rows?.sessionStats?.val);
				let usageTotals = objectRecord(entry?.rows?.tokenUsage?.val?.totals);
				const rawTitle = entry?.rows?.title?.val;
				const title = typeof rawTitle === "string" ? rawTitle : null;
				const meta = objectRecord(entry?.rows?.sessionListMetadata?.val) || {};
				const rawCreatedAt = entry?.identity?.createdAt;
				const rawLastPromptAt = meta.lastPromptAt;
				let createdAt = Number.isFinite(rawCreatedAt) && rawCreatedAt >= 0 ? rawCreatedAt : null;
				let lastPromptAt = Number.isFinite(rawLastPromptAt) && rawLastPromptAt >= 0 ? rawLastPromptAt : null;
				let info;
				let officialSource = null;
				let officialValues = null;
				let cacheOnly = false;
				const liveSession = contextService(hostCtx, "sessions")?.get?.(sessionId);
				// Let the official cache service answer first. Its cold ladder uses the
				// stored watermark and only replays the log suffix when necessary.
				if (!liveSession && officialProjectionAvailable) {
					try {
						officialValues = await officialProjectionValues(hostCtx, null, entry, warnings, sessionId, projectionDomainVersion);
					} catch (error) {
						warnings.push({ code: "OFFICIAL_PROJECTION_FAILED", sessionId, message: error?.message || String(error) });
					}
				}
				const routeProjectionAvailable = objectRecord(officialValues?.statsRoute) !== null;
				const projectionValuesAvailable = objectRecord(officialValues) !== null && (
					objectRecord(officialValues?.sessionStats) !== null
					|| objectRecord(officialValues?.tokenUsage) !== null
					|| routeProjectionAvailable
				);
				if (!liveSession && projectionValuesAvailable) {
					// Official projection values are already cut at one validated
					// watermark. Use them directly for cold sessions, including hosts
					// where the optional route projection is not mounted.
					info = infoFromProjectionValues(officialValues, entry);
					if (objectRecord(officialValues?.sessionStats)) statsRow = officialValues.sessionStats;
					const officialUsage = normalizeProjectionUsage(officialValues?.tokenUsage);
					if (officialUsage) usageTotals = {
						uncachedInputTokens: officialUsage.uncached, outputTokens: officialUsage.output,
						cacheReadTokens: officialUsage.cacheRead, cacheWriteTokens: officialUsage.cacheWrite
					};
					cacheOnly = true;
					warnings.push({ code: routeProjectionAvailable ? "OFFICIAL_ROUTE_PROJECTION_USED" : "OFFICIAL_PROJECTION_VALUES_USED", sessionId, message: routeProjectionAvailable ? "model route and token buckets came from the official projection cache" : "session statistics and token usage came from the official projection cache" });
				} else try {
					officialSource = await officialSessionSource(hostCtx, sessionId);
					if (officialSource) {
						info = deriveSessionInfoFromEvents(officialSource.events, officialSource.header);
						if (!officialValues) officialValues = await officialProjectionValues(hostCtx, officialSource, entry, warnings, sessionId, projectionDomainVersion);
						if (objectRecord(officialValues?.sessionStats)) statsRow = officialValues.sessionStats;
						const officialUsage = normalizeProjectionUsage(officialValues?.tokenUsage);
						if (officialUsage) usageTotals = {
							uncachedInputTokens: officialUsage.uncached, outputTokens: officialUsage.output,
							cacheReadTokens: officialUsage.cacheRead, cacheWriteTokens: officialUsage.cacheWrite
						};
					}
				} catch (error) {
					warnings.push({ code: "OFFICIAL_PERSISTENCE_FAILED", sessionId, message: error?.message || String(error) });
				}
				if (!info && !officialSource && officialValues) {
					info = infoFromProjectionValues(officialValues, entry);
					if (objectRecord(officialValues.sessionStats)) statsRow = officialValues.sessionStats;
					const officialUsage = normalizeProjectionUsage(officialValues.tokenUsage);
					if (officialUsage) usageTotals = {
						uncachedInputTokens: officialUsage.uncached, outputTokens: officialUsage.output,
						cacheReadTokens: officialUsage.cacheRead, cacheWriteTokens: officialUsage.cacheWrite
					};
				}
				if (!officialSource && !officialValues) try {
					// The legacy decoder is synchronous for compatibility with rc6. Yield
					// between sessions so a large fallback scan does not monopolize the
					// host event loop while official services are unavailable.
					await new Promise((resolve) => setImmediate(resolve));
					info = sessionInfo(home, sessionId);
				} catch (err) {
					const message = err?.message || String(err);
					console.warn(`[dsh-stats] 会话 ${sessionId} 日志解码失败（使用 projection cache）:`, message);
					warnings.push({ code: "SESSION_DECODE_FAILED", sessionId, message });
					info = { times: [], lastTime: null, model: null, providerId: "unknown", accountType: "api", usages: [], slotStats: [], stats: null, partial: false, stale: false, missing: false, unavailable: true };
				}
				const sourceHeader = officialSource?.header || info?.header || null;
				// On rc6/older hosts the official projection service may be absent,
				// leaving only the persisted cache row. Recover its route buckets for
				// missing logs, but retain the missing/partial markers and never treat
				// an archived fork as attributable without its own log.
				if (!officialSource && !officialValues && info?.missing && entry && info.usages.length === 0) {
					const routeValue = routeProjectionValueFromEntry(entry, sessionId, sourceHeader, warnings, projectionDomainVersion);
					if (routeValue) {
						const routeInfo = infoFromProjectionValues({ statsRoute: routeValue }, entry);
						info = {
							...routeInfo,
							missing: true,
							stale: info.stale,
							unavailable: info.unavailable,
							seqGap: info.seqGap,
							futureVersion: info.futureVersion,
							lastSeq: info.lastSeq,
							header: info.header
						};
						warnings.push({ code: "SESSION_ROUTE_PROJECTION_FALLBACK", sessionId, message: "model routes came from the persisted projection cache because the session log was missing" });
					}
				}
				if (createdAt === null && Number.isFinite(sourceHeader?.createdAt) && sourceHeader.createdAt >= 0) createdAt = sourceHeader.createdAt;
				if (lastPromptAt === null && Number.isFinite(sourceHeader?.lastPromptAt) && sourceHeader.lastPromptAt >= 0) lastPromptAt = sourceHeader.lastPromptAt;
				const cwd = firstString(entry?.identity?.cwd, sourceHeader?.cwd, cwdFallback);
				const projectionInvalid = (rawTitle !== undefined && rawTitle !== null && typeof rawTitle !== "string")
					|| (rawCreatedAt !== undefined && rawCreatedAt !== null && createdAt === null)
					|| (rawLastPromptAt !== undefined && rawLastPromptAt !== null && lastPromptAt === null)
					|| (entry?.identity?.cwd !== undefined && entry?.identity?.cwd !== null && typeof entry.identity.cwd !== "string");
				const archived = archivedSet.has(sessionId);
				if (officialSource?.source === "sessionPersistence" || officialSource?.source === "sessionQuery") warnings.push({ code: "OFFICIAL_SOURCE_USED", sessionId, message: `session events loaded through ${officialSource.source}` });
				if (!officialSource && entry && !cacheOnly) {
					const checkpoint = projectionCheckpoint(entry, sessionId, sourceHeader, warnings, projectionDomainVersion);
					const rawRows = objectRecord(entry.rows);
					const hasVersionedRows = rawRows && Object.values(rawRows).some((row) => objectRecord(row) && (Object.prototype.hasOwnProperty.call(row, "ver") || Object.prototype.hasOwnProperty.call(row, "seq")));
					if (Object.keys(checkpoint).length > 0) {
						// A versioned cache is authoritative only at the exact observed log
						// watermark. Never combine a stale row with a newer log prefix.
						statsRow = null;
						usageTotals = null;
						for (const row of Object.values(checkpoint)) if (info.lastSeq >= 0 && row.seq > info.lastSeq) {
							warnings.push({ code: "SESSION_CACHE_AHEAD_OF_LOG", sessionId, message: "projection cache watermark was ahead of the session log and was ignored" });
							break;
						}
						for (const [key, row] of Object.entries(checkpoint)) if (info.lastSeq >= 0 && row.seq !== info.lastSeq) {
							warnings.push({ code: "SESSION_CACHE_STALE", sessionId, message: `projection row ${key} was at seq ${row.seq}, log ended at seq ${info.lastSeq}` });
						}
						const checkedStats = checkpoint.sessionStats;
						const checkedUsage = checkpoint.tokenUsage;
						if (checkedStats && (info.lastSeq < 0 || checkedStats.seq === info.lastSeq)) statsRow = objectRecord(checkedStats.val) || statsRow;
						if (checkedUsage && (info.lastSeq < 0 || checkedUsage.seq === info.lastSeq)) usageTotals = objectRecord(checkedUsage.val?.totals) || usageTotals;
					} else if (hasVersionedRows) {
						// A versioned cache that failed validation must never fall back to
						// its unvalidated value. Legacy rows without ver/seq remain readable
						// for rc6 fixtures and are handled by the compatibility path above.
						statsRow = null;
						usageTotals = null;
					}
				}
				if (info.seqGap || info.futureVersion) {
					// A discontinuous or unknown-format log cannot establish a safe
					// watermark. Keep the session visible as partial, but exclude all
					// untrusted cache-derived usage from the primary totals.
					statsRow = null;
					usageTotals = null;
				}
				if (info.seqGap) warnings.push({ code: "SESSION_SEQ_GAP", sessionId, message: "session log sequence had a gap; cache values were not trusted" });
				if (info.futureVersion) warnings.push({ code: "SESSION_FORMAT_VERSION_UNSUPPORTED", sessionId, message: `session log format version ${String(info.formatVersion ?? sourceHeader?.version ?? "unknown")} is newer than this plugin` });
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
				// 已归档且没有自身 usage 的 fork，其 projection token 只是父会话继承快照。
				// 这通常是已删除/不可恢复的 fork，无法可靠归属，整条记录从统计中舍弃。
					const effectiveParentSession = info.parentSession ?? firstString(entry?.identity?.parentSession, meta?.parentSession);
					const cacheOnlyArchived = archived && info.missing && info.usages.length === 0 && usedProjectionUsage;
					const cacheOnlyFork = archived && effectiveParentSession !== null && info.missing && info.cacheOnly;
					if (cacheOnlyFork || (archived && effectiveParentSession !== null && info.usages.length === 0 && usedProjectionUsage) || cacheOnlyArchived) {
						warnings.push({ code: "SESSION_ORPHAN_FORK_DISCARDED", sessionId, message: "archived fork had no own usage; inherited projection tokens were excluded from statistics" });
						return null;
				}
				if (info.missing) warnings.push({ code: "SESSION_LOG_MISSING", sessionId, message: "session log was not found; projection cache was used where available" });
				if (info.partial) warnings.push({ code: "SESSION_LOG_PARTIAL", sessionId, message: "session log was incomplete or malformed; only valid committed records were used" });
				if (info.stale) warnings.push({ code: "SESSION_LOG_STALE", sessionId, message: info.readError || "cached session snapshot was used" });
				if (projectionInvalid) warnings.push({ code: "SESSION_METADATA_INVALID", sessionId, message: "invalid projection metadata was ignored" });
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
				const sessionCost = summarizeCostsCny(perSlotUsage.map((row) => row.cost));
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
						parentSession: effectiveParentSession ?? null,
					seedLength: info.seedLength ?? null,
					calls: info.usages.length,
					stats: raw,
					durMs: raw.llmMs + raw.toolMs,
					slots: slotDurations(info.times),
					slotStats: info.slotStats || [],
					slotUsage: perSlotUsage,
						quality: info.stale ? "stale" : (info.partial || info.missing || info.unavailable || info.cacheOnly || cacheOnly || usedProjectionUsage || projectionInvalid) ? "partial" : "exact",
					cwd
				};
				Object.defineProperty(session, "_intervals", { value: activityIntervals(info.times), enumerable: false });
				return session;
			};
				const processSessions = async (sessionIds, cwdFallback, limit = 4) => {
					const ids = Array.isArray(sessionIds) ? sessionIds : [];
					const results = new Array(ids.length);
					let cursor = 0;
					const worker = async () => {
						for (;;) {
							const index = cursor++;
							if (index >= ids.length) return;
							results[index] = await processSession(ids[index], cwdFallback);
						}
					};
					const workers = Math.min(Math.max(1, limit), ids.length);
					await Promise.all(Array.from({ length: workers }, () => worker()));
					return results;
				};

				const projects = [];
				for (const { wsId, ws, sessionIds } of workspaceEntries) {
				const sessions = [];
				const agg = emptyRaw();
				let lastActiveAt = null;
				let subagentCount = 0;

					const ownedIds = sessionIds.filter((sessionId) => ownerBySession.get(sessionId) === wsId);
					for (const s of await processSessions(ownedIds, ws.path)) {
						if (!s || s.blank) continue;
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
					cost: mergeCostSummariesCny(sessions.map((session) => session.cost)),
					sessions
				});
			}

			// 未归入任何工作区的会话：按 cwd 分组兜底（与客户端近似模式一致）；
				// cwd 与已有项目路径相同时合并进去，避免出现两个同名项目。
				const strayByCwd = new Map();
				const strayIds = Object.keys(sessionsTable).filter((sessionId) => !seen.has(sessionId));
				for (const s of await processSessions(strayIds, null)) {
					if (!s || s.blank) continue;
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
				target.cost = mergeCostSummariesCny(target.sessions.map((session) => session.cost));
			});
			projects.sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));
			const cost = mergeCostSummariesCny(projects.map((project) => project.cost));

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

		async account(force = false) {
			return collectAccounts(this, this.ctx || {}, { force: force === true });
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
