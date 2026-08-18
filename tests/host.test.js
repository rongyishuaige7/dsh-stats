import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { zstdCompressSync } from 'node:zlib';
import { StatsService, fetchDeepSeekBalance } from '../src/index.js';
import { TYPERT } from '../src/typert-host.js';

const createdHomes = [];
const previousDshHome = process.env.DSH_HOME;
const previousFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = previousFetch;
	if (previousDshHome === undefined) delete process.env.DSH_HOME;
	else process.env.DSH_HOME = previousDshHome;
	while (createdHomes.length) rmSync(createdHomes.pop(), { recursive: true, force: true });
});

function credentials(value = 'sk-test') {
	return { resolve: async (ref) => ref === 'DEEPSEEK_API_KEY' ? { value, source: 'test' } : undefined };
}

function balanceResponse(balanceInfos, isAvailable = true) {
	return { ok: true, status: 200, json: async () => ({ is_available: isAvailable, balance_infos: balanceInfos }) };
}

test('DeepSeek balance maps all currencies and keeps the key host-side', async () => {
	let requested;
	const result = await fetchDeepSeekBalance(credentials(), async (url, init) => {
		requested = { url, init };
		return balanceResponse([
			{ currency: 'CNY', total_balance: '18.64', topped_up_balance: '10.00', granted_balance: '8.64' },
			{ currency: 'USD', total_balance: '2.5', topped_up_balance: '2', granted_balance: '0.5' },
		]);
	}, 1234);

	expect(requested.url).toBe('https://api.deepseek.com/user/balance');
	expect(requested.init.headers.authorization).toBe('Bearer sk-test');
	expect(result.accounts).toEqual([
		expect.objectContaining({ currency: 'CNY', total: 18.64, toppedUp: 10, granted: 8.64, fetchedAt: 1234 }),
		expect.objectContaining({ currency: 'USD', total: 2.5 }),
	]);
	expect(result.accounts[0]).not.toHaveProperty('apiKey');
});

test('DeepSeek balance normalizes missing credentials and invalid responses', async () => {
	await expect(fetchDeepSeekBalance({ resolve: async () => undefined }, async () => balanceResponse([]))).rejects.toMatchObject({ code: 'no-api-key' });
	await expect(fetchDeepSeekBalance(credentials(), async () => balanceResponse([{ currency: 'CNY', total_balance: 'not-a-number' }]))).rejects.toMatchObject({ code: 'invalid-response' });
});

test('StatsService balance current caches and deduplicates requests', async () => {
	let calls = 0;
	globalThis.fetch = async () => {
		calls++;
		return balanceResponse([{ currency: 'CNY', total_balance: '18.64', topped_up_balance: '10', granted_balance: '8.64' }]);
	};
	const service = { ctx: { reflect: { get: () => credentials() } } };
	const [first, second] = await Promise.all([StatsService.prototype.current.call(service), StatsService.prototype.current.call(service)]);
	expect(calls).toBe(1);
	expect(first).toBe(second);
	expect(first.accounts[0].total).toBe(18.64);
	const cached = await StatsService.prototype.current.call(service);
	expect(calls).toBe(1);
	expect(cached).toBe(first);
	const descriptor = TYPERT.invocations.find((invocation) => invocation.method === 'current');
	descriptor.result.schema.parse(cached);
});

test('StatsService balance returns explicit unconfigured and error states', async () => {
	const unconfigured = await StatsService.prototype.current.call({});
	expect(unconfigured.accounts[0]).toMatchObject({ status: 'unconfigured', total: null, errorCode: 'no-api-key' });
	TYPERT.invocations.find((invocation) => invocation.method === 'current').result.schema.parse(unconfigured);
	globalThis.fetch = async () => ({ ok: false, status: 503 });
	const failed = await StatsService.prototype.current.call({ ctx: { reflect: { get: () => credentials() } } });
	expect(failed.accounts[0]).toMatchObject({ status: 'error', total: null, errorCode: 'http-5xx' });
});

test('StatsService balance keeps the last successful value as stale on refresh failure', async () => {
	const previousNow = Date.now;
	let now = 1_000_000;
	Date.now = () => now;
	try {
		globalThis.fetch = async () => balanceResponse([{ currency: 'CNY', total_balance: '18.64' }]);
		const service = { ctx: { reflect: { get: () => credentials() } } };
		const fresh = await StatsService.prototype.current.call(service);
		now += 60_001;
		globalThis.fetch = async () => ({ ok: false, status: 503 });
		const stale = await StatsService.prototype.current.call(service);
		expect(stale.accounts[0]).toMatchObject({ status: 'stale', total: 18.64, errorCode: 'http-5xx' });
	} finally {
		Date.now = previousNow;
	}
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

test('slot usage preserves MiniMax service and 512k context pricing tiers', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	const home = fixture({ s1: projection(now) });
	writeLog(home, 's1', [
		{ type: 'session', seq: 0, time: now },
		{ type: 'request/header', seq: 1, time: now + 10, data: { header: { config: { model: 'MiniMax-M3' } } } },
		{ type: 'assistant/message', seq: 2, time: now + 100, data: { turn: 0, step: 0, usage: { inputTokens: 1000, cacheReadTokens: 511000, outputTokens: 10 }, message: { source: { model: 'MiniMax-M3' } } } },
		{ type: 'request/header', seq: 3, time: now + 200, data: { header: { config: { model: 'MiniMax-M3', serviceTier: 'priority' } } } },
		{ type: 'assistant/message', seq: 4, time: now + 300, data: { turn: 1, step: 0, usage: { inputTokens: 1001, cacheReadTokens: 511000, outputTokens: 20 }, message: { source: { model: 'MiniMax-M3' } } } },
	]);

	const session = (await aggregate()).projects[0].sessions[0];
	expect(session.slotUsage).toHaveLength(2);
	expect(session.slotUsage).toEqual(expect.arrayContaining([
		expect.objectContaining({ serviceTier: 'standard', contextOver512k: false, uncached: 1000 }),
		expect.objectContaining({ serviceTier: 'priority', contextOver512k: true, uncached: 1001 }),
	]));
	TYPERT.invocations[0].result.schema.parse(await aggregate());
});

test('host aggregation prices trusted DeepSeek aliases while keeping unknown relays unpriced', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	const home = fixture({ s1: projection(now) });
	writeLog(home, 's1', [
		{ type: 'session', seq: 0, time: now },
		{ type: 'request/header', seq: 1, time: now + 10, data: { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-pro' } } } },
		{ type: 'assistant/message', seq: 2, time: now + 100, data: { turn: 0, step: 0, usage: { inputTokens: 1000, outputTokens: 100 }, message: { source: { provider: 'deepseek-official', model: 'deepseek-v4-pro' } } } },
		{ type: 'request/header', seq: 3, time: now + 200, data: { header: { config: { provider: 'nbdeepseek', model: 'deepseek-v4-pro' } } } },
		{ type: 'assistant/message', seq: 4, time: now + 300, data: { turn: 1, step: 0, usage: { inputTokens: 1000, outputTokens: 100 }, message: { source: { provider: 'nbdeepseek', model: 'deepseek-v4-pro' } } } },
		{ type: 'request/header', seq: 5, time: now + 400, data: { header: { config: { provider: 'custom-relay', model: 'deepseek-v4-pro' } } } },
		{ type: 'assistant/message', seq: 6, time: now + 500, data: { turn: 2, step: 0, usage: { inputTokens: 1000, outputTokens: 100 }, message: { source: { provider: 'custom-relay', model: 'deepseek-v4-pro' } } } },
	]);

	const result = await aggregate();
	const session = result.projects[0].sessions[0];
	expect(session.modelUsage).toHaveLength(3);
	expect(session.modelUsage.map((row) => row.providerId).sort()).toEqual(['custom-relay', 'deepseek-official', 'nbdeepseek']);
	expect(session.cost.status).toBe('partial');
	expect(session.cost.totals).toHaveLength(1);
	expect(session.cost.totals[0].currency).toBe('CNY');
	expect(session.cost.totals[0].amount).toBeCloseTo(0.0234, 10);
	expect(session.cost.unpricedTokens).toBe(1100);
	expect(result.projects[0].cost.status).toBe('partial');
	expect(result.cost.status).toBe('partial');
	expect(result.meta.schemaVersion).toBe(2);
	TYPERT.invocations.find((invocation) => invocation.method === 'aggregate').result.schema.parse(result);
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
