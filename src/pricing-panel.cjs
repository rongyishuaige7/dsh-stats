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
const DRAFT_KEYS = Object.keys(blankDraft());
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
function fillText(t, key, ...values) {
  let text = t(key);
  for (const value of values) text = text.replace('%s', String(value));
  return text;
}
function timeText(value, t, fallback) {
  const text = value ? fmtBeijing(value) : '';
  return text ? text + ' ' + t('price.beijing') : fallback;
}
function formatQuickRates(t, inVal, outVal) {
  const tpl = t('price.quickRates');
  if (typeof tpl === 'string' && tpl.includes('%s')) return tpl.replace('%s', inVal).replace('%s', outVal);
  return '输入 ' + inVal + ' / 输出 ' + outVal;
}
function rateText(value, currency, t) {
  return value == null ? t('price.unknown') : fmtRateValue(value, currency);
}
function draftEqual(a, b) {
  return DRAFT_KEYS.every(key => String(a?.[key] ?? '') === String(b?.[key] ?? ''));
}
function rulesEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const byId = new Map(b.map(rule => [rule.id, rule]));
  return a.every(rule => {
    const other = byId.get(rule.id);
    return !!other && JSON.stringify(rule) === JSON.stringify(other);
  });
}
function ruleHasConditions(rule) {
  return !!(rule.contextTiers || rule.timeOfUse || rule.legacy || rule.serviceTiers
    || rule.effectiveFrom || rule.effectiveTo || rule.contextThreshold != null
    || rule.tierMultipliers && Object.values(rule.tierMultipliers).some(value => value !== 1)
    || rule.accountType && rule.accountType !== 'api');
}
function draftHasConditions(draft) {
  return !!(draft.from || draft.to || draft.threshold !== ''
    || fields.some(key => draft['long' + key[0].toUpperCase() + key.slice(1)].trim() !== '')
    || ['priority', 'batch', 'flex'].some(key => draft[key].trim() !== '')
    || draft.accountType !== 'api');
}
function rateTypeLabel(rule, t) {
  if (rule.contextTiers) return t('price.typeContext');
  if (rule.serviceTiers) return t('price.typeService');
  if (rule.timeOfUse) return t('price.typeTime');
  if (rule.legacy) return t('price.typeLegacy');
  return t('price.typeRates');
}
function thresholdLabel(value) {
  return value >= 1000 ? (value / 1000) + 'k' : String(value);
}
function conditionSummary(rule, t) {
  const parts = [];
  if (rule.effectiveFrom) parts.push(t('price.from') + ': ' + fmtBeijing(rule.effectiveFrom));
  if (rule.effectiveTo) parts.push(t('price.to') + ': ' + fmtBeijing(rule.effectiveTo));
  if (rule.contextThreshold != null) parts.push(t('price.threshold') + ': ' + thresholdLabel(rule.contextThreshold));
  if (rule.tierMultipliers) {
    const multipliers = Object.entries(rule.tierMultipliers).filter(([, value]) => value !== 1);
    if (multipliers.length) parts.push(multipliers.map(([key, value]) => key + ' ×' + value).join(' · '));
  }
  if (rule.accountType && rule.accountType !== 'api') parts.push(t('price.accountType') + ': ' + rule.accountType);
  if (rule.timeOfUse) parts.push(t('price.peak') + ' / ' + t('price.offPeak'));
  if (rule.legacy) parts.push(t('price.legacy'));
  return parts.length ? parts.join(' · ') : t('price.noConditions');
}
function workingForSaved(working, origins, savedId) {
  const direct = working.find(rule => rule.id === savedId);
  if (direct) return direct;
  for (const [workingId, origin] of origins) if (origin === savedId) return working.find(rule => rule.id === workingId) || null;
  return null;
}
function customRuleRows(working, saved, origins, removed) {
  const savedIds = new Set(saved.map(rule => rule.id));
  const rows = working.map(rule => ({
    rule,
    isSaved: savedIds.has(rule.id),
    pendingRemove: false,
    savedId: origins.get(rule.id) || (savedIds.has(rule.id) ? rule.id : null),
  }));
  for (const [savedId, rule] of removed) rows.push({ rule, isSaved: true, pendingRemove: true, savedId });
  return rows;
}
function settingsSignature(overrides, autoUpdate) {
  return JSON.stringify(overrides) + '\u0000' + String(autoUpdate);
}
function previewMatchesDraft(preview, signature, version) {
  return !!preview && preview.signature === signature && preview.version === version;
}
function buildPreviewRequest(overrides) {
  return { action: 'preview', overridesJson: JSON.stringify(overrides) };
}
function buildSaveRequest({ overrides, autoUpdate, fingerprint, revision }) {
  return { action: 'save', overridesJson: JSON.stringify(overrides), autoUpdate, fingerprint, revision };
}
function isProvisional(rule) {
  return typeof rule.note === 'string' && rule.note.startsWith('[provisional]');
}
function ruleDetails(rule, t) {
  const note = isProvisional(rule) ? rule.note.slice('[provisional]'.length).trim() : rule.note;
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
    note ? e('p', { className: 'dss-price-note' }, note) : null,
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
function PendingPanel({ missing, t, busy, onConfigure }) {
  const [expanded, setExpanded] = React.useState(false);
  if (!missing.length) return null;
  const visible = expanded ? missing : missing.slice(0, 3);
  return e('section', { className: 'dss-price-pending', 'aria-label': t('price.missing') },
    e('div', { className: 'dss-price-pending-head' },
      e('h5', null, t('price.missing')),
      e('span', { role: 'status' }, fill(t, 'price.pendingCount', missing.length))),
    e('div', { className: 'dss-price-pending-list' }, visible.map(row => e('div', { key: row.provider + '/' + row.model, className: 'dss-price-pending-row' },
      e('span', { className: 'dss-price-pending-id' }, row.provider + ' / ' + row.model),
      e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-configure', disabled: busy, onClick: () => onConfigure(row.provider, row.model) }, t('price.configure'))))),
    missing.length > 3 ? e('button', { type: 'button', className: 'dss-link-btn', 'data-action': 'price-pending-more', onClick: () => setExpanded(!expanded) },
      expanded ? t('price.showLess') : fill(t, 'price.showMorePending', missing.length - 3)) : null);
}
function SyncSummary({ status, busy, dirty, pinned, checking, t, onRefresh }) {
  const last = status.lastSuccessAt ? timeText(status.lastSuccessAt, t, t('price.builtinNoSync')) : t('price.builtinNoSync');
  const title = pinned ? t('price.pinnedHint') : dirty ? t('price.saveFirst') : undefined;
  return e('div', { className: 'dss-price-sync' },
    e('div', { className: 'dss-price-sync-line' },
      e('strong', null, t('price.currentCatalog') + ' ' + status.version + (pinned ? ' · ' + t('price.pinnedShort') : '')),
      e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-refresh', disabled: busy || dirty || pinned,
        title, onClick: onRefresh }, checking ? t('price.checking') : t('price.checkUpdates'))),
    e('span', { className: 'dss-price-sync-last' }, t('price.lastSuccess') + ': ' + last));
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
function ModelDetail({ group, savedOverrides, t, busy, onBack, onAddCustom, onEditOverride, titleRef, otherOpen, onOtherToggle }) {
  const ordered = orderedRules(group);
  const current = ordered.filter(row => row.phase === 'current');
  const other = ordered.filter(row => row.phase !== 'current');
  const saved = savedOverrides.filter(rule => rule.providerId === group.provider && rule.canonical === group.canonical);
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
      e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-add-custom', disabled: busy, onClick: () => onAddCustom(group.provider, group.canonical) }, t('price.addCustomForModel'))),
    saved.length ? e('section', { className: 'dss-price-saved' },
      e('h5', null, t('price.savedCustomRules')),
      saved.map(rule => e('button', { key: rule.id, type: 'button', className: 'dss-price-saved-row', 'data-action': 'price-edit-saved', disabled: busy, onClick: () => onEditOverride(rule) },
        e('span', null, t('price.editSavedRule')), e('span', { className: 'dss-price-rule-id' }, rule.id)))) : null);
}
function CustomRuleRow({ row, t, busy, expanded, onToggleExpand, onEdit, onRemove, onUndo }) {
  const rule = row.rule;
  const ruleId = row.pendingRemove ? row.savedId : rule.id;
  return e('div', { className: 'dss-price-custom-row' + (row.pendingRemove ? ' is-pending-remove' : ''), 'data-rule-id': ruleId, 'data-saved-id': row.savedId || undefined },
    e('div', { className: 'dss-price-custom-main' },
      e('div', { className: 'dss-price-custom-id' },
        e('strong', null, rule.providerId + ' / ' + rule.canonical),
        e('span', { className: 'dss-price-custom-meta' },
          rule.currency + ' · ' + rateTypeLabel(rule, t),
          !row.isSaved && !row.pendingRemove ? e('span', { className: 'dss-price-unsaved' }, t('price.unsaved')) : null,
          row.pendingRemove ? e('span', { className: 'dss-price-pending-remove' }, t('price.pendingRemove')) : null)),
      e('div', { className: 'dss-price-custom-actions' },
        row.pendingRemove
          ? e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-undo-remove', disabled: busy, onClick: () => onUndo(row.savedId) }, t('price.undoRemove'))
          : [
            e('button', { key: 'edit', type: 'button', className: 'dss-export', 'data-action': 'price-edit-rule', disabled: busy, onClick: () => onEdit(rule, row.savedId) }, t('price.edit')),
            e('button', { key: 'remove', type: 'button', className: 'dss-export', 'data-action': 'price-remove-rule', disabled: busy, onClick: () => onRemove(rule, row.savedId) }, t('price.remove')),
          ])),
    e('p', { className: 'dss-price-condition-summary' }, conditionSummary(rule, t)),
    e('details', { open: expanded, onToggle: ev => onToggleExpand(rule.id, ev.currentTarget.open) },
      e('summary', null, t('price.ruleDetailsTitle')),
      ruleDetails(rule, t),
      row.pendingRemove ? e('p', { className: 'dss-price-note' }, t('price.pendingRemoveHint')) : null));
}
function CustomList({ rows, t, busy, editorDirty, editorNotice, deferredFocus, expandedIds, headingRef, onAdd, onContinue, onEdit, onRemove, onUndo, onLocateDeferred, onToggleExpand }) {
  return e(React.Fragment, null,
    e('div', { className: 'dss-price-custom-head' },
      e('h4', { ref: headingRef, tabIndex: -1 }, t('price.sectionCustom')),
      e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-add-rule', disabled: busy, onClick: onAdd }, t('price.addRule'))),
    editorDirty ? e('div', { className: 'dss-price-editor-notice', role: 'status' },
      e('span', null, editorNotice || t('price.editorDirtyHint')),
      e('button', { type: 'button', className: 'dss-link-btn', 'data-action': 'price-continue-editing', disabled: busy, onClick: onContinue }, t('price.continueEditing'))) : null,
    !editorDirty && deferredFocus ? e('div', { className: 'dss-price-editor-notice', role: 'status' },
      e('span', null, fillText(t, 'price.deferredFocusHint', deferredFocus.provider, deferredFocus.model)),
      e('button', { type: 'button', className: 'dss-link-btn', 'data-action': 'price-locate-deferred', onClick: onLocateDeferred }, t('price.locateDeferred'))) : null,
    !editorDirty && !deferredFocus && editorNotice ? e('p', { className: 'dss-price-notice', role: 'status' }, editorNotice) : null,
    rows.length ? e('div', { className: 'dss-price-custom-list' }, rows.map(row => e(CustomRuleRow, {
      key: row.pendingRemove ? 'removed:' + row.savedId : row.rule.id, row, t, busy, expanded: expandedIds.has(row.rule.id),
      onToggleExpand, onEdit, onRemove, onUndo,
    }))) : e('p', { className: 'dss-price-muted' }, t('price.noCustomRules')));
}
function CustomEditor({ draft, editingId, editorDirty, busy, conditionsOpen, t, formRef, onChange, onStage, onCancel, onBack, onConditionsToggle }) {
  const field = (key, label, type = 'number') => e('label', { key, className: 'dss-price-field' }, label,
    e('input', { type, min: type === 'number' ? '0' : undefined, step: type === 'number' ? 'any' : undefined,
      value: draft[key], disabled: busy, onChange: ev => onChange(key, ev.target.value), 'aria-label': label }));
  const conditionsSet = draftHasConditions(draft);
  return e(React.Fragment, null,
    e('div', { className: 'dss-price-editor-head' },
      e('button', { type: 'button', className: 'dss-price-back', 'data-action': 'price-back-custom-list', onClick: onBack }, '← ' + t('price.backToCustomList')),
      e('h4', null, t(editingId ? 'price.editRule' : 'price.newRule'))),
    e('div', { className: 'dss-price-form', ref: formRef },
      e('div', { className: 'dss-price-grid' },
        field('provider', t('price.provider'), 'text'), field('model', t('price.model'), 'text'),
        e('label', { className: 'dss-price-field' }, t('price.currency'), e('select', { value: draft.currency, disabled: busy, 'aria-label': t('price.currency'), onChange: ev => onChange('currency', ev.target.value) }, ['CNY', 'USD'].map(v => e('option', { key: v }, v)))),
        ...fields.map(k => field(k, t('price.' + k)))),
      e('p', { className: 'dss-price-muted' }, t('price.unitsShort')),
      e('details', { open: conditionsOpen, onToggle: ev => onConditionsToggle(ev.currentTarget.open) },
        e('summary', { 'data-action': 'price-toggle-conditions' }, t('price.conditions'), conditionsSet ? e('span', { className: 'dss-price-conditions-set' }, t('price.conditionsSet')) : null),
        e('p', { className: 'dss-price-muted' }, t('price.timesBeijing') + ' · ' + t('price.timeHint')),
        e('div', { className: 'dss-price-grid' }, field('from', t('price.from'), 'datetime-local'), field('to', t('price.to'), 'datetime-local'), field('threshold', t('price.threshold')),
          ...fields.map(k => field('long' + k[0].toUpperCase() + k.slice(1), t('price.long') + ' ' + t('price.' + k))),
          ...['priority', 'batch', 'flex'].map(k => field(k, k + ' ' + t('price.multiplier'))),
          e('label', { className: 'dss-price-field' }, t('price.accountType'), e('select', { value: draft.accountType, disabled: busy, 'aria-label': t('price.accountType'), onChange: ev => onChange('accountType', ev.target.value) }, ['api', 'relay', 'local'].map(v => e('option', { key: v }, v)))))),
      e('div', { className: 'dss-price-editor-actions' },
        e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-stage-rule', disabled: busy || (editingId && !editorDirty), onClick: onStage }, t(editingId ? 'price.replace' : 'price.add')),
        e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-cancel-editor', disabled: busy, onClick: onCancel }, t('price.cancelEditor')))));
}

function UpdatesSection({ status, autoUpdate, busy, dirty, pinned, checking, snapshotLimit, t, historyRef, onAuto, onRefresh, onRollback, onShowMore }) {
  const snapshots = catalogSnapshotRows(status, snapshotLimit);
  const autoDirty = autoUpdate !== status.autoUpdate;
  const published = timeText(status.publishedAt, t, t('price.unknown'));
  const lastCheck = status.lastCheckAt ? timeText(status.lastCheckAt, t, t('price.neverChecked')) : t('price.neverChecked');
  const lastSuccess = status.lastSuccessAt ? timeText(status.lastSuccessAt, t, t('price.builtinNoSync')) : t('price.builtinNoSync');
  const refreshTitle = pinned ? t('price.pinnedHint') : dirty ? t('price.saveFirst') : undefined;
  return e('div', { className: 'dss-price-updates' },
    e('section', { className: 'dss-price-updates-block' },
      e('h4', null, t('price.currentVersion')),
      e('div', { className: 'dss-price-updates-current' },
        e('strong', null, String(status.version)),
        e('span', null, t('price.publishedAt') + ': ' + published),
        e('span', { className: 'dss-price-pinned' + (pinned ? ' is-on' : '') }, pinned ? t('price.pinnedVersion') + ' ' + status.pinnedVersion : t('price.notPinned')))),
    e('section', { className: 'dss-price-updates-block' },
      e('h4', null, t('price.syncTitle')),
      e('div', { className: 'dss-price-sync-times' },
        e('span', null, t('price.lastCheck') + ': ' + lastCheck),
        e('span', null, t('price.lastSuccess') + ': ' + lastSuccess)),
      status.error ? e('div', { className: 'dss-price-status-error', role: 'status' }, t('price.refreshFailed'),
        e('details', null, e('summary', null, t('source.details')), status.error)) : null,
      e('label', { className: 'dss-price-auto' },
        e('input', { type: 'checkbox', 'data-action': 'price-auto', checked: autoUpdate, disabled: busy, onChange: ev => onAuto(ev.target.checked) }),
        ' ', t('price.auto'),
        autoDirty ? e('span', { className: 'dss-price-unsaved' }, t('price.pendingSave')) : null),
      e('p', { className: 'dss-price-muted' }, t('price.autoHint')),
      pinned ? e('p', { className: 'dss-price-muted' }, t('price.pinnedHint')) : !status.autoUpdate ? e('p', { className: 'dss-price-muted' }, t('price.manualHint')) : null,
      e('div', { className: 'dss-price-actions' },
        e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-refresh', disabled: busy || dirty || pinned,
          title: refreshTitle, onClick: onRefresh }, checking ? t('price.checking') : t('price.checkUpdates')))),
    e('section', { className: 'dss-price-history-section' },
      e('h4', { ref: historyRef, tabIndex: -1 }, t('price.catalogSnapshots')),
      e('p', { className: 'dss-price-muted' }, t('price.snapshotHint')),
      snapshots.versions.length ? e('div', { className: 'dss-price-snapshot-list' },
        snapshots.versions.map((version, index) => e('div', { key: version, className: 'dss-price-snapshot-row', 'data-version': version, 'data-snapshot-index': index, tabIndex: -1 },
          e('span', null, String(version)),
          e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-rollback', disabled: busy || dirty,
            title: dirty ? t('price.saveFirst') : undefined, onClick: () => onRollback(version) }, t('price.rollback')))))
        : e('p', { className: 'dss-price-muted' }, t('price.noSnapshots')),
      snapshots.hasMore ? e('button', { type: 'button', className: 'dss-link-btn', 'data-action': 'price-snapshots-more', onClick: onShowMore },
        fill(t, 'price.showMoreSnapshots', snapshots.total - snapshots.versions.length)) : null));
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
  const [workingOverrides, setWorkingOverrides] = React.useState([]), [savedOverrides, setSavedOverrides] = React.useState([]);
  const [draft, setDraft] = React.useState(blankDraft), [editorBaseline, setEditorBaseline] = React.useState(blankDraft);
  const [editingId, setEditingId] = React.useState(null), [editingSavedId, setEditingSavedId] = React.useState(null), [editorOpen, setEditorOpen] = React.useState(false);
  const [conditionsOpen, setConditionsOpen] = React.useState(false);
  const [workingOrigins, setWorkingOrigins] = React.useState(() => new Map());
  const [removedRules, setRemovedRules] = React.useState(() => new Map());
  const [expandedRuleIds, setExpandedRuleIds] = React.useState(() => new Set());
  const [editorNotice, setEditorNotice] = React.useState(''), [deferredFocus, setDeferredFocus] = React.useState(null);
  const [preview, setPreview] = React.useState(null), [previewing, setPreviewing] = React.useState(false), [autoUpdateDraft, setAutoUpdateDraft] = React.useState(true);
  const [checking, setChecking] = React.useState(false), [snapshotLimit, setSnapshotLimit] = React.useState(5);
  const [search, setSearch] = React.useState('');
  const [section, setSection] = React.useState('models'), [scope, setScope] = React.useState(null);
  const [selectedKey, setSelectedKey] = React.useState(null), [modelNotice, setModelNotice] = React.useState('');
  const [otherOpen, setOtherOpen] = React.useState(false);
  const [page, setPage] = React.useState(0), [catalogAt, setCatalogAt] = React.useState(Date.now);
  const [statusTick, setStatusTick] = React.useState(0);
  const [focusTick, setFocusTick] = React.useState(0);
  const pendingFocusRef = React.useRef(null), focusAfterLocateRef = React.useRef(false), formRef = React.useRef(null);
  const listRef = React.useRef(null), listTitleRef = React.useRef(null), detailTitleRef = React.useRef(null), customHeadingRef = React.useRef(null);
  const restoreKeyRef = React.useRef(null), detailFocusRef = React.useRef(false), pageFocusRef = React.useRef(false);
  const focusListRef = React.useRef(false), footerFocusRef = React.useRef(false), scopeInitRef = React.useRef(false), customFocusRef = React.useRef(false);
  const mountedRef = React.useRef(true), busyRef = React.useRef(false), draftVersionRef = React.useRef(0);
  const snapshotFocusRef = React.useRef(false), snapshotFocusIndexRef = React.useRef(0), historyHeadingRef = React.useRef(null), rollbackFocusRef = React.useRef(false);
  React.useEffect(() => () => { mountedRef.current = false; }, []);
  function markDraftChanged() { draftVersionRef.current += 1; }
  const editorDirty = !draftEqual(draft, editorBaseline);
  const settingsDirty = !!status && (autoUpdateDraft !== status.autoUpdate || removedRules.size > 0 || !rulesEqual(workingOverrides, savedOverrides));
  const anyDirty = editorDirty || settingsDirty;
  const customRows = customRuleRows(workingOverrides, savedOverrides, workingOrigins, removedRules);
  const pinned = !!status && status.pinnedVersion !== null;
  const fail = err => { setError(t(err?.message === 'pricing-settings-conflict' ? 'price.conflict' : 'price.failed')); setPreview(null); rollbackFocusRef.current = false; };
  function openEditor(nextDraft, nextEditingId, baseline, conditions, nextSavedId = null) {
    setDraft(nextDraft); setEditingId(nextEditingId); setEditingSavedId(nextSavedId); setEditorBaseline(baseline);
    setEditorOpen(true); setConditionsOpen(conditions); setSection('custom'); setEditorNotice(''); setError('');
    setFocusTick(n => n + 1); focusAfterLocateRef.current = true;
  }
  function closeEditor() {
    setDraft(blankDraft()); setEditingId(null); setEditingSavedId(null); setEditorBaseline(blankDraft());
    setEditorOpen(false); setConditionsOpen(false); setEditorNotice(''); focusAfterLocateRef.current = false;
  }
  function accept(result) {
    markDraftChanged();
    pricing.validateCatalog(JSON.parse(result.catalogJson));
    const rules = pricing.validateOverrides(JSON.parse(result.overridesJson));
    const pendingDraft = draftForFocus(pendingFocusRef.current);
    pendingFocusRef.current = null;
    setStatus(result); setWorkingOverrides(rules); setSavedOverrides(rules);
    setAutoUpdateDraft(result.autoUpdate); setWorkingOrigins(new Map()); setRemovedRules(new Map()); setEditingSavedId(null); setExpandedRuleIds(new Set());
    setPreview(null); setEditorNotice(''); setError(''); setDeferredFocus(null); setSnapshotLimit(5); setCatalogAt(Date.now());
    focusAfterLocateRef.current = false; customFocusRef.current = false;
    setEditorOpen(false); setDraft(blankDraft()); setEditingId(null); setEditorBaseline(blankDraft()); setConditionsOpen(false);
    if (pendingDraft) openEditor(pendingDraft, null, pendingDraft, false);
  }
  async function call(request, mode = 'commit', previewMeta = null) {
    if (busyRef.current) return;
    const refreshing = request.action === 'refresh';
    busyRef.current = true; setBusy(true); if (refreshing) setChecking(true); if (mode === 'preview') setPreviewing(true); setError('');
    try {
      const result = await remote(request);
      if (!mountedRef.current) {
        if (mode !== 'preview' && request.action !== 'status') onChanged();
        return;
      }
      if (mode === 'preview') {
        if (!previewMeta || draftVersionRef.current !== previewMeta.version) return;
        setPreview({ ...JSON.parse(result.previewJson), fingerprint: result.fingerprint,
          version: previewMeta.version, signature: previewMeta.signature });
      } else { accept(result); if (request.action !== 'status') onChanged(); }
    } catch (err) { if (mountedRef.current) fail(err); }
    finally { busyRef.current = false; if (mountedRef.current) { setBusy(false); if (mode === 'preview') setPreviewing(false); if (refreshing) setChecking(false); } }
  }
  React.useEffect(() => {
    let cancelled = false;
    if (!remote) { setError(t('price.unavailable')); return; }
    busyRef.current = true; setBusy(true); setError('');
    remote({ action: 'status' }).then(value => { if (!cancelled) accept(value); }).catch(err => { if (!cancelled) fail(err); }).finally(() => { busyRef.current = false; if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [remote, statusTick]);
  React.useEffect(() => {
    const nextDraft = draftForFocus(focusModel);
    if (!nextDraft) { pendingFocusRef.current = null; return; }
    setSection('custom');
    if (!status) { pendingFocusRef.current = focusModel; return; }
    requestFocusDraft(nextDraft, focusModel);
  }, [focusModel?.nonce]);
  React.useEffect(() => {
    if (!focusAfterLocateRef.current || !editorOpen || !formRef.current) return;
    focusAfterLocateRef.current = false;
    formRef.current.scrollIntoView({ block: 'nearest' });
    const input = formRef.current.querySelector('input');
    if (input) input.focus();
  }, [editorOpen, draft.provider, draft.model, focusTick]);
  React.useEffect(() => {
    if (editorDirty && preview) setPreview(null);
  }, [editorDirty, preview]);
  React.useEffect(() => {
    if (!settingsDirty && preview) setPreview(null);
  }, [settingsDirty, preview]);
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
    if (!snapshotFocusRef.current) return;
    snapshotFocusRef.current = false;
    const row = document.querySelector('[data-snapshot-index="' + snapshotFocusIndexRef.current + '"]');
    if (row) row.focus();
    else if (historyHeadingRef.current) historyHeadingRef.current.focus();
  }, [snapshotLimit]);
  React.useEffect(() => {
    if (!rollbackFocusRef.current) return;
    rollbackFocusRef.current = false;
    if (historyHeadingRef.current) historyHeadingRef.current.focus();
  }, [status?.version, status?.revision, status?.pinnedVersion]);
  React.useEffect(() => {
    if (!customFocusRef.current || editorOpen) return;
    customFocusRef.current = false;
    const node = document.querySelector('[data-action=price-add-rule]') || customHeadingRef.current;
    if (node) node.focus();
  }, [editorOpen, workingOverrides, removedRules]);
  React.useEffect(() => {
    if (anyDirty || !footerFocusRef.current) return;
    footerFocusRef.current = false;
    const node = section === 'custom'
      ? document.querySelector('[data-action=price-add-rule]')
      : document.querySelector('[data-action="price-section-' + section + '"]');
    if (node) node.focus();
  }, [anyDirty, section]);
  function requestFocusDraft(nextDraft, target) {
    if (busyRef.current) return;
    const sameModel = draft.provider.trim() === nextDraft.provider.trim() && draft.model.trim() === nextDraft.model.trim();
    if (editorDirty) {
      if (sameModel) {
        setSection('custom'); setEditorOpen(true); setEditorNotice(''); setDeferredFocus(null);
        setFocusTick(n => n + 1); focusAfterLocateRef.current = true;
        return;
      }
      setSection('custom'); setEditorNotice(t('price.editorDirtyHint')); setDeferredFocus(target);
      return;
    }
    setDeferredFocus(null);
    openEditor(nextDraft, null, nextDraft, false);
  }
  function requestFocus(provider, model) {
    return requestFocusDraft(blankDraft(provider, model), { provider, model });
  }
  function originOf(rule) {
    return workingOrigins.get(rule.id) || (savedOverrides.some(item => item.id === rule.id) ? rule.id : null);
  }
  function requestEdit(rule, savedId = originOf(rule)) {
    if (busyRef.current) return;
    if (editorDirty) {
      if (editingId === rule.id) {
        setSection('custom'); setEditorOpen(true); setEditorNotice(''); setFocusTick(n => n + 1); focusAfterLocateRef.current = true;
        return;
      }
      setSection('custom'); setEditorNotice(t('price.editorDirtyHint'));
      return;
    }
    const nextDraft = ruleDraft(rule);
    openEditor(nextDraft, rule.id, nextDraft, ruleHasConditions(rule), savedId);
  }
  function requestSavedEdit(savedRule) {
    if (busyRef.current) return;
    if (editorDirty) { setSection('custom'); setEditorNotice(t('price.editorDirtyHint')); return; }
    const pending = removedRules.get(savedRule.id);
    if (pending) {
      const nextDraft = ruleDraft(pending);
      markDraftChanged();
      setWorkingOrigins(previous => { const next = new Map(previous); next.set(pending.id, savedRule.id); return next; });
      setWorkingOverrides(previous => previous.some(item => item.id === pending.id) ? previous : [...previous, pending]);
      setRemovedRules(previous => { const next = new Map(previous); next.delete(savedRule.id); return next; });
      setPreview(null); setError('');
      openEditor(nextDraft, pending.id, nextDraft, ruleHasConditions(pending), savedRule.id);
      return;
    }
    const working = workingForSaved(workingOverrides, workingOrigins, savedRule.id);
    requestEdit(working || savedRule, savedRule.id);
  }
  function requestNewRule() {
    if (busyRef.current) return;
    if (editorDirty) {
      setSection('custom'); setEditorNotice(t('price.editorDirtyHint'));
      if (editorOpen) { setFocusTick(n => n + 1); focusAfterLocateRef.current = true; }
      return;
    }
    const nextDraft = blankDraft();
    openEditor(nextDraft, null, nextDraft, false);
  }
  function locateDeferred() {
    if (busyRef.current || !deferredFocus || editorDirty) return;
    requestFocusDraft(draftForFocus(deferredFocus), deferredFocus);
  }
  function cancelEditor() { if (busyRef.current) return; closeEditor(); setError(''); customFocusRef.current = true; }
  function backToCustomList() { setEditorOpen(false); setEditorNotice(''); customFocusRef.current = true; }
  function continueEditing() { if (busyRef.current) return; setSection('custom'); setEditorOpen(true); setEditorNotice(''); setFocusTick(n => n + 1); focusAfterLocateRef.current = true; }
  function editField(key, value) {
    if (busyRef.current) return;
    markDraftChanged();
    setDraft(old => ({ ...old, [key]: value }));
    setPreview(null); setError(''); setEditorNotice('');
  }
  function stageRule() {
    if (busyRef.current) return;
    try {
      const rule = draftRule(draft, workingOverrides);
      const index = workingOverrides.findIndex(item => item.id === editingId);
      const next = index >= 0 ? workingOverrides.map((item, i) => i === index ? rule : item) : [...workingOverrides, rule];
      pricing.validateOverrides(next);
      markDraftChanged();
      const nextOrigins = new Map(workingOrigins);
      if (editingId) nextOrigins.delete(editingId);
      if (editingSavedId) {
        for (const [workingId, origin] of nextOrigins) if (origin === editingSavedId) nextOrigins.delete(workingId);
        nextOrigins.set(rule.id, editingSavedId);
      }
      setWorkingOverrides(next); setWorkingOrigins(nextOrigins); setPreview(null); setError('');
      setEditorOpen(false); setDraft(blankDraft()); setEditingId(null); setEditingSavedId(null); setEditorBaseline(blankDraft());
      setConditionsOpen(false); setEditorNotice(''); customFocusRef.current = true;
    } catch { setError(t('price.invalid')); }
  }
  function removeRule(rule, savedId = originOf(rule)) {
    if (busyRef.current) return;
    if (editorDirty && editingId === rule.id) { setSection('custom'); setEditorNotice(t('price.editorDirtyHint')); return; }
    markDraftChanged();
    setWorkingOverrides(workingOverrides.filter(item => item.id !== rule.id));
    setPreview(null); setError(''); setEditorNotice('');
    if (savedId) setRemovedRules(previous => { const next = new Map(previous); next.set(savedId, rule); return next; });
    setWorkingOrigins(previous => { const next = new Map(previous); next.delete(rule.id); return next; });
    if (editingId === rule.id) closeEditor();
    customFocusRef.current = true;
  }
  function undoRemove(savedId) {
    if (busyRef.current) return;
    const rule = removedRules.get(savedId);
    if (!rule) return;
    markDraftChanged();
    setWorkingOverrides(previous => previous.some(item => item.id === rule.id) ? previous : [...previous, rule]);
    setWorkingOrigins(previous => { const next = new Map(previous); next.set(rule.id, savedId); return next; });
    setRemovedRules(previous => { const next = new Map(previous); next.delete(savedId); return next; });
    setPreview(null); setError(''); setEditorNotice(''); customFocusRef.current = true;
  }
  function toggleRuleExpanded(id, open) {
    setExpandedRuleIds(previous => {
      const next = new Set(previous);
      if (open) next.add(id); else next.delete(id);
      return next;
    });
  }
  function changeAutoUpdate(value) { if (busyRef.current) return; markDraftChanged(); setAutoUpdateDraft(value); setPreview(null); setError(''); }
  function discardAll() { if (busyRef.current) return; footerFocusRef.current = true; if (status) accept(status); }
  function previewSettings() {
    if (!settingsDirty || editorDirty || busyRef.current) return;
    const signature = settingsSignature(workingOverrides, autoUpdateDraft);
    call(buildPreviewRequest(workingOverrides), 'preview', { version: draftVersionRef.current, signature });
  }
  function saveSettings() {
    if (!settingsDirty || editorDirty || !preview || busyRef.current) return;
    const signature = settingsSignature(workingOverrides, autoUpdateDraft);
    if (!previewMatchesDraft(preview, signature, draftVersionRef.current)) { setPreview(null); return; }
    footerFocusRef.current = true;
    call(buildSaveRequest({ overrides: workingOverrides, autoUpdate: autoUpdateDraft, fingerprint: preview.fingerprint, revision: status.revision }), 'commit');
  }
  function showMoreSnapshots() {
    snapshotFocusIndexRef.current = snapshotLimit;
    snapshotFocusRef.current = true;
    setSnapshotLimit(limit => limit + 5);
  }
  function rollbackVersion(version) {
    if (busyRef.current || anyDirty || !status) return;
    rollbackFocusRef.current = true;
    call({ action: 'rollback', version, revision: status.revision });
  }
  function openModel(key) { detailFocusRef.current = true; setModelNotice(''); setOtherOpen(false); setSelectedKey(key); }
  function backToModels() { if (!selectedKey) return; restoreKeyRef.current = selectedKey; setSelectedKey(null); }
  function changePage(next) { pageFocusRef.current = true; setPage(next); }
  function changeSearch(value) { setSearch(value); setPage(0); setModelNotice(''); }
  function changeScope(next) { setScope(next); setPage(0); setModelNotice(''); }
  const amount = summary => summary?.totals?.length ? summary.totals.map(row => row.currency + ' ' + row.amount.toFixed(4)).join(' · ') : t('pricing.pending');
  const button = (label, onClick, disabled = false, action) => e('button', { type: 'button', className: 'dss-export', 'data-action': action, disabled: busy || disabled, onClick }, label);
  const sections = [['models', 'sectionModels'], ['custom', 'sectionCustom'], ['updates', 'sectionUpdates']];
  const sectionContent = section === 'models'
    ? (selectedGroup
      ? e(ModelDetail, { group: selectedGroup, savedOverrides, t, busy, onBack: backToModels, onAddCustom: requestFocus, onEditOverride: requestSavedEdit, titleRef: detailTitleRef, otherOpen, onOtherToggle: setOtherOpen })
      : e(React.Fragment, null,
        e(SyncSummary, { status, busy, dirty: anyDirty, pinned, checking, t, onRefresh: () => call({ action: 'refresh' }) }),
        e(PendingPanel, { missing, t, busy, onConfigure: requestFocus }),
        e(ModelList, { selection, scope: effectiveScope, search, t, onScope: changeScope, onSearch: changeSearch, onPage: changePage,
          onOpen: openModel, onClearSearch: () => changeSearch(''), onShowAll: () => changeScope('all'), listRef, titleRef: listTitleRef, notice: modelNotice, hasUsed: used.size > 0, catalogEmpty: groups.length === 0 })))
    : section === 'custom'
      ? (editorOpen
        ? e(CustomEditor, { draft, editingId, editorDirty, busy, conditionsOpen, t, formRef, onChange: editField, onStage: stageRule, onCancel: cancelEditor, onBack: backToCustomList, onConditionsToggle: setConditionsOpen })
        : e(CustomList, { rows: customRows, t, busy, editorDirty, editorNotice, deferredFocus, expandedIds: expandedRuleIds,
          headingRef: customHeadingRef, onAdd: requestNewRule, onContinue: continueEditing, onEdit: requestEdit, onRemove: removeRule, onUndo: undoRemove,
          onLocateDeferred: locateDeferred, onToggleExpand: toggleRuleExpanded }))
      : e(UpdatesSection, { status, autoUpdate: autoUpdateDraft, busy, dirty: anyDirty, pinned, checking,
        snapshotLimit, t, historyRef: historyHeadingRef, onAuto: changeAutoUpdate, onShowMore: showMoreSnapshots,
        onRefresh: () => call({ action: 'refresh' }), onRollback: rollbackVersion });
  const bodyContent = !status
    ? e('div', { className: 'dss-price-state' },
      e('p', null, busy ? t('price.loading') : t('price.unavailable')),
      !busy && remote && error ? e('button', { type: 'button', className: 'dss-export', 'data-action': 'price-retry-status', onClick: () => setStatusTick(n => n + 1) }, t('price.retry')) : null)
    : e(React.Fragment, null,
      status.error && section !== 'updates' ? e('div', { className: 'dss-price-status-error', role: 'status' }, t('price.refreshFailed'),
        e('details', null, e('summary', null, t('source.details')), status.error)) : null,
      sectionContent);
  const commit = anyDirty ? e('div', { className: 'dss-price-commit' },
    e('p', { className: 'dss-price-commit-note' }, t('price.unsavedClose')),
    editorDirty ? e('div', { className: 'dss-price-editor-block' },
      e('span', null, editorNotice || t('price.editorDirtyHint')),
      e('button', { type: 'button', className: 'dss-link-btn', 'data-action': 'price-continue-editing', disabled: busy, onClick: continueEditing }, t('price.continueEditing'))) : null,
    !editorDirty && preview ? e('p', { className: 'dss-price-preview', role: 'status' }, t('price.affected') + ' ' + preview.changed.length + ' · ' + amount(preview.before) + ' → ' + amount(preview.after))
      : !editorDirty ? e('p', { className: 'dss-price-hint', role: 'status' }, previewing ? t('price.previewing') : t('price.previewFirst')) : null,
    e('div', { className: 'dss-price-actions' },
      button(t('price.preview'), previewSettings, editorDirty, 'price-preview'),
      button(t('price.save'), saveSettings, editorDirty || !preview, 'price-save'),
      button(t('price.cancel'), discardAll, false, 'price-discard'))) : null;
  return e('section', { className: 'dss-pricing', 'aria-label': t('price.title'), 'aria-busy': busy },
    e('div', { className: 'dss-price-nav', role: 'group', 'aria-label': t('price.sections') },
      sections.map(([name, key]) => e('button', { key: name, type: 'button', className: 'dss-price-nav-btn' + (section === name ? ' is-on' : ''),
        'aria-pressed': section === name, 'data-action': 'price-section-' + name, onClick: () => setSection(name) }, t('price.' + key)))),
    e('div', { className: 'dss-drawer-body' }, error ? e('p', { role: 'alert' }, error) : null, bodyContent),
    commit);
}

module.exports = { PricingPanel, PricingErrorBoundary, ModelList, ModelDetail, CustomList, CustomEditor, UpdatesSection,
  draftRule, draftForFocus, missingModels, blankDraft, ruleDraft, fmtBeijing,
  draftEqual, rulesEqual, ruleHasConditions, draftHasConditions, workingForSaved, customRuleRows,
  settingsSignature, previewMatchesDraft, buildPreviewRequest, buildSaveRequest };
