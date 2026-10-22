// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 费用环比上涨 0.5% 因浮点误差被判为“持平”，与等幅下降显示 ↓1% 不对称
// Source: src/client-overview.cjs:60  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';
import { expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { OverviewKpis } = require('../../src/client-overview.cjs');
const { zh } = require('../../src/client-locale.cjs');

function t(key) {
	return zh && zh[key] != null ? zh[key] : key;
}

function renderDayKpi(currentAmount, previousAmount) {
	const totals = {
		input: 0,
		cacheRead: 0,
		output: 0,
		main: 0,
		subagent: 0,
		turns: 0,
		steps: 0,
		llmMs: 0,
		toolMs: 0,
		ttftAvgMs: null,
		tps: null,
		cost: { status: 'exact', totals: [{ currency: 'CNY', amount: currentAmount }], unpricedTokens: 0 },
	};
	const html = renderToStaticMarkup(React.createElement(OverviewKpis, {
		totals,
		previous: { status: 'exact', totals: [{ currency: 'CNY', amount: previousAmount }], unpricedTokens: 0 },
		prevDate: '2024-05-02',
		activeDays: 1,
		dayMode: true,
		pending: null,
		onPending: function () {},
		t: t,
	}));
	return html.replace(/<[^>]+>/g, '').replaceAll('&amp;', '&');
}

test('[F1] 费用环比上涨 0.5%（2.00→2.01 元）应显示为上涨，当前因浮点误差显示“持平”', () => {
	const text = renderDayKpi(2.01, 2);
	expect(text).toContain('↑');
});

