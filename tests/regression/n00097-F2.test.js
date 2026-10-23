// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] 路由键为 "__proto__" 时 updateRoute 把行赋给对象原型而非自有属性，行被静默丢弃
// Source: src/route-data.cjs:31  Contract: —
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

// [night-evolver] 这条发现还没修，测试暂不提升;

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] 键为 "__proto__" 时 updateRoute 静默丢弃该行', () => {
	const r = row();
	const tree = mod.updateRoute(undefined, '__proto__', () => r);
	expect(mod.routeRows({ routeTree: tree })).toEqual([r]);
});

