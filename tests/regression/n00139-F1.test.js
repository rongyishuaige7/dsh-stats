// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] accountChip 用未加保护的 STATUS_CHIPS[status] 查表，状态名撞上 Object.prototype 时返回 tone/key 皆为 undefined 的伪标签
// Source: src/client-balance-model.cjs:120  Contract: —
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

test('[F1] accountChip 只认 STATUS_CHIPS 自有条目，原型链同名属性不能冒充状态标签', () => {
	const account = balanceAccount({ status: 'constructor' });
	expect(mod.accountChip(account, {})).toBeNull();
	expect(mod.accountTone(account, {})).toBe('ok');
});

// [night-evolver] 这条发现还没修，测试暂不提升;

// [night-evolver] 这条发现还没修，测试暂不提升;

