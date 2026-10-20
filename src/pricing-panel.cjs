const React = require('react');
const pricing = require('./pricing.cjs');
const { fmtRateValue, usedModelKeys, catalogGroups, modelPriceSummary, selectModelGroups, catalogSnapshotRows } = require('./pricing-view.cjs');
const { missingModels } = require('./client-overview-model.cjs');
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
function fill(t, key, ...values) {
  let text = t(key);
  for (const value of values) text = text.replace('%d', String(value));
  return text;
}
function formatQuickRates(t, inVal, outVal) {
  const tpl = t('price.quickRates');
  if (typeof tpl === 'string' && tpl.includes('%s')) return tpl.replace('%s', inVal).replace('%s', outVal);
  return '输入 ' + inVal + ' / 输出 ' + outVal;
}
function rateText(value, currency, t) {
  return value == null ? t('price.unknown') : fmtRateValue(value, currency);
}
function isProvisional(rule) {
  return typeof rule.note === 'string' && rule.note.startsWith('[provisional]');
}
function ruleDetails(rule, t) {
  const rows = rule.contextTiers ? [[t('price.standard'), rule.contextTiers.short], [t('price.long'), rule.contextTiers.long]]
    : rule.serviceTiers ? Object.entries(rule.serviceTiers).flatMap(([tier, rates]) => [[tier, rates.short], [tier + ' ' + t('price.long'), rates.long]])
    : rule.timeOfUse ? [[t('price.peak'), rule.timeOfUse.peak], [t('price.offPeak'), rule.timeOfUse.offPeak]]
    : rule.legacy ? [[t('price.legacy'), rule.legacy], [t('price.peak'), rule.peak], [t('price.offPeak'), rule.offPeak]] : [['', rule.rates]];
  return e(React.Fragment, null,
    rows.map(([label, rates]) => e('div', { key: label || 'rates', className: 'dss-price-tier-block' },
      label ? e('div', { className: 'dss-price-tier-name' }, label) : null,
      e('div', { className: 'dss-price-rate-grid' }, fields.map(k => e('div', { key: k, className: 'dss-price-rate-cell' },
        e('div', { className: 'dss-price-rate-k' }, t('price.' + k)),
        e('div', { className: 'dss-price-rate-v' }, rates?.[k] == null ? t('price.unknown') : fmtRateValue(rates[k], rule.currency))
      )))
    )),
    rule.note && !isProvisional(rule) ? e('p', { className: 'dss-price-note' }, rule.note) : null,
    rule.timeOfUse ? e('p', { className: 'dss-price-note' }, 'Asia/Shanghai · ' + rule.timeOfUse.calendar.from + ' – ' + rule.timeOfUse.calendar.to, ' · ', e('a', { href: rule.timeOfUse.calendar.sourceUrl, target: '_blank', rel: 'noreferrer', className: 'dss-price-source-link' }, t('price.source') + ' ↗')) : null,
    rule.contextThreshold ? e('p', { className: 'dss-price-note' }, t('price.threshold') + ': ' + (rule.contextThreshold >= 1000 ? (rule.contextThreshold / 1000) + 'k' : rule.contextThreshold)) : null,
    rule.tierMultipliers ? e('p', { className: 'dss-price-note' }, Object.entries(rule.tierMultipliers).map(([k, v]) => k + ' ×' + v).join(' · ')) : null,
    rule.effectiveFrom ? e('p', { className: 'dss-price-note' }, t('price.from') + ': ' + fmtBeijing(rule.effectiveFrom) + ' ' + t('price.beijing')) : null,
    rule.effectiveTo ? e('p', { className: 'dss-price-note' }, t('price.to') + ': ' + fmtBeijing(rule.effectiveTo) + ' ' + t('price.beijing')) : null,
    rule.observedFrom ? e('p', { className: 'dss-price-note' }, t('price.observed') + ': ' + fmtBeijing(rule.observedFrom) + ' ' + t('price.beijing')) : null);
}
function orderedRules(group) {
  return group.rules.slice().sort((a, b) => Number(b.phase === 'current') - Number(a.phase === 'current')
    || Date.parse(b.rule.effectiveFrom || b.rule.observedFrom || '1970-01-01') - Date.parse(a.rule.effectiveFrom || a.rule.observedFrom || '1970-01-01')
    || String(a.rule.id).localeCompare(String(b.rule.id)));
}
function RuleBlock({ row, t }) {
  const rule = row.rule;
  return e('article', { className: 'dss-price-rule-detail', 'data-rule-id': rule.id, 'data-phase': row.phase },
    e('div', { className: 'dss-price-rule-detail-head' },
      e('div', { className: 'dss-price-rule-tags' },
        e('span', { className: 'dss-price-phase' }, t('price.' + row.phase)),
        e('span', { className: 'dss-price-account' }, rule.accountType || t('price.accountUnspecified')),
        e('span', { className: 'dss-price-currency' }, rule.currency),
        isProvisional(rule) ? e('span', { className: 'dss-price-provisional' }, t('price.provisional')) : null),
      e('span', { className: 'dss-price-rule-id' }, rule.id)),
    ruleDetails(rule, t),
    e('div', { className: 'dss-price-rule-meta' },
      e('span', null, rule.currency + ' · ' + t('price.unitShort') + ' · ' + rule.retrievedAt),
      rule.sourceUrl ? e('a', { href: rule.sourceUrl, target: '_blank', rel: 'noreferrer', className: 'dss-price-source-link' }, t('price.source') + ' ↗') : null));
}
function summaryFor(group, t) {
  const summary = modelPriceSummary(group);
  if (summary.kind === 'flat') {
    const rule = summary.rule;
    return { main: formatQuickRates(t, rateText(rule.rates.uncached, rule.currency, t), rateText(rule.rates.output, rule.currency, t)),
      meta: rule.currency + ' · ' + (rule.accountType || t('price.accountUnspecified')) };
  }
  if (summary.kind === 'tiered') return { main: fill(t, 'price.tieredPrice', summary.currentCount), meta: '' };
  return { main: t('price.noCurrentPrice'),
    meta: summary.historicalCount || summary.upcomingCount ? fill(t, 'price.otherPeriodsCount', summary.historicalCount, summary.upcomingCount) : '' };
}
function ModelRow({ group, t, onOpen }) {
  const summary = summaryFor(group, t);
  const provisional = group.rules.some(row => isProvisional(row.rule));
  return e('button', { type: 'button', className: 'dss-price-model-row', 'data-model-key': group.key, onClick: () => onOpen(group.key) },
    e('span', { className: 'dss-price-model-identity' },
      e('span', { className: 'dss-price-model-line' },
        e('span', { className: 'dss-price-model-name' }, group.canonical),
        group.isUsed ? e('span', { className: 'dss-price-used-tag' }, t('price.inUse')) : null,
        provisional ? e('span', { className: 'dss-price-provisional' }, t('price.provisional')) : null),
      e('span', { className: 'dss-price-model-provider' }, group.provider)),
    e('span', { className: 'dss-price-model-summary' },
      e('span', { className: 'dss-price-model-price' }, summary.main),
      summary.meta ? e('span', { className: 'dss-price-model-meta' }, summary.meta) : null));
}
function PendingPanel({ missing, t, onConfigure }) {
  const [expanded, setExpanded] = React.useState(false);
  if (!missing.length) return null;
  const visible = expanded ? missing : missing.slice(0, 3);
  return e('section', { className: 'dss-price-pending', 'aria-label': t('price.missing') },
    e('div', { className: 'dss-price-pending-head' },
      e('h5', null, t('price.missing')),
      e('span', { role: 'status' }, fill(t, 'price.pendingCount', missing.length))),
    e('div', { className: 'dss-price-pending-list' }, visible.map(row => e('div', { key: row.provider + '/' + row.model, className: 'dss-price-pending-row' },
      e('span', { className: 'dss-price-pending-id' }, row.provider + ' / ' + row.model),
      e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-configure', onClick: () => onConfigure(row.provider, row.model) }, t('price.configure'))))),
    missing.length > 3 ? e('button', { type: 'button', className: 'dss-link-btn', 'data-action': 'price-pending-more', onClick: () => setExpanded(!expanded) },
      expanded ? t('price.showLess') : fill(t, 'price.showMorePending', missing.length - 3)) : null);
}
function SyncSummary({ status, busy, dirty, t, onRefresh }) {
  const last = status.lastSuccessAt ? fmtBeijing(status.lastSuccessAt) + ' ' + t('price.beijing') : t('price.builtin');
  return e('div', { className: 'dss-price-sync' },
    e('div', { className: 'dss-price-sync-line' },
      e('strong', null, t('price.currentCatalog') + ' ' + status.version),
      e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-refresh', disabled: busy || dirty,
        title: dirty ? t('price.saveFirst') : undefined, onClick: onRefresh }, t('price.checkUpdates'))),
    e('span', { className: 'dss-price-sync-last' }, t('price.updated') + ' ' + last));
}
function ModelList({ selection, scope, search, t, onScope, onSearch, onPage, onOpen, onClearSearch, onShowAll, listRef, titleRef, notice, hasUsed, catalogEmpty }) {
  const empty = selection.modelCount === 0;
  return e(React.Fragment, null,
    notice ? e('p', { className: 'dss-price-notice', role: 'status' }, notice) : null,
    e('input', { type: 'search', className: 'dss-price-search-input', value: search,
      onChange: ev => onSearch(ev.target.value), placeholder: t('price.search'), 'aria-label': t('price.search') }),
    e('div', { className: 'dss-price-scope', role: 'group', 'aria-label': t('price.sectionModels') },
      ['used', 'all'].map(value => e('button', { key: value, type: 'button',
        className: 'dss-price-scope-btn' + (scope === value ? ' is-on' : ''), 'aria-pressed': scope === value,
        'data-action': 'price-scope-' + value, onClick: () => onScope(value) },
      value === 'used' ? t('price.usedModels') : t('price.allModels')))),
    e('div', { className: 'dss-price-count', role: 'status', ref: titleRef, tabIndex: -1 },
      fill(t, 'price.modelCount', selection.modelCount) + ' · ' + fill(t, 'price.pricingRuleCount', selection.ruleCount)),
    !hasUsed && scope === 'all' && !catalogEmpty ? e('p', { className: 'dss-price-muted' }, t('price.noUsedModels')) : null,
    empty ? e('div', { className: 'dss-price-empty-state' },
      e('p', null, search.trim() ? t('price.noMatch') : scope === 'used' ? t('price.noUsedModels') : catalogEmpty ? t('price.emptyCatalog') : t('price.noMatch')),
      search.trim() ? e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-clear-search', onClick: onClearSearch }, t('price.clearSearch')) : null,
      scope === 'used' ? e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-scope-all', onClick: onShowAll }, t('price.showAllModels')) : null)
      : e('div', { className: 'dss-price-model-list', ref: listRef },
        selection.rows.map(group => e(ModelRow, { key: group.key, group, t, onOpen }))),
    selection.pageCount > 1 ? e('nav', { className: 'dss-price-pagination', 'aria-label': t('price.pages') },
      e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-prev-page', disabled: selection.page === 0, onClick: () => onPage(selection.page - 1) }, t('price.previous')),
      e('span', null, (selection.page + 1) + ' / ' + selection.pageCount),
      e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-next-page', disabled: selection.page + 1 >= selection.pageCount, onClick: () => onPage(selection.page + 1) }, t('price.next'))) : null);
}
function ModelDetail({ group, overrides, t, onBack, onAddCustom, onEditOverride, titleRef, otherOpen, onOtherToggle }) {
  const ordered = orderedRules(group);
  const current = ordered.filter(row => row.phase === 'current');
  const other = ordered.filter(row => row.phase !== 'current');
  const saved = overrides.filter(rule => rule.providerId === group.provider && rule.canonical === group.canonical);
  return e(React.Fragment, null,
    e('div', { className: 'dss-price-detail-head' },
      e('button', { type: 'button', className: 'dss-price-back', 'data-action': 'price-back-models', onClick: onBack }, '← ' + t('price.backToModels')),
      e('h4', { className: 'dss-price-detail-title', ref: titleRef, tabIndex: -1 }, group.provider + ' / ' + group.canonical),
      e('p', { className: 'dss-price-muted' }, t('price.catalogPrice') + ' · ' + t('price.unitShort'))),
    current.length ? current.map(row => e(RuleBlock, { key: row.rule.id, row, t }))
      : e('p', { className: 'dss-price-empty' }, t('price.noCurrentPrice'), other.length ? ' · ' + fill(t, 'price.otherPeriodsCount', group.rules.filter(row => row.phase === 'historical').length, group.rules.filter(row => row.phase === 'upcoming').length) : ''),
    other.length ? e('details', { className: 'dss-price-other-periods', open: otherOpen, onToggle: ev => onOtherToggle(ev.currentTarget.open) },
      e('summary', { 'data-action': 'price-other-periods' }, t('price.otherPeriodsTitle') + ' (' + other.length + ')'),
      otherOpen ? other.map(row => e(RuleBlock, { key: row.rule.id, row, t })) : null) : null,
    e('div', { className: 'dss-price-detail-actions' },
      e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-add-custom', onClick: () => onAddCustom(group.provider, group.canonical) }, t('price.addCustomForModel'))),
    saved.length ? e('section', { className: 'dss-price-saved' },
      e('h5', null, t('price.savedCustomRules')),
      saved.map(rule => e('button', { key: rule.id, type: 'button', className: 'dss-price-saved-row', 'data-action': 'price-edit-saved', onClick: () => onEditOverride(rule) },
        e('span', null, t('price.editSavedRule')), e('span', { className: 'dss-price-rule-id' }, rule.id)))) : null);
}
function CustomSection({ overrides, draft, busy, editingId, t, formRef, onEdit, onRemove, onAdd, onChange, conditionsOpen, onConditionsToggle }) {
  const field = (key, label, type = 'number') => e('label', { key, className: 'dss-price-field' }, label,
    e('input', { type, min: type === 'number' ? '0' : undefined, step: type === 'number' ? 'any' : undefined,
      value: draft[key], disabled: busy, onChange: ev => onChange(key, ev.target.value), 'aria-label': label }));
  return e(React.Fragment, null,
    e('h4', null, t('price.sectionCustom')),
    overrides.length ? overrides.map(rule => e('div', { key: rule.id, className: 'dss-price-custom-row', 'data-rule-id': rule.id },
      e('div', { className: 'dss-price-custom-id' },
        e('strong', null, rule.providerId + ' / ' + rule.canonical),
        e('span', null, rule.currency + ' · ' + (rule.accountType || t('price.accountUnspecified')))),
      e('div', { className: 'dss-price-custom-actions' },
        e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-edit-rule', disabled: busy, onClick: () => onEdit(rule) }, t('price.edit')),
        e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-remove-rule', disabled: busy, onClick: () => onRemove(rule) }, t('price.remove'))),
      e('details', null, e('summary', null, t('source.details')), ruleDetails(rule, t))))
      : e('p', { className: 'dss-price-muted' }, t('price.noCustomRules')),
    e('div', { className: 'dss-price-form', ref: formRef },
      e('h5', null, t(editingId ? 'price.editRule' : 'price.newRule')),
      e('p', { className: 'dss-price-muted' }, t('price.units')),
      e('div', { className: 'dss-price-grid' },
        field('provider', t('price.provider'), 'text'), field('model', t('price.model'), 'text'),
        e('label', { className: 'dss-price-field' }, t('price.currency'), e('select', { value: draft.currency, disabled: busy, onChange: ev => onChange('currency', ev.target.value) }, ['CNY', 'USD'].map(v => e('option', { key: v }, v)))),
        ...fields.map(k => field(k, t('price.' + k)))),
      e('details', { open: conditionsOpen, onToggle: ev => onConditionsToggle(ev.currentTarget.open) },
        e('summary', null, t('price.conditions')),
        e('p', { className: 'dss-price-muted' }, t('price.timesBeijing')),
        e('div', { className: 'dss-price-grid' }, field('from', t('price.from'), 'datetime-local'), field('to', t('price.to'), 'datetime-local'), field('threshold', t('price.threshold')),
          ...fields.map(k => field('long' + k[0].toUpperCase() + k.slice(1), t('price.long') + ' ' + t('price.' + k))),
          ...['priority', 'batch', 'flex'].map(k => field(k, k + ' ' + t('price.multiplier'))),
          e('label', { className: 'dss-price-field' }, t('price.accountType'), e('select', { value: draft.accountType, disabled: busy, onChange: ev => onChange('accountType', ev.target.value) }, ['api', 'relay', 'local'].map(v => e('option', { key: v }, v)))))),
      e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-stage-rule', disabled: busy, onClick: onAdd }, t(editingId ? 'price.replace' : 'price.add'))));
}
function UpdatesSection({ status, autoUpdate, busy, dirty, t, onAuto, onRefresh, onRollback }) {
  const snapshots = catalogSnapshotRows(status, Number.MAX_SAFE_INTEGER);
  const last = status.lastSuccessAt ? fmtBeijing(status.lastSuccessAt) + ' ' + t('price.beijing') : t('price.builtin');
  return e(React.Fragment, null,
    e('div', { className: 'dss-price-updates-current' },
      e('strong', null, t('price.currentVersion') + ' ' + status.version),
      e('span', null, t('price.updated') + ' ' + last)),
    e('label', { className: 'dss-price-auto' }, e('input', { type: 'checkbox', 'data-action': 'price-auto', checked: autoUpdate, disabled: busy, onChange: ev => onAuto(ev.target.checked) }), ' ', t('price.auto')),
    e('div', { className: 'dss-price-actions' },
      e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-refresh', disabled: busy || dirty,
        title: dirty ? t('price.saveFirst') : undefined, onClick: onRefresh }, t('price.checkUpdates'))),
    e('details', { className: 'dss-price-history-section' },
      e('summary', null, t('price.catalogSnapshots')),
      e('p', { className: 'dss-price-muted' }, t('price.rollbackHint')),
      snapshots.versions.length ? snapshots.versions.map(version => e('div', { key: version, className: 'dss-price-snapshot-row', 'data-version': version },
        e('span', null, String(version)),
        e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-rollback', disabled: busy || dirty, onClick: () => onRollback(version) }, t('price.rollback'))))
        : e('p', { className: 'dss-price-muted' }, t('price.noSnapshots'))));
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
        e('p', { role: 'alert' }, (t('price.renderError') || '计价设置渲染异常') + ': ' + (this.state.error?.message || 'unknown')),
        e('button', { type: 'button', className: 'dss-export', onClick: () => this.setState({ hasError: false, error: null }) }, t('price.retry') || '重试')
      );
    }
    return this.props.children;
  }
}
function PricingPanel({ remote, projects, onChanged, t, focusModel }) {
  const [status, setStatus] = React.useState(null), [busy, setBusy] = React.useState(false), [error, setError] = React.useState('');
  const [overrides, setOverrides] = React.useState([]), [draft, setDraft] = React.useState(blankDraft), [search, setSearch] = React.useState('');
  const [preview, setPreview] = React.useState(null), [autoUpdate, setAutoUpdate] = React.useState(true), [dirty, setDirty] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [section, setSection] = React.useState('models'), [scope, setScope] = React.useState(null);
  const [selectedKey, setSelectedKey] = React.useState(null), [modelNotice, setModelNotice] = React.useState('');
  const [otherOpen, setOtherOpen] = React.useState(false), [conditionsOpen, setConditionsOpen] = React.useState(false);
  const [page, setPage] = React.useState(0), [catalogAt, setCatalogAt] = React.useState(Date.now);
  const [statusTick, setStatusTick] = React.useState(0);
  const [focusTick, setFocusTick] = React.useState(0);
  const pendingFocusRef = React.useRef(null), focusAfterLocateRef = React.useRef(false), formRef = React.useRef(null);
  const listRef = React.useRef(null), listTitleRef = React.useRef(null), detailTitleRef = React.useRef(null);
  const restoreKeyRef = React.useRef(null), detailFocusRef = React.useRef(false), pageFocusRef = React.useRef(false);
  const focusListRef = React.useRef(false), footerFocusRef = React.useRef(false), scopeInitRef = React.useRef(false);
  const fail = err => setError(t(err?.message === 'pricing-settings-conflict' ? 'price.conflict' : 'price.failed'));
  function locateDraft(nextDraft) {
    if (!nextDraft) return false;
    setDraft(nextDraft);
    setEditingId(null);
    setSection('custom');
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
    setBusy(true); setError('');
    remote({ action: 'status' }).then(value => { if (!cancelled) accept(value); }).catch(err => { if (!cancelled) fail(err); }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [remote, statusTick]);
  React.useEffect(() => {
    const nextDraft = draftForFocus(focusModel);
    if (!nextDraft) { pendingFocusRef.current = null; return; }
    setSection('custom');
    if (status) locateDraft(nextDraft);
    else pendingFocusRef.current = focusModel;
  }, [focusModel?.nonce]);
  React.useEffect(() => {
    if (!focusAfterLocateRef.current || section !== 'custom' || !formRef.current) return;
    focusAfterLocateRef.current = false;
    formRef.current.scrollIntoView({ block: 'nearest' });
    const input = formRef.current.querySelector('input');
    if (input) input.focus();
  }, [section, draft.provider, draft.model, focusTick]);
  const catalog = React.useMemo(() => status ? pricing.validateCatalog(JSON.parse(status.catalogJson)) : null, [status?.catalogJson]);
  const used = React.useMemo(() => usedModelKeys(projects, catalog), [projects, catalog]);
  const groups = React.useMemo(() => catalogGroups(catalog, used, catalogAt), [catalog, used, catalogAt]);
  const effectiveScope = scope || (used.size ? 'used' : 'all');
  const selection = React.useMemo(() => selectModelGroups(groups, { search, scope: effectiveScope, page, pageSize: PAGE_SIZE }), [groups, search, effectiveScope, page]);
  const selectedGroup = selectedKey ? groups.find(group => group.key === selectedKey) : null;
  const missing = React.useMemo(() => missingModels(projects), [projects]);
  React.useEffect(() => {
    if (!status || scopeInitRef.current) return;
    scopeInitRef.current = true;
    setScope(used.size ? 'used' : 'all');
  }, [status, used.size]);
  React.useEffect(() => {
    if (!detailFocusRef.current || !selectedKey) return;
    detailFocusRef.current = false;
    if (detailTitleRef.current) detailTitleRef.current.focus();
  }, [selectedKey]);
  React.useEffect(() => {
    if (selectedKey !== null || !restoreKeyRef.current) return;
    const key = restoreKeyRef.current;
    restoreKeyRef.current = null;
    const list = listRef.current;
    const row = list ? [...list.querySelectorAll('[data-model-key]')].find(node => node.dataset.modelKey === key) : null;
    if (row) { row.focus(); row.scrollIntoView({ block: 'nearest' }); }
  }, [selectedKey, page, effectiveScope, search]);
  React.useEffect(() => {
    if (!pageFocusRef.current) return;
    pageFocusRef.current = false;
    const list = listRef.current;
    const row = list ? list.querySelector('[data-model-key]') : null;
    if (row) row.focus();
    else if (listTitleRef.current) listTitleRef.current.focus();
  }, [page]);
  React.useEffect(() => {
    if (!focusListRef.current) return;
    focusListRef.current = false;
    const list = listRef.current;
    const row = list ? list.querySelector('[data-model-key]') : null;
    if (row) row.focus();
    else if (listTitleRef.current) listTitleRef.current.focus();
  }, [selectedKey, page]);
  React.useEffect(() => {
    if (!status || !selectedKey || groups.some(group => group.key === selectedKey)) return;
    setSelectedKey(null);
    setModelNotice(t('price.modelGone'));
    focusListRef.current = true;
  }, [groups, selectedKey, status]);
  React.useEffect(() => {
    if (dirty || !footerFocusRef.current) return;
    footerFocusRef.current = false;
    const node = document.querySelector('[data-action="price-section-' + section + '"]');
    if (node) node.focus();
  }, [dirty, section]);
  function edit(key, value) { setDraft(old => ({ ...old, [key]: value })); setPreview(null); }
  function add() {
    try {
      const rule = draftRule(draft, overrides);
      const next = [...overrides.filter(r => r.id !== editingId), rule]; pricing.validateOverrides(next);
      setOverrides(next); setDraft(blankDraft()); setEditingId(null); setPreview(null); setDirty(true); setError('');
    } catch { setError(t('price.invalid')); }
  }
  function openModel(key) { detailFocusRef.current = true; setModelNotice(''); setOtherOpen(false); setSelectedKey(key); }
  function backToModels() { if (!selectedKey) return; restoreKeyRef.current = selectedKey; setSelectedKey(null); }
  function changePage(next) { pageFocusRef.current = true; setPage(next); }
  function changeSearch(value) { setSearch(value); setPage(0); setModelNotice(''); }
  function changeScope(next) { setScope(next); setPage(0); setModelNotice(''); }
  function openSavedRule(rule) {
    setDraft(ruleDraft(rule)); setEditingId(rule.id); setPreview(null); setSection('custom');
    setFocusTick(n => n + 1); focusAfterLocateRef.current = true;
  }
  function removeRule(rule) { setOverrides(overrides.filter(r => r.id !== rule.id)); setDirty(true); setPreview(null); }
  function discard() { footerFocusRef.current = true; accept(status); }
  function save() { footerFocusRef.current = true; call({ action: 'save', fingerprint: preview.fingerprint, revision: status.revision, autoUpdate, overridesJson: JSON.stringify(overrides) }); }
  const amount = summary => summary?.totals?.map(row => row.currency + ' ' + row.amount.toFixed(4)).join(' + ') || t('pricing.pending');
  const button = (label, onClick, disabled = false, action) => e('button', { type: 'button', className: 'dss-export', 'data-action': action, disabled: busy || disabled, onClick }, label);
  const sections = [['models', 'sectionModels'], ['custom', 'sectionCustom'], ['updates', 'sectionUpdates']];
  const sectionContent = section === 'models'
    ? (selectedGroup
      ? e(ModelDetail, { group: selectedGroup, overrides, t, onBack: backToModels, onAddCustom: locate, onEditOverride: openSavedRule, titleRef: detailTitleRef, otherOpen, onOtherToggle: setOtherOpen })
      : e(React.Fragment, null,
        e(SyncSummary, { status, busy, dirty, t, onRefresh: () => call({ action: 'refresh' }) }),
        e(PendingPanel, { missing, t, onConfigure: locate }),
        e(ModelList, { selection, scope: effectiveScope, search, t, onScope: changeScope, onSearch: changeSearch, onPage: changePage,
          onOpen: openModel, onClearSearch: () => changeSearch(''), onShowAll: () => changeScope('all'), listRef, titleRef: listTitleRef, notice: modelNotice, hasUsed: used.size > 0, catalogEmpty: groups.length === 0 })))
    : section === 'custom'
      ? e(CustomSection, { overrides, draft, busy, editingId, t, formRef, onEdit: openSavedRule, onRemove: removeRule, onAdd: add, onChange: edit, conditionsOpen, onConditionsToggle: setConditionsOpen })
      : e(UpdatesSection, { status, autoUpdate, busy, dirty, t, onAuto: value => { setAutoUpdate(value); setDirty(true); setPreview(null); },
        onRefresh: () => call({ action: 'refresh' }), onRollback: version => call({ action: 'rollback', version, revision: status.revision }) });
  const bodyContent = !status
    ? e('div', { className: 'dss-price-state' },
      e('p', null, busy ? t('price.loading') : t('price.unavailable')),
      !busy && remote && error ? e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-retry-status', onClick: () => setStatusTick(n => n + 1) }, t('price.retry')) : null)
    : e(React.Fragment, null,
      status.error ? e('div', { className: 'dss-price-status-error', role: 'status' }, t('price.refreshFailed'),
        e('details', null, e('summary', null, t('source.details')), status.error)) : null,
      sectionContent);
  const commit = dirty ? e('div', { className: 'dss-price-commit' },
    preview ? e('p', { className: 'dss-price-preview', role: 'status' }, t('price.affected') + ' ' + preview.changed.length + ' · ' + amount(preview.before) + ' → ' + amount(preview.after)) : null,
    e('div', { className: 'dss-price-actions' },
      button(t('price.preview'), () => call({ action: 'preview', overridesJson: JSON.stringify(overrides) }, 'preview'), false, 'price-preview'),
      button(t('price.save'), save, !preview, 'price-save'),
      button(t('price.cancel'), discard, false, 'price-discard'))) : null;
  return e('section', { className: 'dss-pricing', 'aria-label': t('price.title'), 'aria-busy': busy },
    e('div', { className: 'dss-price-nav', role: 'group', 'aria-label': t('price.sections') },
      sections.map(([name, key]) => e('button', { key: name, type: 'button', className: 'dss-price-nav-btn' + (section === name ? ' is-on' : ''),
        'aria-pressed': section === name, 'data-action': 'price-section-' + name, onClick: () => setSection(name) }, t('price.' + key)))),
    e('div', { className: 'dss-drawer-body' }, error ? e('p', { role: 'alert' }, error) : null, bodyContent),
    commit);
}
module.exports = { PricingPanel, PricingErrorBoundary, ModelList, ModelDetail, draftRule, draftForFocus, missingModels, blankDraft, ruleDraft, fmtBeijing };
