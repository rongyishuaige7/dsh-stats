// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] pricingIncomplete 依赖 route row 上不存在的 count 字段，所有逐槽用量都被标记为计价信息不完整
// Source: src/client-data.cjs:257  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';
import { test, expect, vi } from 'vitest';

const require = createRequire(import.meta.url);
const mod = require('../../src/client-data.cjs');
const pricing = require('../../src/pricing.cjs');

const SLOT_MS = 1800000;
const DAY = '2026-09-08';
const DAY_START = mod.dayStartMs(DAY);

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] 宿主提供 contextTokens 的逐槽用量不应标记为计价信息不完整', () => {
	const slot = DAY_START / SLOT_MS + 4;
	const session = {
		id: 's-pricing',
		updatedAt: DAY_START,
		modelRaw: 'deepseek-v4-flash',
		providerId: 'deepseek',
		accountType: 'api',
		projectionValues: {
			statsRoute: {
				routes: [{
					slot,
					time: DAY_START + 2 * 3600000,
					model: 'deepseek-v4-flash',
					providerId: 'deepseek',
					accountType: 'api',
					serviceTier: 'standard',
					contextTokens: 300000,
					uncached: 1000,
					output: 200,
					cacheRead: 300,
					cacheWrite: 0,
					reasoning: 0,
				}],
			},
		},
	};
	const identity = mod.projectionIdentityOf(session);
	const rows = mod.projectionSlotUsageOf(session, identity);
	expect(rows).toHaveLength(1);
	expect(rows[0].contextTokens).toBe(300000);
	expect(rows[0].pricingIncomplete).toBe(false);
});

