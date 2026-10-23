// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 逐槽 usage 行的负 token 分量未钳制，槽位 token 汇总变成负数
// Source: src/client-timeline-model.cjs:229  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('../../src/client-timeline-model.cjs');
const { dayStartMs } = require('../../src/client-data.cjs');
const { SLOT_MS } = require('../../src/client-format.cjs');

const DATE = '2026-10-14';
const BASE = Math.floor(dayStartMs(DATE) / SLOT_MS);

// 宿主可能给出 inputTokens < cacheRead + cacheWrite 的用量行，此时 uncached 为负。
function negativeUsageSession() {
	return {
		id: 's1',
		title: 'Negative usage',
		model: 'deepseek-chat',
		providerId: 'deepseek',
		accountType: 'api',
		slotUsage: [{ slot: BASE + 4, uncached: -500, cacheRead: 100, cacheWrite: 0, output: 0 }],
	};
}

test('[F1] sessionDaySlots clamps negative usage token components to zero', () => {
	const out = mod.sessionDaySlots(negativeUsageSession(), DATE);
	const entry = out.usage.get(4);
	expect(entry).toBeTruthy();
	expect(entry.tokens).toBe(100);
});

test('[F1] timelineDayModel never reports negative slotTokens', () => {
	const model = mod.timelineDayModel({
		day: { date: DATE, slotBlocks: [] },
		projects: [{ id: 'p', name: 'P', sessions: [negativeUsageSession()] }],
		date: DATE,
	});
	expect(model.sessionRows).toHaveLength(1);
	expect(model.sessionRows[0].usage.get(4).tokens).toBe(100);
	expect(model.slotTokens[4]).toBe(100);
});

