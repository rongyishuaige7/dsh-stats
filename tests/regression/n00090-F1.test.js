// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 项目表“会话”列排序读取视图从不生成的 project.sessionCount，点击会话列排序无效
// Source: src/client-overview.cjs:347  Contract: —
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
	test('[F1] 项目表“会话”列排序应基于 sessions 统计，而不是视图从不生成的 sessionCount 字段', () => {
		const projects = [
			{ id: 'p-a', name: 'A 项目', stats: {}, sessions: [{ id: 'a1', subagent: false }] },
			{ id: 'p-b', name: 'B 项目', stats: {}, sessions: [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }] },
		];
		const sorted = model.sortProjects(projects, 'sessions', -1);
		expect(sorted.map(function(project) { return project.id; })).toEqual(['p-b', 'p-a']);
	});

	// [night-evolver] 这条发现还没修，测试暂不提升;
});

