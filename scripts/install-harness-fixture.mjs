import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

// npm's prerelease peer ranges can select the next RC and mix incompatible
// Harness modules. Pin the complete upstream module closure to one release.
const [version, directory] = process.argv.slice(2);
assert(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(version || ''), 'provide an exact Harness version');
assert(directory, 'provide an isolated fixture directory');
const root = resolve(directory);
assert(!existsSync(join(root, 'package.json')) && !existsSync(join(root, 'node_modules')), 'fixture directory already contains an installation');
const dependencies = {}, exact = {};
let pending = ['dsh-session-projection', 'dsh-session-projection-cache', 'dsh-session-persistence-jsonl',
  'dsh-token-meter', 'dsh-session-stats', 'dsh-storage-json', 'dsh-typert-protocol', 'dsh-typert-loader'].map(name => '@deepseek-ai/' + name);
while (pending.length) {
  const batch = [...new Set(pending)].filter(name => !dependencies[name]);
  pending = [];
  for (let i = 0; i < batch.length; i += 8) {
    const manifests = await Promise.all(batch.slice(i, i + 8).map(async name => {
      const response = await fetch('https://registry.npmjs.org/' + encodeURIComponent(name) + '/' + version, { signal: AbortSignal.timeout(30000) });
      assert(response.ok, `${name}@${version}: registry HTTP ${response.status}`);
      const manifest = await response.json();
      assert.equal(manifest.version, version);
      dependencies[name] = version;
      return manifest;
    }));
    for (const manifest of manifests) {
      const specs = { ...manifest.dependencies, ...manifest.peerDependencies };
      pending.push(...Object.keys(specs).filter(name => name.startsWith('@deepseek-ai/dsh-') && !dependencies[name]));
      // Releases may pin their Cordis runtime exactly (0.1.5-rc.3: cordis 4.0.2,
      // cordis-plugin-loader 1.0.3); unpinned, npm selects newer conflicting peers.
      for (const [name, spec] of Object.entries(specs)) {
        if (!name.startsWith('@deepseek-ai/') || name.startsWith('@deepseek-ai/dsh-') || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(spec)) continue;
        assert(!exact[name] || exact[name] === spec, `${name}: conflicting exact pins ${exact[name]} and ${spec}`);
        exact[name] = spec;
      }
    }
  }
}
mkdirSync(root, { recursive: true });
writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'dsh-stats-harness-fixture', private: true, dependencies: { ...dependencies, ...exact } }, null, 2) + '\n');
const result = spawnSync('npm', ['install', '--no-fund', '--no-audit'], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
assert.equal(result.status, 0, 'fixture npm installation failed');
console.log(`Installed ${Object.keys(dependencies).length} pinned Harness modules at ${root}`);
