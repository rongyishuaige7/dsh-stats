// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] 汇总 totals 中出现 null/undefined 行时 convertCostSummaryToCny / mergeCostSummaries 直接抛 TypeError，而不是计为转换失败
// Source: src/pricing.cjs:351-358  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

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

  test('[F2] totals 中的 null 行导致汇总换算抛 TypeError 而不是计为转换失败', () => {
    const summary = {
      status: 'exact',
      totals: [null, { currency: 'CNY', amount: 5, exactAmount: 5, estimatedAmount: 0 }],
      unpricedTokens: 0,
      unknownRows: 0,
    };
    let converted;
    expect(() => { converted = mod.convertCostSummaryToCny(summary); }).not.toThrow();
    expect(converted.totals).toEqual([{ currency: 'CNY', amount: 5, exactAmount: 5, estimatedAmount: 0 }]);
    expect(() => mod.mergeCostSummaries([{ status: 'exact', totals: [null] }])).not.toThrow();
  });

  // [night-evolver] 这条发现还没修，测试暂不提升;
});

