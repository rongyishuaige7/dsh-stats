// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] refresh({force:true}) 在已有非强制下载进行中时被静默去重，force 语义丢失，设置 revision 变化后该次强制刷新不会落盘
// Source: src/pricing-store.js:141  Contract: src/pricing-store.js:177（`!force && (...)` 表明强制刷新应绕过“设置已变更”的提交守卫）
// Verified fixed by `recheck`; do not delete without checking the finding.

import { expect, test } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync, sign } from 'node:crypto';
import builtinEnvelope from '../../data/pricing/latest.json' with { type: 'json' };
import pricing from '../../src/pricing.cjs';
import { PricingStore } from '../../src/pricing-store.js';

const NOW = 1_000_000_000_000;

function makeEnvelope(privateKey, catalog) {
	const payload = JSON.stringify(catalog);
	return { payload, signature: sign(null, Buffer.from(payload), privateKey).toString('base64') };
}

test('[F1] 强制刷新被进行中的非强制下载去重，force 丢失导致新目录不落盘', async () => {
	const home = mkdtempSync(join(tmpdir(), 'pricing-store-f1-'));
	try {
		const { publicKey, privateKey } = generateKeyPairSync('ed25519');
		const base = JSON.parse(builtinEnvelope.payload);
		const version = Math.max(pricing.BUILTIN.version, base.version) + 1;
		const catalog = { ...base, version, publishedAt: '2001-09-09T01:46:40.000Z' };
		const envelope = makeEnvelope(privateKey, catalog);

		let release;
		const gate = new Promise(resolve => { release = resolve; });
		const fetchImpl = () => gate.then(() => new Response(JSON.stringify(envelope)));

		const store = new PricingStore(home, { publicKey, fetchImpl, now: () => NOW });
		const pending = store.refresh(); // 非强制下载，携带 revision=0
		const forced = store.refresh({ force: true }); // 期望：强制刷新，应绕过 revision 守卫
		expect(() => store.save({ revision: 0, autoUpdate: true, overrides: [] })).not.toThrow(); // 下载期间 revision 0 -> 1
		release();
		await forced;

		expect(store.status().version).toBe(version);
		void pending;
	} finally {
		rmSync(home, { recursive: true, force: true });
	}
});

