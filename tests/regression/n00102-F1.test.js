// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 恰好 4 个活跃日时热力图第 3 档永远不可达，次高值只得到 2 级
// Source: src/client-trends-model.cjs:249  Contract: tests/regression/n00094-F1.test.js:13（同类缺陷「4 级不可达」被当作 bug 修复）；src/client-trends-model.cjs:235（四档比例 4*value/max）与 :256 的 4 级分支承诺 1–4 四档可用
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('../../src/client-trends-model.cjs');

describe('client-trends-model heatLevel 在恰好 4 个活跃日时的档位可达性', () => {
	test('[F1] 恰好 4 个活跃日时第三档 3 也应可达', () => {
		const values = [1, 2, 3, 4];
		const levels = values.map(function (value) {
			return mod.heatLevel(value, values);
		});
		expect(levels).toContain(3);
	});

	test('[F1] 4 个活跃日的次高值应落在第 3 档而不是第 2 档', () => {
		expect(mod.heatLevel(3, [1, 2, 3, 4])).toBe(3);
		expect(mod.heatLevel(30, [10, 20, 30, 40])).toBe(3);
	});
});

