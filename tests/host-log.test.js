import { appendFileSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { zstdCompressSync } from 'node:zlib';
import { LEGACY_LOG_LIMITS, readSessionRecords, readStable } from '../src/host-log.js';
import { deriveSessionInfoAsync, deriveSessionInfoFromEvents, SESSION_CACHE_LIMITS, sessionInfo } from '../src/host-sessions.js';

const homes = [];
afterEach(() => {
	vi.restoreAllMocks();
	syncBuiltinESMExports();
	while (homes.length) rmSync(homes.pop(), { recursive: true, force: true });
});
function tempHome() {
	const home = mkdtempSync(join(tmpdir(), 'dsh-stats-log-'));
	homes.push(home);
	return home;
}
const limits = (overrides) => ({ ...LEGACY_LOG_LIMITS, ...overrides });
const decode = (buf, overrides, suffix = '.jsonl') => readSessionRecords('session' + suffix, { buf }, limits(overrides));
const budgetError = { code: 'SESSION_LOG_BUDGET_EXCEEDED' };

test('bounded snapshots reject oversized files and close a file that grows after stat', async () => {
	const file = join(tempHome(), 'session.jsonl');
	writeFileSync(file, '12345');
	await expect(readStable(file, 4)).rejects.toMatchObject(budgetError);
	writeFileSync(file, '1234');
	const originalOpen = fs.open;
	let closed;
	vi.spyOn(fs, 'open').mockImplementation(async (...args) => {
		const handle = await originalOpen(...args);
		const originalRead = handle.read.bind(handle);
		closed = vi.spyOn(handle, 'close');
		handle.read = async (...readArgs) => {
			appendFileSync(file, '5');
			return originalRead(...readArgs);
		};
		return handle;
	});
	syncBuiltinESMExports();
	await expect(readStable(file, 4)).rejects.toMatchObject(budgetError);
	expect(closed).toHaveBeenCalledOnce();
});

test('a replacement path is retried even when the old open descriptor is stable', async () => {
	const file = join(tempHome(), 'session.jsonl');
	writeFileSync(file, 'old\n');
	const originalOpen = fs.open;
	let replaced = false;
	const opened = vi.spyOn(fs, 'open').mockImplementation(async (...args) => {
		const handle = await originalOpen(...args);
		const originalRead = handle.read.bind(handle);
		handle.read = async (...readArgs) => {
			const result = await originalRead(...readArgs);
			if (!replaced) {
				replaced = true;
				writeFileSync(file + '.replacement', 'new\n');
				renameSync(file + '.replacement', file);
			}
			return result;
		};
		return handle;
	});
	syncBuiltinESMExports();
	const snapshot = await readStable(file, 100);
	expect(snapshot.stable).toBe(true);
	expect(snapshot.buf.toString()).toBe('new\n');
	expect(opened).toHaveBeenCalledTimes(2);
});

test('continually appended logs return an explicitly unstable bounded snapshot', async () => {
	const file = join(tempHome(), 'session.jsonl');
	writeFileSync(file, 'x');
	const originalOpen = fs.open;
	const opened = vi.spyOn(fs, 'open').mockImplementation(async (...args) => {
		const handle = await originalOpen(...args);
		const originalRead = handle.read.bind(handle);
		handle.read = async (...readArgs) => {
			const result = await originalRead(...readArgs);
			if (!result.bytesRead) appendFileSync(file, 'x');
			return result;
		};
		return handle;
	});
	syncBuiltinESMExports();
	const snapshot = await readStable(file, 100);
	expect(opened).toHaveBeenCalledTimes(3);
	expect(snapshot.stable).toBe(false);
	expect(snapshot.buf.length).toBe(snapshot.size - 1);
});

test.each([
	['file bytes', { fileBytes: 3 }, Buffer.from('{}\n\n')],
	['decoded bytes', { decodedBytes: 3 }, Buffer.from('{}\n\n')],
	['record bytes', { recordBytes: 3 }, Buffer.from('"中文"\n')],
	['records', { records: 1 }, Buffer.from('{}\n{}\n')],
])('plain JSONL enforces the %s budget', async (resource, overrides, payload) => {
	await expect(decode(payload, overrides)).rejects.toMatchObject({ ...budgetError, message: expect.stringContaining(resource) });
});

test('Zstd output limits cover one frame and the accumulated output of multiple frames', async () => {
	const payload = Buffer.from('"' + 'x'.repeat(4096) + '"\n');
	const frame = zstdCompressSync(payload);
	await expect(decode(frame, { frameBytes: 1024 }, '.zstd')).rejects.toMatchObject({ ...budgetError, message: expect.stringContaining('frame bytes') });
	await expect(decode(Buffer.concat([frame, frame]), { decodedBytes: payload.length + 16 }, '.zstd')).rejects.toMatchObject({ ...budgetError, message: expect.stringContaining('decoded bytes') });
	const decoded = await decode(Buffer.concat([frame, frame]), { decodedBytes: payload.length * 2, frameBytes: payload.length }, '.zstd');
	expect(decoded.records).toEqual(['x'.repeat(4096), 'x'.repeat(4096)]);
});

test('Zstd budgets count records across frames and bound empty-frame work', async () => {
	const frame = zstdCompressSync(Buffer.from('{}\n'));
	await expect(decode(Buffer.concat([frame, frame]), { records: 1 }, '.zstd')).rejects.toMatchObject({ ...budgetError, message: expect.stringContaining('records') });
	const empty = zstdCompressSync(Buffer.alloc(0));
	await expect(decode(Buffer.concat([empty, empty, empty]), { frames: 2 }, '.zstd')).rejects.toMatchObject({ ...budgetError, message: expect.stringContaining('frames') });
});

test('committed malformed rows, plain tails and complete Zstd frames preserve their original semantics', async () => {
	const payload = Buffer.from('{"type":"session"}\ninvalid\n{"seq":0}');
	expect(await decode(payload)).toEqual({ records: [{ type: 'session' }, null], truncated: true });
	const skip = Buffer.alloc(8);
	skip.writeUInt32LE(0x184D2A50);
	const frame = zstdCompressSync(payload);
	expect(await decode(Buffer.concat([skip, frame, frame.subarray(0, 4)]), {}, '.zstd')).toEqual({
		records: [{ type: 'session' }, null, { seq: 0 }], truncated: true
	});
});

test('JSONL parsing and packed-event replay both yield repeatedly to the event loop', async () => {
	const raw = Array.from({ length: 12000 }, (_, seq) => ({ type: 'request/header', seq, time: 1000 + seq }));
	const packed = { type: 'text-chunks', seq0: 0, time0: 1000,
		data: { turn: 0, step: 0, index: 0, texts: Array(12000).fill('x'), dt: Array(11999).fill(1) } };
	let ticks = 0, running = true;
	const tick = () => { if (running) { ticks++; setImmediate(tick); } };
	setImmediate(tick);
	try {
		const parsed = await decode(Buffer.from(raw.map(record => JSON.stringify(record)).join('\n') + '\n'));
		expect(parsed.records).toHaveLength(raw.length);
		expect(ticks).toBeGreaterThan(2);
		ticks = 0;
		const result = await deriveSessionInfoAsync([packed]);
		expect(ticks).toBeGreaterThan(2);
		expect(result).toEqual(deriveSessionInfoFromEvents([packed]));
	} finally { running = false; }
});

test('frame scanning yields even for streams made entirely of skippable frames', async () => {
	const skip = Buffer.alloc(8);
	skip.writeUInt32LE(0x184D2A50);
	let ran = false;
	setImmediate(() => { ran = true; });
	const result = await decode(Buffer.concat(Array(2048).fill(skip)), {}, '.zstd');
	expect(ran).toBe(true);
	expect(result).toEqual({ records: [], truncated: false });
});

test('raw and packed event counts fail explicitly before replaying over-budget data', async () => {
	await expect(deriveSessionInfoAsync([{}, {}], null, {}, limits({ records: 1 }))).rejects.toMatchObject(budgetError);
	const packed = { type: 'text-chunks', seq0: 0, time0: 1, data: { turn: 0, step: 0, index: 0, texts: ['x', 'y', 'z'], dt: [1, 1] } };
	await expect(deriveSessionInfoAsync([packed], null, {}, limits({ events: 2 }))).rejects.toMatchObject(budgetError);
	await expect(deriveSessionInfoAsync([{}, packed], null, {}, limits({ events: 3 }))).rejects.toMatchObject(budgetError);
});

test('interval work is bounded even when just two events span an excessive range', async () => {
	await expect(deriveSessionInfoAsync([
		{ type: 'tool/call', seq: 0, time: 1, data: { callId: 'slow' } },
		{ type: 'tool/result', seq: 1, time: 3600000 * 1000, data: { message: { source: { callId: 'slow' } } } }
	], null, {}, limits({ slotOperations: 4 }))).rejects.toMatchObject({ ...budgetError, message: expect.stringContaining('interval slots') });
});

test('invalid packed timestamps reject the whole batch without emitting a partial prefix', async () => {
	const record = { type: 'text-chunks', seq0: 0, time0: Number.MAX_SAFE_INTEGER,
		data: { turn: 0, step: 0, index: 0, texts: ['x', 'y'], dt: [1] } };
	const result = await deriveSessionInfoAsync([record]);
	expect(result).toMatchObject({ times: [], malformedRecords: 1, partial: true });
});

test('legacy caches evict by estimated retained bytes and reuse entries that still fit', async () => {
	const home = tempHome();
	const payload = Array.from({ length: 51000 }, (_, seq) => JSON.stringify({ type: 'event', seq, time: 1000 + seq })).join('\n') + '\n';
	for (const id of ['first', 'second']) {
		const dir = join(home, 'sessions', 'workspace', id);
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, 'session.jsonl'), payload);
	}
	const opened = vi.spyOn(fs, 'open');
	syncBuiltinESMExports();
	const originalBytes = SESSION_CACHE_LIMITS.bytes;
	SESSION_CACHE_LIMITS.bytes = 500 * 1024;
	try {
		expect((await sessionInfo(home, 'first')).times).toHaveLength(51000);
		expect((await sessionInfo(home, 'second')).times).toHaveLength(51000);
		const reads = opened.mock.calls.length;
		await sessionInfo(home, 'second');
		expect(opened).toHaveBeenCalledTimes(reads);
		await sessionInfo(home, 'first');
		expect(opened).toHaveBeenCalledTimes(reads + 1);
	} finally { SESSION_CACHE_LIMITS.bytes = originalBytes; }
});

test('legacy cache retains a working set larger than the old unit cap', async () => {
	const home = tempHome();
	const payload = Array.from({ length: 800 }, (_, seq) => JSON.stringify({ type: 'request/header', seq, time: 1000 + seq * 1000 })).join('\n') + '\n';
	for (let index = 0; index < 130; index++) {
		const dir = join(home, 'sessions', 'workspace', 's' + index);
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, 'session.jsonl'), payload);
	}
	const opened = vi.spyOn(fs, 'open');
	syncBuiltinESMExports();
	const scan = async () => {
		for (let index = 0; index < 130; index++) expect((await sessionInfo(home, 's' + index)).times).toHaveLength(800);
	};
	await scan();
	const reads = opened.mock.calls.length;
	await scan();
	expect(opened).toHaveBeenCalledTimes(reads);
});
