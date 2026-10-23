// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 范围视图点击热力图单元格跳转到日视图后，全局悬浮提示未隐藏，气泡残留
// Source: src/client-timeline.cjs:777  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { test, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Module from 'node:module';

const require = createRequire(import.meta.url);
const RealReact = require('react');
const { zh } = require('../../src/client-locale.cjs');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.resolve(HERE, '../../src/client-timeline.cjs');
const DATE = '2026-10-14';

// 在 node 环境里没有 DOM/渲染器，这里用一个最小的 hooks 外壳直接调用组件函数，
// 以便拿到真实的元素树并触发事件处理器（react 只是被测模块的依赖，不是被测模块本身）。
function loadTimeline(hideTip) {
	const hooks = [];
	let cursor = 0;
	const shim = {
		createElement: RealReact.createElement,
		Fragment: RealReact.Fragment,
		useState(init) {
			const i = cursor++;
			if (!(i in hooks)) hooks[i] = typeof init === 'function' ? init() : init;
			return [hooks[i], function(next) {
				hooks[i] = typeof next === 'function' ? next(hooks[i]) : next;
			}];
		},
		useRef(init) {
			const i = cursor++;
			if (!(i in hooks)) hooks[i] = { current: init };
			return hooks[i];
		},
		useMemo(fn) { cursor++; return fn(); },
		useCallback(fn) { cursor++; return fn; },
		useEffect() { cursor++; },
		useLayoutEffect() { cursor++; },
		useContext() { cursor++; return null; },
		createContext(value) { return { value }; },
	};
	const origLoad = Module._load;
	Module._load = function(request, parent) {
		if (parent && parent.filename === TARGET) {
			if (request === 'react') return shim;
			if (request === './client-tip.cjs') {
				return { tipRows: () => [], tipProps: () => ({}), showTipRaw: () => {}, hideTip };
			}
		}
		return origLoad.apply(this, arguments);
	};
	try {
		delete require.cache[TARGET];
		return require(TARGET);
	} finally {
		Module._load = origLoad;
	}
}

function findNode(node, predicate) {
	if (node == null || typeof node !== 'object') return null;
	if (Array.isArray(node)) {
		for (const child of node) {
			const hit = findNode(child, predicate);
			if (hit) return hit;
		}
		return null;
	}
	if (!node.props) return null;
	if (predicate(node)) return node;
	return findNode(node.props.children, predicate);
}

function rangeProps(handlers) {
	return {
		timeline: {
			days: [{ date: DATE, slotBlocks: [{ slot: 10, projectId: 'p', name: 'Project P', colorIndex: 0, ms: 1800000 }] }],
		},
		hidden: {},
		hiddenKey: '',
		colorIndexes: new Map([['p', 0]]),
		allProjects: [],
		prefs: { axis: 'focus', metric: 'cost', color: 'level', activeOnly: false },
		setPrefs: () => {},
		onSelectDate: handlers.onSelectDate,
		onJump: handlers.onJump,
		t: key => zh[key] ?? key,
	};
}

test('[F1] 范围视图点击热力图单元格跳转日视图前应先隐藏悬浮提示', () => {
	const originalNow = Date.now;
	Date.now = () => Date.parse('2026-10-14T12:00:00+08:00');
	try {
		const hideTip = vi.fn();
		const onJump = vi.fn();
		const onSelectDate = vi.fn();
		const mod = loadTimeline(hideTip);
		const tree = mod.TimelineRange(rangeProps({ onJump, onSelectDate }));

		const cells = findNode(tree, node =>
			typeof node.props.className === 'string' && node.props.className.split(' ').includes('dss-mx-cells'));
		expect(cells).not.toBeNull();

		// 模拟鼠标停在有活动的单元格上并点击（.dss-mx-cells 的 onClick 委托到 onCellsClick）
		cells.props.onClick({
			target: { closest: () => ({ dataset: { col: '10', level: '3' } }) },
		});

		// 跳转确实发生了
		expect(onJump).toHaveBeenCalledTimes(1);
		expect(onSelectDate).toHaveBeenCalledWith(DATE);
		// 跳转前必须清理全局提示气泡，否则气泡会残留到日视图上
		expect(hideTip).toHaveBeenCalled();
	} finally {
		Date.now = originalNow;
	}
});

