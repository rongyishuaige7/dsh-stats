import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync, sign } from 'node:crypto';
import pricing from '../src/pricing.cjs';
import { PricingStore, verifyEnvelope } from '../src/pricing-store.js';

const homes = [];
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const now = Date.parse('2026-09-18T00:00:00Z');
const base = structuredClone(pricing.BUILTIN);
function envelope(catalog) { const payload = JSON.stringify(catalog); return { payload, signature: sign(null, Buffer.from(payload), privateKey).toString('base64') }; }
function fixture(fetchImpl) { const home = mkdtempSync(join(tmpdir(), 'pricing-test-')); homes.push(home); return new PricingStore(home, { fetchImpl, now: () => now, publicKey }); }
function custom(extra = {}) { return { id: 'custom-astra', providerId: 'yi-api', family: 'unknown', canonical: 'gpt-6-astra', aliases: ['gpt-6-astra'], currency: 'CNY', rates: { uncached: 1, output: 2, cacheRead: 0, cacheWrite: null }, sourceUrl: null, retrievedAt: '2026-09-17', confidence: 'estimated', reasoningIncludedInOutput: true, ...extra }; }
function usage(extra = {}) { return { providerId: 'yi-api', model: 'gpt-6-astra', time: now, uncached: 1000, output: 100, ...extra }; }
afterEach(() => { while (homes.length) rmSync(homes.pop(), { recursive: true, force: true }); });

test('signed update adds a new model without changing the plugin and survives restart', async () => {
  const catalog = { ...base, version: base.version + 1, rules: [...base.rules, { ...custom({ providerId: 'gateway', sourceUrl: 'https://example.com/pricing', canonical: 'future-model', aliases: ['future-model'] }) }] };
  const store = fixture(async () => new Response(JSON.stringify(envelope(catalog))));
  expect(store.snapshot().priceUsage(usage({ providerId: 'gateway', model: 'future-model' })).amount).toBeNull();
  expect((await store.refresh()).error).toBeNull();
  expect(store.snapshot().priceUsage(usage({ providerId: 'gateway', model: 'future-model' })).amount).toBeCloseTo(0.0012);
  const restored = new PricingStore(homes[0], { publicKey });
  expect(restored.catalog.version).toBe(catalog.version);
  expect(restored.snapshot().priceUsage(usage({ providerId: 'gateway', model: 'future-model' })).amount).toBeCloseTo(0.0012);
});

test('invalid signature and a failed refresh retain the last valid prices with an explicit error', async () => {
  const valid = envelope({ ...base, version: base.version + 1 });
  let response = valid;
  const store = fixture(async () => new Response(JSON.stringify(response)));
  await store.refresh(); const version = store.catalog.version;
  response = { ...valid, payload: valid.payload.replace('gpt-6-astra', 'evil-model') };
  expect((await store.refresh({ force: true })).error).toBe('pricing-signature-invalid');
  expect(store.catalog.version).toBe(version);
  store.fetch = async () => { throw new Error('private network details'); };
  expect((await store.refresh({ force: true })).error).toBe('pricing-update-failed');
  expect(store.catalog.version).toBe(version);
});

test('replayed versions and mutations of an existing version are rejected', async () => {
  let value = { ...base, version: base.version + 1 };
  const store = fixture(async () => new Response(JSON.stringify(envelope(value))));
  await store.refresh(); value = base;
  expect((await store.refresh({ force: true })).error).toBe('pricing-version-regressed');
  value = { ...base, version: base.version + 1, publishedAt: '2026-09-17T09:00:00Z' };
  expect((await store.refresh({ force: true })).error).toBe('pricing-version-conflict');
});

test('custom scoped prices take precedence, preview does not save, and stale revisions cannot overwrite settings', async () => {
  const store = fixture(vi.fn());
  const before = store.snapshot().priceUsage(usage()).amount;
  expect(store.preview([custom()]).priceUsage(usage()).amount).toBeCloseTo(0.0012);
  expect(store.snapshot().priceUsage(usage()).amount).toBe(before);
  store.save({ revision: 0, autoUpdate: false, overrides: [custom()] });
  expect(store.snapshot().priceUsage(usage()).amount).toBeCloseTo(0.0012);
  expect(store.snapshot().priceUsage(usage({ providerId: 'another-gateway' })).amount).toBe(before);
  expect(() => store.save({ revision: 0, autoUpdate: true, overrides: [] })).toThrow('conflict');
  await store.refresh(); expect(store.fetch).not.toHaveBeenCalled();
});

test('request times choose different historical prices inside the same half-hour slot', () => {
  const split = '2026-09-17T08:15:00Z';
  const engine = pricing.createPricing(base, [custom({ id: 'old', effectiveTo: split }), custom({ id: 'new', effectiveFrom: split, rates: { uncached: 2, output: 4, cacheRead: 0, cacheWrite: null } })]);
  const at = Date.parse(split);
  expect(engine.priceUsage(usage({ time: at - 1 })).amount).toBeCloseTo(0.0012);
  expect(engine.priceUsage(usage({ time: at })).amount).toBeCloseTo(0.0024);
  expect(() => pricing.createPricing(base, [custom(), custom({ id: 'overlap' })])).toThrow('overlapping');
});

test('missing cache prices preserve known costs and cannot turn missing tokens into free usage', () => {
  const engine = pricing.createPricing(base, [custom()]);
  const cost = engine.priceUsage(usage({ cacheWrite: 50 }));
  expect(cost).toMatchObject({ status: 'partial', unpricedTokens: 50, amount: 0.0012 });
  expect(engine.priceUsage(usage({ uncached: 0, output: 0, cacheWrite: 50 }))).toMatchObject({ status: 'unsupported', amount: null, unpricedTokens: 50 });
  expect(engine.priceUsage(usage({ accountType: 'subscription' })).status).toBe('subscription');
});

test('catalog rejects unsupported structures and invalid rates even if signed', () => {
  for (const rate of [-1, Infinity, '0']) {
    expect(() => pricing.createPricing(base, [custom({ rates: { uncached: rate, cacheRead: 0, cacheWrite: null, output: 1 } })])).toThrow();
  }
  expect(() => verifyEnvelope(envelope({ ...base, schemaVersion: 999 }), publicKey)).toThrow();
});

test('rollback remains pinned during in-flight refresh and across restarts; resume loads newest valid cache', async () => {
  let value = { ...base, version: base.version + 1 };
  const store = fixture(async () => new Response(JSON.stringify(envelope(value))));
  await store.refresh();
  value = { ...base, version: base.version + 2 };
  await store.refresh({ force: true });
  const restore = base.version + 1;
  let release;
  store.fetch = () => new Promise(resolve => { release = resolve; });
  const pending = store.refresh({ force: true });
  store.rollback(restore, 0);
  release(new Response(JSON.stringify(envelope({ ...base, version: base.version + 3 }))));
  await pending;
  expect(store.catalog.version).toBe(restore);
  const reopened = new PricingStore(homes[0], { publicKey });
  expect(reopened.catalog.version).toBe(restore);
  expect(reopened.settings.autoUpdate).toBe(false);
  store.save({ revision: 1, autoUpdate: true, overrides: [] });
  expect(store.catalog.version).toBe(base.version + 2);
  expect(store.settings.pinnedVersion).toBeNull();
});

test('another process settings are reloaded and stale writes are rejected', () => {
  const first = fixture(vi.fn());
  const second = new PricingStore(homes[0], { publicKey });
  first.save({ revision: 0, autoUpdate: false, overrides: [custom()] });
  expect(() => second.save({ revision: 0, autoUpdate: true, overrides: [] })).toThrow('pricing-settings-conflict');
  expect(second.snapshot().priceUsage(usage()).amount).toBeCloseTo(0.0012);
});

test('preview fingerprints detect intervening price updates and custom revisions are archived', async () => {
  const store = fixture(async () => new Response(JSON.stringify(envelope({ ...base, version: base.version + 1 }))));
  const fingerprint = store.fingerprint;
  await store.refresh();
  expect(() => store.save({ revision: 0, autoUpdate: true, overrides: [custom()], fingerprint })).toThrow('pricing-settings-conflict');
  store.save({ revision: 0, autoUpdate: true, overrides: [custom()] });
  const { readFileSync } = await import('node:fs');
  expect(JSON.parse(readFileSync(join(store.dir, 'settings-1.json'), 'utf8')).overrides[0].id).toBe('custom-astra');
  expect(() => pricing.validateOverrides([custom(), custom({ id: 'relay', accountType: 'relay' })])).toThrow('overlapping');
});

test('disposing the host cancels updates without recreating its data directory', async () => {
  let release;
  const store = fixture(() => new Promise(resolve => { release = resolve; }));
  const pending = store.refresh();
  store.close();
  release(new Response(JSON.stringify(envelope({ ...base, version: base.version + 1 }))));
  await pending;
  const { existsSync } = await import('node:fs');
  expect(existsSync(store.dir)).toBe(false);
  expect(store.catalog.version).toBe(base.version);
});
