// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 时间线按 UTC 对齐的 30 分钟槽起点归属本地日期，本地午夜落在槽内时跨天时长整段计入前一天
// Source: src/index.js:733  Contract: src/index.js:2（模块头注释承诺“精确 30 分钟时间线”，days[].date + days[].dayTotalMs 表示该本地日内的时长；src/index.js:756 又把 slotMinutes 一并下发，slot 号必须能对应本地时刻）
// Verified fixed by `recheck`; do not delete without checking the finding.

// Adversarial test: local-midnight attribution in the 30-minute timeline.
// The host-util helpers are pinned to a fixed UTC+05:45 zone so the test is
// hermetic and does not depend on the machine timezone.
import { expect, test, vi } from 'vitest';

const h = vi.hoisted(() => {
	const OFFSET = (5 * 60 + 45) * 60 * 1000; // UTC+05:45 (not a multiple of 30 min)
	return {
		OFFSET,
		START: Date.UTC(2026, 0, 15, 18, 5), // 2026-01-15 23:50 local
		END: Date.UTC(2026, 0, 15, 18, 25),   // 2026-01-16 00:10 local
	};
});

vi.mock('../../src/host-util.js', async (importOriginal) => {
	const actual = await importOriginal();
	const shifted = (ms) => new Date(ms + h.OFFSET);
	return {
		...actual,
		SLOT_MINUTES: 30,
		SLOT_MS: 30 * 60 * 1000,
		dshHome: () => '/virtual-dsh-home',
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
		localDayKey: (ms) => shifted(ms).toISOString().slice(0, 10),
		minutesOfDay: (ms) => {
			const d = shifted(ms);
			return d.getUTCHours() * 60 + d.getUTCMinutes();
		},
		activityIntervals: () => [[h.START, h.END]],
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
		sessionInfo: async () => ({
			times: [],
			lastTime: null,
			model: 'deepseek-chat',
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
			lastSeq: -1,
		}),
	};
});

import { StatsService } from '../../src/index.js';

test('[F1] 本地午夜落在 30 分钟槽内部时，跨午夜的活跃时长应计入正确的本地日期', async () => {
	const result = await StatsService.prototype.aggregate.call({ ctx: {} });
	const days = result.timeline.days;
	const day15 = days.find((d) => d.date === '2026-01-15');
	const day16 = days.find((d) => d.date === '2026-01-16');

	// 23:50-24:00 local belongs to 2026-01-15; 00:00-00:10 local belongs to 2026-01-16.
	expect(day15?.dayTotalMs).toBe(10 * 60 * 1000);
	expect(day16?.dayTotalMs).toBe(10 * 60 * 1000);
});

