import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { OverviewStrip } = require('../src/client-overview.cjs');
const { zh, en } = require('../src/client-locale.cjs');

const totals = { turns: 96, steps: 417, ttftAvgMs: 1800, tps: 44 };
const projects = [{ id: 'p1' }];
const spans = new Map([['p1', { startSlot: 0, endSlot: 22 }]]);

function render(t, dayMode = true) {
	const html = renderToStaticMarkup(React.createElement(OverviewStrip, {
		totals, projects, spans, dayMode, activeDays: 75, t: key => t[key] ?? key,
	}));
	return html.replace(/<[^>]+>/g, '').replaceAll('&amp;', '&');
}

test('Chinese strip uses compact labels, no duplicated project count, and the output-speed unit', () => {
	const text = render(zh);
	expect(text).not.toContain('项目');
	expect(text).toContain('轮 / 步96 / 417');
	expect(text).toContain('首 token 均值1.8s');
	expect(text).toContain('输出速度44 tok/s');
	expect(text).toContain('活跃时段00:00–11:00');
});

test('English strip keeps a readable separator and the same labels', () => {
	const text = render(en);
	expect(text).not.toContain('Projects');
	expect(text).toContain('Turns / Steps 96 / 417');
	expect(text).toContain('First token avg 1.8s');
	expect(text).toContain('Output speed 44 tok/s');
	expect(text).toContain('Active span 00:00–11:00');
});

test('all mode uses active days without a label/value space in Chinese', () => {
	expect(render(zh, false)).toContain('活跃日75');
	expect(render(en, false)).toContain('Active days 75');
});
