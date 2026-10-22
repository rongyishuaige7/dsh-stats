// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F3] costShares 遇到 null 项目条目抛 TypeError，而不是按未计价返回 null 份额
// Source: src/client-overview-model.cjs:66  Contract: —
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

// [night-evolver] 这条发现还没修，测试暂不提升;

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F3] costShares 遇到 null 项目条目应视为未计价跳过，而不是抛 TypeError', () => {
	const b = project('b', 'Beta', stats(), [session(3)]);
	const shares = costShares([null, b]);
	expect(shares.get('b')).toBe(1);
	expect([...shares.values()].every(value => value == null || Number.isFinite(value))).toBe(true);
});

