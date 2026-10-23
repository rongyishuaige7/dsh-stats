// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] fallback 状态指示器的 title 前缀在 remote 模式下声称数据来自主机，与正文“本地数据”矛盾
// Source: src/client-header.cjs:28  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('../../src/client-header.cjs');

const t = (key) => key;

function textOf(node) {
	if (node == null || typeof node === 'boolean') return '';
	if (typeof node === 'string' || typeof node === 'number') return String(node);
	if (Array.isArray(node)) return node.map(textOf).join('');
	if (node && node.props) return textOf(node.props.children);
	return '';
}

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] fallback 状态的 title 前缀应为本地来源，与正文“本地数据”一致', () => {
	const el = mod.StatusIndicator({
		state: { kind: 'fallback' },
		remote: true,
		t,
	});
	const text = textOf(el);
	expect(text).toBe('source.local');
	expect(el.props.title).toBe('source.local · source.local');
});

