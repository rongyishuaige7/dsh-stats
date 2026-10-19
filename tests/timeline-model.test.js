import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
	TIMELINE_PAGE_DAYS, TIMELINE_LANE_PAGE, TIMELINE_SESSION_PAGE, POP_PROJECTS, POP_SESSIONS,
	TIMELINE_PREF_DEFAULTS, normalizeTimelinePrefs, addDays, weekOf, calendarDates,
	projectSlotMs, projectDurations, timelineWindow, timelineTicks, timelineGrid,
	timelineRuns, runSlotAt, sessionDaySlots, timelineDayModel, timelinePeak,
	timelineSlotDetail, dayCostSummaries, timelineRangeModel, timelineJumpSlot,
} = require('../src/client-timeline-model.cjs');
const { applyDate, dayStartMs, hasTokenUsage } = require('../src/client-data.cjs');
const { overviewTotals, cnyAmount } = require('../src/client-overview-model.cjs');
const { fmtCostSummary, SLOT_MS } = require('../src/client-format.cjs');

const DAY = '2026-10-14';
const DAY_START = dayStartMs(DAY);
const BASE_SLOT = DAY_START / SLOT_MS;

function stats(extra = {}) {
	return {
		turns: 1, steps: 1, llmMs: 1000, toolMs: 0,
		ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0,
		uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0,
		inputTokens: 0, outputTokens: 0, cacheHitPct: null, tps: null, ttftAvgMs: null,
		...extra,
	};
}

function makeSession(overrides = {}) {
	return {
		id: 's', title: 'Session',
		updatedAt: DAY_START + 60 * 60000, createdAt: DAY_START + 60 * 60000,
		subagent: false, stats: stats(),
		...overrides,
	};
}

function makeProject(id, sessions, extra = {}) {
	return {
		id, name: id, path: '/' + id,
		sessionCount: sessions.length,
		subagentCount: sessions.filter(session => session.subagent).length,
		lastActiveAt: null, stats: stats(), sessions,
		...extra,
	};
}

function usageOn(day, slot, overrides = {}) {
	return {
		slot: dayStartMs(day) / SLOT_MS + slot,
		model: 'gpt-5.6-luna',
		uncached: 1000, output: 100, cacheRead: 0, cacheWrite: 0, reasoning: 0,
		...overrides,
	};
}

function exactUsageOn(day, slot, overrides = {}) {
	const base = dayStartMs(day) / SLOT_MS;
	return {
		slot: base + slot,
		model: 'MiniMax-M3', providerId: 'minimax', accountType: 'api',
		serviceTier: 'standard', contextTokens: 300000, count: 2,
		time: dayStartMs(day) + slot * SLOT_MS,
		uncached: 1000, output: 100, cacheRead: 10000, cacheWrite: 200, reasoning: 0,
		...overrides,
	};
}

function unknownUsageOn(day, slot, overrides = {}) {
	return {
		slot: dayStartMs(day) / SLOT_MS + slot,
		model: 'unknown-model',
		uncached: 1000, output: 100, cacheRead: 0, cacheWrite: 0, reasoning: 0,
		...overrides,
	};
}

function summaryAmount(summary) {
	if (!summary || !Array.isArray(summary.totals)) return 0;
	return summary.totals.reduce((total, row) => total + (row.currency === 'CNY' && Number.isFinite(row.amount) ? row.amount : 0), 0);
}

function block(slot, projectId, ms, extra = {}) {
	return { slot, projectId, name: projectId.toUpperCase(), colorIndex: 0, ms, ...extra };
}

test('normalizeTimelinePrefs validates each field and drops unknown keys', () => {
	expect(normalizeTimelinePrefs(null)).toEqual(TIMELINE_PREF_DEFAULTS);
	expect(normalizeTimelinePrefs(undefined)).toEqual(TIMELINE_PREF_DEFAULTS);
	expect(normalizeTimelinePrefs([])).toEqual(TIMELINE_PREF_DEFAULTS);
	expect(normalizeTimelinePrefs('full')).toEqual(TIMELINE_PREF_DEFAULTS);
	expect(normalizeTimelinePrefs({ axis: 'full', metric: 'token', color: 'project', activeOnly: true }))
		.toEqual({ axis: 'full', metric: 'token', color: 'project', activeOnly: true });
	expect(normalizeTimelinePrefs({ axis: 'full', metric: 'token', color: 'project', activeOnly: true, extra: 1 }))
		.toEqual({ axis: 'full', metric: 'token', color: 'project', activeOnly: true });
	expect(normalizeTimelinePrefs({ axis: 'x', metric: 'y', color: 'z', activeOnly: 'true' }))
		.toEqual(TIMELINE_PREF_DEFAULTS);
	expect(normalizeTimelinePrefs({ axis: 'focus', metric: 'cost', color: 'level', activeOnly: 1 }))
		.toEqual(TIMELINE_PREF_DEFAULTS);
});

test('addDays and weekOf use Monday-based UTC calendar weeks', () => {
	expect(dayStartMs(DAY)).toBe(Date.parse(DAY + 'T00:00:00+08:00'));
	expect(addDays('2026-10-12', 7)).toBe('2026-10-19');
	expect(addDays('2026-10-12', -3)).toBe('2026-10-09');
	expect(weekOf('2026-10-12')).toBe(weekOf('2026-10-18'));
	expect(weekOf('2026-10-19')).toBe(weekOf('2026-10-12') + 1);
	expect(weekOf('2026-10-11')).toBe(weekOf('2026-10-12') - 1);
});

test('calendarDates fills idle dates, extends to today and handles empty input', () => {
	expect(calendarDates([
		{ date: '2026-10-12' },
		{ date: '2026-10-14' },
	], '2026-10-16')).toEqual([
		'2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16',
	]);
	expect(calendarDates([{ date: '2026-10-14' }], '2026-10-12')).toEqual(['2026-10-14']);
	expect(calendarDates([
		{ date: '2026-10-14' },
		{ date: '2026-10-12' },
		{ date: '2026-10-14' },
	], '2026-10-14')).toEqual(['2026-10-12', '2026-10-13', '2026-10-14']);
	expect(calendarDates([], '2026-10-16')).toEqual([]);
});

test('timelineWindow expands short activity to six aligned hours and clamps at both ends', () => {
	const twoMinutes = timelineWindow(20, 20, 'focus');
	expect(twoMinutes).toEqual({ start: 16, end: 28 });
	expect((twoMinutes.end - twoMinutes.start) * 30 * 60000).toBe(6 * 3600000);
	expect(timelineWindow(0, 0, 'focus')).toEqual({ start: 0, end: 12 });
	expect(timelineWindow(47, 47, 'focus')).toEqual({ start: 36, end: 48 });
	expect(timelineWindow(20, 31, 'focus')).toEqual({ start: 20, end: 32 });
	expect(timelineWindow(20, 33, 'focus')).toEqual({ start: 20, end: 34 });
	expect(timelineWindow(20, 20, 'full')).toEqual({ start: 0, end: 48 });
	expect(timelineWindow(-1, -1, 'focus')).toEqual({ start: 0, end: 48 });
	for (const [first, last] of [[0, 0], [21, 21], [47, 47], [20, 33]]) {
		const win = timelineWindow(first, last, 'focus');
		expect(win.start % 2).toBe(0);
		expect(win.end % 2).toBe(0);
	}
});

test('timelineTicks picks 1h, 2h or 3h steps and marks both edges', () => {
	const sixHours = timelineTicks({ start: 16, end: 28 });
	expect(sixHours.map(tick => tick.slot)).toEqual([16, 18, 20, 22, 24, 26, 28]);
	expect(sixHours[0]).toMatchObject({ label: '08:00', edge: 'first', odd: false });
	expect(sixHours[sixHours.length - 1]).toMatchObject({ label: '14:00', edge: 'last', odd: false });
	expect(sixHours.filter(tick => tick.odd).map(tick => tick.slot)).toEqual([18, 22, 26]);
	const twelveHours = timelineTicks({ start: 0, end: 24 });
	expect(twelveHours.map(tick => tick.slot)).toEqual([0, 4, 8, 12, 16, 20, 24]);
	const eighteenHours = timelineTicks({ start: 0, end: 36 });
	expect(eighteenHours.map(tick => tick.slot)).toEqual([0, 6, 12, 18, 24, 30, 36]);
});

test('timelineGrid skips both window edges and majors every third hour', () => {
	expect(timelineGrid({ start: 16, end: 28 })).toEqual([
		{ hour: 9, major: true },
		{ hour: 10, major: false },
		{ hour: 11, major: false },
		{ hour: 12, major: true },
		{ hour: 13, major: false },
	]);
	const full = timelineGrid({ start: 0, end: 48 });
	expect(full.map(row => row.hour)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
	expect(full.filter(row => row.major).map(row => row.hour)).toEqual([3, 6, 9, 12, 15, 18, 21]);
});

test('timelineRuns merges adjacent slots, rounds opacity and clips to the window', () => {
	const ms = new Array(48).fill(0);
	ms[2] = SLOT_MS;
	ms[3] = SLOT_MS / 2;
	ms[4] = SLOT_MS / 3;
	ms[6] = SLOT_MS;
	ms[7] = SLOT_MS;
	const runs = timelineRuns(ms, { start: 0, end: 48 });
	expect(runs.map(run => [run.from, run.to])).toEqual([[2, 5], [6, 8]]);
	expect(runs[0].segments.map(segment => segment.opacity)).toEqual([1, 0.65, 0.53]);
	expect(runs[0].total).toBeCloseTo(SLOT_MS + SLOT_MS / 2 + SLOT_MS / 3, 6);
	const clipped = timelineRuns(ms, { start: 3, end: 5 });
	expect(clipped).toHaveLength(1);
	expect(clipped[0]).toMatchObject({ from: 3, to: 5 });
	expect(clipped[0].segments.map(segment => segment.slot)).toEqual([3, 4]);
	expect(clipped[0].total).toBeCloseTo(SLOT_MS / 2 + SLOT_MS / 3, 6);
	expect(timelineRuns(ms, { start: 0, end: 2 })).toEqual([]);
	expect(timelineRuns(ms, { start: 8, end: 10 })).toEqual([]);
});

test('runSlotAt maps a click fraction inside the run and clamps both ends', () => {
	const run = { from: 2, to: 5 };
	expect(runSlotAt(run, 0)).toBe(2);
	expect(runSlotAt(run, 0.1)).toBe(2);
	expect(runSlotAt(run, 0.34)).toBe(3);
	expect(runSlotAt(run, 0.99)).toBe(4);
	expect(runSlotAt(run, 1)).toBe(4);
	expect(runSlotAt(run, -1)).toBe(2);
	expect(runSlotAt({ from: 2, to: 3 }, 0.5)).toBe(2);
});

test('projectSlotMs merges duplicate local slots, caps at 30 minutes and skips hidden/out-of-range rows', () => {
	const day = { slotBlocks: [
		{ slot: 4, projectId: 'a', name: 'A', colorIndex: 2, ms: 20 * 60000 },
		{ slot: 4, projectId: 'a', name: 'A', colorIndex: 2, ms: 20 * 60000 },
		{ slot: 4, projectId: 'b', name: 'B', colorIndex: 3, ms: 5 * 60000 },
		{ slot: 5, projectId: 'a', name: 'A', colorIndex: 2, ms: 10 * 60000 },
		{ slot: 48, projectId: 'a', name: 'A', colorIndex: 2, ms: SLOT_MS },
		{ slot: -1, projectId: 'a', name: 'A', colorIndex: 2, ms: SLOT_MS },
		{ slot: 6, projectId: 'hidden', name: 'Hidden', colorIndex: 4, ms: SLOT_MS },
	] };
	const projects = projectSlotMs(day, { hidden: true });
	expect([...projects.keys()]).toEqual(['a', 'b']);
	expect(projects.get('a').ms[4]).toBe(SLOT_MS);
	expect(projects.get('a').ms[5]).toBe(10 * 60000);
	expect(projects.get('b').ms[4]).toBe(5 * 60000);
	expect(projects.get('a')).toMatchObject({ name: 'A', colorIndex: 2 });
	const durations = projectDurations([day, { slotBlocks: [
		{ slot: 7, projectId: 'a', ms: SLOT_MS },
		{ slot: 8, projectId: 'b', ms: SLOT_MS },
	] }], { hidden: true });
	expect(durations.get('a')).toBe(SLOT_MS * 2 + 10 * 60000);
	expect(durations.get('b')).toBe(SLOT_MS + 5 * 60000);
	expect(durations.has('hidden')).toBe(false);
});

test('sessionDaySlots maps absolute slots and falls back to the timestamp slot', () => {
	const withUsage = sessionDaySlots(makeSession({
		slots: [{ slot: BASE_SLOT + 10, ms: SLOT_MS }],
		slotUsage: [usageOn(DAY, 10)],
	}), DAY);
	expect(withUsage.ms[10]).toBe(SLOT_MS);
	expect(withUsage.usage.get(10).tokens).toBe(1100);
	expect(withUsage.usage.get(10).details).toHaveLength(1);
	const fallback = sessionDaySlots(makeSession({
		model: 'gpt-5.6-luna',
		updatedAt: DAY_START + 12 * SLOT_MS,
		stats: stats({ uncached: 300, output: 30 }),
	}), DAY);
	expect(fallback.ms.every(value => value === 0)).toBe(true);
	expect(fallback.usage.get(12).tokens).toBe(330);
	expect(fallback.usage.get(12).summaries).toHaveLength(1);
	const outside = sessionDaySlots(makeSession({
		slots: [{ slot: BASE_SLOT - 1, ms: SLOT_MS }],
	}), DAY);
	expect(outside.ms.every(value => value === 0)).toBe(true);
	expect(sessionDaySlots(makeSession({ updatedAt: DAY_START - SLOT_MS }), DAY).usage.size).toBe(0);
});

test('timelineDayModel orders lanes by duration, first slot and project id', () => {
	const day = { date: DAY, slotBlocks: [
		block(40, 'e', SLOT_MS), block(41, 'e', SLOT_MS), block(42, 'e', SLOT_MS),
		block(10, 'b', SLOT_MS), block(11, 'b', SLOT_MS),
		block(10, 'a', SLOT_MS), block(11, 'a', SLOT_MS),
		block(20, 'c', SLOT_MS / 2),
		block(30, 'd', SLOT_MS / 2),
	] };
	const model = timelineDayModel({ day, projects: [], hidden: {}, date: DAY, colorIndexes: new Map() });
	expect(model.lanes.map(lane => lane.projectId)).toEqual(['e', 'a', 'b', 'c', 'd']);
	expect(model.lanes[0].total).toBe(3 * SLOT_MS);
	expect(model.total).toBe(3 * SLOT_MS + 4 * SLOT_MS + SLOT_MS);
	expect(model.first).toBe(10);
	expect(model.last).toBe(42);
});

test('timelineDayModel keeps subagents after their parent and orphan subagents last', () => {
	const sessions = [
		makeSession({ id: 'main2', slots: [{ slot: BASE_SLOT + 20, ms: SLOT_MS }] }),
		makeSession({ id: 'main1', slots: [{ slot: BASE_SLOT + 10, ms: SLOT_MS }] }),
		makeSession({ id: 'child2', slots: [{ slot: BASE_SLOT + 11, ms: SLOT_MS }], subagent: true, parentSession: 'main2' }),
		makeSession({ id: 'child1', slots: [{ slot: BASE_SLOT + 12, ms: SLOT_MS }], subagent: true, parentSession: 'main1' }),
		makeSession({ id: 'orphan', slots: [{ slot: BASE_SLOT + 5, ms: SLOT_MS }], subagent: true, parentSession: 'missing' }),
	];
	const projects = applyDate([makeProject('p', sessions)], DAY);
	const day = { date: DAY, slotBlocks: [5, 10, 11, 12, 20].map(slot => block(slot, 'p', SLOT_MS)) };
	const model = timelineDayModel({ day, projects, hidden: {}, date: DAY, colorIndexes: new Map([['p', 3]]) });
	const lane = model.lanes[0];
	expect(lane.sessions.map(row => row.id)).toEqual(['main1', 'child1', 'main2', 'child2', 'orphan']);
	expect(lane.mainCount).toBe(2);
	expect(lane.colorIndex).toBe(3);
	expect(model.hasSessions).toBe(true);
});

test('timelineDayModel reports hasSessions false without activity slots and marks slot tokens and partial bars', () => {
	const projects = [
		makeProject('p', [
			makeSession({ id: 'estimated', updatedAt: DAY_START + 10 * SLOT_MS, slotUsage: [usageOn(DAY, 10)], stats: stats({ uncached: 1000, output: 100 }) }),
			makeSession({ id: 'estimated2', updatedAt: DAY_START + 10 * SLOT_MS, slotUsage: [usageOn(DAY, 10, { uncached: 500, output: 50 })], stats: stats({ uncached: 500, output: 50 }) }),
			makeSession({ id: 'unknown', updatedAt: DAY_START + 11 * SLOT_MS, slotUsage: [unknownUsageOn(DAY, 11)] }),
			makeSession({ id: 'mixed', updatedAt: DAY_START + 12 * SLOT_MS, slotUsage: [exactUsageOn(DAY, 12), unknownUsageOn(DAY, 12)] }),
		]),
	];
	const dateProjects = applyDate(projects, DAY);
	const model = timelineDayModel({ day: { date: DAY, slotBlocks: [] }, projects: dateProjects, hidden: {}, date: DAY });
	expect(model.hasSessions).toBe(false);
	expect(model.lanes).toEqual([]);
	expect(model.slotTokens[10]).toBe(1650);
	expect(model.slotPartial[10]).toBe(false);
	expect(model.slotCost[10].status).toBe('estimated');
	expect(model.slotTokens[11]).toBe(1100);
	expect(model.slotPartial[11]).toBe(true);
	expect(model.slotTokens[12]).toBe(11300 + 1100);
	expect(model.slotPartial[12]).toBe(true);
	expect(model.slotCost[12].status).toBe('partial');
	const detail = timelineSlotDetail(model, 10);
	expect(detail.projects).toHaveLength(1);
	expect(detail.projects[0].sessions).toEqual([]);
	expect(detail.projects[0].tokens).toBe(1650);
	expect(detail.total.ms).toBe(0);
});

test('timelineDayModel slot costs add up to the overview KPI for the same day', () => {
	const projects = [
		makeProject('a', [
			makeSession({ id: 'a1', slots: [{ slot: BASE_SLOT + 10, ms: SLOT_MS }], slotUsage: [usageOn(DAY, 10)], stats: stats({ uncached: 1000, output: 100 }) }),
			makeSession({ id: 'a2', model: 'gpt-5.6-luna', slots: [{ slot: BASE_SLOT + 20, ms: SLOT_MS }], updatedAt: DAY_START + 20 * SLOT_MS, stats: stats({ uncached: 500, output: 50 }) }),
		]),
		makeProject('b', [
			makeSession({ id: 'b1', slots: [{ slot: BASE_SLOT + 10, ms: SLOT_MS }], slotUsage: [usageOn(DAY, 10, { uncached: 200, output: 20 })], stats: stats({ uncached: 200, output: 20 }) }),
		]),
	];
	const dateProjects = applyDate(projects, DAY);
	const day = { date: DAY, slotBlocks: [block(10, 'a', SLOT_MS), block(20, 'a', SLOT_MS), block(10, 'b', SLOT_MS)] };
	const model = timelineDayModel({ day, projects: dateProjects, hidden: {}, date: DAY });
	const expected = cnyAmount(overviewTotals(dateProjects).cost);
	expect(expected).not.toBeNull();
	const actual = model.slotCost.reduce((total, summary) => total + summaryAmount(summary), 0);
	expect(Math.abs(actual - expected)).toBeLessThan(1e-9);
	const totals = overviewTotals(dateProjects);
	expect(model.slotTokens.reduce((total, value) => total + value, 0)).toBe(totals.input + totals.output);
});

test('dayCostSummaries matches overviewTotals for estimated, partial and unsupported fixtures', () => {
	const day1 = '2026-10-14';
	const day2 = '2026-10-15';
	const fixtures = [
		[makeProject('estimated', [
			makeSession({ id: 'e1', updatedAt: dayStartMs(day1) + 10 * SLOT_MS, slotUsage: [usageOn(day1, 10)] }),
			makeSession({ id: 'e2', updatedAt: dayStartMs(day2) + 12 * SLOT_MS, slotUsage: [usageOn(day2, 12)] }),
			makeSession({ id: 'e3', model: 'gpt-5.6-luna', updatedAt: dayStartMs(day2) + 13 * SLOT_MS, stats: stats({ uncached: 300, output: 30 }) }),
		])],
		[
			makeProject('exact', [makeSession({ id: 'p1', updatedAt: dayStartMs(day1) + 10 * SLOT_MS, slotUsage: [exactUsageOn(day1, 10), exactUsageOn(day2, 11)] })]),
			makeProject('unknown', [makeSession({ id: 'p2', updatedAt: dayStartMs(day1) + 10 * SLOT_MS, slotUsage: [unknownUsageOn(day1, 10), unknownUsageOn(day2, 11)] })]),
		],
		[makeProject('unsupported', [
			makeSession({ id: 'u1', updatedAt: dayStartMs(day1) + 10 * SLOT_MS, slotUsage: [unknownUsageOn(day1, 10), unknownUsageOn(day2, 11)] }),
		])],
	];
	for (const projects of fixtures) {
		const dayCosts = dayCostSummaries(projects, {});
		for (const date of [day1, day2]) {
			const expected = overviewTotals(applyDate(projects, date).filter(hasTokenUsage)).cost;
			expect(fmtCostSummary(dayCosts.get(date))).toBe(fmtCostSummary(expected));
		}
	}
	const partialProjects = fixtures[1];
	const visible = partialProjects.filter(project => project.id !== 'unknown');
	const hiddenCosts = dayCostSummaries(partialProjects, { unknown: true });
	for (const date of [day1, day2]) {
		const expected = overviewTotals(applyDate(visible, date).filter(hasTokenUsage)).cost;
		expect(fmtCostSummary(hiddenCosts.get(date))).toBe(fmtCostSummary(expected));
	}
});

test('timelineRangeModel assigns four intensity levels, caps parallel projects and breaks dominant ties by id', () => {
	const today = '2026-10-14';
	const days = [{ date: today, slotBlocks: [
		block(0, 'a', 5 * 60000),
		block(2, 'a', 12 * 60000),
		block(4, 'a', 20 * 60000),
		block(6, 'a', 24 * 60000),
		block(10, 'b', SLOT_MS),
		block(10, 'a', SLOT_MS),
		block(11, 'a', 10 * 60000),
		block(11, 'b', SLOT_MS),
	] }];
	const model = timelineRangeModel({ days, hidden: {}, today, page: 0, activeOnly: false, columns: 48 });
	const row = model.rows[0];
	expect([0, 2, 4, 6].map(slot => row.cells[slot].level)).toEqual([1, 2, 3, 4]);
	expect(row.cells[0].ms).toBe(5 * 60000);
	expect(row.cells[10].ms).toBe(SLOT_MS);
	expect(row.cells[10].level).toBe(4);
	expect(row.cells[10].by).toEqual({ b: SLOT_MS, a: SLOT_MS });
	expect(row.cells[10].dominant).toBe('a');
	expect(row.cells[11].dominant).toBe('b');
	expect(row.total).toBe(5 * 60000 + 12 * 60000 + 20 * 60000 + 24 * 60000 + 2 * SLOT_MS + 10 * 60000 + SLOT_MS);
	expect(row.projects).toEqual([{ projectId: 'a', name: 'A', colorIndex: 0, ms: 5 * 60000 + 12 * 60000 + 20 * 60000 + 24 * 60000 + SLOT_MS + 10 * 60000 }, { projectId: 'b', name: 'B', colorIndex: 0, ms: 2 * SLOT_MS }]);
	expect(model.profile[10]).toBe(SLOT_MS);
	expect(model.peak).toBe(10);
	expect(model.maxDay).toBe(row.total);
});

test('timelineRangeModel merges two slots per column at 24 columns and sums the page profile', () => {
	const today = '2026-10-14';
	const days = [
		{ date: '2026-10-13', slotBlocks: [block(0, 'a', 10 * 60000)] },
		{ date: today, slotBlocks: [block(0, 'a', 20 * 60000), block(2, 'a', 5 * 60000), block(10, 'a', SLOT_MS), block(11, 'b', SLOT_MS)] },
	];
	const model = timelineRangeModel({ days, hidden: {}, today, page: 0, activeOnly: false, columns: 24 });
	const row = model.rows[0];
	expect(row.cells).toHaveLength(24);
	expect(row.cells[5].by).toEqual({ a: SLOT_MS, b: SLOT_MS });
	expect(row.cells[5].ms).toBe(2 * SLOT_MS);
	expect(row.cells[5].level).toBe(4);
	expect(row.cells[5].dominant).toBe('a');
	expect(row.cells[10].level).toBe(0);
	expect(model.profile).toHaveLength(24);
	expect(model.profile[0]).toBe(30 * 60000);
	expect(model.profile[1]).toBe(5 * 60000);
	expect(model.profile[5]).toBe(2 * SLOT_MS);
	expect(model.peak).toBe(5);
});

test('timelineRangeModel paginates newest first, clamps out-of-range pages and keeps idle rows', () => {
	const today = '2026-10-19';
	const days = [];
	for (let offset = 34; offset >= 0; offset--) {
		const date = addDays(today, -offset);
		days.push({ date, slotBlocks: [block(0, 'a', SLOT_MS)] });
	}
	const first = timelineRangeModel({ days, hidden: {}, today, page: 0, activeOnly: false, columns: 48 });
	expect(first.pageCount).toBe(2);
	expect(first.currentPage).toBe(0);
	expect(first.rows).toHaveLength(TIMELINE_PAGE_DAYS);
	expect(first.rows[0].date).toBe(today);
	expect(first.rows[TIMELINE_PAGE_DAYS - 1].date).toBe(addDays(today, -(TIMELINE_PAGE_DAYS - 1)));
	const second = timelineRangeModel({ days, hidden: {}, today, page: 1, activeOnly: false, columns: 48 });
	expect(second.rows).toHaveLength(5);
	expect(second.rows[0].date).toBe(addDays(today, -TIMELINE_PAGE_DAYS));
	expect(second.rows[4].date).toBe(addDays(today, -34));
	const clamped = timelineRangeModel({ days, hidden: {}, today, page: 99, activeOnly: false, columns: 48 });
	expect(clamped.currentPage).toBe(1);
	expect(clamped.rows[0].date).toBe(addDays(today, -TIMELINE_PAGE_DAYS));
	expect(new Set([...first.rows, ...second.rows].map(row => row.date)).size).toBe(35);

	const idleDate = addDays(today, -1);
	const idleDays = [
		{ date: addDays(today, -2), slotBlocks: [block(0, 'a', SLOT_MS)] },
		{ date: idleDate, slotBlocks: [] },
		{ date: today, slotBlocks: [block(0, 'a', SLOT_MS)] },
	];
	const idleModel = timelineRangeModel({ days: idleDays, hidden: {}, today, page: 0, activeOnly: false, columns: 48 });
	const idle = idleModel.rows.find(row => row.date === idleDate);
	expect(idle).toMatchObject({ idle: true, total: 0, projects: [] });
	expect(idle.cells.every(cell => cell.level === 0 && cell.ms === 0 && cell.dominant === null)).toBe(true);
	expect(idleModel.summary).toMatchObject({ dayCount: 3, activeDays: 2, streak: 1 });
});

test('timelineRangeModel marks the first row of each calendar week and the first active row after a gap', () => {
	const today = '2026-10-18';
	const days = [];
	for (let offset = 7; offset >= 0; offset--) {
		const date = addDays(today, -offset);
		days.push({ date, slotBlocks: [block(0, 'a', SLOT_MS)] });
	}
	const calendar = timelineRangeModel({ days, hidden: {}, today, page: 0, activeOnly: false, columns: 48 });
	expect(calendar.rows.filter(row => row.newWeek).map(row => row.date)).toEqual(['2026-10-11']);
	expect(calendar.rows.find(row => row.date === '2026-10-12').newWeek).toBe(false);
	expect(calendar.rows.find(row => row.date === today).newWeek).toBe(false);

	const active = timelineRangeModel({
		days: [
			{ date: '2026-10-11', slotBlocks: [block(0, 'a', SLOT_MS)] },
			{ date: '2026-10-12', slotBlocks: [block(0, 'a', SLOT_MS)] },
		],
		hidden: {}, today: '2026-10-12', page: 0, activeOnly: true, columns: 48,
	});
	expect(active.rows.map(row => row.date)).toEqual(['2026-10-12', '2026-10-11']);
	expect(active.rows.find(row => row.date === '2026-10-11').newWeek).toBe(true);
});

test('timelineRangeModel activeOnly keeps calendar streaks broken by skipped idle days', () => {
	const today = '2026-10-19';
	const days = [
		{ date: '2026-10-12', slotBlocks: [block(0, 'a', SLOT_MS)] },
		{ date: '2026-10-14', slotBlocks: [block(0, 'a', SLOT_MS)] },
	];
	const model = timelineRangeModel({ days, hidden: {}, today, page: 0, activeOnly: true, columns: 48 });
	expect(model.rows.map(row => row.date)).toEqual(['2026-10-14', '2026-10-12']);
	expect(model.summary).toMatchObject({
		from: '2026-10-12', to: '2026-10-19', dayCount: 8,
		activeDays: 2, total: 2 * SLOT_MS, avg: SLOT_MS, streak: 1,
	});
	const hiddenModel = timelineRangeModel({ days, hidden: { a: true }, today, page: 0, activeOnly: true, columns: 48 });
	expect(hiddenModel.rows).toEqual([]);
	expect(hiddenModel.summary).toMatchObject({ activeDays: 0, total: 0, avg: 0, streak: 0 });
});

test('timelinePeak returns the earliest maximum inside the window', () => {
	expect(timelinePeak([0, 5, 5, 3], { start: 0, end: 4 })).toEqual({ slot: 1, value: 5 });
	expect(timelinePeak([0, 9, 5], { start: 1, end: 3 })).toEqual({ slot: 1, value: 9 });
	expect(timelinePeak([0, 0], { start: 0, end: 2 })).toBeNull();
});

test('timelineSlotDetail groups projects by duration and reports parallel projects', () => {
	const projects = [
		makeProject('p1', [
			makeSession({ id: 'p1a', slots: [{ slot: BASE_SLOT + 10, ms: SLOT_MS }], slotUsage: [usageOn(DAY, 10)] }),
			makeSession({ id: 'p1b', slots: [{ slot: BASE_SLOT + 10, ms: SLOT_MS / 2 }], slotUsage: [usageOn(DAY, 10, { uncached: 500, output: 50 })] }),
		]),
		makeProject('p2', [
			makeSession({ id: 'p2a', slots: [{ slot: BASE_SLOT + 10, ms: 10 * 60000 }], slotUsage: [usageOn(DAY, 10, { uncached: 200, output: 20 })] }),
		]),
	];
	const dateProjects = applyDate(projects, DAY);
	const day = { date: DAY, slotBlocks: [block(10, 'p1', SLOT_MS), block(10, 'p2', 10 * 60000)] };
	const model = timelineDayModel({ day, projects: dateProjects, hidden: {}, date: DAY });
	const detail = timelineSlotDetail(model, 10);
	expect(detail.projects.map(group => group.projectId)).toEqual(['p1', 'p2']);
	expect(detail.parallel).toBe(2);
	expect(detail.total.ms).toBe(SLOT_MS + 10 * 60000);
	expect(detail.total.tokens).toBe(model.slotTokens[10]);
	expect(detail.total.cost).toBe(model.slotCost[10]);
	expect(detail.projects[0].sessions.map(row => row.id)).toEqual(['p1a', 'p1b']);
});

test('timelineSlotDetail groups projects by duration and caps listed projects and sessions', () => {
	const sessions = [];
	for (let index = 0; index < POP_SESSIONS + 2; index++) {
		sessions.push(makeSession({ id: 's' + index, slots: [{ slot: BASE_SLOT + 10, ms: SLOT_MS }], slotUsage: [usageOn(DAY, 10)] }));
	}
	const projects = [makeProject('p', sessions)];
	const dateProjects = applyDate(projects, DAY);
	const day = { date: DAY, slotBlocks: [block(10, 'p', SLOT_MS)] };
	const model = timelineDayModel({ day, projects: dateProjects, hidden: {}, date: DAY });
	const detail = timelineSlotDetail(model, 10);
	expect(detail.projects).toHaveLength(1);
	expect(detail.projects[0].sessions).toHaveLength(POP_SESSIONS);
	expect(detail.projects[0].moreSessions).toBe(2);
	expect(detail.total.tokens).toBe(model.slotTokens[10]);
	expect(detail.total.cost).toBe(model.slotCost[10]);
	expect(detail.parallel).toBe(1);
	expect(detail.moreProjects).toBe(0);
});

test('timelineJumpSlot compares both half hours and prefers the earlier one on a tie', () => {
	const day = { slotBlocks: [
		block(10, 'a', 10 * 60000),
		block(11, 'b', 20 * 60000),
	] };
	expect(timelineJumpSlot(day, {}, 5, 2)).toBe(11);
	expect(timelineJumpSlot(day, { b: true }, 5, 2)).toBe(10);
	expect(timelineJumpSlot(day, {}, 10, 1)).toBe(10);
	expect(timelineJumpSlot(day, {}, 30, 2)).toBe(47);
	const tie = { slotBlocks: [
		block(10, 'a', 10 * 60000),
		block(11, 'b', 10 * 60000),
	] };
	expect(timelineJumpSlot(tie, {}, 5, 2)).toBe(10);
});

test('timeline page constants match the documented budget', () => {
	expect([TIMELINE_PAGE_DAYS, TIMELINE_LANE_PAGE, TIMELINE_SESSION_PAGE, POP_PROJECTS, POP_SESSIONS])
		.toEqual([30, 50, 50, 20, 10]);
});
