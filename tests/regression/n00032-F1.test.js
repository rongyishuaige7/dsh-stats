// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 倍率全为 1 的自定义规则详情仍显示“standard ×1”条件行
// Source: src/pricing-panel.cjs:175  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { ModelDetail } = require('../../src/pricing-panel.cjs');
const { catalogGroups } = require('../../src/pricing-view.cjs');
const { en } = require('../../src/pricing-locale.cjs');

const t = key => en[key] ?? key;
const at = Date.parse('2026-10-17T12:00:00Z');

// draftRule() 给每条自定义规则都写入 tierMultipliers: { standard: 1 }，
// 即使用户完全没有设置任何倍率条件。
const plainCustomRule = {
  id: 'custom/one/demo@2026-10-17T00:00:00.000Z',
  providerId: 'one', family: 'one', canonical: 'demo', aliases: ['demo'],
  currency: 'CNY', sourceUrl: null, retrievedAt: '2026-10-17',
  confidence: 'estimated', reasoningIncludedInOutput: true, accountType: 'api',
  rates: { uncached: 1, cacheRead: null, cacheWrite: null, output: 2 },
  tierMultipliers: { standard: 1 },
};

test('[F1] 标准倍率为 1 的规则详情不应显示倍率条件行', () => {
  const [group] = catalogGroups({ rules: [plainCustomRule] }, new Set(), at);
  const html = renderToStaticMarkup(React.createElement(ModelDetail, {
    group, savedOverrides: [], t, otherOpen: false, onOtherToggle() {},
    onBack() {}, onAddCustom() {}, onEditOverride() {}, titleRef: React.createRef(),
  }));
  // 规则本身确实渲染出来了（避免因为渲染失败而“假通过”）
  expect(html).toContain('data-rule-id="' + plainCustomRule.id + '"');
  // 全为 1 倍率不是条件，不应出现在详情里
  expect(html).not.toContain('standard ×1');
});

