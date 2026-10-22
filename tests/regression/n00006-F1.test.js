// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] adaptLegacyBalance 用 || 回退时间戳，fetchedAt 为 0（Unix epoch）时被 generatedAt 覆盖
// Source: src/client-remote.cjs:19  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { test, expect } from 'vitest';

const { readAccountRemote } = require('../../src/client-remote.cjs');

const TOP_UP = 'https://platform.deepseek.com/top_up';

function legacyBalance(fetchedAt) {
	return {
		generatedAt: 5000,
		accounts: [{
			provider: 'deepseek',
			name: 'DeepSeek',
			status: 'ok',
			currency: 'CNY',
			total: 12.3,
			toppedUp: null,
			granted: null,
			fetchedAt,
			topUpUrl: TOP_UP,
			errorCode: null,
		}],
		warnings: [],
	};
}

test('[F1] a fetchedAt of 0 (Unix epoch) is preserved instead of being replaced by generatedAt', async () => {
	// No stats.account method -> readAccountRemote adapts the legacy balance result.
	const stats = { current: async () => ({ ok: true, value: legacyBalance(0) }) };
	const result = await readAccountRemote(stats);
	// 0 is a valid timestamp; only null/undefined should fall back to generatedAt.
	expect(result.accounts[0].fetchedAt).toBe(0);
	// lastSuccessAt already keeps 0, so fetchedAt must agree rather than jump to generatedAt (5000).
	expect(result.accounts[0].lastSuccessAt).toBe(0);
});

