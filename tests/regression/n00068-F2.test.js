// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] updatedAt 用 `|| null` 计算，把合法的 0 时间戳当作缺失
// Source: src/index.js:586  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { expect, test, vi } from 'vitest';
import { StatsService } from '../../src/index.js';

const h = vi.hoisted(() => ({ sessions: {}, archived: [], info: null }));

vi.mock('../../src/host-util.js', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		dshHome: () => '/virtual-dsh-home',
		firstString: (...values) => values.find((value) => typeof value === 'string' && value.length > 0) ?? null,
		readJson: () => ({ ok: true, value: { tables: { workspaces: {} }, global: { archivedSessionIds: h.archived } }, error: null }),
		readSessionProjcache: () => ({ ok: true, value: { unit: { version: 1 }, tables: { sessions: h.sessions } }, error: null }),
	};
});

vi.mock('../../src/host-sessions.js', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		contextService: () => undefined,
		officialReadCache: () => ({ entries: new Map() }),
		officialReadRevision: async () => null,
		officialSessionSource: async () => null,
		officialProjectionValues: async () => null,
		projectionCheckpoint: () => ({}),
		routeProjectionValueFromEntry: () => null,
		forgetOfficialRead: () => {},
		rememberOfficialRead: () => {},
		sessionInfo: async () => h.info,
	};
});

function missingInfo(overrides = {}) {
	return {
		times: [], lastTime: null, model: 'deepseek-chat', providerId: 'deepseek', accountType: 'api',
		usages: [], slotStats: [], origin: null, activityTimes: [],
		parentSession: null, seedLength: null, inheritedEventCount: 0,
		stats: null, partial: false, stale: false, missing: true, unavailable: false, lastSeq: -1,
		...overrides,
	};
}

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] createdAt 为 0 的会话 updatedAt 不应被当作缺失', async () => {
	h.archived = [];
	h.sessions = {
		s2: {
			identity: { id: 's2', createdAt: 0, cwd: '/work/zero' },
			rows: { tokenUsage: { val: { totals: { uncachedInputTokens: 500, outputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0 } } } },
		},
	};
	h.info = missingInfo();

	const result = await StatsService.prototype.aggregate.call({ ctx: {} });
	const session = result.projects.flatMap((project) => project.sessions).find((row) => row.id === 's2');

	expect(session).toBeTruthy();
	expect(session.createdAt).toBe(0);
	expect(session.updatedAt).toBe(0);
});

