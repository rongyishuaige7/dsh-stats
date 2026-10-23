// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] statsRoute checkpoint 行不做生命周期一致性校验，别的 fork 父会话的归因会被折叠进本会话
// Source: src/host-sessions.js:222-232  Contract: src/host-sessions.js:339-343（routeProjectionValueFromEntry 用 projectionLifecycleMismatch 校验同一行的 parentSession/seedLength）
// Verified fixed by `recheck`; do not delete without checking the finding.

import { expect, test } from 'vitest';
import {
	deriveSessionInfoFromEvents,
	projectionCheckpoint,
	routeProjectionValueFromEntry,
	STATS_ROUTE_PROJECTION,
} from '../../src/host-sessions.js';

const T = 1_700_000_000_000;

test('[F1] statsRoute checkpoint 行必须与本会话生命周期一致（与 routeProjectionValueFromEntry 同规则）', () => {
	const header = { id: 's1', parentSession: 'p-this', seedLength: 4 };
	// 结构完全合法、但属于另一个 fork 父会话的 statsRoute 状态
	const otherForkState = STATS_ROUTE_PROJECTION.init({ origin: null, parentSession: 'p-other', seedLength: 9 }, 0);
	STATS_ROUTE_PROJECTION.stateSchema.parse(otherForkState); // 守卫：唯一可能的问题只能是生命周期不一致
	const entry = {
		identity: { id: 's1', parentSession: 'p-this', seedLength: 4 },
		rows: { statsRoute: { ver: 3, seq: 10, val: otherForkState } },
	};

	// 冷值路径明确拒绝它（当前已通过，作为对照）
	const valueWarnings = [];
	expect(routeProjectionValueFromEntry(entry, 's1', header, valueWarnings, 3)).toBeNull();
	expect(valueWarnings.map((w) => w.code)).toContain('SESSION_CACHE_LIFECYCLE_MISMATCH');

	// checkpoint 路径必须同样丢弃该行，否则 restore 会把别的 fork 的归因折叠进本会话
	const checkpoint = projectionCheckpoint(entry, 's1', header, [], 3);
	expect(checkpoint.statsRoute).toBeUndefined();
});

// [night-evolver] 这条发现还没修，测试暂不提升;

