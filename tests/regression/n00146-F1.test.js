// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] usedModelKeys 调用 normalizeIdentity 时把 time 与 accountType 传反，带账户类型/时间窗的订阅用量无法解析出模型身份
// Source: src/pricing-view.cjs:41  Contract: src/pricing-view.cjs:38（同一处用量解析按 time→accountType 顺序取值）以及 src/pricing.cjs 同类函数 indexedMatches(indexes, raw, at, accountType)、longestAliasMatch(index, model, when, accountType) 的参数约定：时间参数在 accountType 之前
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';
import { test, expect, vi } from 'vitest';

const require = createRequire(import.meta.url);
const pricing = require('../../src/pricing.cjs');
const view = require('../../src/pricing-view.cjs');

const usageTime = Date.parse('2026-10-17T12:00:00Z');

test('[F1] usedModelKeys 应按 (providerId, model, time, accountType) 顺序调用 normalizeIdentity', () => {
  const calls = [];
  const catalog = { ...pricing.BUILTIN };
  const realCreate = pricing.createPricing;
  const spy = vi.spyOn(pricing, 'createPricing').mockImplementation((input) => {
    if (input !== catalog) return realCreate(input);
    return {
      priceUsage: () => ({ ruleId: null }),
      normalizeIdentity: (...args) => {
        calls.push(args);
        return { providerId: 'demo', providerFamily: 'demo', modelCanonical: 'demo-model' };
      },
    };
  });
  try {
    view.usedModelKeys([{ sessions: [{ slotUsage: [
      { providerId: 'demo', model: 'demo-model-alias', time: usageTime, accountType: 'subscription' },
    ] }] }], catalog);
  } finally {
    spy.mockRestore();
  }
  expect(calls).toHaveLength(1);
  expect(calls[0]).toEqual(['demo', 'demo-model-alias', usageTime, 'subscription']);
});

