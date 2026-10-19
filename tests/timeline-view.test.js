import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { TimelineDay } = require('../src/client-timeline.cjs');
const { fmtCostSummary, fmtDuration } = require('../src/client-format.cjs');
const { dayStartMs } = require('../src/client-data.cjs');
const { zh, en } = require('../src/client-locale.cjs');

const SLOT_MS = 1800000;
const DATE = '2026-10-14';
const BASE_SLOT = dayStartMs(DATE) / SLOT_MS;
const COST = { status: 'exact', totals: [{ currency: 'CNY', amount: 1.23, exactAmount: 1.23, estimatedAmount: 0 }], unpricedTokens: 0, unknownRows: 0 };
const PREFS = { axis: 'focus', metric: 'cost', color: 'level', activeOnly: false };

function stats() {
	return {
		turns: 1, steps: 1, llmMs: 1000, toolMs: 0,
		ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0,
		uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0,
		inputTokens: 0, outputTokens: 0, cacheHitPct: null, tps: null, ttftAvgMs: null,
	};
}

function day() {
	return { date: DATE, slotBlocks: [{ slot: 10, projectId: 'p', name: 'Project P', colorIndex: 0, ms: SLOT_MS }] };
}

function render(props = {}) {
	const dictionary = props.lang === 'en' ? en : zh;
	return renderToStaticMarkup(React.createElement(TimelineDay, {
		timeline: { days: [day()] },
		date: DATE,
		projects: [],
		hidden: {},
		hiddenKey: '',
		colorIndexes: new Map([['p', 0]]),
		dayCost: COST,
		dayTokens: 1234,
		prefs: PREFS,
		setPrefs: () => {},
		onOpenSession: () => {},
		onShowAll: () => {},
		remote: true,
		t: key => dictionary[key] ?? key,
		...props,
	}));
}

test('TimelineDay shows the overview cost summary verbatim in the bar total', () => {
	const html = render();
	const match = html.match(/<b class="dss-tl-hist-total">([^<]*)<\/b>/);
	expect(match).not.toBeNull();
	expect(match[1]).toBe(fmtCostSummary(COST, key => zh[key] ?? key));
	expect(html).toContain('dss-tl-hist');
	expect(html).toContain('dss-tl-legend');
});

test('TimelineDay omits the lane chevron when sessions have no activity slots', () => {
	const project = {
		id: 'p', name: 'Project P', path: '/p', sessionCount: 1, subagentCount: 0, lastActiveAt: null,
		stats: stats(),
		sessions: [{ id: 's', title: 'Session', subagent: false, stats: stats() }],
	};
	const html = render({ projects: [project] });
	expect(html).toContain('dss-tl-lane');
	expect(html).not.toContain('dss-tl-chev');
	expect(html).toContain(fmtDuration(SLOT_MS));
});

test('TimelineDay renders the empty state and show-all action when every lane is hidden', () => {
	const project = { id: 'p', name: 'Project P', path: '/p', sessionCount: 1, stats: stats(), sessions: [] };
	const html = render({ projects: [project], hidden: { p: true } });
	expect(html).toContain('dss-empty');
	expect(html).toContain('data-action="tl-show-all"');
	expect(html).toContain(zh['tl.emptyVisible']);
	expect(html).not.toContain('dss-tl-lane');
});

test('TimelineDay has no missing zh/en timeline keys', () => {
	for (const lang of ['zh', 'en']) {
		const html = render({ lang });
		expect(html).not.toMatch(/\btl\.[a-zA-Z]+/);
	}
});
