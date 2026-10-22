// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] retrievedAt / fx.date 未做 typeof 校验，数组等非字符串值经正则隐式转字符串后通过校验并原样进入快照
// Source: src/pricing-validation.cjs:37  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import mod from '../../src/pricing-validation.cjs';

function customRule(extra = {}) {
  return {
    id: 'custom-astra',
    providerId: 'yi-api',
    family: 'unknown',
    canonical: 'gpt-6-astra',
    aliases: ['gpt-6-astra'],
    currency: 'CNY',
    rates: { uncached: 1, output: 2, cacheRead: 0, cacheWrite: null },
    sourceUrl: null,
    retrievedAt: '2026-09-17',
    confidence: 'estimated',
    reasoningIncludedInOutput: true,
    ...extra,
  };
}

function catalogRule(extra = {}) {
  return {
    id: 'deepseek-chat',
    family: 'deepseek',
    canonical: 'deepseek-chat',
    aliases: ['deepseek-chat'],
    currency: 'CNY',
    rates: { uncached: 1, output: 2, cacheRead: 0, cacheWrite: null },
    sourceUrl: 'https://example.com/pricing',
    retrievedAt: '2026-09-17',
    confidence: 'exact',
    reasoningIncludedInOutput: true,
    ...extra,
  };
}

function catalog(extra = {}) {
  return {
    schemaVersion: 1,
    version: 1,
    publishedAt: '2026-09-17T00:00:00Z',
    rules: [catalogRule()],
    fx: [{ date: '2026-09-17', usdCny: 7.2, sourceUrl: 'https://example.com/fx' }],
    ...extra,
  };
}

test('[F1] retrievedAt / fx.date 接受数组等非字符串值（正则与 Date.parse 隐式 ToString）', () => {
  // 单元素数组会被 ToString 成 '2026-09-17'，正则与 Date.parse 都判定为合法日期
  expect(() => mod.validateOverrides([customRule({ retrievedAt: ['2026-09-17'] })])).toThrow();
  expect(() =>
    mod.validateCatalog(
      catalog({ fx: [{ date: ['2026-09-17'], usdCny: 7.2, sourceUrl: 'https://example.com/fx' }] }),
    ),
  ).toThrow();
});

// [night-evolver] 这条发现还没修，测试暂不提升;

