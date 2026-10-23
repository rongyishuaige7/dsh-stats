// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 已提供 remote 时面板首帧仍显示“计价设置不可用”，而不是“加载中”
// Source: src/pricing-panel.cjs:432  Contract: src/pricing-panel.cjs:776（busy 为真时显示 price.loading，否则显示 price.unavailable）与 src/pricing-panel.cjs:777（只有 remote 存在且出错时才给重试按钮）
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { PricingPanel } = require('../../src/pricing-panel.cjs');

const t = key => key;

test('[F1] 已提供 remote 的面板首帧应显示“加载中”，而不是“计价设置不可用”', () => {
  const html = renderToStaticMarkup(React.createElement(PricingPanel, {
    remote: () => Promise.resolve({}),
    projects: [],
    t,
  }));
  expect(html).toContain('price.loading');
  expect(html).not.toContain('price.unavailable');
});

