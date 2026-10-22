// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] OverviewTools 把继承来的 Object.prototype.valueOf 当作格式化函数转发给筛选菜单，打开筛选弹层时会崩溃
// Source: src/client-overview.cjs:174  Contract: —
// Verified fixed at cc91b835d19f199f7256ed156bd81d99f3f138f2 by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { OverviewTools } = require('../../src/client-overview.cjs');

function buildFilterMenuProps() {
	const props = {
		nav: { mode: 'day', date: '2024-05-02' },
		setNav() {},
		dates: ['2024-05-01', '2024-05-02'],
		effectiveDate: '2024-05-02',
		projects: [{ id: 'p1', name: 'P1', path: '/p1' }],
		hidden: {},
		onToggle() {},
		onShowAll() {},
		colorIndexes: new Map(),
		filterKey: 'k1',
		showFilter: true,
		t: (key) => key,
	};
	const tree = OverviewTools(props);
	const children = Array.isArray(tree.props.children) ? tree.props.children : [tree.props.children];
	const filterEl = children.find((child) => child && child.props && child.props.filterKey === 'k1');
	expect(filterEl).toBeTruthy();
	return filterEl.props;
}

test('[F1] 父组件未显式传入 valueOf 时，OverviewTools 不应把 Object.prototype.valueOf 转发给筛选菜单', () => {
	const filterProps = buildFilterMenuProps();
	expect(filterProps.valueOf).not.toBe(Object.prototype.valueOf);
});

test('[F1] 转发给筛选菜单的 valueOf 必须是可用的格式化函数，调用时不能抛错或返回对象', () => {
	const filterProps = buildFilterMenuProps();
	const valueOf = filterProps.valueOf;
	// 未转发 valueOf 时筛选菜单走费用摘要 fallback，是正确的修复方向
	if (typeof valueOf !== 'function') return;
	const project = { id: 'p1', name: 'P1', path: '/p1' };
	let output;
	let error = null;
	try {
		output = valueOf(project);
	} catch (err) {
		error = err;
	}
	expect(error).toBeNull();
	expect(output == null || typeof output === 'string' || typeof output === 'number').toBe(true);
});

