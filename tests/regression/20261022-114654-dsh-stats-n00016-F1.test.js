// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 持久化 statsRoute 状态里的畸形 current 未被校验，能通过 stateSchema 校验
// Source: src/host-sessions.js:293  Contract: src/host-sessions.js:290-292（注释承诺“Keep one validator for both contracts so a malformed checkpoint cannot be accepted on either host generation”）；src/host-sessions.js:279（同一模块的 wire 视图校验器会拒绝非法 current）
// Verified fixed by `recheck`; do not delete without checking the finding.

import { expect, test } from 'vitest';
import {
	STATS_ROUTE_PROJECTION,
	projectionCheckpoint,
	routeProjectionValueFromEntry,
} from '../../src/host-sessions.js';

const T = 1_700_000_000_000;

function foldedState() {
	const init = STATS_ROUTE_PROJECTION.init({ origin: 'dsh', parentSession: null, seedLength: null }, 0);
	return STATS_ROUTE_PROJECTION.apply(init, {
		type: 'assistant/message',
		seq: 0,
		time: T,
		data: {
			turn: 0,
			step: 0,
			message: {
				source: { provider: 'deepseek', model: 'deepseek-v4-pro', accountType: 'api', serviceTier: 'standard' },
			},
			usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0 },
		},
	});
}

test('[F1] 持久化 statsRoute 状态中的畸形 current 不应通过状态校验', () => {
	const state = foldedState();
	// 守卫：未损坏的状态本身必须合法，这样下面的失败只可能来自 current。
	expect(() => STATS_ROUTE_PROJECTION.stateSchema.parse(state)).not.toThrow();

	const corrupted = {
		...state,
		current: { providerId: 42, model: 7, accountType: null, serviceTier: 'bogus' },
	};
	// 折叠新事件时 state.current 是无 source 采样点的兜底路由，畸形 current 必须被拒绝。
	expect(() => STATS_ROUTE_PROJECTION.stateSchema.parse(corrupted)).toThrow();
});

// [night-evolver] 这条发现还没修，测试暂不提升;

