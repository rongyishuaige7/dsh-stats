// Presentation data is cached separately from search text and editor state.
const pricing = require('./pricing.cjs');
const engineCache = new WeakMap();
function engineFor(catalog) {
  let engine = engineCache.get(catalog);
  if (!engine) { engine = pricing.createPricing(catalog); engineCache.set(catalog, engine); }
  return engine;
}
const groupKey = rule => JSON.stringify([rule.providerId || 'family:' + rule.family, rule.canonical]);
const rateFormatter = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 8, useGrouping: false });
function fmtRateValue(value, currency) {
  if (value == null || value === '') return '—';
  const symbol = currency === 'USD' ? '$' : currency === 'CNY' ? '¥' : currency ? currency + ' ' : '';
  return symbol + rateFormatter.format(value);
}
function rulePhase(rule, at) {
  if (rule.effectiveFrom && at < Date.parse(rule.effectiveFrom)) return 'upcoming';
  if (rule.effectiveTo && at >= Date.parse(rule.effectiveTo)) return 'historical';
  return 'current';
}
function usedModelKeys(projects, catalog) {
  if (!catalog) return new Set();
  const byId = new Map(catalog.rules.map(rule => [rule.id, rule]));
  const engine = engineFor(catalog), used = new Set(), seen = new Set();
  for (const project of projects || []) for (const session of project.sessions || []) {
    const rows = session.slotUsage?.length ? session.slotUsage : session.modelUsage?.length ? session.modelUsage : [session];
    for (const row of rows) {
      let rule = byId.get(row.cost?.ruleId);
      if (!rule) {
        const providerId = row.providerId || session.providerId;
        const model = row.modelRaw || row.model || row.modelCanonical || session.modelRaw || session.model;
        if (!model) continue;
        const time = row.time ?? (Number.isFinite(row.slot) ? row.slot * 1800000 : session.updatedAt ?? session.createdAt);
        const accountType = row.accountType || session.accountType;
        const key = JSON.stringify([providerId, model, accountType, time]);
        if (seen.has(key)) continue;
        seen.add(key);
        rule = byId.get(engine.priceUsage({ providerId, model, time, accountType, uncached: 0, output: 0 }).ruleId);
        if (!rule) {
          // Subscription usage still identifies a model even without an API quote.
          const identity = engine.normalizeIdentity(providerId, model, accountType, time);
          for (const candidate of catalog.rules) if (candidate.canonical === identity.modelCanonical
            && (candidate.providerId ? candidate.providerId === identity.providerId : candidate.family === identity.providerFamily)) used.add(groupKey(candidate));
        }
      }
      if (rule) used.add(groupKey(rule));
    }
  }
  return used;
}
function catalogGroups(catalog, used, at) {
  const groups = new Map();
  for (const rule of catalog?.rules || []) {
    const key = groupKey(rule);
    let group = groups.get(key);
    if (!group) {
      group = { key, canonical: rule.canonical, provider: rule.providerId || rule.family, isUsed: used.has(key), rules: [],
        search: (rule.canonical + ' ' + (rule.providerId || rule.family)).toLowerCase() };
      groups.set(key, group);
    }
    group.search += ' ' + rule.aliases.join(' ');
    group.rules.push({ rule, phase: rulePhase(rule, at) });
  }
  return [...groups.values()].sort((a, b) => Number(b.isUsed) - Number(a.isUsed)
    || Number(b.provider === 'deepseek') - Number(a.provider === 'deepseek')
    || a.provider.localeCompare(b.provider) || a.canonical.localeCompare(b.canonical));
}
// A simple price is only safe to summarize when one current rule carries plain
// per-token rates and no other rate mode or service tier changes the amount.
// Context, time-of-use, legacy and multi-rule prices keep every condition in
// the detail view instead of promoting one tier to a general price.
function hasComplexPrice(rule) {
  if (rule.contextTiers != null || rule.serviceTiers != null || rule.timeOfUse != null || rule.legacy != null) return true;
  return rule.tierMultipliers != null && Object.values(rule.tierMultipliers).some(value => value !== 1);
}
function modelPriceSummary(group) {
  let currentCount = 0, historicalCount = 0, upcomingCount = 0, currentRule = null;
  for (const row of group?.rules || []) {
    if (row.phase === 'current') { currentCount++; currentRule = row.rule; }
    else if (row.phase === 'historical') historicalCount++;
    else if (row.phase === 'upcoming') upcomingCount++;
  }
  const flat = currentCount === 1 && currentRule.rates != null && !hasComplexPrice(currentRule);
  return { kind: currentCount === 0 ? 'none' : flat ? 'flat' : 'tiered',
    currentCount, historicalCount, upcomingCount, ...(flat ? { rule: currentRule } : {}) };
}
function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
// Pagination is by provider/model group: all periods of one model stay on the
// same page, while ruleCount still reports every period in the matched groups.
function selectModelGroups(groups, options = {}) {
  const list = Array.isArray(groups) ? groups : [];
  const search = typeof options.search === 'string' ? options.search.trim().toLowerCase() : '';
  const scope = options.scope === 'used' ? 'used' : 'all';
  const pageSize = positiveInteger(options.pageSize) || 25;
  const requestedPage = Number.isSafeInteger(options.page) && options.page >= 0 ? options.page : 0;
  const matched = list.filter(group => (scope === 'all' || group.isUsed)
    && (!search || group.search.includes(search)));
  const modelCount = matched.length;
  const ruleCount = matched.reduce((total, group) => total + group.rules.length, 0);
  if (modelCount === 0) return { rows: [], modelCount: 0, ruleCount: 0, page: 0, pageCount: 1 };
  const pageCount = Math.ceil(modelCount / pageSize);
  const page = Math.min(requestedPage, pageCount - 1);
  return { rows: matched.slice(page * pageSize, (page + 1) * pageSize), modelCount, ruleCount, page, pageCount };
}
// Snapshot history is only a version list. Never infer dates or change counts,
// and keep the current version in its own summary instead of the restore list.
function catalogSnapshotRows(status, limit = 5) {
  const max = positiveInteger(limit) || 5;
  const current = Number.isSafeInteger(status?.version) ? status.version : null;
  const seen = new Set(), candidates = [];
  for (const value of Array.isArray(status?.history) ? status.history : []) {
    if (!Number.isSafeInteger(value) || value <= 0 || value === current || seen.has(value)) continue;
    seen.add(value); candidates.push(value);
  }
  candidates.sort((a, b) => b - a);
  return { versions: candidates.slice(0, max), total: candidates.length, hasMore: candidates.length > max };
}
module.exports = { fmtRateValue, rulePhase, usedModelKeys, catalogGroups,
  modelPriceSummary, selectModelGroups, catalogSnapshotRows };
