// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 单个会话的官方事件派生抛错后 info 仍为 undefined，aggregate 在读取 info.seqGap 时整体崩溃
// Source: src/index.js:402-523  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { afterEach, beforeEach, expect, test, vi } from 'vitest';

// The aggregation path normally reads workspace.json / session_projcache.json
// and the official session services. Both are stubbed here so the test is
// hermetic (no real home directory, no real logs) and deterministic.
vi.mock('../../src/host-util.js', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		dshHome: () => '/nonexistent/dsh-stats-n00026-home',
		readJson: () => ({
			ok: true,
			value: {
				tables: { workspaces: { w1: { title: 'Proj', path: '/proj', sessionIds: ['s1'] } } },
				global: { archivedSessionIds: [] },
			},
		}),
		readSessionProjcache: () => ({
			ok: true,
			value: { tables: { sessions: { s1: { identity: { id: 's1', cwd: '/proj' } } } } },
		}),
	};
});

vi.mock('../../src/host-sessions.js', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		officialReadRevision: async () => null,
		officialSessionSource: async () => ({
			events: [{ type: 'turn' }],
			header: { id: 's1', cwd: '/proj', createdAt: 1_700_000_000_000 },
			source: 'sessionPersistence',
			inheritedEventCount: 0,
		}),
		deriveSessionInfoFromEvents: () => {
			throw new Error('malformed event payload');
		},
	};
});

import { StatsService } from '../../src/index.js';

const previousFetch = globalThis.fetch;
const realDateNow = Date.now;

afterEach(() => {
	Date.now = realDateNow;
	globalThis.fetch = previousFetch;
});

test('[F1] 单个会话的事件派生失败不应让整个 aggregate 崩溃', async () => {
	const service = { ctx: {}, aggregate: StatsService.prototype.aggregate };
	const result = await StatsService.prototype.aggregate.call(service);
	expect(result.meta.degraded).toBe(true);
	expect(result.projects).toHaveLength(1);
});

// [night-evolver] 这条发现还没修，测试暂不提升;

