import { TYPERT } from '../src/typert-host.js';
import { TYPERT_REMOTE } from '../src/typert-remote-client.js';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { StatsDataStatus, BalanceView, readAccountRemote, parseProvidersResult, parseAccountResult, aggregate } = require('../src/client.cjs').__test;

const account = {
	id: 'deepseek-official', displayName: 'DeepSeek', providerFamily: 'deepseek', mode: 'balance', adapter: 'deepseek-balance',
	status: 'ok', stale: false, fetchedAt: 1000, lastSuccessAt: 1000, errorCode: null, missingCredential: null,
	actionUrl: 'https://platform.deepseek.com/top_up', balance: { currency: 'CNY', remaining: 12.3, used: null, total: null, toppedUp: null, granted: null, unlimited: false },
	plan: null, windows: []
};
const result = { generatedAt: 1000, accounts: [account], warnings: [] };
const legacy = { generatedAt: 1000, accounts: [{ provider: 'deepseek', name: 'DeepSeek', status: 'ok', currency: 'CNY',
	total: 12.3, toppedUp: null, granted: null, fetchedAt: 1000, topUpUrl: account.actionUrl, errorCode: null }], warnings: [] };

test.each(['gateway/internal', 'gateway/result-invalid', 'gateway/definition-unavailable', 'timeout'])('account %s errors preserve the original failure without a legacy query', async (code) => {
	const error = Object.assign(new Error('Account request failed'), { code });
	const stats = { account: vi.fn(async () => ({ ok: false, error })), current: vi.fn() };
	await expect(readAccountRemote(stats, true)).rejects.toBe(error);
	expect(stats.current).not.toHaveBeenCalled();
});

test('network and validation failures do not fall back to legacy balances', async () => {
	const current = vi.fn();
	const error = new Error('Connection lost');
	await expect(readAccountRemote({ account: async () => { throw error; }, current })).rejects.toBe(error);
	await expect(readAccountRemote({ account: async () => ({ ok: true, value: { ...result, accounts: [{ ...account, status: 'unexpected' }] } }), current })).rejects.toThrow();
	expect(current).not.toHaveBeenCalled();
});

test.each(['gateway/invocation-unavailable', 'gateway/method-unavailable', -32601])('unsupported account method %s returns an explicitly qualified legacy result', async (code) => {
	const stats = { account: async () => ({ ok: false, error: { code } }), current: vi.fn(async () => ({ ok: true, value: legacy })) };
	const response = await readAccountRemote(stats);
	expect(response.accounts[0].balance.remaining).toBe(12.3);
	expect(response.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'LEGACY_ACCOUNT_API' })]));
	expect(stats.current).toHaveBeenCalledOnce();
});

test('a successful account query preserves every provider and passes force explicitly', async () => {
	const response = { ...result, accounts: [account, { ...account, id: 'second-provider' }] };
	const stats = { account: vi.fn(async () => ({ ok: true, value: response })), current: vi.fn() };
	expect(await readAccountRemote(stats, true)).toBe(response);
	expect(stats.account).toHaveBeenCalledWith(true);
	expect(stats.current).not.toHaveBeenCalled();
});

test('shared RPC contracts reject invalid status, URLs, and unknown fields in every face', () => {
	const invalidAccounts = [
		{ ...result, accounts: [{ ...account, actionUrl: 'not-a-url' }] },
		{ ...result, accounts: [{ ...account, status: 'unexpected' }] },
		{ ...result, unexpected: true }
	];
	const parsers = [parseAccountResult,
		value => TYPERT.invocations.find(row => row.method === 'account').result.schema.parse(value),
		value => TYPERT_REMOTE.descriptors.find(row => row.method === 'account').result.schema.parse(value)];
	for (const parse of parsers) {
		expect(() => parse(result)).not.toThrow();
		for (const invalid of invalidAccounts) expect(() => parse(invalid)).toThrow();
	}
	expect(() => parseProvidersResult({ generatedAt: 1000, providers: [{ id: 'p', displayName: 'P', providerFamily: 'unknown', accountMode: 'unexpected', adapter: null, configured: false, status: 'pending', fetchedAt: null }] })).toThrow();
});

test('status band displays stale data, provenance, time, diagnostics and missing prices', () => {
	const projects = [{ sessions: [{ stats: {}, cost: { status: 'partial', totals: [{ currency: 'CNY', amount: 1, exactAmount: 0, estimatedAmount: 1 }], unpricedTokens: 400, unknownRows: 1 } }] }];
	const html = renderToStaticMarkup(React.createElement(StatsDataStatus, { state: { kind: 'stale', at: 1000, error: 'Connection lost' }, remote: true, projects, t: key => key }));
	for (const text of ['source.host', 'source.stale', 'source.updated', 'source.details', 'Connection lost', 'pricing.partial', 'pricing.unpriced', '400']) expect(html).toContain(text);
	expect(html).toContain('aria-live="polite"');
});

test('account RPC refresh failure labels retained successful balances as stale', () => {
	const html = renderToStaticMarkup(React.createElement(BalanceView, { data: result, state: { kind: 'stale', error: 'Connection lost' }, remote: true, t: key => key }));
	expect(html).toContain('balance.status.stale');
	expect(html).toContain('balance.lastSuccess');
	expect(html).toContain('12.30');
	expect(html).not.toContain('balance.status.ok');
});

test('client fallback counts duplicate workspace membership only once', () => {
	const summary = { id: 's', updatedAt: 1000, projectionValues: { tokenUsage: { uncachedInputTokens: 10, outputTokens: 2 } } };
	const projects = aggregate([summary], [{ workspaceId: 'a', sessionIds: ['s', 's'] }, { workspaceId: 'b', sessionIds: ['s'] }], key => key);
	expect(projects.reduce((sum, project) => sum + project.sessionCount, 0)).toBe(1);
	expect(projects.reduce((sum, project) => sum + project.stats.inputTokens, 0)).toBe(10);
});

test.each([false, true])('client fallback consistently excludes inherited tokens (empty own usage: %s)', (empty) => {
	const { sessionDayTokens, projectCsvTable } = require('../src/client.cjs').__test;
	const now = Date.parse('2026-09-17T02:00:00Z');
	const own = { providerId: 'deepseek', model: 'deepseek-v4-flash', accountType: 'api', serviceTier: 'standard', contextTokens: 10, count: 1, slot: Math.floor(now / 1800000), time: now, uncached: 10, output: 2 };
	const child = { id: 'child', title: 'Fork', updatedAt: now, parentSession: 'parent', origin: 'subagent', cwd: '/fixture', projectionValues: {
		tokenUsage: { uncachedInputTokens: 10009, outputTokens: 1002 },
		statsRoute: { parentSession: 'parent', inheritedEventCount: 1, current: own, routes: empty ? [] : [own] },
	} };
	const projects = aggregate([child], [{ workspaceId: 'p', path: '/fixture', sessionIds: ['child'] }], key => key, []);
	const session = projects[0].sessions[0];
	expect(session.stats.inputTokens + session.stats.outputTokens).toBe(empty ? 0 : 12);
	const daily = [...sessionDayTokens([session]).values()];
	expect(daily.reduce((sum, row) => sum + (row.input || 0) + (row.output || 0), 0)).toBe(empty ? 0 : 12);
	const [headers, ...rows] = projectCsvTable(projects, key => key);
	expect(rows.reduce((sum, row) => sum + row[headers.indexOf('uncachedInput')] + row[headers.indexOf('tokenOutput')], 0)).toBe(empty ? 0 : 12);
});

test.each(['=1+1', '+SUM(A1:A2)', '-1+2', '@SUM(A1)', '  =1+1', '\t=1+1', '\r=1+1', '\n=1+1'])('CSV neutralizes formula text %j', (value) => {
	const { csvField } = require('../src/client.cjs').__test;
	expect(csvField(value).replace(/^"/, '')).toMatch(/^'/);
});

test('CSV preserves numeric negatives, quotes, commas and ordinary labels', () => {
	const { csvField } = require('../src/client.cjs').__test;
	expect(csvField(-2.5)).toBe('-2.5');
	expect(csvField('a,"b"')).toBe('"a,""b"""');
	expect(csvField('ordinary name')).toBe('ordinary name');
});
