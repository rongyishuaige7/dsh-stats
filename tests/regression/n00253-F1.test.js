// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 无 slotStats 的会话，sessionDayTokens 的粗粒度回退只补 turns/steps/llmMs/toolMs，丢掉会话级 TTFT 与 decode 指标
// Source: src/client-data.cjs:597  Contract: src/client-data.cjs:77-80（applyWindow 的同类粗粒度回退把 st.ttftMs/ttftSteps/decodeMs/decodeTokens 归到时间戳窗口；emptyBucket/addBucket 第 537、542-543 行也承诺这些字段进入按天/总计桶）
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';
import { test, expect } from 'vitest';

const require = createRequire(import.meta.url);
const mod = require('../../src/client-data.cjs');

const SLOT_MS = 1800000;
const DAY = '2026-09-08';

test('[F1] 没有 slotStats 的会话，其会话级 TTFT/decode 指标也应归到时间戳当天并进入 byDay 汇总', () => {
	const start = mod.dayStartMs(DAY);
	const session = {
		id: 's1',
		updatedAt: start + 3600000,
		slotUsage: [{ slot: start / SLOT_MS + 2, uncached: 100, output: 50, cacheRead: 0, cacheWrite: 0, reasoning: 0 }],
		stats: {
			turns: 2, steps: 2, llmMs: 1200, toolMs: 300,
			ttftMs: 800, ttftSteps: 4, decodeMs: 2000, decodeTokens: 500,
			uncached: 100, output: 50, cacheRead: 0, cacheWrite: 0, reasoning: 0,
		},
	};

	const bucket = mod.sessionDayTokens([session]).get(DAY);
	expect(bucket).toBeTruthy();
	// 会话级时间指标（turns/llmMs）确实被归到当天，说明 legacy 回退分支已执行
	expect(bucket.llmMs).toBe(1200);
	// 同一分支应同时带上 TTFT 与 decode 指标
	expect(bucket.ttftMs).toBe(800);
	expect(bucket.ttftSteps).toBe(4);
	expect(bucket.decodeMs).toBe(2000);
	expect(bucket.decodeTokens).toBe(500);
});

