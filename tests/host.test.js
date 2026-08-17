import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { zstdCompressSync } from 'node:zlib';
import { StatsService } from '../src/index.js';
import { TYPERT } from '../src/typert-host.js';

const createdHomes = [];
const previousDshHome = process.env.DSH_HOME;

afterEach(() => {
	if (previousDshHome === undefined) delete process.env.DSH_HOME;
	else process.env.DSH_HOME = previousDshHome;
	while (createdHomes.length) rmSync(createdHomes.pop(), { recursive: true, force: true });
});

function projection(createdAt, overrides = {}) {
	return {
		identity: { createdAt, cwd: '/tmp/fixture' },
		rows: {
			title: { val: overrides.title || 'Fixture session' },
			sessionListMetadata: { val: { blank: false, lastPromptAt: overrides.lastPromptAt ?? createdAt } },
			sessionStats: { val: { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, ...overrides.stats } },
			tokenUsage: { val: { totals: { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, ...overrides.usage } } },
		},
	};
}

function fixture(entries, sessionIds = Object.keys(entries)) {
	const home = mkdtempSync(join(tmpdir(), 'dsh-stats-test-'));
	createdHomes.push(home);
	mkdirSync(join(home, 'storages'), { recursive: true });
	writeFileSync(join(home, 'storages', 'workspace.json'), JSON.stringify({
		tables: { workspaces: { fixture: { title: 'Fixture', path: '/tmp/fixture', sessionIds } } },
		global: { archivedSessionIds: [] },
	}));
	writeFileSync(join(home, 'storages', 'session_projcache.json'), JSON.stringify({ tables: { sessions: entries } }));
	process.env.DSH_HOME = home;
	return home;
}

function writeLog(home, sessionId, records, suffix) {
	const dir = join(home, 'sessions', 'workspace', sessionId);
	mkdirSync(dir, { recursive: true });
	const frame = zstdCompressSync(Buffer.from(records.map((record) => JSON.stringify(record)).join('\n') + '\n'));
	writeFileSync(join(dir, 'session.jsonl.zstd'), suffix ? Buffer.concat([frame, suffix]) : frame);
}

async function aggregate() {
	return StatsService.prototype.aggregate.call({});
}

test('missing logs use projection totals and report partial quality', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	fixture({ s1: projection(now, {
		stats: { turns: 2, steps: 3, llmMs: 1000, toolMs: 500 },
		usage: { uncachedInputTokens: 100, outputTokens: 20, cacheReadTokens: 300, cacheWriteTokens: 4 },
	}) });

	const result = await aggregate();
	const session = result.projects[0].sessions[0];
	expect(session.quality).toBe('partial');
	expect(session.stats).toMatchObject({ turns: 2, steps: 3, uncached: 100, output: 20, cacheRead: 300, cacheWrite: 4 });
	expect(session.slotUsage).toEqual([expect.objectContaining({ model: '(unknown)', uncached: 100, output: 20 })]);
	expect(result.meta.degraded).toBe(true);
	expect(result.meta.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining(['SESSION_LOG_MISSING', 'SESSION_USAGE_FALLBACK']));
	TYPERT.invocations[0].result.schema.parse(result);
});

test('invalid event timestamps and token values cannot inject NaN into RPC stats', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	const home = fixture({ s1: projection(now) });
	writeLog(home, 's1', [
		{ type: 'session', seq: 0, time: now },
		{ type: 'request/header', seq: 1, time: now + 10, data: { header: { config: { model: 'deepseek-v4-pro' } } } },
		{ type: 'step/start', seq: 2, data: { turn: 0, step: 0 } },
		{ type: 'tool/call', seq: 3, data: { callId: 'call-1' } },
		{ type: 'tool/result', seq: 4, time: now + 500, data: { message: { source: { callId: 'call-1' } } } },
		{ type: 'assistant/message', seq: 5, time: now + 1000, data: { turn: 0, step: 0, usage: { inputTokens: 'bad', outputTokens: -2, cacheReadTokens: 10 }, message: { source: { model: 'deepseek-v4-pro' } } } },
		{ type: 'step/end', seq: 6, time: now + 1200, data: { turn: 0, step: 0 } },
	]);

	const result = await aggregate();
	const session = result.projects[0].sessions[0];
	expect(session.stats).toMatchObject({ turns: 1, steps: 1, llmMs: 0, toolMs: 0, uncached: 0, output: 0, cacheRead: 10 });
	expect(Object.values(session.stats).every(Number.isFinite)).toBe(true);
	TYPERT.invocations[0].result.schema.parse(result);
});

test('fork seed events are excluded from usage totals', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	const home = fixture({ child: projection(now) });
	writeLog(home, 'child', [
		{ type: 'session', seq: 0, time: now, origin: 'subagent', parentSession: 'parent', seedLength: 3 },
		{ type: 'assistant/message', seq: 1, time: now + 100, data: { turn: 0, step: 0, usage: { inputTokens: 9999, outputTokens: 999 }, message: { source: { model: 'deepseek-v4-pro' } } } },
		{ type: 'request/header', seq: 3, time: now + 200, data: { header: { config: { model: 'deepseek-v4-flash' } } } },
		{ type: 'assistant/message', seq: 4, time: now + 300, data: { turn: 1, step: 0, usage: { inputTokens: 10, outputTokens: 2 }, message: { source: { model: 'deepseek-v4-flash' } } } },
		{ type: 'step/end', seq: 5, time: now + 400, data: { turn: 1, step: 0 } },
	]);

	const session = (await aggregate()).projects[0].sessions[0];
	expect(session.subagent).toBe(true);
	expect(session.stats).toMatchObject({ uncached: 10, output: 2 });
	expect(session.calls).toBe(1);
});

test('a truncated active tail keeps committed frames and reports partial quality', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	const home = fixture({ s1: projection(now) });
	writeLog(home, 's1', [
		{ type: 'session', seq: 0, time: now },
		{ type: 'step/end', seq: 1, time: now + 100, data: { turn: 0, step: 0 } },
	], Buffer.from([0x28, 0xb5]));

	const result = await aggregate();
	expect(result.projects[0].sessions[0].quality).toBe('partial');
	expect(result.projects[0].sessions[0].stats.turns).toBe(1);
	expect(result.meta.warnings.some((warning) => warning.code === 'SESSION_LOG_PARTIAL')).toBe(true);
});

test('timeline merges overlapping sessions within one project', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	const home = fixture({ a: projection(now), b: projection(now + 120000) });
	writeLog(home, 'a', [
		{ type: 'session', seq: 0, time: now },
		{ type: 'request/header', seq: 1, time: now + 300000, data: { header: { config: { model: 'deepseek-v4-pro' } } } },
	]);
	writeLog(home, 'b', [
		{ type: 'session', seq: 0, time: now + 120000 },
		{ type: 'request/header', seq: 1, time: now + 420000, data: { header: { config: { model: 'deepseek-v4-pro' } } } },
	]);

	const result = await aggregate();
	expect(result.timeline.days[0].dayTotalMs).toBe(420000);
});
