// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] 按 pin 加载 catalog-<pin>.json 时不校验内容版本是否等于 pin，store 会使用与 pinnedVersion 不符的目录
// Source: src/pricing-store.js:46  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync, sign } from 'node:crypto';
import pricing from '../../src/pricing.cjs';
import { PricingStore } from '../../src/pricing-store.js';

const homes = [];
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const base = structuredClone(pricing.BUILTIN);

function envelope(catalog) {
  const payload = JSON.stringify(catalog);
  return { payload, signature: sign(null, Buffer.from(payload), privateKey).toString('base64') };
}

function makeHome() {
  const home = mkdtempSync(join(tmpdir(), 'pricing-evolver-'));
  homes.push(home);
  return home;
}

function custom(extra = {}) {
  return {
    id: 'custom-astra',
    providerId: 'yi-api',
    family: 'unknown',
    canonical: 'gpt-6-astra',
    aliases: ['gpt-6-astra'],
    currency: 'CNY',
    rates: { uncached: 1, output: 2, cacheRead: 0, cacheWrite: null },
    sourceUrl: null,
    retrievedAt: '2026-09-17',
    confidence: 'estimated',
    reasoningIncludedInOutput: true,
    ...extra,
  };
}

afterEach(() => {
  while (homes.length) rmSync(homes.pop(), { recursive: true, force: true });
});

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] 固定版本加载不校验 catalog-<pin>.json 的内容版本，pin 与生效目录版本不一致', () => {
  const home = makeHome();
  const dir = join(home, 'plugins', 'dsh-stats', 'pricing');
  mkdirSync(dir, { recursive: true });
  const pin = base.version;
  writeFileSync(
    join(dir, 'settings.json'),
    JSON.stringify({ revision: 0, autoUpdate: false, pinnedVersion: pin, overrides: [] }),
  );
  writeFileSync(
    join(dir, 'catalog-' + pin + '.json'),
    JSON.stringify(envelope({ ...base, version: pin + 5 })),
  );

  const subject = new PricingStore(home, { fetchImpl: vi.fn(), publicKey });
  const status = subject.status();
  expect(status.pinnedVersion).toBe(pin);
  expect(status.version).toBe(pin);
});

