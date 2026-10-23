// Regression test promoted by night-evolver, then rejected during release review.
// Run: 20261021-130102-dsh-stats  Finding: [F2] 子代理分组标题显示全部子代理数，与当前分页实际渲染的行数不一致
// Source: src/client-overview.cjs:268  Contract: —
//
// 结论：不采纳。分组标题显示项目内全部子对话数是 0.5.0 起的既有行为，也是
// browser fixture 的验收基线（scripts/browser-fixture-smoke.mjs 断言 205 个会话
// 里 95 个子对话必须出现在标题里）。按当前页计数会让同一个标题随翻页变化，
// 并且会直接让 smoke 失败，所以这里改为锁定既有契约。

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const mod = require('../../src/client-overview.cjs');

function makeT(dict) {
	return function t(key) {
		return Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
	};
}

describe('client-overview 契约', () => {
	test('[F2] 子代理分组标题显示项目内全部子代理数，不随分页变化', () => {
		const t = makeT({ 'w.subagentGroup': 'Subagents' });
		const main = [];
		for (let i = 0; i < 99; i++) {
			main.push({ id: 'm' + i, title: 'main ' + i, subagent: false, stats: {}, updatedAt: 1700000000000 });
		}
		const sub = [];
		for (let i = 0; i < 3; i++) {
			sub.push({ id: 's' + i, title: 'sub ' + i, subagent: true, stats: {}, updatedAt: 1700000000000 });
		}
		const project = { id: 'p1', name: 'P', stats: {}, sessions: main.concat(sub) };
		const render = (page) => renderToStaticMarkup(React.createElement(mod.ProjectSessions, {
			project,
			page,
			onPage: function() {},
			t,
			dayMode: false,
		}));
		// 第 0 页有 1 个子对话，第 1 页有 2 个；标题始终是项目总数 3。
		expect(render(0)).toContain('Subagents (3)');
		expect(render(1)).toContain('Subagents (3)');
	});
});
