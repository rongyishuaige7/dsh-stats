import { generateKeyPairSync, sign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pricing from '../src/pricing.cjs';
import { validatePricingData, validateVersionTransition, readBaseCatalog } from '../scripts/verify-pricing.mjs';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const base = () => structuredClone(pricing.BUILTIN);
const envelopeFor = catalog => {
  const payload = JSON.stringify(catalog);
  return { payload, signature: sign(null, Buffer.from(payload), privateKey).toString('base64') };
};
const check = (catalog, previous, envelope = envelopeFor(catalog)) => validatePricingData({ catalog, envelope, previous, publicKey });

test('delivery validates the real bundled signature and payload', () => {
  const envelope = JSON.parse(readFileSync(new URL('../data/pricing/latest.json', import.meta.url), 'utf8'));
  expect(validatePricingData({ catalog: pricing.BUILTIN, envelope }).version).toBe(pricing.BUILTIN.version);
});

test('delivery rejects validly signed but divergent catalogs and invalid signatures', () => {
  const catalog = base(), envelope = envelopeFor(catalog);
  catalog.rules[0].note = 'reviewed change';
  expect(() => check(catalog, null, envelope)).toThrow('pricing-catalog-payload-mismatch');
  const tampered = { ...envelope, payload: JSON.stringify(catalog) };
  expect(() => check(catalog, null, tampered)).toThrow('pricing-signature-invalid');
  const wrongKey = generateKeyPairSync('ed25519').publicKey;
  expect(() => validatePricingData({ catalog, envelope: envelopeFor(catalog), publicKey: wrongKey })).toThrow('pricing-signature-invalid');
  expect(() => check(catalog, null, {})).toThrow('pricing-signature-invalid');
});

test('changed rules, metadata or FX require an increased version', () => {
  for (const edit of [c => { c.rules[0].note = 'changed'; }, c => { c.publishedAt = '2026-10-17T12:00:00Z'; }, c => { c.fx[0].usdCny += 0.01; }]) {
    const previous = base(), catalog = base(); edit(catalog);
    expect(() => check(catalog, previous)).toThrow('pricing-version-conflict');
    catalog.version++;
    expect(check(catalog, previous).version).toBe(previous.version + 1);
  }
});

test('delivery rejects regressions and invalid schema but tolerates formatting differences', () => {
  const previous = base(), catalog = base();
  catalog.version--;
  expect(() => check(catalog, previous)).toThrow('pricing-version-regressed');
  expect(() => check({ ...previous, schemaVersion: 99 })).toThrow();
  const reordered = Object.fromEntries(Object.entries(previous).reverse());
  expect(check(reordered, previous, envelopeFor(previous)).version).toBe(previous.version);
  expect(validateVersionTransition(previous, null).version).toBe(previous.version);
});

test('base revision reader compares committed catalogs and fails closed on invalid refs', () => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-stats-pricing-gate-'));
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    git(['init', '--quiet']);
    mkdirSync(join(root, 'data/pricing'), { recursive: true });
    const previous = base();
    writeFileSync(join(root, 'data/pricing/catalog.json'), JSON.stringify(previous));
    git(['add', 'data/pricing/catalog.json']);
    git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'fixture']);
    expect(readBaseCatalog('HEAD', root)).toEqual(previous);
    expect(readBaseCatalog('0'.repeat(40), root)).toBeNull();
    expect(readBaseCatalog('', root)).toBeNull();
    expect(() => readBaseCatalog('--help', root)).toThrow();
    expect(() => readBaseCatalog('missing-revision', root)).toThrow();
  } finally { rmSync(root, { recursive: true, force: true }); }
});
