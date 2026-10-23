// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F2] readFrom 失败时 officialProjectionValues 直接返回 null，跳过了用完整事件 restore 的回退阶梯
// Source: src/host-sessions.js:766  Contract: src/host-sessions.js:727-758（同函数内 coldSnapshot 分支失败后继续执行后续 restore 回退；762-778 行两级回退并列）
// Verified fixed by `recheck`; do not delete without checking the finding.

import { expect, test } from 'vitest';
import { officialProjectionValues, officialSessionSource } from '../../src/host-sessions.js';

function ctxWith(services) {
	return { get(name) { return services[name]; } };
}

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] readFrom 失败时应继续用完整事件重建投影，而不是直接放弃', async () => {
	const values = { sessionStats: { turns: 1, steps: 1, llmMs: 10, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 } };
	const restoreCalls = [];
	const projections = {
		restoreFloor: () => 0,
		restore: (...args) => { restoreCalls.push(args); return { snapshot: { values } }; },
	};
	const ctx = ctxWith({
		sessionProjections: projections,
		sessionPersistence: { readFrom: async () => { throw new Error('suffix log unavailable'); } },
	});
	const source = {
		header: { id: 's1' },
		inheritedEventCount: 0,
		events: [{ type: 'session', seq: 0, time: 1000 }],
		source: 'sessionPersistence',
	};
	const warnings = [];

	const result = await officialProjectionValues(ctx, source, { identity: { id: 's1' } }, warnings, 's1', 3);

	// readFrom 只是第一级回退；失败后应落到“用完整事件 restore”的第二级
	expect(result).toBe(values);
	expect(restoreCalls).toHaveLength(1);
});

