// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 窗口的 resetsAt 已过去时仍被渲染成“即将重置”
// Source: src/client-balance.cjs:123  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { BalanceView } = require('../../src/client-balance.cjs');
const { zh } = require('../../src/client-locale.cjs');

const NOW = Date.parse('2026-09-08T02:00:00Z');

function account(overrides = {}) {
	return {
		id: 'fixture',
		displayName: 'Fixture',
		providerFamily: 'fixture',
		mode: 'balance',
		adapter: 'fixture-balance',
		status: 'ok',
		stale: false,
		fetchedAt: NOW,
		lastSuccessAt: NOW,
		errorCode: null,
		missingCredential: null,
		actionUrl: null,
		balance: { currency: 'CNY', remaining: 100, used: null, total: null, toppedUp: 100, granted: null, unlimited: false },
		plan: null,
		windows: [],
		...overrides,
	};
}

function render(accounts) {
	return renderToStaticMarkup(React.createElement(BalanceView, {
		data: { generatedAt: NOW, accounts, warnings: [] },
		state: { kind: 'exact', error: null },
		remote: true,
		providers: null,
		alerts: {},
		t: key => zh[key] ?? key,
	}));
}

beforeEach(() => {
	vi.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
	vi.restoreAllMocks();
});

test('[F1] 已过去的 resetsAt 不应被渲染成“即将重置”', () => {
	const soon = zh['balance.resetSoon'];
	expect(typeof soon).toBe('string');
	const html = render([
		account({
			id: 'minimax-coding',
			displayName: 'MiniMax Coding Plan',
			mode: 'subscription',
			adapter: 'minimax-token-plan',
			balance: null,
			plan: 'Professional Coding Plan',
			windows: [{ kind: 'session', usedPercent: 100, remainingPercent: 0, resetsAt: NOW - 3600000 }],
		}),
	]);
	expect(html).not.toContain(soon);
});

// [night-evolver] 这条发现还没修，测试暂不提升;

