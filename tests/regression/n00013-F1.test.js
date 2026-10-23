// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 阈值为 0 的计价规则在详情里不显示阈值（真值判断吞掉 0）
// Source: src/pricing-panel.cjs:174  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { ModelDetail, ModelList, blankDraft, draftRule } = require('../../src/pricing-panel.cjs');

test('[F1] 阈值为 0 的规则详情仍应渲染阈值行', () => {
  const t = key => ({
    'price.threshold': 'THRESHOLD',
    'price.standard': 'STANDARD',
    'price.long': 'LONG',
    'price.unknown': 'UNKNOWN',
    'price.unitShort': 'unit',
    'price.catalogPrice': 'Catalog price',
    'price.backToModels': 'Back',
    'price.addCustomForModel': 'Add custom',
    'price.noCurrentPrice': 'No current price',
    'price.otherPeriodsTitle': 'Other periods',
    'price.savedCustomRules': 'Saved rules',
    'price.editSavedRule': 'Edit saved',
    'price.source': 'Source',
  }[key] ?? key);

  const zeroThresholdRule = {
    id: 'custom/one/demo@2026-10-17T00:00:00.000Z',
    providerId: 'one', family: 'one', canonical: 'demo', aliases: ['demo'],
    currency: 'CNY', sourceUrl: null, retrievedAt: '2026-10-17',
    confidence: 'estimated', reasoningIncludedInOutput: true, accountType: 'api',
    rates: null,
    contextThreshold: 0,
    contextTiers: {
      short: { uncached: 1, cacheRead: null, cacheWrite: null, output: 2 },
      long: { uncached: 3, cacheRead: null, cacheWrite: null, output: 4 },
    },
    tierMultipliers: { standard: 1 },
  };
  const group = {
    key: '["one","demo"]', canonical: 'demo', provider: 'one', isUsed: false,
    rules: [{ rule: zeroThresholdRule, phase: 'current' }],
  };

  const html = renderToStaticMarkup(React.createElement(ModelDetail, {
    group, savedOverrides: [], t, busy: false, otherOpen: false,
    onBack() {}, onAddCustom() {}, onEditOverride() {}, onOtherToggle() {}, titleRef: React.createRef(),
  }));

  // 规则本体确实被渲染出来了（上下文分档存在）
  expect(html).toContain('STANDARD');
  // 阈值 0 是有效值，必须像非零阈值一样显示
  expect(html).toContain('THRESHOLD: 0');
});

// [night-evolver] 这条发现还没修，测试暂不提升;

// [night-evolver] 这条发现还没修，测试暂不提升;

