// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 凭据服务解析抛错时 hasCredential 返回空字符串，导致 providerViews 的 configured 字段变成非布尔值（并把服务故障伪装成“未配置”）
// Source: src/accounts.js:528  Contract: src/accounts.js:526（同函数正常路径用 !!() 保证返回布尔值）与 tests/regression/n00053-F1.test.js（凭据服务故障不得等同于“未配置”）
// Verified fixed by `recheck`; do not delete without checking the finding.

import { expect, test } from 'vitest';
import { providerViews } from '../../src/accounts.js';

function brokenVaultContext() {
	return {
		settings: {
			get(name) {
				if (name === 'llm-deepseek') return { apiKeyEnv: 'DEEPSEEK_API_KEY', baseURL: 'https://api.deepseek.com' };
				if (name === 'llm-pi-ai') return { providers: {} };
				return null;
			}
		},
		credentials: {
			resolve: async () => { throw new Error('credentials vault is unreachable'); }
		}
	};
}

test('[F1] 凭据服务故障时 providerViews 的 configured 仍是布尔值而不是空字符串', async () => {
	const { providers } = await providerViews({}, brokenVaultContext());
	const deepseek = providers.find((provider) => provider.id === 'deepseek-official');

	expect(deepseek).toBeTruthy();
	expect(deepseek.adapter).toBe('deepseek-balance');

	// hasCredential 的正常路径用 !!() 返回布尔值；故障路径也不应改变该字段类型，
	// 否则按布尔 schema 校验的客户端会解析失败，用户还会被提示“未配置”。
	expect(typeof deepseek.configured).toBe('boolean');
});

