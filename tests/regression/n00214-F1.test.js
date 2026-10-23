// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 成本柱图未渲染日均线时，图例仍显示“日均”虚线图例项，图例与图不一致
// Source: src/client-trends.cjs:283  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { test, expect } from 'vitest';
import react from 'react';
import reactDomServer from 'react-dom/server';
import trends from '../../src/client-trends.cjs';

const h = react.createElement;
const renderToHtml = function(Component, props) {
	return reactDomServer.renderToStaticMarkup(h(Component, props));
};

const WEEKDAYS = '周日,周一,周二,周三,周四,周五,周六';
const MONTHS = '1,2,3,4,5,6,7,8,9,10,11,12';

function t(key) {
	if (key === 'w.weekdays') return WEEKDAYS;
	if (key === 'tr.months') return MONTHS;
	return key;
}

function costSummary(amount) {
	return {
		currency: 'CNY',
		amount: amount,
		status: 'exact',
		unpricedTokens: 0,
		totals: [{ currency: 'CNY', amount: amount, exactAmount: amount, estimatedAmount: 0 }]
	};
}

test('[F1] 成本柱图未渲染日均线时，图例仍显示“日均”图例项（图例与图不一致）', () => {
	const dates = ['2024-03-01', '2024-03-02', '2024-03-03', '2024-03-04', '2024-03-05', '2024-03-06', '2024-03-07'];
	const points = dates.map(function(date) {
		if (date === '2024-03-07') {
			return {
				date: date,
				active: true,
				cost: costSummary(1.5),
				tokens: 1000,
				input: 800,
				cacheRead: 400,
				uncached: 400,
				output: 200,
				reasoning: 0,
				partial: false
			};
		}
		return { date: date, active: false };
	});
	const html = renderToHtml(trends.DailyChart, {
		points: points,
		totals: {
			activeDays: 1,
			days: 7,
			tokens: 1000,
			input: 800,
			cacheRead: 400,
			output: 200,
			cost: costSummary(1.5)
		},
		metric: 'cost',
		today: '2024-03-07',
		barDate: null,
		setBarDate: function() {},
		onOpenDay: function() {},
		canOpen: function() { return false; },
		t: t
	});

	const hasAverageLine = html.indexOf('dss-tr-avg') >= 0;
	const hasAverageLegend = html.indexOf('tr.avgLine') >= 0;

	// 前提：只有 1 个活跃日，日均虚线不应渲染
	expect(hasAverageLine).toBe(false);
	// 图例项必须与实际渲染的日均线保持一致
	expect(hasAverageLegend).toBe(hasAverageLine);
});

