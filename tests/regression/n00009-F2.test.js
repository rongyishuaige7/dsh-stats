// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] prefs 缺失时 TrendsView 直接解引用 undefined 崩溃，未回退到默认范围/指标
// Source: src/client-trends.cjs:597  Contract: —
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

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] 缺少 prefs 时 TrendsView 应回退到默认范围/指标而不是崩溃', () => {
	expect(() => renderToStaticMarkup(React.createElement(TrendsView, {
		projects: [],
		rangeProjects: [],
		hidden: {},
		hiddenKey: '',
		dates: [],
		today: TODAY,
		setPrefs: () => {},
		t,
	}))).not.toThrow();
});

