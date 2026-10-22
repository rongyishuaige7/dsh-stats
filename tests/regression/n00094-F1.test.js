// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] heatLevel 在恰好 4 个活跃日时最高值只能到 3 级，4 级不可达
// Source: src/client-trends-model.cjs:247  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('../../src/client-trends-model.cjs');

const { heatLevel, heatCells, fmtAxisCost } = mod;

test('[F1] heatLevel 在恰好 4 个活跃日时最高值应判为 4 级（与 3 个 / 5 个活跃日一致）', () => {
	// 3 个活跃日：最大值走 ratioLevel，得到 4 级
	expect(heatLevel(3, [1, 2, 3])).toBe(4);
	// 5 个活跃日：最大值得到 4 级
	expect(heatLevel(5, [1, 2, 3, 4, 5])).toBe(4);
	// 4 个活跃日：最大值应当同样是 4 级（当前只得到 3 级）
	expect(heatLevel(4, [1, 2, 3, 4])).toBe(4);
	expect(heatLevel(100, [10, 20, 30, 100])).toBe(4);
});

test('[F1] heatCells 中 4 个活跃日的最高值格子应是最深一级', () => {
	const dates = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'];
	const values = {
		'2026-09-07': { active: true, value: 1 },
		'2026-09-08': { active: true, value: 2 },
		'2026-09-09': { active: true, value: 3 },
		'2026-09-10': { active: true, value: 4 },
	};
	const cells = heatCells({ start: '2026-09-07', dates }, values, '2026-09-13');
	const top = cells.find((cell) => cell.date === '2026-09-10');
	expect(top.level).toBe(4);
});

// [night-evolver] 这条发现还没修，测试暂不提升;

