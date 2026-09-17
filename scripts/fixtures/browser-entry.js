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
  // Keep date-based views aligned with the fixture on future test runs.
  Date.now = () => data.estimated.meta.generatedAt;
  const query = new URLSearchParams(location.search);
  if (query.get('theme') === 'dark') {
    document.body.dataset.dsDarkTheme = '';
    for (const [name, color] of Object.entries({ '--dsw-specific-menu': '#1d222c', '--dsw-alias-label-primary': '#e7eaf0',
      '--dsw-alias-label-secondary': '#a6adbb', '--dsw-alias-label-tertiary': '#8b95a5', '--dsw-alias-border': '#3f4653', '--dsw-alias-border-inverted': '#3f4653' })) document.body.style.setProperty(name, color);
  }
  const fixture = window.__fixture = { statsMode: query.get('stats') || 'estimated', accountMode: 'ok', calls: [], data };
  const clone = value => JSON.parse(JSON.stringify(value));
  let dictionaries;
  const slots = [];
  const stats = {
    pricing: async request => {
      fixture.calls.push(['pricing', request.action]);
      return (await fetch('/pricing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) })).json();
    },
    aggregate: async () => {
      fixture.calls.push(['aggregate']);
      if (fixture.statsMode === 'error') return { ok: false, error: { code: 'gateway/internal', message: 'Fixture statistics refresh failed' } };
      return { ok: true, value: clone(data[fixture.statsMode]) };
    },
    account: async force => {
      fixture.calls.push(['account', force]);
      if (fixture.accountMode === 'error') return { ok: false, error: { code: 'gateway/internal', message: 'Fixture account refresh failed' } };
      if (fixture.accountMode === 'legacy') return { ok: false, error: { code: 'gateway/method-unavailable', message: 'Legacy host' } };
      const value = clone(data.accounts);
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
  const summaries = { byId: {} };
  for (const session of data.estimated.projects.flatMap(project => project.sessions)) summaries.byId[session.id] = {
    id: session.id, title: session.title, updatedAt: session.updatedAt,
    projectionValues: { tokenUsage: { uncachedInputTokens: session.stats.uncached, outputTokens: session.stats.output } }
  };
  const workspaces = { items: data.estimated.projects.map(project => ({ workspaceId: project.id, path: project.path, sessionIds: project.sessions.map(session => session.id) })) };
  function App() {
    return React.createElement(React.Fragment, null,
      React.createElement('aside', { style: { width: 240, padding: 12 } },
        React.createElement(trigger.component, { ...trigger.definition.inject(), wide: true, t: fixture.t })),
      React.createElement(panel.component, { ...props, t: fixture.t,
        useStatsOpen: selector => selector(useSyncExternalStore(store.subscribe, store.getSnapshot)),
        useSessions: selector => selector(summaries), useWorkspaces: selector => selector(workspaces) })
    );
  }
  createRoot(document.getElementById('app')).render(React.createElement(App));
  fixture.ready = true;
} };
