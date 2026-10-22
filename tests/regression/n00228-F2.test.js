// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] resetTime 的字符串 "0" 与数字 0 被解析成不同的 resetsAt（字符串没走数字归一化）
// Source: src/accounts.js:156  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { accountSpec, queryProviderAccount } from '../../src/accounts.js';

function jsonResponse(body, status = 200) {
	return {
		ok: status >= 200 && status < 300,
		status,
		headers: { get: () => null },
		json: async () => body,
	};
}

function credentials(value = 'secret-test-value') {
	return { resolve: async () => ({ value }) };
}

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] resetTime 的字符串 "0" 与数字 0 解析出不同的 resetsAt', async () => {
	const spec = accountSpec({ id: 'kimi-coding', apiKeyRef: 'KIMI_API_KEY' });
	const now = () => 1_700_000_000_000;

	const numeric = await queryProviderAccount(spec, credentials(), {
		now,
		fetch: async () => jsonResponse({ data: { usage: { limit: 100, remaining: 40, resetTime: 0 } } }),
	});
	const stringly = await queryProviderAccount(spec, credentials(), {
		now,
		fetch: async () => jsonResponse({ data: { usage: { limit: 100, remaining: 40, resetTime: '0' } } }),
	});

	expect(numeric.windows).toHaveLength(1);
	expect(stringly.windows).toHaveLength(1);
	expect(stringly.windows[0].resetsAt).toBe(numeric.windows[0].resetsAt);
});

