// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] tierMultipliers 取假值（0 / '' / false / null / NaN）时被真值判断跳过校验，任意值原样进入冻结快照
// Source: src/pricing-validation.cjs:60  Contract: —
// Verified fixed at cc91b835d19f199f7256ed156bd81d99f3f138f2 by `recheck`; do not delete without checking the finding.

import { describe, test, expect } from 'vitest';
import mod from '../../src/pricing-validation.cjs';

function custom(extra = {}) {
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
    id: 'ds-chat',
    family: 'deepseek',
    canonical: 'deepseek-chat',
    aliases: ['deepseek-chat'],
    currency: 'CNY',
    rates: { uncached: 1, output: 2, cacheRead: 0.5, cacheWrite: null },
    sourceUrl: 'https://api-docs.deepseek.com/quick_start/pricing',
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
    fx: [{ date: '2026-09-17', usdCny: 7.1, sourceUrl: 'https://example.com/fx' }],
    ...extra,
  };
}

describe('pricing-validation error paths', () => {
  test('[F1] tierMultipliers 取假值 0 / "" / false / null / NaN 时绕过校验', () => {
    // 证据：真值型非法值确实会被 tierMultipliers 分支拦下
    expect(() => mod.validateOverrides([custom({ tierMultipliers: 'x' })])).toThrow();
    expect(() => mod.validateOverrides([custom({ tierMultipliers: true })])).toThrow();

    // 但假值型非法值被 `if (value.tierMultipliers)` 直接跳过，原样进入冻结快照
    for (const bad of [0, '', false, null, NaN]) {
      expect(
        () => mod.validateOverrides([custom({ tierMultipliers: bad })]),
        `tierMultipliers=${String(bad)}`,
      ).toThrow();
    }
  });

  test('[F1] tierMultipliers 为 0 时不会被清理，而是随快照一起返回给调用方', () => {
    expect(() => mod.validateOverrides([custom({ tierMultipliers: 0 })])).toThrow();
  });

  // [night-evolver] 这条发现还没修，测试暂不提升;

  // [night-evolver] 这条发现还没修，测试暂不提升;

  // [night-evolver] 这条发现还没修，测试暂不提升;
});

