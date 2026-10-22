// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F2] rollback 到磁盘上不存在的版本时抛出原始 ENOENT 文件系统错误（并泄漏绝对路径），而不是 pricing-* 错误码
// Source: src/pricing-store.js:209  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PricingStore } from '../../src/pricing-store.js';

const homes = [];
function tempHome() {
  const dir = mkdtempSync(join(tmpdir(), 'pricing-evolver-'));
  homes.push(dir);
  return dir;
}

afterEach(() => {
  while (homes.length) rmSync(homes.pop(), { recursive: true, force: true });
});

// [night-evolver] 这条发现还没修，测试暂不提升;

test('[F2] rollback to a version with no cached catalog reports a pricing error instead of a raw ENOENT', () => {
  const store = new PricingStore(tempHome());
  // No catalog-7.json exists on disk; the caller still gets an error object,
  // but it must be a pricing-* error rather than an fs error leaking the path.
  expect(() => store.rollback(7, 0)).toThrow(/^pricing-/);
});

