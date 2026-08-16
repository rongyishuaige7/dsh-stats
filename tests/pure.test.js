// Phase E 纯函数测试：直接 require 真实 client 源码（通过 __test 钩子暴露），
// 确保测试验证的是生产实现而非副本。
const client = require('../src/client.cjs');
const {
	localDayKey, emptyBucket, addBucket, sessionDayTokens,
	monthlyFromDays, weeklyFromDays, modelAgg, streakAndActive,
	costOf, fmtN, fmtTokens, fmtCost, fmtDuration,
	applyDate, activityDates, fmtDateCN,
} = client.__test;

// ---------------------------------------------------------------------------
// localDayKey
// ---------------------------------------------------------------------------
test('localDayKey returns YYYY-MM-DD', () => {
	expect(localDayKey(new Date('2025-03-15T14:30:00').getTime())).toBe('2025-03-15');
	expect(localDayKey(new Date('2026-01-01T00:00:00').getTime())).toBe('2026-01-01');
});

// ---------------------------------------------------------------------------
// emptyBucket / addBucket
// ---------------------------------------------------------------------------
test('emptyBucket has all fields', () => {
	const b = emptyBucket();
	expect(b.turns).toBe(0);
	expect(b.output).toBe(0);
	expect(b.reasoning).toBe(0);
	expect(b.input).toBe(0);
});

test('addBucket accumulates and computes input', () => {
	const a = emptyBucket();
	addBucket(a, { turns: 5, output: 3000, uncached: 8000, cacheRead: 5000, cacheWrite: 1000, reasoning: 2000 });
	expect(a.turns).toBe(5);
	expect(a.output).toBe(3000);
	expect(a.reasoning).toBe(2000);
	expect(a.input).toBe(14000); // uncached + cacheRead + cacheWrite
});

test('addBucket is additive across calls', () => {
	const a = emptyBucket();
	addBucket(a, { output: 100, uncached: 100, cacheRead: 0, cacheWrite: 0 });
	addBucket(a, { output: 200, uncached: 200, cacheRead: 0, cacheWrite: 0 });
	expect(a.output).toBe(300);
	expect(a.input).toBe(300);
});

test('addBucket handles null/undefined gracefully', () => {
	const a = emptyBucket();
	addBucket(a, { turns: null, steps: undefined, output: 0, uncached: 0, cacheRead: 0, cacheWrite: 0 });
	expect(a.turns).toBe(0);
	expect(a.steps).toBe(0);
});

// ---------------------------------------------------------------------------
// sessionDayTokens
// ---------------------------------------------------------------------------
test('sessionDayTokens groups sessions by day (fallback path)', () => {
	const sessions = [
		{ id: 's1', updatedAt: new Date('2025-03-15T10:00:00').getTime(), stats: { outputTokens: 100, uncached: 200, cacheRead: 50, cacheWrite: 0, reasoning: 10, inputTokens: 250 } },
		{ id: 's2', updatedAt: new Date('2025-03-15T15:00:00').getTime(), stats: { outputTokens: 200, uncached: 300, cacheRead: 100, cacheWrite: 0, reasoning: 20, inputTokens: 400 } },
		{ id: 's3', updatedAt: new Date('2025-03-16T09:00:00').getTime(), stats: { outputTokens: 50, uncached: 100, cacheRead: 0, cacheWrite: 0, reasoning: 5, inputTokens: 100 } },
	];
	const byDay = sessionDayTokens(sessions);
	expect(byDay.has('2025-03-15')).toBe(true);
	expect(byDay.has('2025-03-16')).toBe(true);
	expect(byDay.get('2025-03-15').output).toBe(300);
	expect(byDay.get('2025-03-15').reasoning).toBe(30);
});

test('sessionDayTokens uses createdAt as fallback', () => {
	const sessions = [
		{ id: 's1', updatedAt: null, createdAt: new Date('2025-03-15T10:00:00').getTime(), stats: { outputTokens: 100, uncached: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, inputTokens: 100 } },
	];
	const byDay = sessionDayTokens(sessions);
	expect(byDay.has('2025-03-15')).toBe(true);
});

test('sessionDayTokens skips sessions without timestamps', () => {
	const sessions = [
		{ id: 's1', updatedAt: null, createdAt: null, stats: { outputTokens: 100, uncached: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, inputTokens: 0 } },
		{ id: 's2', updatedAt: new Date('2025-03-15T10:00:00').getTime(), stats: { outputTokens: 200, uncached: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, inputTokens: 0 } },
	];
	const byDay = sessionDayTokens(sessions);
	expect(byDay.size).toBe(1);
});

test('sessionDayTokens distributes slotUsage tokens across actual days', () => {
	var d1 = new Date('2025-03-12T00:00:00');
	var d2 = new Date('2025-03-13T00:00:00');
	var slot1 = Math.floor(d1.getTime() / 1800000);
	var slot2 = Math.floor(d2.getTime() / 1800000);
	const sessions = [
		{
			id: 's1',
			updatedAt: d2.getTime(),
			stats: { turns: 5, steps: 20, llmMs: 60000, toolMs: 0, outputTokens: 0, uncached: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, inputTokens: 0 },
			slotUsage: [
				{ slot: slot1, uncached: 1000, output: 200, cacheRead: 500, cacheWrite: 0, reasoning: 100 },
				{ slot: slot2, uncached: 2000, output: 400, cacheRead: 0, cacheWrite: 0, reasoning: 200 },
			]
		},
	];
	const byDay = sessionDayTokens(sessions);
	var k1 = localDayKey(d1.getTime());
	var k2 = localDayKey(d2.getTime());
	expect(byDay.has(k1)).toBe(true);
	expect(byDay.has(k2)).toBe(true);
	expect(byDay.get(k1).input).toBe(1500);
	expect(byDay.get(k1).output).toBe(200);
	expect(byDay.get(k1).reasoning).toBe(100);
	expect(byDay.get(k2).input).toBe(2000);
	expect(byDay.get(k2).output).toBe(400);
	// turns/steps/llm 落 updatedAt 那天（d2）
	expect(byDay.get(k2).turns).toBe(5);
	expect(byDay.get(k2).steps).toBe(20);
	expect(byDay.get(k2).llmMs).toBe(60000);
	// 另一天没有 turns（避免重复计）
	expect(byDay.get(k1).turns).toBe(0);
});

// ---------------------------------------------------------------------------
// streakAndActive
// ---------------------------------------------------------------------------
test('streakAndActive counts active days and streaks', () => {
	const byDay = new Map([
		['2025-03-10', emptyBucket()], ['2025-03-11', emptyBucket()], ['2025-03-12', emptyBucket()],
		['2025-03-15', emptyBucket()], ['2025-03-16', emptyBucket()],
	]);
	const sa = streakAndActive(byDay);
	expect(sa.activeDays).toBe(5);
	expect(sa.longestStreak).toBe(3);
	expect(sa.firstDay).toBe('2025-03-10');
	expect(sa.lastDay).toBe('2025-03-16');
});

test('streakAndActive empty returns zeros', () => {
	const sa = streakAndActive(new Map());
	expect(sa.activeDays).toBe(0);
	expect(sa.currentStreak).toBe(0);
	expect(sa.longestStreak).toBe(0);
});

test('streakAndActive current streak from last consecutive day', () => {
	const byDay = new Map([
		['2025-03-14', emptyBucket()], ['2025-03-15', emptyBucket()], ['2025-03-16', emptyBucket()],
	]);
	const sa = streakAndActive(byDay);
	expect(sa.currentStreak).toBe(3);
});

// ---------------------------------------------------------------------------
// modelAgg
// ---------------------------------------------------------------------------
test('modelAgg groups sessions by model', () => {
	const sessions = [
		{ id: 's1', model: 'deepseek-chat', stats: { inputTokens: 1000, outputTokens: 200, cacheRead: 500, cacheWrite: 0, reasoning: 0, llmMs: 1000, toolMs: 200 } },
		{ id: 's2', model: 'deepseek-chat', stats: { inputTokens: 2000, outputTokens: 400, cacheRead: 1000, cacheWrite: 0, reasoning: 0, llmMs: 2000, toolMs: 400 } },
		{ id: 's3', model: 'deepseek-reasoner', stats: { inputTokens: 5000, outputTokens: 3000, cacheRead: 0, cacheWrite: 0, reasoning: 5000, llmMs: 5000, toolMs: 100 } },
	];
	const models = modelAgg(sessions);
	expect(models.length).toBe(2);
	const chat = models.find(m => m.model === 'deepseek-chat');
	expect(chat.sessions).toBe(2);
	expect(chat.input).toBe(3000);
	expect(chat.reasoning).toBe(0);
	const reasoner = models.find(m => m.model === 'deepseek-reasoner');
	expect(reasoner.reasoning).toBe(5000);
});

test('modelAgg sorts by total token volume descending', () => {
	const sessions = [
		{ id: 's1', model: 'small-model', stats: { inputTokens: 100, outputTokens: 50, cacheRead: 0, cacheWrite: 0, reasoning: 0, llmMs: 0, toolMs: 0 } },
		{ id: 's2', model: 'big-model', stats: { inputTokens: 10000, outputTokens: 5000, cacheRead: 0, cacheWrite: 0, reasoning: 0, llmMs: 0, toolMs: 0 } },
	];
	const models = modelAgg(sessions);
	expect(models[0].model).toBe('big-model');
	expect(models[1].model).toBe('small-model');
});

test('modelAgg null model maps to (unknown)', () => {
	const sessions = [{ id: 's1', model: null, stats: { inputTokens: 100, outputTokens: 50, cacheRead: 0, cacheWrite: 0, reasoning: 0, llmMs: 0, toolMs: 0 } }];
	const models = modelAgg(sessions);
	expect(models[0].model).toBe('(unknown)');
});

// ---------------------------------------------------------------------------
// monthlyFromDays / weeklyFromDays
// ---------------------------------------------------------------------------
test('monthlyFromDays aggregates correctly', () => {
	const byDay = new Map([
		['2025-03-10', { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 100, output: 50, cacheRead: 0, cacheWrite: 0, reasoning: 0, input: 100 }],
		['2025-03-15', { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 200, output: 100, cacheRead: 0, cacheWrite: 0, reasoning: 0, input: 200 }],
		['2025-04-01', { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 300, output: 150, cacheRead: 0, cacheWrite: 0, reasoning: 0, input: 300 }],
	]);
	const months = monthlyFromDays(byDay);
	expect(months.get('2025-03').output).toBe(150);
	expect(months.get('2025-04').output).toBe(150);
	expect(months.get('2025-03').input).toBe(300);
});

test('weeklyFromDays starts week on Sunday', () => {
	const byDay = new Map([
		['2025-03-09', { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 100, output: 10, cacheRead: 0, cacheWrite: 0, reasoning: 0, input: 100 }], // Sunday
		['2025-03-11', { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 200, output: 20, cacheRead: 0, cacheWrite: 0, reasoning: 0, input: 200 }], // Tuesday
		['2025-03-16', { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 300, output: 30, cacheRead: 0, cacheWrite: 0, reasoning: 0, input: 300 }], // Sunday
	]);
	const weeks = weeklyFromDays(byDay);
	expect(weeks.get('2025-03-09').output).toBe(30);
	expect(weeks.get('2025-03-16').output).toBe(30);
});

// ---------------------------------------------------------------------------
// fmtN / fmtTokens / fmtCost / fmtDuration（真实实现格式）
// ---------------------------------------------------------------------------
test('fmtN uses en-US locale grouping', () => {
	expect(fmtN(0)).toBe('0');
	expect(fmtN(999)).toBe('999');
	expect(fmtN(1000)).toBe('1,000');
	expect(fmtN(1500)).toBe('1,500');
	expect(fmtN(1000000)).toBe('1,000,000');
});

test('fmtTokens formats with K/M suffix', () => {
	expect(fmtTokens(0)).toBe('0');
	expect(fmtTokens(500)).toBe('500');
	expect(fmtTokens(1200)).toBe('1.2K');
	expect(fmtTokens(1500000)).toBe('1.5M');
	expect(fmtTokens(null)).toBe('—');
});

test('fmtCost formats RMB correctly', () => {
	expect(fmtCost(0)).toBe('¥0');
	expect(fmtCost(0.005)).toBe('¥0.0050');
	expect(fmtCost(0.5)).toBe('¥0.50');
	expect(fmtCost(50)).toBe('¥50.00');
	expect(fmtCost(1500)).toBe('¥1500');
	expect(fmtCost(-1)).toBe('¥0');
	expect(fmtCost(NaN)).toBe('¥0');
	expect(fmtCost(null)).toBe('¥0');
});

test('fmtDuration formats ms to h/m/s', () => {
	expect(fmtDuration(0)).toBe('—');
	expect(fmtDuration(500)).toBe('0.5s');
	expect(fmtDuration(59000)).toBe('59s');
	expect(fmtDuration(60000)).toBe('1m0s');
	expect(fmtDuration(90000)).toBe('1m30s');
	expect(fmtDuration(3661000)).toBe('1h1m');
	expect(fmtDuration(36000000)).toBe('10h0m');
	expect(fmtDuration(NaN)).toBe('—');
});

// ---------------------------------------------------------------------------
// costOf（DeepSeek 计价）
// ---------------------------------------------------------------------------
test('costOf calculates DeepSeek V4 Pro off-peak pricing', () => {
	const stats = { uncached: 1000000, cacheRead: 1000000, cacheWrite: 0, output: 1000000 };
	const offPeak = { miss: 1.5, hit: 0.05, out: 4.5 };
	const cost = costOf(stats, offPeak);
	// miss: 1M * 1.5/1M = 1.5; hit: 1M * 0.05/1M = 0.05; out: 1M * 4.5/1M = 4.5
	expect(cost).toBeCloseTo(6.05, 4);
});

test('costOf handles zero stats', () => {
	const stats = { uncached: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
	expect(costOf(stats, { miss: 1.5, hit: 0.05, out: 4.5 })).toBe(0);
});

test('costOf with cacheWrite included', () => {
	const stats = { uncached: 500000, cacheRead: 500000, cacheWrite: 200000, output: 800000 };
	const offPeak = { miss: 1.5, hit: 0.05, out: 4.5 };
	const cost = costOf(stats, offPeak);
	// miss: 700k * 1.5/1M = 1.05; hit: 500k * 0.05/1M = 0.025; out: 800k * 4.5/1M = 3.6
	expect(cost).toBeCloseTo(4.675, 3);
});

// ---------------------------------------------------------------------------
// applyDate / activityDates / fmtDateCN（日期导航）
// ---------------------------------------------------------------------------
test('applyDate filters sessions by local day window', () => {
	const d0 = new Date('2025-03-15T12:00:00').getTime(); // 当天
	const d1 = new Date('2025-03-15T23:59:59').getTime(); // 当天末
	const dPrev = new Date('2025-03-14T23:00:00').getTime(); // 前一天
	const dNext = new Date('2025-03-16T00:00:00').getTime(); // 次日零点
	const projects = [
		{
			id: 'p1', name: 'P1', path: '/p', sessionCount: 3, subagentCount: 0, lastActiveAt: d0,
			stats: { turns: 0 },
			sessions: [
				{ id: 's1', updatedAt: d0, subagent: false, stats: { turns: 5, steps: 1, llmMs: 100, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 100, output: 50, cacheRead: 0, cacheWrite: 0, reasoning: 0, inputTokens: 100, outputTokens: 50, cacheHitPct: 0, tps: null, ttftAvgMs: null } },
				{ id: 's2', updatedAt: d1, subagent: false, stats: { turns: 3, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, inputTokens: 0, outputTokens: 0, cacheHitPct: null, tps: null, ttftAvgMs: null } },
				{ id: 's3', updatedAt: dPrev, subagent: true, stats: { turns: 9, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, inputTokens: 0, outputTokens: 0, cacheHitPct: null, tps: null, ttftAvgMs: null } },
				{ id: 's4', updatedAt: dNext, subagent: false, stats: { turns: 7, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, inputTokens: 0, outputTokens: 0, cacheHitPct: null, tps: null, ttftAvgMs: null } },
			],
		},
	];
	const out = applyDate(projects, '2025-03-15');
	expect(out[0].sessions.length).toBe(2); // s1 + s2，s3 前一天、s4 次日零点被排除
	expect(out[0].sessionCount).toBe(2);
	expect(out[0].stats.turns).toBe(8);
});

test('applyDate with no date returns projects unchanged', () => {
	const projects = [{ id: 'p1', sessions: [], sessionCount: 0, subagentCount: 0, lastActiveAt: null, stats: {} }];
	expect(applyDate(projects, null)).toBe(projects);
});

test('applyDate empty day zeroes project stats', () => {
	const projects = [
		{
			id: 'p1', name: 'P1', path: '/p', sessionCount: 1, subagentCount: 0, lastActiveAt: 1,
			stats: { turns: 1 },
			sessions: [{ id: 's1', updatedAt: new Date('2025-03-14T12:00:00').getTime(), subagent: false, stats: { turns: 1, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, inputTokens: 0, outputTokens: 0, cacheHitPct: null, tps: null, ttftAvgMs: null } }],
		},
	];
	const out = applyDate(projects, '2025-03-15');
	expect(out[0].sessions.length).toBe(0);
	expect(out[0].sessionCount).toBe(0);
	expect(out[0].stats.turns).toBe(0);
});

test('activityDates extracts sorted active dates from timeline', () => {
	const timeline = { days: [{ date: '2025-03-15', dayTotalMs: 100 }, { date: '2025-03-12', dayTotalMs: 50 }, { date: '2025-03-15', dayTotalMs: 10 }] };
	const dates = activityDates(timeline);
	expect(dates).toEqual(['2025-03-12', '2025-03-15', '2025-03-15']);
});

test('activityDates empty timeline returns empty', () => {
	expect(activityDates({ days: [] })).toEqual([]);
	expect(activityDates(null)).toEqual([]);
});

test('fmtDateCN formats Chinese date with weekday', () => {
	expect(fmtDateCN('2026-08-16')).toBe('2026年8月16日 周日');
	expect(fmtDateCN(null)).toBe('—');
});

test('applyDate clips slotUsage to the day and recomputes tokens', () => {
	var d1 = new Date('2025-03-15T10:00:00');
	var slotDay = Math.floor(d1.getTime() / 1800000);          // 当天槽
	var slotPrev = slotDay - 40;                                // 前一天槽（40 槽 = 20 小时前）
	var slotNext = slotDay + 40;                                // 次日槽
	const projects = [
		{
			id: 'p1', name: 'P1', path: '/p', sessionCount: 1, subagentCount: 0, lastActiveAt: d1.getTime(),
			stats: {},
			sessions: [
				{
					id: 's1', updatedAt: d1.getTime(), subagent: false, model: 'deepseek-v4-pro',
					slotUsage: [
						{ slot: slotPrev, uncached: 1000000, output: 100, cacheRead: 500000, cacheWrite: 0, reasoning: 10 },
						{ slot: slotDay, uncached: 100, output: 200, cacheRead: 300, cacheWrite: 0, reasoning: 5 },
						{ slot: slotNext, uncached: 1000000, output: 100, cacheRead: 500000, cacheWrite: 0, reasoning: 10 },
					],
					stats: { turns: 7, steps: 3, llmMs: 1000, toolMs: 500, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 2000100, output: 400, cacheRead: 1000300, cacheWrite: 0, reasoning: 25, inputTokens: 3000400, outputTokens: 400, cacheHitPct: 33, tps: null, ttftAvgMs: null },
				},
			],
		},
	];
	const out = applyDate(projects, '2025-03-15');
	const s = out[0].sessions[0];
	expect(s.slotUsage.length).toBe(1);
	expect(s.slotUsage[0].slot).toBe(slotDay);
	// token 重算为当天槽的值
	expect(s.stats.uncached).toBe(100);
	expect(s.stats.output).toBe(200);
	expect(s.stats.cacheRead).toBe(300);
	expect(s.stats.reasoning).toBe(5);
	expect(s.stats.inputTokens).toBe(400);
	// turns/steps/时长不拆分，保留会话完整值
	expect(s.stats.turns).toBe(7);
	expect(s.stats.steps).toBe(3);
});

test('applyDate keeps session stats when no slotUsage (client fallback)', () => {
	var d1 = new Date('2025-03-15T10:00:00');
	const projects = [
		{
			id: 'p1', name: 'P1', path: '/p', sessionCount: 1, subagentCount: 0, lastActiveAt: d1.getTime(),
			stats: {},
			sessions: [
				{ id: 's1', updatedAt: d1.getTime(), subagent: false, slotUsage: undefined, stats: { turns: 2, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 500, output: 60, cacheRead: 0, cacheWrite: 0, reasoning: 0, inputTokens: 500, outputTokens: 60, cacheHitPct: 0, tps: null, ttftAvgMs: null } },
			],
		},
	];
	const out = applyDate(projects, '2025-03-15');
	expect(out[0].sessions[0].stats.uncached).toBe(500); // 保留原值
	expect(out[0].sessions[0].stats.outputTokens).toBe(60);
});

test('modelAgg splits LLM/tool duration by token share across modelUsage', () => {
	const sessions = [
		{
			id: 's1', model: 'deepseek-v4-pro',
			modelUsage: [
				{ model: 'deepseek-v4-pro', uncached: 9000, output: 900, cacheRead: 100, cacheWrite: 0, reasoning: 0 },
				{ model: 'deepseek-v4-flash', uncached: 900, output: 100, cacheRead: 0, cacheWrite: 0, reasoning: 0 },
			],
			stats: { llmMs: 10000, toolMs: 5000, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 },
		},
	];
	const models = modelAgg(sessions);
	const pro = models.find(m => m.model === 'deepseek-v4-pro');
	const flash = models.find(m => m.model === 'deepseek-v4-flash');
	// pro token 10000 / flash token 1000 → 时长按 10:1 分摊
	expect(pro.llmMs).toBe(9091);   // 10000 * 10000/11000
	expect(pro.toolMs).toBe(4545);   // 5000 * 10000/11000
	expect(flash.llmMs).toBe(909);   // 10000 * 1000/11000
	expect(flash.toolMs).toBe(455);  // 5000 * 1000/11000
});

test('modelAgg fallback gives full duration to single model', () => {
	const sessions = [
		{ id: 's1', model: 'deepseek-chat', stats: { inputTokens: 1000, outputTokens: 200, cacheRead: 0, cacheWrite: 0, reasoning: 0, llmMs: 3000, toolMs: 1000 } },
	];
	const models = modelAgg(sessions);
	expect(models[0].llmMs).toBe(3000);
	expect(models[0].toolMs).toBe(1000);
});
