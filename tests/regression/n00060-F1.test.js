// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 字符串形式的秒/毫秒时间戳被 timestampOrNull 判为无效，resetsAt 静默变成 null
// Source: src/accounts.js:152-158  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { accountSpec, queryProviderAccount } from '../../src/accounts.js';

function jsonResponse(body, status = 200) {
	return {
		ok: status >= 200 && status < 300,
		status,
		headers: { get: () => null },
		json: async () => body
	};
}

test('[F1] 字符串形式的秒/毫秒重置时间戳应被解析为毫秒时间戳而不是 null', async () => {
	const spec = accountSpec({
		id: 'kimi-coding',
		apiKeyRef: 'KIMI_API_KEY',
		baseURL: 'https://api.kimi.com'
	});
	expect(spec.adapter).toBe('kimi-token-plan');

	const requested = [];
	const account = await queryProviderAccount(spec, { resolve: async () => 'kimi-secret' }, {
		now: () => 1_700_000_000_000,
		fetch: async (url) => {
			requested.push(url);
			return jsonResponse({
				data: {
					// 秒级纪元时间戳，以 JSON 字符串给出
					limits: [{ detail: { limit: 100, remaining: 40, resetTime: '1735660800' } }],
					// 毫秒级纪元时间戳，以 JSON 字符串给出
					usage: { limit: 1000, remaining: 500, resetTime: '1735660800000' }
				}
			});
		}
	});

	expect(requested).toEqual(['https://api.kimi.com/coding/v1/usages']);
	expect(account.status).toBe('ok');
	expect(account.windows.map((window) => window.kind)).toEqual(['session', 'weekly']);
	expect(account.windows.map((window) => window.resetsAt)).toEqual([1735660800000, 1735660800000]);
});

