// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 调用方已显式声明 contextOver512k=false 时仍按长上下文档计价（静默超额计费且标记 exact）
// Source: src/pricing.cjs:416  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

const mod = require('../../src/pricing.cjs');

// 一个自包含的最小合法 catalog：只含一条 provider 级 serviceTiers 规则，
// short/long 单价相差 10 倍，便于用金额判断实际选中的档位。
function engineWithServiceTiers() {
  return mod.createPricing({
    schemaVersion: 1,
    version: 1,
    publishedAt: '2026-08-01T00:00:00Z',
    rules: [{
      id: 'acme/chat',
      family: 'acme',
      providerId: 'acme',
      canonical: 'acme-chat',
      aliases: ['acme-chat'],
      currency: 'CNY',
      sourceUrl: 'https://example.com/pricing',
      retrievedAt: '2026-08-01',
      confidence: 'exact',
      reasoningIncludedInOutput: true,
      serviceTiers: {
        standard: {
          short: { uncached: 1, cacheRead: 0.5, cacheWrite: 1, output: 2 },
          long: { uncached: 10, cacheRead: 5, cacheWrite: 10, output: 20 },
        },
      },
    }],
    fx: [{ date: '2026-08-01', usdCny: 7, sourceUrl: 'https://example.com/fx' }],
  });
}

const AT = Date.parse('2026-08-17T10:00:00+08:00');

test('[F1] 显式 contextOver512k=false 的用量不应按长上下文档计价', () => {
  const engine = engineWithServiceTiers();
  const cost = engine.priceUsage({
    providerId: 'acme',
    modelRaw: 'acme-chat',
    time: AT,
    serviceTier: 'standard',
    contextOver512k: false,
    uncached: 600000,
    cacheRead: 0,
    cacheWrite: 0,
    output: 0,
  });

  // 调用方已声明上下文未超过 512k，应命中 standard.short：600000 * 1 / 1e6
  expect(cost.status).toBe('exact');
  expect(cost.amount).toBeCloseTo(0.6, 10);
});

// [night-evolver] 这条发现还没修，测试暂不提升;

