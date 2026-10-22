// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] range 视图单元格的 dominant 与 by 的键被 Object.keys 转成字符串，与 projects[].projectId 的数字类型不一致
// Source: src/client-timeline-model.cjs:642  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { describe, test, expect } from 'vitest';
import mod from '../../src/client-timeline-model.cjs';

describe('client-timeline-model boundaries', () => {
	// [night-evolver] 这条发现还没修，测试暂不提升;

	test('[F2] 单元格 dominant 是字符串，与数字 projectId 不一致', () => {
		const model = mod.timelineRangeModel({
			days: [{ date: '2024-01-01', slotBlocks: [{ projectId: 7, slot: 0, ms: 600000, name: 'alpha' }] }],
			today: '2024-01-01'
		});
		const row = model.rows[0];
		expect(row.projects[0].projectId).toBe(7);
		expect(row.cells[0].dominant).toBe(7);
	});
});

