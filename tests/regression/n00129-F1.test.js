// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] topped_up_balance/granted_balance 为空字符串时被误判为 invalid-response，与 parseBalanceAmount 的缺失语义矛盾
// Source: src/host-balance.js:51  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { expect, test } from 'vitest';
import { normalizeBalanceInfo } from '../../src/host-balance.js';

test('[F1] topped_up_balance/granted_balance 为空字符串时应视为缺失，而不是抛出 invalid-response', () => {
	const info = { currency: 'CNY', total_balance: '12.34', topped_up_balance: '', granted_balance: '' };
	// parseBalanceAmount 明确把空字符串当作缺失（第 40 行返回 null），
	// 因此 normalizeBalanceInfo 不应因此抛出 invalid-response。
	const normalized = normalizeBalanceInfo(info);
	expect(normalized.total).toBe(12.34);
	expect(normalized.toppedUp).toBeNull();
	expect(normalized.granted).toBeNull();
});

