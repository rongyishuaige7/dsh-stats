// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 草稿中把倍率填成 1 会被误判为已设置条件，与规则侧判断不一致
// Source: src/pricing-panel.cjs:99  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { blankDraft, draftRule, draftHasConditions, ruleHasConditions } = require('../../src/pricing-panel.cjs');

const NOW = new Date('2026-10-17T00:00:00Z');

test('[F1] 倍率填 1 的草稿不应被判定为已设置条件（与规则侧一致）', () => {
  const draft = { ...blankDraft('one', 'demo'), uncached: '1', output: '2', priority: '1' };
  const rule = draftRule(draft, [], NOW);
  // 规则侧把倍率 1 当作默认值，不算条件
  expect(ruleHasConditions(rule)).toBe(false);
  // 草稿侧应保持一致，否则编辑器会显示“已设置条件”而暂存出的规则却没有条件
  expect(draftHasConditions(draft)).toBe(false);
});

