// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 关闭定价抽屉时把 document.body 当作有效焦点恢复目标，键盘焦点被丢弃
// Source: src/client-header.cjs:104  Contract: src/client-dialog.cjs:143（useDialogFocus 的清理逻辑显式排除 document.body，并在 opener 不可用时回退到 .dss-trigger）；同文件 :111 也把 document.body 视为“没有焦点”
// Verified fixed by `recheck`; do not delete without checking the finding.

// Adversarial test for src/client-header.cjs — 定价抽屉关闭（Escape / 关闭按钮 / 遮罩）
// 这条清理路径的焦点恢复错误分支。
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const mod = require('../../src/client-header.cjs');

function makeNode() {
	return { isConnected: true, focus: vi.fn() };
}

// PricingDrawer 内部只用到 useRef / useCallback / useEffect（以及 useLayer 里的
// useContext / useRef / useEffect）。这里用一个最小的 hook 运行时直接调用组件函数，
// 捕获它注册的 effect，从而在 node 环境下驱动“关闭抽屉”的清理函数。
function renderDrawer(props) {
	const refs = [];
	const effects = [];
	let index = 0;
	const hookNames = ['useRef', 'useCallback', 'useEffect', 'useContext', 'useState'];
	const originals = {};
	hookNames.forEach(function (name) {
		originals[name] = Object.getOwnPropertyDescriptor(React, name);
	});
	function setHook(name, value) {
		Object.defineProperty(React, name, { value: value, configurable: true, writable: true, enumerable: true });
	}
	setHook('useRef', function (init) {
		const i = index++;
		if (!(i in refs)) refs[i] = { current: init };
		return refs[i];
	});
	setHook('useCallback', function (fn) { index++; return fn; });
	setHook('useEffect', function (fn) { effects.push({ index: index++, fn: fn }); });
	setHook('useContext', function () { index++; return null; });
	setHook('useState', function (init) { index++; return [init, function () {}]; });
	let out;
	try {
		out = mod.PricingDrawer(props);
	} finally {
		hookNames.forEach(function (name) {
			if (originals[name]) Object.defineProperty(React, name, originals[name]);
		});
	}
	return { out: out, refs: refs, effects: effects };
}

test('[F1] opener 是 document.body 时关闭抽屉不应把焦点“恢复”到 body，而应回退到可聚焦控件', () => {
	const body = makeNode();
	const gear = makeNode();
	const trigger = makeNode();
	const previousDocument = globalThis.document;
	globalThis.document = {
		body: body,
		querySelector: function (selector) { return selector === '.dss-trigger' ? trigger : null; }
	};
	try {
		const rendered = renderDrawer({
			open: true,
			opener: body,
			gear: gear,
			remote: true,
			projects: [],
			t: function (key) { return key; },
			onClose: function () {}
		});
		// 焦点恢复 effect 是组件注册的最后一个 effect：open 为真时它返回清理函数。
		let cleanup = null;
		rendered.effects.forEach(function (eff) {
			const ret = eff.fn();
			if (typeof ret === 'function') cleanup = ret;
		});
		expect(typeof cleanup).toBe('function');
		// 用户主动关闭（Escape / 关闭按钮 / 遮罩）会先把 restoreRef 置为 true；
		// hook 顺序为 localRef(0)、closeRef(1)、restoreRef(2)。
		rendered.refs[2].current = true;
		cleanup();
		const focused = [body, gear, trigger].filter(function (node) { return node.focus.mock.calls.length > 0; });
		expect(focused).not.toContain(body);
		expect(focused).toHaveLength(1);
	} finally {
		if (previousDocument === undefined) delete globalThis.document;
		else globalThis.document = previousDocument;
	}
});

