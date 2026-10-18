import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { escapeAction } = require('../src/client-dialog.cjs');

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
