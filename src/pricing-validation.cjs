// Shared, bounded validation for local, remote, and browser price snapshots.
const FIELDS = ['uncached', 'cacheRead', 'cacheWrite', 'output'];
const TIERS = ['standard', 'priority', 'batch', 'flex'];
const RULE_KEYS = new Set(['id', 'family', 'canonical', 'aliases', 'currency', 'sourceUrl', 'retrievedAt', 'rates', 'reasoningIncludedInOutput', 'confidence', 'legacy', 'offPeak', 'peak', 'contextTiers', 'contextThreshold', 'serviceTiers', 'tierMultipliers', 'effectiveFrom', 'effectiveTo', 'observedFrom', 'providerId', 'accountType', 'cacheWriteDurationUnknown', 'cacheStorageUnknown', 'cacheWritePriceUnknown', 'note', 'timeOfUse']);
function check(ok, label) { if (!ok) throw new TypeError('Invalid pricing: ' + label); }
function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function text(value, limit = 250) { return typeof value === 'string' && value.length > 0 && value.length <= limit && !/[\x00-\x1f]/.test(value); }
function timestamp(value) { return typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value)); }
function source(value) { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash; } catch { return false; } }
function rates(value) {
  check(record(value) && Object.keys(value).length === 4, 'rates');
  for (const k of FIELDS) check(value[k] === null || Number.isFinite(value[k]) && value[k] >= 0 && value[k] <= 1e7, k);
}
function tiers(value) { check(record(value) && Object.keys(value).length === 2, 'context tiers'); rates(value.short); rates(value.long); }
function rule(value, custom) {
  check(record(value) && Object.keys(value).every(k => RULE_KEYS.has(k)), 'rule fields');
  for (const k of ['id', 'family', 'canonical']) check(text(value[k]), k);
  check(['CNY', 'USD'].includes(value.currency), 'currency');
  check(['exact', 'estimated'].includes(value.confidence), 'confidence');
  check(value.sourceUrl === null && custom || source(value.sourceUrl), 'source URL');
  check(/^\d{4}-\d\d-\d\d$/.test(value.retrievedAt) && Number.isFinite(Date.parse(value.retrievedAt)), 'retrieved date');
  check(Array.isArray(value.aliases) && value.aliases.length > 0 && value.aliases.length <= 30 && value.aliases.every(a => text(a) && a === a.toLowerCase()) && value.aliases.includes(value.canonical.toLowerCase()), 'aliases');
  check(value.reasoningIncludedInOutput === true, 'reasoning billing semantics');
  if (custom || value.providerId !== undefined) check(text(value.providerId), 'provider ID');
  if (value.accountType !== undefined) check(['api', 'relay', 'local'].includes(value.accountType), 'account type');
  for (const k of ['effectiveFrom', 'effectiveTo', 'observedFrom']) if (value[k] !== undefined) check(timestamp(value[k]), k);
  if (value.effectiveFrom && value.effectiveTo) check(Date.parse(value.effectiveFrom) < Date.parse(value.effectiveTo), 'effective interval');
  for (const k of ['cacheWriteDurationUnknown', 'cacheStorageUnknown', 'cacheWritePriceUnknown']) if (value[k] !== undefined) check(typeof value[k] === 'boolean', k);
  if (value.note !== undefined) check(text(value.note, 1000), 'note');
  const modes = [value.rates != null, value.legacy != null, value.contextTiers != null, value.serviceTiers != null, value.timeOfUse != null].filter(Boolean).length;
  check(modes === 1, 'one rate mode required');
  if (value.timeOfUse) {
    const t = value.timeOfUse, c = t.calendar;
    check(value.family === 'deepseek' && record(t) && Object.keys(t).every(k => ['peak', 'offPeak', 'calendar'].includes(k)), 'time of use');
    rates(t.peak); rates(t.offPeak);
    const day = v => typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
    check(record(c) && Object.keys(c).every(k => ['from', 'to', 'holidays', 'sourceUrl'].includes(k)) && day(c.from) && day(c.to) && c.from <= c.to && source(c.sourceUrl), 'calendar');
    check(Array.isArray(c.holidays) && c.holidays.length <= 1000 && new Set(c.holidays).size === c.holidays.length && c.holidays.every(d => day(d) && d >= c.from && d <= c.to), 'calendar holidays');
  }
  if (value.rates != null) rates(value.rates);
  if (value.legacy) { check(value.family === 'deepseek', 'legacy family'); rates(value.legacy); rates(value.peak); rates(value.offPeak); }
  if (value.contextTiers) { tiers(value.contextTiers); check(Number.isSafeInteger(value.contextThreshold) && value.contextThreshold > 0, 'context threshold'); }
  if (value.serviceTiers) { check(record(value.serviceTiers) && Object.keys(value.serviceTiers).every(k => TIERS.includes(k)), 'service tiers'); for (const v of Object.values(value.serviceTiers)) tiers(v); }
  if (value.tierMultipliers) { check(record(value.tierMultipliers) && Object.keys(value.tierMultipliers).every(k => TIERS.includes(k)), 'multipliers'); for (const v of Object.values(value.tierMultipliers)) check(Number.isFinite(v) && v > 0 && v <= 100, 'multiplier'); }
}
function freeze(value) { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function rules(values, custom) {
  check(Array.isArray(values) && values.length <= (custom ? 500 : 20000), 'rule count');
  const ids = new Set(), aliases = new Map();
  for (const value of values) {
    rule(value, custom); check(!ids.has(value.id), 'duplicate rule ID'); ids.add(value.id);
    for (const alias of value.aliases) {
      const key = JSON.stringify([value.providerId || 'family:' + value.family, alias]);
      const spans = aliases.get(key) || [];
      const from = value.effectiveFrom ? Date.parse(value.effectiveFrom) : -Infinity, to = value.effectiveTo ? Date.parse(value.effectiveTo) : Infinity;
      check(!spans.some(([a, b, account]) => from < b && a < to && (!account || !value.accountType || account === value.accountType)), 'overlapping rules: ' + alias);
      spans.push([from, to, value.accountType]); aliases.set(key, spans);
    }
  }
}
const validated = new WeakSet();
function validateCatalog(input) {
  if (validated.has(input)) return input;
  check(record(input) && Object.keys(input).every(k => ['schemaVersion', 'version', 'publishedAt', 'rules', 'fx'].includes(k)), 'catalog fields');
  check([1, 2].includes(input.schemaVersion) && Number.isSafeInteger(input.version) && input.version > 0 && timestamp(input.publishedAt), 'catalog version');
  rules(input.rules, false);
  check(input.schemaVersion >= 2 || input.rules.every(r => !r.timeOfUse), 'time of use requires schema 2');
  check(Array.isArray(input.fx) && input.fx.length > 0 && input.fx.length <= 10000, 'FX entries');
  let previous = '';
  for (const fx of input.fx) {
    check(record(fx) && Object.keys(fx).every(k => ['date', 'usdCny', 'sourceUrl'].includes(k)), 'FX fields');
    check(/^\d{4}-\d\d-\d\d$/.test(fx.date) && Number.isFinite(Date.parse(fx.date)) && fx.date > previous, 'FX date order');
    check(Number.isFinite(fx.usdCny) && fx.usdCny > 0 && fx.usdCny <= 100 && typeof fx.sourceUrl === 'string' && (() => { try { const url = new URL(fx.sourceUrl); return url.protocol === 'https:' && !url.username && !url.password && !url.hash; } catch { return false; } })(), 'FX rate'); previous = fx.date;
  }
  const result = freeze(JSON.parse(JSON.stringify(input))); validated.add(result); return result;
}
function validateOverrides(input) { rules(input, true); return freeze(JSON.parse(JSON.stringify(input))); }
module.exports = { validateCatalog, validateOverrides };
