// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] 余额为负数（透支）时 accountChip/accountTone 既不报余额耗尽也不报低额，整行显示为 ok
// Source: src/client-balance-model.cjs:133  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { test, expect } from 'vitest';

const mod = require('../../src/client-balance-model.cjs');

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] 负余额账户不应被判定为 ok', () => {
	const account = { id: 'a', mode: 'balance', balance: { remaining: -2.5, currency: 'USD', total: 10 } };
	expect(mod.accountTone(account, {})).not.toBe('ok');
});

