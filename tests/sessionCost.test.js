// sessionCost 跨模型计价回归测试：跨模型会话里 flash 的 token 应按 flash 价格算，
// 而不是被按会话主要模型（pro）价格误算。slotUsage 已带 model 字段。
const { sessionCost } = require('../src/client.cjs').__test;

const SLOT_MS = 1800000;
const DAY_START = Date.parse('2026-08-17T00:00:00+08:00'); // 8/17 00:00（北京）→ offPeak

test('跨模型会话按逐模型价格计价（flash 不按 pro 高价算）', () => {
	const slot = Math.floor(DAY_START / SLOT_MS);
	const session = {
		model: 'deepseek-v4-pro',
		updatedAt: DAY_START,
		slotUsage: [
			{ slot, model: 'deepseek-v4-pro', uncached: 900, output: 90, cacheRead: 99000, cacheWrite: 0, reasoning: 0 },
			{ slot, model: 'deepseek-v4-flash', uncached: 100, output: 10, cacheRead: 1000, cacheWrite: 0, reasoning: 0 },
		],
		stats: {},
	};

	const cost = sessionCost(session);
	// pro offPeak: 900*4.5 + 99000*0.15 + 90*13.5 = 20115 (→ 0.020115)
	// flash offPeak: 100*1.5 + 1000*0.05 + 10*4.5 = 245 (→ 0.000245)
	expect(cost).toBeCloseTo(0.02036, 5);
});

test('跨模型会话按逐模型计价（结果低于全部按 pro 计）', () => {
	const slot = Math.floor(DAY_START / SLOT_MS);
	const session = {
		model: 'deepseek-v4-pro',
		updatedAt: DAY_START,
		slotUsage: [
			{ slot, model: 'deepseek-v4-pro', uncached: 500, output: 50, cacheRead: 50000, cacheWrite: 0, reasoning: 0 },
			{ slot, model: 'deepseek-v4-flash', uncached: 500, output: 50, cacheRead: 50000, cacheWrite: 0, reasoning: 0 },
		],
		stats: {},
	};

	const cost = sessionCost(session);
	// 全部按 pro 计的对照：1000*4.5 + 100000*0.15 + 100*13.5 = 20850 (→ 0.02085)
	expect(cost).toBeLessThan(0.02085);
});

test('单模型会话仍按 s.model 逐槽计价', () => {
	const slot = Math.floor(DAY_START / SLOT_MS);
	const session = {
		model: 'deepseek-v4-pro',
		updatedAt: DAY_START,
		slotUsage: [
			{ slot, model: 'deepseek-v4-pro', uncached: 1000, output: 100, cacheRead: 100000, cacheWrite: 0, reasoning: 0 },
		],
		stats: {},
	};

	const cost = sessionCost(session);
	// 1000*4.5 + 100000*0.15 + 100*13.5 = 20850 (→ 0.02085)
	expect(cost).toBeCloseTo(0.02085, 5);
});

test('未知模型不再静默套用 Pro 价格', () => {
	const slot = Math.floor(DAY_START / SLOT_MS);
	const cost = sessionCost({ model: 'MiniMax-M3', updatedAt: DAY_START, slotUsage: [{ slot, model: 'MiniMax-M3', uncached: 1000, output: 100, cacheRead: 0, cacheWrite: 0, reasoning: 0 }], stats: {} });
	expect(cost).toBeNull();
});
