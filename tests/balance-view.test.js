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
