// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] projectCsvTable 对无法解析的 updatedAt 直接 toISOString 抛 RangeError，整份 CSV 导出失败
// Source: src/client.cjs:126  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

// tests/evolver/n00042.test.js
// F1: projectCsvTable 的时间列在遇到不可解析的时间值时直接 toISOString()，
// 抛出 RangeError 让整份 CSV 导出失败；同一行组里的 slotStart 却用 Number.isFinite 做了保护。
const mod = require('../../src/client.cjs');
const { projectCsvTable } = mod.__test;

const SLOT_MS = 1800000;
const DAY_START = Date.parse('2026-08-17T00:00:00+08:00');
const SLOT = Math.floor(DAY_START / SLOT_MS);

const t = (key) => key;

function makeProject(session) {
	return {
		id: 'proj-time',
		name: '时间项目',
		path: '/tmp/time',
		sessionCount: 1,
		subagentCount: 0,
		lastActiveAt: null,
		stats: {},
		sessions: [session],
	};
}

const HEADERS = projectCsvTable([], t)[0];
const UPDATED_AT = HEADERS.indexOf('updatedAt');

const USAGE = {
	slot: SLOT,
	model: 'deepseek-v4-pro',
	providerId: 'deepseek-official',
	accountType: 'api',
	serviceTier: 'standard',
	contextTokens: 1000,
	uncached: 1000,
	output: 100,
	cacheRead: 0,
	cacheWrite: 0,
	reasoning: 0,
};

describe('projectCsvTable 时间列容错', () => {
	test('[F1] updatedAt 为 NaN 时 updatedAt 列应为空串而不是抛 RangeError', () => {
		expect(UPDATED_AT).toBeGreaterThan(-1);
		const project = makeProject({ id: 's-nan', title: 'NaN 时间', updatedAt: NaN, slotUsage: [USAGE], stats: {} });
		let rows = null;
		expect(() => { rows = projectCsvTable([project], t); }).not.toThrow();
		expect(rows[1][UPDATED_AT]).toBe('');
	});

	test('[F1] updatedAt 为无法解析的字符串时 updatedAt 列应为空串而不是抛 RangeError', () => {
		expect(UPDATED_AT).toBeGreaterThan(-1);
		const project = makeProject({ id: 's-bad', title: '非法时间', updatedAt: 'not-a-date', slotUsage: [USAGE], stats: {} });
		let rows = null;
		expect(() => { rows = projectCsvTable([project], t); }).not.toThrow();
		expect(rows[1][UPDATED_AT]).toBe('');
	});
});

