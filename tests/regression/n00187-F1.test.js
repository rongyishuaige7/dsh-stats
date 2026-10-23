// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] pricing 目录无法创建时 save()/rollback() 抛出原始 EEXIST 文件系统错误并泄漏绝对路径，而不是 pricing-* 错误码
// Source: src/pricing-store.js:90  Contract: tests/regression/n00023-F2.test.js:28（save/rollback 必须抛出 pricing-* 而非原始 fs 错误）；src/pricing-store.js:95（withLock 自己把 openSync 失败映射成 pricing-settings-busy，同类失败应一致）
// Verified fixed by `recheck`; do not delete without checking the finding.

// Adversarial round-2 test for src/pricing-store.js (focus: filesystem error codes on save/rollback)
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

// pricing 目录被一个普通文件占位（磁盘损坏 / 外部工具写入），
// withLock 里的 mkdirSync(dir, { recursive: true }) 会抛出原始 EEXIST。
function brokenStore() {
  const home = makeHome();
  const pluginDir = join(home, 'plugins', 'dsh-stats');
  mkdirSync(pluginDir, { recursive: true });
  writeFileSync(join(pluginDir, 'pricing'), 'not-a-directory');
  return new PricingStore(home, { fetchImpl: vi.fn() });
}

afterEach(() => {
  while (homes.length) rmSync(homes.pop(), { recursive: true, force: true });
});

test('[F1] pricing 目录无法创建时 save() 必须抛 pricing-* 而不是原始 EEXIST', () => {
  const store = brokenStore();
  expect(() => store.save({ revision: 0, autoUpdate: false, overrides: [] })).toThrow(/^pricing-/);
});

test('[F1] pricing 目录无法创建时 rollback() 必须抛 pricing-* 而不是原始 EEXIST', () => {
  const store = brokenStore();
  expect(() => store.rollback(1, 0)).toThrow(/^pricing-/);
});

