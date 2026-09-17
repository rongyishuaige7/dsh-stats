import { pricingStore } from '../../src/pricing-store.js';
import { StatsService } from '../../src/index.js';

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
    const base = { providerFamily: 'deepseek', mode: 'balance', adapter: 'deepseek-balance', status: 'ok', stale: false,
      fetchedAt: now, lastSuccessAt: now, errorCode: null, missingCredential: null, actionUrl: 'https://platform.deepseek.com/top_up', plan: null, windows: [] };
    const accounts = { generatedAt: now, accounts: [
      { ...base, id: 'deepseek-official', displayName: 'DeepSeek', balance: { currency: 'CNY', remaining: 123.45, used: null, total: null, toppedUp: 100, granted: 23.45, unlimited: false } },
      { ...base, id: 'minimax-coding', displayName: 'MiniMax Coding Plan', providerFamily: 'minimax', mode: 'subscription', adapter: 'minimax-token-plan', balance: null,
        actionUrl: 'https://platform.minimaxi.com/subscribe/token-plan', plan: 'Professional Coding Plan',
        windows: [{ kind: 'weekly', usedPercent: 32, remainingPercent: 68, resetsAt: now + 86400000 }] }
    ], warnings: [] };
    service.aggregate = engine => StatsService.prototype.aggregate.call(service, engine);
    pricingStore(service, home).fetch = async () => { throw new Error('fixture-offline'); };
    const pricingRequest = async request => {
      const previous = process.env.DSH_HOME; process.env.DSH_HOME = home;
      try { return await StatsService.prototype.pricing.call(service, request); }
      finally { if (previous === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = previous; }
    };
    return { estimated, partial, unsupported, accounts, pricingRequest };
  } finally {
    if (previousHome === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previousHome;
  }
}
