// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] updateRoute 用 Object.freeze 就地冻结 update 回调返回的调用方自有行对象
// Source: src/route-data.cjs:29  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('../../src/route-data.cjs');

function row(overrides = {}) {
	return {
		slot: 1,
		providerId: 'fixture-compatible',
		model: 'fixture-model',
		accountType: 'api',
		contextTokens: 128000,
		uncached: 1,
		output: 1,
		cacheRead: 0,
		cacheWrite: 0,
		...overrides,
	};
}

test('[F1] updateRoute 冻结了 update 返回的调用方自有行对象', () => {
	const shared = row();
	mod.updateRoute(undefined, 'fixture-compatible:fixture-model:api', () => shared);
	expect(Object.isFrozen(shared)).toBe(false);
});

test('[F1] 被 updateRoute 冻结后，调用方无法再就地更新自己持有的行对象', () => {
	const shared = row();
	mod.updateRoute(undefined, 'fixture-compatible:fixture-model:api', () => shared);
	expect(Reflect.set(shared, 'output', 99)).toBe(true);
	expect(shared.output).toBe(99);
});

// [night-evolver] 这条发现还没修，测试暂不提升;

