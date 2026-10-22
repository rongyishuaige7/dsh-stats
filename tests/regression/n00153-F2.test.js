// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] header 已用 inheritedEventCount 声明 fork 边界时仍被判为 unknownSeed，整条日志的自有事件被丢弃
// Source: src/host-sessions.js:476  Contract: —
// Verified fixed at cc91b835d19f199f7256ed156bd81d99f3f138f2 by `recheck`; do not delete without checking the finding.

import { expect, test } from 'vitest';
import {
	STATS_ROUTE_PROJECTION,
	deriveSessionInfoFromEvents,
	routeProjectionValueFromEntry,
} from '../../src/host-sessions.js';

// A persisted statsRoute state (ver 3) produced by the projection itself.
function persistedStatsRouteState() {
	const state = STATS_ROUTE_PROJECTION.init({ origin: null, parentSession: null, seedLength: null }, 0);
	const next = STATS_ROUTE_PROJECTION.apply(state, {
		type: 'assistant/message',
		seq: 0,
		time: 1000,
		data: {
			turn: 0,
			step: 0,
			message: { source: { provider: 'deepseek', model: 'deepseek-v4-pro', accountType: 'api', serviceTier: 'standard' } },
			usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0 },
		},
	});
	// Guard: the value itself must be a valid persisted state, so the only
	// possible reason to reject it is the cache-entry identity check.
	STATS_ROUTE_PROJECTION.stateSchema.parse(next);
	return next;
}

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] header 已声明 inheritedEventCount 的 fork 会话不应被判为 unknownSeed', () => {
	const info = deriveSessionInfoFromEvents([
		{ type: 'session', seq: 0, time: 1000, version: 4, isSeeded: true, inheritedEventCount: 100, parentSession: 'parent-1' },
		{ type: 'step/start', seq: 100, time: 2000, data: { turn: 0, step: 0 } },
		{
			type: 'assistant/message',
			seq: 101,
			time: 2500,
			data: {
				turn: 0,
				step: 0,
				message: { source: { provider: 'deepseek', model: 'deepseek-v4-pro' } },
				usage: { inputTokens: 100, outputTokens: 50 },
			},
		},
	]);
	expect(info.unknownSeed).toBe(false);
	expect(info.partial).toBe(false);
	expect(info.times).toEqual([2000, 2500]);
	expect(info.usages).toHaveLength(1);
	expect(info.usages[0]).toMatchObject({ uncached: 100, output: 50 });
});

// [night-evolver] 这条发现还没修，测试暂不提升;

