// Runs in the maintainer workflow, never on a user's session corpus.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createPrivateKey, sign, verify, createHash } from 'node:crypto';
import { validatePricingData } from './verify-pricing.mjs';
import { pathToFileURL } from 'node:url';
import pricing from '../src/pricing.cjs';
import trust from '../src/pricing-trust.cjs';

const OPENAI = 'https://developers.openai.com/api/docs/pricing.md';
const ANTHROPIC = 'https://platform.claude.com/docs/en/about-claude/pricing.md';
const GOOGLE = 'https://ai.google.dev/gemini-api/docs/pricing?hl=en';
const GOOGLE_SOURCE = 'https://ai.google.dev/gemini-api/docs/pricing';
const OPENROUTER = 'https://openrouter.ai/api/v1/models';
// Meta Llama models are priced by their hosting providers; the OpenRouter
// adapter covers those routes. There is no first-party Meta token price page.
// Canonical form: the slashless URL now 302-redirects and get() rejects redirects.
const DEEPSEEK = 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/';
const DEEPSEEK_BASELINE = JSON.parse(readFileSync(new URL('../data/pricing/deepseek-observation.json', import.meta.url), 'utf8'));
const RATE_FIELDS = ['uncached', 'cacheRead', 'cacheWrite', 'output'];
const sameRates = (a, b) => Boolean(a && b) && RATE_FIELDS.every(k => a[k] === b[k]);
const activeRule = (catalog, family, model, at) => catalog.rules.find(r => r.family === family && r.canonical === model
  && (!r.effectiveFrom || Date.parse(r.effectiveFrom) <= Date.parse(at))
  && (!r.effectiveTo || Date.parse(r.effectiveTo) > Date.parse(at)));
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
function stripHtml(value) {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
function priceFromCell(value) {
  const match = /\$\s*(\d+(?:\.\d+)?)/.exec(stripHtml(value));
  return match ? Number(match[1]) : null;
}
function provisionalRule({ family, model, sourceUrl, at, rates, contextTiers, contextThreshold, note }) {
  const base = {
    id: family + '/' + model + '@' + at.slice(0, 10), family, canonical: model,
    aliases: [model, family + '/' + model], currency: 'USD', sourceUrl,
    retrievedAt: at.slice(0, 10), observedFrom: at, confidence: 'estimated',
    reasoningIncludedInOutput: true,
    note: (note || 'Official model auto-added; pending review.').replace(/^/, '[provisional] ')
  };
  return contextTiers ? { ...base, contextTiers, contextThreshold } : { ...base, rates };
}
function knownModel(catalog, family, model) {
  return catalog.rules.some(r => r.family === family && (r.canonical === model || r.aliases.includes(model)));
}
function appendProvisional(catalog, rule) {
  if (knownModel(catalog, rule.family, rule.canonical)) return false;
  try { pricing.validateCatalog({ ...catalog, rules: [...catalog.rules, rule] }); }
  catch { return false; }
  catalog.rules.push(rule);
  return true;
}
function isTextModel(model) {
  return !/(?:image|tts|live|transcribe|robotics|embedding|veo|imagen|lyria|nano-banana|native-audio)/i.test(model);
}
function modelSlug(value) {
  return stripHtml(value)
    .replace(/\([^)]*\)/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
// Anthropic's pricing.md keeps the model table in a stable markdown table.
// This adapter only produces review candidates; it never appends catalog rules.
export function parseAnthropic(markdown) {
  const section = String(markdown).split('## Model pricing')[1]?.split(/\n## /)[0];
  if (!section) throw new Error('Anthropic pricing table changed');
  const rows = [];
  for (const raw of section.split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(stripHtml);
    if (cells.length !== 6 || !/^\$/.test(cells[1])) continue;
    const display = stripHtml(cells[0]).replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\s*\([^)]*\)\s*$/, '').trim();
    const restricted = /retired|limited availability/i.test(cells[0]);
    const model = modelSlug(display);
    if (!model || rows.some(row => row.model === model)) continue;
    const rates = {
      uncached: priceFromCell(cells[1]),
      cacheWrite: priceFromCell(cells[2]),
      cacheRead: priceFromCell(cells[4]),
      output: priceFromCell(cells[5])
    };
    if (rates.uncached == null || rates.output == null) continue;
    rows.push({ model, display, rates, cacheWrite1h: priceFromCell(cells[3]), ...(restricted ? { restricted: true } : {}) });
  }
  if (!rows.length) throw new Error('Anthropic pricing table incomplete');
  return rows;
}
// Google has no markdown pricing endpoint; parse the stable devsite pricing
// tables. Only the Standard table is used for monitoring. The paid-tier cell
// can contain the current price followed by a scheduled future price; the
// first dollar amount is the currently effective one.
export function parseGoogle(html) {
  const source = String(html);
  const headings = [...source.matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi)]
    .map(match => ({ attrs: match[1], display: stripHtml(match[2]), index: match.index, end: match.index + match[0].length }))
    .filter(item => /\bid="gemini-[a-z0-9.-]+"/i.test(item.attrs));
  if (!headings.length) throw new Error('Google pricing page changed');
  const rows = [];
  for (let i = 0; i < headings.length; i++) {
    const id = /\bid="(gemini-[a-z0-9.-]+)"/i.exec(headings[i].attrs)?.[1]?.toLowerCase();
    if (!id) continue;
    const section = source.slice(headings[i].end, headings[i + 1]?.index ?? source.length);
    const table = /<table\b[^>]*class="pricing-table"[^>]*>([\s\S]*?)<\/table>/i.exec(section);
    if (!table) continue;
    const values = {};
    for (const tr of table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match => stripHtml(match[1]));
      if (cells.length < 3) continue;
      const label = cells[0].toLowerCase();
      if (label.startsWith('input price')) values.uncached = priceFromCell(cells[2]);
      else if (label.startsWith('output price')) values.output = priceFromCell(cells[2]);
      else if (label.startsWith('context caching price')) values.cacheRead = priceFromCell(cells[2]);
    }
    if (values.uncached == null || values.output == null) continue;
    rows.push({ model: id, display: headings[i].display, rates: { uncached: values.uncached, cacheWrite: values.uncached, cacheRead: values.cacheRead ?? null, output: values.output } });
  }
  if (!rows.length) throw new Error('Google pricing table incomplete');
  return rows;
}

// The Standard section holds two tables with different shapes: an 11-column
// table for current models (short/long context, 30m and 12h cache writes) and a
// 4-column table for older ones. Columns are matched by header name, never by
// position: the page already moved output to the second column and split cache
// writes in two, so a positional mapping would file every price under the wrong
// rate. The 12h write is not modelled by the catalog; 30m stays the cacheWrite.
const OPENAI_COLUMNS = new Map([
  ['short context input', 'short.uncached'],
  ['short context output', 'short.output'],
  ['short context cached input', 'short.cacheRead'],
  ['short context 30m write', 'short.cacheWrite'],
  ['long context input', 'long.uncached'],
  ['long context output', 'long.output'],
  ['long context cached input', 'long.cacheRead'],
  ['long context 30m write', 'long.cacheWrite'],
  ['input', 'short.uncached'],
  ['output', 'short.output'],
  ['cached input', 'short.cacheRead']
]);
const headerKey = value => stripHtml(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function parseOpenAI(markdown) {
  const section = markdown.split('### Standard pricing data')[1]?.split('### Batch pricing data')[0];
  if (!section) throw new Error('OpenAI pricing table changed');
  const rows = []; let columns = null;
  for (const line of section.split('\n')) {
    const cells = line.split('|').slice(1, -1).map(v => v.trim());
    if (!cells.length) continue;
    if (cells.every(cell => /^:?-{3,}:?$/.test(cell))) continue;
    if (headerKey(cells[0]) === 'model') {
      columns = cells.map(cell => OPENAI_COLUMNS.get(headerKey(cell)) ?? null);
      if (!columns.includes('short.uncached') || !columns.includes('short.output')) throw new Error('OpenAI pricing table changed');
      continue;
    }
    if (!columns || cells.length !== columns.length || !/^(gpt-|chatgpt-|o\d)/.test(cells[0])) continue;
    // Annotated names need explicit mapping, not heuristic removal of suffixes:
    // only the long-context threshold annotation is understood; others are skipped.
    const name = /^([a-z0-9][a-z0-9.-]+)(?: \(<(\d+)K context length\))?$/.exec(cells[0]);
    if (!name) continue;
    const value = key => { const index = columns.indexOf(key); return index === -1 ? null : dollar(cells[index]); };
    const short = { uncached: value('short.uncached'), cacheRead: value('short.cacheRead'), cacheWrite: value('short.cacheWrite'), output: value('short.output') };
    const long = { uncached: value('long.uncached'), cacheRead: value('long.cacheRead'), cacheWrite: value('long.cacheWrite'), output: value('long.output') };
    rows.push({ model: name[1], ...(name[2] ? { threshold: Number(name[2]) * 1000 } : {}), short,
      long: Object.values(long).every(rate => rate === null) ? null : long });
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
async function get(url, json = false, { allowSameOriginRedirect = false } = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: allowSameOriginRedirect ? 'follow' : 'error' });
  if (allowSameOriginRedirect && new URL(response.url).origin !== new URL(url).origin) throw new Error('source-redirect');
  if (!response.ok) throw new Error('source-http-' + response.status);
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 12 * 1024 * 1024) throw new Error('source-too-large'); chunks.push(Buffer.from(value)); } }
  finally { await reader.cancel().catch(() => {}); }
  const text = Buffer.concat(chunks).toString('utf8'); return json ? JSON.parse(text) : text;
}
export async function collect({ fetchSource = get, at = new Date().toISOString(), baseCatalog = pricing.BUILTIN, deepSeekBaseline = DEEPSEEK_BASELINE } = {}) {
  const catalog = structuredClone(baseCatalog);
  const candidates = [], autoPublished = [], failures = []; let changes = 0;
  try {
    const rows = parseOpenAI(await fetchSource(OPENAI));
    for (const row of rows) {
      const existing = catalog.rules.find(r => r.family === 'openai' && r.canonical === row.model && !r.effectiveTo);
      if (existing) {
        // The catalog estimates unpublished cache writes at the input price (cacheWritePriceUnknown).
        const matches = (rates, parsed) => sameRates(rates, parsed && existing.cacheWritePriceUnknown && parsed.cacheWrite === null ? { ...parsed, cacheWrite: parsed.uncached } : parsed);
        const same = matches(existing.contextTiers?.short || existing.rates, row.short)
          && (row.long ? matches(existing.contextTiers?.long, row.long) && (!row.threshold || row.threshold === existing.contextThreshold) : !existing.contextTiers);
        // Website changes are proposed for review, not activated automatically.
        if (!same) candidates.push({ source: OPENAI, model: row.model, reason: 'Review changed official rates and effective date', rates: row });
        continue;
      }
      if (knownModel(catalog, 'openai', row.model)) {
        candidates.push({ source: OPENAI, model: row.model, reason: 'Review historical model identity', rates: row });
        continue;
      }
      if (row.long && !row.threshold) {
        candidates.push({ source: OPENAI, model: row.model, reason: 'Review long-context threshold before auto-publishing', rates: row });
        continue;
      }
      const rule = provisionalRule({ family: 'openai', model: row.model, sourceUrl: OPENAI, at,
        ...(row.long ? { contextTiers: { short: row.short, long: row.long }, contextThreshold: row.threshold } : { rates: row.short }),
        note: row.long ? 'Auto-added from the Standard table; Fast, Batch, Flex and Ultrafast tiers are pending review.' : 'Auto-added from the Standard table; service tiers are pending review.' });
      if (appendProvisional(catalog, rule)) { autoPublished.push(rule); changes++; }
      else candidates.push({ source: OPENAI, model: row.model, reason: 'Review model identity or conflicting aliases', rates: row });
    }
  } catch (error) { failures.push({ source: OPENAI, error: error.message }); }
  try {
    const rows = parseAnthropic(await fetchSource(ANTHROPIC));
    for (const row of rows) {
      const existing = activeRule(catalog, 'anthropic', row.model, at);
      const rule = { id: 'anthropic/' + row.model + '@' + at.slice(0, 10), family: 'anthropic', canonical: row.model,
        aliases: [row.model, 'anthropic/' + row.model], currency: 'USD', sourceUrl: ANTHROPIC, retrievedAt: at.slice(0, 10),
        observedFrom: at, rates: row.rates, confidence: 'exact', reasoningIncludedInOutput: true };
      if (!existing) {
        const candidate = { source: ANTHROPIC, model: row.model, displayName: row.display, reason: 'Missing official model coverage', rule, ...(row.cacheWrite1h == null ? {} : { cacheWrite1h: row.cacheWrite1h }) };
        if (row.restricted) { candidates.push(candidate); continue; }
        if (knownModel(catalog, 'anthropic', row.model)) { candidates.push(candidate); continue; }
        const provisional = provisionalRule({ family: 'anthropic', model: row.model, sourceUrl: ANTHROPIC, at, rates: row.rates,
          note: 'Auto-added from the official model table; cache duration and service tiers are pending review.' });
        if (appendProvisional(catalog, provisional)) { autoPublished.push(provisional); changes++; }
        else candidates.push(candidate);
      } else if (!sameRates(existing.rates || existing.contextTiers?.short, row.rates)) candidates.push({ source: ANTHROPIC, model: row.model, displayName: row.display, reason: 'Review changed official rates', rule, ...(row.cacheWrite1h == null ? {} : { cacheWrite1h: row.cacheWrite1h }) });
    }
  } catch (error) { failures.push({ source: ANTHROPIC, error: error.message }); }
  try {
    const rows = parseGoogle(await fetchSource(GOOGLE, false, { allowSameOriginRedirect: true }));
    for (const row of rows) {
      if (!isTextModel(row.model)) continue;
      const existing = activeRule(catalog, 'google', row.model, at);
      const rule = { id: 'google/' + row.model + '@' + at.slice(0, 10), family: 'google', canonical: row.model,
        aliases: [row.model, 'google/' + row.model], currency: 'USD', sourceUrl: GOOGLE_SOURCE, retrievedAt: at.slice(0, 10),
        observedFrom: at, rates: row.rates, confidence: 'exact', reasoningIncludedInOutput: true };
      if (!existing) {
        const candidate = { source: GOOGLE_SOURCE, model: row.model, displayName: row.display, reason: 'Missing official model coverage', rule };
        if (knownModel(catalog, 'google', row.model)) { candidates.push(candidate); continue; }
        const provisional = provisionalRule({ family: 'google', model: row.model, sourceUrl: GOOGLE_SOURCE, at, rates: row.rates,
          note: 'Auto-added from the Standard table; Batch, Flex and Priority tiers are pending review.' });
        if (appendProvisional(catalog, provisional)) { autoPublished.push(provisional); changes++; }
        else candidates.push(candidate);
      } else if (!sameRates(existing.rates || existing.contextTiers?.short, row.rates)) candidates.push({ source: GOOGLE_SOURCE, model: row.model, displayName: row.display, reason: 'Review changed official rates', rule });
    }
  } catch (error) { failures.push({ source: GOOGLE, error: error.message }); }
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
  return { catalog, report: { checkedAt: at, changes, autoPublished, candidates, failures } };
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
    validatePricingData({ catalog, envelope: { payload, signature }, previous: pricing.BUILTIN });
    writeFileSync('data/pricing/catalog.json', payload);
    writeFileSync('data/pricing/latest.json', JSON.stringify({ payload, signature }) + '\n');
  }
  console.log(JSON.stringify({ changes: report.changes, pendingReview: report.candidates.length, failures: report.failures }));
  if (report.failures.length) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
