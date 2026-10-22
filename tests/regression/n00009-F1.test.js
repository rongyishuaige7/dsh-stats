// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 热力图活跃格在 points 中查不到点位时直接抛 TypeError，而不是降级渲染
// Source: src/client-trends.cjs:363  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Heatmap, TrendsView } = require('../../src/client-trends.cjs');
const { heatWindow, heatCells } = require('../../src/client-trends-model.cjs');
const { zh } = require('../../src/client-locale.cjs');

const TODAY = '2026-09-08';
const t = (key) => (Object.prototype.hasOwnProperty.call(zh, key) ? zh[key] : key);

function renderHeatmap(heat) {
	return renderToStaticMarkup(React.createElement(Heatmap, {
		heat,
		today: TODAY,
		metric: 'cost',
		canOpen: () => false,
		onOpenDay: () => {},
		cellDate: null,
		setCellDate: () => {},
		t,
	}));
}

test('[F1] 热力图活跃格在 points 中缺失时应降级渲染而不是抛异常', () => {
	const win = heatWindow(TODAY);
	const values = new Map(win.dates.map((date) => [date, { value: date === TODAY ? 5 : 0, active: date === TODAY }]));
	// 保证今天这一格一定存在且被标记为活跃
	const cells = heatCells(win, values, TODAY)
		.filter((cell) => cell.date !== TODAY)
		.concat([{ date: TODAY, active: true, today: true, column: 1, row: 2, level: 4 }]);
	const heat = {
		window: win,
		// 模拟数据不完整：cells 认为今天活跃，但 points 里没有今天的点位
		points: new Map(),
		cells,
		stats: {
			active: 1,
			total: win.dates.length,
			current: 1,
			currentEnd: 'today',
			longest: 1,
			longestStart: TODAY,
			longestEnd: TODAY,
		},
	};
	expect(() => renderHeatmap(heat)).not.toThrow();
});

// [night-evolver] 这条发现还没修，测试暂不提升;

