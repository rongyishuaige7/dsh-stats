const React = require('react');
const pricing = require('./pricing.cjs');
const e = React.createElement;
const fields = ['uncached', 'cacheRead', 'cacheWrite', 'output'];
// Price rules follow Beijing time like the rest of the panel: datetime-local
// values and displayed times are UTC+8 regardless of the browser timezone.
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
// Accepts ISO strings (rule times) and millisecond numbers (status.lastSuccessAt).
function beijingInput(value) {
  const ms = value == null || value === '' ? NaN : new Date(value).getTime();
  return Number.isFinite(ms) ? new Date(ms + BEIJING_OFFSET_MS).toISOString().slice(0, 16) : '';
}
function fromBeijingInput(value) {
  const ms = Date.parse(value + '+08:00');
  if (!Number.isFinite(ms)) throw new RangeError('Invalid time value');
  return new Date(ms).toISOString();
}
const fmtBeijing = value => beijingInput(value).replace('T', ' ');
function blankDraft(provider = '', model = '') {
  return { provider, model, currency: 'CNY', uncached: '', cacheRead: '', cacheWrite: '', output: '', from: '', to: '', threshold: '', longUncached: '', longCacheRead: '', longCacheWrite: '', longOutput: '', priority: '', batch: '', flex: '', accountType: 'api' };
}
function draftRule(draft, existing, now = new Date()) {
  const number = text => text.trim() === '' ? null : Number(text);
  const rates = Object.fromEntries(fields.map(k => [k, number(draft[k])]));
  const date = value => value ? fromBeijingInput(value) : undefined;
  const rule = { id: 'custom/' + draft.provider.trim() + '/' + draft.model.trim() + '@' + now.toISOString(),
    providerId: draft.provider.trim(), family: pricing.providerFamilyOf(draft.provider), canonical: draft.model.trim(), aliases: [draft.model.trim().toLowerCase()],
    currency: draft.currency, sourceUrl: null, retrievedAt: now.toISOString().slice(0, 10), confidence: 'estimated', reasoningIncludedInOutput: true,
    accountType: draft.accountType, rates, ...(draft.from ? { effectiveFrom: date(draft.from) } : { observedFrom: now.toISOString() }), ...(draft.to ? { effectiveTo: date(draft.to) } : {}) };
  if (draft.threshold !== '') {
    rule.contextThreshold = Number(draft.threshold); rule.rates = null;
    rule.contextTiers = { short: rates, long: Object.fromEntries(fields.map(k => [k, number(draft['long' + k[0].toUpperCase() + k.slice(1)])])) };
  }
  rule.tierMultipliers = { standard: 1 };
  for (const k of ['priority', 'batch', 'flex']) if (draft[k].trim() !== '') rule.tierMultipliers[k] = Number(draft[k]);
  pricing.validateOverrides([rule]);
  return rule;
}
function ruleDraft(rule) {
  const draft = { ...blankDraft(rule.providerId, rule.canonical), currency: rule.currency, accountType: rule.accountType || 'api', from: beijingInput(rule.effectiveFrom), to: beijingInput(rule.effectiveTo), threshold: rule.contextThreshold == null ? '' : String(rule.contextThreshold) };
  for (const key of fields) {
    draft[key] = String((rule.contextTiers?.short || rule.rates)?.[key] ?? '');
    draft['long' + key[0].toUpperCase() + key.slice(1)] = String(rule.contextTiers?.long?.[key] ?? '');
  }
  for (const key of ['priority', 'batch', 'flex']) draft[key] = String(rule.tierMultipliers?.[key] ?? '');
  return draft;
}
function fmtRateValue(val, currency) {
  if (val == null || val === '') return '—';
  const sym = currency === 'USD' ? '$' : currency === 'CNY' ? '¥' : (currency ? currency + ' ' : '');
  if (val === 0) return sym + '0';
  return sym + String(val);
}
function formatMatchedCount(t, count) {
  const tpl = t('price.matchedCount');
  if (typeof tpl === 'string' && tpl.includes('%d')) return tpl.replace('%d', String(count));
  return '共 ' + count + ' 个模型';
}
function formatQuickRates(t, inVal, outVal) {
  const tpl = t('price.quickRates');
  if (typeof tpl === 'string' && tpl.includes('%s')) return tpl.replace('%s', inVal).replace('%s', outVal);
  return '输入 ' + inVal + ' / 输出 ' + outVal;
}
function primaryRates(rule) {
  const r = rule.rates
    || rule.contextTiers?.short
    || rule.timeOfUse?.peak
    || rule.legacy
    || (rule.serviceTiers ? Object.values(rule.serviceTiers)[0]?.short : null);
  if (!r) return null;
  return { input: r.uncached, output: r.output, currency: rule.currency };
}
function ruleDetails(rule, t) {
  const rows = rule.contextTiers ? [[t('price.standard'), rule.contextTiers.short], [t('price.long'), rule.contextTiers.long]]
    : rule.serviceTiers ? Object.entries(rule.serviceTiers).flatMap(([tier, rates]) => [[tier, rates.short], [tier + ' ' + t('price.long'), rates.long]])
    : rule.timeOfUse ? [[t('price.peak'), rule.timeOfUse.peak], [t('price.offPeak'), rule.timeOfUse.offPeak]]
    : rule.legacy ? [[t('price.legacy'), rule.legacy], [t('price.peak'), rule.peak], [t('price.offPeak'), rule.offPeak]] : [['', rule.rates]];
  return e(React.Fragment, null,
    rows.map(([label, rates]) => e('div', { key: label, className: 'dss-price-tier-block' },
      label ? e('div', { className: 'dss-price-tier-name' }, label) : null,
      e('div', { className: 'dss-price-rate-grid' }, fields.map(k => e('div', { key: k, className: 'dss-price-rate-cell' },
        e('div', { className: 'dss-price-rate-k' }, t('price.' + k)),
        e('div', { className: 'dss-price-rate-v' }, rates?.[k] == null ? t('pricing.pending') : fmtRateValue(rates[k], rule.currency))
      )))
    )),
    rule.note ? e('p', { className: 'dss-price-note' }, rule.note) : null,
    rule.timeOfUse ? e('p', { className: 'dss-price-note' }, 'Asia/Shanghai · ' + rule.timeOfUse.calendar.from + ' – ' + rule.timeOfUse.calendar.to, ' · ', e('a', { href: rule.timeOfUse.calendar.sourceUrl, target: '_blank', rel: 'noreferrer', className: 'dss-price-source-link' }, t('price.source') + ' ↗')) : null,
    rule.contextThreshold ? e('p', { className: 'dss-price-note' }, t('price.threshold') + ': ' + (rule.contextThreshold >= 1000 ? (rule.contextThreshold / 1000) + 'k' : rule.contextThreshold)) : null,
    rule.tierMultipliers ? e('p', { className: 'dss-price-note' }, Object.entries(rule.tierMultipliers).map(([k, v]) => k + ' ×' + v).join(' · ')) : null,
    rule.effectiveFrom ? e('p', { className: 'dss-price-note' }, t('price.from') + ': ' + fmtBeijing(rule.effectiveFrom) + ' ' + t('price.beijing')) : null,
    rule.effectiveTo ? e('p', { className: 'dss-price-note' }, t('price.to') + ': ' + fmtBeijing(rule.effectiveTo) + ' ' + t('price.beijing')) : null,
    rule.observedFrom ? e('p', { className: 'dss-price-note' }, t('price.observed') + ': ' + fmtBeijing(rule.observedFrom) + ' ' + t('price.beijing')) : null);
}
function missingModels(projects) {
  const rows = new Map();
  for (const project of projects || []) for (const session of project.sessions || []) for (const u of session.slotUsage || []) {
    if (!(u.cost?.unpricedTokens > 0) || u.cost.status === 'subscription') continue;
    const key = JSON.stringify([u.providerId, u.modelRaw || u.model]);
    const row = rows.get(key) || { provider: u.providerId, model: u.modelRaw || u.model, tokens: 0 };
    row.tokens += u.cost.unpricedTokens; rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.tokens - a.tokens);
}
function PricingPanel({ remote, projects, onChanged, t }) {
  const [status, setStatus] = React.useState(null), [busy, setBusy] = React.useState(false), [error, setError] = React.useState('');
  const [overrides, setOverrides] = React.useState([]), [draft, setDraft] = React.useState(blankDraft), [search, setSearch] = React.useState('');
  const [preview, setPreview] = React.useState(null), [autoUpdate, setAutoUpdate] = React.useState(true), [dirty, setDirty] = React.useState(false);
  const [advanced, setAdvanced] = React.useState(false), [editingId, setEditingId] = React.useState(null);
  const fail = err => setError(t(err?.message === 'pricing-settings-conflict' ? 'price.conflict' : 'price.failed'));
  function accept(result) {
    pricing.validateCatalog(JSON.parse(result.catalogJson));
    const rules = pricing.validateOverrides(JSON.parse(result.overridesJson));
    setStatus(result); setOverrides(rules); setAutoUpdate(result.autoUpdate); setDirty(false); setPreview(null); setDraft(blankDraft()); setEditingId(null);
  }
  async function call(request, mode = 'accept') {
    setBusy(true); setError('');
    try {
      const result = await remote(request);
      if (mode === 'preview') setPreview({ ...JSON.parse(result.previewJson), fingerprint: result.fingerprint });
      else { accept(result); if (request.action !== 'status') onChanged(); }
    } catch (err) { fail(err); }
    finally { setBusy(false); }
  }
  React.useEffect(() => {
    let cancelled = false;
    if (!remote) { setError(t('price.unavailable')); return; }
    setBusy(true);
    remote({ action: 'status' }).then(value => { if (!cancelled) accept(value); }).catch(err => { if (!cancelled) fail(err); }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [remote]);
  function edit(key, value) { setDraft(old => ({ ...old, [key]: value })); setPreview(null); }
  function add() {
    try {
      const rule = draftRule(draft, overrides);
      const next = [...overrides.filter(r => r.id !== editingId), rule]; pricing.validateOverrides(next);
      setOverrides(next); setDraft(blankDraft()); setEditingId(null); setPreview(null); setDirty(true); setError('');
    } catch { setError(t('price.invalid')); }
  }
  function input(key, label, type = 'number') {
    return e('label', { key, className: 'dss-price-field' }, label, e('input', { type, min: type === 'number' ? '0' : undefined, step: type === 'number' ? 'any' : undefined,
      value: draft[key], onChange: ev => edit(key, ev.target.value), 'aria-label': label }));
  }
  const catalog = status ? JSON.parse(status.catalogJson) : null;
  const used = new Set();
  const addUsed = m => {
    if (!m) return;
    let str = String(m).toLowerCase();
    used.add(str);
    let prev;
    do {
      prev = str;
      str = str.replace(/-(?:high|medium|low|none|thinking|thought)$/i, "");
      if (str !== prev) used.add(str);
    } while (str !== prev);
  };
  for (const p of projects || []) {
    for (const s of p.sessions || []) {
      addUsed(s?.modelRaw);
      addUsed(s?.model);
      addUsed(s?.modelCanonical);
      if (Array.isArray(s?.modelUsage)) {
        for (const mu of s.modelUsage) {
          addUsed(mu?.modelRaw);
          addUsed(mu?.model);
          addUsed(mu?.modelCanonical);
        }
      }
      if (Array.isArray(s?.slotUsage)) {
        for (const u of s.slotUsage) {
          addUsed(u?.modelRaw);
          addUsed(u?.model);
          addUsed(u?.modelCanonical);
        }
      }
    }
  }
  const allRules = [...(catalog?.rules || [])];
  for (const supp of pricing.SUPPLEMENTAL_RULES || []) {
    if (!allRules.some(r => r.canonical === supp.canonical && (r.providerId || r.family) === (supp.providerId || supp.family))) {
      allRules.push(supp);
    }
  }
  const hasSearch = Boolean(search && search.trim());
  let filtered = [];
  let usedMatchingCount = 0;
  if (hasSearch) {
    const q = search.trim().toLowerCase();
    filtered = allRules.filter(rule => {
      const hay = (rule.canonical + ' ' + (rule.providerId || rule.family || '')).toLowerCase();
      if (hay.includes(q)) return true;
      return Array.isArray(rule.aliases) && rule.aliases.some(a => String(a).toLowerCase().includes(q));
    });
  } else {
    const usedRules = [];
    const otherRules = [];
    for (const rule of allRules) {
      const isUsed = Array.isArray(rule.aliases) && rule.aliases.some(a => used.has(String(a).toLowerCase()));
      if (isUsed) usedRules.push(rule);
      else otherRules.push(rule);
    }
    usedMatchingCount = usedRules.length;
    otherRules.sort((a, b) => {
      const aDeep = (a.family === 'deepseek' || a.providerId === 'deepseek') ? 0 : 1;
      const bDeep = (b.family === 'deepseek' || b.providerId === 'deepseek') ? 0 : 1;
      if (aDeep !== bDeep) return aDeep - bDeep;
      return a.canonical.localeCompare(b.canonical);
    });
    filtered = usedRules.length ? [...usedRules, ...otherRules] : otherRules;
  }
  const amount = summary => summary?.totals?.map(row => row.currency + ' ' + row.amount.toFixed(4)).join(' + ') || t('pricing.pending');
  const button = (label, onClick, disabled = false) => e('button', { type: 'button', className: 'dss-export', disabled: busy || disabled, onClick }, label);
  return e('section', { className: 'dss-pricing', 'aria-label': t('price.title') },
    e('h3', null, t('price.title')),
    error ? e('p', { role: 'alert' }, error) : null,
    !status ? e('p', null, busy ? t('price.loading') : t('price.unavailable')) : e(React.Fragment, null,
      e('div', { className: 'dss-price-actions' },
        e('label', null, e('input', { type: 'checkbox', checked: autoUpdate, onChange: ev => { setAutoUpdate(ev.target.checked); setDirty(true); setPreview(null); } }), ' ', t('price.auto')),
        button(t('price.refresh'), () => call({ action: 'refresh' }), dirty)),
      e('p', { className: 'dss-price-muted' }, t('price.updated') + ' ' + (status.lastSuccessAt ? fmtBeijing(status.lastSuccessAt) + ' ' + t('price.beijing') : t('price.builtin')) + ' · ' + status.version),
      status.error ? e('p', { role: 'status' }, t('price.refreshFailed'), e('details', null, e('summary', null, t('source.details')), status.error)) : null,
      missingModels(projects).length ? e('div', null, e('h4', null, t('price.missing')),
        missingModels(projects).map(row => e('div', { key: row.provider + '/' + row.model, className: 'dss-price-row' },
          e('span', null, row.provider + ' / ' + row.model), button(t('price.configure'), () => { setDraft(blankDraft(row.provider, row.model)); setEditingId(null); setAdvanced(true); })))) : null,
      e('details', { open: advanced, onToggle: ev => setAdvanced(ev.currentTarget.open) },
        e('summary', null, t('price.custom') + (overrides.length ? ' (' + overrides.length + ')' : '')),
        e('p', { className: 'dss-price-muted' }, t('price.units')),
        overrides.map(rule => e('div', { key: rule.id, className: 'dss-price-row' }, e('span', null, rule.providerId + ' / ' + rule.canonical),
          e('details', null, e('summary', null, t('source.details')), ruleDetails(rule, t)),
          button(t('price.edit'), () => { setDraft(ruleDraft(rule)); setEditingId(rule.id); setPreview(null); }),
          button(t('price.remove'), () => { setOverrides(overrides.filter(r => r.id !== rule.id)); setDirty(true); setPreview(null); }))),
        e('div', { className: 'dss-price-grid' }, input('provider', t('price.provider'), 'text'), input('model', t('price.model'), 'text'),
          e('label', { className: 'dss-price-field' }, t('price.currency'), e('select', { value: draft.currency, onChange: ev => edit('currency', ev.target.value) }, ['CNY', 'USD'].map(v => e('option', { key: v }, v)))),
          ...fields.map(k => input(k, t('price.' + k)))),
        e('details', null, e('summary', null, t('price.conditions')),
          e('p', { className: 'dss-price-muted' }, t('price.timesBeijing')),
          e('div', { className: 'dss-price-grid' }, input('from', t('price.from'), 'datetime-local'), input('to', t('price.to'), 'datetime-local'), input('threshold', t('price.threshold')),
            ...fields.map(k => input('long' + k[0].toUpperCase() + k.slice(1), t('price.long') + ' ' + t('price.' + k))),
            ...['priority', 'batch', 'flex'].map(k => input(k, k + ' ' + t('price.multiplier'))),
            e('label', { className: 'dss-price-field' }, t('price.accountType'), e('select', { value: draft.accountType, onChange: ev => edit('accountType', ev.target.value) }, ['api', 'relay', 'local'].map(v => e('option', { key: v }, v)))))),
        button(t(editingId ? 'price.replace' : 'price.add'), add)),
      dirty ? e('div', { className: 'dss-price-actions' }, button(t('price.preview'), () => call({ action: 'preview', overridesJson: JSON.stringify(overrides) }, 'preview')),
        button(t('price.save'), () => call({ action: 'save', fingerprint: preview.fingerprint, revision: status.revision, autoUpdate, overridesJson: JSON.stringify(overrides) }), !preview),
        button(t('price.cancel'), () => accept(status))) : null,
      preview ? e('p', { className: 'dss-price-preview', role: 'status' }, t('price.affected') + ' ' + preview.changed.length + ' · ' + amount(preview.before) + ' → ' + amount(preview.after)) : null,
      e('details', { className: 'dss-price-catalog-section' },
        e('summary', { className: 'dss-price-section-summary' }, t('price.catalog')),
        e('div', { className: 'dss-price-catalog-toolbar' },
          e('input', { type: 'search', className: 'dss-price-search-input', value: search, onChange: ev => setSearch(ev.target.value), placeholder: t('price.search'), 'aria-label': t('price.search') }),
          e('div', { className: 'dss-price-catalog-info' },
            e('span', { className: 'dss-price-muted' }, hasSearch ? t('price.searchFilter') : (usedMatchingCount > 0 ? t('price.usedFirst') : t('price.builtinModels'))),
            e('span', { className: 'dss-price-badge' }, formatMatchedCount(t, filtered.length))
          )
        ),
        e('div', { className: 'dss-price-catalog-list' },
          filtered.length === 0 ? e('div', { className: 'dss-price-empty' }, t('price.noMatch')) :
          filtered.map(rule => {
            const isUsed = Array.isArray(rule.aliases) && rule.aliases.some(a => used.has(String(a).toLowerCase()));
            const provider = rule.providerId || rule.family || '';
            const primary = primaryRates(rule);
            const ratePreview = primary && (primary.input != null || primary.output != null)
              ? formatQuickRates(t, fmtRateValue(primary.input, primary.currency), fmtRateValue(primary.output, primary.currency))
              : null;
            return e('details', { key: rule.id, className: 'dss-price-rule dss-price-rule-card' },
              e('summary', { className: 'dss-price-rule-summary' },
                e('div', { className: 'dss-price-rule-lead' },
                  provider ? e('span', { className: 'dss-price-provider-tag' }, provider) : null,
                  e('span', { className: 'dss-price-canonical-name', title: rule.canonical }, rule.canonical),
                  isUsed ? e('span', { className: 'dss-price-used-tag' }, t('price.inUse')) : null
                ),
                e('div', { className: 'dss-price-rule-trail' },
                  ratePreview ? e('span', { className: 'dss-price-summary-rate' }, ratePreview) : null,
                  e('span', { className: 'dss-price-chevron', 'aria-hidden': 'true' })
                )
              ),
              e('div', { className: 'dss-price-rule-body' },
                ruleDetails(rule, t),
                e('div', { className: 'dss-price-rule-meta' },
                  e('span', null, (rule.currency || 'CNY') + ' / 1M tokens · ' + (rule.retrievedAt || '')),
                  rule.sourceUrl ? e('a', { href: rule.sourceUrl, target: '_blank', rel: 'noreferrer', className: 'dss-price-source-link' }, (t('price.source') || '官网定价') + ' ↗') : null
                )
              )
            );
          })
        ),
        e('details', { className: 'dss-price-history-section' },
          e('summary', null, t('price.history')),
          e('p', { className: 'dss-price-muted' }, t('price.rollbackHint')),
          status.history.filter(v => v !== status.version).map(version => e('div', { key: version, className: 'dss-price-row' }, String(version), button(t('price.rollback'), () => call({ action: 'rollback', version, revision: status.revision }), dirty)))))
    ));
}
module.exports = { PricingPanel, draftRule, missingModels, blankDraft, ruleDraft, fmtBeijing };
