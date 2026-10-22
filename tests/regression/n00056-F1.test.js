// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 会话列表分页后，第一页最后一行丢失 is-last 收尾标记
// Source: src/client-timeline.cjs:368  Contract: —
// Verified fixed at cc91b835d19f199f7256ed156bd81d99f3f138f2 by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { TimelineDay } = require('../../src/client-timeline.cjs');
const { TIMELINE_SESSION_PAGE } = require('../../src/client-timeline-model.cjs');
const { zh } = require('../../src/client-locale.cjs');

const SLOT_MS = 1800000;
const DATE = '2026-10-14';
const PREFS = { axis: 'focus', metric: 'cost', color: 'level', activeOnly: false };
const COST = {
	status: 'exact',
	totals: [{ currency: 'CNY', amount: 1.23, exactAmount: 1.23, estimatedAmount: 0 }],
	unpricedTokens: 0,
	unknownRows: 0,
};

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
		t: key => zh[key] ?? key,
		...props,
	}));
}

test('[F1] 会话数超过一页时，第一页渲染的最后一行也应带 is-last', () => {
	const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-14T12:00:00+08:00'));
	try {
		const total = TIMELINE_SESSION_PAGE + 1;
		const sessions = [];
		for (let i = 0; i < total; i++) {
			sessions.push({
				id: 's' + i,
				title: 'Session ' + i,
				subagent: false,
				slots: [{ slot: 10, ms: SLOT_MS }],
				stats: stats(),
			});
		}
		const project = {
			id: 'p',
			name: 'Project P',
			path: '/p',
			sessionCount: total,
			subagentCount: 0,
			lastActiveAt: null,
			stats: stats(),
			sessions,
		};

		const html = render({ projects: [project] });
		const rows = [...html.matchAll(/class="(dss-tl-row dss-tl-sess[^"]*)"/g)].map(m => m[1]);

		// 分页生效：第一页只渲染 TIMELINE_SESSION_PAGE 行
		expect(rows.length).toBe(TIMELINE_SESSION_PAGE);
		// 本页最后一行应当带收尾标记
		expect(rows[rows.length - 1]).toContain('is-last');
	} finally {
		nowSpy.mockRestore();
	}
});

