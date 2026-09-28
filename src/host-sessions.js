// Session logs: discovery, zstd decoding, projection state and derived session info.
import { readdirSync, lstatSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { zstdDecompressSync } from "node:zlib";
import pricing from "./pricing.cjs";
import routeData from "./route-data.cjs";
import { PROJECTION_ROW_VERSIONS, SESSION_PROJECTION_DOMAIN_VERSION, SLOT_MS, accountTypeOf, firstString, identityKey, nonNegativeNumber, objectRecord, projectionRouteRows, rawIdentity, readStable, scanZstdFrames } from "./host-util.js";
import { emptyRaw } from "./host-usage.js";

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
		for (const dirId of dirIds) for (const suffix of ["session.v4.jsonl.zstd", "session.v4.jsonl", "session.v3.jsonl.zstd", "session.v3.jsonl", "session.v2.jsonl.zstd", "session.v2.jsonl", "session.v1.jsonl.zstd", "session.v1.jsonl", "session.jsonl.zstd", "session.jsonl"]) {
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
function inheritedCount(header, count) {
	if (Number.isSafeInteger(count) && count >= 0) return count;
	if (Number.isSafeInteger(header?.inheritedEventCount) && header.inheritedEventCount >= 0) return header.inheritedEventCount;
	return header?.parentSession && Number.isSafeInteger(header.seedLength) && header.seedLength >= 0 ? header.seedLength : 0;
}

function routeProjectionState(header = null, count) {
	return {
		origin: firstString(header?.origin),
		parentSession: firstString(header?.parentSession),
		seedLength: Number.isSafeInteger(header?.seedLength) && header.seedLength >= 0 ? header.seedLength : null,
		inheritedEventCount: inheritedCount(header, count),
		current: { providerId: "unknown", model: null, accountType: "api", serviceTier: "standard" },
		routeTree: {},
		last: null
	};
}

const validatedRouteRows = new WeakSet();
const validatedRouteViews = new WeakSet();

function routeProjectionSchema(value) {
	if (validatedRouteViews.has(value)) return value;
	const record = objectRecord(value);
	if (!record || !objectRecord(record.current) || !Array.isArray(record.routes)) throw new TypeError("invalid statsRoute projection");
	if (record.origin !== null && typeof record.origin !== "string") throw new TypeError("invalid statsRoute origin");
	if (record.parentSession !== null && typeof record.parentSession !== "string") throw new TypeError("invalid statsRoute parentSession");
	if (record.seedLength !== null && (!Number.isSafeInteger(record.seedLength) || record.seedLength < 0)) throw new TypeError("invalid statsRoute seedLength");
	if (typeof record.current.providerId !== "string" || (record.current.model !== null && typeof record.current.model !== "string") || typeof record.current.accountType !== "string" || !["standard", "priority", "batch", "flex", "unknown"].includes(record.current.serviceTier)) throw new TypeError("invalid statsRoute current route");
	for (const row of record.routes) {
		if (validatedRouteRows.has(row)) continue;
		if (!objectRecord(row) || (row.model !== null && typeof row.model !== "string") || typeof row.providerId !== "string" || typeof row.accountType !== "string" || !["standard", "priority", "batch", "flex", "unknown"].includes(row.serviceTier) || !Number.isSafeInteger(row.slot) || row.slot < 0 || !Number.isFinite(row.time) || row.time < 0) throw new TypeError("invalid statsRoute row");
		for (const key of ["uncached", "output", "cacheRead", "cacheWrite", "reasoning", "contextTokens"]) if (!Number.isFinite(row[key]) || row[key] < 0) throw new TypeError("invalid statsRoute token count");
		if (!Number.isSafeInteger(row.count) || row.count < 1) throw new TypeError("invalid statsRoute request count");
		if (Object.isFrozen(row)) validatedRouteRows.add(row);
	}
	return value;
}

// rc2 persists the fold state separately from its client-visible wire view,
// while rc6 validates only the view. Keep one validator for both contracts so
// a malformed checkpoint cannot be accepted on either host generation.
function routeProjectionStateSchema(value) {
	const record = objectRecord(value);
	if (!record || !objectRecord(record.routeTree) || !Number.isSafeInteger(record.inheritedEventCount) || record.inheritedEventCount < 0) throw new TypeError("invalid statsRoute state");
	routeProjectionSchema(routeProjectionView(record));
	if (record.last !== null) {
		if (!objectRecord(record.last) || typeof record.last.key !== "string" || typeof record.last.routeKey !== "string") throw new TypeError("invalid statsRoute last sample");
		for (const field of ["uncached", "output", "cacheRead", "cacheWrite", "reasoning"]) {
			if (!Number.isFinite(record.last[field]) || record.last[field] < 0) throw new TypeError("invalid statsRoute last sample");
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
		if (objectRecord(value?.routeTree)) routeProjectionStateSchema(value);
		else if (!versioned) routeProjectionSchema({ ...value, routes: routeData.routeRows(value).map((row) => ({
			...row, contextTokens: row.contextTokens ?? row.uncached + row.cacheRead + row.cacheWrite, count: row.count ?? 1
		})) });
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
		serviceTier: pricing.normalizeServiceTier(requestedTier || current?.serviceTier)
	};
}

function routeProjectionUsage(event) {
	if (event?.type === "assistant/chunk" && event.data?.chunk?.type === "usage") return event.data.chunk.usage || {};
	if (event?.type === "assistant/message" && event.data?.usage !== undefined) return event.data.usage || {};
	if (event?.type !== "assistant/message" && event?.type !== "assistant/attempt") return null;
	const stream = event.data?.stream;
	if (!Array.isArray(stream)) return null;
	for (let i = stream.length - 1; i >= 0; i--) {
		if (stream[i]?.type === "chunk" && stream[i].chunk?.type === "usage") return stream[i].chunk.usage || {};
	}
	return null;
}

function routeProjectionApply(state, event) {
	if (!event || typeof event !== "object") return state;
	if (event.type === "session") {
		return { ...state, origin: firstString(event.origin, state.origin), parentSession: firstString(event.parentSession, state.parentSession),
			seedLength: Number.isSafeInteger(event.seedLength) ? event.seedLength : state.seedLength,
			inheritedEventCount: Math.max(state.inheritedEventCount, inheritedCount(event)) };
	}
	if (Number.isSafeInteger(event.seq) && event.seq < state.inheritedEventCount) return state;
	const key = Number.isSafeInteger(event.data?.turn) && Number.isSafeInteger(event.data?.step) ? event.data.turn + ":" + event.data.step : null;
	if (event.type === "llm/retry-started") return key !== null && state.last?.key === key ? { ...state, last: null } : state;
	let current = state.current;
	if (event.type === "request/header") {
		const header = event.data?.header;
		const config = header?.config;
		current = routeProjectionRoute({ ...config, provider: firstString(config?.provider, config?.providerId, config?.provider_id, header?.provider) }, current);
		return { ...state, current };
	}
	const usage = routeProjectionUsage(event);
	if (!usage || !Number.isFinite(event.time) || event.time < 0) return state;
	const source = event.data?.message?.source;
	const route = routeProjectionRoute(source, current);
	const sample = {
		uncached: nonNegativeNumber(usage.inputTokens), output: nonNegativeNumber(usage.outputTokens),
		cacheRead: nonNegativeNumber(usage.cacheReadTokens), cacheWrite: nonNegativeNumber(usage.cacheWriteTokens),
		reasoning: nonNegativeNumber(usage.reasoningTokens)
	};
	const contextTokens = sample.uncached + sample.cacheRead + sample.cacheWrite;
	const slot = Math.floor(event.time / SLOT_MS);
	const routeKey = JSON.stringify([route.providerId, route.model, route.accountType, route.serviceTier, slot, contextTokens, event.time]);
	const previous = key !== null && state.last?.key === key ? state.last : null;
	let routeTree = state.routeTree;
	if (previous) routeTree = routeData.updateRoute(routeTree, previous.routeKey, (row) => {
		if (!row || row.count <= 1) return null;
		const next = { ...row, count: row.count - 1 };
		for (const field of ["uncached", "output", "cacheRead", "cacheWrite", "reasoning"]) next[field] = Math.max(0, row[field] - previous[field]);
		return next;
	});
	routeTree = routeData.updateRoute(routeTree, routeKey, (row) => {
		const next = row ? { ...row, count: row.count + 1, time: Math.max(row.time, event.time) }
			: { ...route, slot, time: event.time, contextTokens, count: 1, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
		for (const field of ["uncached", "output", "cacheRead", "cacheWrite", "reasoning"]) next[field] += sample[field];
		return next;
	});
	return { ...state, current: route, routeTree, last: key === null ? null : { key, routeKey, ...sample } };
}

const routeViews = new WeakMap();
function routeProjectionView(state) {
	let cached = routeViews.get(state.routeTree);
	if (!cached || !Object.isFrozen(state.routeTree)) {
		const routes = routeData.routeRows(state).map((row) => Object.isFrozen(row) ? row : Object.freeze({ ...row }));
		cached = { routes: Object.freeze(routes), primary: routeData.primaryRoute(routes, null) };
		if (Object.isFrozen(state.routeTree)) routeViews.set(state.routeTree, cached);
	}
	const { routes } = cached;
	const primary = cached.primary || state.current;
	const view = {
		origin: state.origin,
		parentSession: state.parentSession,
		seedLength: state.seedLength,
		inheritedEventCount: state.inheritedEventCount,
		current: Object.freeze({ providerId: primary.providerId, model: primary.model, accountType: primary.accountType, serviceTier: primary.serviceTier }),
		routes
	};
	routeProjectionSchema(view);
	Object.freeze(view);
	validatedRouteViews.add(view);
	return view;
}

const STATS_ROUTE_PROJECTION = Object.freeze({
	key: "statsRoute",
	stateVersion: 3,
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
			for (const event of expanded) {
				if (!objectRecord(event)) malformedRecords++;
				else events.push(event);
			}
		} catch {
			malformedRecords++;
		}
	}
	header = header || events.find((event) => event?.type === "session") || null;
	const seedMarker = events.find((event) => event?.type === "session/end-seed" && event.data?.inherited === true);
	const count = inheritedCount(header, quality.inheritedEventCount ?? seedMarker?.seq);
	const unknownSeed = header?.isSeeded === true && quality.inheritedEventCount === undefined && !seedMarker && !Number.isSafeInteger(header.seedLength);
	const times = [];
	let currentModel = null;
	let currentProvider = "unknown";
	let currentAccountType = "api";
	let currentServiceTier = "standard";
	let origin = typeof header?.origin === "string" ? header.origin : null;
	let parentSession = typeof header?.parentSession === "string" ? header.parentSession : null;
	let seedLength = Number.isSafeInteger(header?.seedLength) && header.seedLength >= 0 ? header.seedLength : null;
	let firstOwnSeq = count;
	const usageByStep = new Map();
	let lastUsage = null;
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
		if (unknownSeed || (evSeq !== undefined && evSeq < firstOwnSeq)) continue;
		const t = ev?.time;
		if (Object.prototype.hasOwnProperty.call(ev || {}, "time") && (!Number.isFinite(t) || t < 0)) { malformedRecords++; continue; }
		if (Number.isFinite(t)) times.push(t);
		if (!ev || typeof ev !== "object") continue;
		const usage = routeProjectionUsage(ev);
		const stepKey = Number.isSafeInteger(ev.data?.turn) && Number.isSafeInteger(ev.data?.step) ? ev.data.turn + ":" + ev.data.step : null;
		if (ev.type === "llm/retry-started" && lastUsage?.stepKey === stepKey) lastUsage = null;
		if (usage && Number.isFinite(t)) {
			if (stepKey === null) malformedRecords++;
			const source = ev.data?.message?.source;
			const route = routeProjectionRoute(source, { model: currentModel, providerId: currentProvider, accountType: currentAccountType, serviceTier: currentServiceTier });
			currentModel = route.model; currentProvider = route.providerId;
			currentAccountType = route.accountType; currentServiceTier = route.serviceTier;
			const key = stepKey !== null && lastUsage?.stepKey === stepKey ? lastUsage.key : usageByStep.size;
			usageByStep.set(key, { time: t, ...route,
				uncached: nonNegativeNumber(usage.inputTokens), output: nonNegativeNumber(usage.outputTokens),
				cacheRead: nonNegativeNumber(usage.cacheReadTokens), cacheWrite: nonNegativeNumber(usage.cacheWriteTokens), reasoning: nonNegativeNumber(usage.reasoningTokens) });
			lastUsage = stepKey === null ? null : { stepKey, key };
		}
		if (ev.type === "session") {
			if ((ev.origin != null && typeof ev.origin !== "string") || (ev.parentSession != null && typeof ev.parentSession !== "string")
				|| (ev.seedLength != null && (!Number.isSafeInteger(ev.seedLength) || ev.seedLength < 0))) malformedRecords++;
			origin = typeof ev.origin === "string" ? ev.origin : origin;
			parentSession = typeof ev.parentSession === "string" ? ev.parentSession : parentSession;
			seedLength = Number.isSafeInteger(ev.seedLength) && ev.seedLength >= 0 ? ev.seedLength : seedLength;
			firstOwnSeq = Math.max(firstOwnSeq, inheritedCount(ev));
		} else if (ev.type === "request/header") {
			const config = ev.data?.header?.config;
			if (config?.model) currentModel = config.model;
			const provider = firstString(config?.provider, config?.providerId, config?.provider_id, ev.data?.header?.provider);
			if (provider) currentProvider = provider;
			currentAccountType = accountTypeOf(config, currentAccountType);
			currentServiceTier = pricing.normalizeServiceTier(config?.serviceTier || config?.service_tier);
		} else if (ev.type === "step/start") {
			openStep = Number.isFinite(t) ? { turn: ev.data?.turn, step: ev.data?.step, startTime: t, firstTokenTime: null } : null;
		} else if (ev.type === "assistant/chunk") {
			if (openStep && openStep.turn === ev.data?.turn && openStep.step === ev.data?.step && openStep.firstTokenTime === null && Number.isFinite(t) && isTokenDelta(ev.data?.chunk)) openStep.firstTokenTime = t;
		} else if (ev.type === "assistant/message" || ev.type === "assistant/attempt") {
			const u = usage;
			if (openStep && openStep.turn === ev.data?.turn && openStep.step === ev.data?.step && openStep.firstTokenTime === null) openStep.firstTokenTime = streamFirstTokenTime(ev.data?.stream);
			if (ev.type === "assistant/attempt") continue;
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
		usages: [...usageByStep.values()], origin, parentSession, seedLength, inheritedEventCount: count,
		stats: derivedEvents ? derived : null, slotStats: [...slotStats.values()].sort((a, b) => a.slot - b.slot),
		partial: Boolean(quality.partial) || malformedRecords > 0 || events.length === 0 && !header || seqGap || unknownSeed || (header?.version !== undefined && ![0, 1, 2, 3, 4].includes(header.version)), stale: Boolean(quality.stale), missing: false, unavailable: false,
		malformedRecords, lastSeq, seqGap, unknownSeed, formatVersion: header?.version, futureVersion: header?.version !== undefined && ![0, 1, 2, 3, 4].includes(header.version),
		header: header || null
	};
}

// Cache normalized statistics, never raw conversation bodies. A persistence
// revision must be observed before and after the read; live/unversioned sources
// always use their authoritative services. Weak ownership follows StatsService.
const officialReadCaches = new WeakMap();
function officialReadCache(owner) {
	let cache = officialReadCaches.get(owner);
	if (!cache) { cache = { entries: new Map(), weight: 0 }; officialReadCaches.set(owner, cache); }
	return cache;
}
function forgetOfficialRead(cache, id) {
	const old = cache.entries.get(id);
	if (old) cache.weight -= old.weight;
	cache.entries.delete(id);
}
function rememberOfficialRead(cache, id, entry) {
	forgetOfficialRead(cache, id);
	if (entry.weight > 100000) return;
	cache.entries.set(id, entry);
	cache.weight += entry.weight;
	while (cache.entries.size > 128 || cache.weight > 100000) forgetOfficialRead(cache, cache.entries.keys().next().value);
}
async function officialReadRevision(ctx, id, warnings) {
	const sessions = contextService(ctx, "sessions");
	if (sessions?.get?.(id)) return null;
	// A query-only service can prefer live logs invisible to this context.
	if (contextService(ctx, "sessionQuery") && typeof sessions?.get !== "function") return null;
	const persistence = contextService(ctx, "sessionPersistence");
	if (typeof persistence?.stat !== "function") return null;
	try {
		const observed = await persistence.stat(id);
		if (typeof observed?.revision !== "string" || !observed.revision || !objectRecord(observed.header)) return null;
		return JSON.stringify([observed.revision, observed.header]);
	} catch (error) {
		warnings.push({ code: "OFFICIAL_REVISION_FAILED", sessionId: id, message: error?.message || String(error) });
		return null;
	}
}

async function officialSessionSource(ctx, sessionId) {
	const normalize = (loaded, source, liveSession) => {
		if (!loaded || !Array.isArray(loaded.events)) return null;
		const header = loaded.header || loaded.meta || loaded.session;
		return { header, inheritedEventCount: inheritedCount(header, loaded.inheritedEventCount), events: loaded.events, source, liveSession };
	};
	const live = contextService(ctx, "sessions")?.get?.(sessionId);
	if (live) {
		const events = typeof live.snapshotEvents === "function" ? live.snapshotEvents() : live.events;
		if (Array.isArray(events)) return normalize({ header: live.header, inheritedEventCount: live.inheritedEventCount, events }, "live", live);
	}
	const query = contextService(ctx, "sessionQuery");
	if (typeof query?.readSession === "function") {
		const result = normalize(await query.readSession(sessionId), "sessionQuery");
		if (result) return result;
	}
	const persistence = contextService(ctx, "sessionPersistence");
	for (const method of ["inspect", "load"]) if (typeof persistence?.[method] === "function") {
		const result = normalize(await persistence[method](sessionId), "sessionPersistence");
		if (result) return result;
	}
	if (typeof persistence?.open === "function") {
		const handle = await persistence.open(sessionId, "read");
		try {
			const loaded = await handle.read();
			return normalize({ ...loaded, header: handle.header, inheritedEventCount: handle.inheritedEventCount }, "sessionPersistence");
		} finally { await handle.close(); }
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
		const needsSource = projectionCache?.coldSnapshot?.length >= 2 || projections?.restore?.length >= 4;
		// rc1+ takes the full observation; rc2 owns its own persistence read.
		// Both shipped methods retain their declared arity after binding.
		if (needsSource && !source) return null;
		if (projectionCache && typeof projectionCache.coldSnapshot === "function") {
			try {
				const snapshot = needsSource
					? await projectionCache.coldSnapshot(source.header, source.inheritedEventCount, source.events)
					: await projectionCache.coldSnapshot(sessionId);
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
			} catch (error) {
				warnings.push({ code: "OFFICIAL_PROJECTION_CACHE_FAILED", sessionId, message: error?.message || String(error) });
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
					const header = source?.header || suffix.header || suffix.meta || suffix.session || entry?.identity;
					const restored = projections.restore(checkpoint, suffix.events, floor, header, inheritedCount(header, suffix.inheritedEventCount ?? source?.inheritedEventCount));
					return restored?.snapshot?.values || null;
				}
			}
		}
		if (typeof projections.restore === "function" && source?.events) {
			const checkpoint = projectionCheckpoint(entry, sessionId, source.header, warnings, domainVersion);
			const restored = projections.restore(checkpoint, source.events, 0, source.header, source.inheritedEventCount);
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
		serviceTier: pricing.normalizeServiceTier(row.serviceTier),
		contextTokens: Number.isFinite(row.contextTokens) ? row.contextTokens : undefined,
		count: Number.isSafeInteger(row.count) && row.count > 0 ? row.count : 1,
		pricingIncomplete: !Number.isFinite(row.contextTokens) || !Number.isSafeInteger(row.count) || row.count > 1,
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
	const current = routeData.primaryRoute(usages, objectRecord(routeProjection?.current) || {});
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
	if (chunk.type === "text-delta" || chunk.type === "reasoning-delta") return typeof chunk.text === "string" && chunk.text !== "";
	return chunk.type === "tool-call-delta" && (typeof chunk.argumentsDelta === "string" && chunk.argumentsDelta !== "" || chunk.name !== undefined);
}

function streamFirstTokenTime(stream) {
	for (const record of Array.isArray(stream) ? stream : []) {
		if (record?.type === "chunk") {
			if (Number.isFinite(record.time) && isTokenDelta(record.chunk)) return record.time;
		} else if (["text-chunks", "reasoning-chunks", "tool-call-chunks"].includes(record?.type)) {
			let time = record.time0;
			const fragments = record.type === "tool-call-chunks" ? record.args : record.texts;
			for (let i = 0; i < (Array.isArray(fragments) ? fragments.length : 0); i++) {
				if (i > 0) time += record.dt?.[i - 1];
				if (Number.isFinite(time) && (fragments[i] !== "" || record.name !== undefined)) return time;
			}
		}
	}
	return null;
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
	try {
		const stat = statSync(file);
		if (cached?.stable && ["mtimeMs", "ctimeMs", "size", "ino"].every((key) => cached[key] === stat[key])) {
			sessionInfoCache.delete(file);
			sessionInfoCache.set(file, cached);
			return cached.info;
		}
		snapshot = readStable(file);
	} catch (error) {
		if (cached) return { ...cached.info, stale: true, readError: error.message };
		throw error;
	}
	const { mtimeMs, ctimeMs, size, ino } = snapshot;
	const decoded = readSessionRecords(file, snapshot);
	const info = deriveSessionInfoFromEvents(decoded.records, null, { partial: decoded.truncated || !snapshot.stable });
	sessionInfoCache.set(file, { mtimeMs, ctimeMs, size, ino, stable: snapshot.stable, info });
	// LRU 淘汰：超限删除最旧条目
	while (sessionInfoCache.size > SESSION_CACHE_LIMIT) {
		const oldest = sessionInfoCache.keys().next().value;
		sessionInfoCache.delete(oldest);
	}
	return info;
}

export { STATS_ROUTE_PROJECTION, contextService, deriveSessionInfoFromEvents, forgetOfficialRead, infoFromProjectionValues, normalizeProjectionUsage, officialProjectionValues, officialReadCache, officialReadRevision, officialSessionSource, projectionCheckpoint, rememberOfficialRead, routeProjectionValueFromEntry, sessionInfo };
