import { readFileSync, writeFileSync, mkdirSync, renameSync, readdirSync, statSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { verify, createHash, randomUUID } from 'node:crypto';
import pricing from './pricing.cjs';
import trust from './pricing-trust.cjs';
import builtinEnvelope from '../data/pricing/latest.json' with { type: 'json' };

const HOUR = 3600000, MAX_BYTES = 4 * 1024 * 1024;
const stores = new WeakMap();
function read(file) {
  if (statSync(file).size > MAX_BYTES) throw new Error('pricing-file-too-large');
  return JSON.parse(readFileSync(file, 'utf8'));
}
function atomic(file, value) {
  const temp = file + '.' + randomUUID() + '.tmp';
  writeFileSync(temp, JSON.stringify(value) + '\n', { mode: 0o600, flag: 'wx' });
  renameSync(temp, file);
}
export function verifyEnvelope(envelope, publicKey = trust.publicKey) {
  if (!envelope || typeof envelope.payload !== 'string' || Buffer.byteLength(envelope.payload) > MAX_BYTES || typeof envelope.signature !== 'string'
    || !verify(null, Buffer.from(envelope.payload), publicKey, Buffer.from(envelope.signature, 'base64'))) throw new Error('pricing-signature-invalid');
  return pricing.validateCatalog(JSON.parse(envelope.payload));
}
export class PricingStore {
  constructor(home, { fetchImpl = (...args) => fetch(...args), now = () => Date.now(), publicKey = trust.publicKey, url = trust.url } = {}) {
    this.dir = join(home, 'plugins', 'dsh-stats', 'pricing');
    this.fetch = fetchImpl; this.now = now; this.publicKey = publicKey; this.url = url;
    this.catalog = pricing.BUILTIN; this.envelope = publicKey === trust.publicKey ? builtinEnvelope : null; this.error = null; this.lastSuccessAt = null; this.lastCheckAt = null;
    this.inflight = null; 
    this.settings = { revision: 0, autoUpdate: true, pinnedVersion: null, overrides: [] };
    try { this.settings = this.validateSettings(read(join(this.dir, 'settings.json'))); }
    catch (error) { if (error.code !== 'ENOENT') { this.error = 'pricing-settings-invalid'; this.settingsInvalid = true; } }
    try {
      const cached = read(join(this.dir, 'current.json'));
      const catalog = verifyEnvelope(cached.envelope, publicKey);
      if (catalog.version >= this.catalog.version || this.settings.pinnedVersion === catalog.version) {
        this.catalog = catalog; this.envelope = cached.envelope;
        this.lastSuccessAt = Number.isFinite(cached.lastSuccessAt) ? cached.lastSuccessAt : null;
      }
    } catch (error) { if (error.code !== 'ENOENT') this.error = 'pricing-cache-invalid'; }
    this.rebuild();
  }
  validateSettings(value) {
    if (!value || !Number.isSafeInteger(value.revision) || value.revision < 0 || typeof value.autoUpdate !== 'boolean'
      || value.pinnedVersion !== null && (!Number.isSafeInteger(value.pinnedVersion) || value.pinnedVersion <= 0)) throw new Error('pricing-settings-invalid');
    return { revision: value.revision, autoUpdate: value.autoUpdate, pinnedVersion: value.pinnedVersion, overrides: pricing.validateOverrides(value.overrides) };
  }
  rebuild() {
    this.engine = pricing.createPricing(this.catalog, this.settings.overrides);
    this.fingerprint = createHash('sha256').update(JSON.stringify([this.catalog, this.settings.overrides])).digest('hex');
  }
  snapshot() { return this.engine; }
  status() {
    let history = [];
    try { history = readdirSync(this.dir).filter(name => /^catalog-\d+\.json$/.test(name)).map(name => Number(name.slice(8, -5))).sort((a, b) => b - a); } catch {}
    return { version: this.catalog.version, publishedAt: this.catalog.publishedAt, fingerprint: this.fingerprint,
      lastCheckAt: this.lastCheckAt, lastSuccessAt: this.lastSuccessAt, error: this.error,
      revision: this.settings.revision, autoUpdate: this.settings.autoUpdate, pinnedVersion: this.settings.pinnedVersion,
      catalogJson: JSON.stringify(this.catalog), overridesJson: JSON.stringify(this.settings.overrides), history };
  }
  async refresh({ force = false, unknown = false } = {}) {
    if (this.inflight) return this.inflight;
    const now = this.now();
    if (!force && (!this.settings.autoUpdate || this.settings.pinnedVersion !== null || this.settingsInvalid)) return this.status();
    if (!force && this.lastCheckAt !== null && now - this.lastCheckAt < (unknown ? 15 * 60000 : HOUR)) return this.status();
    this.lastCheckAt = now;
    this.inflight = this.download().finally(() => { this.inflight = null; });
    return this.inflight;
  }
  async download() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000); timer.unref?.();
    try {
      const response = await this.fetch(this.url, { signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('pricing-http-' + response.status);
      if (Number(response.headers.get('content-length')) > MAX_BYTES) { await response.body?.cancel(); throw new Error('pricing-response-too-large'); }
      const reader = response.body.getReader(); let length = 0; const chunks = [];
      try {
        for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > MAX_BYTES) throw new Error('pricing-response-too-large'); chunks.push(Buffer.from(value)); }
      } finally { await reader.cancel().catch(() => {}); }
      const envelope = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const catalog = verifyEnvelope(envelope, this.publicKey);
      if (Date.parse(catalog.publishedAt) > this.now() + 5 * 60000) throw new Error('pricing-future-version');
      const highest = Math.max(pricing.BUILTIN.version, this.catalog.version, ...this.status().history);
      if (catalog.version < highest) throw new Error('pricing-version-regressed');
      if (catalog.version === this.catalog.version && JSON.stringify(catalog) !== JSON.stringify(this.catalog)) throw new Error('pricing-version-conflict');
      mkdirSync(this.dir, { recursive: true, mode: 0o700 });
      if (this.envelope) atomic(join(this.dir, 'catalog-' + this.catalog.version + '.json'), this.envelope);
      atomic(join(this.dir, 'catalog-' + catalog.version + '.json'), envelope);
      this.lastSuccessAt = this.now();
      atomic(join(this.dir, 'current.json'), { envelope, lastSuccessAt: this.lastSuccessAt });
      this.envelope = envelope; this.catalog = catalog; this.error = null; this.rebuild();
    } catch (error) {
      this.error = /^pricing-[a-z0-9-]+$/.test(error.message) ? error.message : controller.signal.aborted ? 'pricing-timeout' : 'pricing-update-failed';
    } finally { clearTimeout(timer); }
    return this.status();
  }
  preview(overrides) { return pricing.createPricing(this.catalog, pricing.validateOverrides(overrides)); }
  save({ revision, autoUpdate, overrides }) {
    if (this.settingsInvalid) throw new Error('pricing-settings-invalid');
    mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    const lock = join(this.dir, 'settings.lock');
    let fd;
    try { fd = openSync(lock, 'wx', 0o600); } catch { throw new Error('pricing-settings-busy'); }
    try {
    // Re-read the disk revision to catch a second browser or host process.
    let disk = this.settings;
    try { disk = this.validateSettings(read(join(this.dir, 'settings.json'))); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (revision !== disk.revision || revision !== this.settings.revision) throw new Error('pricing-settings-conflict');
    const settings = this.validateSettings({ revision: revision + 1, autoUpdate, pinnedVersion: autoUpdate ? null : this.settings.pinnedVersion, overrides });
    mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    atomic(join(this.dir, 'settings.json'), settings); this.settings = settings; this.rebuild();
    return this.status();
    } finally { closeSync(fd); unlinkSync(lock); }
  }
  rollback(version, revision) {
    if (revision !== this.settings.revision) throw new Error('pricing-settings-conflict');
    if (!Number.isSafeInteger(version) || version <= 0) throw new Error('pricing-version-invalid');
    const envelope = read(join(this.dir, 'catalog-' + version + '.json'));
    const catalog = verifyEnvelope(envelope, this.publicKey);
    if (catalog.version !== version) throw new Error('pricing-version-invalid');
    this.save({ revision, autoUpdate: false, overrides: this.settings.overrides });
    this.settings = { ...this.settings, pinnedVersion: version };
    atomic(join(this.dir, 'settings.json'), this.settings);
    atomic(join(this.dir, 'current.json'), { envelope, lastSuccessAt: this.lastSuccessAt });
    this.envelope = envelope; this.catalog = catalog; this.rebuild(); return this.status();
  }
}
export function pricingStore(owner, home) {
  let store = stores.get(owner);
  if (!store || store.home !== home) { store = new PricingStore(home); store.home = home; stores.set(owner, store); }
  return store;
}
