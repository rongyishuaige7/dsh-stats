// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] dayPoints 忽略桶里权威的 uncached（且不扣 cacheWrite），用 input-cacheRead 重算导致未缓存 token 偏大
// Source: src/client-trends-model.cjs:122  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { dayPoints } = require('../../src/client-trends-model.cjs');

test('[F1] dayPoints 应采用桶里权威的 uncached（并扣除 cacheWrite），而不是只用 input - cacheRead 重算', () => {
	const byDay = new Map([
		['2026-09-07', {
			input: 1200,
			output: 300,
			cacheRead: 400,
			cacheWrite: 100,
			uncached: 700,
			reasoning: 50,
		}],
	]);
	const points = dayPoints(['2026-09-07'], byDay, new Map());
	expect(points[0].uncached).toBe(700);
});

