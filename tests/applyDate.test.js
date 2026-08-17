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
	// 与 applyDate 内部相同的 dayStart 口径（本地时区，测试与时区无关自洽）
	const dayStart = new Date(dayKey + 'T00:00:00').getTime();
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
	const dayStart = new Date(dayKey + 'T00:00:00').getTime();
	const slotBefore = Math.floor((dayStart - SLOT_MS) / SLOT_MS);

	const session = makeSession(
		dayStart - 2 * SLOT_MS,
		[{ slot: slotBefore, uncached: 1000, output: 100, cacheRead: 100000, cacheWrite: 0, reasoning: 0 }]
	);

	const out = applyDate([makeProject([session])], dayKey);
	expect(out[0].sessions.length).toBe(0);
});

test('applyDate 无逐槽数据的会话退回按 updatedAt 判断', () => {
	const dayKey = '2026-08-17';
	const dayStart = new Date(dayKey + 'T00:00:00').getTime();

	// 当天内（无 slotUsage）→ 保留
	const inDay = makeSession(dayStart + 1000, null);
	expect(applyDate([makeProject([inDay])], dayKey)[0].sessions.length).toBe(1);

	// 当天外（无 slotUsage）→ 过滤
	const outDay = makeSession(dayStart - 1000, null);
	expect(applyDate([makeProject([outDay])], dayKey)[0].sessions.length).toBe(0);
});

test('applyDate 裁剪 slotUsage 时保留 model 字段（供逐模型计价）', () => {
	const dayKey = '2026-08-17';
	const dayStart = new Date(dayKey + 'T00:00:00').getTime();
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
