// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 路由投影兜底丢弃 unknownSeed 标记，导致 SESSION_SEED_BOUNDARY_UNKNOWN 诊断消失且不可信缓存用量不再被排除
// Source: src/index.js:473  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi, test, expect, afterEach } from 'vitest';

const state = vi.hoisted(() => ({
	config: { sessionInfoResult: null, routeValue: null, routeInfo: null, revision: null },
	caches: new WeakMap(),
}));

vi.mock('../../src/host-sessions.js', () => ({
	STATS_ROUTE_PROJECTION: { name: 'statsRoute' },
	contextService: (ctx, name) => (ctx && ctx.services ? ctx.services[name] : undefined),
	officialReadCache: (service) => {
		let cache = state.caches.get(service);
		if (!cache) { cache = { entries: new Map() }; state.caches.set(service, cache); }
		return cache;
	},
	forgetOfficialRead: (cache, sessionId) => { cache.entries.delete(sessionId); },
	rememberOfficialRead: (cache, sessionId, value) => { cache.entries.set(sessionId, value); },
	officialReadRevision: async () => state.config.revision,
	officialSessionSource: async () => null,
	officialProjectionValues: async () => null,
	deriveSessionInfoFromEvents: () => { throw new Error('deriveSessionInfoFromEvents must not be called in this fixture'); },
	infoFromProjectionValues: () => state.config.routeInfo,
	normalizeProjectionUsage: () => null,
	isLegacyDescriptorError: () => false,
	projectionCheckpoint: () => ({}),
	routeProjectionValueFromEntry: () => state.config.routeValue,
	sessionInfo: async () => state.config.sessionInfoResult,
}));

// 只替换投影缓存读取（本用例不需要真实 projcache 文件），其余 host-util 保持真实实现。
vi.mock('../../src/host-util.js', async (importOriginal) => {
	const actual = await importOriginal();
	return { ...actual, readSessionProjcache: () => ({ ok: false, value: null, error: null }) };
});

const { StatsService } = await import('../../src/index.js');

const homes = [];
const previousDshHome = process.env.DSH_HOME;

afterEach(() => {
	if (previousDshHome === undefined) delete process.env.DSH_HOME;
	else process.env.DSH_HOME = previousDshHome;
	while (homes.length) rmSync(homes.pop(), { recursive: true, force: true });
});

function makeHome() {
	const home = mkdtempSync(join(tmpdir(), 'dsh-stats-n00047-'));
	homes.push(home);
	mkdirSync(join(home, 'storages'), { recursive: true });
	writeFileSync(join(home, 'storages', 'workspace.json'), JSON.stringify({
		tables: { workspaces: { w1: { title: 'Proj', path: '/w', sessionIds: ['s1'] } } },
		global: { archivedSessionIds: [] },
	}));
	process.env.DSH_HOME = home;
	return home;
}

test('[F1] 缺失日志会话回退到路由投影后仍应保留 unknownSeed 并输出 SESSION_SEED_BOUNDARY_UNKNOWN', async () => {
	makeHome();
	state.config.revision = null;
	state.config.routeValue = { model: 'deepseek-v4-pro' };
	// 解码器对缺失日志的会话：missing=true 且继承边界无法恢复（unknownSeed=true）
	state.config.sessionInfoResult = {
		times: [], lastTime: null, model: 'deepseek-v4-pro', providerId: 'deepseek', accountType: 'api',
		usages: [], slotStats: [], origin: null, activityTimes: [],
		parentSession: 'parent-1', seedLength: 10, inheritedEventCount: 0,
		stats: null, partial: false, stale: false, missing: true, unavailable: false,
		lastSeq: -1, seqGap: false, futureVersion: false, unknownSeed: true,
	};
	// 路由投影回退产出的 info 不包含 unknownSeed（投影缓存不携带日志水位信息）
	state.config.routeInfo = {
		times: [], lastTime: null, model: 'deepseek-v4-pro', providerId: 'deepseek', accountType: 'api',
		usages: [], slotStats: [], origin: null, activityTimes: [],
		parentSession: 'parent-1', seedLength: 10, inheritedEventCount: 0,
		stats: null, partial: false, stale: false, missing: false, unavailable: false, lastSeq: -1,
	};

	const service = {
		ctx: {
			services: {
				sessionQuery: { listSessions: async () => [{ header: { id: 's1', cwd: '/w', createdAt: 1000 } }] },
			},
		},
	};

	const payload = await StatsService.prototype.aggregate.call(service);
	const codes = payload.meta.warnings.map((warning) => warning.code);
	expect(codes).toContain('SESSION_SEED_BOUNDARY_UNKNOWN');
});

// [night-evolver] 这条发现还没修，测试暂不提升;

