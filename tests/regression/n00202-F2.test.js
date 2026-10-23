// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F2] 事件路径未按 firstString 归一化 origin/parentSession：空白 origin 被当作真实来源，空字符串 parentSession 会抹掉已知父会话
// Source: src/host-sessions.js:483  Contract: src/host-sessions.js:259-260（routeProjectionState 对同一 header 字段使用 firstString 归一化）与 src/host-sessions.js:837-838（infoFromProjectionValues 同样使用 firstString）
// Verified fixed by `recheck`; do not delete without checking the finding.

// Round-2 boundary findings for src/host-sessions.js
import { expect, test } from 'vitest';
import {
	STATS_ROUTE_PROJECTION,
	deriveSessionInfoFromEvents,
	officialProjectionValues,
} from '../../src/host-sessions.js';

const T = 1_700_000_000_000;

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] 事件路径未按 firstString 归一化 origin/parentSession：空白 origin 被当作来源，空 parentSession 抹掉已知父会话', () => {
	const header = { id: 's1', version: 4, origin: '   ', parentSession: 'parent-1' };
	const sessionEvent = { type: 'session', seq: 0, time: T, origin: '   ', parentSession: '' };

	// 同一份 header/事件：投影折叠路径用 firstString 归一化
	let state = STATS_ROUTE_PROJECTION.init(header);
	state = STATS_ROUTE_PROJECTION.apply(state, sessionEvent);
	expect(state.origin).toBeNull();
	expect(state.parentSession).toBe('parent-1');

	const info = deriveSessionInfoFromEvents([sessionEvent], header);
	expect(info.origin).toBeNull();
	expect(info.parentSession).toBe('parent-1');
});

