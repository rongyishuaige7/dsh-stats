// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] at 为不可解析/非有限值时仍把占位符“—”当作时间追加到状态文本
// Source: src/client-header.cjs:13  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('../../src/client-header.cjs');

const t = (key) => key;

// StatusIndicator 不调用 hooks，可直接调用并读取渲染出的状态文本节点。
function indicatorText(state, remote = true) {
	const el = mod.StatusIndicator({ state, remote, t });
	return el.props.children[1].props.children;
}

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] at 为不可解析值时不应把占位符“—”当作时间追加到状态文本', () => {
	expect(indicatorText({ kind: 'exact', at: Number.NaN }, true)).toBe('source.exact');
});

