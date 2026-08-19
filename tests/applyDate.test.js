// applyDate 跨日会话回归测试：修复「lastPromptAt 在前一天、token 消耗跨入当天」
// 的会话被整段丢弃、导致当天成本漏算的问题。
const { applyDate } = require('../src/client.cjs').__test;

const SLOT_MS = 1800000;

function makeSession(updatedAt, slotUsage) {
	return {
		id: 'session-cross-day',
		title: '跨日会话',
		updatedAt,
		createdAt: updatedAt,
		model: 'deepseek-v4-pro',
		modelUsage: [],
		archived: false,
		subagent: false,
		durMs: 0,
		slotUsage,
		stats: {
			turns: 10, steps: 20, llmMs: 1000, toolMs: 2000,
			ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0,
			uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0,
		},
	};
}

function makeProject(sessions) {
	return {
		id: 'proj-cross-day',
		name: '跨日项目',
		path: '/tmp/cross-day',
		sessionCount: sessions.length,
		subagentCount: 0,
		lastActiveAt: null,
		stats: null,
		sessions,
	};
}

test('applyDate 保留跨日会话并只统计当天 slot（核心回归）', () => {
	const dayKey = '2026-08-17';
	// 与 applyDate 内部相同的北京时区 dayStart 口径
	const dayStart = new Date(dayKey + 'T00:00:00+08:00').getTime();
	const slotBefore = Math.floor((dayStart - SLOT_MS) / SLOT_MS); // 前一天最后一个槽
	const slotInDay = Math.floor(dayStart / SLOT_MS);              // 当天第一个槽

	const session = makeSession(
		dayStart - 370260, // 前一天 23:53:49，早于当天 00:00
		[
			{ slot: slotBefore, uncached: 1000, output: 100, cacheRead: 100000, cacheWrite: 0, reasoning: 0 },
			{ slot: slotInDay, uncached: 100, output: 50, cacheRead: 50000, cacheWrite: 0, reasoning: 0 },
		]
	);

	const out = applyDate([makeProject([session])], dayKey);

	// 核心：会话不被整段丢弃
	expect(out[0].sessions.length).toBe(1);
	const clipped = out[0].sessions[0];
	// clip 后只保留当天 slot
	expect(clipped.slotUsage.length).toBe(1);
	expect(clipped.slotUsage[0].slot).toBe(slotInDay);
	// token 只统计当天
	expect(clipped.stats.cacheRead).toBe(50000);
	expect(clipped.stats.uncached).toBe(100);
	expect(clipped.stats.output).toBe(50);
});

test('applyDate 过滤所有 slot 都在当天之外的会话', () => {
	const dayKey = '2026-08-17';
	const dayStart = new Date(dayKey + 'T00:00:00+08:00').getTime();
	const slotBefore = Math.floor((dayStart - SLOT_MS) / SLOT_MS);

	const session = makeSession(
		dayStart - 2 * SLOT_MS,
		[{ slot: slotBefore, uncached: 1000, output: 100, cacheRead: 100000, cacheWrite: 0, reasoning: 0 }]
	);

	const out = applyDate([makeProject([session])], dayKey);
	expect(out.length).toBe(0);
});

test('applyDate 无逐槽数据的会话退回按 updatedAt 判断', () => {
	const dayKey = '2026-08-17';
	const dayStart = new Date(dayKey + 'T00:00:00+08:00').getTime();

	// 当天内（无 slotUsage）→ 保留
	const inDay = makeSession(dayStart + 1000, null);
	expect(applyDate([makeProject([inDay])], dayKey)[0].sessions.length).toBe(1);

	// 当天外（无 slotUsage）→ 过滤
	const outDay = makeSession(dayStart - 1000, null);
	expect(applyDate([makeProject([outDay])], dayKey).length).toBe(0);
});

test('applyDate 裁剪 slotUsage 时保留 model 字段（供逐模型计价）', () => {
	const dayKey = '2026-08-17';
	const dayStart = new Date(dayKey + 'T00:00:00+08:00').getTime();
	const slotBefore = Math.floor((dayStart - SLOT_MS) / SLOT_MS); // 前一天最后一个槽
	const slotInDay = Math.floor(dayStart / SLOT_MS);              // 当天第一个槽

	const session = makeSession(
		dayStart - 370260,
		[
			{ slot: slotBefore, model: 'deepseek-v4-pro', uncached: 1000, output: 100, cacheRead: 100000, cacheWrite: 0, reasoning: 0 },
			{ slot: slotInDay, model: 'deepseek-v4-flash', uncached: 100, output: 50, cacheRead: 50000, cacheWrite: 0, reasoning: 0 },
		]
	);

	const out = applyDate([makeProject([session])], dayKey);
	const clipped = out[0].sessions[0];

	// 裁剪后只保留当天 slot，且 model 字段原样保留
	expect(clipped.slotUsage.length).toBe(1);
	expect(clipped.slotUsage[0].slot).toBe(slotInDay);
	expect(clipped.slotUsage[0].model).toBe('deepseek-v4-flash');
	// token 只统计当天
	expect(clipped.stats.cacheRead).toBe(50000);
	expect(clipped.stats.uncached).toBe(100);
});

test('applyDate 不会把窗口外的整段会话费用带入活动日', () => {
	const dayKey = '2026-08-17';
	const dayStart = Date.parse(dayKey + 'T00:00:00+08:00');
	const session = makeSession(dayStart + 60_000, [{
		slot: Math.floor((dayStart - 1800000) / SLOT_MS),
		model: 'deepseek-v4-pro', providerId: 'deepseek-official', accountType: 'api',
		serviceTier: 'standard', contextTokens: 1000, contextOver512k: false,
		uncached: 1000, output: 100, cacheRead: 0, cacheWrite: 0, reasoning: 0,
	}]);
	session.slots = [{ slot: Math.floor(dayStart / SLOT_MS), ms: 60_000 }];
	session.cost = { status: 'exact', totals: [{ currency: 'CNY', amount: 3, exactAmount: 3, estimatedAmount: 0 }], unpricedTokens: 0, unknownRows: 0 };

	const clipped = applyDate([makeProject([session])], dayKey)[0].sessions[0];
	expect(clipped.slotUsage).toEqual([]);
	expect(clipped.cost).toEqual({ status: 'unsupported', totals: [], unpricedTokens: 0, unknownRows: 0 });
});

test('applyDate 将粗粒度跨日会话的 Token、耗时和费用只归入时间戳所在日', () => {
	const firstDay = '2026-08-17';
	const secondDay = '2026-08-18';
	const firstStart = Date.parse(firstDay + 'T00:00:00+08:00');
	const secondStart = Date.parse(secondDay + 'T00:00:00+08:00');
	const session = makeSession(firstStart + 60_000, null);
	session.slots = [
		{ slot: Math.floor((firstStart + 60_000) / SLOT_MS), ms: 60_000 },
		{ slot: Math.floor((secondStart + 60_000) / SLOT_MS), ms: 60_000 },
	];
	session.stats = {
		...session.stats,
		uncached: 100,
		output: 20,
		cacheRead: 30,
	};
	session.cost = { status: 'exact', totals: [{ currency: 'CNY', amount: 1.23, exactAmount: 1.23, estimatedAmount: 0 }], unpricedTokens: 0, unknownRows: 0 };

	const first = applyDate([makeProject([session])], firstDay)[0].sessions[0];
	const second = applyDate([makeProject([session])], secondDay)[0].sessions[0];
	expect(first.stats).toMatchObject({ turns: 10, steps: 20, llmMs: 1000, toolMs: 2000, uncached: 100, output: 20, cacheRead: 30 });
	expect(first.durMs).toBe(3000);
	expect(first.cost).toMatchObject({ status: 'exact', totals: [{ currency: 'CNY', amount: 1.23 }] });
	expect(second.stats).toMatchObject({ turns: 0, steps: 0, llmMs: 0, toolMs: 0, uncached: 0, output: 0, cacheRead: 0 });
	expect(second.durMs).toBe(0);
	expect(second.cost).toEqual({ status: 'unsupported', totals: [], unpricedTokens: 0, unknownRows: 0 });
});
