// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 纯空白字符串余额被 Number('') 解析为 0，无效响应被当作 0 余额接受
// Source: src/host-balance.js:41  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { describe, expect, test } from 'vitest';
import { normalizeBalanceInfo, unavailableBalancePayload } from '../../src/host-balance.js';

function capture(fn) {
	try {
		return { value: fn(), error: undefined };
	} catch (error) {
		return { value: undefined, error };
	}
}

describe('host-balance 边界行为', () => {
	test('[F1] 纯空白的 total_balance 不应被当作合法的 0 余额', () => {
		const { value, error } = capture(() => normalizeBalanceInfo({ currency: 'CNY', total_balance: '   ' }));
		expect(value).toBeUndefined();
		expect(error?.code).toBe('invalid-response');
	});

	test('[F1] 纯空白的 topped_up_balance/granted_balance 不应被当作 0', () => {
		const { value, error } = capture(() => normalizeBalanceInfo({
			currency: 'CNY',
			total_balance: 10,
			topped_up_balance: '  ',
			granted_balance: '\t\n'
		}));
		expect(value).toBeUndefined();
		expect(error?.code).toBe('invalid-response');
	});

	// [night-evolver] 这条发现还没修，测试暂不提升;
});

