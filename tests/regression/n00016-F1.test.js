// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 事件路径遇到不带 serviceTier 的 request/header 时会把已观测的服务层级重置为默认值
// Source: src/host-sessions.js:566  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { expect, test } from 'vitest';
import { deriveSessionInfoFromEvents, STATS_ROUTE_PROJECTION } from '../../src/host-sessions.js';

const T = 1_700_000_000_000;

function headerEvents() {
	return [
		{ type: 'session', seq: 0, time: T },
		{ type: 'request/header', seq: 1, time: T + 1, data: { header: { config: { model: 'model-a', provider: 'provider-a', serviceTier: 'priority' } } } },
		{ type: 'assistant/message', seq: 2, time: T + 10, data: { turn: 0, step: 0, usage: { inputTokens: 100, outputTokens: 10 } } },
		{ type: 'request/header', seq: 3, time: T + 20, data: { header: { config: { model: 'model-a', provider: 'provider-a' } } } },
		{ type: 'assistant/message', seq: 4, time: T + 30, data: { turn: 0, step: 1, usage: { inputTokens: 100, outputTokens: 10 } } },
	];
}

test('[F1] 缺少 serviceTier 的 request/header 不应把已观测到的服务层级重置为默认值', () => {
	const info = deriveSessionInfoFromEvents(headerEvents());
	expect(info.usages).toHaveLength(2);
	expect(info.usages[0].serviceTier).toBe('priority');

	// 官方投影折叠路径对同一串事件会保留上一次的 serviceTier，事件路径必须与之一致
	let state = STATS_ROUTE_PROJECTION.init(null);
	for (const event of headerEvents()) state = STATS_ROUTE_PROJECTION.apply(state, event);
	const projectionTiers = new Set(STATS_ROUTE_PROJECTION.view(state).routes.map((row) => row.serviceTier));
	expect(projectionTiers).toEqual(new Set(['priority']));

	expect(info.usages[1].serviceTier).toBe('priority');
});

