// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 余额缓存新鲜度用 now - at < TTL 判断，系统时钟回拨后缓存时间戳落在未来，缓存永不失效
// Source: src/index.js:791  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { afterEach, expect, test, vi } from 'vitest';
import { StatsService } from '../../src/index.js';

const previousFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = previousFetch;
	vi.useRealTimers();
});

function credentials() {
	return {
		resolve: async (ref) => (ref === 'DEEPSEEK_API_KEY' ? { value: 'sk-test', source: 'test' } : undefined),
	};
}

function balanceResponse() {
	return {
		ok: true,
		status: 200,
		json: async () => ({ is_available: true, balance_infos: [{ currency: 'CNY', total_balance: '1.00' }] }),
	};
}

test('[F1] 系统时钟回拨后余额缓存时间戳落在未来，缓存永不失效且不再刷新', async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(10_000_000);

	let calls = 0;
	globalThis.fetch = async () => {
		calls += 1;
		return balanceResponse();
	};
	const service = { ctx: { reflect: { get: () => credentials() } } };

	const first = await StatsService.prototype.current.call(service);
	expect(calls).toBe(1);
	expect(first.accounts[0].total).toBe(1);

	// 系统时钟回拨 1000 秒：缓存时间戳（10_000_000）现在位于“未来”。
	vi.setSystemTime(9_000_000);
	const second = await StatsService.prototype.current.call(service);

	// 期望：来自未来的缓存时间戳不可信，应按过期处理并重新拉取余额。
	expect(calls).toBe(2);
	expect(second).not.toBe(first);
});

