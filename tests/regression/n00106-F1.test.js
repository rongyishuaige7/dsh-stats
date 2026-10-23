// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] CSV 每行费用忽略宿主下发的 session.cost，与 sessionCostSummary/项目汇总口径不一致
// Source: src/client.cjs:124  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

// 目标：src/client.cjs —— CSV 导出（projectCsvTable）的费用口径
// F1：宿主已下发 session.cost（exact）时，CSV 明细行仍用伪造 usage 重新估算，
//     与 sessionCostSummary / 项目汇总列不一致。
const mod = require('../../src/client.cjs');
const { applyDate, projectCsvTable, sessionCostSummary } = mod.__test;

const DAY_KEY = '2026-08-17';
const DAY_START = Date.parse(DAY_KEY + 'T00:00:00+08:00');

// 宿主下发的权威费用（CNY，exact）
function hostCost() {
	return {
		status: 'exact',
		totals: [{ currency: 'CNY', amount: 1.23, exactAmount: 1.23, estimatedAmount: 0 }],
		unpricedTokens: 0,
		unknownRows: 0,
	};
}

// 只有会话级统计、没有 slotUsage 的“粗粒度”会话，但宿主给了 cost
function coarseSession() {
	return {
		id: 's-coarse',
		title: '粗粒度会话',
		updatedAt: DAY_START + 60_000,
		createdAt: DAY_START,
		model: 'MiniMax-M3',
		providerId: 'minimax',
		accountType: 'api',
		modelUsage: [],
		archived: false,
		subagent: false,
		durMs: 0,
		slotUsage: null,
		stats: {
			turns: 10, steps: 20, llmMs: 1000, toolMs: 2000,
			ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0,
			uncached: 600000, output: 2000, cacheRead: 0, cacheWrite: 0, reasoning: 0,
		},
		cost: hostCost(),
	};
}

function projectOf(sessions) {
	return {
		id: 'p-coarse',
		name: '项目',
		path: '/tmp/coarse',
		sessionCount: sessions.length,
		subagentCount: 0,
		lastActiveAt: null,
		stats: null,
		sessions,
	};
}

test('[F1] CSV 明细行费用应沿用宿主 session.cost，而不是重新估算', () => {
	const project = projectOf([coarseSession()]);
	const session = project.sessions[0];

	// 会话汇总（面板/项目列使用的口径）已经是 exact 1.23
	const summary = sessionCostSummary(session);
	expect(summary.status).toBe('exact');
	expect(summary.totals[0].amount).toBeCloseTo(1.23, 10);

	const [headers, row] = projectCsvTable([project], (key) => key);

	// 同一个会话，CSV 行状态/金额必须与会话汇总一致
	expect(row[headers.indexOf('costStatus')]).toBe('exact');
	expect(row[headers.indexOf('costAmount')]).toBeCloseTo(1.23, 10);
	expect(row[headers.indexOf('exactAmount')]).toBeCloseTo(1.23, 10);
});

test('[F1] 按日裁剪后的粗粒度会话，导出费用仍应与会话汇总一致', () => {
	// 真实路径：applyDate 会给粗粒度会话写入 cost（见 tests/applyDate.test.js）
	const clippedProject = applyDate([projectOf([coarseSession()])], DAY_KEY)[0];
	const clipped = clippedProject.sessions[0];

	const summary = sessionCostSummary(clipped);
	expect(summary.status).toBe('exact');

	const [headers, row] = projectCsvTable([clippedProject], (key) => key);
	expect(row[headers.indexOf('costStatus')]).toBe('exact');
	expect(row[headers.indexOf('costAmount')]).toBeCloseTo(1.23, 10);
});

