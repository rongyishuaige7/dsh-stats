// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 读取会话 revision 的宿主调用没有兜底，一次失败就让整个 stats/aggregate RPC 拒绝
// Source: src/index.js:348  Contract: src/index.js:330（“处理一个会话：容错（坏日志不拖垮整体）”）+ src/index.js:266-272 / 366-369 / 439-447（同函数内其它宿主/日志读取都包了 try/catch 并降级）
// Verified fixed by `recheck`; do not delete without checking the finding.

import { expect, test, vi } from 'vitest';

// 宿主服务与落盘数据都打桩，保证测试无网络、无真实 home。
vi.mock('../../src/host-util.js', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		dshHome: () => '/nonexistent/dsh-stats-n00210',
		readJson: () => ({
			ok: true,
			error: null,
			value: {
				tables: { workspaces: { w1: { title: 'Proj', path: '/proj', sessionIds: ['s1'] } } },
				global: { archivedSessionIds: [] },
			},
		}),
		readSessionProjcache: () => ({
			ok: true,
			error: null,
			value: { unit: { version: 1 }, tables: { sessions: { s1: { identity: { id: 's1', cwd: '/proj' } } } } },
		}),
	};
});

vi.mock('../../src/host-sessions.js', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		contextService: () => undefined,
		officialReadCache: () => ({ entries: new Map() }),
		// 宿主读取日志 revision 的调用在瞬时故障下会抛错（与 listSessions 同一类 I/O）。
		officialReadRevision: async () => { throw new Error('revision backend unavailable'); },
		officialSessionSource: async () => null,
		officialProjectionValues: async () => null,
		projectionCheckpoint: () => ({}),
		routeProjectionValueFromEntry: () => null,
		forgetOfficialRead: () => {},
		rememberOfficialRead: () => {},
		sessionInfo: async () => ({
			times: [1_700_000_000_000], lastTime: 1_700_000_000_000,
			model: 'deepseek-chat', providerId: 'deepseek', accountType: 'api',
			usages: [], slotStats: [], origin: null, activityTimes: [1_700_000_000_000],
			parentSession: null, seedLength: null, inheritedEventCount: 0,
			stats: null, partial: false, stale: false, missing: false, unavailable: false, lastSeq: 0,
		}),
	};
});

import { StatsService } from '../../src/index.js';

test('[F1] 读取会话 revision 失败不应让整个 aggregate 拒绝', async () => {
	// 用 try/catch 把“RPC 直接拒绝”转换成明确的断言失败信息。
	let outcome;
	try {
		outcome = { ok: true, value: await StatsService.prototype.aggregate.call({ ctx: {} }) };
	} catch (error) {
		outcome = { ok: false, error };
	}
	expect(outcome.ok, `aggregate 直接拒绝：${outcome.error?.message}`).toBe(true);
	expect(outcome.value.meta.degraded).toBe(true);
	expect(outcome.value.projects.map((project) => project.id)).toEqual(['w1']);
});

