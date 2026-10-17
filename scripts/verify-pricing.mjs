import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import pricing from '../src/pricing.cjs';
import { verifyEnvelope } from '../src/pricing-store.js';

// Object key ordering and JSON whitespace do not change catalog meaning.
function stableJson(value) {
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort()
    .map(key => JSON.stringify(key) + ':' + stableJson(value[key])).join(',') + '}';
  return JSON.stringify(value);
}

export function validateVersionTransition(catalog, previous) {
  const next = pricing.validateCatalog(catalog);
  if (!previous) return next;
  const base = pricing.validateCatalog(previous);
  if (next.version < base.version) throw new Error('pricing-version-regressed');
  if (next.version === base.version && stableJson(next) !== stableJson(base)) throw new Error('pricing-version-conflict');
  return next;
}

export function validatePricingData({ catalog, envelope, previous, publicKey }) {
  const validated = pricing.validateCatalog(catalog);
  const signed = verifyEnvelope(envelope, publicKey);
  if (stableJson(validated) !== stableJson(signed)) throw new Error('pricing-catalog-payload-mismatch');
  return validateVersionTransition(validated, previous);
}

export function readBaseCatalog(reference, root) {
  // GitHub uses an all-zero before SHA for the first push to a branch.
  if (!reference || /^0+$/.test(reference)) return null;
  // Resolve to a commit first; neither shell expansion nor Git option parsing
  // can interpret an untrusted PR reference as a command or path.
  const revision = execFileSync('git', ['rev-parse', '--verify', '--end-of-options', reference + '^{commit}'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const payload = execFileSync('git', ['show', revision + ':data/pricing/catalog.json'], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  return pricing.validateCatalog(JSON.parse(payload));
}

function main() {
  const { values } = parseArgs({ options: { 'base-ref': { type: 'string' } } });
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const read = name => JSON.parse(readFileSync(join(root, 'data/pricing', name), 'utf8'));
  const previous = readBaseCatalog(values['base-ref'] ?? process.env.PRICING_BASE_REF, root);
  const catalog = validatePricingData({ catalog: read('catalog.json'), envelope: read('latest.json'), previous });
  console.log(`Verified signed catalog ${catalog.version} (${catalog.rules.length} rules; ${previous ? 'version transition checked' : 'no base revision supplied'})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
