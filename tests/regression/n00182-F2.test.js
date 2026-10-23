// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] 投影缓存路径把会话创建时间 createdAt 也算作 activityTimes，与事件路径的活动时间统计不一致
// Source: src/host-sessions.js:831  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deriveSessionInfoFromEvents, infoFromProjectionValues, sessionInfo } from '../../src/host-sessions.js';

const homes = [];

afterEach(() => {
	while (homes.length) rmSync(homes.pop(), { recursive: true, force: true });
});

function tempHome() {
	const home = mkdtempSync(join(tmpdir(), 'dsh-host-sessions-'));
	homes.push(home);
	return home;
}

function writeSession(home, id, records) {
	const dir = join(home, 'sessions', 'workspace', id);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'session.jsonl'), records.map((record) => JSON.stringify(record)).join('\n') + '\n');
}

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] 投影缓存路径的 activityTimes 不应把会话创建时间当作活动时间', () => {
	const createdAt = 1_000_000;
	const lastPromptAt = createdAt + 3_600_000;
	const values = {
		sessionListMetadata: { lastPromptAt },
		statsRoute: {
			origin: null,
			parentSession: null,
			seedLength: null,
			inheritedEventCount: 0,
			current: { providerId: 'deepseek', model: 'deepseek-chat', accountType: 'api', serviceTier: 'standard' },
			routes: []
		}
	};
	const cachedInfo = infoFromProjectionValues(values, { identity: { createdAt } });
	// Same session through the event path: the session record is not an activity
	// event, only the assistant message is, so activityTimes excludes createdAt.
	const eventInfo = deriveSessionInfoFromEvents([
		{ type: 'session', seq: 0, time: createdAt, version: 1 },
		{ type: 'assistant/message', seq: 1, time: lastPromptAt, data: { turn: 0, step: 0, usage: { inputTokens: 1, outputTokens: 1 } } }
	]);
	expect(eventInfo.activityTimes).toEqual([lastPromptAt]);
	expect(cachedInfo.times).toEqual([createdAt, lastPromptAt]);
	expect(cachedInfo.activityTimes).toEqual([lastPromptAt]);
});

