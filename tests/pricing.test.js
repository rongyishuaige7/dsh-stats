import pricing from '../src/pricing.cjs';

const {
	normalizeIdentity, priceUsage, summarizeCosts, mergeCostSummaries,
	convertCostToCny, convertCostSummaryToCny, summarizeCostsCny, mergeCostSummariesCny,
	DISPLAY_CURRENCY, USD_CNY_RATE,
} = pricing;
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

test('trusted aliases stay exact while unknown API routes use a marked estimate', () => {
	const nbdeepseek = priceUsage(usage({ providerId: 'nbdeepseek' }));
	const modlens = priceUsage(usage({ providerId: 'deepseek-modlens', model: 'deepseek-v4-flash' }));
	const relay = priceUsage(usage({ providerId: 'custom-relay' }));
	const unknown = priceUsage(usage({ providerId: 'unknown' }));
	const official = priceUsage(usage());

	expect(official).toMatchObject({ status: 'exact', currency: 'CNY' });
	expect(nbdeepseek).toMatchObject({ status: 'exact', currency: 'CNY', amount: official.amount });
	expect(modlens).toMatchObject({ status: 'exact', currency: 'CNY' });
	expect(relay).toMatchObject({
		status: 'estimated', amount: official.amount, currency: 'CNY', exactAmount: 0,
		estimatedAmount: official.amount, unpricedTokens: 0, providerId: 'custom-relay', providerFamily: 'unknown',
	});
	expect(unknown).toMatchObject({ status: 'estimated', amount: official.amount, providerId: 'unknown', providerFamily: 'unknown' });
});

test('a unique official model fallback preserves the original provider and source rule', () => {
	const official = priceUsage(usage({ providerId: 'openai', model: 'gpt-5.6-luna' }));
	const estimate = priceUsage(usage({ providerId: 'yi-api', model: 'gpt-5.6-luna' }));

	expect(estimate).toMatchObject({
		status: 'estimated', amount: official.amount, currency: 'USD', providerId: 'yi-api', providerFamily: 'unknown',
		modelCanonical: 'gpt-5.6-luna', exactAmount: 0, estimatedAmount: official.amount, unpricedTokens: 0,
		ruleId: 'openai/gpt-5.6-luna@2026-08-26', sourceUrl: 'https://developers.openai.com/api/docs/pricing',
	});
});

test('OpenAI fallback uses the current standard Sol prices and official aliases', () => {
	const short = priceUsage(usage({ providerId: 'yi-api', model: 'gpt-5.6-sol', uncached: 100_000, output: 0, contextTokens: 100_000 }));
	const long = priceUsage(usage({ providerId: 'yi-api', model: 'daybreak-blue-latest', uncached: 273_000, output: 0, contextTokens: 273_000 }));

	expect(short).toMatchObject({ status: 'estimated', amount: 100_000 * 4 / 1_000_000, currency: 'USD', retrievedAt: '2026-08-26' });
	expect(long).toMatchObject({ status: 'estimated', amount: 273_000 * 8 / 1_000_000, currency: 'USD', retrievedAt: '2026-08-26' });
});

test('explicit relay, local, subscription, and unknown models never inherit the fallback', () => {
	for (const accountType of ['relay', 'local']) {
		const result = priceUsage(usage({ providerId: 'yi-api', accountType }));
		expect(result).toMatchObject({ status: 'unsupported', amount: null, currency: null, unpricedTokens: 1100 });
	}
	const unknownModel = priceUsage(usage({ providerId: 'yi-api', model: 'future-model' }));
	const subscription = priceUsage(usage({ providerId: 'yi-api', model: 'gpt-5.6-luna', accountType: 'token-plan' }));
	expect(unknownModel).toMatchObject({ status: 'unsupported', amount: null, currency: null, unpricedTokens: 1100 });
	expect(subscription).toMatchObject({ status: 'subscription', amount: null, currency: null, unpricedTokens: 1100 });
});

test('known and estimated costs make an estimated summary without unknown tokens', () => {
	const official = priceUsage(usage());
	const relay = priceUsage(usage({ providerId: 'custom-relay', model: 'deepseek-v4-flash' }));
	const summary = summarizeCosts([official, relay]);

	expect(summary.status).toBe('estimated');
	expect(summary.totals).toEqual([expect.objectContaining({
		currency: 'CNY', amount: official.amount + relay.amount, exactAmount: official.amount, estimatedAmount: relay.amount,
	})]);
	expect(summary.unpricedTokens).toBe(0);
	expect(summary.unknownRows).toBe(0);
});

test('zero-token estimated metadata does not downgrade an exact summary', () => {
	const exact = priceUsage(usage());
	const metadataOnly = priceUsage(usage({ providerId: 'yi-api', model: 'gpt-5.6-luna', uncached: 0, output: 0 }));
	const summary = summarizeCosts([exact, metadataOnly]);

	expect(metadataOnly).toMatchObject({ status: 'estimated', amount: 0, estimatedAmount: 0, unpricedTokens: 0 });
	expect(summary.status).toBe('exact');
	expect(summary.totals).toHaveLength(2);
});

test('native pricing summaries preserve source currencies before display conversion', () => {
	const cny = priceUsage(usage());
	const usd = priceUsage(usage({ providerId: 'openai', model: 'gpt-5.6-terra' }));
	const summary = mergeCostSummaries([summarizeCosts([cny]), summarizeCosts([usd])]);

	expect(summary.status).toBe('exact');
	expect(summary.totals.map((row) => row.currency)).toEqual(['CNY', 'USD']);
	expect(summary.totals.find((row) => row.currency === 'CNY').amount).toBe(cny.amount);
	expect(summary.totals.find((row) => row.currency === 'USD').amount).toBe(usd.amount);
});

test('display pricing converts USD to one RMB total and is idempotent', () => {
	const cny = priceUsage(usage());
	const usd = priceUsage(usage({ providerId: 'openai', model: 'gpt-5.6-terra' }));
	const convertedRow = convertCostToCny(usd);
	const convertedAgain = convertCostToCny(convertedRow);
	const summary = mergeCostSummariesCny([summarizeCosts([cny]), summarizeCosts([usd])]);
	const directSummary = summarizeCostsCny([cny, usd]);

	expect(convertedRow).toMatchObject({
		status: 'estimated', currency: DISPLAY_CURRENCY, amount: usd.amount * USD_CNY_RATE,
		exactAmount: 0, estimatedAmount: usd.amount * USD_CNY_RATE,
	});
	expect(convertedAgain).toEqual(convertedRow);
	expect(summary.totals).toHaveLength(1);
	expect(summary.totals[0]).toMatchObject({
		currency: DISPLAY_CURRENCY,
		amount: cny.amount + usd.amount * USD_CNY_RATE,
		exactAmount: cny.amount,
		estimatedAmount: usd.amount * USD_CNY_RATE,
	});
	expect(summary.status).toBe('estimated');
	expect(directSummary).toEqual(summary);
});

test('display conversion keeps unknown currency visible as an incomplete total', () => {
	const summary = convertCostSummaryToCny({
		status: 'exact',
		totals: [{ currency: 'EUR', amount: 1, exactAmount: 1, estimatedAmount: 0 }],
		unpricedTokens: 0,
		unknownRows: 0,
	});

	expect(summary).toMatchObject({ status: 'unsupported', totals: [], unknownRows: 1 });
});

test('display conversion normalizes legacy currency casing and preserves incomplete status', () => {
	const cny = convertCostToCny({ currency: 'cny', amount: 1, exactAmount: 1, estimatedAmount: 0 });
	const legacy = convertCostSummaryToCny({
		status: 'exact',
		totals: [{ currency: 'CNY', amount: 1, exactAmount: 1, estimatedAmount: 0 }],
		unpricedTokens: 5,
		unknownRows: 1,
	});

	expect(cny).toMatchObject({ currency: 'CNY', amount: 1 });
	expect(legacy).toMatchObject({ status: 'partial', totals: [{ currency: 'CNY', amount: 1 }], unpricedTokens: 5, unknownRows: 1 });
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
