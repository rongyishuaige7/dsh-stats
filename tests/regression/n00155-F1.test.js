// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 跨日会话的粗粒度 token/时长在两个日期窗口里都被丢弃
// Source: src/client-data.cjs:34  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('../../src/client-data.cjs');

const SLOT_MS = 1800000;
const DAY1 = '2026-09-07';
const DAY2 = '2026-09-08';

function stats(over = {}) {
	return {
		turns: 2, steps: 2, llmMs: 1000, toolMs: 0,
		ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0,
		uncached: 1000, output: 100, cacheRead: 0, cacheWrite: 0, reasoning: 0,
		...over,
	};
}

function slotOn(dateKey, offset) {
	return mod.dayStartMs(dateKey) / SLOT_MS + offset;
}

function projectWith(sessions) {
	return {
		id: 'p', name: 'P', path: '/p', sessionCount: sessions.length,
		subagentCount: 0, lastActiveAt: null, stats: {}, sessions,
	};
}

function tokensOf(projects) {
	return projects.reduce((sum, p) => sum + (p.stats.inputTokens || 0) + (p.stats.outputTokens || 0), 0);
}

test('[F1] 跨日会话的粗粒度 token 在活动日窗口与时间戳窗口都被丢弃', () => {
	const session = {
		id: 's1',
		title: 'cross-midnight',
		// updatedAt 落在次日 01:00（北京时间），最后一个活动槽仍在前一天
		updatedAt: mod.dayStartMs(DAY2) + 3600000,
		slots: [{ slot: slotOn(DAY1, 4), ms: SLOT_MS }],
		// 无 slotUsage / slotStats：客户端近似，token 只有会话级
		stats: stats(),
	};
	const project = projectWith([session]);

	const day1 = mod.applyDate([project], DAY1);
	const day2 = mod.applyDate([project], DAY2);

	// 活动槽在前一天 → 前一天窗口保留会话；时间戳在当天 → 当天窗口也应保留会话
	expect(day1.length).toBe(1);
	expect(day2.length).toBe(1);
	// 粗粒度 token 只允许归到时间戳窗口一次，两天合计必须等于会话总量
	expect(tokensOf(day1) + tokensOf(day2)).toBe(1100);
});

// [night-evolver] 这条发现还没修，测试暂不提升;

// [night-evolver] 这条发现还没修，测试暂不提升;

// [night-evolver] 这条发现还没修，测试暂不提升;

