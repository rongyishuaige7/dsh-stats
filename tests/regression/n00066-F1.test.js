// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 预览合计为空时回退文案引用了不存在的翻译键 pricing.pending，界面会直接显示原始键名
// Source: src/pricing-panel.cjs:754  Contract: src/pricing-panel.cjs:208（同类回退文案使用 price.noCurrentPrice，全文件文案键统一为 price.* 命名空间）；tests/pricing-panel.test.js:12（面板文案由 price.* 语言包经 `en[key] ?? key` 解析）
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('../../src/pricing-panel.cjs');
const { en } = require('../../src/pricing-locale.cjs');

// pricing-panel.cjs:754 在预览没有 totals 时回退到 t('pricing.pending')，
// 但面板其余文案全部走 price.* 命名空间，语言包里并没有 pricing.pending，
// 于是 t 的 `en[key] ?? key` 兜底会把原始键名 'pricing.pending' 显示给用户。
test('[F1] 预览合计为空时回退文案的翻译键 pricing.pending 在语言包中不存在，界面会直接显示原始键名', () => {
  expect(typeof mod.PricingPanel).toBe('function');
  expect(en['pricing.pending']).toBeDefined();
});

