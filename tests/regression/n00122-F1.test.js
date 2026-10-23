// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 热力图“最长连续”跨年区间被截掉年份，显示成“12-28 至 01-05”的倒序错觉
// Source: src/client-trends.cjs:425  Contract: src/client-trends.cjs:36-37（同类函数 rangeText：起止年份与今天不同时保留完整日期，跨年区间不应只显示 MM-DD）
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const mod = require('../../src/client-trends.cjs');
const { heatWindow } = require('../../src/client-trends-model.cjs');
const { zh } = require('../../src/client-locale.cjs');

const t = (key) => (Object.prototype.hasOwnProperty.call(zh, key) ? zh[key] : key);
// 该日期的 26 周窗口从 2025-08-18 开始，覆盖 2025-12-28 ~ 2026-01-05 这段跨年区间。
const TODAY = '2026-02-10';

test('[F1] 最长连续天数跨年时应保留年份，而不是渲染成“12-28 至 01-05”', () => {
	const win = heatWindow(TODAY);
	const heat = {
		window: win,
		points: new Map(),
		cells: [],
		stats: {
			active: 9,
			total: win.dates.length,
			current: 0,
			currentEnd: null,
			longest: 9,
			longestStart: '2025-12-28',
			longestEnd: '2026-01-05',
		},
	};
	const html = renderToStaticMarkup(React.createElement(mod.Heatmap, {
		heat,
		today: TODAY,
		metric: 'cost',
		canOpen: () => false,
		onOpenDay: () => {},
		cellDate: null,
		setCellDate: () => {},
		t,
	}));
	// 与 rangeText（src/client-trends.cjs:36-37）的跨年处理保持一致：年份不同时要展示完整日期。
	expect(html).toContain('2025-12-28');
	expect(html).toContain('2026-01-05');
});

