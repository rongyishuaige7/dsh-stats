// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 凭据服务解析失败被吞掉并伪装成 not-configured（还带上 missingCredential），应报 unavailable
// Source: src/accounts.js:507  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { expect, test } from 'vitest';
import { AccountError, accountSpec, queryProviderAccount, responseJson } from '../../src/accounts.js';

test('[F1] 凭据服务解析失败不应被报告成 not-configured 并附带 missingCredential', async () => {
	const spec = accountSpec({
		id: 'deepseek-official',
		apiKeyRef: 'DEEPSEEK_API_KEY',
		baseURL: 'https://api.deepseek.com',
	});
	expect(spec.adapter).toBe('deepseek-balance');

	let fetched = false;
	const account = await queryProviderAccount(
		spec,
		{ resolve: async () => { throw new Error('credentials vault is unreachable'); } },
		{
			now: () => 1_000,
			fetch: async () => { fetched = true; throw new Error('must not be fetched'); },
		},
	);

	// 凭据服务故障不是“未配置”：不能去请求 provider，也不能提示用户去配置密钥
	expect(fetched).toBe(false);
	expect(account.status).toBe('unavailable');
	expect(account.missingCredential).toBeNull();
});

// [night-evolver] 这条发现还没修，测试暂不提升;

