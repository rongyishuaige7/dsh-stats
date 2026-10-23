// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] OverviewTools 的“日”模式按钮把 effectiveDate（全部模式下为 null）写回 nav.date，切回按天视图后日期丢失、前后翻页全部禁用
// Source: src/client-overview.cjs:159  Contract: src/client-overview.cjs:160（切到“全部”时特意把当前日期写进 nav.date，以便切回日视图时恢复）；src/client-overview.cjs:151-156（move() 切天时总是写入 dates 中的有效日期）
// Verified fixed by `recheck`; do not delete without checking the finding.

// tests/evolver/n00001.test.js
// Focus: state — 视图模式切换时 nav 状态的丢失。
import { createRequire } from 'node:module';
import { expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const { OverviewTools } = require('../../src/client-overview.cjs');

const DATES = ['2024-05-01', '2024-05-02'];

function findAction(node, action) {
	if (!node || typeof node !== 'object') return null;
	if (node.props && node.props['data-action'] === action) return node;
	const children = node.props ? node.props.children : undefined;
	const list = Array.isArray(children) ? children : [children];
	for (const child of list) {
		const found = findAction(child, action);
		if (found) return found;
	}
	return null;
}

function toolsTree(nav, effectiveDate, setNav) {
	return OverviewTools({
		nav,
		setNav,
		dates: DATES,
		effectiveDate,
		projects: [],
		hidden: {},
		onToggle: function () {},
		onShowAll: function () {},
		colorIndexes: new Map(),
		filterKey: 'day',
		showMode: true,
		showFilter: false,
		t: function (key) { return key; },
	});
}

test('[F1] 全部模式下点击“日”应恢复 nav.date 保存的日期，而不是写入 effectiveDate(null)', () => {
	const calls = [];
	const tree = toolsTree({ mode: 'all', date: '2024-05-02' }, null, function (next) { calls.push(next); });
	const dayButton = findAction(tree, 'mode-day');
	expect(dayButton).toBeTruthy();
	dayButton.props.onClick();
	expect(calls).toHaveLength(1);
	expect(calls[0].mode).toBe('day');
	expect(calls[0].date).toBe('2024-05-02');
});

