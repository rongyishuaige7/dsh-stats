// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] missingModels 未回退会话级 model，缺失 model 的 usage 被跨模型合并成一行且 model 为 undefined
// Source: src/client-overview-model.cjs:153  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sortProjects, missingModels } = require('../../src/client-overview-model.cjs');

function project(id, name, stats, sessions = []) {
	return { id, name, path: '/' + id, stats, sessions, sessionCount: sessions.length, lastActiveAt: 0 };
}

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] missingModels 未回退会话级 model，缺失 model 的 usage 被跨模型合并成一行', () => {
	const projects = [
		project('a', 'Alpha', {}, [
			{ model: 'gpt-alpha', slotUsage: [{ providerId: 'p1', cost: { status: 'exact', unpricedTokens: 5 } }] },
		]),
		project('b', 'Beta', {}, [
			{ model: 'gpt-beta', slotUsage: [{ providerId: 'p1', cost: { status: 'exact', unpricedTokens: 7 } }] },
		]),
	];
	const rows = missingModels(projects);
	expect(rows.map(row => [row.model, row.tokens])).toEqual([['gpt-beta', 7], ['gpt-alpha', 5]]);
});

