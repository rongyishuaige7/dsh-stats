const React = require('react');
const pricing = require('./pricing.cjs');
const { fmtRateValue, usedModelKeys, catalogGroups, selectCatalog } = require('./pricing-view.cjs');
const e = React.createElement;
const fields = ['uncached', 'cacheRead', 'cacheWrite', 'output'];
const PAGE_SIZE = 25;
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
function draftForFocus(focusModel) {
  if (!focusModel || typeof focusModel.provider !== 'string' || typeof focusModel.model !== 'string') return null;
  return blankDraft(focusModel.provider, focusModel.model);
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
class PricingErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.warn('[dsh-stats] PricingPanel render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      const t = this.props.t || (key => key);
      return e('div', { className: 'dss-pricing dss-pricing-error' },
        e('h3', null, t('price.title')),
        e('p', { role: 'alert' }, (t('price.renderError') || '价格设置渲染异常') + ': ' + (this.state.error?.message || 'unknown')),
        e('button', { type: 'button', className: 'dss-export', onClick: () => this.setState({ hasError: false, error: null }) }, t('price.retry') || '重试')
      );
    }
    return this.props.children;
  }
}

const PriceRuleCard = React.memo(function PriceRuleCard({ rule, phase, isUsed, t }) {
  const [open, setOpen] = React.useState(false);
  const primary = primaryRates(rule);
  const rates = primary && (primary.input != null || primary.output != null)
    ? formatQuickRates(t, fmtRateValue(primary.input, primary.currency), fmtRateValue(primary.output, primary.currency)) : null;
  return e('details', { className: 'dss-price-rule dss-price-rule-card', open, onToggle: ev => setOpen(ev.currentTarget.open), 'data-phase': phase },
    e('summary', { className: 'dss-price-rule-summary' },
      e('div', { className: 'dss-price-rule-lead' },
        e('span', { className: 'dss-price-provider-tag' }, rule.providerId || rule.family),
        e('span', { className: 'dss-price-canonical-name', title: rule.canonical }, rule.canonical),
        isUsed ? e('span', { className: 'dss-price-used-tag' }, t('price.inUse')) : null,
        typeof rule.note === 'string' && rule.note.startsWith('[provisional]') ? e('span', { className: 'dss-price-provisional' }, t('price.provisional')) : null),
      e('div', { className: 'dss-price-rule-trail' },
        e('span', { className: 'dss-price-phase' }, t('price.' + phase)),
        rates ? e('span', { className: 'dss-price-summary-rate' }, rates) : null,
        e('span', { className: 'dss-price-chevron', 'aria-hidden': 'true' }))),
    open ? e('div', { className: 'dss-price-rule-body' }, ruleDetails(rule, t),
      e('div', { className: 'dss-price-rule-meta' },
        e('span', null, rule.currency + ' / 1M tokens · ' + rule.retrievedAt),
        rule.sourceUrl ? e('a', { href: rule.sourceUrl, target: '_blank', rel: 'noreferrer', className: 'dss-price-source-link' }, t('price.source') + ' ↗') : null)) : null);
});
function PricingPanel({ remote, projects, onChanged, t, focusModel }) {
  const [status, setStatus] = React.useState(null), [busy, setBusy] = React.useState(false), [error, setError] = React.useState('');
  const [overrides, setOverrides] = React.useState([]), [draft, setDraft] = React.useState(blankDraft), [search, setSearch] = React.useState('');
  const [preview, setPreview] = React.useState(null), [autoUpdate, setAutoUpdate] = React.useState(true), [dirty, setDirty] = React.useState(false);
  const [advanced, setAdvanced] = React.useState(false), [editingId, setEditingId] = React.useState(null);
  const [catalogOpen, setCatalogOpen] = React.useState(false), [includeHistory, setIncludeHistory] = React.useState(false);
  const [page, setPage] = React.useState(0), [catalogAt, setCatalogAt] = React.useState(Date.now);
  const [focusTick, setFocusTick] = React.useState(0);
  const pendingFocusRef = React.useRef(null), focusAfterLocateRef = React.useRef(false), formRef = React.useRef(null);
  const fail = err => setError(t(err?.message === 'pricing-settings-conflict' ? 'price.conflict' : 'price.failed'));
  function locateDraft(nextDraft) {
    if (!nextDraft) return false;
    setDraft(nextDraft);
    setEditingId(null);
    setAdvanced(true);
    setFocusTick(n => n + 1);
    focusAfterLocateRef.current = true;
    return true;
  }
  function locate(provider, model) {
    return locateDraft(blankDraft(provider, model));
  }
  function accept(result) {
    pricing.validateCatalog(JSON.parse(result.catalogJson));
    const rules = pricing.validateOverrides(JSON.parse(result.overridesJson));
    const pendingDraft = draftForFocus(pendingFocusRef.current);
    pendingFocusRef.current = null;
    if (!locateDraft(pendingDraft)) setDraft(blankDraft());
    setStatus(result); setOverrides(rules); setAutoUpdate(result.autoUpdate); setDirty(false); setPreview(null); setEditingId(null);
    setCatalogAt(Date.now());
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
  React.useEffect(() => {
    const nextDraft = draftForFocus(focusModel);
    if (!nextDraft) { pendingFocusRef.current = null; return; }
    if (status) locateDraft(nextDraft);
    else pendingFocusRef.current = focusModel;
  }, [focusModel?.nonce]);
  React.useEffect(() => {
    if (!focusAfterLocateRef.current || !advanced || !formRef.current) return;
    focusAfterLocateRef.current = false;
    formRef.current.scrollIntoView({ block: 'nearest' });
    const input = formRef.current.querySelector('input');
    if (input) input.focus();
  }, [advanced, draft.provider, draft.model, focusTick]);
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
  const catalog = React.useMemo(() => status ? pricing.validateCatalog(JSON.parse(status.catalogJson)) : null, [status?.catalogJson]);
  const used = React.useMemo(() => usedModelKeys(projects, catalog), [projects, catalog]);
  const groups = React.useMemo(() => catalogGroups(catalog, used, catalogAt), [catalog, used, catalogAt]);
  const selection = React.useMemo(() => selectCatalog(groups, search, includeHistory), [groups, search, includeHistory]);
  const missing = React.useMemo(() => missingModels(projects), [projects]);
  const hasSearch = Boolean(search && search.trim());
  const pageCount = Math.max(1, Math.ceil(selection.rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRules = selection.rows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
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
      missing.length ? e('div', null, e('h4', null, t('price.missing')),
        missing.map(row => e('div', { key: row.provider + '/' + row.model, className: 'dss-price-row' },
          e('span', null, row.provider + ' / ' + row.model), button(t('price.configure'), () => locate(row.provider, row.model))))) : null,
      e('details', { open: advanced, onToggle: ev => setAdvanced(ev.currentTarget.open), ref: formRef },
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
      e('details', { className: 'dss-price-catalog-section', open: catalogOpen, onToggle: ev => setCatalogOpen(ev.currentTarget.open) },
        e('summary', { className: 'dss-price-section-summary' }, t('price.catalog')),
        catalogOpen ? e(React.Fragment, null,
        e('div', { className: 'dss-price-catalog-toolbar' },
          e('input', { type: 'search', className: 'dss-price-search-input', value: search, onChange: ev => { setSearch(ev.target.value); setPage(0); }, placeholder: t('price.search'), 'aria-label': t('price.search') }),
          e('label', { className: 'dss-price-history-filter' }, e('input', { type: 'checkbox', checked: includeHistory, onChange: ev => { setIncludeHistory(ev.target.checked); setPage(0); } }), ' ', t('price.includeHistory')),
          e('div', { className: 'dss-price-catalog-info' },
            e('span', { className: 'dss-price-muted' }, hasSearch ? t('price.searchFilter') : (used.size > 0 ? t('price.usedFirst') : t('price.builtinModels'))),
            e('span', { className: 'dss-price-badge' }, formatMatchedCount(t, selection.modelCount) + ' · ' + t('price.ruleCount').replace('%d', String(selection.rows.length)))
          )
        ),
        e('div', { className: 'dss-price-catalog-list' },
          visibleRules.length === 0 ? e('div', { className: 'dss-price-empty' }, t('price.noMatch')) :
          visibleRules.map(row => e(PriceRuleCard, { key: row.rule.id, ...row, t }))
        ),
        pageCount > 1 ? e('nav', { className: 'dss-price-pagination', 'aria-label': t('price.pages') },
          button(t('price.previous'), () => setPage(currentPage - 1), currentPage === 0),
          e('span', null, (currentPage + 1) + ' / ' + pageCount),
          button(t('price.next'), () => setPage(currentPage + 1), currentPage + 1 >= pageCount)) : null,
        e('details', { className: 'dss-price-history-section' },
          e('summary', null, t('price.history')),
          e('p', { className: 'dss-price-muted' }, t('price.rollbackHint')),
          status.history.filter(v => v !== status.version).map(version => e('div', { key: version, className: 'dss-price-row' }, String(version), button(t('price.rollback'), () => call({ action: 'rollback', version, revision: status.revision }), dirty))))) : null)
    ));
}
module.exports = { PricingPanel, PricingErrorBoundary, draftRule, draftForFocus, missingModels, blankDraft, ruleDraft, fmtBeijing };
