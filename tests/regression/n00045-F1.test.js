// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] overviewTotals 遇到 projects 中的 null/undefined 条目直接抛 TypeError
// Source: src/client-overview-model.cjs:7  Contract: —
// Verified fixed at cc91b835d19f199f7256ed156bd81d99f3f138f2 by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { overviewTotals, costShares, sortProjects } = require('../../src/client-overview-model.cjs');

function stats(overrides = {}) {
	return {
		turns: 1, steps: 1, llmMs: 1000, toolMs: 100,
		inputTokens: 100, outputTokens: 10, cacheRead: 0,
		ttftMs: 100, ttftSteps: 1, decodeMs: 1000, decodeTokens: 50,
		...overrides,
	};
}

function session(amount, subagent = false) {
	return {
		id: 's', subagent,
		cost: { status: amount == null ? 'partial' : 'exact', totals: amount == null ? [] : [{ currency: 'CNY', amount }] },
	};
}

function project(id, name, statsObj, sessions, extra = {}) {
	return { id, name, path: '/' + id, stats: statsObj, sessions, sessionCount: sessions.length, lastActiveAt: 0, ...extra };
}

test('[F1] overviewTotals 应把 null/undefined 项目条目当作空项目而不是抛异常', () => {
	const ok = project('a', 'Alpha', stats({ turns: 2, inputTokens: 100, outputTokens: 10 }), [session(1)]);
	const totals = overviewTotals([null, ok, undefined]);
	expect(totals.projects).toBe(3);
	expect(totals.main).toBe(1);
	expect(totals.subagent).toBe(0);
	expect(totals.turns).toBe(2);
	expect(totals.input).toBe(100);
	expect(totals.output).toBe(10);
});

// [night-evolver] 这条发现还没修，测试暂不提升;

// [night-evolver] 这条发现还没修，测试暂不提升;

