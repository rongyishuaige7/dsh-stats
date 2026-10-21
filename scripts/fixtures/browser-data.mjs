import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pricingStore } from '../../src/pricing-store.js';
import { StatsService } from '../../src/index.js';

function historicalEnvelopes(currentVersion, count) {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const commits = execFileSync('git', ['log', '--format=%H', '--', 'data/pricing/latest.json'], { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
    .trim().split('\n').filter(Boolean);
  const found = [], seen = new Set();
  for (const commit of commits) {
    let envelope;
    try {
      envelope = JSON.parse(execFileSync('git', ['show', commit + ':data/pricing/latest.json'], { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }));
    } catch { continue; }
    const catalog = JSON.parse(envelope.payload);
    if (!Number.isSafeInteger(catalog.version) || catalog.version <= 0 || catalog.version === currentVersion || seen.has(catalog.version)) continue;
    seen.add(catalog.version); found.push({ version: catalog.version, envelope });
    if (found.length === count) break;
  }
  if (found.length < count) throw new Error('pricing fixture needs ' + count + ' signed historical snapshots, found ' + found.length);
  return found;
}

export async function browserData(home) {
  const previousHome = process.env.DSH_HOME;
  process.env.DSH_HOME = home;
  try {
    const now = Date.parse('2026-09-08T02:00:00Z');
    const sessions = {};
    const workspaces = ['api-service', 'client-dashboard'].map((id, index) => ({ id, title: id, path: '/fixture/' + id,
      sessionIds: Array.from({ length: 7 }, (_, day) => id + '-' + day), index }));
    for (const ws of workspaces) for (const [day, id] of ws.sessionIds.entries()) {
      const time = now - day * 86400000 + ws.index * 1800000;
      const header = { id, cwd: ws.path, createdAt: time, version: 2, isSeeded: false };
      const row = (type, seq, data) => ({ type, seq, data, time: time + seq * 15000 });
      sessions[id] = { header, inheritedEventCount: 0, events: [
        row('turn/start', 0, { turn: 1 }), row('step/start', 1, { turn: 1, step: 1 }),
        row('assistant/message', 2, { turn: 1, step: 1, usage: { inputTokens: 30000 + day * 5000, outputTokens: 4000, cacheReadTokens: 10000 },
          message: { source: { provider: ws.index ? 'fixture-compatible' : 'deepseek', model: ws.index ? 'MiniMax-M3' : 'deepseek-v4-flash' } } }),
        row('step/end', 3, { turn: 1, step: 1 }), row('turn/end', 4, { turn: 1 })
      ] };
    }
    const service = { ctx: {
      workspaceRegistry: { list: () => workspaces },
      sessionQuery: { listSessions: async () => Object.values(sessions).map(({ header }) => ({ header })), readSession: async id => sessions[id] }
    } };
    const estimated = await StatsService.prototype.aggregate.call(service);
    estimated.meta = { schemaVersion: 2, source: 'host', generatedAt: now, degraded: false, warnings: [] };
    for (const session of estimated.projects.flatMap(project => project.sessions)) session.title = 'Usage attribution and account refresh';
    for (const session of Object.values(sessions)) if (session.header.id.startsWith('client-')) session.events[2].data.message.source.model = 'fixture-unpriced';
    const partial = await StatsService.prototype.aggregate.call(service);
    partial.meta.generatedAt = now;
    partial.meta.degraded = true;
    partial.meta.warnings = [{ code: 'FIXTURE_INCOMPLETE', message: 'A provider price is unavailable. Confirmed usage remains visible.' }];
    for (const session of Object.values(sessions)) session.events[2].data.message.source.model = 'fixture-unpriced';
    const unsupported = await StatsService.prototype.aggregate.call(service);
    unsupported.meta = { ...partial.meta };
    // Cross every UI page boundary using real host aggregation, including a
    // session page containing both main conversations and subagents.
    const largeSessions = {};
    const largeWorkspaces = Array.from({ length: 120 }, (_, index) => ({
      id: 'large-' + index, title: 'Large project ' + index, path: '/fixture/large-' + index,
      sessionIds: Array.from({ length: index === 0 ? 205 : 1 }, (_, row) => 'large-' + index + '-' + row),
    }));
    for (const [index, ws] of largeWorkspaces.entries()) for (const [row, id] of ws.sessionIds.entries()) {
      const time = now - (row % 75) * 86400000;
      const template = structuredClone(sessions['api-service-0']);
      template.header = { ...template.header, id, cwd: ws.path, createdAt: time, origin: index === 0 && row >= 110 ? 'subagent' : null };
      template.events.forEach((event, seq) => { event.time = time + seq * 15000; });
      template.events[2].data.message.source = { provider: 'deepseek', model: 'deepseek-v4-flash' };
      largeSessions[id] = template;
    }
    const large = await StatsService.prototype.aggregate.call({ ctx: {
      workspaceRegistry: { list: () => largeWorkspaces },
      sessionQuery: { listSessions: async () => Object.values(largeSessions).map(({ header }) => ({ header })), readSession: async id => largeSessions[id] },
    } });
    large.meta = { ...estimated.meta };
    // Deterministic showcase data for README timeline screenshots. It goes
    // through the real aggregate path, uses only /fixture/ paths, and keeps
    // every usage row exactly priced.
    const showcaseProjects = [
      { id: 'api-service', title: 'api-service', path: '/fixture/api-service' },
      { id: 'client-dashboard', title: 'client-dashboard', path: '/fixture/client-dashboard' },
      { id: 'docs-site', title: 'docs-site', path: '/fixture/docs-site' },
      { id: 'data-pipeline', title: 'data-pipeline', path: '/fixture/data-pipeline' },
      { id: 'mobile-app', title: 'mobile-app', path: '/fixture/mobile-app' },
      { id: 'infra', title: 'infra', path: '/fixture/infra' },
    ];
    const showcaseSessions = {};
    const showcaseTitles = {};
    const showcaseWorkspaces = showcaseProjects.map(project => ({ id: project.id, title: project.title, path: project.path, sessionIds: [] }));
    const showcaseProjectById = new Map(showcaseProjects.map(project => [project.id, project]));
    const showcaseWorkspaceById = new Map(showcaseWorkspaces.map(workspace => [workspace.id, workspace]));
    const idleWeekdays = new Set(['2026-08-12', '2026-08-26', '2026-09-02']);
    const weekendActive = new Set(['2026-08-09', '2026-08-23']);
    // The trends page needs several models in one range, so each project uses
    // one of four models that the bundled catalog prices exactly.
    const showcaseModels = {
      'api-service': { provider: 'deepseek', model: 'deepseek-v4-pro' },
      'data-pipeline': { provider: 'deepseek', model: 'deepseek-v4-pro' },
      'client-dashboard': { provider: 'deepseek', model: 'deepseek-v4-flash' },
      'docs-site': { provider: 'deepseek', model: 'deepseek-v4-flash' },
      'mobile-app': { provider: 'minimax', model: 'MiniMax-M3' },
      'infra': { provider: 'moonshot', model: 'kimi-k2.7-code' },
    };
    const showcaseSubagentModel = { provider: 'deepseek', model: 'deepseek-v4-flash' };
    let showcaseSeed = 0x5eed1234;
    const showcaseRandom = () => {
      showcaseSeed = (Math.imul(showcaseSeed, 1664525) + 1013904223) >>> 0;
      return showcaseSeed / 4294967296;
    };
    const pick = (items) => items[Math.floor(showcaseRandom() * items.length)];
    const shuffled = (items) => {
      const copy = items.slice();
      for (let index = copy.length - 1; index > 0; index--) {
        const other = Math.floor(showcaseRandom() * (index + 1));
        [copy[index], copy[other]] = [copy[other], copy[index]];
      }
      return copy;
    };
    const addShowcaseBlock = (projectId, date, startMinute, durationMinutes, parentId = null) => {
      const project = showcaseProjectById.get(projectId);
      // Models follow the project so the trends page has a real spread; subagent
      // sessions keep the cheaper flash model.
      const identity = parentId ? showcaseSubagentModel : (showcaseModels[projectId] || showcaseSubagentModel);
      const start = Date.parse(date + 'T00:00:00+08:00') + startMinute * 60000;
      const end = start + durationMinutes * 60000;
      const id = projectId + '-' + date + '-' + startMinute + (parentId ? '-sub' : '');
      const header = { id, cwd: project.path, createdAt: start, version: 2, isSeeded: false };
      if (parentId) {
        header.origin = 'subagent';
        header.parentSession = parentId;
      }
      const events = [];
      let seq = 0;
      events.push({ type: 'turn/start', seq: seq++, data: { turn: 1 }, time: start });
      let step = 0;
      for (let time = start; time < end - 60000; time += 10 * 60000) {
        step += 1;
        events.push({ type: 'step/start', seq: seq++, data: { turn: 1, step }, time });
        events.push({
          type: 'assistant/message',
          seq: seq++,
          data: {
            turn: 1,
            step,
            usage: { inputTokens: 1200 + (step % 4) * 150, outputTokens: 120 + (step % 3) * 10, cacheReadTokens: 4000 },
            message: { source: { provider: identity.provider, model: identity.model } },
          },
          time: time + 1000,
        });
        events.push({ type: 'step/end', seq: seq++, data: { turn: 1, step }, time: time + 2000 });
      }
      events.push({ type: 'turn/end', seq: seq++, data: { turn: 1 }, time: end });
      showcaseSessions[id] = { header, inheritedEventCount: 0, events };
      showcaseWorkspaceById.get(projectId).sessionIds.push(id);
      showcaseTitles[id] = parentId ? project.title + ' · subagent' : project.title + ' · ' + date.slice(5);
      return id;
    };
    const activeWeekdays = [];
    for (let offset = 0; offset <= 34; offset++) {
      const date = new Date(Date.parse('2026-08-05T00:00:00Z') + offset * 864e5).toISOString().slice(0, 10);
      const weekday = new Date(date + 'T00:00:00Z').getUTCDay();
      if (weekday === 0 || weekday === 6) {
        if (weekendActive.has(date)) addShowcaseBlock('docs-site', date, 600, 60);
        continue;
      }
      if (idleWeekdays.has(date)) continue;
      activeWeekdays.push(date);
      if (date === '2026-09-07') {
        const parent = addShowcaseBlock('api-service', date, 540, 90);
        addShowcaseBlock('api-service', date, 570, 30, parent);
        addShowcaseBlock('client-dashboard', date, 540, 90);
        addShowcaseBlock('docs-site', date, 600, 90);
        addShowcaseBlock('data-pipeline', date, 810, 90);
        addShowcaseBlock('mobile-app', date, 1140, 60);
        continue;
      }
      const order = shuffled(showcaseProjects.map(project => project.id));
      const morningStart = 540 + pick([0, 15, 30]);
      const morningDuration = pick([60, 75, 90, 105, 120]);
      const secondStart = 540 + pick([0, 15, 30, 45]);
      const secondDuration = pick([60, 75, 90, 105, 120]);
      const thirdStart = 600 + pick([0, 15, 30]);
      const thirdDuration = pick([45, 60, 75, 90]);
      const afternoonStart = 810 + pick([0, 15, 30]);
      const afternoonDuration = pick([60, 75, 90, 105, 120]);
      addShowcaseBlock(order[0], date, morningStart, morningDuration);
      addShowcaseBlock(order[1], date, secondStart, secondDuration);
      addShowcaseBlock(order[2], date, thirdStart, thirdDuration);
      addShowcaseBlock(order[3], date, afternoonStart, afternoonDuration);
      const total = morningDuration + secondDuration + thirdDuration + afternoonDuration;
      const eveningDuration = pick([45, 60, 75, 90]);
      if (total + eveningDuration <= 480) addShowcaseBlock(order[4], date, 1140 + pick([0, 15, 30]), eveningDuration);
      if (date === '2026-08-20') addShowcaseBlock('data-pipeline', date, 840, 30);
      if (date === '2026-08-27') addShowcaseBlock('mobile-app', date, 1155, 30);
    }
    // Trends page history for the 26-week heatmap. It runs after the loop above
    // and resets the seed first, so the original 35 days keep their exact sequence.
    showcaseSeed = 0x7e4d5eed;
    const offDays = new Set(['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', '2026-06-19',
      '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17']);
    for (let time = Date.parse('2026-03-16T00:00:00Z'); time < Date.parse('2026-08-05T00:00:00Z'); time += 864e5) {
      const date = new Date(time).toISOString().slice(0, 10);
      const weekday = new Date(time).getUTCDay();
      if (offDays.has(date) || weekday === 0) continue;
      if (weekday === 6) {
        if (Math.floor((time / 864e5 + 3) / 7) % 3 === 0) addShowcaseBlock('docs-site', date, 600, 60);
        continue;
      }
      const blocks = date < '2026-05-01' ? 2 : date < '2026-07-01' ? 3 : 4;
      const order = shuffled(showcaseProjects.map(project => project.id));
      const starts = [540, 600, 810, 900];
      for (let index = 0; index < blocks; index++) addShowcaseBlock(order[index], date, starts[index] + pick([0, 15, 30]), pick([45, 60, 75, 90, 105]));
    }
    const showcase = await StatsService.prototype.aggregate.call({ ctx: {
      workspaceRegistry: { list: () => showcaseWorkspaces },
      sessionQuery: {
        listSessions: async () => Object.values(showcaseSessions).map(({ header }) => ({ header })),
        readSession: async id => showcaseSessions[id],
      },
    } });
    showcase.meta = { schemaVersion: 2, source: 'host', generatedAt: now, degraded: false, warnings: [] };
    for (const session of showcase.projects.flatMap(project => project.sessions)) {
      if (showcaseTitles[session.id]) session.title = showcaseTitles[session.id];
    }
    const base = { providerFamily: 'deepseek', mode: 'balance', adapter: 'deepseek-balance', status: 'ok', stale: false,
      fetchedAt: now, lastSuccessAt: now, errorCode: null, missingCredential: null, actionUrl: 'https://platform.deepseek.com/top_up', plan: null, windows: [] };
    const accounts = { generatedAt: now, accounts: [
      { ...base, id: 'deepseek-official', displayName: 'DeepSeek', balance: { currency: 'CNY', remaining: 123.45, used: null, total: null, toppedUp: 100, granted: 23.45, unlimited: false } },
      { ...base, id: 'minimax-coding', displayName: 'MiniMax Coding Plan', providerFamily: 'minimax', mode: 'subscription', adapter: 'minimax-token-plan', balance: null,
        actionUrl: 'https://platform.minimaxi.com/subscribe/token-plan', plan: 'Professional Coding Plan',
        windows: [
          { kind: 'session', usedPercent: 82, remainingPercent: 18, resetsAt: now + 7800000 },
          { kind: 'weekly', usedPercent: 32, remainingPercent: 68, resetsAt: now + 86400000 }
        ] },
      { ...base, id: 'openrouter', displayName: 'OpenRouter', providerFamily: 'openrouter', adapter: 'openrouter-balance',
        balance: { currency: 'USD', remaining: 15.5, used: 4.5, total: 20, toppedUp: null, granted: null, unlimited: false },
        actionUrl: 'https://openrouter.ai/credits' },
      { ...base, id: 'kimi-coding', displayName: 'Kimi For Coding', providerFamily: 'moonshot', mode: 'subscription', adapter: 'kimi-token-plan', balance: null, plan: null,
        actionUrl: 'https://www.kimi.com/code/console',
        windows: [{ kind: 'weekly', usedPercent: 96, remainingPercent: 4, resetsAt: now + 223200000 }] },
      { ...base, id: 'moonshotai-cn', displayName: 'Moonshot', providerFamily: 'moonshot', adapter: 'moonshot-balance',
        status: 'unavailable', stale: true, errorCode: 'http-5xx', lastSuccessAt: now - 1560000,
        balance: { currency: 'CNY', remaining: 36.2, used: null, total: null, toppedUp: 30, granted: 6.2, unlimited: false },
        actionUrl: 'https://platform.moonshot.cn/console/account' },
      { ...base, id: 'yi-api', displayName: 'yi-api', providerFamily: 'unknown', adapter: 'generic-usage',
        balance: { currency: 'USD', remaining: 42.8, used: null, total: null, toppedUp: null, granted: null, unlimited: false },
        actionUrl: null },
      { ...base, id: 'zai-coding-cn', displayName: 'Z.ai Coding Plan', providerFamily: 'zai', mode: 'subscription', adapter: 'zai-token-plan',
        status: 'not-configured', errorCode: 'not-configured', missingCredential: 'ZAI_API_KEY', lastSuccessAt: null, balance: null,
        actionUrl: 'https://z.ai/manage-apikey/apikey-list' },
      { ...base, id: 'anthropic', displayName: 'Anthropic', providerFamily: 'anthropic', mode: 'unsupported', adapter: null,
        status: 'unsupported', errorCode: 'unsupported', lastSuccessAt: null, balance: null, actionUrl: null }
    ], warnings: [{ providerId: 'moonshotai-cn', code: 'HTTP_5XX', message: 'provider account service is unavailable' }] };
    service.aggregate = engine => StatsService.prototype.aggregate.call(service, engine);
    // Start from a synced store, as a real host is after its startup refresh:
    // lastSuccessAt is then a millisecond timestamp the panel must display.
    const pricingDir = join(home, 'plugins', 'dsh-stats', 'pricing');
    mkdirSync(pricingDir, { recursive: true });
    const envelope = JSON.parse(readFileSync(new URL('../../data/pricing/latest.json', import.meta.url), 'utf8'));
    writeFileSync(join(pricingDir, 'current.json'), JSON.stringify({ envelope, lastSuccessAt: now }));
    const currentVersion = JSON.parse(envelope.payload).version;
    const snapshotFiles = new Map();
    const historical = historicalEnvelopes(currentVersion, 7);
    for (const snapshot of historical) snapshotFiles.set('catalog-' + snapshot.version + '.json', JSON.stringify(snapshot.envelope));
    // Duplicate and invalid version names exercise filtering in the UI while
    // leaving the signed canonical snapshots recoverable.
    snapshotFiles.set('catalog-0' + historical[0].version + '.json', JSON.stringify(historical[0].envelope));
    for (const [name, content] of snapshotFiles) writeFileSync(join(pricingDir, name), content);
    const pricingHistory = {
      clear() { for (const name of snapshotFiles.keys()) { try { unlinkSync(join(pricingDir, name)); } catch {} } },
      restore() { for (const [name, content] of snapshotFiles) writeFileSync(join(pricingDir, name), content); },
    };
    pricingStore(service, home).fetch = async () => { throw new Error('fixture-offline'); };
    const pricingRequest = async request => {
      const previous = process.env.DSH_HOME; process.env.DSH_HOME = home;
      try { return await StatsService.prototype.pricing.call(service, request); }
      finally { if (previous === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = previous; }
    };
    return { estimated, partial, unsupported, large, showcase, accounts, pricingRequest, pricingHistory };
  } finally {
    if (previousHome === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previousHome;
  }
}
