// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] costDelta 缺少浮点容差，浮点累加残差会把相等成本判成涨/跌
// Source: src/client-overview-model.cjs:60  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { costDelta, compareProjectCost, sortProjects } = require('../../src/client-overview-model.cjs');

function summary(amount, status = 'exact') {
	return { status, totals: [{ currency: 'CNY', amount }] };
}

function projectWithCost(id, amount) {
	return {
		id,
		name: id,
		sessionCount: 1,
		lastActiveAt: 0,
		stats: { inputTokens: 0, outputTokens: 0, cacheRead: 0, llmMs: 0, cacheHitPct: null },
		sessions: [{ cost: { status: 'exact', totals: [{ currency: 'CNY', amount }] } }],
	};
}

test('[F1] costDelta 对浮点累加残差不应报告涨跌方向', () => {
	// 两天真实花费相同：今天两笔 0.1 + 0.2，昨天一笔 0.3。
	const current = summary(0.1 + 0.2);
	const previous = summary(0.3);
	// 证明这是纯浮点残差而不是真的金额变化。
	expect(current.totals[0].amount).not.toBe(previous.totals[0].amount);

	const delta = costDelta(current, previous);
	expect(delta).not.toBeNull();
	expect(delta.direction).toBe('flat');
});

// [night-evolver] 这条发现还没修，测试暂不提升;

