// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 按 cwd 兜底的项目在 basename 为空（如 cwd 为 "/"）时得到空名称
// Source: src/index.js:693  Contract: src/index.js:668（同类工作区分支 `name: ws.title || basename(ws.path) || "?"` 保证名称非空）
// Verified fixed by `recheck`; do not delete without checking the finding.

import { test, expect, vi } from 'vitest';

const h = vi.hoisted(() => ({ sessions: {} }));

vi.mock('@deepseek-ai/dsh-typert-protocol', () => ({
	Remote: () => (value) => value,
	TypertRemoteService: class { constructor(ctx, name) { this.ctx = ctx; this.name = name; } },
}));

vi.mock('../../src/pricing.cjs', () => ({
	default: {
		summarizeCostsCny: () => ({ totalCny: 0, unpricedTokens: 0 }),
		mergeCostSummariesCny: () => ({ totalCny: 0, unpricedTokens: 0 }),
	},
}));

vi.mock('../../src/pricing-store.js', () => ({
	pricingStore: () => ({
		snapshot: () => ({ catalog: { version: 'v1' } }),
		fingerprint: 'fp',
		refresh: async () => {},
		close: () => {},
		status: () => ({ fingerprint: 'fp' }),
	}),
}));

vi.mock('../../src/accounts.js', () => ({
	collectAccounts: async () => ({}),
	providerViews: async () => ({}),
}));

vi.mock('../../src/host-balance.js', () => ({
	BALANCE_CACHE_MS: 1000,
	balanceErrorCode: () => 'error',
	balanceState: () => ({}),
	fetchDeepSeekBalance: async () => null,
	normalizeBalanceInfo: (value) => value,
	staleBalancePayload: () => null,
	unavailableBalancePayload: () => null,
}));

vi.mock('../../src/host-util.js', async () => {
	const { basename } = await import('node:path');
	return {
		SLOT_MINUTES: 30,
		SLOT_MS: 1800000,
		STATS_SCHEMA_VERSION: '1',
		activityIntervals: () => [],
		basename,
		credentialsService: () => ({}),
		dshHome: () => '/tmp/dsh-home',
		firstString: (...values) => {
			for (const value of values) if (typeof value === 'string' && value) return value;
			return null;
		},
		identityFields: () => ({}),
		isSupportedProjectionDomainVersion: () => true,
		localDayKey: () => '1970-01-01',
		minutesOfDay: () => 0,
		nonNegativeNumber: (value) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0),
		objectRecord: (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : null),
		rawIdentity: () => ({}),
		readJson: () => ({ ok: false, value: null, error: new Error('missing workspace.json') }),
		readSessionProjcache: () => ({ ok: true, value: { tables: { sessions: h.sessions } }, error: null }),
	};
});

vi.mock('../../src/host-sessions.js', () => ({
	STATS_ROUTE_PROJECTION: {},
	contextService: (ctx, name) => ctx?.[name],
	deriveSessionInfoFromEvents: () => null,
	forgetOfficialRead: () => {},
	infoFromProjectionValues: () => null,
	isLegacyDescriptorError: () => false,
	normalizeProjectionUsage: () => null,
	officialProjectionValues: async () => null,
	officialReadCache: () => ({ entries: new Map() }),
	officialReadRevision: async () => null,
	officialSessionSource: async () => null,
	projectionCheckpoint: () => ({}),
	rememberOfficialRead: () => {},
	routeProjectionValueFromEntry: () => null,
	sessionInfo: async () => ({
		times: [], lastTime: null, model: null, providerId: 'unknown', accountType: 'api',
		usages: [], slotStats: [], activityTimes: [], origin: null, parentSession: null,
		seedLength: null, inheritedEventCount: 0, stats: null, partial: false, stale: false,
		missing: false, unavailable: false,
	}),
}));

vi.mock('../../src/host-usage.js', () => ({
	addRaw: (target, raw) => { for (const key of Object.keys(raw)) target[key] = (target[key] || 0) + (raw[key] || 0); },
	emptyRaw: () => ({ turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }),
	modelUsages: () => [],
	projectionSlotUsage: () => ({ cost: {} }),
	repriceSnapshot: (snapshot) => snapshot,
	slotDurations: () => [],
	slotUsages: () => [],
}));

import { StatsService } from '../../src/index.js';

test('[F1] cwd 为 "/" 的兜底项目不会得到空名称', async () => {
	h.sessions = { s1: { identity: { id: 's1', cwd: '/' } } };
	const service = new StatsService({});
	const result = await service.aggregate();
	expect(result.projects).toHaveLength(1);
	expect(result.projects[0].path).toBe('/');
	expect(result.projects[0].name).toBeTruthy();
});

