// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 凭证返回带首尾空白的 API Key 时未去除空白就写入 Authorization 头
// Source: src/host-balance.js:101  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { fetchDeepSeekBalance } from '../../src/host-balance.js';

test('[F1] 凭证返回带首尾空白的 API Key 时应去除空白后再写入 Authorization 头', async () => {
	const fetchImpl = vi.fn(async () => {
		throw new Error('network down');
	});

	// fetch 抛错后会被包装为 fetch-failed；这里只借助它捕获真正发给 fetch 的请求头。
	await expect(
		fetchDeepSeekBalance({ resolve: async () => '  sk-test  ' }, fetchImpl, 1000)
	).rejects.toMatchObject({ code: 'fetch-failed' });

	expect(fetchImpl).toHaveBeenCalledTimes(1);
	const options = fetchImpl.mock.calls[0][1];
	expect(options.headers.authorization).toBe('Bearer sk-test');
});

