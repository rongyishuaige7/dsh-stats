// Runs in the maintainer workflow, never on a user's session corpus.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createPrivateKey, sign, verify, createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import pricing from '../src/pricing.cjs';
import trust from '../src/pricing-trust.cjs';

const OPENAI = 'https://developers.openai.com/api/docs/pricing.md';
const OPENROUTER = 'https://openrouter.ai/api/v1/models';
const DEEPSEEK = 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing';
const DEEPSEEK_BASELINE = JSON.parse(readFileSync(new URL('../data/pricing/deepseek-observation.json', import.meta.url), 'utf8'));
const RATE_FIELDS = ['uncached', 'cacheRead', 'cacheWrite', 'output'];
const sameRates = (a, b) => Boolean(a && b) && RATE_FIELDS.every(k => a[k] === b[k]);
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
  return value;
}
function dollar(value) { if (value === '-') return null; if (!/^\$\d+(?:\.\d+)?$/.test(value)) throw new Error('unrecognized price'); return Number(value.slice(1)); }
export function deepSeekObservation(html) {
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];
  if (!article || !/<table\b/i.test(article)) throw new Error('DeepSeek pricing page changed');
  const text = article.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim();
  const models = [...new Set(text.match(/deepseek-[a-z0-9.-]+/g) || [])].sort();
  if (!models.length || !text.includes('缓存') || !text.includes('高峰')) throw new Error('DeepSeek pricing page incomplete');
  return { sha256: createHash('sha256').update(text).digest('hex'), models };
}
export function parseOpenAI(markdown) {
  const section = markdown.split('### Standard pricing data')[1]?.split('### Batch pricing data')[0];
  if (!section) throw new Error('OpenAI pricing table changed');
  const rows = [];
  for (const line of section.split('\n')) {
    const cells = line.split('|').slice(1, -1).map(v => v.trim());
    if (cells.length !== 9 || !/^(gpt-|chatgpt-|o\d)/.test(cells[0])) continue;
    // Annotated names need explicit mapping, not heuristic removal of suffixes.
    if (!/^[a-z0-9][a-z0-9.-]+$/.test(cells[0])) continue;
    const values = cells.slice(1).map(dollar);
    rows.push({ model: cells[0], short: { uncached: values[0], cacheRead: values[1], cacheWrite: values[2], output: values[3] },
      long: values.slice(4).every(v => v === null) ? null : { uncached: values[4], cacheRead: values[5], cacheWrite: values[6], output: values[7] } });
  }
  if (rows.length < 3) throw new Error('OpenAI pricing table incomplete');
  return rows;
}
export function openRouterRule(model, at) {
  if (typeof model.id !== 'string' || model.architecture?.output_modalities?.join(',') !== 'text') return null;
  const p = model.pricing;
  if (!p || ['prompt', 'completion', 'input_cache_read', 'input_cache_write'].some(k => p[k] != null && p[k] !== '' && !/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(String(p[k])))) return null;
  const supported = new Set(['prompt', 'completion', 'input_cache_read', 'input_cache_write', 'internal_reasoning']);
  if (Object.entries(p).some(([key, value]) => !supported.has(key) && Number(value) !== 0)) return null;
  if (Number(p.internal_reasoning || 0) !== 0 || Object.values(model.per_request_limits || {}).some(v => v != null)) return null;
  const rate = key => p[key] === undefined || p[key] === null || p[key] === '' ? null : Number(p[key]) * 1e6;
  if (rate('prompt') === null || rate('completion') === null) return null;
  return { id: 'openrouter/' + model.id + '@' + at, family: 'openrouter', canonical: model.id, aliases: [model.id.toLowerCase()],
    currency: 'USD', sourceUrl: OPENROUTER, retrievedAt: at.slice(0, 10), observedFrom: at,
    rates: { uncached: rate('prompt'), output: rate('completion'), cacheRead: rate('input_cache_read'), cacheWrite: rate('input_cache_write') }, confidence: 'estimated', reasoningIncludedInOutput: true };
}
export function appendObservedRule(catalog, incoming, at) {
  const current = catalog.rules.filter(r => r.family === incoming.family && r.canonical === incoming.canonical
    && r.providerId === incoming.providerId && r.accountType === incoming.accountType && !r.effectiveTo).at(-1);
  const comparable = rule => JSON.stringify(stable([rule.rates, rule.contextTiers, rule.contextThreshold, rule.serviceTiers, rule.tierMultipliers]));
  if (current && comparable(current) === comparable(incoming)) return false;
  if (current && Date.parse(at) <= Date.parse(current.effectiveFrom || current.observedFrom || '1970-01-01T00:00:00Z')) throw new Error('observation-time-regressed');
  const next = { ...incoming, ...(current ? { effectiveFrom: at } : {}) };
  const rules = catalog.rules.map(r => r === current ? { ...r, effectiveTo: at } : r).concat(next);
  pricing.validateCatalog({ ...catalog, rules });
  catalog.rules = rules; return true;
}
async function get(url, json = false) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'error' });
  if (!response.ok) throw new Error('source-http-' + response.status);
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 12 * 1024 * 1024) throw new Error('source-too-large'); chunks.push(Buffer.from(value)); } }
  finally { await reader.cancel().catch(() => {}); }
  const text = Buffer.concat(chunks).toString('utf8'); return json ? JSON.parse(text) : text;
}
export async function collect({ fetchSource = get, at = new Date().toISOString(), baseCatalog = pricing.BUILTIN, deepSeekBaseline = DEEPSEEK_BASELINE } = {}) {
  const catalog = structuredClone(baseCatalog);
  const candidates = [], failures = []; let changes = 0;
  try {
    const rows = parseOpenAI(await fetchSource(OPENAI));
    for (const row of rows) {
      const existing = catalog.rules.find(r => r.family === 'openai' && r.canonical === row.model && !r.effectiveTo);
      if (existing) {
        const same = sameRates(existing.contextTiers?.short || existing.rates, row.short)
          && (row.long ? sameRates(existing.contextTiers?.long, row.long) : !existing.contextTiers);
        // Website changes are proposed for review, not activated automatically.
        if (!same) candidates.push({ source: OPENAI, model: row.model, reason: 'Review changed official rates and effective date', rates: row });
        continue;
      }
      candidates.push({ source: OPENAI, model: row.model, reason: 'Review model identity, service tiers, context threshold and effective date', rates: row });
    }
  } catch (error) { failures.push({ source: OPENAI, error: error.message }); }
  try {
    const observation = deepSeekObservation(await fetchSource(DEEPSEEK));
    if (observation.sha256 !== deepSeekBaseline.sha256) candidates.push({ source: DEEPSEEK, reason: 'Review changed official DeepSeek rates, aliases, calendar and effective date', observation });
    for (const model of observation.models) if (!catalog.rules.some(r => r.family === 'deepseek' && r.aliases.includes(model) && !r.effectiveTo)) candidates.push({ source: DEEPSEEK, model, reason: 'Missing active official model coverage' });
  } catch (error) { failures.push({ source: DEEPSEEK, error: error.message }); }
  try {
    const response = await fetchSource(OPENROUTER, true);
    if (!Array.isArray(response.data) || response.data.length < 10) throw new Error('model-list-incomplete');
    for (const model of response.data) {
      const rule = openRouterRule(model, at); if (!rule) continue;
      try {
        pricing.validateCatalog({ ...catalog, rules: [rule] });
        const current = catalog.rules.find(r => r.family === 'openrouter' && r.canonical === rule.canonical && !r.effectiveTo);
        // Large changes and zero-price transitions require human verification.
        if (current && RATE_FIELDS.some(k => current.rates?.[k] !== rule.rates[k] && (current.rates?.[k] === 0 || rule.rates[k] === 0 || rule.rates[k] / current.rates?.[k] > 3 || rule.rates[k] / current.rates?.[k] < 1 / 3))) {
          candidates.push({ source: OPENROUTER, model: rule.canonical, reason: 'Review unusually large price change', rule }); continue;
        }
        if (appendObservedRule(catalog, rule, at)) changes++;
      } catch { candidates.push({ source: OPENROUTER, model: model.id, reason: 'Unsupported or conflicting pricing schema' }); }
    }
  } catch (error) { failures.push({ source: OPENROUTER, error: error.message }); }
  if (changes) { catalog.version++; catalog.publishedAt = at; }
  pricing.validateCatalog(catalog);
  return { catalog, report: { checkedAt: at, changes, candidates, failures } };
}
async function main() {
  const publish = process.argv.includes('--publish');
  const { catalog, report } = await collect();
  mkdirSync('artifacts/pricing', { recursive: true });
  writeFileSync('artifacts/pricing/report.json', JSON.stringify(report, null, 2) + '\n');
  if (publish && report.changes && report.failures.length === 0) {
    const secret = process.env.PRICING_SIGNING_KEY;
    if (!secret) throw new Error('PRICING_SIGNING_KEY is required to publish');
    const payload = JSON.stringify(catalog, null, 2) + '\n';
    const signature = sign(null, Buffer.from(payload), createPrivateKey(secret)).toString('base64');
    if (!verify(null, Buffer.from(payload), trust.publicKey, Buffer.from(signature, 'base64'))) throw new Error('Signing key does not match pinned public key');
    writeFileSync('data/pricing/catalog.json', payload);
    writeFileSync('data/pricing/latest.json', JSON.stringify({ payload, signature }) + '\n');
  }
  console.log(JSON.stringify({ changes: report.changes, pendingReview: report.candidates.length, failures: report.failures }));
  if (report.failures.length) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
