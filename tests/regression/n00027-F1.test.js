// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] providerId 仅大小写不同时，同一 catalog 规则被误判为 unsupported
// Source: src/pricing.cjs:471  Contract: —
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

test('[F1] providerId 仅大小写不同时仍应命中同一 catalog 规则并按 exact 计价', () => {
	const engine = acmeEngine();
	const cost = engine.priceUsage({
		providerId: 'ACME-RELAY',
		modelRaw: 'demo-model',
		time: AT,
		uncached: 1000000,
	});
	expect(cost.status).toBe('exact');
	expect(cost.currency).toBe('CNY');
	expect(cost.amount).toBeCloseTo(2, 10);
	expect(cost.providerId).toBe('ACME-RELAY');
});

// [night-evolver] 这条发现还没修，测试暂不提升;

// [night-evolver] 这条发现还没修，测试暂不提升;

