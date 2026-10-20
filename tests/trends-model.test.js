import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
	RANGES, HEAT_WEEKS, MODEL_COLORS, TRENDS_PREF_DEFAULTS,
	normalizeTrendsPrefs, amountOf, isPartial, rangeDates, previousDates,
	dayPoints, metricValue, rangeTotals, niceMax, fmtAxisCost, xLabels,
	heatWindow, heatCells, heatLevel, heatMonths, streaks,
	modelColorIndexes, modelValue, modelShares, topModel, ringStops,
	defaultModelSort, sortModels,
} = require('../src/client-trends-model.cjs');
const { dayStartMs, modelAgg, sessionDayTokens } = require('../src/client-data.cjs');
const { dayCostSummaries } = require('../src/client-timeline-model.cjs');
const { SLOT_MS, summarizeCosts } = require('../src/client-format.cjs');

const TODAY = '2026-09-08';

function summary(status, amount, extra = {}) {
	return {
		status,
		totals: amount == null ? [] : [{ currency: 'CNY', amount, exactAmount: amount, estimatedAmount: 0 }],
		unpricedTokens: 0, unknownRows: 0,
		...extra,
	};
}

function modelRow(key, overrides = {}) {
	return {
		key, model: key, modelRaw: key, providerId: 'deepseek', accountType: 'api',
		sessions: 1, input: 1000, output: 100, cacheRead: 0, cacheWrite: 0, reasoning: 0, llmMs: 0,
		costSummary: summary('exact', 1),
		...overrides,
	};
}

test('trends constants keep the locked ranges, heat window and default prefs', () => {
	expect(RANGES).toEqual([7, 30, 90]);
	expect(HEAT_WEEKS).toBe(26);
	expect(MODEL_COLORS).toBe(8);
	expect(TRENDS_PREF_DEFAULTS).toEqual({ range: 30, metric: 'cost' });
	expect(Object.isFrozen(TRENDS_PREF_DEFAULTS)).toBe(true);
});

test('normalizeTrendsPrefs falls back to 30 days and cost for anything unexpected', () => {
	const defaults = { range: 30, metric: 'cost' };
	expect(normalizeTrendsPrefs(null)).toEqual(defaults);
	expect(normalizeTrendsPrefs(undefined)).toEqual(defaults);
	expect(normalizeTrendsPrefs([])).toEqual(defaults);
	expect(normalizeTrendsPrefs(14)).toEqual(defaults);
	expect(normalizeTrendsPrefs({ range: 14 })).toEqual(defaults);
	expect(normalizeTrendsPrefs({ range: '30' })).toEqual(defaults);
	expect(normalizeTrendsPrefs({ metric: 'x' })).toEqual(defaults);
	expect(normalizeTrendsPrefs({ range: 7, metric: 'token' })).toEqual({ range: 7, metric: 'token' });
	expect(normalizeTrendsPrefs({ range: 90, metric: 'cost' })).toEqual({ range: 90, metric: 'cost' });
	expect(normalizeTrendsPrefs({ range: 30, metric: 'token', extra: true })).toEqual({ range: 30, metric: 'token' });
	const normalized = normalizeTrendsPrefs(TRENDS_PREF_DEFAULTS);
	expect(normalized).not.toBe(TRENDS_PREF_DEFAULTS);
});

test('amountOf reads the CNY total for every priced status, partial included', () => {
	expect(amountOf(summary('exact', 2))).toBe(2);
	expect(amountOf(summary('estimated', 1.5))).toBe(1.5);
	expect(amountOf(summary('partial', 1.25))).toBe(1.25);
	expect(amountOf(summary('free', null))).toBe(0);
	expect(amountOf(summary('free', 0))).toBe(0);
	expect(amountOf(summarizeCosts([]))).toBe(0);
	expect(amountOf(null)).toBe(0);
	expect(amountOf({ status: 'partial', totals: [{ currency: 'USD', amount: 3 }] })).toBe(0);
});

test('isPartial covers partial status and exact summaries with unpriced tokens', () => {
	expect(isPartial(summary('partial', 1))).toBe(true);
	expect(isPartial(summary('exact', 1, { unpricedTokens: 1200 }))).toBe(true);
	expect(isPartial(summary('estimated', 1, { unpricedTokens: 1 }))).toBe(true);
	expect(isPartial(summary('exact', 1))).toBe(false);
	expect(isPartial(summary('estimated', 1))).toBe(false);
	expect(isPartial(summary('free', null))).toBe(false);
	expect(isPartial(summarizeCosts([]))).toBe(false);
	expect(isPartial(null)).toBe(false);
});

test('rangeDates and previousDates end at today and cover the preceding period', () => {
	const current = rangeDates(TODAY, 30);
	expect(current).toHaveLength(30);
	expect(current[0]).toBe('2026-08-10');
	expect(current[29]).toBe(TODAY);
	expect(rangeDates(TODAY, 7)).toEqual([
		'2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', TODAY,
	]);
	expect(rangeDates(TODAY, 90)[0]).toBe('2026-06-11');
	const previous = previousDates(TODAY, 30);
	expect(previous).toHaveLength(30);
	expect(previous[0]).toBe('2026-07-11');
	expect(previous[29]).toBe('2026-08-09');
	// 跨年
	expect(rangeDates('2026-01-03', 7)).toEqual([
		'2025-12-28', '2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02', '2026-01-03',
	]);
	expect(previousDates('2026-01-03', 7)[0]).toBe('2025-12-21');
	expect(previousDates('2026-01-03', 7)[6]).toBe('2025-12-27');
	expect(rangeDates(TODAY, 0)).toEqual([]);
	expect(previousDates(TODAY, 0)).toEqual([]);
	expect(rangeDates('not-a-date', 7)).toEqual([]);
});

test('dayPoints fills missing days with zeroes and a neutral cost summary', () => {
	const byDay = new Map([
		['2026-09-07', { input: 1200, output: 300, cacheRead: 400, uncached: 800, reasoning: 50 }],
	]);
	const dayCosts = new Map([['2026-09-07', summary('exact', 1.5)]]);
	const points = dayPoints(['2026-09-06', '2026-09-07'], byDay, dayCosts);
	expect(points).toHaveLength(2);
	expect(points[0]).toMatchObject({
		date: '2026-09-06', input: 0, output: 0, cacheRead: 0, uncached: 0,
		reasoning: 0, tokens: 0, amount: 0, partial: false, active: false,
	});
	expect(points[0].cost).toEqual(summarizeCosts([]));
	expect(points[1]).toMatchObject({
		date: '2026-09-07', input: 1200, output: 300, cacheRead: 400, uncached: 800,
		reasoning: 50, tokens: 1500, amount: 1.5, partial: false, active: true,
	});
	expect(points[1].cost).toBe(dayCosts.get('2026-09-07'));
	expect(metricValue(points[1], 'cost')).toBe(1.5);
	expect(metricValue(points[1], 'token')).toBe(1500);
	expect(metricValue(points[0], 'token')).toBe(0);
});

test('dayPoints never reports negative uncached tokens and marks partial days', () => {
	const points = dayPoints(
		['2026-09-07'],
		new Map([['2026-09-07', { input: 100, output: 0, cacheRead: 300 }]]),
		new Map([['2026-09-07', summary('partial', 2, { unpricedTokens: 40 })]]),
	);
	expect(points[0].uncached).toBe(0);
	expect(points[0].partial).toBe(true);
	expect(points[0].amount).toBe(2);
	expect(dayPoints(['2026-09-07'], undefined, undefined)[0].active).toBe(false);
});

test('rangeTotals sums the range and its cost equals the sum of the daily amounts', () => {
	const points = dayPoints(
		['2026-09-06', '2026-09-07', '2026-09-08'],
		new Map([
			['2026-09-07', { input: 1200, output: 300, cacheRead: 400, uncached: 800, reasoning: 50 }],
			['2026-09-08', { input: 500, output: 100, cacheRead: 100, uncached: 400, reasoning: 10 }],
		]),
		new Map([
			['2026-09-07', summary('exact', 1.5)],
			['2026-09-08', summary('partial', 0.25, { unpricedTokens: 90 })],
		]),
	);
	const totals = rangeTotals(points);
	expect(totals).toMatchObject({
		input: 1700, output: 400, cacheRead: 500, uncached: 1200,
		reasoning: 60, tokens: 2100, activeDays: 2, days: 3,
	});
	const dailySum = points.reduce((sum, point) => sum + amountOf(point.cost), 0);
	expect(amountOf(totals.cost)).toBeCloseTo(dailySum, 10);
	expect(isPartial(totals.cost)).toBe(true);
	expect(rangeTotals([])).toMatchObject({ tokens: 0, activeDays: 0, days: 0 });
	expect(amountOf(rangeTotals([]).cost)).toBe(0);
});

test('niceMax rounds up to the next 1-2-2.5-3-5-10 step without float tails', () => {
	expect(niceMax(0)).toBe(1);
	expect(niceMax(-5)).toBe(1);
	expect(niceMax(NaN)).toBe(1);
	expect(niceMax(0.004)).toBe(0.004);
	expect(niceMax(0.3)).toBe(0.3);
	expect(String(niceMax(0.3))).toBe('0.3');
	expect(niceMax(0.8)).toBe(0.8);
	expect(niceMax(1)).toBe(1);
	expect(niceMax(1.01)).toBe(1.2);
	expect(niceMax(12.3)).toBe(15);
	expect(niceMax(99)).toBe(100);
	expect(niceMax(2400)).toBe(2500);
});

test('fmtAxisCost keeps the axis labels short', () => {
	expect(fmtAxisCost(0)).toBe('¥0');
	expect(fmtAxisCost(0.25)).toBe('¥0.25');
	expect(fmtAxisCost(0.5)).toBe('¥0.5');
	expect(fmtAxisCost(7.5)).toBe('¥7.5');
	expect(fmtAxisCost(15)).toBe('¥15');
	expect(fmtAxisCost(150)).toBe('¥150');
	expect(fmtAxisCost(1500)).toBe('¥1.5k');
	expect(fmtAxisCost(1000)).toBe('¥1k');
	expect(fmtAxisCost(-1)).toBe('¥0');
});

test('xLabels follows the 7/30/90 day rules and dodges the today label', () => {
	const texts = (n) => xLabels(rangeDates(TODAY, n), TODAY).map(label => (
		label.kind === 'today' ? '今天'
			: label.kind === 'month' ? `${Number(label.date.slice(5, 7))}月`
				: label.date.slice(5)
	));
	expect(texts(30)).toEqual(['08-10', '08-17', '08-24', '08-31', '今天']);
	expect(texts(7)).toEqual(['09-02', '09-03', '09-04', '09-05', '09-06', '09-07', '今天']);
	expect(texts(90)).toEqual(['7月', '8月', '今天']);
	expect(xLabels(rangeDates(TODAY, 90), TODAY).map(label => label.kind)).toEqual(['month', 'month', 'today']);
	expect(xLabels(rangeDates(TODAY, 30), TODAY).every(label => label.index >= 0 && label.index < 30)).toBe(true);
	expect(xLabels([], TODAY)).toEqual([]);
});

test('heatWindow starts on the Monday 25 weeks back and stops at today', () => {
	const window = heatWindow(TODAY);
	expect(window.start).toBe('2026-03-16');
	expect(window.dates).toHaveLength(177);
	expect(window.dates[0]).toBe('2026-03-16');
	expect(window.dates[176]).toBe(TODAY);
	expect(new Date(window.start + 'T00:00:00Z').getUTCDay()).toBe(1);
	// 周一时最后一列只有一格，周日时正好 26 个整列。
	expect(heatWindow('2026-09-07')).toMatchObject({ start: '2026-03-16' });
	expect(heatWindow('2026-09-07').dates).toHaveLength(176);
	expect(heatWindow('2026-09-13').dates).toHaveLength(182);
	expect(heatWindow('2026-09-13').dates[181]).toBe('2026-09-13');
	expect(heatWindow('bad')).toEqual({ start: null, dates: [] });
});

test('heatCells maps every window date to a column and row without future cells', () => {
	const window = heatWindow(TODAY);
	const values = new Map([
		['2026-03-16', { value: 2, active: true }],
		['2026-09-07', { value: 3, active: true }],
		[TODAY, { value: 5, active: true }],
	]);
	const cells = heatCells(window, values, TODAY);
	expect(cells).toHaveLength(177);
	expect(cells[0]).toMatchObject({ date: '2026-03-16', column: 1, row: 1, level: 2, active: true, today: false });
	expect(cells[6]).toMatchObject({ date: '2026-03-22', column: 1, row: 7 });
	expect(cells.filter(cell => cell.column === 26).map(cell => cell.row)).toEqual([1, 2]);
	expect(cells[cells.length - 1]).toMatchObject({ date: TODAY, column: 26, row: 2, level: 4, active: true, today: true });
	expect(cells.every(cell => cell.date <= TODAY)).toBe(true);
	expect(cells.every(cell => cell.column >= 1 && cell.column <= 26 && cell.row >= 1 && cell.row <= 7)).toBe(true);
	expect(cells.filter(cell => !cell.active).every(cell => cell.level === 0)).toBe(true);
	// 传进来的未来日期不渲染
	const trimmed = heatCells({ start: window.start, dates: window.dates.concat(['2026-09-09']) }, values, TODAY);
	expect(trimmed).toHaveLength(177);
});

test('heatLevel uses quantiles for four or more active days and ratios otherwise', () => {
	const ten = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
	expect(heatLevel(10, ten)).toBe(4);
	expect(heatLevel(9, ten)).toBe(4);
	expect(heatLevel(8, ten)).toBe(3);
	expect(heatLevel(7, ten)).toBe(3);
	expect(heatLevel(6, ten)).toBe(2);
	expect(heatLevel(4, ten)).toBe(2);
	expect(heatLevel(3, ten)).toBe(1);
	expect(heatLevel(1, ten)).toBe(1);
	expect(heatLevel(1, [1, 2, 3])).toBe(2);
	expect(heatLevel(2, [1, 2, 3])).toBe(3);
	expect(heatLevel(3, [1, 2, 3])).toBe(4);
	// 第 25 与第 75 分位相等时退回比例
	expect(heatLevel(5, [5, 5, 5, 5])).toBe(4);
	expect(heatLevel(0, ten)).toBe(1);
	expect(heatLevel(5, [])).toBe(1);
	expect(heatLevel(0, [0, 0, 0, 0])).toBe(1);
});

test('heatMonths labels the week holding the 1st and drops the first column when crowded', () => {
	expect(heatMonths(heatWindow(TODAY))).toEqual([
		{ column: 3, month: 4 },
		{ column: 7, month: 5 },
		{ column: 12, month: 6 },
		{ column: 16, month: 7 },
		{ column: 20, month: 8 },
		{ column: 25, month: 9 },
	]);
	expect(heatMonths({ start: '2026-03-16', dates: heatWindow(TODAY).dates }, date => Number(date.slice(5, 7))))
		.toEqual(heatMonths(heatWindow(TODAY)));
	expect(heatMonths({ start: null, dates: [] })).toEqual([]);
});

test('streaks counts the current run from today or yesterday and prefers the later longest run', () => {
	const window = heatWindow(TODAY);
	const today = streaks(new Set(['2026-09-06', '2026-09-07', TODAY]), window, TODAY);
	expect(today).toMatchObject({ active: 3, total: 177, current: 3, currentEnd: 'today', longest: 3 });
	expect(today.longestStart).toBe('2026-09-06');
	expect(today.longestEnd).toBe(TODAY);
	const yesterday = streaks(new Set(['2026-09-05', '2026-09-06', '2026-09-07']), window, TODAY);
	expect(yesterday).toMatchObject({ current: 3, currentEnd: 'yesterday' });
	const neither = streaks(new Set(['2026-09-01']), window, TODAY);
	expect(neither).toMatchObject({ active: 1, current: 0, currentEnd: null, longest: 1 });
	// 两段等长时取较晚的一段
	const tie = streaks(new Set(['2026-08-01', '2026-08-02', '2026-09-06', '2026-09-07']), window, TODAY);
	expect(tie.longest).toBe(2);
	expect(tie.longestStart).toBe('2026-09-06');
	expect(tie.longestEnd).toBe('2026-09-07');
	const empty = streaks(new Set(), window, TODAY);
	expect(empty).toMatchObject({ active: 0, current: 0, currentEnd: null, longest: 0, longestStart: null, longestEnd: null });
});

test('modelColorIndexes colors the first eight models by tokens and leaves the rest gray', () => {
	const rows = [];
	for (let i = 1; i <= 9; i++) rows.push(modelRow('k' + i, { input: 1000 - i * 100, output: 0 }));
	const indexes = modelColorIndexes(rows.slice().reverse());
	expect(indexes.size).toBe(MODEL_COLORS);
	expect(indexes.get('k1')).toBe(0);
	expect(indexes.get('k8')).toBe(7);
	expect(indexes.has('k9')).toBe(false);
	// 并列时按 key 升序，和输入顺序无关
	const tied = [modelRow('b', { input: 500 }), modelRow('a', { input: 500 })];
	expect([...modelColorIndexes(tied)]).toEqual([['a', 0], ['b', 1]]);
	expect([...modelColorIndexes(tied.slice().reverse())]).toEqual([['a', 0], ['b', 1]]);
});

test('modelShares and topModel follow the metric and fall back to tokens when cost is zero', () => {
	const rows = [
		modelRow('a', { input: 100, output: 0, costSummary: summary('exact', 3) }),
		modelRow('b', { input: 200, output: 0, costSummary: summary('exact', 1) }),
		modelRow('c', { input: 700, output: 0, costSummary: summary('partial', 0, { unpricedTokens: 10 }) }),
	];
	expect(modelValue(rows[0], 'cost')).toBe(3);
	expect(modelValue(rows[0], 'token')).toBe(100);
	const costShares = modelShares(rows, 'cost');
	expect(costShares.get('a')).toBeCloseTo(0.75, 12);
	expect(costShares.get('b')).toBeCloseTo(0.25, 12);
	expect(costShares.get('c')).toBe(0);
	const tokenShares = modelShares(rows, 'token');
	expect(tokenShares.get('c')).toBeCloseTo(0.7, 12);
	expect(topModel(rows, 'cost')).toEqual({ row: rows[0], metric: 'cost' });
	expect(topModel(rows, 'token')).toEqual({ row: rows[2], metric: 'token' });
	// 费用为 0 时改按 Token 取
	const freeRows = [
		modelRow('a', { input: 10, costSummary: summary('free', null) }),
		modelRow('b', { input: 50, costSummary: summary('free', null) }),
	];
	expect(topModel(freeRows, 'cost')).toEqual({ row: freeRows[1], metric: 'token' });
	// 并列时先比 Token 再比名字
	const tied = [
		modelRow('b', { input: 100, costSummary: summary('exact', 1) }),
		modelRow('a', { input: 100, costSummary: summary('exact', 1) }),
		modelRow('c', { input: 300, costSummary: summary('exact', 1) }),
	];
	expect(topModel(tied, 'cost').row.key).toBe('c');
	expect(topModel(tied.slice(0, 2), 'cost').row.key).toBe('a');
	expect(topModel([], 'cost')).toBeNull();
	expect(modelShares([modelRow('a', { costSummary: summary('free', null) })], 'cost').get('a')).toBe(0);
});

test('ringStops merges uncolored models into a last gray segment that closes at 360', () => {
	const rows = [modelRow('a'), modelRow('b'), modelRow('c'), modelRow('d')];
	const shares = new Map([['a', 0.5], ['b', 0.3], ['c', 0.1], ['d', 0.1]]);
	const colors = new Map([['a', 0], ['b', 1]]);
	const stops = ringStops(rows, shares, colors);
	expect(stops.map(stop => stop.colorIndex)).toEqual([0, 1, null]);
	expect(stops[0]).toMatchObject({ from: 0, to: 180, share: 0.5, keys: ['a'] });
	expect(stops[1].from).toBe(180);
	expect(stops[1].to).toBe(288);
	expect(stops[2].from).toBe(288);
	expect(stops[2].to).toBe(360);
	expect(stops[2].share).toBeCloseTo(0.2, 12);
	expect(stops[2].keys).toEqual(['c', 'd']);
	for (let i = 1; i < stops.length; i++) expect(stops[i].from).toBe(stops[i - 1].to);
	// 没有"其他"时最后一段自己收口
	const coloredOnly = ringStops(rows.slice(0, 2), new Map([['a', 0.5], ['b', 0.5]]), colors);
	expect(coloredOnly.map(stop => stop.to)).toEqual([180, 360]);
	expect(ringStops(rows, new Map([['a', 0]]), colors)).toEqual([]);
	// 按占比降序，不依赖输入顺序
	expect(ringStops([rows[1], rows[0]], shares, colors)[0].keys).toEqual(['a']);
});

test('sortModels covers every key, both directions and the token/name tie-breaks', () => {
	expect(defaultModelSort('cost')).toEqual({ key: 'cost', dir: -1 });
	expect(defaultModelSort('token')).toEqual({ key: 'tokens', dir: -1 });
	const rows = [
		modelRow('zeta', { sessions: 2, input: 100, output: 0, cacheRead: 25, llmMs: 1000, costSummary: summary('exact', 2) }),
		modelRow('alpha', { sessions: 5, input: 300, output: 0, cacheRead: 300, llmMs: 500, costSummary: summary('exact', 1) }),
		modelRow('beta', { sessions: 2, input: 300, output: 0, cacheRead: 0, llmMs: 2000, costSummary: summary('exact', 2) }),
	];
	const original = rows.slice();
	expect(sortModels(rows, 'name', 1, 'cost').map(row => row.key)).toEqual(['alpha', 'beta', 'zeta']);
	expect(sortModels(rows, 'name', -1, 'cost').map(row => row.key)).toEqual(['zeta', 'beta', 'alpha']);
	expect(sortModels(rows, 'sessions', -1, 'cost').map(row => row.key)).toEqual(['alpha', 'beta', 'zeta']);
	expect(sortModels(rows, 'tokens', -1, 'cost').map(row => row.key)).toEqual(['alpha', 'beta', 'zeta']);
	expect(sortModels(rows, 'hit', -1, 'cost').map(row => row.key)).toEqual(['alpha', 'zeta', 'beta']);
	expect(sortModels(rows, 'llm', -1, 'cost').map(row => row.key)).toEqual(['beta', 'zeta', 'alpha']);
	expect(sortModels(rows, 'cost', -1, 'cost').map(row => row.key)).toEqual(['beta', 'zeta', 'alpha']);
	expect(sortModels(rows, 'cost', 1, 'cost').map(row => row.key)).toEqual(['alpha', 'beta', 'zeta']);
	// 省略方向时取该列的默认方向
	expect(sortModels(rows, 'name').map(row => row.key)).toEqual(['alpha', 'beta', 'zeta']);
	expect(sortModels(rows, 'cost').map(row => row.key)).toEqual(['beta', 'zeta', 'alpha']);
	// 不修改输入
	expect(rows).toEqual(original);
	const sorted = sortModels(rows, 'cost', -1, 'cost');
	expect(sorted).not.toBe(rows);
});

// 两模型、两天、一天部分计价的夹具：modelAgg 各行金额之和必须等于 rangeTotals 的金额。
function usageOn(day, slot, overrides = {}) {
	return {
		slot: dayStartMs(day) / SLOT_MS + slot,
		model: 'MiniMax-M3', providerId: 'minimax', accountType: 'api',
		serviceTier: 'standard', contextTokens: 300000,
		uncached: 1000, output: 100, cacheRead: 10000, cacheWrite: 0, reasoning: 0,
		...overrides,
	};
}

function sessionOn(id, day, slotUsage) {
	return {
		id, title: id, updatedAt: dayStartMs(day) + 3600000, createdAt: dayStartMs(day),
		subagent: false, stats: {}, slotUsage,
	};
}

test('modelAgg amounts add up to rangeTotals for a two-model, two-day partial fixture', () => {
	const day1 = '2026-10-14';
	const day2 = '2026-10-15';
	const sessions = [
		sessionOn('a1', day1, [usageOn(day1, 10)]),
		sessionOn('a2', day2, [usageOn(day2, 10)]),
		// cacheWrite 没有对应单价，第二天因此带待计价 Token。
		sessionOn('b1', day2, [usageOn(day2, 11, { model: 'deepseek-v4-pro', providerId: 'deepseek', cacheWrite: 200 })]),
	];
	const projects = [{ id: 'p', name: 'p', path: '/p', sessionCount: sessions.length, subagentCount: 0, lastActiveAt: 0, sessions }];
	const byDay = sessionDayTokens(sessions);
	const dayCosts = dayCostSummaries(projects, {});
	expect(byDay).toBeInstanceOf(Map);
	expect(dayCosts).toBeInstanceOf(Map);

	const points = dayPoints([day1, day2], byDay, dayCosts);
	const totals = rangeTotals(points);
	expect(points[0].partial).toBe(false);
	expect(points[1].partial).toBe(true);
	expect(points[1].cost.unpricedTokens).toBe(200);
	expect(totals.activeDays).toBe(2);

	const models = modelAgg(sessions);
	expect(models).toHaveLength(2);
	const modelAmount = models.reduce((sum, row) => sum + amountOf(row.costSummary), 0);
	expect(modelAmount).toBeGreaterThan(0);
	expect(amountOf(totals.cost)).toBeGreaterThan(0);
	expect(Math.abs(modelAmount - amountOf(totals.cost))).toBeLessThan(1e-6);
	expect(Math.abs(modelValue(models[0], 'cost') + modelValue(models[1], 'cost') - amountOf(totals.cost))).toBeLessThan(1e-6);
});
