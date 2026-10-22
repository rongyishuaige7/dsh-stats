// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F3] balanceTotals 在统计 staleCount 之前就因 balance 缺失提前 return，过期但没有余额快照的账户不计入 staleCount
// Source: src/client-balance-model.cjs:250  Contract: —
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

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F3] balanceTotals 把没有余额快照的过期账户计入 staleCount', () => {
	const totals = mod.balanceTotals([balanceAccount({ stale: true, balance: null })]);
	expect(totals.staleCount).toBe(1);
});

