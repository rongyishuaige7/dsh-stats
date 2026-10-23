// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] providerId 大小写不同会把同一 provider/model 拆成两个模型分组
// Source: src/pricing-view.cjs:9  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { test, expect } from 'vitest';
import mod from '../../src/pricing-view.cjs';

const { catalogGroups, usedModelKeys } = mod;
const at = Date.parse('2026-10-17T12:00:00Z');

const ruleOf = (id, providerId, canonical, extra = {}) => ({
  id, providerId, family: providerId, canonical, aliases: [canonical.toLowerCase()],
  currency: 'CNY', sourceUrl: null, retrievedAt: '2026-10-01', confidence: 'exact',
  reasoningIncludedInOutput: true,
  rates: { uncached: 1, cacheRead: 0.5, cacheWrite: 2, output: 4 },
  ...extra,
});

test('[F1] providerId 大小写不同时同一 provider/model 仍应只有一个分组', () => {
  const catalog = { rules: [
    ruleOf('catalog-now', 'openai', 'gpt-demo', { effectiveFrom: '2026-10-01T00:00:00Z' }),
    ruleOf('override-now', 'OpenAI', 'gpt-demo', {
      family: 'openai', confidence: 'estimated', effectiveFrom: '2026-10-01T00:00:00Z',
    }),
  ] };
  const groups = catalogGroups(catalog, new Set(), at);
  const demo = groups.filter(group => group.canonical === 'gpt-demo');
  expect(demo).toHaveLength(1);
  expect(demo[0].rules.map(row => row.rule.id).sort()).toEqual(['catalog-now', 'override-now']);
});

// [night-evolver] 这条发现还没修，测试暂不提升;

