import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { BalanceView } = require('../src/client-balance.cjs');
const { zh, en } = require('../src/client-locale.cjs');
const { fmtBalanceAmount } = require('../src/client-format.cjs');

const NOW = Date.parse('2026-09-08T02:00:00Z');

function account(overrides = {}) {
	return {
		id: 'deepseek-official',
		displayName: 'DeepSeek',
		providerFamily: 'deepseek',
		mode: 'balance',
		adapter: 'deepseek-balance',
		status: 'ok',
		stale: false,
		fetchedAt: NOW,
		lastSuccessAt: NOW,
		errorCode: null,
		missingCredential: null,
		actionUrl: 'https://platform.deepseek.com/top_up',
		balance: { currency: 'CNY', remaining: 123.45, used: null, total: null, toppedUp: 100, granted: 23.45, unlimited: false },
		plan: null,
		windows: [],
		...overrides,
	};
}

function defaultAccounts() {
	return [
		account(),
		account({ id: 'minimax-coding', displayName: 'MiniMax Coding Plan', providerFamily: 'minimax', mode: 'subscription', adapter: 'minimax-token-plan', balance: null,
			plan: 'Professional Coding Plan', actionUrl: 'https://platform.minimaxi.com/subscribe/token-plan',
			windows: [{ kind: 'session', usedPercent: 82, remainingPercent: 18, resetsAt: NOW + 7800000 }] }),
		account({ id: 'openrouter', displayName: 'OpenRouter', providerFamily: 'openrouter', adapter: 'openrouter-balance',
			balance: { currency: 'USD', remaining: 15.5, used: 4.5, total: 20, toppedUp: null, granted: null, unlimited: false },
			actionUrl: 'https://openrouter.ai/credits' }),
		account({ id: 'kimi-coding', displayName: 'Kimi For Coding', providerFamily: 'moonshot', mode: 'subscription', adapter: 'kimi-token-plan', balance: null,
			actionUrl: 'https://www.kimi.com/code/console',
			windows: [{ kind: 'weekly', usedPercent: 96, remainingPercent: 4, resetsAt: NOW + 223200000 }] }),
		account({ id: 'moonshotai-cn', displayName: 'Moonshot', providerFamily: 'moonshot', adapter: 'moonshot-balance',
			status: 'unavailable', stale: true, errorCode: 'http-5xx', lastSuccessAt: NOW - 1560000,
			balance: { currency: 'CNY', remaining: 36.2, used: null, total: null, toppedUp: 30, granted: 6.2, unlimited: false },
			actionUrl: 'https://platform.moonshot.cn/console/account' }),
		account({ id: 'yi-api', displayName: 'yi-api', providerFamily: 'unknown', adapter: 'generic-usage',
			balance: { currency: 'USD', remaining: 42.8, used: null, total: null, toppedUp: null, granted: null, unlimited: false }, actionUrl: null }),
		account({ id: 'zai-coding-cn', displayName: 'Z.ai Coding Plan', providerFamily: 'zai', mode: 'subscription', adapter: 'zai-token-plan',
			status: 'not-configured', errorCode: 'not-configured', missingCredential: 'ZAI_API_KEY', lastSuccessAt: null, balance: null,
			actionUrl: 'https://z.ai/manage-apikey/apikey-list' }),
		account({ id: 'anthropic', displayName: 'Anthropic', providerFamily: 'anthropic', mode: 'unsupported', adapter: null,
			status: 'unsupported', errorCode: 'unsupported', lastSuccessAt: null, balance: null, actionUrl: null }),
	];
}

function render(props = {}) {
	const dictionary = props.lang === 'en' ? en : zh;
	const options = {
		data: { generatedAt: NOW, accounts: defaultAccounts(), warnings: [] },
		state: { kind: 'exact', error: null },
		remote: true,
		providers: null,
		alerts: {},
		t: key => dictionary[key] ?? key,
		...props,
	};
	return renderToStaticMarkup(React.createElement(BalanceView, options));
}

function rowIds(html) {
	return [...html.matchAll(/<li class="dss-bal-row[^"]*" data-account-id="([^"]+)"/g)].map(match => match[1]);
}

beforeEach(() => {
	vi.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
	vi.restoreAllMocks();
});

test('BalanceView lists active accounts in B2 order', () => {
	const html = render();
	expect(rowIds(html)).toEqual([
		'kimi-coding', 'minimax-coding', 'moonshotai-cn', 'deepseek-official', 'openrouter', 'yi-api',
	]);
	expect(html).toContain('¥159.65');
	expect(html).toContain('剩余 4%');
	expect(html.replace(/<[^>]+>/g, '')).toContain('Kimi For Coding、MiniMax Coding Plan、Moonshot');
	expect(html).toContain('data-tone="danger"');
	expect(html).toContain('data-tone="warn"');
});

test('a single account renders no summary strip', () => {
	const html = render({ data: { generatedAt: NOW, accounts: [account()], warnings: [] } });
	expect(rowIds(html)).toEqual(['deepseek-official']);
	expect(html).not.toContain('dss-bal-kpis');
});

test('all accounts idle shows the empty line and opens the idle group', () => {
	const html = render({
		data: {
			generatedAt: NOW,
			accounts: defaultAccounts().filter(item => item.status === 'not-configured' || item.status === 'unsupported'),
			warnings: [],
		},
	});
	expect(html).toContain('还没有可查询的账户');
	expect(html).toMatch(/<details class="dss-bal-idle" open="">/);
	expect(html).toContain('未接入 2 个：Z.ai Coding Plan · Anthropic');
});

test('a missing remote shows the unavailable line without a retry', () => {
	const html = render({ remote: false, data: null, state: { kind: 'unavailable', error: null } });
	expect(html).toContain('账户服务不可用');
	expect(html).not.toContain('data-action="balance-retry"');
});

test('a first-load failure exposes the diagnostics and a retry button', () => {
	const html = render({ data: null, state: { kind: 'error', error: 'Connection lost' }, onRetry: () => {} });
	expect(html).toContain('没有读到账户数据');
	expect(html).toContain('data-action="balance-retry"');
	expect(html).toContain('Connection lost');
	expect(html).toContain('role="status"');
});

test('the legacy warning renders a localized note, never the host message', () => {
	const html = render({
		data: {
			generatedAt: NOW,
			accounts: [account()],
			warnings: [{ providerId: 'deepseek-official', code: 'LEGACY_ACCOUNT_API', message: 'Legacy account service: only DeepSeek balances are available' }],
		},
	});
	expect(html).toContain('data-code="LEGACY_ACCOUNT_API"');
	expect(html).toContain('当前宿主版本只能查询 DeepSeek 余额。');
	expect(html).not.toContain('Legacy account service');
});

test('non-https action URLs render no link', () => {
	const html = render({ data: { generatedAt: NOW, accounts: [account({ actionUrl: 'http://example.com/top-up' })], warnings: [] } });
	expect(html).not.toContain('data-action="balance-link"');
});

test('Chinese and English render without missing balance keys', () => {
	const zhKeys = Object.keys(zh).filter(key => key.startsWith('balance.')).sort();
	const enKeys = Object.keys(en).filter(key => key.startsWith('balance.')).sort();
	expect(enKeys).toEqual(zhKeys);
	expect(en['source.error']).toBe('Read failed');
	expect(en['source.unavailable']).toBe('Account service unavailable');
	const zhHtml = render();
	const enHtml = render({ lang: 'en' });
	expect(zhHtml).not.toContain('balance.');
	expect(enHtml).not.toContain('balance.');
	expect(enHtml).toContain('Quota almost out');
});

test('balance amounts always keep two decimals and thousands separators', () => {
	expect(fmtBalanceAmount(1234.5, 'CNY')).toBe('¥1,234.50');
	expect(fmtBalanceAmount(15.5, 'USD')).toBe('$15.50');
	expect(fmtBalanceAmount(15.5, 'EUR')).toBe('15.50 EUR');
	expect(fmtBalanceAmount(null, 'CNY')).toBe('—');
});

test('meter label width and attention separators follow the language', () => {
	const zhHtml = render();
	expect(zhHtml).toContain('--dss-bal-mk:4.2em');
	expect(zhHtml.replace(/<[^>]+>/g, '')).toContain('Kimi For Coding、MiniMax Coding Plan、Moonshot');
	const enHtml = render({ lang: 'en' });
	expect(enHtml).toContain('--dss-bal-mk:8em');
	expect(enHtml.replace(/<[^>]+>/g, '')).toContain('Kimi For Coding, MiniMax Coding Plan, Moonshot');
	expect(enHtml).not.toContain('、');
});

function provider(id, displayName, accountMode, overrides = {}) {
	return { id, displayName, providerFamily: 'fixture', accountMode, adapter: accountMode === 'unsupported' ? null : 'fixture-adapter', configured: accountMode !== 'unsupported', status: accountMode === 'unsupported' ? 'unsupported' : 'pending', fetchedAt: null, ...overrides };
}

test('the first load without providers shows three unnamed skeleton rows', () => {
	const html = render({ data: null, state: { kind: 'loading' }, providers: null });
	expect(html.match(/dss-bal-row is-skeleton/g)).toHaveLength(3);
	expect(html).toContain('aria-busy="true"');
	expect(html).not.toContain('dss-bal-kpis');
	expect(html).not.toContain('dss-bal-name');
	expect(html).toContain('正在读取账户数据…');
});

test('named providers render named skeleton rows, KPI skeleton and the idle group', () => {
	const providers = [
		provider('deepseek-official', 'DeepSeek', 'balance'),
		provider('minimax-coding', 'MiniMax Coding Plan', 'subscription'),
		provider('openrouter', 'OpenRouter', 'balance'),
		provider('kimi-coding', 'Kimi For Coding', 'subscription'),
		provider('moonshotai-cn', 'Moonshot', 'balance'),
		provider('yi-api', 'yi-api', 'balance'),
		provider('zai-coding-cn', 'Z.ai Coding Plan', 'subscription', { configured: false }),
		provider('anthropic', 'Anthropic', 'unsupported'),
	];
	const html = render({ data: null, state: { kind: 'loading' }, providers });
	expect(html.match(/dss-bal-row is-skeleton/g)).toHaveLength(6);
	expect([...html.matchAll(/<b class="dss-bal-name">([^<]+)<\/b>/g)].map(match => match[1])).toEqual([
		'DeepSeek', 'MiniMax Coding Plan', 'OpenRouter', 'Kimi For Coding', 'Moonshot', 'yi-api',
	]);
	expect(html).toContain('dss-bal-kpis is-skeleton');
	expect(html).toContain('未接入 2 个：Z.ai Coding Plan · Anthropic');
	expect(html).toContain('正在读取 6 个账户…');
	expect(html).toContain('aria-busy="true"');
});

test('all-idle providers render no skeleton rows and open the idle group', () => {
	const providers = [
		provider('zai-coding-cn', 'Z.ai Coding Plan', 'subscription', { configured: false }),
		provider('anthropic', 'Anthropic', 'unsupported'),
	];
	const html = render({ data: null, state: { kind: 'loading' }, providers });
	expect(html).not.toContain('dss-bal-row is-skeleton');
	expect(html).not.toContain('dss-bal-kpis');
	expect(html).toMatch(/<details class="dss-bal-idle" open="">/);
	expect(html).toContain('正在读取账户数据…');
});

test('English count wording reads naturally', () => {
	const normal = render({ lang: 'en' });
	expect(normal).toContain('Balance accounts: 4');
	const providers = [
		provider('deepseek-official', 'DeepSeek', 'balance'),
		provider('minimax-coding', 'MiniMax Coding Plan', 'subscription'),
		provider('openrouter', 'OpenRouter', 'balance'),
		provider('kimi-coding', 'Kimi For Coding', 'subscription'),
		provider('moonshotai-cn', 'Moonshot', 'balance'),
		provider('yi-api', 'yi-api', 'balance'),
	];
	const skeleton = render({ data: null, state: { kind: 'loading' }, providers, lang: 'en' });
	expect(skeleton).toContain('Reading accounts (6)…');
});

function rowHtml(html, id) {
	const start = html.indexOf(`data-account-id="${id}"`);
	return html.slice(start, html.indexOf('</li>', start));
}

test('chips carry the reasons they restate; only new information keeps a reason line', () => {
	const accounts = defaultAccounts();
	Object.assign(accounts[0], { balance: { ...accounts[0].balance, remaining: 0, toppedUp: 0, granted: 0 } });
	Object.assign(accounts[2], { status: 'unauthorized', errorCode: 'unauthorized', lastSuccessAt: null, balance: null });
	const html = render({ data: { generatedAt: NOW, accounts, warnings: [] } });
	const deepseek = rowHtml(html, 'deepseek-official');
	expect(deepseek).toContain('<span class="dss-bal-chip is-danger has-tip" tabindex="0" aria-describedby="dss-bal-chip-tip-deepseek-official">余额已用完</span>');
	expect(deepseek).toContain('<span class="dss-sr" id="dss-bal-chip-tip-deepseek-official">余额为 0，充值后才能继续调用</span>');
	expect(deepseek).not.toContain('dss-bal-reason');
	const openrouter = rowHtml(html, 'openrouter');
	expect(openrouter).toContain('>凭证无效</span><span class="dss-sr" id="dss-bal-chip-tip-openrouter">凭证无效或没有查询权限</span>');
	expect(openrouter).not.toContain('dss-bal-reason');
	// Moonshot's snapshot is from today, so the reason shows the time only.
	const moonshot = rowHtml(html, 'moonshotai-cn');
	expect(moonshot).toContain('<span class="dss-bal-chip is-warn">数据过期</span>');
	expect(moonshot).toContain('<div class="dss-bal-reason">刷新失败，显示的是 09:34 的结果</div>');
	expect(rowHtml(html, 'kimi-coding')).toContain('<span class="dss-bal-chip is-danger">额度将用完</span>');
	const odd = render({ data: { generatedAt: NOW, accounts: [account({ id: 'my relay.cn', status: 'unauthorized', balance: null })], warnings: [] } });
	expect(odd).toContain('aria-describedby="dss-bal-chip-tip-my_relay_cn"');
	expect(odd).toContain('id="dss-bal-chip-tip-my_relay_cn"');
});

test('only the official DeepSeek row wears the DeepSeek skin, and bells say what they do', () => {
	const html = render();
	expect(html.match(/ is-ds"/g)).toHaveLength(1);
	expect(html).toContain('<li class="dss-bal-row is-ds" data-account-id="deepseek-official"');
	expect(rowHtml(html, 'deepseek-official')).toMatch(/<button[^>]*class="dss-bal-bell"[^>]*><svg[^]*?<\/svg><span>提醒<\/span><\/button>/);
	expect(rowHtml(render({ lang: 'en' }), 'openrouter')).toContain('<span>Alert</span></button>');
});

test('the data note sits behind the column header ⓘ, with a narrow-screen twin below the list', () => {
	const html = render();
	expect(html).toContain('<div class="dss-bal-cols"><span aria-hidden="true">账户</span><span class="dss-bal-col-v"><span aria-hidden="true">余额 / 剩余额度</span><span class="dss-info-wrap"><button type="button" class="dss-info" aria-label="数据说明" aria-describedby="dss-bal-cols-tip">');
	expect(html).toMatch(/<span class="dss-info-tip" role="tooltip" id="dss-bal-cols-tip">数据来自各 Provider 的官方账户接口/);
	expect(html).toMatch(/<p class="dss-bal-foot is-tip">数据说明<span class="dss-info-wrap"><button[^>]*aria-describedby="dss-bal-foot-tip"/);
	const idleOnly = render({ data: { generatedAt: NOW, accounts: defaultAccounts().filter(item => item.status === 'unsupported'), warnings: [] } });
	expect(idleOnly).toContain('<p class="dss-bal-foot">数据来自各 Provider 的官方账户接口');
	expect(idleOnly).not.toContain('dss-bal-cols');
});

test('custom routes without a usage endpoint share one idle line', () => {
	const relay = (id, adapter = null) => account({ id, displayName: id, providerFamily: 'unknown', mode: adapter ? 'balance' : 'unsupported', adapter,
		status: 'unsupported', errorCode: 'unsupported', lastSuccessAt: null, balance: null, actionUrl: null });
	const only = render({ data: { generatedAt: NOW, accounts: [account(), relay('cpa'), relay('workbuddy'), relay('rongyiwb', 'generic-usage')], warnings: [] } });
	expect(only).toContain('未接入 3 个：cpa · workbuddy · rongyiwb');
	// One reason covers every idle account, so the line skips the names the summary already lists.
	expect(only).toContain('<div class="dss-bal-idle-row is-group" data-account-ids="cpa workbuddy rongyiwb"><span class="dss-bal-reason">自定义路由未提供 HTTPS 的 /v1/usage 余额接口，不影响 Token 统计</span></div>');
	expect(only.match(/dss-bal-idle-row/g)).toHaveLength(1);
	const mixed = render({ data: { generatedAt: NOW, accounts: [...defaultAccounts(), relay('cpa'), relay('workbuddy')], warnings: [] } });
	expect(mixed).toContain('<div class="dss-bal-idle-row is-group" data-account-ids="cpa workbuddy"><b>cpa · workbuddy</b><span class="dss-bal-reason">自定义路由未提供');
	expect(mixed).toContain('<div class="dss-bal-idle-row" data-account-id="anthropic"><b>Anthropic</b><span class="dss-bal-reason">没有可用的官方账户查询接口，不影响 Token 统计</span></div>');
	expect(mixed).toMatch(/<div class="dss-bal-idle-row" data-account-id="zai-coding-cn"><b>Z\.ai Coding Plan<\/b><span class="dss-bal-reason">未配置凭证 <code>ZAI_API_KEY<\/code><\/span><a /);
});

test('the skeleton summary has two cells when no provider is a subscription', () => {
	const providers = [
		provider('deepseek-official', 'DeepSeek', 'balance'),
		provider('openrouter', 'OpenRouter', 'balance'),
	];
	const html = render({ data: null, state: { kind: 'loading' }, providers });
	expect(html).toContain('dss-bal-kpis is-skeleton is-two');
	expect(html.match(/dss-bal-kpi-k/g)).toHaveLength(2);
});
