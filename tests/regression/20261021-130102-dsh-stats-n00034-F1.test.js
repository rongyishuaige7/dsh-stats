// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 单次出现的缓存类告警会把内部 count 字段泄漏进 RPC 载荷（多次出现时反而被删除）
// Source: src/index.js:51  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

// 只替换会访问磁盘/宿主服务的依赖，其余导出保持真实实现，
// 以便精确控制 aggregate 的输入（单条 SESSION_CACHE_STALE 缓存告警）。
vi.mock('../../src/host-sessions.js', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		contextService: (ctx, name) => ctx?.reflect?.get?.(name) ?? ctx?.[name],
		officialReadRevision: async () => null,
		officialProjectionValues: async () => null,
		officialSessionSource: async () => null,
		// 单条 versioned 行，seq(2) 落后于日志水位(3) => 只产生一条 SESSION_CACHE_STALE
		projectionCheckpoint: () => ({ sessionStats: { seq: 2, val: { turns: 1 } } }),
		sessionInfo: async () => ({
			times: [],
			lastTime: 2000,
			model: 'deepseek-v4',
			providerId: 'deepseek',
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
			lastSeq: 3
		})
	};
});

import { StatsService } from '../../src/index.js';

const previousHome = process.env.DSH_HOME;
let home;

beforeEach(() => {
	home = mkdtempSync(join(tmpdir(), 'dsh-stats-count-'));
	process.env.DSH_HOME = home;
});

afterEach(() => {
	if (previousHome === undefined) delete process.env.DSH_HOME;
	else process.env.DSH_HOME = previousHome;
	rmSync(home, { recursive: true, force: true });
});

test('[F1] 单次出现的缓存类告警不应把内部 count 字段泄漏到 RPC 载荷', async () => {
	const services = {
		workspaceRegistry: {
			list: () => [{ id: 'w1', title: 'W', path: '/proj', sessionIds: ['s1'] }],
			archivedSessionIds: []
		},
		sessionQuery: {
			listSessions: async () => [{ header: { id: 's1', createdAt: 1000, cwd: '/proj' } }]
		},
		sessionProjectionCache: { coldSnapshot: () => null }
	};
	const service = {
		ctx: { reflect: { get: (name) => services[name] } }
	};

	const result = await StatsService.prototype.aggregate.call(service);
	const stale = result.meta.warnings.filter((warning) => warning.code === 'SESSION_CACHE_STALE');

	expect(stale).toHaveLength(1);
	expect(stale[0]).not.toHaveProperty('count');
});

