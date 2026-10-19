import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { TimelineDay, TimelineRange } = require('../src/client-timeline.cjs');
const { fmtCostSummary, fmtDuration } = require('../src/client-format.cjs');
const { dayStartMs } = require('../src/client-data.cjs');
const { weekOf } = require('../src/client-timeline-model.cjs');
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

test('TimelineDay marks archived sessions', () => {
	const project = {
		id: 'p', name: 'Project P', path: '/p', sessionCount: 1, subagentCount: 0, lastActiveAt: null,
		stats: stats(),
		sessions: [{ id: 's', title: 'Archived session', archived: true, subagent: false, slots: [{ slot: 10, ms: SLOT_MS }], stats: stats() }],
	};
	const html = render({ projects: [project] });
	expect(html).toContain('dss-tag is-archived');
	expect(html).toContain(zh['w.archivedTag']);
	expect(html).toContain('Archived session');
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

test('TimelineDay flips the now label near the end of the active window', () => {
	const original = Date.now;
	Date.now = () => Date.parse('2026-10-14T23:00:00+08:00');
	try {
		const lateDay = { date: DATE, slotBlocks: [{ slot: 40, projectId: 'p', name: 'Project P', colorIndex: 0, ms: SLOT_MS }] };
		const html = render({ timeline: { days: [lateDay] }, prefs: { ...PREFS, axis: 'focus' } });
		expect(html).toContain('dss-tl-now is-flip');
		expect(html).toContain('现在 23:00');
	} finally {
		Date.now = original;
	}
});

function rangeDays() {
	return [
		{ date: '2026-10-11', slotBlocks: [] },
		{ date: '2026-10-12', slotBlocks: [] },
		{ date: '2026-10-14', slotBlocks: [{ slot: 10, projectId: 'p', name: 'Project P', colorIndex: 0, ms: SLOT_MS }] },
	];
}

function renderRange(props = {}) {
	const dictionary = props.lang === 'en' ? en : zh;
	return renderToStaticMarkup(React.createElement(TimelineRange, {
		timeline: { days: props.days || rangeDays() },
		hidden: {},
		hiddenKey: '',
		colorIndexes: new Map([['p', 0]]),
		allProjects: [],
		prefs: { ...PREFS, activeOnly: false },
		setPrefs: () => {},
		onSelectDate: () => {},
		onJump: () => {},
		t: key => dictionary[key] ?? key,
		...props,
	}));
}

test('TimelineRange marks idle rows and disables their date buttons', () => {
	const original = Date.now;
	Date.now = () => Date.parse('2026-10-14T12:00:00+08:00');
	try {
		const html = renderRange();
		expect(html).toContain('dss-mx-row is-day is-idle');
		expect(html).toMatch(/<button[^>]*data-date="2026-10-13"[^>]*disabled/);
		expect(html).toMatch(/<button[^>]*data-date="2026-10-12"[^>]*disabled/);
	} finally {
		Date.now = original;
	}
});

test('TimelineRange puts is-week on the first row of a new calendar week', () => {
	const original = Date.now;
	Date.now = () => Date.parse('2026-10-14T12:00:00+08:00');
	try {
		const html = renderRange();
		const rows = [...html.matchAll(/<div class="([^"]*dss-mx-row is-day[^"]*)" data-date="([^"]+)"/g)];
		const byDate = new Map(rows.map(row => [row[2], row[1]]));
		expect(weekOf('2026-10-11')).not.toBe(weekOf('2026-10-12'));
		expect(byDate.get('2026-10-11')).toContain('is-week');
		expect(byDate.get('2026-10-12')).not.toContain('is-week');
		expect(byDate.get('2026-10-13')).not.toContain('is-week');
	} finally {
		Date.now = original;
	}
});

test('TimelineRange has no missing zh/en timeline keys', () => {
	const original = Date.now;
	Date.now = () => Date.parse('2026-10-14T12:00:00+08:00');
	try {
		for (const lang of ['zh', 'en']) {
			const html = renderRange({ lang });
			expect(html).not.toMatch(/\btl\.[a-zA-Z]+/);
		}
	} finally {
		Date.now = original;
	}
});

test('TimelineRange omits peak text and marker when the page has no profile', () => {
	const original = Date.now;
	Date.now = () => Date.parse('2026-10-14T12:00:00+08:00');
	try {
		const html = renderRange({ days: [{ date: '2026-10-14', slotBlocks: [] }] });
		expect(html).not.toContain('高峰');
		expect(html).not.toContain('is-peak');
		expect(html).toContain('dss-mx-row is-day is-idle');
	} finally {
		Date.now = original;
	}
});
