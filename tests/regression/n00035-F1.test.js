// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] fallback 状态文本丢失数据时间戳，与其他有数据状态不一致
// Source: src/client-header.cjs:19  Contract: —
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

test('[F1] fallback 状态文本应像 stale 一样附带数据时间戳', () => {
	// 2024-05-01T08:00:00Z 经 fmtClock（固定 +08:00）格式化为 2024-05-01 16:00
	const at = Date.UTC(2024, 4, 1, 8, 0, 0);
	// stale 会显示时间，作为对照基线
	expect(indicatorText({ kind: 'stale', at }, true)).toContain('2024-05-01 16:00');
	// fallback 同样是“有数据”的状态，也应显示本地快照时间
	expect(indicatorText({ kind: 'fallback', at }, false)).toContain('2024-05-01 16:00');
});

// [night-evolver] 这条发现还没修，测试暂不提升;

