import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

assert(process.env.DSH_HARNESS_ROOT, 'DSH_HARNESS_ROOT must name an isolated Harness installation');
const harnessRoot = resolve(process.env.DSH_HARNESS_ROOT);
const requireHarness = createRequire(join(harnessRoot, 'package.json'));
const upstream = name => import(requireHarness.resolve('@deepseek-ai/' + name));
const scratch = mkdtempSync(join(tmpdir(), 'dsh-stats-benchmark-'));
symlinkSync(join(harnessRoot, 'node_modules'), join(scratch, 'node_modules'), 'dir');
copyFileSync(process.env.DSH_STATS_ENTRY || new URL('../lib/index.js', import.meta.url), join(scratch, 'stats.mjs'));
const { StatsService } = await import(pathToFileURL(join(scratch, 'stats.mjs')));
const { Context } = await upstream('cordis');
const { default: SessionStore, Session, SESSION_FORMAT_VERSION } = await upstream('dsh-session');
const { default: ProjectionRegistry } = await upstream('dsh-session-projection');
const ctx = new Context();
try {
  await ctx.plugin(SessionStore);
  await ctx.plugin(ProjectionRegistry);
  await ctx.plugin(StatsService);
  const registry = ctx.sessionProjections;
  function run(n, listen) {
    const now = Date.parse('2026-09-17T02:00:00Z');
    const events = Array.from({ length: n }, (_, i) => ({ type: 'assistant/message', seq: i, time: now + i,
      data: { turn: i, step: 0, message: { id: 'm' + i, role: 'assistant', content: [{ type: 'text', text: 'fixture' }],
        source: { kind: 'model', provider: 'deepseek', model: 'deepseek-v4-flash' } },
      stream: [{ type: 'chunk', time: now + i, chunk: { type: 'usage', usage: { inputTokens: 100000 + i, outputTokens: 1 } } }] }, surfaceOp: 'append' }));
    const header = { version: SESSION_FORMAT_VERSION, id: `bench-${n}-${listen}`, createdAt: now, isSeeded: false };
    const session = Session.fromRestore(header.id, events, header, 0, 'detached');
    let notifications = 0, emittedRows = 0, firstView;
    const stop = listen ? registry.onChanged((_session, key, value) => {
      if (key === 'statsRoute') { notifications++; emittedRows += value.routes.length; firstView ||= value; }
    }) : () => {};
    const start = performance.now();
    for (const event of events) registry.drive(session, event);
    const ms = performance.now() - start;
    stop();
    const view = registry.snapshot(session).values.statsRoute;
    assert.equal(view.routes.length, n);
    assert.equal(view.routes.reduce((sum, row) => sum + row.count, 0), n);
    assert.equal(view.routes.reduce((sum, row) => sum + row.uncached, 0), n * 100000 + n * (n - 1) / 2);
    if (listen) {
      assert.equal(notifications, n);
      assert.equal(emittedRows, n * (n + 1) / 2);
      assert.equal(firstView.routes.length, 1, 'earlier notifications remain immutable');
    }
    const checkpoint = JSON.parse(JSON.stringify(registry.checkpoint(session)));
    const restored = registry.restore(checkpoint, [], checkpoint.statsRoute.seq + 1, header, 0);
    assert.deepEqual(restored.snapshot.values.statsRoute, view);
    return { requests: n, listening: listen, ms: +ms.toFixed(1), notifications, emittedRows, rows: view.routes.length };
  }
  run(100, true); run(100, false);
  for (const n of [500, 1000, 2000, 4000]) for (const listen of [false, true]) console.log(JSON.stringify(run(n, listen)));
} finally {
  await ctx.fiber.dispose();
  rmSync(scratch, { recursive: true, force: true });
}
