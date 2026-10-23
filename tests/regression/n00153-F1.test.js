// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] routeProjectionValueFromEntry 不校验缓存条目 identity 与请求会话是否一致，会把别的会话的 statsRoute 归因当成当前会话的 token
// Source: src/host-sessions.js:309  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

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

test('[F1] statsRoute 缓存行的 identity 与请求会话不一致时必须拒绝', () => {
	const value = persistedStatsRouteState();
	const entry = { identity: { id: 'session-b' }, rows: { statsRoute: { ver: 3, seq: 0, val: value } } };
	const warnings = [];
	const result = routeProjectionValueFromEntry(entry, 'session-a', { id: 'session-a' }, warnings, undefined);
	expect(warnings.map((warning) => warning.code)).toContain('SESSION_CACHE_IDENTITY_MISMATCH');
	expect(result).toBeNull();
});

// [night-evolver] 这条发现还没修，测试暂不提升;

// [night-evolver] 这条发现还没修，测试暂不提升;

