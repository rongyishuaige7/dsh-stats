// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] USD 汇总经 mergeCostSummariesCny 换算时丢失 pricing.pricedAt，历史用量按最新汇率折算，与 summarizeCostsCny 结果不一致
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
  test('[F1] 历史 USD 用量经 summary 汇总换算时丢失 pricedAt，与逐条换算使用了不同汇率', () => {
    const pricing = engine();
    const at = Date.parse('2026-01-05T12:00:00Z'); // 当日快照 7.0，最新快照 8.0
    const cost = pricing.priceUsage(
      { time: at, uncached: 1000000, output: 0 },
      { providerId: 'openai', modelRaw: 'gpt-test', accountType: 'api' },
    );
    expect(cost).toMatchObject({ status: 'exact', currency: 'USD', amount: 1 });

    const direct = pricing.summarizeCostsCny([cost]);
    const merged = pricing.mergeCostSummariesCny([pricing.summarizeCosts([cost])]);
    expect(direct.totals).toHaveLength(1);
    expect(merged.totals).toHaveLength(1);
    // 两条公开汇总路径对同一批用量必须使用同一个（当日）汇率快照
    expect(merged.totals[0].amount).toBeCloseTo(direct.totals[0].amount, 10);
    expect(merged.totals[0].amount).toBeCloseTo(7, 10);
  });

  // [night-evolver] 这条发现还没修，测试暂不提升;

  // [night-evolver] 这条发现还没修，测试暂不提升;
});

