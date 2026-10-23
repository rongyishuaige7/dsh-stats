// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F2] missingModels 会话级模型回退未优先 modelRaw，行内模型与计价身份使用的模型不一致
// Source: src/client-overview-model.cjs:156  Contract: src/client-format.cjs:sessionCostSummary（fallbackModel = s.modelRaw || s.model）；src/client-format.cjs:sessionExportUsages（model = session.modelRaw || session.model）
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { missingModels } = require('../../src/client-overview-model.cjs');

function stats(overrides = {}) {
	return {
		turns: 1, steps: 1, llmMs: 1000, toolMs: 100,
		inputTokens: 100, outputTokens: 10, cacheRead: 0,
		ttftMs: 100, ttftSteps: 1, decodeMs: 1000, decodeTokens: 50,
		...overrides,
	};
}

function project(id, name, statsObj, sessions, extra = {}) {
	return {
		id, name, path: '/' + id, stats: statsObj, sessions,
		sessionCount: sessions.length, lastActiveAt: 0, ...extra,
	};
}

function unpricedUsage(tokens, extra = {}) {
	return { ...extra, cost: { status: 'exact', unpricedTokens: tokens } };
}

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] missingModels 会话级模型回退未优先 modelRaw，行内模型与计价身份使用的模型不一致', () => {
	const alpha = project('a', 'Alpha', stats(), [
		{
			id: 'sa',
			modelRaw: 'deepseek-chat-raw',
			model: 'DeepSeek Chat',
			slotUsage: [unpricedUsage(5, { providerId: 'p1' })],
		},
	]);

	const rows = missingModels([alpha]);

	// 计价路径用 session.modelRaw || session.model 作为会话级模型，缺失模型行应报告同一个模型。
	expect(rows.map((row) => [row.provider, row.model, row.tokens])).toEqual([
		['p1', 'deepseek-chat-raw', 5],
	]);
});

