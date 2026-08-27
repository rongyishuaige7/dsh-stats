import { accountSpec, collectAccounts, configuredProviders, providerViews, queryProviderAccount } from '../src/accounts.js';

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

function configurableContext(initialRef = 'ACCOUNT_KEY_A') {
	let apiKeyRef = initialRef;
	return {
		ctx: {
			settings: {
				get(name) {
					if (name === 'llm-deepseek') return { apiKeyEnv: apiKeyRef, baseURL: 'https://api.deepseek.com' };
					if (name === 'llm-pi-ai') return { providers: {} };
					return null;
				},
			},
			credentials: { resolve: async (ref) => ({ value: ref }) },
		},
		setApiKeyRef(ref) { apiKeyRef = ref; },
	};
}

test('yi-api-shaped pi-ai routes get the cc-switch usage adapter by default', async () => {
	const ctx = {
		settings: {
			get(name) {
				if (name === 'llm-deepseek') return { apiKeyEnv: 'DEEPSEEK_API_KEY', baseURL: 'https://api.deepseek.com' };
				if (name === 'llm-pi-ai') return { providers: {
					'yi-api': {
						apiKeyEnv: 'YI_API_API_KEY', api: 'openai-responses', baseURL: 'https://yiapi.cloud', displayName: 'yi-api',
						models: [{ id: 'gpt-5.6-luna', name: 'gpt-5.6-luna' }]
					}
				} };
				return null;
			}
		},
		credentials: credentials('yi-secret')
	};
	const provider = (await configuredProviders(ctx)).find((item) => item.id === 'yi-api');
	const spec = accountSpec(provider);
	expect(spec).toMatchObject({ displayName: 'yi-api', providerFamily: 'unknown', adapter: 'generic-usage', mode: 'balance', apiKeyRef: 'YI_API_API_KEY', baseURL: 'https://yiapi.cloud' });
	let request;
	const account = await queryProviderAccount(spec, ctx.credentials, {
		fetch: async (url, init) => {
			request = { url, init };
			return jsonResponse({ balance: 95349.09, remaining: 95349.09, unit: 'USD', isValid: true });
		}
	});
	expect(request.url).toBe('https://yiapi.cloud/v1/usage');
	expect(request.init.headers.Authorization).toBe('Bearer yi-secret');
	expect(account).toMatchObject({ id: 'yi-api', displayName: 'yi-api', status: 'ok', balance: { currency: 'USD', remaining: 95349.09 } });
	expect(JSON.stringify(account)).not.toContain('yi-secret');
});

test('default usage adapter accepts baseURL aliases and avoids a duplicate /v1 segment', async () => {
	const spec = accountSpec({ id: 'relay', baseUrl: 'https://relay.example.test/v1/', apiKeyEnv: 'RELAY_KEY' });
	let request;
	const account = await queryProviderAccount(spec, credentials('relay-secret'), {
		fetch: async (url, init) => { request = { url, init }; return jsonResponse({ remaining: 4, unit: 'USD', is_active: true }); }
	});
	expect(spec).toMatchObject({ adapter: 'generic-usage', apiKeyRef: 'RELAY_KEY', baseURL: 'https://relay.example.test/v1/' });
	expect(request.url).toBe('https://relay.example.test/v1/usage');
	expect(request.init.headers.Authorization).toBe('Bearer relay-secret');
	expect(account).toMatchObject({ status: 'ok', balance: { remaining: 4, currency: 'USD' } });
});

test('generic accountUsage adapter follows the cc-switch response contract without exposing the key', async () => {
	const spec = accountSpec({
		id: 'custom-relay', baseURL: 'https://relay.example.test', apiKeyRef: 'RELAY_API_KEY', accountType: 'api',
		accountUsage: {
			request: { url: '{{baseUrl}}/v1/usage', method: 'GET', headers: { Authorization: 'Bearer {{apiKey}}' } },
			extractor: { isValid: 'is_active', remaining: 'quota.remaining', unit: 'quota.unit', total: 'quota.total', used: 'quota.used' },
		},
	});
	let requested;
	const account = await queryProviderAccount(spec, credentials('relay-secret'), {
		fetch: async (url, init) => {
			requested = { url, init };
			return jsonResponse({ is_active: true, quota: { remaining: '8.5', used: 1.5, total: 10, unit: 'USD' } });
		},
	});
	expect(spec.adapter).toBe('generic-usage');
	expect(requested.url).toBe('https://relay.example.test/v1/usage');
	expect(requested.init.method).toBe('GET');
	expect(requested.init.headers.Authorization).toBe('Bearer relay-secret');
	expect(account).toMatchObject({ status: 'ok', balance: { currency: 'USD', remaining: 8.5, used: 1.5, total: 10 } });
	expect(JSON.stringify(account)).not.toContain('relay-secret');
});

test('generic accountUsage supports POST templates and rejects cross-origin endpoints', async () => {
	const postSpec = accountSpec({
		id: 'post-provider', baseURL: 'https://post.example.test/api', apiKeyRef: 'POST_KEY',
		accountUsage: { request: { url: '{{baseUrl}}/usage', method: 'POST', headers: { authorization: 'Bearer {{apiKey}}' }, body: { token: '{{apiKey}}' } }, extractor: { remaining: 'balance', unit: 'unit' } },
	});
	let request;
	const post = await queryProviderAccount(postSpec, credentials('post-secret'), { fetch: async (url, init) => { request = { url, init }; return jsonResponse({ balance: 2, unit: 'CNY' }); } });
	expect(post).toMatchObject({ status: 'ok', balance: { currency: 'CNY', remaining: 2 } });
	expect(request.url).toBe('https://post.example.test/api/usage');
	expect(request.init.body).toBe(JSON.stringify({ token: 'post-secret' }));
	const blockedSpec = accountSpec({ id: 'blocked-provider', baseURL: 'https://safe.example.test', apiKeyRef: 'KEY', accountUsage: { request: { url: 'https://evil.example.test/v1/usage', method: 'GET' }, extractor: { remaining: 'remaining' } } });
	const blocked = await queryProviderAccount(blockedSpec, credentials(), { fetch: async () => { throw new Error('must not fetch'); } });
	expect(blocked).toMatchObject({ status: 'blocked', errorCode: 'endpoint-not-allowed' });
});

test('generic accountUsage invalid responses and isValid=false are explicit', async () => {
	const spec = accountSpec({ id: 'invalid-provider', baseURL: 'https://invalid.example.test', apiKeyRef: 'KEY', accountUsage: { request: { url: '/v1/usage' }, extractor: { isValid: 'is_active', remaining: 'remaining' } } });
	const invalid = await queryProviderAccount(spec, credentials(), { fetch: async () => jsonResponse({ is_active: false, remaining: 5 }) });
	expect(invalid).toMatchObject({ status: 'invalid-response', errorCode: 'provider-invalid' });
	const missing = await queryProviderAccount(spec, credentials(), { fetch: async () => jsonResponse({ is_active: true }) });
	expect(missing).toMatchObject({ status: 'invalid-response' });
});

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
	expect(spec.actionUrl).toBe('https://platform.minimaxi.com/console/usage');
	const account = await queryProviderAccount(spec, credentials(), {
		now: () => now,
		fetch: async () => jsonResponse({ base_resp: { status_code: 0 }, model_remains: [{
			model_name: 'MiniMax-M3', current_interval_status: 3, current_weekly_status: 1, current_weekly_remaining_percent: 0,
			remains_time: 60_000, weekly_remains_time: 120_000,
		}] }),
	});
	expect(spec.providerFamily).toBe('minimax');
	expect(account).toMatchObject({ status: 'ok', windows: [
		{ kind: 'session', usedPercent: 0, remainingPercent: 100, resetsAt: now + 60_000 },
		{ kind: 'weekly', usedPercent: 100, remainingPercent: 0, resetsAt: now + 120_000 },
	] });
});

test('explicit MiniMax API accounts are not presented as Coding Plan subscriptions', async () => {
	const spec = accountSpec({ id: 'minimax-cn', apiKeyRef: 'MINIMAX_CUSTOM', baseURL: 'https://api.minimaxi.com', accountType: 'api' });
	expect(spec).toMatchObject({ providerFamily: 'minimax', accountType: 'api', adapter: null, mode: 'unsupported' });
	const account = await queryProviderAccount(spec, credentials(), { fetch: async () => { throw new Error('must not fetch'); } });
	expect(account).toMatchObject({ status: 'unsupported', mode: 'unsupported' });
});

test('MiniMax retries a compatibility endpoint after a valid but unusable response', async () => {
	const spec = accountSpec({ id: 'minimax-cn', apiKeyRef: 'MINIMAX_CUSTOM', accountType: 'coding-plan' });
	const urls = [];
	const account = await queryProviderAccount(spec, credentials(), {
		now: () => 1000,
		fetch: async (url) => {
			urls.push(url);
			if (urls.length === 1) return jsonResponse({ base_resp: { status_code: 0 }, model_remains: [] });
			return jsonResponse({ base_resp: { status_code: 0 }, model_remains: [{ model_name: 'general', current_interval_remaining_percent: 75 }] });
		},
	});
	expect(urls).toHaveLength(2);
	expect(account).toMatchObject({ status: 'ok', windows: [{ kind: 'session', usedPercent: 25, remainingPercent: 75 }] });
});

test.each([
	['exhausted', 2, undefined, 0],
	['unlimited', 3, undefined, 100],
	['explicit percentage', 2, 50, 50],
])('MiniMax weekly %s status remains visible', async (_label, status, explicitPercentage, expectedRemaining) => {
	const spec = accountSpec({ id: 'minimax-cn', apiKeyRef: 'MINIMAX_CUSTOM' });
	const account = await queryProviderAccount(spec, credentials(), {
		fetch: async () => jsonResponse({ base_resp: { status_code: 0 }, model_remains: [{
			model_name: 'general', current_interval_remaining_percent: 80,
			current_weekly_status: status, current_weekly_remaining_percent: explicitPercentage,
		}] }),
	});
	expect(account.windows.find((window) => window.kind === 'weekly')).toMatchObject({
		remainingPercent: expectedRemaining,
		usedPercent: 100 - expectedRemaining,
	});
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
	const forced = await collectAccounts(owner, ctx, { deps, force: true });
	expect(calls).toBe(2);
	expect(forced.accounts[0]).not.toBe(first.accounts[0]);
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

test('changing an account credential reference cannot reuse the previous snapshot', async () => {
	let now = 30_000;
	const owner = {};
	const configurable = configurableContext();
	const deps = {
		now: () => now,
		cacheMs: 10_000,
		fetch: async (_url, init) => init.headers.authorization === 'Bearer ACCOUNT_KEY_A'
			? jsonResponse({ is_available: true, balance_infos: [{ currency: 'CNY', total_balance: '18.64' }] })
			: jsonResponse({}, 503),
	};
	const first = await collectAccounts(owner, configurable.ctx, { deps });
	expect(first.accounts[0]).toMatchObject({ status: 'ok', balance: { remaining: 18.64 } });

	configurable.setApiKeyRef('ACCOUNT_KEY_B');
	const views = await providerViews(owner, configurable.ctx);
	expect(views.providers[0]).toMatchObject({ configured: true, status: 'pending', fetchedAt: null });
	now++;
	const changed = await collectAccounts(owner, configurable.ctx, { deps });
	expect(changed.accounts[0]).toMatchObject({ status: 'unavailable', stale: false, balance: null });
});

test('a slower request for an old account config cannot overwrite the new cache', async () => {
	const owner = {};
	const configurable = configurableContext();
	let resolveOld, resolveNew, markOldStarted, markNewStarted;
	const oldStarted = new Promise((resolve) => { markOldStarted = resolve; });
	const newStarted = new Promise((resolve) => { markNewStarted = resolve; });
	let calls = 0;
	const deps = {
		now: () => 40_000,
		cacheMs: 10_000,
		fetch: async (_url, init) => {
			calls++;
			if (init.headers.authorization === 'Bearer ACCOUNT_KEY_A') {
				markOldStarted();
				return new Promise((resolve) => { resolveOld = () => resolve(jsonResponse({ is_available: true, balance_infos: [{ currency: 'CNY', total_balance: '1.00' }] })); });
			}
			markNewStarted();
			return new Promise((resolve) => { resolveNew = () => resolve(jsonResponse({ is_available: true, balance_infos: [{ currency: 'CNY', total_balance: '2.00' }] })); });
		},
	};

	const oldRequest = collectAccounts(owner, configurable.ctx, { deps });
	await oldStarted;
	configurable.setApiKeyRef('ACCOUNT_KEY_B');
	const newRequest = collectAccounts(owner, configurable.ctx, { deps });
	await newStarted;
	resolveNew();
	const current = await newRequest;
	expect(current.accounts[0].balance.remaining).toBe(2);
	resolveOld();
	await oldRequest;

	const cached = await collectAccounts(owner, configurable.ctx, { deps });
	expect(calls).toBe(2);
	expect(cached.accounts[0].balance.remaining).toBe(2);
});
