// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 指标切到 Token 后，摘要条“日均”仍按费用计算，与同页柱图注释的 Token 日均自相矛盾
// Source: src/client-trends.cjs:150  Contract: src/client-trends.cjs:216-218（DailyChart 的日均按 metric 分支：Token 指标下用 fmtTokens(totals.tokens/activeDays)）；同组件 src/client-trends.cjs:120-125 已按 metric 决定 Top 模型占比口径
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const mod = require('../../src/client-trends.cjs');
const { zh } = require('../../src/client-locale.cjs');

const t = (key) => (Object.prototype.hasOwnProperty.call(zh, key) ? zh[key] : key);

function render(Component, props) {
	return renderToStaticMarkup(React.createElement(Component, props));
}

test('[F1] 指标为 Token 时摘要条“日均”应按 Token 计算，而不是继续显示费用日均', () => {
	const cost = {
		status: 'exact',
		totals: [{ currency: 'CNY', amount: 30, exactAmount: 30, estimatedAmount: 0 }],
		unpricedTokens: 0,
	};
	// 1000 tokens / 2 个活跃日 = 日均 500 tokens；费用 30 / 2 = ¥15.00
	const totals = { input: 600, cacheRead: 100, output: 400, tokens: 1000, activeDays: 2, days: 7, cost };
	const html = render(mod.TrendsKpis, {
		totals,
		previous: { cost },
		range: 7,
		activeDays: 2,
		models: [],
		metric: 'token',
		pending: null,
		onOpenPricing: () => {},
		t,
	});
	const label = t('tr.kpi.perDay');
	const match = html.match(new RegExp('<div class="dss-kpi-k">' + label + '</div><div class="dss-kpi-v">([^<]*)</div>'));
	expect(match).not.toBeNull();
	// 与同一页面 DailyChart 注释的口径保持一致：Token 指标下的日均是 Token 数
	expect(match[1]).toBe('500');
});

