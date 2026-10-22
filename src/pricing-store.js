import { readFileSync, writeFileSync, mkdirSync, renameSync, readdirSync, statSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { verify, createHash, randomUUID } from 'node:crypto';
import pricing from './pricing.cjs';
import trust from './pricing-trust.cjs';
import limits from './pricing-validation.cjs';
import builtinEnvelope from '../data/pricing/latest.json' with { type: 'json' };

const HOUR = 3600000;
const { MAX_CATALOG_BYTES, MAX_OVERRIDES_BYTES, MAX_ENVELOPE_BYTES, MAX_CACHE_BYTES } = limits;
// A crash between creating the lock and writing its pid leaves an empty file.
// Reclaim malformed locks only after a generous idle window so a live writer is
// never stolen.
const LOCK_STALE_MS = 10 * 60 * 1000;
const stores = new WeakMap();
function read(file, limit = MAX_CACHE_BYTES) {
  if (statSync(file).size > limit) throw new Error('pricing-file-too-large');
  const bytes = readFileSync(file);
  if (bytes.byteLength > limit) throw new Error('pricing-file-too-large');
  return JSON.parse(bytes.toString('utf8'));
}
function atomic(file, value) {
  const temp = file + '.' + randomUUID() + '.tmp';
  writeFileSync(temp, JSON.stringify(value) + '\n', { mode: 0o600, flag: 'wx' });
  try { renameSync(temp, file); } finally { try { unlinkSync(temp); } catch {} }
}
export function verifyEnvelope(envelope, publicKey = trust.publicKey) {
  if (!envelope || typeof envelope.payload !== 'string' || Buffer.byteLength(envelope.payload) > MAX_CATALOG_BYTES || typeof envelope.signature !== 'string'
    || !verify(null, Buffer.from(envelope.payload), publicKey, Buffer.from(envelope.signature, 'base64'))) throw new Error('pricing-signature-invalid');
  return pricing.validateCatalog(JSON.parse(envelope.payload));
}
export class PricingStore {
  constructor(home, { fetchImpl = (...args) => fetch(...args), now = () => Date.now(), publicKey = trust.publicKey, url = trust.url } = {}) {
    this.dir = join(home, 'plugins', 'dsh-stats', 'pricing');
    this.fetch = fetchImpl; this.now = now; this.publicKey = publicKey; this.url = url;
    this.catalog = pricing.BUILTIN; this.envelope = publicKey === trust.publicKey ? builtinEnvelope : null; this.error = null; this.lastSuccessAt = null; this.lastCheckAt = null;
    this.inflight = null; 
    this.history = [];
    this.historyStamp = null;
    this.settings = { revision: 0, autoUpdate: true, pinnedVersion: null, overrides: [] };
    try { this.settings = this.validateSettings(read(join(this.dir, 'settings.json'), MAX_OVERRIDES_BYTES + 1024)); }
    catch (error) { if (error.code !== 'ENOENT') { this.error = 'pricing-settings-invalid'; this.settingsInvalid = true; } }
    try {
      const cached = this.settings.pinnedVersion === null ? read(join(this.dir, 'current.json'))
        : { envelope: read(join(this.dir, 'catalog-' + this.settings.pinnedVersion + '.json'), MAX_ENVELOPE_BYTES) };
      const catalog = verifyEnvelope(cached.envelope, publicKey);
      if (this.settings.pinnedVersion !== null && catalog.version !== this.settings.pinnedVersion) throw new Error('pricing-cache-invalid');
      if (catalog.version >= this.catalog.version || this.settings.pinnedVersion === catalog.version) {
        this.catalog = catalog; this.envelope = cached.envelope;
        this.lastSuccessAt = Number.isFinite(cached.lastSuccessAt) ? cached.lastSuccessAt : null;
      }
    } catch (error) { if (error.code !== 'ENOENT' || this.settings.pinnedVersion !== null) this.error = 'pricing-cache-invalid'; }
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
    // status() is called on every price-panel open/refresh; serialize the
    // catalog and overrides once per rebuild instead of on every read.
    this.catalogJson = JSON.stringify(this.catalog);
    this.overridesJson = JSON.stringify(this.settings.overrides);
  }
  syncDisk() {
    const stamp = name => { try { const st = statSync(join(this.dir, name)); return st.mtimeMs + ':' + st.size + ':' + st.ino; } catch { return ''; } };
    const stampKey = stamp('settings.json') + '/' + stamp('current.json');
    if (stampKey === this.diskStamp) return;
    try {
      let settings = this.settings;
      try { settings = this.validateSettings(read(join(this.dir, 'settings.json'), MAX_OVERRIDES_BYTES + 1024)); }
      catch (error) { if (error.code !== 'ENOENT') { this.settingsInvalid = true; throw new Error('pricing-settings-invalid'); } }
      this.settings = settings; this.settingsInvalid = false;
      let cached;
      try { cached = settings.pinnedVersion === null ? read(join(this.dir, 'current.json'))
        : { envelope: read(join(this.dir, 'catalog-' + settings.pinnedVersion + '.json'), MAX_ENVELOPE_BYTES) }; }
      catch (error) { if (error.code !== 'ENOENT' || settings.pinnedVersion !== null) throw new Error('pricing-cache-invalid'); }
      const catalog = cached ? verifyEnvelope(cached.envelope, this.publicKey) : this.catalog;
      if (settings.pinnedVersion === catalog.version || settings.pinnedVersion === null && catalog.version >= pricing.BUILTIN.version) {
        this.catalog = catalog; if (cached) this.envelope = cached.envelope;
        if (Number.isFinite(cached?.lastSuccessAt)) this.lastSuccessAt = cached.lastSuccessAt;
      }
      this.rebuild(); this.diskStamp = stampKey;
    } catch (error) { this.error = /^pricing-[a-z0-9-]+$/.test(error.message) ? error.message : 'pricing-cache-invalid'; }
  }
  withLock(fn) {
    mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    const lock = join(this.dir, 'settings.lock');
    let fd;
    try { fd = openSync(lock, 'wx', 0o600); }
    catch (error) {
      if (error.code !== 'EEXIST') throw new Error('pricing-settings-busy');
      // Recover locks whose owning process is known to have exited, plus
      // malformed/empty locks left by a crash between open and write.
      let dead = false;
      let ownerKnown = false;
      try {
        const owner = read(lock, 1024);
        if (Number.isSafeInteger(owner.pid) && owner.pid > 0) {
          ownerKnown = true;
          try { process.kill(owner.pid, 0); } catch (err) { dead = err.code === 'ESRCH'; }
        }
      } catch {}
      if (!dead && !ownerKnown) {
        try { dead = Date.now() - statSync(lock).mtimeMs > LOCK_STALE_MS; } catch {}
      }
      if (!dead) throw new Error('pricing-settings-busy');
      try { unlinkSync(lock); fd = openSync(lock, 'wx', 0o600); } catch { throw new Error('pricing-settings-busy'); }
    }
    try { writeFileSync(fd, JSON.stringify({ pid: process.pid })); this.syncDisk(); return fn(); }
    finally { closeSync(fd); unlinkSync(lock); }
  }
  close() { this.closed = true; this.controller?.abort(); }
  snapshot() { this.syncDisk(); return this.engine; }
  status() {
    this.syncDisk();
    let history = this.history || [];
    try {
      const dirStat = statSync(this.dir);
      const stamp = dirStat.mtimeMs + ':' + dirStat.ino;
      if (stamp !== this.historyStamp) {
        history = readdirSync(this.dir).filter(name => /^catalog-\d+\.json$/.test(name)).map(name => Number(name.slice(8, -5))).sort((a, b) => b - a);
        this.history = history;
        this.historyStamp = stamp;
      }
    } catch {
      this.history = [];
      this.historyStamp = null;
      history = [];
    }
    return { version: this.catalog.version, publishedAt: this.catalog.publishedAt, fingerprint: this.fingerprint,
      lastCheckAt: this.lastCheckAt, lastSuccessAt: this.lastSuccessAt, error: this.error,
      revision: this.settings.revision, autoUpdate: this.settings.autoUpdate, pinnedVersion: this.settings.pinnedVersion,
      catalogJson: this.catalogJson, overridesJson: this.overridesJson, history };
  }
  async refresh({ force = false, unknown = false } = {}) {
    if (this.closed) return this.status();
    if (this.inflight) return this.inflight;
    this.syncDisk();
    const now = this.now();
    if (!force && (!this.settings.autoUpdate || this.settings.pinnedVersion !== null || this.settingsInvalid)) return this.status();
    if (!force && this.lastCheckAt !== null && now - this.lastCheckAt < (unknown ? 15 * 60000 : HOUR)) return this.status();
    this.lastCheckAt = now;
    this.inflight = this.download({ force, revision: this.settings.revision }).finally(() => { this.inflight = null; });
    return this.inflight;
  }
  async download({ force, revision }) {
    const controller = new AbortController(); this.controller = controller;
    const timer = setTimeout(() => controller.abort(), 12000); timer.unref?.();
    try {
      const response = await this.fetch(this.url, { signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('pricing-http-' + response.status);
      if (Number(response.headers.get('content-length')) > MAX_ENVELOPE_BYTES) { await response.body?.cancel(); throw new Error('pricing-response-too-large'); }
      const reader = response.body.getReader(); let length = 0; const chunks = [];
      try {
        for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > MAX_ENVELOPE_BYTES) throw new Error('pricing-response-too-large'); chunks.push(Buffer.from(value)); }
      } finally { await reader.cancel().catch(() => {}); }
      const envelope = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const catalog = verifyEnvelope(envelope, this.publicKey);
      if (Date.parse(catalog.publishedAt) > this.now() + 5 * 60000) throw new Error('pricing-future-version');
      if (this.closed) return this.status();
      this.withLock(() => {
        if (this.settingsInvalid) throw new Error('pricing-settings-invalid');
        const highest = Math.max(pricing.BUILTIN.version, this.catalog.version, ...this.status().history);
        if (catalog.version < highest) throw new Error('pricing-version-regressed');
        let previous;
        try { previous = verifyEnvelope(read(join(this.dir, 'catalog-' + catalog.version + '.json'), MAX_ENVELOPE_BYTES), this.publicKey); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        if ((previous && JSON.stringify(catalog) !== JSON.stringify(previous))
          || catalog.version === this.catalog.version && JSON.stringify(catalog) !== JSON.stringify(this.catalog)) throw new Error('pricing-version-conflict');
        if (this.envelope) atomic(join(this.dir, 'catalog-' + this.catalog.version + '.json'), this.envelope);
        atomic(join(this.dir, 'catalog-' + catalog.version + '.json'), envelope);
        // A restore always wins over a download that was already in flight.
        if (this.settings.pinnedVersion !== null || !force && (!this.settings.autoUpdate || revision !== this.settings.revision)) return;
        const lastSuccessAt = this.now();
        atomic(join(this.dir, 'current.json'), { envelope, lastSuccessAt });
        this.lastSuccessAt = lastSuccessAt;
        this.envelope = envelope; this.catalog = catalog; this.error = null; this.rebuild();
      });
    } catch (error) {
      if (!this.closed) this.error = /^pricing-[a-z0-9-]+$/.test(error.message) ? error.message : controller.signal.aborted ? 'pricing-timeout' : 'pricing-update-failed';
    } finally { clearTimeout(timer); this.controller = null; }
    return this.status();
  }
  preview(overrides) { return pricing.createPricing(this.catalog, pricing.validateOverrides(overrides)); }
  persistSettings(settings) {
    atomic(join(this.dir, 'settings-' + this.settings.revision + '.json'), this.settings);
    atomic(join(this.dir, 'settings-' + settings.revision + '.json'), settings);
    atomic(join(this.dir, 'settings.json'), settings);
    this.settings = settings;
  }
  save({ revision, autoUpdate, overrides, fingerprint }) {
    return this.withLock(() => {
      if (this.settingsInvalid) throw new Error('pricing-settings-invalid');
      if (fingerprint !== undefined && fingerprint !== this.fingerprint) throw new Error('pricing-settings-conflict');
      if (revision !== this.settings.revision) throw new Error('pricing-settings-conflict');
      const settings = this.validateSettings({ revision: revision + 1, autoUpdate, pinnedVersion: autoUpdate ? null : this.settings.pinnedVersion, overrides });
      this.persistSettings(settings); this.rebuild();
      return this.status();
    });
  }
  rollback(version, revision) {
    return this.withLock(() => {
      if (this.settingsInvalid) throw new Error('pricing-settings-invalid');
      if (revision !== this.settings.revision) throw new Error('pricing-settings-conflict');
      if (!Number.isSafeInteger(version) || version <= 0) throw new Error('pricing-version-invalid');
      let envelope;
      try { envelope = read(join(this.dir, 'catalog-' + version + '.json'), MAX_ENVELOPE_BYTES); } catch { throw new Error('pricing-version-invalid'); }
      const catalog = verifyEnvelope(envelope, this.publicKey);
      if (catalog.version !== version) throw new Error('pricing-version-invalid');
      // The settings file is the single commit point; startup follows its pin.
      this.persistSettings({ ...this.settings, revision: revision + 1, autoUpdate: false, pinnedVersion: version });
      this.envelope = envelope; this.catalog = catalog; this.rebuild(); return this.status();
    });
  }
}
export function pricingStore(owner, home) {
  let store = stores.get(owner);
  if (!store || store.home !== home || store.closed) { store = new PricingStore(home); store.home = home; stores.set(owner, store); }
  return store;
}
