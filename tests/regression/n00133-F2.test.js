// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] 费用确定为 0 的区间，摘要条日均显示“—”而不是 ¥0
// Source: src/client-trends.cjs:43  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const mod = require('../../src/client-trends.cjs');
const { zh } = require('../../src/client-locale.cjs');

const t = (key) => (Object.prototype.hasOwnProperty.call(zh, key) ? zh[key] : key);
const TODAY = '2026-09-08';

function render(Component, props) {
	return renderToStaticMarkup(React.createElement(Component, props));
}

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] 费用确定为 0 的区间，摘要条日均应显示 ¥0 而不是未知', () => {
	const zero = {
		status: 'exact',
		totals: [{ currency: 'CNY', amount: 0, exactAmount: 0, estimatedAmount: 0 }],
		unpricedTokens: 0,
	};
	const totals = { input: 1000, cacheRead: 100, output: 100, tokens: 1100, activeDays: 2, days: 7, cost: zero };
	const html = render(mod.TrendsKpis, {
		totals,
		previous: { cost: zero },
		range: 7,
		activeDays: 2,
		models: [],
		metric: 'cost',
		pending: null,
		onOpenPricing: () => {},
		t,
	});
	// 费用 KPI 对同一份摘要显示 ¥0。
	expect(html).toContain('<div class="dss-kpi-v dss-cost">¥0</div>');
	const label = t('tr.kpi.perDay');
	const match = html.match(new RegExp('<div class="dss-kpi-k">' + label + '</div><div class="dss-kpi-v">([^<]*)</div>'));
	expect(match).not.toBeNull();
	expect(match[1]).toBe('¥0');
});

