// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] balanceTotals 把外部币种字符串直接当累加器键，__proto__ 币种使合计变成 NaN
// Source: src/client-balance-model.cjs:258  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('../../src/client-balance-model.cjs');

test('[F1] balanceTotals 把外部币种字符串直接当累加键，__proto__ 币种合计变成 NaN', () => {
	const result = mod.balanceTotals([
		{ mode: 'balance', balance: { currency: '__proto__', remaining: 1, unlimited: false } },
		{ mode: 'balance', balance: { currency: 'USD', remaining: 2, unlimited: false } },
	]);
	expect(result.lead).toEqual({ currency: '__proto__', amount: 1 });
	expect(result.others).toEqual([{ currency: 'USD', amount: 2 }]);
});

// [night-evolver] 这条发现还没修，测试暂不提升;

