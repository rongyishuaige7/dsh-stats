// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 事件预算刚好用尽后，不产生事件的畸形记录会误触发预算超限异常
// Source: src/host-sessions.js:110  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LEGACY_LOG_LIMITS } from '../../src/host-log.js';
import { deriveSessionInfoAsync, deriveSessionInfoFromEvents, sessionInfo } from '../../src/host-sessions.js';

const homes = [];
afterEach(() => {
	while (homes.length) rmSync(homes.pop(), { recursive: true, force: true });
});
function tempHome() {
	const home = mkdtempSync(join(tmpdir(), 'dsh-evolver-'));
	homes.push(home);
	return home;
}

test('[F1] 事件预算刚好用尽时，随后不产生事件的畸形记录应计入 malformedRecords 而不是抛预算超限', async () => {
	const limits = { ...LEGACY_LOG_LIMITS, events: 1 };
	const info = await deriveSessionInfoAsync([
		{ type: 'session', seq: 0, time: 1 },
		null,
	], null, {}, limits);
	expect(info.times).toEqual([1]);
	expect(info.malformedRecords).toBe(1);
});

// [night-evolver] 这条发现还没修，测试暂不提升;

