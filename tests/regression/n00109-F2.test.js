// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] 别名未转小写导致搜索大小写不敏感失效
// Source: src/pricing-view.cjs:61  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { test, expect, vi, afterEach } from 'vitest';
import view from '../../src/pricing-view.cjs';

const { rulePhase, catalogGroups, modelPriceSummary, selectModelGroups } = view;

afterEach(() => {
  vi.useRealTimers();
});

const NOW = Date.parse('2026-06-01T00:00:00Z');

const ruleOf = (id, extra = {}) => ({
  id,
  providerId: 'one',
  family: 'one',
  canonical: 'demo',
  aliases: ['demo'],
  currency: 'CNY',
  sourceUrl: null,
  retrievedAt: '2026-01-01',
  confidence: 'exact',
  reasoningIncludedInOutput: true,
  rates: { uncached: 1, cacheRead: 0.5, cacheWrite: 2, output: 4 },
  ...extra,
});

// [night-evolver] 这条发现还没修，测试暂不提升;

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] 搜索应大小写不敏感地匹配别名，混合大小写别名也要能命中', () => {
  const groups = catalogGroups(
    { rules: [ruleOf('a', { canonical: 'alpha', aliases: ['alpha', 'Beta-Alias'] })] },
    new Set(),
    NOW,
  );

  expect(selectModelGroups(groups, { search: 'beta-alias' }).modelCount).toBe(1);
});

