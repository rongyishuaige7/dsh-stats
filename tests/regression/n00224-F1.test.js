// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 会话统计缓存的字节预算估算漏算 activityTimes，活动密集会话实际占用可超出预算近一倍
// Source: src/host-sessions.js:887  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import routeData from '../../src/route-data.cjs';
import { routeProjectionValueFromEntry, SESSION_CACHE_LIMITS, sessionInfo } from '../../src/host-sessions.js';

const homes = [];
afterEach(() => {
	vi.restoreAllMocks();
	syncBuiltinESMExports();
	while (homes.length) rmSync(homes.pop(), { recursive: true, force: true });
});

function tempHome() {
	const home = mkdtempSync(join(tmpdir(), 'dsh-host-sessions-'));
	homes.push(home);
	return home;
}

test('[F1] 缓存字节预算未计入 activityTimes，超出真实预算的会话仍被缓存', async () => {
	const home = tempHome();
	const dir = join(home, 'sessions', 'ws1', 's1');
	mkdirSync(dir, { recursive: true });
	const events = 100;
	const lines = [];
	for (let i = 0; i < events; i++) lines.push(JSON.stringify({ type: 'turn/start', seq: i, time: i + 1 }));
	writeFileSync(join(dir, 'session.jsonl'), lines.join('\n') + '\n');

	const previousLimit = SESSION_CACHE_LIMITS.bytes;
	// 事件路径下 times 与 activityTimes 是两份独立数组（各 events 个时间戳）：
	// 只计 times 的估算值 256+8n 落在预算内，真实占用 256+16n 则超出。
	SESSION_CACHE_LIMITS.bytes = 256 + 12 * events;
	const originalOpen = fs.open;
	let opens = 0;
	vi.spyOn(fs, 'open').mockImplementation(async (...args) => { opens++; return originalOpen(...args); });
	syncBuiltinESMExports();
	try {
		const first = await sessionInfo(home, 's1');
		expect(first.times).toHaveLength(events);
		expect(first.activityTimes).toHaveLength(events);
		const afterFirstRead = opens;
		expect(afterFirstRead).toBeGreaterThan(0);
		await sessionInfo(home, 's1');
		// 真实占用超出预算的会话不应进入缓存，第二次调用必须重新读取日志。
		expect(opens).toBeGreaterThan(afterFirstRead);
	} finally {
		SESSION_CACHE_LIMITS.bytes = previousLimit;
	}
});

// [night-evolver] 这条发现还没修，测试暂不提升;

