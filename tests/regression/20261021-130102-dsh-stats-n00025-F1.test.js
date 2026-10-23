// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 项目 id 与 Object.prototype 属性同名（如 constructor/toString）时被误判为已隐藏，趋势页整段数据消失
// Source: src/client-trends.cjs:661  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { TrendsView } = require('../../src/client-trends.cjs');
const { applyRange, dayStartMs } = require('../../src/client-data.cjs');
const { zh } = require('../../src/client-locale.cjs');

const SLOT_MS = 1800000;
const TODAY = '2026-09-08';
const DATES = ['2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08'];

function makeT() {
	return (key) => (Object.prototype.hasOwnProperty.call(zh, key) ? zh[key] : key);
}

function usageOn(day, model, providerId) {
	return {
		slot: dayStartMs(day) / SLOT_MS + 4,
		model, modelRaw: model, providerId, accountType: 'api', serviceTier: 'standard', contextTokens: 300000,
		uncached: 30000, output: 4000, cacheRead: 10000, cacheWrite: 0, reasoning: 0,
	};
}

function sessionOn(id, day, model, providerId) {
	const time = dayStartMs(day) + 3600000;
	return {
		id, title: id, updatedAt: time, createdAt: time, subagent: false,
		stats: { turns: 1, steps: 1, llmMs: 1000, toolMs: 0, inputTokens: 40000, outputTokens: 4000, cacheRead: 10000, uncached: 30000, reasoning: 0 },
		slotUsage: [usageOn(day, model, providerId)],
	};
}

function projectWithId(id) {
	return [{
		id, name: id, path: '/w/' + id,
		sessions: DATES.map((day, index) => sessionOn(id + '-' + index, day, 'deepseek-v4-flash', 'deepseek')),
		stats: { inputTokens: DATES.length * 40000, outputTokens: DATES.length * 4000 },
	}];
}

function render(props) {
	const projects = props.projects;
	return renderToStaticMarkup(React.createElement(TrendsView, {
		projects,
		rangeProjects: props.rangeProjects || applyRange(projects, TODAY, 30),
		hidden: props.hidden || {},
		hiddenKey: props.hiddenKey || '',
		dates: DATES,
		today: TODAY,
		prefs: { range: 30, metric: 'cost' },
		setPrefs: () => {},
		colorIndexes: new Map(projects.map((project, index) => [project.id, index])),
		onToggle: () => {},
		onShowAll: () => {},
		onOpenDay: () => {},
		onOpenPricing: () => {},
		t: makeT(),
	}));
}

test('[F1] 未被隐藏但 id 命中 Object.prototype 属性名的项目仍应渲染趋势 KPI', () => {
	const projects = projectWithId('constructor');
	const html = render({ projects, hidden: {} });
	// 该项目并未出现在 hidden 里，不应被当成隐藏。
	expect(html).not.toContain('所有项目都已隐藏');
	expect(html).toContain('dss-tr-kpis');
	expect((html.match(/data-action="tr-day"/g) || []).length).toBe(DATES.length);
});

