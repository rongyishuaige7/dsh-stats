// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] sortProjects 的 cost/sessions/tokens/hit/llm/last 排序遇到 null 项目抛 TypeError，而 name 排序容错
// Source: src/client-overview-model.cjs:129  Contract: —
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

test('[F2] sortProjects 对 null 项目条目在 sessions/cost 键下应按 0 值处理，而不是只对 name 键容错', () => {
	const b = project('b', 'Beta', stats({ llmMs: 10 }), [session(2), session(3)]);
	// 'name' 键目前可以容忍 null 条目（nameOf 有 project && 保护），证明容错是预期行为
	expect(() => sortProjects([null, b], 'name', 1)).not.toThrow();
	const bySessions = sortProjects([null, b], 'sessions', -1);
	expect(bySessions).toHaveLength(2);
	expect(bySessions[0]).toBe(b);
	expect(() => sortProjects([null, b], 'cost', -1)).not.toThrow();
});

// [night-evolver] 这条发现还没修，测试暂不提升;

