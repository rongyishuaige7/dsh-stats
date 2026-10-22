// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F3] pricedAt 为有限但超出 Date 可表示范围的时间戳时，convertCostToCny 抛 RangeError 而不是回退到最新汇率快照
// Source: src/pricing.cjs:326-328  Contract: —
// Verified fixed at cc91b835d19f199f7256ed156bd81d99f3f138f2 by `recheck`; do not delete without checking the finding.

import { describe, test, expect } from 'vitest';
import mod from '../../src/pricing.cjs';

// 自建 USD catalog：两条 FX 快照（2026-01-01 = 7.0，2026-08-18 = 8.0），
// 用于验证“按用量日选汇率”的语义。
const usdCatalog = () => ({
  schemaVersion: 2,
  version: 1,
  publishedAt: '2026-01-01T00:00:00Z',
  rules: [{
    id: 'usd-openai-test',
    family: 'openai',
    canonical: 'gpt-test',
    aliases: ['gpt-test'],
    currency: 'USD',
    sourceUrl: 'https://example.com/pricing',
    retrievedAt: '2026-01-01',
    confidence: 'exact',
    reasoningIncludedInOutput: true,
    providerId: 'openai',
    rates: { uncached: 1, cacheRead: 0, cacheWrite: 0, output: 2 },
  }],
  fx: [
    { date: '2026-01-01', usdCny: 7, sourceUrl: 'https://example.com/fx' },
    { date: '2026-08-18', usdCny: 8, sourceUrl: 'https://example.com/fx' },
  ],
});

const engine = () => mod.createPricing(usdCatalog());

describe('pricing error paths', () => {
  // [night-evolver] 这条发现还没修，测试暂不提升;

  // [night-evolver] 这条发现还没修，测试暂不提升;

  test('[F3] 超出 Date 范围的 pricedAt 使 convertCostToCny 抛 RangeError 而不是回退到最新汇率', () => {
    const pricing = engine();
    const cost = pricing.priceUsage(
      { time: 1e18, uncached: 1000000, output: 0 },
      { providerId: 'openai', modelRaw: 'gpt-test', accountType: 'api' },
    );
    expect(cost.status).toBe('exact');
    expect(cost.pricing.pricedAt).toBe(1e18);
    let converted;
    expect(() => { converted = pricing.convertCostToCny(cost); }).not.toThrow();
    expect(converted.currency).toBe('CNY');
  });
});

