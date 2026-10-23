// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] missingModels 只读取宿主预算的 usage.cost，缺少 cost 的 slotUsage 被整条忽略，未计价模型永远不出现在缺失模型/待关注列表
// Source: src/client-overview-model.cjs:152  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { missingModels, pendingFocus } = require('../../src/client-overview-model.cjs');

function projectWithSession(session) {
	return {
		id: 'a', name: 'Alpha', path: '/a',
		stats: { turns: 1, steps: 1, inputTokens: 1000, outputTokens: 100, cacheRead: 0 },
		sessions: [session], sessionCount: 1, lastActiveAt: 0,
	};
}

test('[F1] missingModels 对缺少宿主 cost 的 slotUsage 应走计价内核现算未计价 token，而不是整条忽略', () => {
	// 真实数据里 slotUsage 常常只有原始 token（见 client-format 的 usageCostDetail 回退、
	// sessionExportUsages 以及 timeline-model 测试里的 usageOn 构造），没有预算好的 usage.cost。
	// 这些 usage 会被计价内核判为未计价，但 missingModels 只读 usage.cost，于是永远不上报。
	const usage = {
		slot: 12345,
		model: 'unpriced-model-xyz',
		providerId: 'provider-xyz',
		serviceTier: 'standard',
		contextTokens: null,
		uncached: 1000, output: 100, cacheRead: 0, cacheWrite: 0, reasoning: 0,
	};
	const session = {
		id: 's1', subagent: false, providerId: 'provider-xyz', modelRaw: 'unpriced-model-xyz',
		slotUsage: [usage],
	};
	const project = projectWithSession(session);

	const rows = missingModels([project]);
	expect(rows).toHaveLength(1);
	expect(rows[0].model).toBe('unpriced-model-xyz');
	expect(rows[0].provider).toBe('provider-xyz');
	expect(rows[0].tokens).toBeGreaterThan(0);

	expect(pendingFocus([project])).not.toBeNull();
});

