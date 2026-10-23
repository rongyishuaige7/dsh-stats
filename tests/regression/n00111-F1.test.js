// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 仅含服务档（serviceTiers）条件的自定义规则，条件摘要却显示“无附加条件”
// Source: src/pricing-panel.cjs:112  Contract: src/pricing-panel.cjs:91（ruleHasConditions 把 serviceTiers 计为条件）、src/pricing-panel.cjs:104（rateTypeLabel 把它识别为“服务档计价”）、src/pricing-panel.cjs:161（ruleDetails 为其渲染各档位费率）
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { CustomList } = require('../../src/pricing-panel.cjs');
const { en } = require('../../src/pricing-locale.cjs');

const t = key => en[key] ?? key;

const rates = (uncached, output) => ({ uncached, cacheRead: null, cacheWrite: null, output });

const serviceTierRule = {
  id: 'custom/one/demo@2026-10-17T00:00:00.000Z',
  providerId: 'one', family: 'one', canonical: 'demo', aliases: ['demo'],
  currency: 'CNY', sourceUrl: null, retrievedAt: '2026-10-17', confidence: 'estimated',
  reasoningIncludedInOutput: true,
  rates: null,
  serviceTiers: { standard: { short: rates(1, 2), long: rates(3, 4) } },
};

function renderCustomRow(rule) {
  return renderToStaticMarkup(React.createElement(CustomList, {
    rows: [{ rule, isSaved: true, pendingRemove: false, savedId: rule.id }],
    t,
    busy: false,
    editorDirty: false,
    editorNotice: '',
    deferredFocus: null,
    expandedIds: new Set(),
    headingRef: React.createRef(),
    onAdd() {}, onContinue() {}, onEdit() {}, onRemove() {}, onUndo() {},
    onLocateDeferred() {}, onToggleExpand() {},
  }));
}

test('[F1] a service-tier-only custom rule does not claim it has no conditions', () => {
  const html = renderCustomRow(serviceTierRule);
  // The row itself recognises the rule as a service-tier price...
  expect(html).toContain(t('price.typeService'));
  // ...so its condition summary must not say "no conditions".
  const match = /<p class="dss-price-condition-summary">([^<]*)<\/p>/.exec(html);
  expect(match).not.toBeNull();
  const summary = match[1];
  expect(summary).not.toBe(t('price.noConditions'));
  expect(summary.length).toBeGreaterThan(0);
});

