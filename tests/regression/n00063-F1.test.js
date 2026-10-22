// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 目录 rules 为空数组时仍通过校验，签名目录可静默清空全部价格
// Source: src/pricing-validation.cjs:82  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

const mod = require('../../src/pricing-validation.cjs');

const FX = { date: '2026-09-17', usdCny: 7.12, sourceUrl: 'https://example.com/fx.json' };

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

test('[F1] 目录 rules 为空数组时仍通过校验，签名目录可静默清空全部价格', () => {
	const catalog = {
		schemaVersion: 1,
		version: 1,
		publishedAt: '2026-09-17T00:00:00Z',
		rules: [],
		fx: [FX],
	};
	expect(() => mod.validateCatalog(catalog)).toThrow();
});

// [night-evolver] 这条发现还没修，测试暂不提升;

