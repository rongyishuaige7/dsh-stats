import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
	overviewTotals, previousActiveDate, cnyAmount, costDelta, costShares,
	projectDaySpans, activeDayCount, sortProjects, defaultSortDir, pendingFocus,
	compareProjectCost, missingModels,
} = require('../src/client-overview-model.cjs');

function session(amount, subagent = false, status = 'exact') {
	return { id: 's-' + Math.random(), subagent, cost: { status, totals: amount == null ? [] : [{ currency: 'CNY', amount }] } };
}

function project(id, name, stats, sessions, extra = {}) {
	return {
		id, name, path: '/' + id, stats,
		sessions: sessions || [],
		sessionCount: (sessions || []).length,
		lastActiveAt: 0,
		...extra,
	};
}

const stats = (input, output, cacheRead, extra = {}) => ({
	turns: 1, steps: 1, llmMs: 1000, toolMs: 100,
	inputTokens: input, outputTokens: output, cacheRead,
	cacheHitPct: input > 0 ? Math.round(cacheRead / input * 100) : null,
	ttftMs: 100, ttftSteps: 1, decodeMs: 1000, decodeTokens: 50,
	...extra,
});

test('overviewTotals sums counters, sessions, cost and derived ratios', () => {
	const a = project('a', 'Alpha', stats(100, 40, 25, { turns: 2, steps: 3, llmMs: 1000, toolMs: 200, ttftMs: 300, ttftSteps: 3 }), [session(1), session(4, true)]);
	const b = project('b', 'Beta', stats(200, 60, 100, { turns: 4, steps: 5, llmMs: 2000, toolMs: 300, ttftMs: 100, ttftSteps: 1, decodeMs: 2000, decodeTokens: 100 }), [session(2.5)]);
	const totals = overviewTotals([a, b]);
	expect(totals).toMatchObject({
		projects: 2, main: 2, subagent: 1, turns: 6, steps: 8, llmMs: 3000, toolMs: 500,
		input: 300, output: 100, cacheRead: 125, ttftMs: 400, ttftSteps: 4,
		decodeMs: 3000, decodeTokens: 150, cacheHitPct: 42, ttftAvgMs: 100,
	});
	expect(totals.tps).toBeCloseTo(50, 8);
	expect(totals.cost.status).toBe('exact');
	expect(totals.cost.totals[0]).toMatchObject({ currency: 'CNY', amount: 7.5 });
	expect(overviewTotals([])).toMatchObject({ projects: 0, main: 0, subagent: 0, cacheHitPct: null, ttftAvgMs: null, tps: null });
});

test('previousActiveDate finds the preceding active day only', () => {
	const dates = ['2026-09-01', '2026-09-03', '2026-09-05'];
	expect(previousActiveDate(dates, '2026-09-03')).toBe('2026-09-01');
	expect(previousActiveDate(dates, '2026-09-05')).toBe('2026-09-03');
	expect(previousActiveDate(dates, '2026-09-01')).toBeNull();
	expect(previousActiveDate(dates, '2026-09-02')).toBeNull();
	expect(previousActiveDate([], '2026-09-01')).toBeNull();
});

test('cnyAmount accepts free, exact and estimated single-CNY summaries only', () => {
	expect(cnyAmount({ status: 'free', totals: [] })).toBe(0);
	expect(cnyAmount({ status: 'exact', totals: [{ currency: 'CNY', amount: 2 }] })).toBe(2);
	expect(cnyAmount({ status: 'estimated', totals: [{ currency: 'CNY', amount: 1.5 }] })).toBe(1.5);
	expect(cnyAmount({ status: 'partial', totals: [{ currency: 'CNY', amount: 1 }] })).toBeNull();
	expect(cnyAmount({ status: 'exact', totals: [{ currency: 'USD', amount: 1 }] })).toBeNull();
	expect(cnyAmount({ status: 'exact', totals: [{ currency: 'CNY', amount: 1 }, { currency: 'USD', amount: 2 }] })).toBeNull();
	expect(cnyAmount({ status: 'exact', totals: [] })).toBeNull();
	expect(cnyAmount(null)).toBeNull();
});

test('costDelta compares two CNY amounts and hides unsafe comparisons', () => {
	expect(costDelta({ status: 'exact', totals: [{ currency: 'CNY', amount: 12 }] }, { status: 'exact', totals: [{ currency: 'CNY', amount: 10 }] })).toEqual({ ratio: 0.2, direction: 'up' });
	expect(costDelta({ status: 'exact', totals: [{ currency: 'CNY', amount: 8 }] }, { status: 'exact', totals: [{ currency: 'CNY', amount: 10 }] })).toEqual({ ratio: -0.2, direction: 'down' });
	expect(costDelta({ status: 'exact', totals: [{ currency: 'CNY', amount: 10 }] }, { status: 'exact', totals: [{ currency: 'CNY', amount: 10 }] })).toEqual({ ratio: 0, direction: 'flat' });
	expect(costDelta({ status: 'partial', totals: [{ currency: 'CNY', amount: 12 }] }, { status: 'exact', totals: [{ currency: 'CNY', amount: 10 }] })).toBeNull();
	expect(costDelta({ status: 'exact', totals: [{ currency: 'CNY', amount: 12 }] }, { status: 'exact', totals: [{ currency: 'CNY', amount: 0 }] })).toBeNull();
	expect(costDelta(null, { status: 'exact', totals: [{ currency: 'CNY', amount: 10 }] })).toBeNull();
});

test('costShares uses visible project CNY totals and maps unpriced projects to null', () => {
	const a = project('a', 'Alpha', stats(1, 0, 0), [session(1)]);
	const b = project('b', 'Beta', stats(1, 0, 0), [session(3)]);
	const c = project('c', 'Charlie', stats(1, 0, 0), [session(null)]);
	const shares = costShares([a, b, c]);
	expect(shares.get('a')).toBe(0.25);
	expect(shares.get('b')).toBe(0.75);
	expect(shares.get('c')).toBeNull();
	expect([...costShares([c]).values()]).toEqual([null]);
});

test('projectDaySpans keeps exclusive end slots and merges per-project blocks', () => {
	const spans = projectDaySpans({ slotBlocks: [
		{ slot: 2, projectId: 'a' }, { slot: 3, projectId: 'a' }, { slot: 5, projectId: 'a' }, { slot: 4, projectId: 'b' },
	] });
	expect(spans.get('a')).toEqual({ startSlot: 2, endSlot: 6 });
	expect(spans.get('b')).toEqual({ startSlot: 4, endSlot: 5 });
	expect(projectDaySpans(null).size).toBe(0);
});

test('activeDayCount counts days with at least one visible project block', () => {
	const timeline = { days: [
		{ date: '2026-09-01', slotBlocks: [{ projectId: 'b' }] },
		{ date: '2026-09-02', slotBlocks: [{ projectId: 'a' }] },
		{ date: '2026-09-03', slotBlocks: [] },
		{ date: '2026-09-04', slotBlocks: [{ projectId: 'a' }, { projectId: 'b' }] },
	] };
	expect(activeDayCount(timeline)).toBe(3);
	expect(activeDayCount(timeline, { b: true })).toBe(2);
	expect(activeDayCount({ days: [] }, { a: true })).toBe(0);
});

test('sortProjects covers every key, direction and stable name tie-break', () => {
	const projectStats = (input, output, cacheRead, llmMs) => stats(input, output, cacheRead, { llmMs });
	const a = project('a', 'Alpha', projectStats(100, 20, 50, 1000), [session(3)], { sessionCount: 2, lastActiveAt: 100 });
	const b = project('b', 'Beta', projectStats(150, 50, 0, 500), [session(5)], { sessionCount: 1, lastActiveAt: 300 });
	const c = project('c', 'Charlie', projectStats(30, 20, 3, 200), [session(1)], { sessionCount: 3, lastActiveAt: 200 });
	const names = list => list.map(p => p.name);
	expect(names(sortProjects([a, b, c], 'name', 1))).toEqual(['Alpha', 'Beta', 'Charlie']);
	const numeric = [project('n10', 'Project 10', projectStats(1, 0, 0, 0), []), project('n2', 'Project 2', projectStats(1, 0, 0, 0), [])];
	expect(names(sortProjects(numeric, 'name', 1))).toEqual(['Project 2', 'Project 10']);
	expect(names(sortProjects([a, b, c], 'cost', -1))).toEqual(['Beta', 'Alpha', 'Charlie']);
	expect(names(sortProjects([a, b, c], 'sessions', -1))).toEqual(['Charlie', 'Alpha', 'Beta']);
	expect(names(sortProjects([a, b, c], 'tokens', -1))).toEqual(['Beta', 'Alpha', 'Charlie']);
	expect(names(sortProjects([a, b, c], 'hit', -1))).toEqual(['Alpha', 'Charlie', 'Beta']);
	expect(names(sortProjects([a, b, c], 'llm', -1))).toEqual(['Alpha', 'Beta', 'Charlie']);
	expect(names(sortProjects([a, b, c], 'last', -1))).toEqual(['Beta', 'Charlie', 'Alpha']);
	const spans = new Map([['a', { endSlot: 10 }], ['b', { endSlot: 5 }]]);
	expect(names(sortProjects([a, b, c], 'last', -1, { dayMode: true, spans }))).toEqual(['Alpha', 'Beta', 'Charlie']);
	const tieA = project('a', 'Alpha', projectStats(1, 0, 0, 0), [session(2)]);
	const tieB = project('b', 'Beta', projectStats(1, 0, 0, 0), [session(2)]);
	expect(names(sortProjects([tieB, tieA], 'cost', -1))).toEqual(['Alpha', 'Beta']);
	expect(compareProjectCost(tieA, tieB)).toBe(0);
	expect(defaultSortDir('name')).toBe(1);
	expect(defaultSortDir('cost')).toBe(-1);
});

test('pendingFocus returns the highest-token unpriced model and ignores subscriptions', () => {
	const projects = [project('a', 'Alpha', stats(1, 0, 0), [{ slotUsage: [
		{ providerId: 'p', modelRaw: 'm1', cost: { unpricedTokens: 3, status: 'estimated' } },
		{ providerId: 'p', modelRaw: 'm2', cost: { unpricedTokens: 10, status: 'estimated' } },
	] }, { slotUsage: [
		{ providerId: 'p', modelRaw: 'm1', cost: { unpricedTokens: 4, status: 'estimated' } },
		{ providerId: 'p', modelRaw: 'sub', cost: { unpricedTokens: 99, status: 'subscription' } },
	] }])];
	expect(missingModels(projects)).toEqual([
		{ provider: 'p', model: 'm2', tokens: 10 },
		{ provider: 'p', model: 'm1', tokens: 7 },
	]);
	expect(pendingFocus(projects)).toEqual({ provider: 'p', model: 'm2', tokens: 10 });
	expect(pendingFocus([])).toBeNull();
});
