// Regression test promoted by night-evolver.
// Run: 20261021-130102-dsh-stats  Finding: [F1] 磁盘设置被修复后 syncDisk 成功重载，但 status() 仍长期报告旧的 pricing-settings-invalid 错误
// Source: src/pricing-store.js:86  Contract: —
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

test('[F1] status() clears a stale pricing-settings-invalid error once the settings file is repaired', () => {
  const home = tempHome();
  const pricingDir = join(home, 'plugins', 'dsh-stats', 'pricing');
  mkdirSync(pricingDir, { recursive: true });
  // Invalid on disk at startup: negative revision fails validateSettings.
  writeFileSync(join(pricingDir, 'settings.json'), '{"revision":-1}');

  const store = new PricingStore(home);
  expect(store.status().error).toBe('pricing-settings-invalid');

  // Another process / the user repairs the settings file. The next status()
  // resyncs from disk successfully (settingsInvalid is reset, revision applied).
  writeFileSync(join(pricingDir, 'settings.json'), JSON.stringify({
    revision: 7, autoUpdate: false, pinnedVersion: null, overrides: []
  }));

  const status = store.status();
  expect(status.revision).toBe(7);
  expect(status.error).toBeNull();
});

// [night-evolver] 这条发现还没修，测试暂不提升;

