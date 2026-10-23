// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 环比涨跌幅在 ±0.5% 边界上被舍入成“持平”，涨跌方向丢失（缺少 formatDelta 的 1e-9 浮点校正）
// Source: src/client-trends.cjs:107  Contract: src/client-overview.cjs:120（同款 formatDelta 用 Math.round(delta.ratio * 100 + Math.sign(delta.ratio) * 1e-9) 修正浮点/半值边界）
// Verified fixed by `recheck`; do not delete without checking the finding.

// 数值正确性：环比涨跌幅的符号对称性、确定为零的费用展示。
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const mod = require('../../src/client-trends.cjs');
const { zh } = require('../../src/client-locale.cjs');

const t = (key) => (Object.prototype.hasOwnProperty.call(zh, key) ? zh[key] : key);

function cny(amount) {
	return {
		status: 'exact',
		totals: [{ currency: 'CNY', amount, exactAmount: amount, estimatedAmount: 0 }],
		unpricedTokens: 0,
	};
}

function renderKpis(cost, previousCost) {
	return renderToStaticMarkup(React.createElement(mod.TrendsKpis, {
		totals: { input: 1000, cacheRead: 100, output: 100, tokens: 1100, activeDays: 2, days: 30, cost: cny(cost) },
		previous: { cost: cny(previousCost) },
		range: 30,
		activeDays: 2,
		models: [],
		metric: 'cost',
		pending: null,
		onOpenPricing: () => {},
		t,
	}));
}

function deltaText(html) {
	const match = html.match(/<span class="dss-kpi-delta">([^<]*)<\/span>/);
	return match ? match[1] : null;
}

test('[F1] 环比 ±0.5% 应分别显示 ↑1% 与 ↓1%，不能把涨跌舍入成“持平”', () => {
	// 200 -> 201 是 +0.5%，200 -> 199 是 -0.5%，四舍五入后都应是 1 个百分点。
	const up = deltaText(renderKpis(201, 200));
	const down = deltaText(renderKpis(199, 200));
	expect(up).not.toBeNull();
	expect(down).not.toBeNull();
	expect(up).toContain('↑1%');
	expect(down).toContain('↓1%');
});

// [night-evolver] 这条发现还没修，测试暂不提升;

