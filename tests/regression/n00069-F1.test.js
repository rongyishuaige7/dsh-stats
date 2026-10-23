// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 会话派生结果为空时 info 没有兜底，aggregate 在读取 info.seqGap 时整体崩溃
// Source: src/index.js:534  Contract: src/index.js:330（“处理一个会话：容错（坏日志不拖垮整体），返回会话记录或 null”），同函数 417 行也以 `officialSource && info` 显式防御 info 为空
// Verified fixed by `recheck`; do not delete without checking the finding.

// Adversarial error-path tests for src/index.js (round 1).
import { expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({
	revision: async () => null,
	source: async () => null,
	derive: () => null,
	projection: async () => null,
}));

vi.mock('../../src/host-util.js', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		dshHome: () => '/virtual-dsh-home-n00069',
		readJson: () => ({
			ok: true,
			value: {
				tables: { workspaces: { w1: { title: 'Proj', path: '/proj', sessionIds: ['s1'] } } },
				global: { archivedSessionIds: [] },
			},
			error: null,
		}),
		readSessionProjcache: () => ({
			ok: true,
			value: { unit: { version: 1 }, tables: { sessions: { s1: { identity: { id: 's1', cwd: '/proj' } } } } },
			error: null,
		}),
	};
});

vi.mock('../../src/host-sessions.js', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		contextService: () => undefined,
		officialReadCache: () => ({ entries: new Map() }),
		officialReadRevision: (...args) => h.revision(...args),
		officialSessionSource: (...args) => h.source(...args),
		deriveSessionInfoFromEvents: (...args) => h.derive(...args),
		officialProjectionValues: (...args) => h.projection(...args),
		normalizeProjectionUsage: () => null,
		projectionCheckpoint: () => ({}),
		routeProjectionValueFromEntry: () => null,
		forgetOfficialRead: () => {},
		rememberOfficialRead: () => {},
		sessionInfo: async () => null,
	};
});

import { StatsService } from '../../src/index.js';

function officialSource() {
	return {
		events: [],
		header: { id: 's1', cwd: '/proj', createdAt: 1_700_000_000_000 },
		source: 'sessionPersistence',
		inheritedEventCount: 0,
	};
}

// [F1] 官方来源存在但派生结果为空（空/不受支持的事件日志）时，processSession 不应让
// 整个聚合崩溃：330 行承诺“坏日志不拖垮整体”。
test('[F1] 官方事件来源存在但派生结果为 null 时不应让整个 aggregate 崩溃', async () => {
	h.revision = async () => null;
	h.source = async () => officialSource();
	h.derive = () => null;
	h.projection = async () => null;

	const result = await StatsService.prototype.aggregate.call({ ctx: {} });

	expect(result.projects).toHaveLength(1);
	const session = result.projects[0].sessions.find((row) => row.id === 's1');
	expect(session).toBeTruthy();
	expect(session.quality).toBe('partial');
});

// [F2] 读取会话日志水位的官方调用被拒绝时，应退化为 revision 未知（null）并记告警，
// 而不是让整个 stats/aggregate RPC 失败。
// [night-evolver] 这条发现还没修，测试暂不提升;

