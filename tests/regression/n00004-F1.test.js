// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 按日裁剪的粗粒度回退只兼容 outputTokens 别名，只有 inputTokens 的会话输入 token 被清零
// Source: src/client-data.cjs:81  Contract: src/client-data.cjs:609-610（同文件 sessionDayTokens 同时兼容 inputTokens/uncached 与 output/outputTokens 两种 stats 形态）；src/client-data.cjs:697（modelAgg 在缺 uncached 时用 inputTokens-cacheRead-cacheWrite 推导 uncached）
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';
import { test, expect } from 'vitest';

const require = createRequire(import.meta.url);
const mod = require('../../src/client-data.cjs');

const SLOT_MS = 1800000;
const DAY = '2026-09-08';
const DAY_START = mod.dayStartMs(DAY);

function legacySession() {
	return {
		id: 's-legacy',
		title: 'legacy-host',
		updatedAt: DAY_START + 2 * 3600000,
		// 宿主提供逐槽活动，但没有 slotUsage/slotStats：走 applyWindow 的粗粒度回退
		slots: [{ slot: DAY_START / SLOT_MS + 2, ms: SLOT_MS }],
		// 旧宿主只有会话级 inputTokens/outputTokens，没有 uncached/cacheRead/cacheWrite
		stats: {
			turns: 2, steps: 2, llmMs: 1000, toolMs: 0,
			ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0,
			inputTokens: 1000, outputTokens: 100,
		},
	};
}

function projectWith(sessions) {
	return {
		id: 'p', name: 'P', path: '/p', sessionCount: sessions.length,
		subagentCount: 0, lastActiveAt: null, stats: {}, sessions,
	};
}

test('[F1] 只有 inputTokens 的粗粒度会话按日裁剪后输入 token 不应归零', () => {
	const out = mod.applyDate([projectWith([legacySession()])], DAY);
	expect(out).toHaveLength(1);
	// 会话级：输入 token 必须保留（当前实现只剩 outputTokens，inputTokens 变 0）
	expect(out[0].sessions[0].stats.inputTokens).toBe(1000);
	// 项目级：sumSessionStats 重新求和后同样不能丢输入 token
	expect(out[0].stats.inputTokens).toBe(1000);
	// 对照：outputTokens 走 st.output || st.outputTokens 别名，应被保留
	expect(out[0].sessions[0].stats.outputTokens).toBe(100);
});

