// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] FX 的 date 接受不存在的日历日（2026-02-30 被 Date.parse 滚动成 3 月 2 日），并因此破坏 FX 日期严格递增的不变式
// Source: src/pricing-validation.cjs:88  Contract: —
// Verified fixed at cc91b835d19f199f7256ed156bd81d99f3f138f2 by `recheck`; do not delete without checking the finding.

import mod from '../../src/pricing-validation.cjs';

const RULE = {
	id: 'deepseek-chat',
	family: 'deepseek',
	canonical: 'deepseek-chat',
	aliases: ['deepseek-chat'],
	currency: 'CNY',
	sourceUrl: 'https://example.com/pricing',
	retrievedAt: '2026-09-17',
	rates: { uncached: 1, cacheRead: 0.1, cacheWrite: null, output: 2 },
	reasoningIncludedInOutput: true,
	confidence: 'exact',
};

const FX_URL = 'https://example.com/fx';

function catalog(fx) {
	return {
		schemaVersion: 2,
		version: 1,
		publishedAt: '2026-09-17T00:00:00Z',
		rules: [structuredClone(RULE)],
		fx,
	};
}

test('[F1] FX date 为不存在的日历日 2026-02-30 时必须拒绝，而不是被 Date.parse 滚动成 3 月 2 日后放行', () => {
	expect(() =>
		mod.validateCatalog(catalog([{ date: '2026-02-30', usdCny: 7.1, sourceUrl: FX_URL }])),
	).toThrow(/FX/);
});

test('[F1] FX 日期必须按真实时间严格递增：2026-02-30(真实为 3 月 2 日) 排在 2026-03-01 之前应被拒绝', () => {
	const fx = [
		{ date: '2026-02-30', usdCny: 7.1, sourceUrl: FX_URL },
		{ date: '2026-03-01', usdCny: 7.2, sourceUrl: FX_URL },
	];
	expect(() => mod.validateCatalog(catalog(fx))).toThrow(/FX/);
});

