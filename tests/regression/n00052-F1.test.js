// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 订阅账户 windows 数组里的 null/非对象条目会让整个余额面板渲染崩溃
// Source: src/client-balance.cjs:178  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';
import { test, expect, vi, beforeEach, afterEach } from 'vitest';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { BalanceView } = require('../../src/client-balance.cjs');

const NOW = Date.parse('2026-09-08T02:00:00Z');

function t(key) {
	return key;
}

function account(overrides = {}) {
	return {
		id: 'acct',
		displayName: 'Acct',
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
		balance: { currency: 'CNY', remaining: 10, used: null, total: null, toppedUp: null, granted: null, unlimited: false },
		plan: null,
		windows: [],
		...overrides,
	};
}

function render(accounts, props = {}) {
	return renderToStaticMarkup(React.createElement(BalanceView, {
		data: { generatedAt: NOW, accounts, warnings: [] },
		state: { kind: 'exact', error: null },
		remote: true,
		providers: null,
		alerts: {},
		t,
		...props,
	}));
}

beforeEach(() => {
	vi.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
	vi.restoreAllMocks();
});

test('[F1] 订阅账户 windows 里的 null 条目应被跳过而不是让整个面板渲染崩溃', () => {
	const sub = account({
		id: 'sub-plan',
		mode: 'subscription',
		adapter: 'fixture-plan',
		balance: null,
		windows: [
			null,
			{ kind: 'session', usedPercent: 50, remainingPercent: 50, resetsAt: NOW + 3600000 },
		],
	});
	expect(() => render([sub])).not.toThrow();
	const html = render([sub]);
	expect(html).toContain('data-kind="session"');
});

// [night-evolver] 这条发现还没修，测试暂不提升;

