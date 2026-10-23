// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F3] accountMeta 未 trim displayName，导致子行重复账户名
// Source: src/client-balance-model.cjs:160-162  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('../../src/client-balance-model.cjs');

const { accountMeta, balanceTotals, skeletonModel } = mod;

function balanceAccount(id, balance) {
	return {
		id,
		displayName: id,
		providerFamily: 'deepseek',
		mode: 'balance',
		adapter: 'deepseek-balance',
		status: 'ok',
		stale: false,
		balance: {
			currency: 'CNY',
			remaining: null,
			used: null,
			total: null,
			toppedUp: null,
			granted: null,
			unlimited: false,
			...balance,
		},
	};
}

// [night-evolver] 这条发现还没修，测试暂不提升;

// [night-evolver] 这条发现还没修，测试暂不提升;

// [night-evolver] 这条发现还没修，测试暂不提升;

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F3] accountMeta does not repeat the account name when displayName only differs by surrounding whitespace', () => {
	const meta = accountMeta({
		id: 'deepseek-official',
		displayName: ' DeepSeek ',
		mode: 'balance',
		plan: 'DeepSeek',
	});
	expect(meta).toEqual({ type: 'balance', detail: { kind: 'id', value: 'deepseek-official' } });
});

test('[F3] accountMeta still prefers a genuinely different plan over the id', () => {
	const meta = accountMeta({
		id: 'kimi-coding',
		displayName: 'Kimi',
		mode: 'subscription',
		plan: '  Pro Plan  ',
	});
	expect(meta).toEqual({ type: 'subscription', detail: { kind: 'plan', value: 'Pro Plan' } });
});

