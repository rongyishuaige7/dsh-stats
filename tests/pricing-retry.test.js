import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync, sign } from 'node:crypto';
import { afterEach, expect, test } from 'vitest';
import pricing from '../src/pricing.cjs';
import { PricingStore } from '../src/pricing-store.js';

const homes = [];
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const NOW = Date.parse(pricing.BUILTIN.publishedAt) + 86400000;
const base = structuredClone(pricing.BUILTIN);
const nextCatalog = () => ({ ...base, version: base.version + 1 });
const envelope = catalog => { const payload = JSON.stringify(catalog); return { payload, signature: sign(null, Buffer.from(payload), privateKey).toString('base64') }; };
const ok = (catalog = nextCatalog()) => new Response(JSON.stringify(envelope(catalog)));

function store(fetchImpl, extra = {}) {
  const home = mkdtempSync(join(tmpdir(), 'pricing-retry-'));
  homes.push(home);
  return new PricingStore(home, { fetchImpl, now: () => NOW, publicKey, retryDelays: { auto: [0, 0, 0], manual: [0] }, ...extra });
}
afterEach(() => { while (homes.length) rmSync(homes.pop(), { recursive: true, force: true }); });

test('a transient fetch failure is retried and the retry is recorded', async () => {
  let calls = 0;
  const subject = store(async () => {
    calls += 1;
    if (calls === 1) throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
    return ok();
  });
  const status = await subject.refresh();
  expect(calls).toBe(2);
  expect(status.error).toBeNull();
  expect(status.errorDetail).toBeNull();
  expect(status.attempts).toBe(2);
  expect(status.consecutiveFailures).toBe(0);
  expect(subject.catalog.version).toBe(base.version + 1);
});

test('a client error is not retried and keeps the HTTP status in the diagnostic', async () => {
  let calls = 0;
  const subject = store(async () => { calls += 1; return new Response('nope', { status: 404 }); });
  const status = await subject.refresh();
  expect(calls).toBe(1);
  expect(status.error).toBe('pricing-http-404');
  expect(status.errorDetail).toBe('HTTP 404');
  expect(status.attempts).toBe(1);
});

test('a server error is retried up to the automatic ladder and then reported', async () => {
  let calls = 0;
  const subject = store(async () => { calls += 1; return new Response('boom', { status: 503 }); });
  const status = await subject.refresh();
  expect(calls).toBe(4);
  expect(status.error).toBe('pricing-http-503');
  expect(status.errorDetail).toBe('HTTP 503');
  expect(status.attempts).toBe(4);
  expect(status.consecutiveFailures).toBe(1);
  expect(status.nextCheckAt).toBe(NOW + 5 * 60000);
});

test('a rejected signature is final and never retried', async () => {
  let calls = 0;
  const subject = store(async () => {
    calls += 1;
    const value = envelope(nextCatalog());
    return new Response(JSON.stringify({ ...value, payload: value.payload + ' ' }));
  });
  const status = await subject.refresh();
  expect(calls).toBe(1);
  expect(status.error).toBe('pricing-signature-invalid');
  expect(status.attempts).toBe(1);
});

test('a version regression is final and never retried', async () => {
  let calls = 0;
  const subject = store(async () => { calls += 1; return ok({ ...base, version: base.version - 1 }); });
  const status = await subject.refresh();
  expect(calls).toBe(1);
  expect(status.error).toBe('pricing-version-regressed');
});

test('a hanging request times out, is classified and retried', async () => {
  let calls = 0;
  const subject = store((url, init) => new Promise((resolve, reject) => {
    calls += 1;
    init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
  }), { attemptTimeoutMs: 100, retryDelays: { auto: [0], manual: [0] } });
  const status = await subject.refresh();
  expect(calls).toBe(2);
  expect(status.error).toBe('pricing-timeout');
  expect(status.errorDetail).toBe('timeout after 0.1s');
  expect(status.attempts).toBe(2);
});

test('closing the store cancels the retry ladder without recording an error', async () => {
  let calls = 0;
  const subject = store((url, init) => new Promise((resolve, reject) => {
    calls += 1;
    init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }), { retryDelays: { auto: [40, 40, 40], manual: [0] } });
  const pending = subject.refresh();
  await new Promise(resolve => setTimeout(resolve, 10));
  subject.close();
  const status = await pending;
  expect(calls).toBe(1);
  expect(status.error).toBeNull();
});

test('a user-initiated check only retries once', async () => {
  let calls = 0;
  const subject = store(async () => { calls += 1; throw new Error('offline'); });
  const status = await subject.refresh({ force: true });
  expect(calls).toBe(2);
  expect(status.attempts).toBe(2);
  expect(status.error).toBe('pricing-update-failed');
  expect(status.errorDetail).toBe('offline');
});

test('failure backoff grows to half an hour and a success resets it', async () => {
  const subject = store(async () => { throw new Error('offline'); });
  const first = await subject.refresh({ force: true });
  expect(first.nextCheckAt).toBe(NOW + 5 * 60000);
  const second = await subject.refresh({ force: true });
  expect(second.nextCheckAt).toBe(NOW + 15 * 60000);
  const third = await subject.refresh({ force: true });
  expect(third.nextCheckAt).toBe(NOW + 30 * 60000);
  const fourth = await subject.refresh({ force: true });
  expect(fourth.nextCheckAt).toBe(NOW + 30 * 60000);
  expect(fourth.consecutiveFailures).toBe(4);

  subject.fetch = async () => ok();
  const recovered = await subject.refresh({ force: true });
  expect(recovered.error).toBeNull();
  expect(recovered.errorDetail).toBeNull();
  expect(recovered.consecutiveFailures).toBe(0);
  expect(recovered.nextCheckAt).toBe(NOW + 3600000);
});

test('the automatic gate honours the failure backoff before trying again', async () => {
  let calls = 0;
  const subject = store(async () => { calls += 1; throw new Error('offline'); });
  await subject.refresh();
  expect(calls).toBe(4);
  const gated = await subject.refresh();
  expect(calls).toBe(4);
  expect(gated.attempts).toBe(4);
  // The unknown path keeps its shorter fifteen-minute interval.
  expect(subject.checkInterval(true)).toBe(15 * 60000);
});

test('408 and 429 are transient and are retried like a 5xx', async () => {
  for (const status of [408, 429]) {
    let calls = 0;
    const subject = store(async () => { calls += 1; return new Response('busy', { status }); });
    const result = await subject.refresh();
    expect(calls).toBe(4);
    expect(result.error).toBe('pricing-http-' + status);
    expect(result.errorDetail).toBe('HTTP ' + status);
  }
});

test('a 4xx other than 408/429 is final', async () => {
  for (const status of [400, 401, 403, 404, 410]) {
    let calls = 0;
    const subject = store(async () => { calls += 1; return new Response('nope', { status }); });
    const result = await subject.refresh();
    expect(calls).toBe(1);
    expect(result.error).toBe('pricing-http-' + status);
  }
});
