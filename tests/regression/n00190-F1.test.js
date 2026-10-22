// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 缓存文件读取失败时 syncDisk 丢弃已成功读取的 settings，过期 revision 的 save 会覆盖另一进程写入的设置
// Source: src/pricing-store.js:76-80  Contract: —
// Verified fixed by `recheck`; do not delete without checking the finding.

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync } from 'node:crypto';
import { PricingStore } from '../../src/pricing-store.js';

const homes = [];

afterEach(() => {
  while (homes.length) rmSync(homes.pop(), { recursive: true, force: true });
});

function makeHome() {
  const home = mkdtempSync(join(tmpdir(), 'pricing-evolver-'));
  homes.push(home);
  return home;
}

test('[F1] 缓存文件损坏时仍应采纳磁盘上已变更的 settings，过期 revision 的保存必须冲突', () => {
  const { publicKey } = generateKeyPairSync('ed25519');
  const home = makeHome();
  const dir = join(home, 'plugins', 'dsh-stats', 'pricing');

  // 先创建一个仍持有旧 revision(0) 的实例，再让另一个实例把 settings.json 推进到 revision 1
  const stale = new PricingStore(home, { fetchImpl: vi.fn(), publicKey });
  const writer = new PricingStore(home, { fetchImpl: vi.fn(), publicKey });
  writer.save({ revision: 0, autoUpdate: false, overrides: [] });

  // 目录缓存损坏，但 settings.json 本身完全有效：另一进程写入的 revision 1 必须被看到
  writeFileSync(join(dir, 'current.json'), '{');

  expect(() => stale.save({ revision: 0, autoUpdate: true, overrides: [] })).toThrow('pricing-settings-conflict');
});

