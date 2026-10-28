import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { ModelList, ModelDetail, UpdatesSection } = require('../src/pricing-panel.cjs');
const { catalogGroups, selectModelGroups } = require('../src/pricing-view.cjs');
const { en } = require('../src/pricing-locale.cjs');
const t = key => en[key] ?? key;
const at = Date.parse('2026-10-17T12:00:00Z');

const rule = (id, extra = {}) => ({
  id, providerId: 'one', family: 'one', canonical: 'demo', aliases: ['demo'],
  currency: 'CNY', sourceUrl: 'https://example.com/pricing', retrievedAt: '2026-10-01',
  confidence: 'exact', reasoningIncludedInOutput: true,
  rates: { uncached: 1, cacheRead: 0.5, cacheWrite: 2, output: 4 }, ...extra,
});
const groups = catalogGroups({ rules: [
  rule('old', { effectiveTo: '2026-10-01T00:00:00Z' }),
  rule('now', { effectiveFrom: '2026-10-01T00:00:00Z' }),
] }, new Set(), at);
const selection = selectModelGroups(groups, { scope: 'all', page: 0, pageSize: 25 });

test('model list shows the no-used note and a flat price summary', () => {
  const html = renderToStaticMarkup(React.createElement(ModelList, {
    selection, scope: 'all', search: '', t, hasUsed: false,
    onScope() {}, onSearch() {}, onPage() {}, onOpen() {}, onClearSearch() {}, onShowAll() {},
    listRef: React.createRef(), titleRef: React.createRef(), notice: '',
  }));
  expect(html).toContain(en['price.noUsedModels']);
  expect(html).toContain('data-model-key="[&quot;one&quot;,&quot;demo&quot;]"');
  expect(html).toContain('In ¥1 / Out ¥4');
  expect(html).toContain('CNY · Any account type');
});

test('empty catalog shows its own state instead of the no-used note', () => {
  const html = renderToStaticMarkup(React.createElement(ModelList, {
    selection: { rows: [], modelCount: 0, ruleCount: 0, page: 0, pageCount: 1 },
    scope: 'all', search: '', t, hasUsed: false, catalogEmpty: true,
    onScope() {}, onSearch() {}, onPage() {}, onOpen() {}, onClearSearch() {}, onShowAll() {},
    listRef: React.createRef(), titleRef: React.createRef(), notice: '',
  }));
  expect(html).toContain(en['price.emptyCatalog']);
  expect(html).not.toContain(en['price.noUsedModels']);
});

test('model detail keeps every rule phase, full identity and no catalog rollback', () => {
  const props = {
    group: groups[0], savedOverrides: [], t, onOtherToggle() {},
    onBack() {}, onAddCustom() {}, onEditOverride() {}, titleRef: React.createRef(),
  };
  const closed = renderToStaticMarkup(React.createElement(ModelDetail, { ...props, otherOpen: false }));
  expect(closed).toContain('one / demo');
  expect(closed).toContain('Catalog price');
  expect(closed).toContain('data-rule-id="now"');
  expect(closed).toContain('data-phase="current"');
  expect(closed).toContain('data-action="price-other-periods"');
  expect(closed).not.toContain('data-rule-id="old"');
  expect(closed).toContain(en['price.addCustomForModel']);
  expect(closed).not.toContain('data-action="price-rollback"');
  const open = renderToStaticMarkup(React.createElement(ModelDetail, { ...props, otherOpen: true }));
  expect(open).toContain('data-rule-id="old"');
  expect(open).toContain('data-phase="historical"');
});

test('model detail lists only the saved override snapshot', () => {
  const savedRule = {
    id: 'custom/one/demo@2026-10-17', providerId: 'one', family: 'one', canonical: 'demo',
    aliases: ['demo'], currency: 'CNY', sourceUrl: null, retrievedAt: '2026-10-17',
    confidence: 'estimated', reasoningIncludedInOutput: true,
    rates: { uncached: 3, cacheRead: null, cacheWrite: null, output: 6 },
  };
  const html = renderToStaticMarkup(React.createElement(ModelDetail, {
    group: groups[0], savedOverrides: [savedRule], t, otherOpen: false, onOtherToggle() {},
    onBack() {}, onAddCustom() {}, onEditOverride() {}, titleRef: React.createRef(),
  }));
  expect(html).toContain(en['price.savedCustomRules']);
  expect(html).toContain('data-action="price-edit-saved"');
  expect(html).toContain(savedRule.id);
});

test('provisional detail keeps the note body and the review tag', () => {
  const provisional = rule('prov', {
    note: '[provisional] Auto-added from the official model table; cache duration and service tiers are pending review.',
  });
  const [group] = catalogGroups({ rules: [provisional] }, new Set(), at);
  const html = renderToStaticMarkup(React.createElement(ModelDetail, {
    group, savedOverrides: [], t, otherOpen: false, onOtherToggle() {},
    onBack() {}, onAddCustom() {}, onEditOverride() {}, titleRef: React.createRef(),
  }));
  expect(html).toContain('Auto-added from the official model table; cache duration and service tiers are pending review.');
  expect(html).not.toContain('[provisional]');
  expect(html).toContain(en['price.provisional']);
});


test('updates section disables restore while settings are dirty', () => {
  const status = { version: 5, history: [4], lastSuccessAt: Date.parse('2026-10-17T00:00:00Z') };
  const render = dirty => renderToStaticMarkup(React.createElement(UpdatesSection, {
    status, autoUpdate: true, busy: false, dirty, pinned: false, checking: false, snapshotLimit: 5,
    t, historyRef: React.createRef(), onAuto() {}, onRefresh() {}, onRollback() {}, onShowMore() {},
  }));
  expect(render(false)).toContain('data-action="price-rollback"');
  expect(render(false)).not.toContain('data-action="price-rollback" disabled=""');
  expect(render(true)).toContain('data-action="price-rollback" disabled=""');
});

test('updates section pages snapshots and shows pinned sync metadata', () => {
  const status = {
    version: 10, publishedAt: '2026-10-18T00:00:00Z', lastCheckAt: Date.parse('2026-10-18T01:00:00Z'),
    lastSuccessAt: Date.parse('2026-10-18T02:00:00Z'), pinnedVersion: 9, autoUpdate: false,
    history: [9, 8, 7, 6, 5, 4, 3],
  };
  const render = snapshotLimit => renderToStaticMarkup(React.createElement(UpdatesSection, {
    status, autoUpdate: false, busy: false, dirty: false, pinned: true, checking: false, snapshotLimit,
    t, historyRef: React.createRef(), onAuto() {}, onRefresh() {}, onRollback() {}, onShowMore() {},
  }));
  const first = render(5);
  expect(first).toContain('>10<');
  expect(first).toContain(en['price.publishedAt']);
  expect(first).toContain(en['price.lastCheck']);
  expect(first).toContain(en['price.lastSuccess']);
  expect(first).toContain(en['price.pinnedVersion'] + ' 9');
  expect(first).toContain('data-version="9"');
  expect(first).toContain('data-version="5"');
  expect(first).not.toContain('data-version="4"');
  expect(first).toContain(en['price.showMoreSnapshots'].replace('%d', '2'));
  expect(first).toContain('data-action="price-refresh" disabled=""');
  const all = render(10);
  expect(all).toContain('data-version="3"');
  expect(all).not.toContain('data-action="price-snapshots-more"');
});

test('a failed update shows its code, reason, attempt count and next retry', () => {
  const status = {
    version: 9, publishedAt: '2026-10-28T08:40:44Z', lastCheckAt: at, lastSuccessAt: at,
    error: 'pricing-update-failed', errorDetail: 'fetch failed (ENOTFOUND)', errorAt: at,
    attempts: 4, consecutiveFailures: 1, nextCheckAt: at + 300000,
    autoUpdate: true, pinnedVersion: null, history: [9, 8],
  };
  const html = renderToStaticMarkup(React.createElement(UpdatesSection, {
    status, autoUpdate: true, busy: false, dirty: false, pinned: false, checking: false, snapshotLimit: 5,
    t, historyRef: React.createRef(), onAuto() {}, onRefresh() {}, onRollback() {}, onShowMore() {},
  }));
  expect(html).toContain(en['price.refreshFailed']);
  expect(html).toContain('pricing-update-failed');
  expect(html).toContain('fetch failed (ENOTFOUND)');
  expect(html).toContain(en['price.attempts'].replace('%d', '4'));
  expect(html).toContain(en['price.retryScheduled'].replace('%s', '').slice(0, 8));
  expect(html).toContain('source.details');
});

test('a healthy update renders no failure banner', () => {
  const status = {
    version: 9, publishedAt: '2026-10-28T08:40:44Z', lastCheckAt: at, lastSuccessAt: at,
    error: null, errorDetail: null, attempts: 1, consecutiveFailures: 0, nextCheckAt: at + 3600000,
    autoUpdate: true, pinnedVersion: null, history: [9, 8],
  };
  const html = renderToStaticMarkup(React.createElement(UpdatesSection, {
    status, autoUpdate: true, busy: false, dirty: false, pinned: false, checking: false, snapshotLimit: 5,
    t, historyRef: React.createRef(), onAuto() {}, onRefresh() {}, onRollback() {}, onShowMore() {},
  }));
  expect(html).not.toContain(en['price.refreshFailed']);
  expect(html).not.toContain('pricing-update-failed');
});
