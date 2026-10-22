// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 窗口跨度不能被刻度步长整除时，最后一个刻度落在 end 之前，时间轴右边缘没有刻度/没有 edge="last"
// Source: src/client-timeline-model.cjs:134  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { describe, test, expect } from 'vitest';
import mod from '../../src/client-timeline-model.cjs';

describe('client-timeline-model boundaries', () => {
	test('[F1] 跨度不能被步长整除时最后一个刻度缺失', () => {
		const win = mod.timelineWindow(17, 29, 'focus');
		expect(win).toEqual({ start: 16, end: 30 });
		const ticks = mod.timelineTicks(win);
		expect(ticks[ticks.length - 1].slot).toBe(win.end);
		expect(ticks.some((tick) => tick.edge === 'last')).toBe(true);
	});

	// [night-evolver] 这条发现还没修，测试暂不提升;
});

