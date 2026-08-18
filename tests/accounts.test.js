import { accountSpec, collectAccounts, configuredProviders, queryProviderAccount } from '../src/accounts.js';

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

function context() {
	return {
		settings: {
			get(name) {
				if (name === 'llm-deepseek') return { apiKeyEnv: 'DEEPSEEK_API_KEY', baseURL: 'https://api.deepseek.com' };
				if (name === 'llm-pi-ai') return { providers: {} };
				return null;
			},
		},
		credentials: credentials(),
	};
}

test('DeepSeek account adapter normalizes balance without returning the credential', async () => {
	let requested;
	const spec = accountSpec({ id: 'deepseek-official', displayName: 'DeepSeek', apiKeyRef: 'DEEPSEEK_API_KEY', baseURL: 'https://api.deepseek.com', accountType: 'api' });
	const account = await queryProviderAccount(spec, credentials(), {
		now: () => 1234,
		fetch: async (url, init) => {
			requested = { url, init };
			return jsonResponse({ is_available: true, balance_infos: [{ currency: 'CNY', total_balance: '18.64', topped_up_balance: '10.31', granted_balance: '8.33' }] });
		},
	});

	expect(requested.url).toBe('https://api.deepseek.com/user/balance');
	expect(requested.init.headers.authorization).toBe('Bearer secret-test-value');
	expect(account).toMatchObject({ id: 'deepseek-official', status: 'ok', stale: false, balance: { currency: 'CNY', remaining: 18.64, toppedUp: 10.31, granted: 8.33 } });
	expect(JSON.stringify(account)).not.toContain('secret-test-value');
});

test.each([
	[401, 'unauthorized'],
	[429, 'rate-limited'],
	[503, 'unavailable'],
])('account adapter maps HTTP %s to %s', async (httpStatus, status) => {
	const spec = accountSpec({ id: 'deepseek-official', apiKeyRef: 'DEEPSEEK_API_KEY', baseURL: 'https://api.deepseek.com' });
	const account = await queryProviderAccount(spec, credentials(), { fetch: async () => jsonResponse({}, httpStatus) });
	expect(account.status).toBe(status);
});

test('official adapter blocks a configured lookalike host', async () => {
	const spec = accountSpec({ id: 'deepseek-official', apiKeyRef: 'DEEPSEEK_API_KEY', baseURL: 'https://api.deepseek.example' });
	const account = await queryProviderAccount(spec, credentials(), { fetch: async () => { throw new Error('must not fetch'); } });
	expect(account).toMatchObject({ status: 'blocked', errorCode: 'endpoint-not-allowed' });
});

test('OpenRouter keeps the Management Key separate from its inference API key', async () => {
	const ctx = {
		settings: {
			get(name) {
				if (name === 'llm-deepseek') return null;
				if (name === 'llm-pi-ai') return { providers: { openrouter: { apiKeyEnv: 'OPENROUTER_API_KEY', accountApiKeyEnv: 'OPENROUTER_MANAGEMENT_CUSTOM' } } };
				return null;
			},
		},
	};
	const provider = (await configuredProviders(ctx)).find((entry) => entry.id === 'openrouter');
	const spec = accountSpec(provider);
	expect(provider).toMatchObject({ apiKeyRef: 'OPENROUTER_API_KEY', accountApiKeyRef: 'OPENROUTER_MANAGEMENT_CUSTOM' });
	expect(spec.apiKeyRef).toBe('OPENROUTER_MANAGEMENT_CUSTOM');

	let requested;
	const account = await queryProviderAccount(spec, credentials('management-secret'), {
		fetch: async (url, init) => {
			requested = { url, init };
			return jsonResponse({ data: { total_credits: 20, total_usage: 4.5 } });
		},
	});
	expect(requested.url).toBe('https://openrouter.ai/api/v1/credits');
	expect(requested.init.headers.authorization).toBe('Bearer management-secret');
	expect(account).toMatchObject({ status: 'ok', balance: { currency: 'USD', remaining: 15.5, total: 20, used: 4.5 } });
});

test('Kimi Coding Plan parses session and weekly quota windows', async () => {
	const reset = Date.parse('2026-08-19T00:00:00Z');
	const spec = accountSpec({ id: 'kimi-coding', apiKeyRef: 'KIMI_CUSTOM', baseURL: 'https://api.kimi.com', accountType: 'subscription' });
	const account = await queryProviderAccount(spec, credentials(), {
		now: () => 1000,
		fetch: async (url) => {
			expect(url).toBe('https://api.kimi.com/coding/v1/usages');
			return jsonResponse({ data: { planName: 'Kimi Pro', limits: [{ detail: { limit: 100, remaining: 75, resetTime: reset } }], usage: { total: 1000, remaining: 600, resetsAt: reset } } });
		},
	});
	expect(spec.providerFamily).toBe('moonshot');
	expect(account).toMatchObject({ status: 'ok', plan: 'Kimi Pro', windows: [
		{ kind: 'session', usedPercent: 25, remainingPercent: 75, resetsAt: reset },
		{ kind: 'weekly', usedPercent: 40, remainingPercent: 60, resetsAt: reset },
	] });
});

test('Z.ai Coding Plan sorts quota windows by duration and reads plan metadata', async () => {
	const spec = accountSpec({ id: 'zai-coding-cn', apiKeyRef: 'ZAI_CUSTOM', baseURL: 'https://open.bigmodel.cn', accountType: 'subscription' });
	const calls = [];
	const account = await queryProviderAccount(spec, credentials('zai-secret'), {
		fetch: async (url, init) => {
			calls.push({ url, authorization: init.headers.authorization });
			if (url.endsWith('/api/biz/subscription/list')) return jsonResponse({ data: [{ product_name: 'glm_coding_pro', next_renew_time: '2026-09-01T00:00:00Z' }] });
			return jsonResponse({ data: { limits: [
				{ type: 'TOKENS_LIMIT', unit: 6, number: 1, usage: 100, remaining: 60, currentValue: 40, nextResetTime: '2026-08-25T00:00:00Z' },
				{ type: 'TOKENS_LIMIT', unit: 5, number: 300, usage: 100, remaining: 80, currentValue: 20, nextResetTime: '2026-08-18T05:00:00Z' },
				{ type: 'TIME_LIMIT', usage: 100, remaining: 50, currentValue: 50 },
			] } });
		},
	});
	expect(calls.map((call) => call.url)).toEqual([
		'https://open.bigmodel.cn/api/monitor/usage/quota/limit',
		'https://open.bigmodel.cn/api/biz/subscription/list',
	]);
	expect(calls.every((call) => call.authorization === 'zai-secret')).toBe(true);
	expect(account).toMatchObject({ status: 'ok', plan: 'GLM Coding Pro', windows: [
		{ kind: 'session', usedPercent: 20, remainingPercent: 80 },
		{ kind: 'weekly', usedPercent: 40, remainingPercent: 60 },
		{ kind: 'billing', usedPercent: 50, remainingPercent: 50, resetsAt: Date.parse('2026-09-01T00:00:00Z') },
	] });
});

test('MiniMax Coding Plan preserves exhausted/unlimited windows and duration resets', async () => {
	const now = Date.parse('2026-08-18T00:00:00Z');
	const spec = accountSpec({ id: 'minimax-cn', apiKeyRef: 'MINIMAX_CUSTOM', baseURL: 'https://api.minimaxi.com' });
	const account = await queryProviderAccount(spec, credentials(), {
		now: () => now,
		fetch: async () => jsonResponse({ base_resp: { status_code: 0 }, model_remains: [{
			model_name: 'MiniMax-M3', current_interval_status: 3, current_weekly_status: 2,
			remains_time: 60_000, weekly_remains_time: 120_000,
		}] }),
	});
	expect(spec.providerFamily).toBe('minimax');
	expect(account).toMatchObject({ status: 'ok', windows: [
		{ kind: 'session', usedPercent: 0, remainingPercent: 100, resetsAt: now + 60_000 },
		{ kind: 'weekly', usedPercent: 100, remainingPercent: 0, resetsAt: now + 120_000 },
	] });
});

test('account collection deduplicates concurrent refreshes and serves the TTL cache', async () => {
	let calls = 0;
	let now = 10_000;
	const owner = {};
	const ctx = context();
	const deps = {
		now: () => now,
		cacheMs: 5000,
		fetch: async () => {
			calls++;
			await Promise.resolve();
			return jsonResponse({ is_available: true, balance_infos: [{ currency: 'CNY', total_balance: '18.64' }] });
		},
	};
	const [first, second] = await Promise.all([
		collectAccounts(owner, ctx, { deps }),
		collectAccounts(owner, ctx, { deps }),
	]);
	expect(calls).toBe(1);
	expect(first.accounts[0]).toBe(second.accounts[0]);
	now += 1000;
	const cached = await collectAccounts(owner, ctx, { deps });
	expect(calls).toBe(1);
	expect(cached.accounts[0]).toBe(first.accounts[0]);
});

test('failed refresh preserves the last successful account snapshot as stale', async () => {
	let now = 20_000;
	let failing = false;
	const owner = {};
	const deps = {
		now: () => now,
		cacheMs: 100,
		fetch: async () => failing
			? jsonResponse({}, 503)
			: jsonResponse({ is_available: true, balance_infos: [{ currency: 'CNY', total_balance: '18.64' }] }),
	};
	await collectAccounts(owner, context(), { deps });
	now += 101;
	failing = true;
	const stale = await collectAccounts(owner, context(), { deps });
	expect(stale.accounts[0]).toMatchObject({ status: 'unavailable', stale: true, lastSuccessAt: 20_000, balance: { remaining: 18.64 } });
	expect(stale.warnings[0]).toMatchObject({ providerId: 'deepseek-official' });
});
