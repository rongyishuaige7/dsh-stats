import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { OverviewStrip } = require('../src/client-overview.cjs');
const { zh, en } = require('../src/client-locale.cjs');

const MIN = 60000;
const durations = new Map([['p1', 40 * MIN], ['p2', 25 * MIN], ['toString', 5 * MIN]]);

function render(t, hidden = {}) {
	const html = renderToStaticMarkup(React.createElement(OverviewStrip, { durations, hidden, t: key => t[key] ?? key }));
	return html.replace(/<[^>]+>/g, '').replaceAll('&amp;', '&');
}

test('strip shows only the development time of visible projects', () => {
	expect(render(zh)).toBe('开发时长1h10m');
	expect(render(en)).toBe('Duration 1h10m');
	expect(render(zh, { p2: true })).toBe('开发时长45m');
});

test('strip ignores Object.prototype names when reading hidden flags', () => {
	expect(render(zh, {})).toBe('开发时长1h10m');
	expect(render(zh, { toString: true })).toBe('开发时长1h5m');
});

test('strip without durations shows a dash', () => {
	const html = renderToStaticMarkup(React.createElement(OverviewStrip, { durations: null, t: key => zh[key] ?? key }));
	expect(html.replace(/<[^>]+>/g, '')).toBe('开发时长—');
});
