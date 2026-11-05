import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { ModelList, ModelDetail, UpdatesSection, SyncSummary, RepositoryLine, REPOSITORY_URL } = require('../src/pricing-panel.cjs');
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

const listHtml = (rules, scope, used = new Set()) => {
  const list = catalogGroups({ rules }, used, at);
  return renderToStaticMarkup(React.createElement(ModelList, {
    selection: selectModelGroups(list, { scope, page: 0, pageSize: 25 }), scope, search: '', t, hasUsed: used.size > 0,
    onScope() {}, onSearch() {}, onPage() {}, onOpen() {}, onClearSearch() {}, onShowAll() {},
    listRef: React.createRef(), titleRef: React.createRef(), notice: '',
  }));
};

test('tiered rows show the standard-tier range and name what the price depends on', () => {
  const html = listHtml([rule('ctx', { currency: 'USD', rates: null, contextThreshold: 272000,
    contextTiers: { short: { uncached: 2.5, cacheRead: 0.25, cacheWrite: 2.5, output: 15 }, long: { uncached: 5, cacheRead: 0.5, cacheWrite: 5, output: 22.5 } },
    tierMultipliers: { standard: 1, priority: 2, batch: 0.5, flex: 0.5 } })], 'all');
  expect(html).toContain('In $2.5–5 / Out $15–22.5');
  expect(html).toContain('USD · Higher above 272k context · priority ×2 · batch / flex ×0.5');
  expect(html).not.toContain('Tiered pricing');
  const time = listHtml([rule('tou', { rates: null, timeOfUse: { peak: { uncached: 2, cacheRead: 0.04, cacheWrite: null, output: 8 },
    offPeak: { uncached: 1, cacheRead: 0.02, cacheWrite: null, output: 4 }, calendar: { from: '2026-01-01', to: '2026-12-31', holidays: [], sourceUrl: 'https://example.com/c' } } })], 'all');
  expect(time).toContain('In ¥1–2 / Out ¥4–8');
  expect(time).toContain('CNY · Time of day (peak / off-peak)');
  const service = listHtml([rule('svc', { rates: null, serviceTiers: { standard: { short: { uncached: 2.1, cacheRead: 0.42, cacheWrite: 2.1, output: 8.4 }, long: { uncached: 4.2, cacheRead: 0.84, cacheWrite: 4.2, output: 16.8 } },
    priority: { short: { uncached: 3.15, cacheRead: 0.63, cacheWrite: 3.15, output: 12.6 }, long: { uncached: 6.3, cacheRead: 1.26, cacheWrite: 6.3, output: 25.2 } } } })], 'all');
  expect(service).toContain('In ¥2.1–4.2 / Out ¥8.4–16.8');
  expect(service).toContain('CNY · Higher above 512k context · Also priority tier');
  const two = listHtml([rule('first'), rule('second')], 'all');
  expect(two).toContain('Tiered pricing · 2 current rule(s)');
});

test('the used tag only marks rows in the all-models scope', () => {
  const used = new Set([groups[0].key]);
  expect(listHtml([rule('now')], 'all', used)).toContain('dss-price-used-tag');
  expect(listHtml([rule('now')], 'used', used)).not.toContain('dss-price-used-tag');
});

test('the catalog line shows the publish time and keeps the version in the hover title', () => {
  const status = { version: 2026101867, publishedAt: '2026-10-20T22:00:00Z', lastSuccessAt: null };
  const props = { busy: false, dirty: false, checking: false, t, onRefresh() {} };
  const html = renderToStaticMarkup(React.createElement(SyncSummary, { ...props, status, pinned: false }));
  expect(html).toContain('>Current catalog · published 10-21 06:00</strong>');
  expect(html).toContain('title="Catalog version 2026101867 · 2026-10-21 06:00 Beijing time"');
  const pinned = renderToStaticMarkup(React.createElement(SyncSummary, { ...props, status, pinned: true }));
  expect(pinned).toContain('published 10-21 06:00 · ' + en['price.pinnedShort'] + '</strong>');
  const bare = renderToStaticMarkup(React.createElement(SyncSummary, { ...props, status: { ...status, publishedAt: '' }, pinned: false }));
  expect(bare).toContain('>Current catalog 2026101867</strong>');
  expect(bare).not.toContain('title="Catalog version');
});

test('the repository line names the plugin version and opens the fixed URL in a new window', () => {
  const tt = key => key === 'title.repository' ? 'DSH Usage project repository · GitHub (opens in a new window)' : t(key);
  const html = renderToStaticMarkup(React.createElement(RepositoryLine, { t: tt, version: '0.5.2' }));
  expect(html).toContain('DSH Usage 0.5.2 · <a');
  expect(html).toContain('href="' + REPOSITORY_URL + '"');
  expect(REPOSITORY_URL).toBe('https://github.com/rongyishuaige7/dsh-stats');
  expect(html).toContain('target="_blank" rel="noopener noreferrer" data-action="project-repository"');
  expect(html).toContain('aria-label="DSH Usage project repository · GitHub (opens in a new window)"');
  expect(html).toContain('>Project repository · GitHub ↗</a>');
  // Unbundled source has no injected version, so the line keeps only the link.
  const plain = renderToStaticMarkup(React.createElement(RepositoryLine, { t: tt }));
  expect(plain.startsWith('<p class="dss-price-muted dss-price-repo"><a')).toBe(true);
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

test('updates section marks a check that was answered by the mirror', () => {
  const render = checkSource => renderToStaticMarkup(React.createElement(UpdatesSection, {
    status: { version: 5, history: [], lastCheckAt: Date.parse('2026-10-17T01:00:00Z'), lastSuccessAt: Date.parse('2026-10-17T00:00:00Z'), checkSource },
    autoUpdate: true, busy: false, dirty: false, pinned: false, checking: false, snapshotLimit: 5,
    t, historyRef: React.createRef(), onAuto() {}, onRefresh() {}, onRollback() {}, onShowMore() {},
  }));
  expect(render('mirror')).toContain(' · ' + en['price.viaMirror']);
  expect(render('mirror')).toContain('title="' + en['price.viaMirrorHint'].replace(/'/g, '&#x27;') + '"');
  expect(render('primary')).not.toContain(en['price.viaMirror']);
  expect(render(null)).not.toContain(en['price.viaMirror']);
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
