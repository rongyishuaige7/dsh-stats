import pricing from '../src/pricing.cjs';

const { normalizeIdentity, priceUsage, summarizeCosts, mergeCostSummaries } = pricing;
const slot = Math.floor(Date.parse('2026-08-17T10:00:00+08:00') / 1800000);

function usage(overrides = {}) {
	return {
		slot,
		model: 'deepseek-v4-pro',
		providerId: 'deepseek-official',
		accountType: 'api',
		uncached: 1000,
		output: 100,
		cacheRead: 0,
		cacheWrite: 0,
		reasoning: 0,
		...overrides,
	};
}

test('trusted DeepSeek aliases keep distinct route ids while using the official family', () => {
	const official = normalizeIdentity('deepseek-official', 'deepseek-v4-pro', 'api', slot * 1800000);
	const nbdeepseek = normalizeIdentity('nbdeepseek', 'deepseek-v4-pro', 'api', slot * 1800000);
	const modlens = normalizeIdentity('deepseek-modlens', 'deepseek-v4-flash', 'api', slot * 1800000);
	const relay = normalizeIdentity('custom-relay', 'deepseek-v4-pro', 'api', slot * 1800000);

	expect(official).toMatchObject({ providerFamily: 'deepseek', modelCanonical: 'deepseek-v4-pro' });
	expect(nbdeepseek).toMatchObject({ providerFamily: 'deepseek', modelCanonical: 'deepseek-v4-pro' });
	expect(modlens).toMatchObject({ providerFamily: 'deepseek', modelCanonical: 'deepseek-v4-flash' });
	expect(relay).toMatchObject({ providerFamily: 'unknown', modelCanonical: 'deepseek-v4-pro' });
	expect(new Set([official.providerId, nbdeepseek.providerId, modlens.providerId])).toHaveProperty('size', 3);
});

test('trusted DeepSeek aliases inherit official pricing but arbitrary relays do not', () => {
	const nbdeepseek = priceUsage(usage({ providerId: 'nbdeepseek' }));
	const modlens = priceUsage(usage({ providerId: 'deepseek-modlens', model: 'deepseek-v4-flash' }));
	const relay = priceUsage(usage({ providerId: 'custom-relay' }));
	const unknown = priceUsage(usage({ providerId: 'unknown' }));
	const official = priceUsage(usage());

	expect(official).toMatchObject({ status: 'exact', currency: 'CNY' });
	expect(nbdeepseek).toMatchObject({ status: 'exact', currency: 'CNY', amount: official.amount });
	expect(modlens).toMatchObject({ status: 'exact', currency: 'CNY' });
	expect(relay).toMatchObject({ status: 'unsupported', amount: null, currency: null, unpricedTokens: 1100 });
	expect(unknown).toMatchObject({ status: 'unsupported', amount: null });
});

test('known cost survives alongside unknown rows as a partial summary', () => {
	const official = priceUsage(usage());
	const relay = priceUsage(usage({ providerId: 'custom-relay', model: 'deepseek-v4-flash' }));
	const summary = summarizeCosts([official, relay]);

	expect(summary.status).toBe('partial');
	expect(summary.totals).toEqual([expect.objectContaining({ currency: 'CNY', amount: official.amount })]);
	expect(summary.unpricedTokens).toBe(1100);
	expect(summary.unknownRows).toBe(1);
});

test('multi-currency summaries preserve separate totals without conversion', () => {
	const cny = priceUsage(usage());
	const usd = priceUsage(usage({ providerId: 'openai', model: 'gpt-5.6-terra' }));
	const summary = mergeCostSummaries([summarizeCosts([cny]), summarizeCosts([usd])]);

	expect(summary.status).toBe('exact');
	expect(summary.totals.map((row) => row.currency)).toEqual(['CNY', 'USD']);
	expect(summary.totals.find((row) => row.currency === 'CNY').amount).toBe(cny.amount);
	expect(summary.totals.find((row) => row.currency === 'USD').amount).toBe(usd.amount);
});

test('subscription usage is reported as unpriced instead of pretending to be API spend', () => {
	const result = priceUsage(usage({ providerId: 'minimax-cn', model: 'MiniMax-M3', accountType: 'token-plan' }));
	expect(result).toMatchObject({ status: 'subscription', amount: null, currency: null, unpricedTokens: 1100 });
});

test.each(['coding-plan', 'coding_plan', 'subscription-plan'])('%s is normalized as subscription usage', (accountType) => {
	const result = priceUsage(usage({ accountType }));
	expect(result).toMatchObject({ status: 'subscription', amount: null, currency: null, unpricedTokens: 1100 });
});

test('unknown account types never inherit official API pricing', () => {
	const result = priceUsage(usage({ accountType: 'future-plan' }));
	expect(result).toMatchObject({ status: 'unsupported', amount: null, currency: null, unpricedTokens: 1100 });
});

test('free usage remains free after summary and merge', () => {
	const row = priceUsage(usage({ accountType: 'free' }));
	const summary = summarizeCosts([row]);
	const merged = mergeCostSummaries([summary]);
	expect(row).toMatchObject({ status: 'free', amount: 0, currency: 'CNY' });
	expect(summary).toMatchObject({ status: 'free', totals: [{ currency: 'CNY', amount: 0 }] });
	expect(merged).toMatchObject({ status: 'free', totals: [{ currency: 'CNY', amount: 0 }] });
});

test('currency-less free usage mixed with unpriced usage is partial, not free', () => {
	const free = priceUsage(usage({ providerId: 'custom-relay', model: 'future-free-model', accountType: 'free' }));
	const unpriced = priceUsage(usage({ providerId: 'custom-relay', model: 'future-paid-model' }));
	const summary = summarizeCosts([free, unpriced]);

	expect(free).toMatchObject({ status: 'free', amount: 0, currency: null, unpricedTokens: 0 });
	expect(summary).toMatchObject({ status: 'partial', totals: [], unpricedTokens: 1100, unknownRows: 1 });
});
