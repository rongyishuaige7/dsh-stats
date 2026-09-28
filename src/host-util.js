// Shared host constants and small date, identity and file helpers.
import { readFileSync, statSync } from "node:fs";
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
const SESSION_PROJECTION_DOMAIN_VERSION = 3;
const PROJECTION_ROW_VERSIONS = Object.freeze({ sessionStats: 1, tokenUsage: 1, title: 1, sessionListMetadata: 1, statsRoute: 3 });

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

export { LONG_CONTEXT_TOKENS, PROJECTION_ROW_VERSIONS, SESSION_PROJECTION_DOMAIN_VERSION, SLOT_MINUTES, SLOT_MS, STATS_SCHEMA_VERSION, accountTypeOf, activityIntervals, basename, credentialsService, dshHome, firstString, identityFields, identityKey, localDayKey, minutesOfDay, nonNegativeNumber, objectRecord, projectionRouteRows, rawIdentity, readJson, readStable, scanZstdFrames };
