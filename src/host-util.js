// Shared host constants and small date, identity and file helpers.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import pricing from "./pricing.cjs";
import routeData from "./route-data.cjs";
const { normalizeIdentity } = pricing;

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
const SESSION_PROJECTION_DOMAIN_VERSIONS = new Proxy(new Set([3, 4, 5, 6, 7]), {
	get(target, prop) {
		if (prop === "add") return function () { return this; };
		if (prop === "delete") return function () { return false; };
		if (prop === "clear") return function () {};
		const value = target[prop];
		return typeof value === "function" ? value.bind(target) : value;
	}
});
Object.freeze(SESSION_PROJECTION_DOMAIN_VERSIONS);
const SESSION_PROJECTION_DOMAIN_VERSION = 3;
function isSupportedProjectionDomainVersion(version) {
	return version === undefined || SESSION_PROJECTION_DOMAIN_VERSIONS.has(version);
}
const PROJECTION_ROW_VERSIONS = Object.freeze({ sessionStats: 1, tokenUsage: Object.freeze([1, 2]), title: 1, sessionListMetadata: 1, statsRoute: Object.freeze([1, 3]) });
function isSupportedRowVersion(key, ver) {
	const expected = PROJECTION_ROW_VERSIONS[key];
	if (expected === undefined) return true;
	return Array.isArray(expected) ? expected.includes(ver) : ver === expected;
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

function* scanZstdFrameSteps(buffer) {
	let truncated = false;
	let offset = 0;
	let work = 0;
	while (offset < buffer.length) {
		if (++work % 512 === 0) yield null;
		const start = offset;
		if (buffer.length - offset < 4) { truncated = true; break; }
		const magic = buffer.readUInt32LE(offset);
		if (magic !== ZSTD_MAGIC) {
			// Zstandard skippable frames use 0x184D2A50..0x184D2A5F. They are
			// valid in a stream but carry no session data; skip their payload.
			if ((magic >>> 4) === 0x184D2A5) {
				if (buffer.length - offset < 8) { truncated = true; break; }
				const size = buffer.readUInt32LE(offset + 4);
				const end = offset + 8 + size;
				if (end > buffer.length) { truncated = true; break; }
				offset = end;
				continue;
			}
			throw new Error("corrupt Zstandard session log: invalid frame magic");
		}
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
			if (++work % 512 === 0) yield null;
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
		yield { start, end: offset };
	}
	return { truncated };
}

function scanZstdFrames(buffer) {
	const frames = [];
	const steps = scanZstdFrameSteps(buffer);
	let step;
	while (!(step = steps.next()).done) if (step.value) frames.push(step.value);
	return { frames, truncated: step.value.truncated };
}

const MAX_JSON_BYTES = 64 * 1024 * 1024;
function readJson(file) {
	try {
		const stat = statSync(file);
		if (stat.size > MAX_JSON_BYTES) return { ok: false, value: null, error: new Error(`JSON file is too large: ${stat.size} bytes`) };
		let text = readFileSync(file, "utf8");
		if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
		return { ok: true, value: JSON.parse(text), error: null };
	} catch (error) {
		return { ok: false, value: null, error };
	}
}

let projcacheCache = { home: null, at: 0, stamp: "", value: null };
const PROJCACHE_CACHE_MS = 2000;
function readSessionProjcache(home) {
	const singleFile = join(home, "storages", "session_projcache.json");
	const sessionsDir = join(home, "storages", "session_projcache", "sessions");
	const stampOf = (file) => {
		try { const stat = statSync(file); return `${stat.mtimeMs}:${stat.size}:${stat.ino}`; }
		catch { return "-"; }
	};
	const stamp = `f:${stampOf(singleFile)}|d:${stampOf(sessionsDir)}`;
	const now = Date.now();
	if (projcacheCache.home === home && projcacheCache.stamp === stamp && now - projcacheCache.at < PROJCACHE_CACHE_MS) return projcacheCache.value;
	const finish = (value) => {
		projcacheCache = { home, at: now, stamp, value };
		return value;
	};
	const singleRead = readJson(singleFile);
	if (singleRead.ok) return finish(singleRead);

	try {
		const entries = readdirSync(sessionsDir, { withFileTypes: true });
		const sessionsTable = Object.create(null);
		const versions = new Set();
		for (const entry of entries) {
			if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
			const id = entry.name.slice(0, -5);
			const contentRead = readJson(join(sessionsDir, entry.name));
			if (!contentRead.ok) continue;
			const content = contentRead.value;
			if (content && typeof content === "object") {
				if (Number.isSafeInteger(content.version)) versions.add(content.version);
				const record = content.record || content;
				if (record && typeof record === "object") {
					sessionsTable[id] = record;
				}
			}
		}
		const detectedVersion = versions.size === 0 ? 7 : Math.max(...versions);
		return finish({
			ok: true,
			value: {
				unit: { version: detectedVersion },
				tables: { sessions: sessionsTable }
			},
			error: null
		});
	} catch {
		return finish(singleRead);
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

function objectRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}

// The rc2/rc6 projection registry exposes a view with `routes: []`, while a
// persisted state row keeps the same routes in an object keyed by route key.
// Accept both shapes at the host boundary so a cold read never loses model
// attribution just because it came from a state checkpoint.
function projectionRouteRows(route) {
	if (!objectRecord(route)) return [];
	const rows = routeData.routeRows(route);
	return rows.filter((row) => objectRecord(row)
		&& (row.model === null || typeof row.model === "string" && row.model.trim())
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

export { LONG_CONTEXT_TOKENS, PROJECTION_ROW_VERSIONS, SESSION_PROJECTION_DOMAIN_VERSION, SESSION_PROJECTION_DOMAIN_VERSIONS, SLOT_MINUTES, SLOT_MS, STATS_SCHEMA_VERSION, accountTypeOf, activityIntervals, basename, credentialsService, dshHome, firstString, identityFields, identityKey, isSupportedProjectionDomainVersion, isSupportedRowVersion, localDayKey, minutesOfDay, nonNegativeNumber, objectRecord, projectionRouteRows, rawIdentity, readJson, readSessionProjcache, scanZstdFrames, scanZstdFrameSteps };
