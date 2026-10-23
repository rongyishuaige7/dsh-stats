// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 过期的 sessionListMetadata 投影行仍被用来决定 updatedAt，覆盖日志水位
// Source: src/index.js:342  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { StatsService } from '../../src/index.js';

// 只替换数据源（投影缓存 / 日志解码），不触碰被测模块本身。
const state = vi.hoisted(() => ({ projcache: null, info: null, checkpoint: {}, source: null }));

vi.mock('../../src/host-util.js', async (importOriginal) => {
	const actual = await importOriginal();
	return { ...actual, readSessionProjcache: () => state.projcache };
});

vi.mock('../../src/host-sessions.js', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		officialReadRevision: async () => null,
		officialSessionSource: async () => state.source,
		officialProjectionValues: async () => null,
		projectionCheckpoint: () => state.checkpoint,
		routeProjectionValueFromEntry: () => null,
		sessionInfo: async () => state.info,
	};
});

// 与 src/index.js 第 443-453 行回退对象同形的会话 info。
function baseInfo(overrides = {}) {
	return {
		times: [],
		lastTime: null,
		model: null,
		providerId: 'unknown',
		accountType: 'api',
		usages: [],
		slotStats: [],
		origin: null,
		activityTimes: [],
		parentSession: null,
		seedLength: null,
		inheritedEventCount: 0,
		stats: null,
		partial: false,
		stale: false,
		missing: false,
		unavailable: false,
		lastSeq: -1,
		header: null,
		...overrides,
	};
}

function projcache(sessions) {
	return { ok: true, value: { tables: { sessions } } };
}

let home;
let previousHome;

beforeEach(() => {
	previousHome = process.env.DSH_HOME;
	home = mkdtempSync(join(tmpdir(), 'dsh-stats-n00217-'));
	mkdirSync(join(home, 'storages'), { recursive: true });
	writeFileSync(
		join(home, 'storages', 'workspace.json'),
		JSON.stringify({ tables: { workspaces: {} }, global: { archivedSessionIds: [] } }),
	);
	process.env.DSH_HOME = home;
	state.projcache = projcache({});
	state.info = baseInfo();
	state.checkpoint = {};
	state.source = null;
});

afterEach(() => {
	if (previousHome === undefined) delete process.env.DSH_HOME;
	else process.env.DSH_HOME = previousHome;
	rmSync(home, { recursive: true, force: true });
});

test('[F1] 过期（seq 落后于日志水位）的 sessionListMetadata 行仍决定 updatedAt', async () => {
	state.projcache = projcache({
		s1: {
			identity: { id: 's1', createdAt: 1000, cwd: '/repo/a' },
			rows: { sessionListMetadata: { ver: 1, seq: 3, val: { lastPromptAt: 9_999_999 } } },
		},
	});
	// 校验后没有任何可用行：这一行的 seq(3) 落后于日志水位(5)。
	state.checkpoint = {};
	state.source = null;
	state.info = baseInfo({ lastSeq: 5, lastTime: 2000, times: [2000], stats: { turns: 1 } });

	const result = await StatsService.prototype.aggregate.call({ ctx: {} });
	const session = result.projects.flatMap((project) => project.sessions).find((row) => row.id === 's1');

	expect(session).toBeTruthy();
	expect(session.updatedAt).toBe(2000);
});

// [night-evolver] 这条发现还没修，测试暂不提升;

