// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 带 contextThreshold 的上下文分段计价规则被当成 flat 单一价展示
// Source: src/pricing-view.cjs:72  Contract: src/pricing-view.cjs:68-71（注释承诺：Context ... prices keep every condition in the detail view instead of promoting one tier to a general price）
// Verified fixed by `recheck`; do not delete without checking the finding.

import { expect, test } from 'vitest';
import mod from '../../src/pricing-view.cjs';

const { catalogGroups, modelPriceSummary } = mod;
const at = Date.parse('2026-10-17T12:00:00Z');

const ruleOf = (id, providerId, canonical, extra = {}) => ({
  id, providerId, family: providerId, canonical, aliases: [canonical.toLowerCase()],
  currency: 'CNY', sourceUrl: null, retrievedAt: '2026-10-01', confidence: 'exact',
  reasoningIncludedInOutput: true,
  rates: { uncached: 1, cacheRead: 0.5, cacheWrite: 2, output: 4 },
  ...extra,
});

test('[F1] 带 contextThreshold 的上下文分段计价规则不应被判为 flat 单一价', () => {
  const rule = ruleOf('ctx', 'openai', 'gpt-demo', { contextThreshold: 272000 });
  const [group] = catalogGroups({ rules: [rule] }, new Set(), at);
  const summary = modelPriceSummary(group);
  expect(summary.kind).toBe('tiered');
  expect(summary.rule).toBeUndefined();
});

