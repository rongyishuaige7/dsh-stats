// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] missingModels 的会话级模型回退漏掉 session.modelRaw，仅有 modelRaw 的不同模型被合并成一行且 model 为 undefined
// Source: src/client-overview-model.cjs:156  Contract: src/client-format.cjs（sessionExportUsages: `model: session?.modelRaw || session?.model || "(unknown)"`；sessionCostSummary 传 `s.modelRaw || s.model` 作为回退模型）——同一份会话数据在别处都以 modelRaw 优先、model 兜底
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { missingModels, compareProjectCost } = require('../../src/client-overview-model.cjs');

function stats(overrides = {}) {
	return {
		turns: 1, steps: 1, llmMs: 1000, toolMs: 100,
		inputTokens: 100, outputTokens: 10, cacheRead: 0,
		ttftMs: 100, ttftSteps: 1, decodeMs: 1000, decodeTokens: 50,
		...overrides,
	};
}

function session(amount, extra = {}) {
	return {
		id: 's', subagent: false,
		cost: { status: amount == null ? 'partial' : 'exact', totals: amount == null ? [] : [{ currency: 'CNY', amount }] },
		...extra,
	};
}

function project(id, name, statsObj, sessions = []) {
	return { id, name, path: '/' + id, stats: statsObj, sessions, sessionCount: sessions.length, lastActiveAt: 0 };
}

test('[F1] missingModels 会话级模型回退应同时考虑 session.modelRaw，否则仅有 modelRaw 的不同模型被合并成 model=undefined 的一行', () => {
	const projects = [
		project('a', 'Alpha', stats(), [
			{ modelRaw: 'gpt-alpha', slotUsage: [{ providerId: 'p1', cost: { status: 'exact', unpricedTokens: 5 } }] },
		]),
		project('b', 'Beta', stats(), [
			{ modelRaw: 'gpt-beta', slotUsage: [{ providerId: 'p1', cost: { status: 'exact', unpricedTokens: 7 } }] },
		]),
	];
	const rows = missingModels(projects);
	expect(rows.map(row => [row.model, row.tokens])).toEqual([['gpt-beta', 7], ['gpt-alpha', 5]]);
});

// [night-evolver] 这条发现还没修，测试暂不提升;

