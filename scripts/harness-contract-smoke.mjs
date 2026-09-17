import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Point at an isolated npm installation of one Harness version.
const harnessRoot = process.env.DSH_HARNESS_ROOT;
assert(harnessRoot, 'DSH_HARNESS_ROOT must name an isolated Harness installation');
const requireHarness = createRequire(join(resolve(harnessRoot), 'package.json'));
const upstream = name => import(requireHarness.resolve('@deepseek-ai/' + name));
const version = requireHarness('@deepseek-ai/dsh-session/package.json').version;
assert(['0.1.2-rc.1', '0.1.3-alpha.2', '0.1.5-rc.1', '0.1.5-rc.2', '0.1.6-alpha.1'].includes(version), 'unsupported contract fixture version: ' + version);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const scratch = mkdtempSync(join(tmpdir(), 'dsh-stats-contract-'));
const previousHome = process.env.DSH_HOME;
process.env.DSH_HOME = join(scratch, 'home');
symlinkSync(join(resolve(harnessRoot), 'node_modules'), join(scratch, 'node_modules'), 'dir');
copyFileSync(join(root, 'lib/index.js'), join(scratch, 'stats.mjs'));
copyFileSync(join(root, 'lib/typert.host.js'), join(scratch, 'typert.mjs'));
const { StatsService } = await import(pathToFileURL(join(scratch, 'stats.mjs')));
const { TYPERT } = await import(pathToFileURL(join(scratch, 'typert.mjs')));
const { Context } = await upstream('cordis');
const sessionModule = await upstream('dsh-session');
const ctx = new Context();
const handles = [];
const report = { version, format: sessionModule.SESSION_FORMAT_VERSION, checks: [] };

function eventLog(input, turn, seqOffset = 0) {
  const time = Date.parse('2026-09-08T02:00:00Z') + turn * 10_000;
  const usage = { inputTokens: input, outputTokens: 1000 };
  const message = { id: 'assistant-' + turn, role: 'assistant', content: [{ type: 'text', text: 'fixture' }],
    source: { kind: 'model', provider: 'minimax', model: 'MiniMax-M3' } };
  const rows = [
    ['turn/start', { turn }],
    ['user/message', { id: 'user-' + turn, role: 'user', content: [{ type: 'text', text: 'fixture' }], source: { kind: 'user' } }],
    ['step/start', { turn, step: 1 }],
    ['assistant/message', { turn, step: 1, message, ...(report.format >= 2 ? {
      stream: [
        { type: 'text-chunks', time0: time + 250, index: 0, dt: [], texts: ['fixture'] },
        { type: 'chunk', time: time + 290, chunk: { type: 'usage', usage } },
        { type: 'chunk', time: time + 300, chunk: { type: 'finish', reason: { kind: 'stop' } } },
      ],
    } : { usage }) }],
    ['step/end', { turn, step: 1 }],
    ['turn/end', { turn, reason: { kind: 'completed' } }],
  ];
  return rows.map(([type, data], index) => ({ type, data, seq: seqOffset + index, time: time + index * 100,
    ...(['user/message', 'assistant/message'].includes(type) ? { surfaceOp: 'append' } : {}) }));
}

async function persist(header, events, inheritedEventCount = 0) {
  const persistence = ctx.sessionPersistence;
  if (typeof persistence.open === 'function') {
    const writer = await persistence.create(header, { inheritedEventCount });
    handles.push(writer);
    await writer.append(events);
    await writer.flush();
    const reader = await persistence.open(header.id, 'read');
    handles.push(reader);
    return { ...(await reader.read()), meta: reader.header, inheritedEventCount: reader.inheritedEventCount };
  }
  await persistence.create(header, inheritedEventCount);
  await persistence.append(header.id, events);
  return persistence.inspect(header.id);
}

try {
  await ctx.plugin((await upstream('dsh-storage')).default);
  await ctx.plugin(await upstream('dsh-storage-json'), { root: join(scratch, 'storage') });
  await ctx.plugin(await upstream('dsh-storage-domain'), { backend: 'json' });
  await ctx.plugin(sessionModule.default);
  await ctx.plugin((await upstream('dsh-session-projection')).default);
  await ctx.plugin((await upstream('dsh-token-meter')).default);
  await ctx.plugin(await upstream('dsh-session-stats'));
  const sessionRoot = join(process.env.DSH_HOME, 'sessions');
  mkdirSync(sessionRoot, { recursive: true });
  await ctx.plugin((await upstream('dsh-session-persistence-jsonl')).default, { root: sessionRoot, compression: 'none' });
  await ctx.plugin((await upstream('dsh-session-projection-cache')).default, { writeEveryEvents: 100, writeIntervalMs: 60_000 });
  await ctx.plugin(StatsService);

  const inherited = eventLog(9999, 1);
  const marker = { type: 'session/end-seed', seq: inherited.length, time: inherited.at(-1).time + 1, data: { inherited: true } };
  const events = [...inherited, marker, ...eventLog(300000, 2, inherited.length + 1), ...eventLog(300000, 3, inherited.length + 7)];
  const header = { version: report.format, id: 'contract-fork', createdAt: inherited[0].time,
    cwd: join(scratch, 'workspace'), isSeeded: true, parentSession: 'contract-parent', delegationDepth: 1 };
  const observation = await persist(header, events, inherited.length);
  assert.equal(observation.inheritedEventCount, inherited.length);
  assert.deepEqual(observation.events, events);
  report.checks.push('official JSONL write/read through published persistence API');

  const restored = ctx.sessionProjections.restore({}, observation.events, 0, observation.meta, observation.inheritedEventCount);
  const routes = restored.snapshot.values.statsRoute.routes;
  assert.equal(routes.reduce((sum, row) => sum + row.uncached, 0), 600000);
  assert.equal(routes.reduce((sum, row) => sum + row.count, 0), 2);
  assert(routes.every(row => row.contextTokens === 300000));
  assert.equal(restored.snapshot.values.tokenUsage.uncachedInputTokens, 609999);
  const cached = ctx.sessionProjectionCache.coldSnapshot(observation.meta, observation.inheritedEventCount, observation.events);
  assert.deepEqual(cached.values.statsRoute, restored.snapshot.values.statsRoute);
  const repeated = ctx.sessionProjectionCache.coldSnapshot(observation.meta, observation.inheritedEventCount, observation.events);
  assert.deepEqual(repeated.values.statsRoute, cached.values.statsRoute);
  const checkpoint = JSON.parse(JSON.stringify(restored.checkpoint));
  const suffix = ctx.sessionProjections.restore(checkpoint, [], events.length, observation.meta, observation.inheritedEventCount);
  assert.deepEqual(suffix.snapshot.values.statsRoute, restored.snapshot.values.statsRoute);
  report.checks.push('real projection init/restore/checkpoint/coldSnapshot with fork exclusion');

  await persist({ version: report.format, id: 'contract-unassigned', createdAt: header.createdAt, cwd: header.cwd, isSeeded: false }, eventLog(7, 1));

  // Keep workspace membership deterministic; persistence, cache, projections and
  // the plugin service itself are the actual published implementations.
  const service = { ctx: {
    workspaceRegistry: { list: () => [{ id: 'contract', path: header.cwd, sessionIds: [header.id] }] },
    sessionPersistence: ctx.sessionPersistence, sessionProjections: ctx.sessionProjections,
    sessionProjectionCache: ctx.sessionProjectionCache,
  } };
  const result = await StatsService.prototype.aggregate.call(service);
  TYPERT.invocations.find(row => row.method === 'aggregate').result.schema.parse(result);
  const sessions = result.projects.flatMap(project => project.sessions);
  assert(sessions.some(session => session.id === 'contract-unassigned'), 'persistence listing must retain sessions without workspace membership');
  const session = sessions.find(session => session.id === header.id);
  assert.equal(session.calls, 2);
  assert.equal(session.stats.uncached, 600000);
  assert.equal(session.stats.output, 2000);
  assert(Math.abs(session.cost.totals[0].amount - 1.2768) < 1e-8);
  assert(!result.meta.warnings.some(row => /FAILED|INVALID|UNSUPPORTED/.test(row.code)), JSON.stringify(result.meta.warnings));
  report.checks.push('StatsService aggregate + shared wire schema: 2 calls, 600000 input, CNY 1.2768');
  const detached = JSON.parse(JSON.stringify(observation));
  const live = sessionModule.Session.fromRestore(header.id, detached.events, detached.meta, detached.inheritedEventCount, 'detached');
  const liveResult = await StatsService.prototype.aggregate.call({ ctx: { ...service.ctx, sessions: { get: id => id === header.id ? live : undefined } } });
  const liveSession = liveResult.projects.flatMap(project => project.sessions).find(row => row.id === header.id);
  assert.deepEqual(liveSession.cost, session.cost);
  assert.equal(liveSession.calls, session.calls);
  assert.deepEqual(liveSession.stats, session.stats);
  report.checks.push('real Session snapshotEvents agrees with cold aggregate');
  report.status = 'passed';
  console.log(JSON.stringify(report, null, 2));
} finally {
  for (const handle of handles.reverse()) await handle.close();
  await ctx.fiber.dispose();
  if (previousHome === undefined) delete process.env.DSH_HOME;
  else process.env.DSH_HOME = previousHome;
  rmSync(scratch, { recursive: true, force: true });
}
