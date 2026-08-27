// Phase E 纯函数测试：直接 require 真实 client 源码（通过 __test 钩子暴露），
// 确保测试验证的是生产实现而非副本。
const client = require('../src/client.cjs');
const {
	localDayKey, emptyBucket, addBucket, sessionDayTokens,
	monthlyFromDays, weeklyFromDays, modelAgg, streakAndActive,
	costOf, fmtN, fmtTokens, fmtCost, fmtDuration, fmtTps, fmtSharePct, fmtCostSummary,
	applyDate, activityDates, fmtDateCN,
	applyRange, buildTimeline, parseAggregateResult, hasTokenUsage, groupTimelineBlocks, timelineLayout, timelineDisplayDays,
	modelNameOnly, modelDisplayName, providerPickerLabel, modelListNeedsScroll, compareProjectCost, projectCsvTable,
	subagentAddressFor, openStatsSession, CalendarHeatmap, projectColorIndexes, projectColorIndex,
	aggregate, projectionIdentityOf, projectionSlotUsageOf, enrichSessionProjection,
} = client.__test;

function findElementByTitle(node, title) {
	if (!node || typeof node !== 'object') return null;
	if (node.props?.title === title) return node;
	const children = node.props?.children;
	for (const child of Array.isArray(children) ? children : [children]) {
		const found = findElementByTitle(child, title);
		if (found) return found;
	}
	return null;
}

// ---------------------------------------------------------------------------
// localDayKey
// ---------------------------------------------------------------------------
test('providerPickerLabel uses the canonical provider family without status text', () => {
	expect(providerPickerLabel({ providerFamily: 'deepseek', displayName: 'DeepSeek', status: 'ok' })).toBe('deepseek');
	expect(providerPickerLabel({ providerFamily: 'minimax', displayName: 'MiniMax', status: 'stale' })).toBe('minimax');
	expect(providerPickerLabel({ displayName: 'Custom Provider', status: 'ok' })).toBe('Custom Provider');
	expect(providerPickerLabel({ providerFamily: 'unknown', displayName: 'yi-api', status: 'ok' })).toBe('yi-api');
});

test('modelListNeedsScroll limits the visible model list to three rows', () => {
	expect(modelListNeedsScroll([])).toBe(false);
	expect(modelListNeedsScroll([{ model: 'a' }, { model: 'b' }, { model: 'c' }])).toBe(false);
	expect(modelListNeedsScroll([{ model: 'a' }, { model: 'b' }, { model: 'c' }, { model: 'd' }])).toBe(true);
});

test('client fallback restores the weighted primary model from statsRoute projection', () => {
	const at = Date.parse('2026-08-17T10:00:00+08:00');
	const session = {
		id: 'projection-session', updatedAt: at,
		projectionValues: {
			tokenUsage: { totals: { uncachedInputTokens: 160, outputTokens: 16, cacheReadTokens: 40, cacheWriteTokens: 0 } },
			statsRoute: {
				current: { providerId: 'openai', model: 'gpt-5.6-luna', accountType: 'api', serviceTier: 'standard' },
				routes: [
					{ providerId: 'openai', model: 'gpt-5.6-luna', accountType: 'api', serviceTier: 'standard', slot: 10, time: at, uncached: 10, output: 1, cacheRead: 0, cacheWrite: 0 },
					{ providerId: 'yi-api', model: 'gpt-5.6-sol', accountType: 'api', serviceTier: 'priority', slot: 11, time: at + 1, uncached: 150, output: 15, cacheRead: 40, cacheWrite: 0 },
				]
			}
		}
	};
	const identity = projectionIdentityOf(session);
	expect(identity).toMatchObject({ model: 'gpt-5.6-sol', modelRaw: 'gpt-5.6-sol', providerId: 'yi-api', accountType: 'api' });
	const enriched = enrichSessionProjection(session);
	expect(enriched).toMatchObject({ model: 'gpt-5.6-sol', providerId: 'yi-api' });
	expect(enriched.slotUsage).toHaveLength(2);
	expect(enriched.slotUsage[1]).toMatchObject({ model: 'gpt-5.6-sol', providerId: 'yi-api', serviceTier: 'priority', contextTokens: 190 });

	const projects = aggregate([session], [{ workspaceId: 'projection', title: 'Projection', path: '/tmp/projection', sessionIds: [session.id] }], (key) => key, []);
	const view = projects[0].sessions[0];
	expect(view.model).toBe('gpt-5.6-sol');
	expect(view.providerId).toBe('yi-api');
	expect(view.stats.inputTokens).toBe(200);
	expect(modelAgg(projects[0].sessions).map((row) => row.model)).toEqual(['gpt-5.6-sol', 'gpt-5.6-luna']);
});

test('client fallback uses current route when statsRoute has no token rows', () => {
	const session = {
		id: 'current-only', updatedAt: Date.parse('2026-08-17T10:00:00+08:00'),
		projectionValues: {
			statsRoute: { current: { providerId: 'deepseek-official', model: 'deepseek-v4-pro', accountType: 'api', serviceTier: 'standard' }, routes: [] },
			tokenUsage: { totals: { uncachedInputTokens: 10, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 } }
		}
	};
	expect(projectionIdentityOf(session)).toMatchObject({ model: 'deepseek-v4-pro', providerId: 'deepseek-official' });
	expect(projectionSlotUsageOf(session, projectionIdentityOf(session))).toEqual([]);
	expect(aggregate([session], [{ workspaceId: 'current', path: '/tmp/current', sessionIds: [session.id] }], (key) => key, [])[0].sessions[0].model).toBe('deepseek-v4-pro');
});

test('client fallback preserves unknown when no projection route is available', () => {
	const session = { id: 'no-route', projectionValues: { tokenUsage: { totals: { uncachedInputTokens: 1, outputTokens: 1 } } } };
	expect(projectionIdentityOf(session)).toMatchObject({ model: null, modelRaw: '(unknown)', providerId: 'unknown' });
	const view = aggregate([session], [{ workspaceId: 'unknown', path: '/tmp/unknown', sessionIds: [session.id] }], (key) => key, [])[0].sessions[0];
	expect(view.model).toBeNull();
});

test('client fallback unwraps legacy persisted projection rows', () => {
	const session = {
		id: 'legacy-rows', updatedAt: 1_700_000_000_000,
		rows: {
			tokenUsage: { ver: 1, seq: 3, val: { totals: { uncachedInputTokens: 4, outputTokens: 2 } } },
			statsRoute: { ver: 1, seq: 3, val: { current: { providerId: 'deepseek-official', model: 'deepseek-v4-flash', accountType: 'api', serviceTier: 'standard' }, routes: {} } }
		}
	};
	const projects = aggregate([session], [{ workspaceId: 'legacy', path: '/tmp/legacy', sessionIds: [session.id] }], (key) => key, []);
	expect(projects[0].sessions[0]).toMatchObject({ model: 'deepseek-v4-flash', providerId: 'deepseek-official' });
	expect(projects[0].stats).toMatchObject({ inputTokens: 4, outputTokens: 2 });
});

test('project colors stay stable when date filtering removes earlier projects', () => {
	const allProjects = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
	const colors = projectColorIndexes(allProjects);
	const firstDate = [allProjects[0], allProjects[2]];
	const secondDate = [allProjects[1], allProjects[2]];

	expect(firstDate.map((project, index) => projectColorIndex(project, colors, index))).toEqual([0, 2]);
	expect(secondDate.map((project, index) => projectColorIndex(project, colors, index))).toEqual([1, 2]);
});

test('CalendarHeatmap only selects past or current dates with token usage', () => {
	const now = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-08-19T12:00:00+08:00'));
	try {
		const byDay = new Map([
			['2026-08-18', { input: 120, output: 30 }],
			['2026-08-20', { input: 80, output: 20 }],
		]);
		const onSelectDate = vi.fn();
		const tree = CalendarHeatmap({ byDay, selectedDate: '2026-08-18', onSelectDate, t: (key) => key === 'trends.weekdays' ? 'Sun,Mon,Tue,Wed,Thu,Fri,Sat' : key });
		const active = findElementByTitle(tree, '2026-08-18');
		const empty = findElementByTitle(tree, '2026-08-19');
		const future = findElementByTitle(tree, '2026-08-20');

		expect(active.type).toBe('button');
		expect(active.props['aria-pressed']).toBe(true);
		active.props.onClick();
		expect(onSelectDate).toHaveBeenCalledWith('2026-08-18');
		expect(empty.type).toBe('span');
		expect(empty.props.onClick).toBeUndefined();
		expect(future.type).toBe('span');
		expect(future.props.onClick).toBeUndefined();
	} finally {
		now.mockRestore();
	}
});

test('openStatsSession opens a regular session through the DSH sessions service', async () => {
	const sessions = { open: vi.fn() };
	await openStatsSession(sessions, { id: 'session-main', subagent: false });
	expect(sessions.open).toHaveBeenCalledOnce();
	expect(sessions.open).toHaveBeenCalledWith('session-main');
});

test('openStatsSession resolves and opens a catalog-backed subagent when direct open fails', async () => {
	const snapshot = { subagentsByParent: {} };
	const sessions = {
		open: vi.fn(() => { throw new Error('unknown session'); }),
		openSubagent: vi.fn(),
		subagentAddress: vi.fn(() => undefined),
		refreshSubagents: vi.fn(async () => {
			snapshot.subagentsByParent.parent = { entries: [{ kind: 'child', id: 'session-child', mode: 'continuable' }] };
		}),
		list: { getSnapshot: () => snapshot },
	};
	const session = { id: 'session-child', subagent: true, parentSession: 'parent' };
	await openStatsSession(sessions, session);
	expect(sessions.refreshSubagents).toHaveBeenCalledWith('parent');
	expect(subagentAddressFor(sessions, session)).toEqual({ parentSessionId: 'parent', childSessionId: 'session-child', mode: 'continuable' });
	expect(sessions.openSubagent).toHaveBeenCalledWith({ parentSessionId: 'parent', childSessionId: 'session-child', mode: 'continuable' });
});

test('tiny non-zero model shares never render as 0.0%', () => {
	expect(fmtSharePct(0)).toBe('0%');
	expect(fmtSharePct(0.049)).toBe('<0.1%');
	expect(fmtSharePct(0.1)).toBe('0.1%');
	expect(fmtSharePct(82.34)).toBe('82.3%');
});

test('cost sorting compares the unified RMB totals', () => {
	const project = (currency, amount) => ({ sessions: [{ cost: {
		status: 'exact', totals: [{ currency, amount, exactAmount: amount, estimatedAmount: 0 }], unpricedTokens: 0, unknownRows: 0,
	} }] });
	const cnyLow = project('CNY', 1);
	const cnyHigh = project('CNY', 10);
	const usd = project('USD', 2);
	expect(compareProjectCost(cnyLow, cnyHigh)).toBeLessThan(0);
	// USD summaries from an older host are converted before sorting (2 USD is about 13.44 CNY).
	expect(compareProjectCost(cnyHigh, usd)).toBeLessThan(0);
});

test('estimated and partial summaries render only confirmed RMB amounts', () => {
	const estimated = { status: 'estimated', totals: [{ currency: 'USD', amount: 0.00082844, exactAmount: 0, estimatedAmount: 0.00082844 }], unpricedTokens: 0, unknownRows: 0 };
	const partial = { status: 'partial', totals: [{ currency: 'USD', amount: 0.00082844, exactAmount: 0.00082844, estimatedAmount: 0 }], unpricedTokens: 100, unknownRows: 1 };

	expect(fmtCostSummary(estimated)).toBe('¥0.0056');
	expect(fmtCostSummary(partial)).toBe('¥0.0056');
	expect(fmtCostSummary({ status: 'free', totals: [], unpricedTokens: 0, unknownRows: 0 })).toBe('¥0');
});

test('localDayKey returns YYYY-MM-DD', () => {
	expect(localDayKey(Date.parse('2025-03-15T14:30:00+08:00'))).toBe('2025-03-15');
	expect(localDayKey(Date.parse('2026-01-01T00:00:00+08:00'))).toBe('2026-01-01');
	expect(localDayKey(Date.parse('2025-03-15T16:30:00Z'))).toBe('2025-03-16');
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
		{ id: 's1', updatedAt: Date.parse('2025-03-15T10:00:00+08:00'), stats: { outputTokens: 100, uncached: 200, cacheRead: 50, cacheWrite: 0, reasoning: 10, inputTokens: 250 } },
		{ id: 's2', updatedAt: Date.parse('2025-03-15T15:00:00+08:00'), stats: { outputTokens: 200, uncached: 300, cacheRead: 100, cacheWrite: 0, reasoning: 20, inputTokens: 400 } },
		{ id: 's3', updatedAt: Date.parse('2025-03-16T09:00:00+08:00'), stats: { outputTokens: 50, uncached: 100, cacheRead: 0, cacheWrite: 0, reasoning: 5, inputTokens: 100 } },
	];
	const byDay = sessionDayTokens(sessions);
	expect(byDay.has('2025-03-15')).toBe(true);
	expect(byDay.has('2025-03-16')).toBe(true);
	expect(byDay.get('2025-03-15').output).toBe(300);
	expect(byDay.get('2025-03-15').reasoning).toBe(30);
});

test('sessionDayTokens uses createdAt as fallback', () => {
	const sessions = [
		{ id: 's1', updatedAt: null, createdAt: Date.parse('2025-03-15T10:00:00+08:00'), stats: { outputTokens: 100, uncached: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, inputTokens: 100 } },
	];
	const byDay = sessionDayTokens(sessions);
	expect(byDay.has('2025-03-15')).toBe(true);
});

test('sessionDayTokens skips sessions without timestamps', () => {
	const sessions = [
		{ id: 's1', updatedAt: null, createdAt: null, stats: { outputTokens: 100, uncached: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, inputTokens: 0 } },
		{ id: 's2', updatedAt: Date.parse('2025-03-15T10:00:00+08:00'), stats: { outputTokens: 200, uncached: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, inputTokens: 0 } },
	];
	const byDay = sessionDayTokens(sessions);
	expect(byDay.size).toBe(1);
});

test('sessionDayTokens distributes slotUsage tokens across actual days', () => {
	var d1 = new Date('2025-03-12T00:00:00+08:00');
	var d2 = new Date('2025-03-13T00:00:00+08:00');
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

test('sessionDayTokens keeps session tokens when only activity/stat slots exist', () => {
	const at = Date.parse('2026-08-17T10:00:00+08:00');
	const slot = Math.floor(at / 1800000);
	const byDay = sessionDayTokens([{
		updatedAt: at,
		slots: [{ slot, ms: 60_000 }],
		slotStats: [{ slot, turns: 1, steps: 1, llmMs: 100, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 }],
		stats: { uncached: 70, output: 20, cacheRead: 10, cacheWrite: 5, reasoning: 2, inputTokens: 85 },
	}]);
	const row = byDay.get(localDayKey(at));
	expect(row).toMatchObject({ input: 85, output: 20, uncached: 70, cacheRead: 10, cacheWrite: 5, reasoning: 2 });
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

test('modelAgg omits zero-token slot models while keeping positive usage', () => {
	const slot = Math.floor(Date.parse('2026-08-17T10:00:00+08:00') / 1800000);
	const models = modelAgg([{
		model: 'deepseek-v4-pro',
		slotUsage: [
			{ slot, providerId: 'deepseek-modlens', model: 'deepseek-v4-flash', uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 },
			{ slot, providerId: 'deepseek-official', model: 'deepseek-v4-pro', uncached: 100, output: 20, cacheRead: 0, cacheWrite: 0, reasoning: 0 },
		],
		stats: { llmMs: 100, toolMs: 0 },
	}]);

	expect(models.map((model) => model.displayName)).toEqual(['deepseek-official · deepseek-v4-pro']);
	expect(models[0]).toMatchObject({ input: 100, output: 20 });
});

test('modelAgg falls back to session tokens when slot rows are all zero', () => {
	const models = modelAgg([{
		model: 'deepseek-v4-pro',
		slotUsage: [{ slot: 0, model: 'deepseek-v4-flash', uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }],
		stats: { uncached: 7, output: 2, cacheRead: 0, cacheWrite: 0, reasoning: 0, llmMs: 0, toolMs: 0 },
	}]);

	expect(models).toHaveLength(1);
	expect(models[0]).toMatchObject({ model: 'deepseek-v4-pro', input: 7, output: 2 });
});

test('project session model labels omit the provider name', () => {
	const session = {
		providerId: 'deepseek-official',
		modelCanonical: 'deepseek-v4-pro',
	};
	expect(modelNameOnly(session)).toBe('deepseek-v4-pro');
	expect(modelDisplayName(session)).toBe('deepseek-official · deepseek-v4-pro');
});

test('modelAgg accumulates each model cost with the price of its actual slot', () => {
	const offPeakSlot = Math.floor(Date.parse('2026-08-17T00:00:00+08:00') / 1800000);
	const peakSlot = Math.floor(Date.parse('2026-08-17T09:00:00+08:00') / 1800000);
	const models = modelAgg([{
		model: 'deepseek-v4-pro',
		providerId: 'deepseek-official',
		slotUsage: [
			{ slot: offPeakSlot, providerId: 'deepseek-official', model: 'deepseek-v4-pro', uncached: 1000, output: 100, cacheRead: 10000, cacheWrite: 0, reasoning: 0 },
			{ slot: peakSlot, providerId: 'deepseek-official', model: 'deepseek-v4-pro', uncached: 1000, output: 100, cacheRead: 10000, cacheWrite: 0, reasoning: 0 },
			{ slot: offPeakSlot, providerId: 'deepseek-official', model: 'deepseek-v4-flash', uncached: 1000, output: 100, cacheRead: 10000, cacheWrite: 0, reasoning: 0 },
		],
		stats: { llmMs: 0, toolMs: 0 },
	}]);
	const pro = models.find(m => m.model === 'deepseek-v4-pro');
	const flash = models.find(m => m.model === 'deepseek-v4-flash');
	// pro: offPeak 0.00735 + peak 0.0147; flash offPeak: 0.00245
	expect(pro.costKnown).toBe(true);
	expect(pro.cost).toBeCloseTo(0.02205, 6);
	expect(flash.costKnown).toBe(true);
	expect(flash.cost).toBeCloseTo(0.00245, 6);
});

test('modelAgg keeps known model costs when another model price is unknown', () => {
	const slot = Math.floor(Date.parse('2026-08-17T00:00:00+08:00') / 1800000);
	const models = modelAgg([{
		model: 'deepseek-v4-pro',
		providerId: 'deepseek-official',
		slotUsage: [
			{ slot, providerId: 'deepseek-official', model: 'deepseek-v4-pro', uncached: 1000, output: 100, cacheRead: 0, cacheWrite: 0, reasoning: 0 },
			{ slot, providerId: 'deepseek-official', model: 'future-model', uncached: 1000, output: 100, cacheRead: 0, cacheWrite: 0, reasoning: 0 },
		],
		stats: { llmMs: 0, toolMs: 0 },
	}]);
	const known = models.find(m => m.model === 'deepseek-v4-pro');
	expect(known.costKnown).toBe(true);
	expect(known.cost).toBeCloseTo(0.00585, 6);
	expect(models.find(m => m.model === 'future-model')).toMatchObject({ costKnown: false, cost: 0 });
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
test('fmtTps leaves the unit to the project metric label', () => {
	expect(fmtTps(78.45)).toBe('78.5');
	expect(fmtTps(123.4)).toBe('123');
	expect(fmtTps(null)).toBe('—');
});

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
	expect(fmtCost(NaN)).toBe('—');
	expect(fmtCost(null)).toBe('—');
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
	const d0 = Date.parse('2025-03-15T12:00:00+08:00'); // 当天
	const d1 = Date.parse('2025-03-15T23:59:59+08:00'); // 当天末
	const dPrev = Date.parse('2025-03-14T23:00:00+08:00'); // 前一天
	const dNext = Date.parse('2025-03-16T00:00:00+08:00'); // 次日零点
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
			sessions: [{ id: 's1', updatedAt: Date.parse('2025-03-14T12:00:00+08:00'), subagent: false, stats: { turns: 1, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, inputTokens: 0, outputTokens: 0, cacheHitPct: null, tps: null, ttftAvgMs: null } }],
		},
	];
	const out = applyDate(projects, '2025-03-15');
	expect(out.length).toBe(0);
});

test('hasTokenUsage excludes activity-only projects from date statistics', () => {
	expect(hasTokenUsage({ stats: { inputTokens: 0, outputTokens: 0 } })).toBe(false);
	expect(hasTokenUsage({ stats: { inputTokens: 100, outputTokens: 0 } })).toBe(true);
	expect(hasTokenUsage({ stats: { inputTokens: 0, outputTokens: 50 } })).toBe(true);
	expect(hasTokenUsage({ stats: { inputTokens: 0, outputTokens: 0, toolMs: 1000 } })).toBe(false);
});

test('timelineLayout shows more projects when the visible range is short', () => {
	expect(timelineLayout(1)).toMatchObject({ maxBlockH: 200, maxProjects: 6, laneHeight: 72, laneViewportH: 306, rowMinH: 214 });
	expect(timelineLayout(7)).toMatchObject({ maxBlockH: 112, maxProjects: 5, rowMinH: 184 });
	expect(timelineLayout(30)).toMatchObject({ maxBlockH: 56, maxProjects: 4, rowMinH: 160 });
});

test('timelineDisplayDays puts the newest day first only in all-days mode', () => {
	const days = [{ date: '2025-03-12' }, { date: '2025-03-15' }, { date: '2025-03-14' }];
	expect(timelineDisplayDays(days, false).map(day => day.date)).toEqual(['2025-03-15', '2025-03-14', '2025-03-12']);
	expect(timelineDisplayDays(days, true).map(day => day.date)).toEqual(['2025-03-12', '2025-03-15', '2025-03-14']);
	expect(days.map(day => day.date)).toEqual(['2025-03-12', '2025-03-15', '2025-03-14']);
});

test('groupTimelineBlocks merges duplicate project slots and keeps concurrent projects separate', () => {
	const grouped = groupTimelineBlocks({ slotBlocks: [
		{ slot: 4, projectId: 'a', name: 'A', colorIndex: 0, ms: 1000 },
		{ slot: 4, projectId: 'a', name: 'A', colorIndex: 0, ms: 2000 },
		{ slot: 4, projectId: 'b', name: 'B', colorIndex: 1, ms: 5000 },
		{ slot: 48, projectId: 'ignored', name: 'Ignored', colorIndex: 2, ms: 9999 },
	] }, {});
	const a = grouped.projects.find(p => p.projectId === 'a');
	expect(grouped.projects).toHaveLength(2);
	expect(a.slots.get(4)).toBe(3000);
	expect(grouped.slots[4].map(b => b.projectId)).toEqual(['a', 'b']);
	expect(grouped.slots[48]).toBeUndefined();
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
	var d1 = new Date('2025-03-15T10:00:00+08:00');
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
	var d1 = new Date('2025-03-15T10:00:00+08:00');
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

test('applyDate keeps activity-only sessions when usage is empty', () => {
	var d1 = Date.parse('2025-03-15T10:00:00+08:00');
	var slot = Math.floor(d1 / 1800000);
	const projects = [{ id: 'p1', name: 'P1', path: '/p', sessions: [{ id: 's1', updatedAt: d1, slots: [{ slot, ms: 60000 }], slotStats: [{ slot, turns: 0, steps: 1, llmMs: 0, toolMs: 1000, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 }], slotUsage: [], stats: { turns: 0, steps: 1, llmMs: 0, toolMs: 1000, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 } }] }];
	const out = applyDate(projects, '2025-03-15');
	expect(out[0].sessions[0].stats.steps).toBe(1);
	expect(out[0].sessions[0].stats.toolMs).toBe(1000);
});

test('applyRange clips detailed sessions to the requested Beijing window', () => {
	var first = Math.floor(Date.parse('2025-03-13T10:00:00+08:00') / 1800000);
	var second = Math.floor(Date.parse('2025-03-15T10:00:00+08:00') / 1800000);
	const projects = [{ id: 'p1', name: 'P1', path: '/p', sessions: [{ id: 's1', updatedAt: Date.parse('2025-03-15T10:00:00+08:00'), slots: [{ slot: first, ms: 1000 }, { slot: second, ms: 1000 }], slotStats: [], slotUsage: [{ slot: first, uncached: 10, output: 1, cacheRead: 0, cacheWrite: 0, reasoning: 0 }, { slot: second, uncached: 20, output: 2, cacheRead: 0, cacheWrite: 0, reasoning: 0 }], stats: { turns: 0, steps: 0, llmMs: 0, toolMs: 0, uncached: 30, output: 3, cacheRead: 0, cacheWrite: 0, reasoning: 0 } }] }];
	expect(applyRange(projects, '2025-03-15', 2)[0].sessions[0].stats.uncached).toBe(20);
});

test('empty detail arrays still use the session timestamp fallback', () => {
	const updatedAt = Date.parse('2025-03-15T10:00:00+08:00');
	const byDay = sessionDayTokens([{ updatedAt, slots: [], slotStats: [], slotUsage: [], stats: { turns: 2, uncached: 10, outputTokens: 3, inputTokens: 10 } }]);
	expect(byDay.get('2025-03-15')).toMatchObject({ turns: 2, uncached: 10, output: 3 });
});

test('date range preserves legacy session stats when only activity slots exist', () => {
	const updatedAt = Date.parse('2025-03-15T10:00:00+08:00');
	const slot = Math.floor(updatedAt / 1800000);
	const projects = [{ id: 'p1', name: 'P1', path: '/p', sessions: [{ id: 's1', updatedAt, slots: [{ slot, ms: 60000 }], stats: { turns: 2, steps: 1, llmMs: 100, toolMs: 50, uncached: 10, output: 3, cacheRead: 4, cacheWrite: 0, reasoning: 0 } }] }];
	const out = applyDate(projects, '2025-03-15');
	expect(out[0].sessions[0].stats).toMatchObject({ turns: 2, uncached: 10, output: 3, cacheRead: 4 });
});

test('fallback timeline gives zero-duration sessions a forward one-minute activity interval', () => {
	const updatedAt = Date.parse('2025-03-15T00:00:00+08:00');
	const timeline = buildTimeline([{ id: 'p1', name: 'P1', sessions: [{ updatedAt, durMs: 0 }] }], 30);
	expect(timeline.days).toHaveLength(1);
	expect(timeline.days[0]).toMatchObject({ date: '2025-03-15', dayTotalMs: 60000 });
});

test('client aggregate parser validates nested RPC data', () => {
	const valid = { projects: [], timeline: { slotMinutes: 30, days: [] }, meta: { source: 'host', generatedAt: 1, degraded: false, warnings: [] } };
	expect(parseAggregateResult(valid)).toBe(valid);
	expect(() => parseAggregateResult({ ...valid, timeline: { days: [] } })).toThrow(/timeline\.slotMinutes/);
	expect(() => parseAggregateResult({ ...valid, timeline: { slotMinutes: 30, days: [{ date: '2025-03-15', dayTotalMs: 1, slotBlocks: [{ slot: 0, projectId: 'p', name: 'P', colorIndex: 0, ms: NaN }] }] } })).toThrow(/timeline\.days\[0\]\.slotBlocks\[0\]\.ms/);
});

test('modelAgg splits LLM/tool duration by token share across slotUsage models', () => {
	const sessions = [
		{
			id: 's1', model: 'deepseek-v4-pro',
			slotUsage: [
				{ slot: 0, model: 'deepseek-v4-pro', uncached: 9000, output: 900, cacheRead: 100, cacheWrite: 0, reasoning: 0 },
				{ slot: 0, model: 'deepseek-v4-flash', uncached: 900, output: 100, cacheRead: 0, cacheWrite: 0, reasoning: 0 },
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

test('project CSV exports provider-scoped pricing audit fields per usage slice', () => {
	const slot = Math.floor(Date.parse('2026-08-17T09:00:00+08:00') / 1800000);
	const projects = [{
		id: 'p1', name: 'Project A', path: '/workspace/a', sessionCount: 1,
		stats: { turns: 1, steps: 2, llmMs: 30, toolMs: 40, inputTokens: 1100, outputTokens: 100, cacheHitPct: 90.9 },
		sessions: [{
			id: 's1', title: 'Pricing check', updatedAt: slot * 1800000, quality: 'exact',
			providerId: 'deepseek-official', accountType: 'api', model: 'deepseek-v4-pro',
			slotUsage: [{ slot, providerId: 'deepseek-official', accountType: 'api', model: 'deepseek-v4-pro', serviceTier: 'standard', contextTokens: 1100, uncached: 100, cacheRead: 1000, cacheWrite: 0, output: 100, reasoning: 50 }],
			stats: { uncached: 100, cacheRead: 1000, cacheWrite: 0, output: 100, reasoning: 50 },
		}],
	}];
	const t = (key) => key;
	const table = projectCsvTable(projects, t);
	const row = Object.fromEntries(table[0].map((header, index) => [header, table[1][index]]));
	expect(table).toHaveLength(2);
	expect(row).toMatchObject({
		providerId: 'deepseek-official', providerFamily: 'deepseek', modelRaw: 'deepseek-v4-pro', modelCanonical: 'deepseek-v4-pro', accountType: 'api',
		currency: 'CNY', costStatus: 'exact', ruleId: 'deepseek/deepseek-v4-pro@2026-08-18', pricingSource: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing',
	});
	expect(row.costAmount).toBeCloseTo(0.0039, 8);
});
