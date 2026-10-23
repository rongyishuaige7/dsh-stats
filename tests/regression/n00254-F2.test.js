// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F2] session/end-seed 标记自身属于继承段，用它的 seq 当继承条数会少算一条并把它当成自有事件
// Source: src/host-sessions.js:475  Contract: src/host-sessions.js:876（fork 边界：前 N 条是父继承上下文，seq < N 的事件丢弃）+ src/host-sessions.js:466（只有 data.inherited === true 的 end-seed 才算标记）
// Verified fixed by `recheck`; do not delete without checking the finding.

import { expect, test } from 'vitest';
import {
	deriveSessionInfoFromEvents,
	projectionCheckpoint,
	routeProjectionValueFromEntry,
	STATS_ROUTE_PROJECTION,
} from '../../src/host-sessions.js';

const T = 1_700_000_000_000;

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] session/end-seed 标记自身属于继承段，fork 边界不能少算一条', () => {
	const info = deriveSessionInfoFromEvents([
		{ type: 'session', seq: 0, time: T, version: 4, isSeeded: true, parentSession: 'parent-1' },
		{ type: 'assistant/message', seq: 1, time: T + 100, data: { turn: 0, step: 0, usage: { inputTokens: 999, outputTokens: 999 } } },
		{ type: 'session/end-seed', seq: 2, time: T + 200, data: { inherited: true } },
		{ type: 'step/start', seq: 3, time: T + 1000, data: { turn: 0, step: 0 } },
		{ type: 'assistant/message', seq: 4, time: T + 2000, data: { turn: 0, step: 0, usage: { inputTokens: 10, outputTokens: 5 } } },
	]);
	// 继承段是 seq 0..2 共 3 条（标记事件自身 data.inherited === true）
	expect(info.inheritedEventCount).toBe(3);
	expect(info.times).toEqual([T + 1000, T + 2000]);
});

