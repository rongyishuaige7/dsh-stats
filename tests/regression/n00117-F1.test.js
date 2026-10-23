// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] compareRoutes 在行缺少 slot 或 contextTokens 时返回 NaN，破坏排序并使 updateRoute 的二分插入把行插到错误位置
// Source: src/route-data.cjs:18  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { test, expect } from 'vitest';
import routeData from '../../src/route-data.cjs';

const { updateRoute, routeRows } = routeData;

// F1: compareRoutes 在 contextTokens / slot 缺失时返回 NaN，不是合法的比较器结果，
// 既破坏 sort 的顺序，也让 updateRoute 的二分插入（line 54 的 `<= 0`）把新行放到错误位置。

test('[F1] 行缺少 contextTokens 时 compareRoutes 返回 NaN，updateRoute 把新行插到了 0 号位', () => {
	const tree = updateRoute(undefined, 'route-a', () => ({ providerId: 'p', model: 'm', slot: 0 }));
	routeRows({ routeTree: tree }); // 让行缓存生效，走 updateRoute 的二分插入分支
	const next = updateRoute(tree, 'route-b', () => ({ providerId: 'p', model: 'm', slot: 0, contextTokens: 5 }));
	const rows = routeRows({ routeTree: next });
	// 缺失的 contextTokens 按 0 处理，应排在 contextTokens=5 的行之前
	expect(rows.map((row) => row.contextTokens)).toEqual([undefined, 5]);
});

test('[F1] 行缺少 slot 时 compareRoutes 返回 NaN，新行被插到了缺少 slot 的行前面', () => {
	const tree = updateRoute(undefined, 'route-a', () => ({ providerId: 'p', model: 'm' }));
	routeRows({ routeTree: tree });
	const next = updateRoute(tree, 'route-b', () => ({ providerId: 'p', model: 'm', slot: 1 }));
	const rows = routeRows({ routeTree: next });
	// 缺失的 slot 按 0 处理，应排在 slot=1 的行之前
	expect(rows.map((row) => row.slot)).toEqual([undefined, 1]);
});

