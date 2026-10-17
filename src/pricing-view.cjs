// Presentation data is cached separately from search text and editor state.
const pricing = require('./pricing.cjs');
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
  const engine = pricing.createPricing(catalog), used = new Set(), seen = new Set();
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
function selectCatalog(groups, search, includeHistory) {
  const query = search.trim().toLowerCase(), rows = [];
  let modelCount = 0;
  for (const group of groups) {
    if (query && !group.search.includes(query)) continue;
    const selected = group.rules.filter(row => includeHistory || row.phase === 'current');
    if (!selected.length) continue;
    modelCount++;
    selected.sort((a, b) => Number(b.phase === 'current') - Number(a.phase === 'current')
      || Date.parse(b.rule.effectiveFrom || b.rule.observedFrom || '1970-01-01') - Date.parse(a.rule.effectiveFrom || a.rule.observedFrom || '1970-01-01'));
    for (const row of selected) rows.push({ ...row, isUsed: group.isUsed });
  }
  return { rows, modelCount };
}
module.exports = { fmtRateValue, rulePhase, usedModelKeys, catalogGroups, selectCatalog };
