// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] legacy（peak/offPeak）模式的 DeepSeek 规则在周末仍按峰时价计费
// Source: src/pricing.cjs:421  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import mod from '../../src/pricing.cjs';

const rates = (uncached, output) => ({ uncached, cacheRead: 0, cacheWrite: 0, output });

const makeCatalog = (rules, fx = [{ date: '2026-01-01', usdCny: 7.2, sourceUrl: 'https://example.com/fx' }]) => ({
  schemaVersion: 2,
  version: 1,
  publishedAt: '2026-01-01T00:00:00Z',
  rules,
  fx,
});

const legacyDeepSeekRule = {
  id: 'test/deepseek-legacy',
  family: 'deepseek',
  canonical: 'deepseek-test-legacy',
  aliases: ['deepseek-test-legacy'],
  currency: 'CNY',
  sourceUrl: 'https://example.com/pricing',
  retrievedAt: '2026-08-01',
  confidence: 'exact',
  reasoningIncludedInOutput: true,
  legacy: rates(1, 2),
  peak: rates(10, 20),
  offPeak: rates(1, 2),
};

const timeOfUseDeepSeekRule = {
  id: 'test/deepseek-tou',
  family: 'deepseek',
  canonical: 'deepseek-test-tou',
  aliases: ['deepseek-test-tou'],
  currency: 'CNY',
  sourceUrl: 'https://example.com/pricing',
  retrievedAt: '2026-08-01',
  confidence: 'exact',
  reasoningIncludedInOutput: true,
  timeOfUse: {
    peak: rates(10, 20),
    offPeak: rates(1, 2),
    calendar: {
      from: '2026-08-01',
      to: '2026-12-31',
      holidays: [],
      sourceUrl: 'https://example.com/calendar',
    },
  },
};

test('[F1] legacy 模式的 DeepSeek 规则在周六 10:00（北京）仍按峰时价计费，而周末应全天谷时', () => {
  const engine = mod.createPricing(makeCatalog([legacyDeepSeekRule, timeOfUseDeepSeekRule]));
  // 2026-08-22 是周六；10:00 北京落在 9:00-12:00 的峰时时段内
  const saturdayPeak = Date.parse('2026-08-22T10:00:00+08:00');

  const touCost = engine.priceUsage(
    { time: saturdayPeak, uncached: 1e6 },
    { providerId: 'deepseek', modelRaw: 'deepseek-test-tou' }
  );
  const legacyCost = engine.priceUsage(
    { time: saturdayPeak, uncached: 1e6 },
    { providerId: 'deepseek', modelRaw: 'deepseek-test-legacy' }
  );

  // 同提供商、同一时刻：timeOfUse 规则正确地判为周末谷时（1 元/百万）
  expect(touCost.amount).toBeCloseTo(1, 10);
  // legacy 规则也应排除周末，而不是收峰时价（10 元/百万）
  expect(legacyCost.amount).toBeCloseTo(1, 10);
});

// [night-evolver] 这条发现还没修，测试暂不提升;

