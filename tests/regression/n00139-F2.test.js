// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] alertFor 未校验余额金额是否可读，remaining 为 null 的余额账户仍会拿到提醒
// Source: src/client-balance-model.cjs:84  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import mod from '../../src/client-balance-model.cjs';

// 纯视图模型：输入全部手工构造，不读时钟、不读存储，结果确定。
function balanceAccount(overrides = {}) {
	return {
		id: 'deepseek-official',
		mode: 'balance',
		status: 'ok',
		stale: false,
		balance: { currency: 'CNY', remaining: 10, unlimited: false },
		...overrides,
	};
}

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] alertFor 不给 remaining 不可读的余额账户返回提醒', () => {
	const alerts = { 'deepseek-official': { amount: 20, currency: 'CNY' } };
	const unreadable = balanceAccount({ balance: { currency: 'CNY', remaining: null, unlimited: false } });
	expect(mod.alertFor(unreadable, alerts)).toBeNull();
});

// [night-evolver] 这条发现还没修，测试暂不提升;

