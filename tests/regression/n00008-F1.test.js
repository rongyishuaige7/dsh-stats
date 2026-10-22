// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] updateRoute 命中行缓存后就地替换行，若 update 改动了排序字段（slot/contextTokens 等），缓存行数组不再有序，routeRows 返回乱序结果且后续二分插入位置错误
// Source: src/route-data.cjs:47  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { updateRoute, routeRows } = require('../../src/route-data.cjs');

function row(slot, providerId) {
	return {
		slot,
		providerId,
		model: 'm',
		accountType: 'api',
		serviceTier: 'standard',
		contextTokens: 0,
		uncached: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
	};
}

describe('route-data row cache ordering', () => {
	test('[F1] 更新改变 slot 后 routeRows 仍应按 compareRoutes 升序返回行', () => {
		let tree = updateRoute({}, 'alpha', () => row(1, 'a'));
		tree = updateRoute(tree, 'beta', () => row(2, 'b'));

		// 先读一次，让 routeRows 建立行缓存
		expect(routeRows({ routeTree: tree }).map((r) => r.slot)).toEqual([1, 2]);

		// 更新 alpha 的 slot：新行仍属于同一个 key，但排序位置应在 beta 之后
		tree = updateRoute(tree, 'alpha', () => row(10, 'a'));

		expect(routeRows({ routeTree: tree }).map((r) => r.slot)).toEqual([2, 10]);
	});

	test('[F1] 缓存乱序后，新增行的二分插入位置错误', () => {
		let tree = updateRoute({}, 'alpha', () => row(1, 'a'));
		tree = updateRoute(tree, 'beta', () => row(2, 'b'));

		// 建立缓存
		routeRows({ routeTree: tree });

		// 破坏缓存顺序：alpha 的 slot 变成 10
		tree = updateRoute(tree, 'alpha', () => row(10, 'a'));

		// 新增 slot 为 5 的行，正确顺序应为 2, 5, 10
		tree = updateRoute(tree, 'gamma', () => row(5, 'c'));

		expect(routeRows({ routeTree: tree }).map((r) => r.slot)).toEqual([2, 5, 10]);
	});
});

