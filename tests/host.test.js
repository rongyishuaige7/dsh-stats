import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { zstdCompressSync } from 'node:zlib';
import { StatsService, fetchDeepSeekBalance } from '../src/index.js';
import { TYPERT } from '../src/typert-host.js';
import { TYPERT_REMOTE } from '../src/typert-remote-client.js';

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

test('StatsService account resolves configured pi-ai providers through the host context', async () => {
	const settings = {
		get: async (name) => {
			if (name === 'llm-deepseek') return { apiKeyEnv: 'DEEPSEEK_API_KEY', baseURL: 'https://api.deepseek.com' };
			if (name === 'llm-pi-ai') return { providers: {
				'yi-api': { apiKeyEnv: 'YI_API_API_KEY', api: 'openai-responses', baseURL: 'https://yiapi.cloud', displayName: 'yi-api' }
			} };
			return null;
		}
	};
	const credentialsByRef = {
		DEEPSEEK_API_KEY: 'deepseek-secret',
		YI_API_API_KEY: 'yi-secret'
	};
	const credentialsService = { resolve: async (ref) => ({ value: credentialsByRef[ref], source: 'test' }) };
	const requested = [];
	globalThis.fetch = async (url, init) => {
		requested.push({ url, authorization: init?.headers?.authorization || init?.headers?.Authorization });
		if (url === 'https://api.deepseek.com/user/balance') {
			return { ok: true, status: 200, json: async () => ({ is_available: true, balance_infos: [{ currency: 'CNY', total_balance: 18.64 }] }) };
		}
		if (url === 'https://yiapi.cloud/v1/usage') {
			return { ok: true, status: 200, json: async () => ({ remaining: 95349.09, balance: 95349.09, unit: 'USD', isValid: true }) };
		}
		throw new Error(`unexpected account URL: ${url}`);
	};
	const service = { ctx: { reflect: { get: (name) => ({ settings, credentials: credentialsService }[name]) } } };
	const result = await StatsService.prototype.account.call(service, true);
	const deepseek = result.accounts.find((account) => account.id === 'deepseek-official');
	const yi = result.accounts.find((account) => account.id === 'yi-api');
	expect(deepseek).toMatchObject({ status: 'ok', balance: { currency: 'CNY', remaining: 18.64 } });
	expect(yi).toMatchObject({ id: 'yi-api', displayName: 'yi-api', providerFamily: 'unknown', adapter: 'generic-usage', status: 'ok', balance: { currency: 'USD', remaining: 95349.09 } });
	expect(requested.map((entry) => entry.url)).toEqual(expect.arrayContaining(['https://api.deepseek.com/user/balance', 'https://yiapi.cloud/v1/usage']));
	expect(JSON.stringify(result)).not.toContain('deepseek-secret');
	expect(JSON.stringify(result)).not.toContain('yi-secret');
	TYPERT.invocations.find((invocation) => invocation.method === 'account').result.schema.parse(result);
});

function captureRouteProjection() {
	let definition;
	const ctx = {
		reflect: { provide: () => {} },
		inject: (keys, callback) => {
			expect(keys).toEqual(['sessionProjections']);
			callback({ sessionProjections: { register: (value) => { definition = value; } } });
		},
	};
	new StatsService(ctx);
	return definition;
}

test('route projection is valid for rc6 and rc2 contracts and replaces same-step usage', () => {
	const definition = captureRouteProjection();
	let state = definition.init();
	const now = Date.parse('2026-08-17T12:30:00+08:00');
	const event = (type, seq, time, data = {}) => ({ type, seq, time, data });
	state = definition.apply(state, { type: 'session', seq: 0, time: now });
	state = definition.apply(state, event('assistant/message', 1, now + 1, { turn: 0, step: 0, usage: { inputTokens: 900, outputTokens: 90, cacheReadTokens: 40, cacheWriteTokens: 5 }, message: { source: { provider: 'openai', model: 'gpt-5.6-sol' } } }));
	// A finalized message for the same turn/step replaces the streaming sample.
	state = definition.apply(state, event('assistant/message', 2, now + 2, { turn: 0, step: 0, usage: { inputTokens: 1000, outputTokens: 100, cacheReadTokens: 50, cacheWriteTokens: 6 }, message: { source: { provider: 'openai', model: 'gpt-5.6-sol', serviceTier: 'priority' } } }));
	state = definition.apply(state, event('request/header', 3, now + 3, { header: { provider: 'openai', config: { model: 'gpt-5.6-terra', serviceTier: 'standard' } } }));
	state = definition.apply(state, event('assistant/message', 4, now + 4, { turn: 1, step: 0, usage: { inputTokens: 20, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 4 }, message: { source: { model: 'gpt-5.6-terra' } } }));
	const view = definition.view(state);
	const priority = view.routes.find((row) => row.model === 'gpt-5.6-sol');
	const standard = view.routes.find((row) => row.model === 'gpt-5.6-terra');
	expect(priority).toMatchObject({ providerId: 'openai', serviceTier: 'priority', uncached: 1000, output: 100, cacheRead: 50, cacheWrite: 6 });
	expect(standard).toMatchObject({ providerId: 'openai', serviceTier: 'standard', uncached: 20, output: 2, cacheRead: 3, cacheWrite: 4 });
	expect(view.parentSession).toBeNull();
	definition.schema.parse(view); // rc6 registry contract
	definition.wire.viewSchema.parse(view); // rc2 wire contract
	definition.stateSchema.parse(state); // rc2 state contract
	expect(() => definition.stateSchema.parse({ ...state, samples: { broken: { routeKey: 'x', output: -1, uncached: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 } } })).toThrow();
});

test('route projection excludes inherited fork seed usage before rendering the view', () => {
	const definition = captureRouteProjection();
	let state = definition.apply(definition.init(), { type: 'session', seq: 0, time: 1, parentSession: 'parent', seedLength: 3 });
	state = definition.apply(state, { type: 'assistant/message', seq: 1, time: 2, data: { turn: 0, step: 0, usage: { inputTokens: 9999, outputTokens: 999 }, message: { source: { provider: 'openai', model: 'gpt-5.6-luna' } } } });
	state = definition.apply(state, { type: 'request/header', seq: 3, time: 3, data: { header: { config: { provider: 'openai', model: 'gpt-5.6-luna' } } } });
	state = definition.apply(state, { type: 'assistant/message', seq: 4, time: 4, data: { turn: 1, step: 0, usage: { inputTokens: 10, outputTokens: 2, cacheReadTokens: 7, cacheWriteTokens: 1 }, message: { source: { model: 'gpt-5.6-luna' } } } });
	const view = definition.view(state);
	expect(view.routes).toHaveLength(1);
	expect(view.routes[0]).toMatchObject({ uncached: 10, output: 2, cacheRead: 7, cacheWrite: 1 });
});

test('aggregate prefers official session services and restores projection suffixes from the watermark', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	fixture({ official: projection(now) });
	const calls = [];
	const ctx = {
		workspaceRegistry: {
			list: () => [{ id: 'fixture', title: 'Fixture', path: '/tmp/fixture', sessionIds: ['official'] }],
		},
		sessionQuery: {
			readSession: async (sessionId) => {
				calls.push(['readSession', sessionId]);
				return { session: { id: sessionId, cwd: '/tmp/fixture', createdAt: now }, events: [{ type: 'session', seq: 0, time: now }] };
			},
		},
		sessionPersistence: {
			readFrom: async (sessionId, floor) => {
				calls.push(['readFrom', sessionId, floor]);
				return { events: [] };
			},
		},
		sessionProjections: {
			restoreFloor: (checkpoint) => { calls.push(['restoreFloor', checkpoint]); return 2; },
			restore: (checkpoint, events, floor) => {
				calls.push(['restore', checkpoint, events, floor]);
				return { snapshot: { values: {
					sessionStats: { turns: 4, steps: 5, llmMs: 60, toolMs: 7, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 },
					tokenUsage: { totals: { uncachedInputTokens: 12, outputTokens: 3, cacheReadTokens: 8, cacheWriteTokens: 0 } },
				} } };
			},
		},
	};
	const result = await StatsService.prototype.aggregate.call({ ctx });
	const session = result.projects[0].sessions[0];
	expect(calls.some((call) => call[0] === 'readSession')).toBe(false);
	expect(calls.some((call) => call[0] === 'readFrom' && call[2] === 2)).toBe(true);
	expect(calls.some((call) => call[0] === 'restore' && call[3] === 2)).toBe(true);
	expect(session.stats).toMatchObject({ turns: 4, steps: 5, uncached: 12, output: 3, cacheRead: 8 });
	expect(result.meta.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'OFFICIAL_PROJECTION_VALUES_USED', sessionId: 'official' })]));
	TYPERT.invocations.find((invocation) => invocation.method === 'aggregate').result.schema.parse(result);
});

test('aggregate uses the official projection-cache cold snapshot when available', async () => {
	const now = Date.parse('2026-08-17T11:00:00+08:00');
	fixture({ cached: projection(now) });
	let restoreCalled = false;
	const result = await StatsService.prototype.aggregate.call({ ctx: {
		workspaceRegistry: { list: () => [{ id: 'fixture', title: 'Fixture', path: '/tmp/fixture', sessionIds: ['cached'] }] },
		sessionQuery: { readSession: async (id) => ({ session: { id, cwd: '/tmp/fixture', createdAt: now }, events: [{ type: 'session', seq: 0, time: now }] }) },
		sessionProjectionCache: { coldSnapshot: async () => ({ asOfSeq: 4, values: {
			sessionStats: { turns: 2, steps: 3, llmMs: 20, toolMs: 4, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 },
			tokenUsage: { totals: { uncachedInputTokens: 9, outputTokens: 2, cacheReadTokens: 6, cacheWriteTokens: 0 } },
		} }) },
		sessionProjections: { restore: () => { restoreCalled = true; return { snapshot: { values: {} } }; } },
	} });
	const session = result.projects[0].sessions[0];
	expect(restoreCalled).toBe(false);
	expect(session.stats).toMatchObject({ turns: 2, steps: 3, uncached: 9, output: 2, cacheRead: 6 });
	expect(result.meta.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'OFFICIAL_PROJECTION_CACHE_USED', sessionId: 'cached' })]));
});

test('official projection cache rejects a snapshot from a different session lifecycle', async () => {
	const now = Date.parse('2026-08-17T11:15:00+08:00');
	const entry = projection(now);
	entry.identity.parentSession = 'new-parent';
	entry.identity.seedLength = 4;
	const home = fixture({ child: entry });
	const events = [
		{ type: 'session', seq: 0, time: now, origin: 'subagent', parentSession: 'new-parent', seedLength: 4 },
		{ type: 'assistant/message', seq: 4, time: now + 100, data: { turn: 0, step: 0, usage: { inputTokens: 7, outputTokens: 2 }, message: { source: { model: 'deepseek-v4-flash' } } } },
	];
	const result = await StatsService.prototype.aggregate.call({ ctx: {
		workspaceRegistry: { list: () => [{ id: 'fixture', title: 'Fixture', path: '/tmp/fixture', sessionIds: ['child'] }] },
		sessionQuery: {
			listSessions: async () => [{ header: { id: 'child', cwd: '/tmp/fixture', createdAt: now, parentSession: 'new-parent', seedLength: 4 } }],
			readSession: async (id) => ({ session: { id, cwd: '/tmp/fixture', createdAt: now, parentSession: 'new-parent', seedLength: 4 }, events })
		},
		sessionProjectionCache: { coldSnapshot: async () => ({ asOfSeq: 4, values: {
			sessionStats: { turns: 99, steps: 99, llmMs: 0, toolMs: 0 },
			tokenUsage: { totals: { uncachedInputTokens: 999, outputTokens: 999, cacheReadTokens: 0, cacheWriteTokens: 0 } },
			statsRoute: { origin: 'subagent', parentSession: 'old-parent', seedLength: 3,
				current: { providerId: 'openai', model: 'gpt-5.6-luna', accountType: 'api', serviceTier: 'standard' }, routes: [] }
		} }) }
	} });
	const session = result.projects[0].sessions[0];
	expect(session.stats).toMatchObject({ uncached: 7, output: 2 });
	expect(session.stats.uncached).not.toBe(999);
	expect(result.meta.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'SESSION_CACHE_LIFECYCLE_MISMATCH', sessionId: 'child' })]));
});

test('route projection cache avoids reopening a cold log and keeps model pricing', async () => {
	const now = Date.parse('2026-08-17T11:30:00+08:00');
	fixture({ cachedRoute: projection(now) });
	const calls = [];
	const result = await StatsService.prototype.aggregate.call({ ctx: {
		workspaceRegistry: { list: () => [{ id: 'fixture', title: 'Fixture', path: '/tmp/fixture', sessionIds: ['cachedRoute'] }] },
		sessionQuery: { readSession: async (id) => { calls.push(['readSession', id]); throw new Error('route cache should avoid a full read'); } },
		sessionProjectionCache: { coldSnapshot: async () => ({ asOfSeq: 8, values: {
			sessionStats: { turns: 2, steps: 2, llmMs: 20, toolMs: 4, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 },
			tokenUsage: { totals: { uncachedInputTokens: 1000, outputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0 } },
			sessionListMetadata: { blank: false, lastPromptAt: now + 500 },
			statsRoute: { origin: null, parentSession: null, seedLength: null,
				current: { providerId: 'openai', model: 'gpt-5.6-luna', accountType: 'api', serviceTier: 'standard' },
				routes: [{ providerId: 'openai', model: 'gpt-5.6-luna', accountType: 'api', serviceTier: 'standard', slot: Math.floor(now / (30 * 60 * 1000)), time: now + 500, uncached: 1000, output: 100, cacheRead: 0, cacheWrite: 0, reasoning: 0 }]
			}
		} }) }
	} });
	const session = result.projects[0].sessions[0];
	expect(calls).toEqual([]);
	expect(session.model).toBe('gpt-5.6-luna');
	expect(session.stats).toMatchObject({ uncached: 1000, output: 100 });
	expect(session.cost.status).toBe('estimated');
	expect(session.cost.totals[0].currency).toBe('CNY');
	expect(result.meta.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'OFFICIAL_ROUTE_PROJECTION_USED', sessionId: 'cachedRoute' })]));
	TYPERT.invocations.find((invocation) => invocation.method === 'aggregate').result.schema.parse(result);
});

test('cold projection accepts persisted statsRoute state objects and weights the primary route', async () => {
	const now = Date.parse('2026-08-17T12:00:00+08:00');
	const slot = Math.floor(now / (30 * 60 * 1000));
	const result = await StatsService.prototype.aggregate.call({ ctx: {
		workspaceRegistry: { list: () => [{ id: 'fixture', title: 'Fixture', path: '/tmp/fixture', sessionIds: ['stateRoutes'] }] },
		sessionProjectionCache: { coldSnapshot: async () => ({ asOfSeq: 8, values: {
			sessionStats: { turns: 2, steps: 2, llmMs: 20, toolMs: 4, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 },
			tokenUsage: { totals: { uncachedInputTokens: 2100, outputTokens: 110, cacheReadTokens: 0, cacheWriteTokens: 0 } },
			sessionListMetadata: { blank: false, lastPromptAt: now + 500 },
			statsRoute: {
				origin: null,
				parentSession: null,
				seedLength: null,
				// This is the rc2/rc6 persisted state shape. `current` is the
				// latest route, while the largest bucket is the primary route.
				current: { providerId: 'yi-api', model: 'gpt-5.6-luna', accountType: 'api', serviceTier: 'standard' },
				routes: {
					openai: { providerId: 'openai', model: 'gpt-5.6-sol', accountType: 'api', serviceTier: 'standard', slot, time: now + 100, uncached: 2000, output: 100, cacheRead: 0, cacheWrite: 0, reasoning: 0 },
					yi: { providerId: 'yi-api', model: 'gpt-5.6-luna', accountType: 'api', serviceTier: 'standard', slot, time: now + 500, uncached: 100, output: 10, cacheRead: 0, cacheWrite: 0, reasoning: 0 },
					bad: { providerId: 'ignored', model: 'bad-row', serviceTier: 'standard', slot, time: 'invalid', uncached: 999999 }
				},
				samples: {}
			}
		} }) }
	} });
	const session = result.projects[0].sessions[0];
	expect(session.model).toBe('gpt-5.6-sol');
	expect(session.providerId).toBe('openai');
	expect(session.stats).toMatchObject({ uncached: 2100, output: 110 });
	expect(session.modelUsage).toEqual(expect.arrayContaining([
		expect.objectContaining({ providerId: 'openai', model: 'gpt-5.6-sol', uncached: 2000, output: 100 }),
		expect.objectContaining({ providerId: 'yi-api', model: 'gpt-5.6-luna', uncached: 100, output: 10 })
	]));
	expect(session.modelUsage).toHaveLength(2);
	TYPERT.invocations.find((invocation) => invocation.method === 'aggregate').result.schema.parse(result);
});

function projection(createdAt, overrides = {}) {
	const rows = {
		title: { val: overrides.title || 'Fixture session' },
		sessionListMetadata: { val: { blank: false, lastPromptAt: overrides.lastPromptAt ?? createdAt } },
		sessionStats: { val: { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, ...overrides.stats } },
		tokenUsage: { val: { totals: { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, ...overrides.usage } } },
	};
	if (overrides.route) rows.statsRoute = { val: overrides.route };
	return {
		identity: { createdAt, cwd: '/tmp/fixture' },
		rows,
	};
}

function fixture(entries, sessionIds = Object.keys(entries), archivedSessionIds = []) {
	const home = mkdtempSync(join(tmpdir(), 'dsh-stats-test-'));
	createdHomes.push(home);
	mkdirSync(join(home, 'storages'), { recursive: true });
	writeFileSync(join(home, 'storages', 'workspace.json'), JSON.stringify({
		tables: { workspaces: { fixture: { title: 'Fixture', path: '/tmp/fixture', sessionIds } } },
		global: { archivedSessionIds },
	}));
	writeFileSync(join(home, 'storages', 'session_projcache.json'), JSON.stringify({ tables: { sessions: entries } }));
	process.env.DSH_HOME = home;
	return home;
}

function writeLog(home, sessionId, records, suffix) {
	const encoded = encodeSessionId(sessionId);
	const dir = join(home, 'sessions', 'workspace', encoded);
	mkdirSync(dir, { recursive: true });
	const frame = zstdCompressSync(Buffer.from(records.map((record) => JSON.stringify(record)).join('\n') + '\n'));
	writeFileSync(join(dir, 'session.jsonl.zstd'), suffix ? Buffer.concat([frame, suffix]) : frame);
}

function writePlainLog(home, sessionId, records) {
	const encoded = encodeSessionId(sessionId);
	const dir = join(home, 'sessions', 'workspace', encoded);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'session.jsonl'), Buffer.from(records.map((record) => JSON.stringify(record)).join('\n') + '\n'));
}

function encodeSessionId(raw) {
	if (raw === '.') return '~002E';
	if (raw === '..') return '~002E~002E';
	let encoded = '';
	for (let i = 0; i < raw.length; i++) {
		const code = raw.charCodeAt(i), char = String.fromCharCode(code);
		encoded += char !== '~' && /^[A-Za-z0-9._-]$/.test(char) ? char : `~${code.toString(16).toUpperCase().padStart(4, '0')}`;
	}
	return encoded;
}

function versionedProjection(createdAt, seq, usage = {}) {
	const row = (val) => ({ ver: 1, seq, val });
	return {
		identity: { createdAt, cwd: '/tmp/fixture' },
		rows: {
			title: row('Fixture session'),
			sessionListMetadata: row({ blank: false, lastPromptAt: createdAt }),
			sessionStats: row({ turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 }),
			tokenUsage: row({ totals: { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, ...usage } }),
		},
	};
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

test('legacy cache-only missing logs recover model routes from the persisted state shape', async () => {
	const now = Date.parse('2026-08-17T10:30:00+08:00');
	const slot = Math.floor(now / (30 * 60 * 1000));
	const route = {
		origin: null,
		parentSession: null,
		seedLength: null,
		current: { providerId: 'yi-api', model: 'gpt-5.6-luna', accountType: 'api', serviceTier: 'standard' },
		routes: {
			openai: { providerId: 'openai', model: 'gpt-5.6-sol', accountType: 'api', serviceTier: 'standard', slot, time: now + 100, uncached: 2000, output: 100, cacheRead: 0, cacheWrite: 0, reasoning: 0 },
			yi: { providerId: 'yi-api', model: 'gpt-5.6-luna', accountType: 'api', serviceTier: 'standard', slot, time: now + 500, uncached: 100, output: 10, cacheRead: 0, cacheWrite: 0, reasoning: 0 }
		},
		samples: {}
	};
	fixture({ missingRoute: projection(now, {
		usage: { uncachedInputTokens: 2100, outputTokens: 110 },
		route
	}) });
	const result = await aggregate();
	const session = result.projects[0].sessions[0];
	expect(session.model).toBe('gpt-5.6-sol');
	expect(session.providerId).toBe('openai');
	expect(session.modelUsage).toHaveLength(2);
	expect(session.stats).toMatchObject({ uncached: 2100, output: 110 });
	expect(session.quality).toBe('partial');
	expect(result.meta.warnings).toEqual(expect.arrayContaining([
		expect.objectContaining({ code: 'SESSION_ROUTE_PROJECTION_FALLBACK', sessionId: 'missingRoute' }),
		expect.objectContaining({ code: 'SESSION_LOG_MISSING', sessionId: 'missingRoute' })
	]));
});

test('archived cache-only forks with route buckets are still excluded without a log', async () => {
	const now = Date.parse('2026-08-17T10:45:00+08:00');
	const slot = Math.floor(now / (30 * 60 * 1000));
	fixture({ orphanRoute: projection(now, {
		usage: { uncachedInputTokens: 20, outputTokens: 2 },
		route: {
			origin: 'subagent', parentSession: 'parent', seedLength: 3,
			current: { providerId: 'openai', model: 'gpt-5.6-luna', accountType: 'api', serviceTier: 'standard' },
			routes: {
				main: { providerId: 'openai', model: 'gpt-5.6-luna', accountType: 'api', serviceTier: 'standard', slot, time: now, uncached: 20, output: 2, cacheRead: 0, cacheWrite: 0, reasoning: 0 }
			},
			samples: {}
		}
	}) }, ['orphanRoute'], ['orphanRoute']);
	const result = await aggregate();
	expect(result.projects[0].sessions).toHaveLength(0);
	expect(result.projects[0].stats.uncached).toBe(0);
	expect(result.meta.warnings).toEqual(expect.arrayContaining([
		expect.objectContaining({ code: 'SESSION_ORPHAN_FORK_DISCARDED', sessionId: 'orphanRoute' })
	]));
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

test('host aggregation estimates unknown API routes while keeping provider identity', async () => {
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
	expect(session.modelUsage.find((row) => row.providerId === 'custom-relay').cost).toMatchObject({ status: 'estimated', unpricedTokens: 0 });
	expect(session.cost.status).toBe('estimated');
	expect(session.cost.totals).toHaveLength(1);
	expect(session.cost.totals[0].currency).toBe('CNY');
	expect(session.cost.totals[0].amount).toBeCloseTo(0.0351, 10);
	expect(session.cost.totals[0].exactAmount).toBeCloseTo(0.0234, 10);
	expect(session.cost.totals[0].estimatedAmount).toBeCloseTo(0.0117, 10);
	expect(session.cost.unpricedTokens).toBe(0);
	expect(result.projects[0].cost.status).toBe('estimated');
	expect(result.cost.status).toBe('estimated');
	expect(result.meta.schemaVersion).toBe(2);
	TYPERT.invocations.find((invocation) => invocation.method === 'aggregate').result.schema.parse(result);
});

test('mixed priced and unsupported usage keeps only confirmed RMB in primary totals', async () => {
	const now = Date.parse('2026-08-17T12:00:00+08:00');
	const home = fixture({ mixed: projection(now) });
	writeLog(home, 'mixed', [
		{ type: 'session', seq: 0, time: now },
		{ type: 'request/header', seq: 1, time: now + 10, data: { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } } },
		{ type: 'assistant/message', seq: 2, time: now + 100, data: { turn: 0, step: 0, usage: { inputTokens: 1000, outputTokens: 100 }, message: { source: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } } },
		{ type: 'request/header', seq: 3, time: now + 200, data: { header: { config: { provider: 'deepseek-official', model: 'future-model' } } } },
		{ type: 'assistant/message', seq: 4, time: now + 300, data: { turn: 1, step: 0, usage: { inputTokens: 2000, outputTokens: 200 }, message: { source: { provider: 'deepseek-official', model: 'future-model' } } } },
	]);
	const result = await aggregate();
	const session = result.projects[0].sessions[0];
	expect(session.cost.status).toBe('partial');
	expect(session.cost.totals).toHaveLength(1);
	expect(session.cost.totals[0].currency).toBe('CNY');
	expect(session.cost.totals[0].amount).toBeGreaterThan(0);
	expect(session.cost.unpricedTokens).toBe(2200);
	expect(session.cost.unknownRows).toBe(1);
	expect(result.projects[0].cost).toMatchObject({ status: 'partial', unpricedTokens: 2200, unknownRows: 1 });
	expect(result.cost).toMatchObject({ status: 'partial', unpricedTokens: 2200, unknownRows: 1 });
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

test('malformed storage shapes degrade the snapshot instead of crashing aggregate', async () => {
	const home = fixture({});
	writeFileSync(join(home, 'storages', 'workspace.json'), JSON.stringify({
		tables: { workspaces: { nullEntry: null, badIds: { title: 'Bad', path: '/tmp/bad', sessionIds: {} } } },
		global: { archivedSessionIds: {} },
	}));
	const result = await aggregate();
	expect(result.projects).toEqual([expect.objectContaining({ id: 'badIds', sessionCount: 0 })]);
	expect(result.meta.degraded).toBe(true);
	expect(result.meta.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining([
		'ARCHIVED_IDS_SHAPE_INVALID', 'WORKSPACE_ENTRY_INVALID', 'SESSION_IDS_SHAPE_INVALID',
	]));
	TYPERT.invocations.find((invocation) => invocation.method === 'aggregate').result.schema.parse(result);
});

test('missing storage tables degrade an otherwise valid JSON snapshot', async () => {
	const home = fixture({});
	writeFileSync(join(home, 'storages', 'workspace.json'), JSON.stringify({}));
	writeFileSync(join(home, 'storages', 'session_projcache.json'), JSON.stringify({}));
	const result = await aggregate();
	expect(result.projects).toEqual([]);
	expect(result.meta).toMatchObject({ degraded: true });
	expect(result.meta.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining([
		'WORKSPACE_SHAPE_INVALID', 'SESSION_TABLE_SHAPE_INVALID',
	]));
});

test('a session referenced by multiple workspaces is counted exactly once', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	const home = fixture({ same: projection(now, { usage: { uncachedInputTokens: 100 } }) });
	writeFileSync(join(home, 'storages', 'workspace.json'), JSON.stringify({
		tables: { workspaces: {
			a: { title: 'A', path: '/tmp/fixture', sessionIds: ['same'] },
			b: { title: 'B', path: '/tmp/other', sessionIds: ['same'] },
		} },
		global: { archivedSessionIds: [] },
	}));
	const result = await aggregate();
	expect(result.projects.map((project) => project.sessionCount)).toEqual([1, 0]);
	expect(result.projects.reduce((sum, project) => sum + project.stats.uncached, 0)).toBe(100);
	expect(result.meta.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'SESSION_MULTIPLE_WORKSPACES', sessionId: 'same' })]));
});

test('empty logs, duplicate fallback seqs, and malformed timestamps report partial quality safely', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	const emptyHome = fixture({ empty: projection(now) });
	const emptyDir = join(emptyHome, 'sessions', 'workspace', 'empty');
	mkdirSync(emptyDir, { recursive: true });
	writeFileSync(join(emptyDir, 'session.jsonl.zstd'), Buffer.alloc(0));
	let result = await aggregate();
	expect(result.projects[0].sessions[0].quality).toBe('partial');
	expect(result.meta.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'SESSION_LOG_PARTIAL' })]));

	const malformedHome = fixture({ malformed: projection(now) });
	writeLog(malformedHome, 'malformed', [
		{ type: 'session', seq: 0, time: now },
		{ type: 'request/header', seq: 1, time: now + 10, data: { header: { config: { model: 'deepseek-v4-pro' } } } },
		{ type: 'assistant/message', seq: 2, time: now + 100, data: { usage: { inputTokens: 10, outputTokens: 1 }, message: { source: { model: 'deepseek-v4-pro' } } } },
		{ type: 'assistant/message', seq: 2, time: now + 200, data: { usage: { inputTokens: 20, outputTokens: 2 }, message: { source: { model: 'deepseek-v4-pro' } } } },
		{ type: 'assistant/message', seq: 4, time: -1, data: { usage: { inputTokens: 999, outputTokens: 999 }, message: { source: { model: 'deepseek-v4-pro' } } } },
	]);
	result = await aggregate();
	const session = result.projects[0].sessions[0];
	expect(session).toMatchObject({ quality: 'partial', calls: 2, stats: { uncached: 30, output: 3 } });
	expect(session.slotUsage.every((row) => row.slot >= 0)).toBe(true);
	expect(session.slots.every((row) => row.slot >= 0)).toBe(true);
});

test('fork metadata is applied before inherited events even when the session row is later', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	const home = fixture({ child: projection(now) });
	writeLog(home, 'child', [
		{ type: 'assistant/message', seq: 1, time: now + 10, data: { turn: 0, step: 0, usage: { inputTokens: 999, outputTokens: 99 }, message: { source: { model: 'deepseek-v4-pro' } } } },
		{ type: 'session', seq: 0, time: now, origin: 'subagent', parentSession: 'parent', seedLength: 3 },
		{ type: 'request/header', seq: 3, time: now + 20, data: { header: { config: { model: 'deepseek-v4-flash' } } } },
		{ type: 'assistant/message', seq: 4, time: now + 30, data: { turn: 1, step: 0, usage: { inputTokens: 10, outputTokens: 2 }, message: { source: { model: 'deepseek-v4-flash' } } } },
	]);
	const session = (await aggregate()).projects[0].sessions[0];
	expect(session).toMatchObject({ subagent: true, calls: 1, stats: { uncached: 10, output: 2 } });
});

test('a valid fork containing only inherited events is not reported as a malformed empty log', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	const home = fixture({ child: projection(now) });
	writeLog(home, 'child', [
		{ type: 'session', seq: 0, time: now, origin: 'subagent', parentSession: 'parent', seedLength: 3 },
		{ type: 'assistant/message', seq: 1, time: now + 10, data: { turn: 0, step: 0, usage: { inputTokens: 999, outputTokens: 99 }, message: { source: { model: 'deepseek-v4-pro' } } } },
	]);
	const result = await aggregate();
	const session = result.projects[0].sessions[0];
	expect(session).toMatchObject({ subagent: true, calls: 0, quality: 'exact', stats: { uncached: 0, output: 0 } });
	expect(result.meta.warnings).not.toEqual(expect.arrayContaining([expect.objectContaining({ code: 'SESSION_LOG_PARTIAL' })]));
});

test('archived orphan forks with inherited-only projection usage are excluded from every aggregate', async () => {
	const orphanAt = Date.parse('2026-08-17T10:00:00+08:00');
	const keptAt = Date.parse('2026-08-18T10:00:00+08:00');
	const home = fixture({
		orphan: projection(orphanAt, {
			usage: { uncachedInputTokens: 4000, outputTokens: 500, cacheReadTokens: 8000 },
			stats: { turns: 20, steps: 30, llmMs: 1000, toolMs: 200 }
		}),
		kept: projection(keptAt),
	}, ['orphan', 'kept'], ['orphan', 'kept']);
	writeLog(home, 'orphan', [
		{ type: 'session', seq: 0, time: orphanAt, origin: 'subagent', parentSession: 'parent', seedLength: 3 },
		{ type: 'assistant/message', seq: 1, time: orphanAt + 100, data: { turn: 0, step: 0, usage: { inputTokens: 9999, outputTokens: 999 }, message: { source: { model: 'deepseek-v4-pro' } } } },
	]);
	writeLog(home, 'kept', [
		{ type: 'session', seq: 0, time: keptAt, origin: 'subagent', parentSession: 'parent', seedLength: 3 },
		{ type: 'assistant/message', seq: 1, time: keptAt + 100, data: { turn: 0, step: 0, usage: { inputTokens: 9999, outputTokens: 999 }, message: { source: { model: 'deepseek-v4-pro' } } } },
		{ type: 'request/header', seq: 3, time: keptAt + 200, data: { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-pro' } } } },
		{ type: 'assistant/message', seq: 4, time: keptAt + 300, data: { turn: 1, step: 0, usage: { inputTokens: 7, outputTokens: 2 }, message: { source: { model: 'deepseek-v4-pro' } } } },
		{ type: 'step/end', seq: 5, time: keptAt + 400, data: { turn: 1, step: 0 } },
	]);

	const result = await aggregate();
	const project = result.projects.find((candidate) => candidate.id === 'fixture');
	expect(project.sessionCount).toBe(1);
	expect(project.subagentCount).toBe(1);
	expect(project.sessions.map((session) => session.id)).toEqual(['kept']);
	expect(project.stats).toMatchObject({ uncached: 7, output: 2, cacheRead: 0, cacheWrite: 0 });
	expect(project.cost).toMatchObject({ status: 'exact', unpricedTokens: 0, unknownRows: 0 });
	expect(result.cost).toMatchObject({ status: 'exact', unpricedTokens: 0, unknownRows: 0 });
	expect(result.timeline.days.map((day) => day.date)).toEqual(['2026-08-18']);
	expect(result.meta.warnings).toEqual(expect.arrayContaining([
		expect.objectContaining({ code: 'SESSION_ORPHAN_FORK_DISCARDED', sessionId: 'orphan' })
	]));
	TYPERT.invocations.find((invocation) => invocation.method === 'aggregate').result.schema.parse(result);
});

test('special session ids use the official encoded path and cannot escape the sessions directory', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	const id = '../../outside';
	const home = fixture({ [id]: projection(now, { usage: { uncachedInputTokens: 5 } }) }, [id]);
	// A legacy raw join would resolve this candidate outside <home>/sessions.
	mkdirSync(join(home, 'outside'), { recursive: true });
	const escaped = zstdCompressSync(Buffer.from(JSON.stringify({ type: 'session', seq: 0, time: now }) + '\n'));
	writeFileSync(join(home, 'outside', 'session.jsonl.zstd'), escaped);
	writeLog(home, id, [
		{ type: 'session', seq: 0, time: now },
		{ type: 'assistant/message', seq: 1, time: now + 10, data: { turn: 0, step: 0, usage: { inputTokens: 9, outputTokens: 2 }, message: { source: { model: 'deepseek-v4-pro' } } } },
	]);
	const result = await aggregate();
	expect(result.projects[0].sessions[0].stats.uncached).toBe(9);
	expect(result.meta.warnings).not.toEqual(expect.arrayContaining([expect.objectContaining({ code: 'SESSION_LOG_MISSING', sessionId: id })]));
});

test('official plain JSONL logs and special encoded session ids are readable', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	const id = '会话~42';
	const home = fixture({ [id]: projection(now) });
	writePlainLog(home, id, [
		{ type: 'session', seq: 0, version: 0, time: now },
		{ type: 'assistant/message', seq: 1, time: now + 100, data: { turn: 0, step: 0, usage: { inputTokens: 12, outputTokens: 3 }, message: { source: { model: 'deepseek-v4-flash' } } } },
	]);
	const result = await aggregate();
	const session = result.projects[0].sessions[0];
	expect(session.id).toBe(id);
	expect(session.stats).toMatchObject({ uncached: 12, output: 3 });
	expect(session.quality).toBe('exact');
});

test('seq gaps, future format versions, and bad packed rows are degraded explicitly', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	const home = fixture({ gap: projection(now), future: projection(now), packed: projection(now) });
	writeLog(home, 'gap', [
		{ type: 'session', seq: 0, time: now },
		{ type: 'assistant/message', seq: 2, time: now + 100, data: { turn: 0, step: 0, usage: { inputTokens: 10, outputTokens: 1 } } },
	]);
	writeLog(home, 'future', [
		{ type: 'session', seq: 0, version: 99, time: now },
		{ type: 'assistant/message', seq: 1, time: now + 100, data: { turn: 0, step: 0, usage: { inputTokens: 1000, outputTokens: 100 } } },
	]);
	writeLog(home, 'packed', [
		{ type: 'session', seq: 0, time: now },
		{ type: 'text-chunks', seq0: 1, time0: now + 10, data: { turn: 0, step: 0, index: 0, dt: [], texts: ['a', 'b'] } },
	]);
	const result = await aggregate();
	const byId = new Map(result.projects[0].sessions.map((session) => [session.id, session]));
	expect(byId.get('gap').quality).toBe('partial');
	expect(byId.get('future').quality).toBe('partial');
	expect(byId.get('packed').quality).toBe('partial');
	expect(result.meta.warnings).toEqual(expect.arrayContaining([
		expect.objectContaining({ code: 'SESSION_SEQ_GAP', sessionId: 'gap' }),
		expect.objectContaining({ code: 'SESSION_FORMAT_VERSION_UNSUPPORTED', sessionId: 'future' }),
		expect.objectContaining({ code: 'SESSION_LOG_PARTIAL', sessionId: 'packed' }),
	]));
});

test('versioned projection rows are accepted only at the exact log watermark', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	const home = fixture({ stale: versionedProjection(now, 1), ahead: versionedProjection(now, 9) });
	writeLog(home, 'stale', [
		{ type: 'session', seq: 0, time: now },
		{ type: 'assistant/message', seq: 1, time: now + 100, data: { turn: 0, step: 0, usage: { inputTokens: 7, outputTokens: 2 } } },
		{ type: 'step/end', seq: 2, time: now + 200, data: { turn: 0, step: 0 } },
	]);
	writeLog(home, 'ahead', [
		{ type: 'session', seq: 0, time: now },
		{ type: 'assistant/message', seq: 1, time: now + 100, data: { turn: 0, step: 0, usage: { inputTokens: 5, outputTokens: 1 } } },
	]);
	const result = await aggregate();
	const warningCodes = result.meta.warnings.map((warning) => warning.code);
	expect(warningCodes).toContain('SESSION_CACHE_STALE');
	expect(warningCodes).toContain('SESSION_CACHE_AHEAD_OF_LOG');
	expect(result.projects[0].sessions.find((session) => session.id === 'stale').stats.uncached).toBe(7);
});

test('projection cache rejects a fork row from a different session lifecycle', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	const entry = projection(now);
	entry.identity.parentSession = 'old-parent';
	entry.identity.seedLength = 3;
	fixture({ child: entry });
	const home = process.env.DSH_HOME;
	writeLog(home, 'child', [
		{ type: 'session', seq: 0, time: now, parentSession: 'new-parent', seedLength: 4 },
		{ type: 'assistant/message', seq: 4, time: now + 100, data: { turn: 0, step: 0, usage: { inputTokens: 7, outputTokens: 2 }, message: { source: { model: 'deepseek-v4-flash' } } } },
	]);
	const result = await aggregate();
	const warning = result.meta.warnings.find((item) => item.code === 'SESSION_CACHE_LIFECYCLE_MISMATCH');
	expect(warning).toMatchObject({ sessionId: 'child' });
	expect(result.projects[0].sessions[0].stats).toMatchObject({ uncached: 7, output: 2 });
});

test('archived sessions without logs and cache-only tokens stay out of primary totals', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	fixture({ deleted: projection(now, { usage: { uncachedInputTokens: 1000, outputTokens: 100 } }) }, ['deleted'], ['deleted']);
	const result = await aggregate();
	expect(result.projects[0].sessions).toHaveLength(0);
	expect(result.projects[0].stats.uncached).toBe(0);
	expect(result.meta.warnings).toEqual(expect.arrayContaining([
		expect.objectContaining({ code: 'SESSION_ORPHAN_FORK_DISCARDED', sessionId: 'deleted' }),
	]));
});

test('primary model weighting includes cache-write tokens', async () => {
	const now = Date.parse('2026-08-17T10:00:00+08:00');
	const home = fixture({ s1: projection(now) });
	writeLog(home, 's1', [
		{ type: 'session', seq: 0, time: now },
		{ type: 'request/header', seq: 1, time: now + 10, data: { header: { config: { model: 'deepseek-v4-pro' } } } },
		{ type: 'assistant/message', seq: 2, time: now + 20, data: { turn: 0, step: 0, usage: { inputTokens: 2 }, message: { source: { model: 'deepseek-v4-pro' } } } },
		{ type: 'request/header', seq: 3, time: now + 30, data: { header: { config: { model: 'deepseek-v4-flash' } } } },
		{ type: 'assistant/message', seq: 4, time: now + 40, data: { turn: 1, step: 0, usage: { cacheWriteTokens: 100 }, message: { source: { model: 'deepseek-v4-flash' } } } },
	]);
	expect((await aggregate()).projects[0].sessions[0].model).toBe('deepseek-v4-flash');
});

test('host and remote RPC contracts require the same aggregate fields and force parameter', async () => {
	fixture({});
	const result = await aggregate();
	const hostAggregate = TYPERT.invocations.find((invocation) => invocation.method === 'aggregate');
	const remoteAggregate = TYPERT_REMOTE.descriptors.find((descriptor) => descriptor.method === 'aggregate');
	expect(hostAggregate.result.schema.parse(result)).toEqual(result);
	expect(remoteAggregate.result.schema.parse(result)).toEqual(result);
	const withoutSlotMinutes = { ...result, timeline: { days: result.timeline.days } };
	expect(() => hostAggregate.result.schema.parse(withoutSlotMinutes)).toThrow();
	expect(() => remoteAggregate.result.schema.parse(withoutSlotMinutes)).toThrow();

	const hostAccount = TYPERT.invocations.find((invocation) => invocation.method === 'account');
	const remoteAccount = TYPERT_REMOTE.descriptors.find((descriptor) => descriptor.method === 'account');
	expect(hostAccount.parameters).toHaveLength(1);
	expect(remoteAccount.parameters).toHaveLength(1);
	expect(hostAccount.parameters[0].codec.schema.parse(true)).toBe(true);
	expect(remoteAccount.parameters[0].codec.schema.parse(undefined)).toBeUndefined();
});
