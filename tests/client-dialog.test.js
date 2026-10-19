import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { escapeAction, Popover } = require('../src/client-dialog.cjs');

test('Escape closes the panel when no layer is open', () => {
	expect(escapeAction({ key: 'Escape', keyCode: 27 }, 0)).toBe('close');
});

test('Escape pops the newest layer before closing the panel', () => {
	expect(escapeAction({ key: 'Escape', keyCode: 27 }, 1)).toBe('pop');
	expect(escapeAction({ key: 'Escape', keyCode: 27 }, 3)).toBe('pop');
});

test('the legacy Esc key name is treated as Escape', () => {
	expect(escapeAction({ key: 'Esc', keyCode: 27 }, 0)).toBe('close');
});

test('IME composition ignores Escape', () => {
	expect(escapeAction({ key: 'Escape', keyCode: 27, isComposing: true }, 0)).toBe('ignore');
	expect(escapeAction({ key: 'Escape', keyCode: 229 }, 0)).toBe('ignore');
	expect(escapeAction({ key: 'Escape', keyCode: 27, nativeEvent: { isComposing: true } }, 1)).toBe('ignore');
	expect(escapeAction({ key: 'Escape', keyCode: 27, nativeEvent: { keyCode: 229 } }, 1)).toBe('ignore');
});

test('other keys and missing events are ignored', () => {
	expect(escapeAction({ key: 'Enter', keyCode: 13 }, 0)).toBe('ignore');
	expect(escapeAction({ key: 'Tab', keyCode: 9 }, 0)).toBe('ignore');
	expect(escapeAction(null, 0)).toBe('ignore');
});

test('layer stack pops the newest layer first', () => {
	const { createLayerStack } = require('../src/client-dialog.cjs');
	const calls = [];
	const stack = createLayerStack();
	stack.push(() => calls.push('first'));
	stack.push(() => calls.push('second'));
	expect(stack.size).toBe(2);
	stack.pop();
	expect(calls).toEqual(['second']);
	expect(stack.size).toBe(1);
	stack.pop();
	expect(calls).toEqual(['second', 'first']);
	expect(stack.size).toBe(0);
	stack.pop();
	expect(calls).toEqual(['second', 'first']);
});

test('Popover keeps the default labels and skips function children while closed', () => {
	let called = false;
	const html = renderToStaticMarkup(React.createElement(Popover, {
		label: '筛选项目',
		action: 'filter',
		children: () => {
			called = true;
			return React.createElement('span', null, 'panel-content');
		},
	}));
	expect(html).toContain('title="筛选项目"');
	expect(html).toContain('aria-label="筛选项目"');
	expect(html).toContain('aria-haspopup="dialog"');
	expect(html).toContain('aria-expanded="false"');
	expect(html).not.toContain('panel-content');
	expect(called).toBe(false);
});

test('Popover title override changes only the title', () => {
	const html = renderToStaticMarkup(React.createElement(Popover, {
		label: '筛选项目',
		title: '自定义提示',
		action: 'filter',
	}));
	expect(html).toContain('title="自定义提示"');
	expect(html).toContain('aria-label="筛选项目"');
	expect(html).not.toContain('title="筛选项目"');
});
