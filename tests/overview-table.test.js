import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { ProjectSessions, ProjectTable, ProjectDetailMeta } = require('../src/client-overview.cjs');
const { sessionActiveMs } = require('../src/client-timeline-model.cjs');
const { SLOT_MS } = require('../src/client-format.cjs');
const { zh } = require('../src/client-locale.cjs');

const t = key => zh[key] ?? key;
const MIN = 60000;
const slots = (...rows) => rows.map(([slot, ms]) => ({ slot, ms }));

function session(id, model, extra = {}) {
	return {
		id, title: 'session ' + id, subagent: false, updatedAt: Date.UTC(2026, 9, 21, 10, 42), model,
		stats: { inputTokens: 900, outputTokens: 100, turns: 3, steps: 12, llmMs: 4 * MIN, toolMs: MIN, cacheHitPct: 96 },
		slots: slots([100, 20 * MIN], [101, 25 * MIN]),
		...extra,
	};
}

function text(html) { return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }

test('sessionActiveMs merges slots and caps each half hour', () => {
	expect(sessionActiveMs({ slots: slots([1, 20 * MIN], [1, 20 * MIN], [2, 5 * MIN]) })).toBe(SLOT_MS + 5 * MIN);
	expect(sessionActiveMs({ slots: [{ slot: 'x', ms: 5 }, null] })).toBe(0);
	expect(sessionActiveMs({})).toBe(0);
});

test('single-model session rows keep title, time, duration, tokens and cost', () => {
	const project = { id: 'p', name: 'P', stats: {}, sessions: [session('a', 'deepseek-v4-flash'), session('b', 'deepseek-v4-flash')] };
	const html = renderToStaticMarkup(React.createElement(ProjectSessions, { project, page: 0, onPage() {}, dayMode: true, t }));
	const header = html.match(/<div class="dss-sess dss-sess-h"[^]*?<\/div>/)[0];
	expect(text(header)).toBe('会话 时间 时长 Token 费用');
	expect(html).not.toContain('dss-sess-model');
	expect(html).not.toContain('dss-sess-llm');
	expect(html).toContain('<span class="st dss-sess-dur">45m</span>');
	expect(html).toContain('<span class="st dss-sess-token">1K</span>');
	// The other metrics and the model move to the row tooltip.
	expect(html).toContain('title="轮 · 步 3 · 12\nLLM 4m0s · 工具 1m0s\n命中 96%\n输入 900 · 输出 100\n模型 deepseek-v4-flash"');
	expect(html).toContain('<span class="dss-sess-meta">18:42 · 45m · 1K</span>');
});

test('a model column appears only when the project used more than one model', () => {
	const project = { id: 'p', name: 'P', stats: {}, sessions: [session('a', 'deepseek-v4-flash'), session('b', 'MiniMax-M3')] };
	const html = renderToStaticMarkup(React.createElement(ProjectSessions, { project, page: 0, onPage() {}, dayMode: true, t }));
	expect(html).toContain('class="dss-sess has-model dss-sess-h"');
	expect(html).toContain('<span class="st dss-sess-model" title="MiniMax-M3">MiniMax-M3</span>');
	expect(html).not.toContain('\n模型 ');
	expect(html).toContain('<span class="dss-sess-meta">18:42 · 45m · 1K · MiniMax-M3</span>');
});

function tableHtml(projects, extra = {}) {
	return renderToStaticMarkup(React.createElement(ProjectTable, {
		projects, shares: new Map(), colorIndexes: new Map(), dayMode: true, onOpenPricing() {}, onShowAll() {}, t, ...extra,
	}));
}

test('project table drops the cache column and flags only low hit rates', () => {
	const stats = (hit) => ({ inputTokens: 317e6, outputTokens: 737e3, llmMs: 2 * 3600e3, cacheHitPct: hit });
	const html = tableHtml([
		{ id: 'ok', name: 'ok', path: '/ok', stats: stats(97), sessions: [] },
		{ id: 'low', name: 'low', path: '/low', stats: stats(72.4), sessions: [] },
	], { durations: new Map([['ok', 95 * MIN], ['low', 12 * MIN]]) });
	expect(html).not.toContain('data-sort-key="hit"');
	expect(html).not.toContain('dss-cell-sub');
	expect(html).toContain('title="输入 317M · 输出 737K"');
	expect(html.match(/dss-hit-flag/g)).toHaveLength(1);
	expect(html).toContain('<span class="dss-hit-flag">命中 72%</span>');
	// Day mode's last column is development time, matching the timeline.
	expect(html).toContain('<td class="c-last">1h35m</td>');
	expect(html).toContain('<td class="c-last">12m</td>');
	expect(html).toContain('开发时长</button>');
});

test('a fully unpriced project shows only the pending chip', () => {
	const cost = { status: 'unsupported', totals: [], unpricedTokens: 8.9e6 };
	const sessions = [{ id: 's', title: 's', stats: { inputTokens: 8.9e6, outputTokens: 0 }, cost }];
	const html = tableHtml([{ id: 'k', name: 'kimi-trial', path: '/k', stats: { inputTokens: 8.9e6, outputTokens: 0 }, sessions }], { durations: new Map() });
	expect(html).toContain('dss-pending-chip sm');
	expect(html).toContain('待计价 8.9M');
	expect(html).not.toContain('dss-cost-amt');
});

test('the detail head leads with cache hit and names a single model', () => {
	const stats = { cacheHitPct: 96.4, turns: 3, steps: 12, toolMs: MIN, ttftAvgMs: 2140, tps: 61 };
	const one = { id: 'p', stats, sessions: [session('a', 'deepseek-v4-flash'), session('b', 'deepseek-v4-flash')] };
	expect(text(renderToStaticMarkup(React.createElement(ProjectDetailMeta, { project: one, t }))))
		.toBe('缓存命中 96.4% 轮 / 步 3 / 12 工具 1m0s 首 token 2.1s tok/s 61 模型 deepseek-v4-flash');
	const two = { ...one, sessions: [session('a', 'deepseek-v4-flash'), session('b', 'MiniMax-M3')] };
	expect(renderToStaticMarkup(React.createElement(ProjectDetailMeta, { project: two, t }))).not.toContain('模型');
});
