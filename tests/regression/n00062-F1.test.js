// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] activeDayCount 用普通对象按 projectId 查隐藏标记，与 Object.prototype 属性同名的项目被误判为隐藏，活跃天数少算
// Source: src/client-overview-model.cjs:91  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('../../src/client-overview-model.cjs');

function exactSession(amount) {
	return { subagent: false, cost: { status: 'exact', totals: [{ currency: 'CNY', amount }] } };
}

function makeProject(id, sessions, extra = {}) {
	return {
		id,
		name: id,
		path: '/' + id,
		stats: {},
		sessions,
		sessionCount: sessions.length,
		lastActiveAt: 0,
		...extra,
	};
}

test('[F1] activeDayCount 不应把与 Object.prototype 属性同名的项目 id 当作隐藏项目', () => {
	const timeline = {
		days: [
			{ date: '2026-09-01', slotBlocks: [{ slot: 1, projectId: 'constructor' }] },
			{ date: '2026-09-02', slotBlocks: [{ slot: 2, projectId: 'toString' }] },
			{ date: '2026-09-03', slotBlocks: [{ slot: 3, projectId: 'normal' }] },
		],
	};
	// 没有传 hidden：所有块都可见，三天都应计入。
	expect(mod.activeDayCount(timeline)).toBe(3);
	// 只隐藏 normal：constructor / toString 两天仍应计入。
	expect(mod.activeDayCount(timeline, { normal: true })).toBe(2);
});

// [night-evolver] 这条发现还没修，测试暂不提升;

