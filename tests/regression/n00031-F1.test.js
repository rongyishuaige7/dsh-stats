// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] settings.json 被修复后，若缓存同时损坏，settingsInvalid 永远不会清除，save/rollback 被永久误判为 pricing-settings-invalid
// Source: src/pricing-store.js:80  Contract: —
// Verified fixed at cc91b835d19f199f7256ed156bd81d99f3f138f2 by `recheck`; do not delete without checking the finding.

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { PricingStore } from '../../src/pricing-store.js';

const homes = [];

function makeHome() {
  const home = mkdtempSync(join(tmpdir(), 'pricing-evolver-'));
  homes.push(home);
  return home;
}

afterEach(() => {
  while (homes.length) rmSync(homes.pop(), { recursive: true, force: true });
});

test('[F1] settings.json 修好后若 current.json 仍损坏，settingsInvalid 卡死导致 save 抛 pricing-settings-invalid', () => {
  const home = makeHome();
  const dir = join(home, 'plugins', 'dsh-stats', 'pricing');
  mkdirSync(dir, { recursive: true });

  // 初始状态：settings.json 结构非法（缺少 pinnedVersion / overrides），current.json 也无法解析
  writeFileSync(join(dir, 'settings.json'), JSON.stringify({ revision: 0, autoUpdate: true }));
  writeFileSync(join(dir, 'current.json'), '{ this is not json');

  const store = new PricingStore(home, { fetchImpl: vi.fn() });
  expect(store.settingsInvalid).toBe(true);

  // 用户把 settings.json 修复为合法内容（缓存文件保持损坏）
  writeFileSync(join(dir, 'settings.json'), JSON.stringify({ revision: 0, autoUpdate: true, pinnedVersion: null, overrides: [] }));
  store.status();

  // 设置文件已经可以成功解析，settingsInvalid 必须被清除
  expect(store.settingsInvalid).toBe(false);
  // 保存设置不应再被误判为 pricing-settings-invalid
  expect(() => store.save({ revision: 0, autoUpdate: true, overrides: [] })).not.toThrow();
});

