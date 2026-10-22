// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] 汇总里存在真实金额时仍可能被标记为 free（反之全免费时被标记为 exact）
// Source: src/pricing.cjs:555  Contract: —
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

test('[F2] 汇总状态不能因免费行缺少币种而把真实金额报成 free', () => {
	const engine = acmeEngine();

	// free 账户 + 未知模型：priceUsage 返回 amount=0、currency=null 的 free 行。
	const freeUnknown = engine.priceUsage({
		providerId: 'acme-relay',
		modelRaw: 'zzz-unknown-model',
		accountType: 'free',
		time: AT,
		uncached: 500,
	});
	expect(freeUnknown.status).toBe('free');
	expect(freeUnknown.currency).toBeNull();

	const exact = engine.priceUsage({
		providerId: 'acme-relay',
		modelRaw: 'demo-model',
		accountType: 'api',
		time: AT,
		uncached: 1000000,
	});
	expect(exact.status).toBe('exact');

	const mixed = engine.summarizeCosts([freeUnknown, exact]);
	expect(mixed.totals).toHaveLength(1);
	expect(mixed.totals[0].currency).toBe('CNY');
	expect(mixed.totals[0].amount).toBeCloseTo(2, 10);
	expect(mixed.status).toBe('exact');

	// 全部为 free 行（一个带币种、一个不带币种）时状态仍应为 free。
	const freeKnown = engine.priceUsage({
		providerId: 'acme-relay',
		modelRaw: 'demo-model',
		accountType: 'free',
		time: AT,
		uncached: 500,
	});
	expect(freeKnown.currency).toBe('CNY');
	expect(engine.summarizeCosts([freeKnown, freeUnknown]).status).toBe('free');

	// 项目级合并：无 totals 的 free 汇总 + exact 汇总不得变成 free。
	const freeSummary = engine.summarizeCosts([freeUnknown]);
	expect(freeSummary.status).toBe('free');
	const merged = engine.mergeCostSummaries([freeSummary, engine.summarizeCosts([exact])]);
	expect(merged.totals).toHaveLength(1);
	expect(merged.status).toBe('exact');
});

// [night-evolver] 这条发现还没修，测试暂不提升;

