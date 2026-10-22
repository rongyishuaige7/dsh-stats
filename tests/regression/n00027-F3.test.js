// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F3] USD 汇总换算为 CNY 后 estimatedAmount 已置为全额，但 status 仍保留 'exact'
// Source: src/pricing.cjs:369  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

const mod = require('../../src/pricing.cjs');

const AT = Date.parse('2026-08-20T00:00:00Z');

// 最小合法 catalog：family 不在 OFFICIAL_PROVIDER_IDS 内，用于验证 providerId 解析。
function acmeEngine() {
	return mod.createPricing({
		schemaVersion: 2,
		version: 1,
		publishedAt: '2026-08-01T00:00:00Z',
		rules: [{
			id: 'acme/demo-model',
			providerId: 'acme-relay',
			family: 'acme',
			canonical: 'demo-model',
			aliases: ['demo-model'],
			currency: 'CNY',
			sourceUrl: 'https://example.com/pricing',
			retrievedAt: '2026-08-01',
			confidence: 'exact',
			reasoningIncludedInOutput: true,
			rates: { uncached: 2, cacheRead: 0.2, cacheWrite: null, output: 8 },
		}],
		fx: [{ date: '2026-08-01', usdCny: 7.1, sourceUrl: 'https://example.com/fx' }],
	});
}

// [night-evolver] 这条发现还没修，测试暂不提升;

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F3] USD 汇总换算为 CNY 后状态应为 estimated 而不是 exact', () => {
	const converted = mod.convertCostSummaryToCny({
		status: 'exact',
		totals: [{ currency: 'USD', amount: 10, exactAmount: 10, estimatedAmount: 0 }],
		unpricedTokens: 0,
		unknownRows: 0,
	}, { usdCnyRate: 7.2 });

	expect(converted.totals).toHaveLength(1);
	expect(converted.totals[0].currency).toBe('CNY');
	expect(converted.totals[0].amount).toBeCloseTo(72, 10);
	expect(converted.totals[0].exactAmount).toBe(0);
	expect(converted.totals[0].estimatedAmount).toBeCloseTo(72, 10);
	expect(converted.status).toBe('estimated');
});

