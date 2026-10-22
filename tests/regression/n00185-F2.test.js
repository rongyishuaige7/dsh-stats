// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] fmtCostSummary 对 totals 中的 null 项直接读取 total.amount，抛 TypeError 而不是降级为占位符
// Source: src/client-format.cjs:101  Contract: —
// Verified fixed at cc91b835d19f199f7256ed156bd81d99f3f138f2 by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('../../src/client-format.cjs');

describe('client-format error paths (round 2)', () => {
	// [night-evolver] 这条发现还没修，测试暂不提升;

	// [night-evolver] 这条发现还没修，测试暂不提升;

	test('[F2] fmtCostSummary 遇到 totals 中的 null 项时抛 TypeError，而不是降级为占位符', () => {
		let out;
		expect(() => { out = mod.fmtCostSummary({ status: 'exact', totals: [null] }); }).not.toThrow();
		expect(typeof out).toBe('string');
	});
});

