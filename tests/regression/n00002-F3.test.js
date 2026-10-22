// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F3] fmtPct 把未取整的浮点数直接拼进百分比，可能出现 16 位小数
// Source: src/client-format.cjs:36  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('../../src/client-format.cjs');

// [night-evolver] 这条发现还没修，测试暂不提升;

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F3] fmtPct 不应把未取整的浮点数直接拼进百分比', () => {
	expect(mod.fmtPct(33.333333333333336)).toMatch(/^\d+(\.\d)?%$/);
	expect(mod.fmtPct(0.30000000000000004)).toMatch(/^\d+(\.\d)?%$/);
});

