// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] cwd 与工作区 path 仅差结尾分隔符时不合并，生成两个同名项目
// Source: src/client-data.cjs:426  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { aggregate } = require('../../src/client-data.cjs');

const SLOT_MS = 1800000;
const T = Date.parse('2026-09-08T04:00:00+08:00');

function stats(over = {}) {
	return {
		turns: 1, steps: 1, llmMs: 1000, toolMs: 0,
		ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0,
		uncached: 100, output: 50, cacheRead: 0, cacheWrite: 0, reasoning: 0,
		...over,
	};
}

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] cwd 与工作区路径仅差结尾分隔符时不应生成重复项目', () => {
	const session = { id: 's2', title: 'S2', updatedAt: T, cwd: '/w/a', stats: stats() };
	const projects = aggregate([session], [{ workspaceId: 'w1', path: '/w/a/', sessionIds: [] }], (key) => key);
	expect(projects).toHaveLength(1);
	expect(projects[0].sessions.map((s) => s.id)).toEqual(['s2']);
	expect(projects[0].sessionCount).toBe(1);
});

// [night-evolver] 这条发现还没修，测试暂不提升;

