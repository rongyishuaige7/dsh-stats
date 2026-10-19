import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
	QUOTA_WARN, QUOTA_DANGER, ALERT_MAX,
	quotaLevel, fmtQuotaPercent, splitAccounts, normalizeBalanceAlerts,
	alertFor, validateAlertAmount, accountChip, accountTone, sortAccounts,
	accountMeta, accountReason, balanceParts, resetParts, balanceTotals,
	tightestWindow, attentionList, balanceHeaderState, legacyNotice,
	skeletonModel, safeActionUrl,
} = require('../src/client-balance-model.cjs');

// Every test pins "now" to the fixture clock (2026-09-08T02:00:00Z). The model
// never reads the wall clock, so the suite is identical under TZ=UTC.
const NOW = Date.parse('2026-09-08T02:00:00Z');

function balance(overrides = {}) {
	return {
		currency: 'CNY', remaining: 123.45, used: null, total: null,
		toppedUp: 100, granted: 23.45, unlimited: false,
		...overrides,
	};
}

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
		balance: balance(),
		plan: null,
		windows: [],
		...overrides,
	};
}

function quotaWindow(remainingPercent, overrides = {}) {
	return {
		kind: 'weekly',
		usedPercent: 100 - remainingPercent,
		remainingPercent,
		resetsAt: NOW + 223200000,
		...overrides,
	};
}

function subscription(overrides = {}) {
	return account({
		id: 'kimi-coding',
		displayName: 'Kimi For Coding',
		providerFamily: 'moonshot',
		mode: 'subscription',
		adapter: 'kimi-token-plan',
		balance: null,
		plan: null,
		windows: [quotaWindow(4)],
		...overrides,
	});
}

test('exports the locked constants', () => {
	expect(QUOTA_WARN).toBe(20);
	expect(QUOTA_DANGER).toBe(5);
	expect(ALERT_MAX).toBe(1e9);
});

test('quotaLevel uses the 20% and 5% thresholds', () => {
	expect(quotaLevel(19.99)).toBe('warn');
	expect(quotaLevel(20)).toBe('ok');
	expect(quotaLevel(4.99)).toBe('danger');
	expect(quotaLevel(5)).toBe('warn');
	expect(quotaLevel(0)).toBe('danger');
	expect(quotaLevel(100)).toBe('ok');
});

test('fmtQuotaPercent always rounds down', () => {
	expect(fmtQuotaPercent(68)).toEqual({ value: 68, text: '68' });
	expect(fmtQuotaPercent(67.6)).toEqual({ value: 67, text: '67' });
	expect(fmtQuotaPercent(9.99)).toEqual({ value: 9.9, text: '9.9' });
	expect(fmtQuotaPercent(4.0)).toEqual({ value: 4, text: '4' });
	expect(fmtQuotaPercent(4.96)).toEqual({ value: 4.9, text: '4.9' });
	expect(fmtQuotaPercent(0)).toEqual({ value: 0, text: '0' });
	expect(fmtQuotaPercent(100)).toEqual({ value: 100, text: '100' });
});

test('splitAccounts folds not-configured and unsupported accounts into idle', () => {
	const activeA = account({ id: 'active-a' });
	const missing = account({ id: 'missing', status: 'not-configured' });
	const activeB = account({ id: 'active-b' });
	const unsupported = account({ id: 'unsupported', status: 'unsupported' });
	const split = splitAccounts([activeA, missing, activeB, unsupported]);
	expect(split.active.map((item) => item.id)).toEqual(['active-a', 'active-b']);
	expect(split.idle.map((item) => item.id)).toEqual(['missing', 'unsupported']);
	expect(splitAccounts(null)).toEqual({ active: [], idle: [] });
});

test('normalizeBalanceAlerts keeps only valid entries', () => {
	expect(normalizeBalanceAlerts(null)).toEqual({});
	expect(normalizeBalanceAlerts(undefined)).toEqual({});
	expect(normalizeBalanceAlerts([])).toEqual({});
	expect(normalizeBalanceAlerts('20')).toEqual({});
	const normalized = normalizeBalanceAlerts({
		valid: { amount: 20, currency: 'CNY' },
		extra: { amount: 30, currency: 'USD', ignored: true },
		max: { amount: 1e9, currency: 'CNY' },
		zero: { amount: 0, currency: 'CNY' },
		negative: { amount: -1, currency: 'CNY' },
		nan: { amount: NaN, currency: 'CNY' },
		stringAmount: { amount: '20', currency: 'CNY' },
		tooLarge: { amount: 1e9 + 1, currency: 'CNY' },
		emptyCurrency: { amount: 20, currency: '' },
		missingCurrency: { amount: 20 },
		missingAmount: { currency: 'CNY' },
		nullEntry: null,
		'': { amount: 20, currency: 'CNY' },
	});
	expect(normalized).toEqual({
		valid: { amount: 20, currency: 'CNY' },
		extra: { amount: 30, currency: 'USD' },
		max: { amount: 1e9, currency: 'CNY' },
	});
});

test('alertFor requires a readable, limited balance account in the same currency', () => {
	const alerts = { 'deepseek-official': { amount: 200, currency: 'CNY' } };
	expect(alertFor(account(), alerts)).toEqual({ amount: 200, currency: 'CNY' });
	expect(alertFor(account({ balance: balance({ currency: 'USD' }) }), alerts)).toBeNull();
	expect(alertFor(account({ mode: 'subscription', balance: null }), alerts)).toBeNull();
	expect(alertFor(account({ balance: null }), alerts)).toBeNull();
	expect(alertFor(account({ balance: balance({ unlimited: true }) }), alerts)).toBeNull();
	expect(alertFor(account(), {})).toBeNull();
});

test('validateAlertAmount normalizes separators and rejects malformed input', () => {
	expect(validateAlertAmount('20')).toEqual({ kind: 'ok', amount: 20 });
	expect(validateAlertAmount('20.5')).toEqual({ kind: 'ok', amount: 20.5 });
	expect(validateAlertAmount('1,000')).toEqual({ kind: 'ok', amount: 1000 });
	expect(validateAlertAmount('1，000')).toEqual({ kind: 'ok', amount: 1000 });
	expect(validateAlertAmount(' 20 ')).toEqual({ kind: 'ok', amount: 20 });
	expect(validateAlertAmount('1,000.50')).toEqual({ kind: 'ok', amount: 1000.5 });
	expect(validateAlertAmount('')).toEqual({ kind: 'empty' });
	expect(validateAlertAmount('   ')).toEqual({ kind: 'empty' });
	['0', '-1', '1.234', 'abc', '1e3', '1000000001', '２０'].forEach((raw) => {
		expect(validateAlertAmount(raw)).toEqual({ kind: 'invalid' });
	});
});

test('accountChip follows the B7 table row by row', () => {
	expect(accountChip(account({ stale: true, status: 'unavailable' }), {})).toEqual({ tone: 'warn', key: 'chip.stale' });
	expect(accountChip(account({ status: 'unauthorized' }), {})).toEqual({ tone: 'danger', key: 'chip.unauthorized' });
	expect(accountChip(account({ status: 'blocked' }), {})).toEqual({ tone: 'danger', key: 'chip.blocked' });
	expect(accountChip(account({ status: 'rate-limited' }), {})).toEqual({ tone: 'warn', key: 'chip.rateLimited' });
	expect(accountChip(account({ status: 'unavailable' }), {})).toEqual({ tone: 'warn', key: 'chip.unavailable' });
	expect(accountChip(account({ status: 'invalid-response' }), {})).toEqual({ tone: 'warn', key: 'chip.invalidResponse' });
	expect(accountChip(subscription({ windows: [quotaWindow(0)] }), {})).toEqual({ tone: 'danger', key: 'chip.quotaOut' });
	expect(accountChip(subscription({ windows: [quotaWindow(4.99)] }), {})).toEqual({ tone: 'danger', key: 'chip.quotaDanger' });
	expect(accountChip(subscription({ windows: [quotaWindow(19.99)] }), {})).toEqual({ tone: 'warn', key: 'chip.quotaWarn' });
	expect(accountChip(account({ balance: balance({ remaining: 0, toppedUp: 0, granted: 0 }) }), {})).toEqual({ tone: 'danger', key: 'chip.balanceOut' });
	expect(accountChip(account({ balance: balance({ remaining: 5 }) }), { 'deepseek-official': { amount: 20, currency: 'CNY' } })).toEqual({ tone: 'warn', key: 'chip.balanceLow' });
	expect(accountChip(account(), {})).toBeNull();
});

test('accountChip precedence and edge cases', () => {
	expect(accountChip(account({ stale: true, status: 'unauthorized' }), {})).toEqual({ tone: 'warn', key: 'chip.stale' });
	expect(accountChip(
		account({ balance: balance({ remaining: 0, unlimited: true, toppedUp: 0, granted: 0 }) }),
		{ 'deepseek-official': { amount: 20, currency: 'CNY' } },
	)).toBeNull();
	expect(accountChip(subscription({ windows: [quotaWindow(30), quotaWindow(4)] }), {})).toEqual({ tone: 'danger', key: 'chip.quotaDanger' });
	expect(accountChip(subscription({ windows: [quotaWindow(30), quotaWindow(12)] }), {})).toEqual({ tone: 'warn', key: 'chip.quotaWarn' });
	expect(accountChip(subscription({ windows: [] }), {})).toBeNull();
	expect(accountTone(account({ status: 'blocked' }), {})).toBe('danger');
	expect(accountTone(account(), {})).toBe('ok');
});

test('sortAccounts orders danger, warn, ok and keeps the host order inside a tone', () => {
	const okA = account({ id: 'ok-a' });
	const dangerA = account({ id: 'danger-a', status: 'unauthorized' });
	const warnA = account({ id: 'warn-a', status: 'rate-limited' });
	const okB = account({ id: 'ok-b' });
	const dangerB = account({ id: 'danger-b', status: 'blocked' });
	const input = [okA, dangerA, warnA, okB, dangerB];
	const sorted = sortAccounts(input, {});
	expect(sorted.map((item) => item.id)).toEqual(['danger-a', 'danger-b', 'warn-a', 'ok-a', 'ok-b']);
	expect(input.map((item) => item.id)).toEqual(['ok-a', 'danger-a', 'warn-a', 'ok-b', 'danger-b']);
	expect(sorted).not.toBe(input);
});

test('accountMeta never repeats the account name and labels custom routes', () => {
	expect(accountMeta(account({ displayName: 'DeepSeek', plan: 'DeepSeek' }))).toEqual({
		type: 'balance', detail: { kind: 'id', value: 'deepseek-official' },
	});
	expect(accountMeta(account({ plan: '  ' }))).toEqual({
		type: 'balance', detail: { kind: 'id', value: 'deepseek-official' },
	});
	expect(accountMeta(account({ plan: 'Professional Coding Plan' }))).toEqual({
		type: 'balance', detail: { kind: 'plan', value: 'Professional Coding Plan' },
	});
	expect(accountMeta(account({ adapter: 'generic-usage' }))).toEqual({
		type: 'balance', detail: { kind: 'route', value: null },
	});
	expect(accountMeta(subscription({ plan: 'Kimi Plan' }))).toEqual({
		type: 'subscription', detail: { kind: 'plan', value: 'Kimi Plan' },
	});
	const moonshot = accountMeta(account({
		id: 'moonshotai-cn', displayName: 'Moonshot', providerFamily: 'moonshot', adapter: 'moonshot-balance',
	}));
	const kimi = accountMeta(subscription({ id: 'kimi-coding', displayName: 'Kimi For Coding', plan: null }));
	expect(moonshot).toEqual({ type: 'balance', detail: { kind: 'id', value: 'moonshotai-cn' } });
	expect(kimi).toEqual({ type: 'subscription', detail: { kind: 'id', value: 'kimi-coding' } });
	expect(moonshot).not.toEqual(kimi);
});

test('accountReason picks the first applicable reason', () => {
	expect(accountReason(account({ stale: true, status: 'unavailable', lastSuccessAt: 1000 }))).toEqual({
		key: 'reason.stale', at: 1000,
	});
	expect(accountReason(account({ stale: true, lastSuccessAt: null }))).toEqual({ key: 'staleHint' });
	['unauthorized', 'blocked', 'rate-limited', 'unavailable', 'invalid-response'].forEach((status) => {
		expect(accountReason(account({ status }))).toEqual({ key: 'message.' + status });
	});
	expect(accountReason(account({ balance: balance({ remaining: 0, toppedUp: 0, granted: 0 }) }))).toEqual({
		key: 'reason.balanceOut',
	});
	expect(accountReason(account({ balance: balance({ remaining: 0, unlimited: true }) }))).toBeNull();
	expect(accountReason(account())).toBeNull();
});

test('balanceParts omits empty parts and clamps the available meter', () => {
	const full = balanceParts(account({
		balance: balance({ remaining: 15.5, used: 4.5, total: 20, toppedUp: 100, granted: 23.45 }),
	}), null);
	expect(full).toEqual({
		amount: 15.5,
		currency: 'CNY',
		zero: false,
		unlimited: false,
		parts: [
			{ key: 'toppedUp', value: 100 },
			{ key: 'granted', value: 23.45 },
			{ key: 'used', value: [4.5, 20] },
		],
		alertLine: null,
		meter: { remaining: 77 },
	});
	const sparse = balanceParts(account({
		balance: balance({ remaining: 10, toppedUp: 0, granted: null, used: null, total: null }),
	}), null);
	expect(sparse.parts).toEqual([]);
	expect(sparse.meter).toBeNull();
	expect(balanceParts(account({ balance: balance({ total: 0, used: 0 }) }), null).meter).toBeNull();
	expect(balanceParts(account({
		balance: balance({ remaining: 25, total: 20, used: 5, toppedUp: 0, granted: 0 }),
	}), null).meter).toEqual({ remaining: 100 });
});

test('balanceParts marks the alert line and never warns unlimited balances', () => {
	const alert = { amount: 20, currency: 'CNY' };
	expect(balanceParts(account({ balance: balance({ remaining: 5, toppedUp: 0, granted: 0 }) }), alert).alertLine)
		.toEqual({ amount: 20, below: true });
	expect(balanceParts(account({ balance: balance({ remaining: 50, toppedUp: 0, granted: 0 }) }), alert).alertLine)
		.toEqual({ amount: 20, below: false });
	const unlimited = balanceParts(account({
		balance: balance({ remaining: 0, unlimited: true, toppedUp: 0, granted: 0 }),
	}), alert);
	expect(unlimited).toMatchObject({ zero: false, unlimited: true, alertLine: null, meter: null });
	expect(balanceParts(account({ balance: null }), null)).toEqual({
		amount: null, currency: null, zero: false, unlimited: false,
		parts: [], alertLine: null, meter: null,
	});
});

test('resetParts rounds minutes down and drops trailing zero fields', () => {
	expect(resetParts(NOW + 59000, NOW)).toEqual({ soon: true });
	expect(resetParts(NOW - 1, NOW)).toEqual({ soon: true });
	expect(resetParts(NOW + 60000, NOW)).toEqual({ minutes: 1 });
	expect(resetParts(NOW + 60 * 60000, NOW)).toEqual({ hours: 1, minutes: 0 });
	expect(resetParts(NOW + (23 * 60 + 59) * 60000, NOW)).toEqual({ hours: 23, minutes: 59 });
	expect(resetParts(NOW + 24 * 60 * 60000, NOW)).toEqual({ days: 1, hours: 0 });
	expect(resetParts(NOW + ((2 * 24 + 14) * 60 + 5) * 60000, NOW)).toEqual({ days: 2, hours: 14 });
	expect(resetParts(null, NOW)).toBeNull();
	expect(resetParts(NOW + 60000, null)).toBeNull();
});

test('balanceTotals sums cents, leads with CNY and reports counts', () => {
	const cents = balanceTotals([
		account({ id: 'a', balance: balance({ remaining: 0.1, toppedUp: 0, granted: 0 }) }),
		account({ id: 'b', balance: balance({ remaining: 0.2, toppedUp: 0, granted: 0 }) }),
	]);
	expect(cents.lead).toEqual({ currency: 'CNY', amount: 0.3 });

	const cnyLead = balanceTotals([
		account({ id: 'usd', balance: balance({ currency: 'USD', remaining: 10, toppedUp: 0, granted: 0 }) }),
		account({ id: 'cny', balance: balance({ currency: 'CNY', remaining: 5, toppedUp: 0, granted: 0 }) }),
	]);
	expect(cnyLead.lead).toEqual({ currency: 'CNY', amount: 5 });
	expect(cnyLead.others).toEqual([{ currency: 'USD', amount: 10 }]);

	const firstSeen = balanceTotals([
		account({ id: 'usd', balance: balance({ currency: 'USD', remaining: 10, toppedUp: 0, granted: 0 }) }),
		account({ id: 'eur', balance: balance({ currency: 'EUR', remaining: 5, toppedUp: 0, granted: 0 }) }),
	]);
	expect(firstSeen.lead).toEqual({ currency: 'USD', amount: 10 });
	expect(firstSeen.others).toEqual([{ currency: 'EUR', amount: 5 }]);

	const unlimited = balanceTotals([
		account({ id: 'unlimited', balance: balance({ remaining: 999, unlimited: true }) }),
	]);
	expect(unlimited.lead).toBeNull();
	expect(unlimited.others).toEqual([]);

	const counts = balanceTotals([
		account({ id: 'ok' }),
		account({ id: 'stale', stale: true, balance: balance({ remaining: 10, toppedUp: 0, granted: 0 }) }),
		account({ id: 'unread', balance: null }),
		subscription({ id: 'subscription', windows: [quotaWindow(4)] }),
	]);
	expect(counts).toMatchObject({ balanceCount: 3, staleCount: 1, unreadCount: 1 });
});

test('tightestWindow scans subscriptions across accounts and keeps the first tie', () => {
	const first = subscription({ id: 'first', windows: [quotaWindow(50)] });
	const tight = subscription({ id: 'tight', windows: [quotaWindow(30), quotaWindow(4)] });
	const later = subscription({ id: 'later', windows: [quotaWindow(4)] });
	const result = tightestWindow([first, tight, later]);
	expect(result.account).toBe(tight);
	expect(result.window.remainingPercent).toBe(4);
	const tieFirst = subscription({ id: 'tie-first', windows: [quotaWindow(4)] });
	expect(tightestWindow([first, tieFirst, later]).account).toBe(tieFirst);
	expect(tightestWindow([account()])).toBeNull();
	expect(tightestWindow([])).toBeNull();
});

test('attentionList returns B2 order and the worst tone', () => {
	const list = [
		account({ id: 'ok-1' }),
		account({ id: 'danger-1', status: 'unauthorized' }),
		subscription({ id: 'warn-1', windows: [quotaWindow(18)] }),
		account({ id: 'warn-2', stale: true, balance: balance({ remaining: 10, toppedUp: 0, granted: 0 }) }),
		account({ id: 'ok-2', balance: balance({ remaining: 1, toppedUp: 0, granted: 0 }) }),
	];
	const attention = attentionList(list, {});
	expect(attention.tone).toBe('danger');
	expect(attention.accounts.map((item) => item.id)).toEqual(['danger-1', 'warn-1', 'warn-2']);
	expect(attentionList([account()], {})).toEqual({ tone: 'ok', accounts: [] });
});

test('balanceHeaderState maps the six B10 cases', () => {
	const data = { generatedAt: 1000, accounts: [], warnings: [] };
	expect(balanceHeaderState({ kind: 'loading' }, null, false)).toEqual({ kind: 'unavailable', at: null, error: null });
	expect(balanceHeaderState({ kind: 'loading' }, null, true)).toEqual({ kind: 'loading', at: null, error: null });
	expect(balanceHeaderState({ kind: 'refreshing' }, data, true)).toEqual({ kind: 'refreshing', at: null, error: null });
	expect(balanceHeaderState({ kind: 'exact' }, data, true)).toEqual({ kind: 'exact', at: 1000, error: null });
	expect(balanceHeaderState({ kind: 'stale', error: 'Connection lost' }, data, true))
		.toEqual({ kind: 'stale', at: 1000, error: 'Connection lost' });
	expect(balanceHeaderState({ kind: 'error', error: 'Connection lost' }, null, true))
		.toEqual({ kind: 'error', at: null, error: 'Connection lost' });
	expect(balanceHeaderState({ kind: 'error', error: 'Connection lost' }, data, true))
		.toEqual({ kind: 'stale', at: 1000, error: 'Connection lost' });
});

test('legacyNotice only matches the legacy account API warning code', () => {
	expect(legacyNotice({ warnings: [{ code: 'LEGACY_ACCOUNT_API', message: 'Legacy account service' }] })).toBe(true);
	expect(legacyNotice({ warnings: [{ code: 'HTTP_5XX', message: 'unavailable' }] })).toBe(false);
	expect(legacyNotice({ warnings: [] })).toBe(false);
	expect(legacyNotice(null)).toBe(false);
});

test('skeletonModel falls back to three unnamed rows and folds idle providers', () => {
	expect(skeletonModel(null)).toEqual({
		rows: [{ id: null }, { id: null }, { id: null }], idle: [], named: false,
	});
	expect(skeletonModel([])).toEqual({
		rows: [{ id: null }, { id: null }, { id: null }], idle: [], named: false,
	});
	const model = skeletonModel([
		{ id: 'deepseek-official', displayName: 'DeepSeek', accountMode: 'balance', configured: true, status: 'pending' },
		{ id: 'zai-coding-cn', displayName: 'Z.ai Coding Plan', accountMode: 'subscription', configured: false, status: 'not-configured' },
		{ id: 'kimi-coding', displayName: 'Kimi For Coding', accountMode: 'subscription', configured: true, status: 'pending' },
		{ id: 'anthropic', displayName: 'Anthropic', accountMode: 'unsupported', configured: true, status: 'unsupported' },
	]);
	expect(model.named).toBe(true);
	expect(model.rows).toEqual([
		{ id: 'deepseek-official', name: 'DeepSeek', type: 'balance' },
		{ id: 'kimi-coding', name: 'Kimi For Coding', type: 'subscription' },
	]);
	expect(model.idle).toEqual([
		{ id: 'zai-coding-cn', name: 'Z.ai Coding Plan', reason: 'notConfigured' },
		{ id: 'anthropic', name: 'Anthropic', reason: 'idle.unsupported' },
	]);
});

test('safeActionUrl only accepts parseable https links', () => {
	expect(safeActionUrl('https://platform.deepseek.com/top_up')).toBe('https://platform.deepseek.com/top_up');
	expect(safeActionUrl('http://example.com')).toBeNull();
	expect(safeActionUrl('javascript:alert(1)')).toBeNull();
	expect(safeActionUrl('/credits')).toBeNull();
	expect(safeActionUrl('not a url')).toBeNull();
	expect(safeActionUrl('')).toBeNull();
	expect(safeActionUrl(null)).toBeNull();
});
