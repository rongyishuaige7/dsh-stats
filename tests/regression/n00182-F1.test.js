// Regression test promoted by night-evolver.
// Run: 20261022-114654-dsh-stats  Finding: [F1] 解除 pin 后 syncDisk 会用比已应用目录更旧的 current.json 覆盖内存目录，造成版本回退
// Source: src/pricing-store.js:82  Contract: src/pricing-store.js:48（构造函数只在 catalog.version >= this.catalog.version 时才采纳缓存目录）与 src/pricing-store.js:167-168（download 以 this.catalog.version 为下界，低于即 pricing-version-regressed）
// Verified fixed by `recheck`; do not delete without checking the finding.

// Focus: boundaries. [F1] 解除 pin 后 syncDisk 用更旧的 current.json 覆盖已应用目录，导致版本回退。
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync, sign } from 'node:crypto';
import pricing from '../../src/pricing.cjs';
import { PricingStore } from '../../src/pricing-store.js';

const homes = [];
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const base = structuredClone(pricing.BUILTIN);
const B = base.version;

function envelope(catalog) {
  const payload = JSON.stringify(catalog);
  return { payload, signature: sign(null, Buffer.from(payload), privateKey).toString('base64') };
}
function makeHome() {
  const home = mkdtempSync(join(tmpdir(), 'pricing-evolver-'));
  homes.push(home);
  return home;
}
afterEach(() => {
  while (homes.length) rmSync(homes.pop(), { recursive: true, force: true });
});

test('[F1] 解除 pin 后 syncDisk 不得把已应用目录回退到更旧的 current.json', () => {
  const home = makeHome();
  const dir = join(home, 'plugins', 'dsh-stats', 'pricing');
  mkdirSync(dir, { recursive: true });
  const now = Date.parse(base.publishedAt) + 86400000;

  // 固定版本期间的后台强制刷新只写 catalog 文件、不写 current.json（第 177 行提前返回），
  // 所以 current.json 会比磁盘上最新的合法目录更旧。
  writeFileSync(join(dir, 'catalog-' + (B + 2) + '.json'), JSON.stringify(envelope({ ...base, version: B + 2 })));
  writeFileSync(
    join(dir, 'current.json'),
    JSON.stringify({ envelope: envelope({ ...base, version: B + 1 }), lastSuccessAt: now }),
  );
  writeFileSync(
    join(dir, 'settings.json'),
    JSON.stringify({ revision: 0, autoUpdate: false, pinnedVersion: B + 2, overrides: [] }),
  );

  const store = new PricingStore(home, { fetchImpl: vi.fn(), now: () => now, publicKey });
  expect(store.status().version).toBe(B + 2);

  // 重新打开自动更新：解除 pin，但已应用的目录版本不能被更旧的 current.json 顶掉。
  store.save({ revision: 0, autoUpdate: true, overrides: [] });
  expect(store.status().version).toBe(B + 2);
});

