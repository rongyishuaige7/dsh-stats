import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { TrendsView } = require('../src/client-trends.cjs');
const { applyRange, buildGlobals, dayStartMs } = require('../src/client-data.cjs');
const { zh, en } = require('../src/client-locale.cjs');

const SLOT_MS = 1800000;
const TODAY = '2026-09-08';
const DATES = ['2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08'];

function usageOn(day, model, providerId, overrides = {}) {
	return {
		slot: dayStartMs(day) / SLOT_MS + 4,
		model, modelRaw: model, providerId, accountType: 'api', serviceTier: 'standard', contextTokens: 300000,
		uncached: 30000, output: 4000, cacheRead: 10000, cacheWrite: 0, reasoning: 0,
		...overrides,
	};
}

function sessionOn(id, day, model, providerId, overrides = {}) {
	const time = dayStartMs(day) + 3600000;
	return {
		id, title: id, updatedAt: time, createdAt: time, subagent: false,
		stats: { turns: 1, steps: 1, llmMs: 1000, toolMs: 0, inputTokens: 40000, outputTokens: 4000, cacheRead: 10000, uncached: 30000, reasoning: 0 },
		slotUsage: [usageOn(day, model, providerId, overrides.usage)],
		...overrides.session,
	};
}

function projectFixture() {
	return [
		{
			id: 'client-dashboard', name: 'client-dashboard', path: '/w/client',
			sessions: DATES.map((day, index) => sessionOn('cd-' + index, day, 'deepseek-v4-flash', 'deepseek')),
			stats: { inputTokens: DATES.length * 40000, outputTokens: DATES.length * 4000 },
		},
		{
			id: 'api-service', name: 'api-service', path: '/w/api',
			sessions: DATES.map((day, index) => sessionOn('api-' + index, day, 'MiniMax-M3', 'minimax')),
			stats: { inputTokens: DATES.length * 40000, outputTokens: DATES.length * 4000 },
		},
	];
}

function makeT(lang) {
	const dictionary = lang === 'en' ? en : zh;
	return (key) => (Object.prototype.hasOwnProperty.call(dictionary, key) ? dictionary[key] : key);
}

function render(props = {}) {
	const lang = props.lang === 'en' ? 'en' : 'zh';
	const today = props.today || TODAY;
	const projects = props.projects || projectFixture();
	const prefs = props.prefs || { range: 30, metric: 'cost' };
	const globals = buildGlobals(projects);
	return renderToStaticMarkup(React.createElement(TrendsView, {
		projects,
		rangeProjects: props.rangeProjects || applyRange(projects, today, prefs.range),
		hidden: props.hidden || {},
		hiddenKey: Object.keys(props.hidden || {}).filter((id) => props.hidden[id]).sort().join('\u0000'),
		dates: props.dates || DATES,
		today,
		prefs,
		setPrefs: () => {},
		colorIndexes: new Map(projects.map((project, index) => [project.id, index])),
		onToggle: () => {},
		onShowAll: () => {},
		onOpenDay: () => {},
		onOpenPricing: () => {},
		t: makeT(lang),
		legacy: { globals, dateGlobals: globals },
	}));
}

test('renders the summary strip and one bar per active day', () => {
	const html = render();
	expect(html).toContain('class="dss-tr-kpis"');
	expect(html).not.toContain('dss-kpis');
	expect(html).toContain('class="dss-tools dss-tr-tools"');
	const bars = (html.match(/data-action="tr-day"/g) || []).length;
	expect(bars).toBe(DATES.length);
	expect(html).toContain('dss-tr-daily');
	expect(html).toContain('每日费用');
	expect(html).toContain('近 30 天');
	expect(html).toContain('08-10 至 09-08');
	expect((html.match(/data-action="tr-range-/g) || []).length).toBe(3);
	expect((html.match(/data-action="tr-metric-/g) || []).length).toBe(2);
});

test('all history without tokens shows only the empty state', () => {
	const projects = [{ id: 'empty', name: 'empty', path: '/empty', sessions: [], stats: {} }];
	const html = render({ projects, rangeProjects: [] });
	expect(html).toContain('dss-empty');
	expect(html).not.toContain('dss-tr-tools');
	expect(html).not.toContain('dss-tr-kpis');
});

test('all range projects hidden shows the show-all action', () => {
	const html = render({ hidden: { 'client-dashboard': true, 'api-service': true } });
	expect(html).toContain('所有项目都已隐藏');
	expect(html).toContain('data-action="tr-show-all"');
	expect(html).toContain('dss-tr-tools');
	expect(html).not.toContain('dss-tr-kpis');
});

test('an empty range points at the smallest larger range with tokens', () => {
	const html = render({ today: '2026-09-28', prefs: { range: 7, metric: 'cost' } });
	expect(html).toContain('近 7 天没有 Token 消耗');
	expect(html).toContain('data-action="tr-empty-range"');
	expect(html).toContain('看近 30 天');
	expect(html).not.toContain('dss-tr-kpis');
	// 空范围仍然渲染 26 周热力图。
	expect(html).toContain('dss-tr-heat');
});

test('renders the 26-week heatmap and the streak stats', () => {
	const html = render();
	expect((html.match(/class="dss-tr-cell/g) || []).length).toBe(177);
	expect((html.match(/data-action="tr-heat-day"/g) || []).length).toBe(DATES.length);
	expect(html).toContain('活动热力图');
	expect(html).toContain('近 26 周 · 按费用');
	expect(html).toContain('活跃天数');
	expect(html).toContain('当前连续');
	expect(html).toContain('最长连续');
	expect(html).toContain('7 / 177 天');
	expect(html).toContain('7 天');
	expect(html).toContain('截至今天');
	expect(html).toContain('09-02 至 09-08');
	expect(html).toContain('4月');
	expect(html).toContain('9月');
	expect((html.match(/class="dss-tr-cell is-today/g) || []).length).toBe(1);
});

test('partial pricing marks the cost and offers the pending chip', () => {
	const projects = [{
		id: 'mixed', name: 'mixed', path: '/mixed',
		sessions: [
			sessionOn('priced', TODAY, 'deepseek-v4-flash', 'deepseek'),
			sessionOn('unpriced', TODAY, 'fixture-unpriced', 'unknown-provider', { usage: { uncached: 1000, output: 0, cacheRead: 0 } }),
		],
		stats: { inputTokens: 41000, outputTokens: 4000 },
	}];
	const html = render({ projects });
	const cost = html.match(/<div class="dss-kpi-v dss-cost">([^<]*)<\/div>/);
	expect(cost).not.toBeNull();
	expect(cost[1].endsWith('*')).toBe(true);
	expect(html).toContain('data-action="pricing-pending"');
});

test('both locales render every key and expose the same tr.* key set', () => {
	const zhHtml = render({ lang: 'zh' });
	const enHtml = render({ lang: 'en' });
	for (const html of [zhHtml, enHtml]) {
		expect(html).not.toContain('tr.');
		expect(html).not.toContain('trends.');
	}
	expect(enHtml).toContain('Daily cost');
	expect(enHtml).toContain('Top model');
	const keys = (dictionary) => Object.keys(dictionary).filter((key) => key.startsWith('tr.')).sort();
	expect(keys(en)).toEqual(keys(zh));
});
