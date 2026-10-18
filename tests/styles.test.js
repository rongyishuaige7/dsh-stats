import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { css } = require('../src/client-styles.cjs');

// Minimal rule walker: enough to associate a declaration with its selector
// without pulling in a CSS parser dependency.
function rules(source) {
	const out = [];
	const atStack = [];
	const ruleStack = [];
	let buffer = '';
	for (let i = 0; i < source.length; i++) {
		const ch = source[i];
		if (ch === '{') {
			const selector = buffer.trim();
			buffer = '';
			if (selector.startsWith('@')) atStack.push(selector);
			else ruleStack.push({ selector, declarations: '', at: atStack.slice() });
		} else if (ch === '}') {
			if (ruleStack.length) {
				const rule = ruleStack.pop();
				out.push({ selector: rule.at.concat(rule.selector).join(' >> '), declarations: rule.declarations });
			} else if (atStack.length) {
				atStack.pop();
			}
			buffer = '';
		} else if (ruleStack.length) {
			ruleStack[ruleStack.length - 1].declarations += ch;
		} else {
			buffer += ch;
		}
	}
	return out;
}

const parsed = rules(css);

test('every font-size uses the six-step scale, an em value, or inherit', () => {
	const allowedToken = /^var\(--dss-fs-(xs|sm|md|lg|xl|2xl)\)$/;
	const allowedEm = /^-?(?:\d+(?:\.\d+)?|\.\d+)em$/;
	const offenders = [];
	for (const rule of parsed) {
		for (const match of rule.declarations.matchAll(/(?:^|;)\s*font-size\s*:\s*([^;}]+)/g)) {
			const value = match[1].trim();
			if (allowedToken.test(value) || allowedEm.test(value) || value === 'inherit') continue;
			// The sidebar trigger is the only exception: it stays at 14px so it
			// lines up with the host's sidebar typography.
			if (value === '14px' && rule.selector.includes('.dss-trigger')) continue;
			offenders.push(rule.selector + ' -> ' + value);
		}
	}
	expect(offenders).toEqual([]);
});

test('the six font-size tokens are defined at the documented sizes', () => {
	for (const [name, size] of Object.entries({ xs: 11, sm: 12, md: 13, lg: 15, xl: 20, '2xl': 28 })) {
		expect(css).toContain('--dss-fs-' + name + ': ' + size + 'px');
	}
});

test('every referenced --dss-* token is defined', () => {
	const defined = new Set([...css.matchAll(/--dss-([a-z0-9-]+)\s*:/g)].map(match => match[1]));
	const referenced = new Set([...css.matchAll(/var\(--dss-([a-z0-9-]+)/g)].map(match => match[1]));
	expect([...referenced].filter(name => !defined.has(name))).toEqual([]);
});

test('component rules use tokens instead of host --dsw-* variables directly', () => {
	const tokenRules = parsed.filter(rule => rule.selector.includes(':where(.dss-overlay') || rule.selector.includes('body:not([data-ds-dark-theme])'));
	const offenders = parsed
		.filter(rule => !tokenRules.includes(rule) && rule.declarations.includes('var(--dsw-'))
		.map(rule => rule.selector);
	expect(offenders).toEqual([]);
});

test('inline font sizes in src/*.cjs are never below 11px', () => {
	const directory = path.join(process.cwd(), 'src');
	const offenders = [];
	for (const file of fs.readdirSync(directory).filter(name => name.endsWith('.cjs'))) {
		const source = fs.readFileSync(path.join(directory, file), 'utf8');
		for (const match of source.matchAll(/fontSize\s*:\s*(?:"|')?([0-9.]+)(?:px)?(?:"|')?/g)) {
			if (Number(match[1]) < 11) offenders.push(file + ': ' + match[0]);
		}
	}
	expect(offenders).toEqual([]);
});

test('client.cjs no longer contains CSS rule fragments', () => {
	const source = fs.readFileSync(path.join(process.cwd(), 'src/client.cjs'), 'utf8');
	expect([...source.matchAll(/\.dss-[a-z0-9-]+\s*\{/g)].map(match => match[0])).toEqual([]);
});
