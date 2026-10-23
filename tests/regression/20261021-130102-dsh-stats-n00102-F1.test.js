// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] niceMax 对带浮点尾巴的峰值仍会跳到下一档刻度
// Source: src/client-trends-model.cjs:167  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { describe, test, expect } from 'vitest';
import mod from '../../src/client-trends-model.cjs';

const { niceMax } = mod;

describe('niceMax 对浮点尾巴峰值的处理', () => {
	test('[F1] 0.1+0.2 这类求和峰值不应把纵轴顶到 0.4', () => {
		const peak = 0.1 + 0.2; // 0.30000000000000004
		expect(peak > 0.3).toBe(true);
		// 同一档位的干净值取 0.3
		expect(niceMax(0.3)).toBe(0.3);
		// 带浮点尾巴的峰值应与干净值落在同一档
		expect(niceMax(peak)).toBe(0.3);
	});

	test('[F1] 0.4+0.2 这类求和峰值不应把纵轴顶到 0.8', () => {
		const peak = 0.4 + 0.2; // 0.6000000000000001
		expect(peak > 0.6).toBe(true);
		expect(niceMax(0.6)).toBe(0.6);
		expect(niceMax(peak)).toBe(0.6);
	});
});

