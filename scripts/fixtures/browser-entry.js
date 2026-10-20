import React, { useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { IconDataOutline16, IconCloseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives';

window.__ModuleLoader__ = { async load({ factory }) {
  const plugin = factory(name => {
    if (name === 'react') return React;
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return { IconDataOutline16, IconCloseOutline16 };
    throw new Error('Unexpected browser dependency: ' + name);
  });
  const data = await (await fetch('/data')).json();
  const query = new URLSearchParams(location.search);
  // Keep date-based views aligned with the fixture on future test runs.
  // ?shiftDays=N moves "today" without touching the fixture history.
  Date.now = () => data.estimated.meta.generatedAt + Number(query.get('shiftDays') || 0) * 864e5;
  if (query.get('theme') === 'dark') {
    document.body.dataset.dsDarkTheme = '';
    for (const [name, color] of Object.entries({ '--dsw-specific-menu': '#1d222c', '--dsw-alias-bg-layer-1': '#161a21', '--dsw-alias-bg-layer-2': '#1d222c', '--dsw-alias-label-primary': '#e7eaf0',
      '--dsw-alias-label-secondary': '#a6adbb', '--dsw-alias-label-tertiary': '#8b95a5', '--dsw-alias-border': '#3f4653', '--dsw-alias-border-inverted': '#3f4653' })) document.body.style.setProperty(name, color);
  }
  const fixture = window.__fixture = { statsMode: query.get('stats') || 'estimated', accountMode: 'ok', accountSet: query.get('accountSet') || 'default', omit: [], releasedAccount: false, calls: [], data };
  const clone = value => JSON.parse(JSON.stringify(value));
  const accountCollection = () => {
    const value = clone(data.accounts);
    if (fixture.accountSet === 'single') value.accounts = value.accounts.filter(account => account.id === 'deepseek-official');
    if (fixture.accountSet === 'attention') {
      const deepseek = value.accounts.find(account => account.id === 'deepseek-official');
      Object.assign(deepseek, { balance: { ...deepseek.balance, remaining: 0, toppedUp: 0, granted: 0 } });
      const openrouter = value.accounts.find(account => account.id === 'openrouter');
      Object.assign(openrouter, { status: 'unauthorized', errorCode: 'unauthorized', lastSuccessAt: null, balance: null });
    }
    if (fixture.omit.length) value.accounts = value.accounts.filter(account => !fixture.omit.includes(account.id));
    return value;
  };
  let dictionaries;
  const slots = [];
  const stats = {
    pricing: async request => {
      fixture.calls.push(['pricing', request.action]);
      return (await fetch('/pricing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) })).json();
    },
    aggregate: async () => {
      fixture.calls.push(['aggregate']);
      if (query.has('hold') && !fixture.released) await new Promise(resolve => { fixture.releaseStats = () => { fixture.released = true; resolve(); }; });
      if (fixture.statsMode === 'error') return { ok: false, error: { code: 'gateway/internal', message: 'Fixture statistics refresh failed' } };
      return { ok: true, value: clone(data[fixture.statsMode]) };
    },
    account: async force => {
      fixture.calls.push(['account', force]);
      if (query.has('holdAccount') && !fixture.releasedAccount) await new Promise(resolve => { fixture.releaseAccount = () => { fixture.releasedAccount = true; resolve(); }; });
      if (fixture.accountMode === 'error') return { ok: false, error: { code: 'gateway/internal', message: 'Fixture account refresh failed' } };
      if (fixture.accountMode === 'legacy') return { ok: false, error: { code: 'gateway/method-unavailable', message: 'Legacy host' } };
      const value = accountCollection();
      if (fixture.accountMode === 'stale') Object.assign(value.accounts[0], { status: 'unavailable', stale: true, errorCode: 'http-5xx' });
      return { ok: true, value };
    },
    current: async () => {
      fixture.calls.push(['current']);
      return { ok: true, value: { generatedAt: data.accounts.generatedAt, accounts: [{ provider: 'deepseek', name: 'DeepSeek', status: 'ok',
        currency: 'CNY', total: 123.45, toppedUp: 100, granted: 23.45, fetchedAt: data.accounts.generatedAt,
        topUpUrl: 'https://platform.deepseek.com/top_up', errorCode: null }], warnings: [] } };
    }
  };
  if (!query.has('noProviders')) {
    stats.providers = async () => {
      fixture.calls.push(['providers']);
      const value = accountCollection();
      return { ok: true, value: { generatedAt: data.accounts.generatedAt, providers: value.accounts.map(account => ({
        id: account.id,
        displayName: account.displayName,
        providerFamily: account.providerFamily,
        accountMode: account.mode,
        adapter: account.adapter,
        configured: account.status !== 'not-configured' && account.adapter !== null,
        status: account.adapter ? 'pending' : 'unsupported',
        fetchedAt: null
      })) } };
    };
  }
  const ctx = {
    effect: callback => callback(), locale: { register: (_namespace, value) => { dictionaries = value; } },
    remote: { $mount: async () => () => {}, stats }, inject: async (_keys, callback) => callback(ctx),
    slots: { inject: (_name, callback) => callback(), register: (definition, component) => slots.push({ definition, component }) },
    sessions: { open: id => { fixture.openedSession = id; } }
  };
  await plugin.apply(ctx);
  fixture.t = key => dictionaries[query.get('lang') || 'zh'][key] ?? key;
  const panel = slots.find(slot => slot.definition.id === 'stats-panel');
  const trigger = slots.find(slot => slot.definition.id === 'stats');
  const props = panel.definition.inject();
  const store = props.hooks.statsOpen;
  const byId = {};
  for (const session of data.estimated.projects.flatMap(project => project.sessions)) byId[session.id] = {
    id: session.id, title: session.title, updatedAt: session.updatedAt,
    projectionValues: { tokenUsage: { uncachedInputTokens: session.stats.uncached, outputTokens: session.stats.output } }
  };
  // Observable session store: each read of byId marks a client-side aggregation.
  fixture.sessionReads = 0;
  const sessionListeners = new Set();
  const snapshot = () => ({ get byId() { fixture.sessionReads++; return byId; } });
  let summaries = snapshot();
  const subscribeSessions = listener => { sessionListeners.add(listener); return () => sessionListeners.delete(listener); };
  fixture.bumpSessions = (inputDelta = 0) => {
    if (inputDelta) {
      const id = Object.keys(byId)[0], session = byId[id], usage = session.projectionValues.tokenUsage;
      byId[id] = { ...session, projectionValues: { ...session.projectionValues, tokenUsage: { ...usage, uncachedInputTokens: usage.uncachedInputTokens + inputDelta } } };
    }
    summaries = snapshot(); sessionListeners.forEach(listener => listener());
  };
  let workspaces = { items: data.estimated.projects.map(project => ({ workspaceId: project.id, path: project.path, sessionIds: project.sessions.map(session => session.id) })) };
  const workspaceListeners = new Set();
  const subscribeWorkspaces = listener => { workspaceListeners.add(listener); return () => workspaceListeners.delete(listener); };
  fixture.bumpWorkspaces = () => {
    workspaces = { items: workspaces.items.map((item, i) => i ? item : { ...item, title: 'Fixture workspace updated' }) };
    workspaceListeners.forEach(listener => listener());
  };
  fixture.panelRenders = 0;
  function App() {
    return React.createElement(React.Fragment, null,
      React.createElement('aside', { style: { width: 240, padding: 12 } },
        React.createElement(trigger.component, { ...trigger.definition.inject(), wide: true, t: fixture.t,
          useStatsOpen: selector => useSyncExternalStore(store.subscribe, () => selector(store.getSnapshot())) })),
      React.createElement(panel.component, { ...props, t: fixture.t,
        useStatsOpen: selector => { fixture.panelRenders++; return useSyncExternalStore(store.subscribe, () => selector(store.getSnapshot())); },
        useSessions: selector => useSyncExternalStore(subscribeSessions, () => selector(summaries)),
        useWorkspaces: selector => useSyncExternalStore(subscribeWorkspaces, () => selector(workspaces)) })
    );
  }
  createRoot(document.getElementById('app')).render(React.createElement(App));
  fixture.ready = true;
} };
