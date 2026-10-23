// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 定价抽屉声明 aria-modal 却不拦截 Tab，键盘焦点会跑到遮罩后的页面
// Source: src/client-header.cjs:114  Contract: src/client-header.cjs:114（aria-modal="true" 声明该层是模态对话框）；src/client-dialog.cjs:23（同类层共用的 trapTab 已实现把 Tab 约束在层根节点内）
// Verified fixed by `recheck`; do not delete without checking the finding.

// Adversarial test for src/client-header.cjs (contracts angle).
import { createRequire } from 'node:module';
import { test, expect } from 'vitest';

const require = createRequire(import.meta.url);
const react = require('react');
const mod = require('../../src/client-header.cjs');

function fakeNode(name) {
	return { name: name, isConnected: true, focus: function() {} };
}

// 在抽屉的整棵元素树里找 Tab 拦截处理（内联 onKeyDown）。
function findKeyDown(node) {
	if (!node || typeof node !== 'object') return false;
	const props = node.props;
	if (!props || typeof props !== 'object') return false;
	if (typeof props.onKeyDown === 'function') return true;
	const children = props.children;
	const list = Array.isArray(children) ? children : [children];
	for (let i = 0; i < list.length; i++) {
		if (findKeyDown(list[i])) return true;
	}
	return false;
}

test('[F1] 模态抽屉必须拦截 Tab，焦点不能跑到遮罩后的页面', () => {
	const savedHooks = {
		useRef: react.useRef,
		useCallback: react.useCallback,
		useEffect: react.useEffect,
		useContext: react.useContext,
	};
	const effects = [];
	const listeners = [];
	const fakeDocument = {
		addEventListener: function(type) { listeners.push(type); },
		removeEventListener: function() {},
		activeElement: null,
		body: { focus: function() {} },
		querySelector: function() { return null; },
	};
	const hadDocument = Object.prototype.hasOwnProperty.call(globalThis, 'document');
	const savedDocument = globalThis.document;
	globalThis.document = fakeDocument;
	react.useRef = function(init) { return { current: init }; };
	react.useCallback = function(cb) { return cb; };
	react.useEffect = function(fn) { effects.push(fn); };
	react.useContext = function() { return null; };
	let tree;
	try {
		tree = mod.PricingDrawer({
			open: true,
			focusModel: null,
			opener: fakeNode('opener'),
			gear: fakeNode('gear'),
			rootRef: null,
			onClose: function() {},
			remote: false,
			projects: [],
			t: function(key) { return key; },
			onChanged: function() {},
		});
		for (let i = 0; i < effects.length; i++) effects[i]();
	} finally {
		react.useRef = savedHooks.useRef;
		react.useCallback = savedHooks.useCallback;
		react.useEffect = savedHooks.useEffect;
		react.useContext = savedHooks.useContext;
		if (hadDocument) globalThis.document = savedDocument;
		else delete globalThis.document;
	}
	const scrim = tree.props.children[0];
	const aside = tree.props.children[1];
	expect(scrim.props.className).toBe('dss-drawer-scrim');
	expect(aside.props.role).toBe('dialog');
	expect(aside.props['aria-modal']).toBe('true');
	// aria-modal 承诺模态：Tab 必须被约束在对话框内。
	// 当前实现只有 Escape（useLayer）与打开时的关闭按钮聚焦，没有任何 Tab 处理。
	const inlineTrap = findKeyDown(tree);
	const documentTrap = listeners.indexOf('keydown') >= 0;
	expect(inlineTrap || documentTrap).toBe(true);
});

