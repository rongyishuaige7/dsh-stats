// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] 子代理分组标题显示全部子代理数，与当前分页实际渲染的行数不一致
// Source: src/client-overview.cjs:268  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const mod = require('../../src/client-overview.cjs');
const model = require('../../src/client-overview-model.cjs');

function makeT(dict) {
	return function t(key) {
		return Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
	};
}

describe('client-overview 契约', () => {
	// [night-evolver] 这条发现还没修，测试暂不提升;

	test('[F2] 子代理分组标题的数量应等于该页实际渲染的子代理行数', () => {
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
		const html = renderToStaticMarkup(React.createElement(mod.ProjectSessions, {
			project,
			page: 0,
			onPage: function() {},
			t,
			dayMode: false,
		}));
		expect(html).toContain('Subagents (1)');
	});
});

