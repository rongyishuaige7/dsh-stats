// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] status() 直接返回内部 history 数组引用，外部修改会污染缓存并让后续更新被误判为版本回退
// Source: src/pricing-store.js:136  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync, sign } from 'node:crypto';
import pricing from '../../src/pricing.cjs';
import { PricingStore } from '../../src/pricing-store.js';

const homes = [];
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const now = Date.parse(pricing.BUILTIN.publishedAt) + 86400000;
const base = structuredClone(pricing.BUILTIN);

function envelope(catalog) {
	const payload = JSON.stringify(catalog);
	return { payload, signature: sign(null, Buffer.from(payload), privateKey).toString('base64') };
}

function gatewayRule() {
	return {
		id: 'custom-astra',
		providerId: 'gateway',
		family: 'unknown',
		canonical: 'future-model',
		aliases: ['future-model'],
		currency: 'CNY',
		rates: { uncached: 1, output: 2, cacheRead: 0, cacheWrite: null },
		sourceUrl: 'https://example.com/pricing',
		retrievedAt: '2026-09-17',
		confidence: 'estimated',
		reasoningIncludedInOutput: true,
	};
}

const newer = { ...base, version: base.version + 1, rules: [...base.rules, gatewayRule()] };
const gatewayUsage = { providerId: 'gateway', model: 'future-model', time: now, uncached: 1000, output: 100 };

function newHome() {
	const dir = mkdtempSync(join(tmpdir(), 'pricing-evolver-'));
	homes.push(dir);
	return dir;
}

afterEach(() => {
	while (homes.length) rmSync(homes.pop(), { recursive: true, force: true });
});

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] status() 返回内部 history 数组引用，外部修改会污染缓存并阻断后续更新', async () => {
	const dir = newHome();
	const store = new PricingStore(dir, {
		publicKey,
		now: () => now,
		fetchImpl: async () => new Response(JSON.stringify(envelope(newer))),
	});
	expect((await store.refresh()).error).toBeNull();

	const first = store.status();
	expect(first.history).toEqual([newer.version]);

	// 调用方原地修改返回的 history 不应影响 store 内部缓存
	first.history.push(99999);
	expect(store.status().history).not.toContain(99999);

	// 被污染的历史不应把合法的更高版本更新误判为回退
	const next = { ...base, version: newer.version + 1 };
	store.fetch = async () => new Response(JSON.stringify(envelope(next)));
	const result = await store.refresh({ force: true });
	expect(result.error).toBeNull();
	expect(store.catalog.version).toBe(next.version);
});

