import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { accessSync, constants, mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import WebSocket from 'ws';
import { browserData } from './fixtures/browser-data.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const chromePath = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
accessSync(chromePath, constants.X_OK);
const scratch = mkdtempSync(join(tmpdir(), 'dsh-stats-browser-'));
const output = process.env.DSH_SMOKE_OUTPUT ? resolve(process.env.DSH_SMOKE_OUTPUT) : mkdtempSync(join(tmpdir(), 'dsh-stats-browser-results-'));
mkdirSync(output, { recursive: true });
const report = { status: 'running', screenshots: [], checks: [], errors: [] };
const data = await browserData(join(scratch, 'home'));
const runtime = await build({ entryPoints: [join(root, 'scripts/fixtures/browser-entry.js')], bundle: true, write: false,
  format: 'iife', platform: 'browser', minify: true, define: { 'process.env.NODE_ENV': '"production"' },
  // Only the two official icons are used; their barrel also imports KaTeX CSS.
  loader: { '.css': 'empty' } });
const client = readFileSync(join(root, 'lib/client.js'));
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DSH Stats Fixture</title><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;letter-spacing:0;background:#f4f5f6;--dsw-specific-menu:#fff;--dsw-alias-bg-layer-1:#fff;--dsw-alias-bg-layer-2:#fff;--dsw-alias-label-primary:#20242b;--dsw-alias-label-secondary:#565e6b;--dsw-alias-label-tertiary:#707986;--dsw-alias-border:#dce0e5;--dsw-alias-border-inverted:#dce0e5}</style></head><body><div id="app"></div><script src="/runtime.js"></script><script src="/client.js"></script></body></html>';
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1').pathname;
  if (path === '/pricing' && request.method === 'POST') {
    try {
      let body = ''; for await (const chunk of request) body += chunk;
      const value = await data.pricingRequest(JSON.parse(body));
      response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify({ ok: true, value }));
    } catch { response.writeHead(400, { 'content-type': 'application/json' }); response.end(JSON.stringify({ ok: false, error: { message: 'pricing-fixture-error' } })); }
    return;
  }
  const [type, body] = path === '/runtime.js' ? ['text/javascript', runtime.outputFiles[0].contents]
    : path === '/client.js' ? ['text/javascript', client] : path === '/data' ? ['application/json', JSON.stringify(data)] : ['text/html', html];
  response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); response.end(body);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = 'http://127.0.0.1:' + server.address().port;
report.runtime = { pid: process.pid, url, purpose: 'isolated browser fixture' };
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--disable-background-networking', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--user-data-dir=' + join(scratch, 'chrome'), 'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'], detached: process.platform !== 'win32' });
let chromeError;
let chromeStderr = '';
chrome.on('error', error => { chromeError = error; });
chrome.stderr.setEncoding('utf8');
chrome.stderr.on('data', chunk => { chromeStderr = (chromeStderr + chunk).slice(-8192); });
async function chromePort() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (chromeError) throw chromeError;
    if (chrome.exitCode !== null || chrome.signalCode !== null) {
      throw new Error('Chrome exited before startup: ' + (chrome.signalCode || chrome.exitCode));
    }
    try {
      const port = Number(readFileSync(join(scratch, 'chrome/DevToolsActivePort'), 'utf8').split('\n')[0]);
      if (Number.isInteger(port) && port > 0 && port <= 65535) return port;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await delay(100);
  }
  throw new Error('Timed out after 30s: Chrome startup');
}
let socket;
let nextId = 0;
const pending = new Map();
async function waitFor(callback, description) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) { try { if (await callback()) return; } catch {} await delay(100); }
  throw new Error('Timed out: ' + description);
}
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(method + ' timed out')); }, 8000);
    pending.set(id, message => { clearTimeout(timer); message.error ? reject(new Error(message.error.message)) : resolve(message.result); });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result?.value;
}
const until = (expression, description = expression) => waitFor(() => evaluate('Boolean(' + expression + ')'), description);
async function click(selector) {
  // React renders asynchronously after the fixture reports ready.
  await until(`document.querySelector(${JSON.stringify(selector)})`, selector);
  assert(await evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!node) return false; node.click(); return true; })()`), selector);
  await delay(100);
}
async function refresh() { await click('[data-action=refresh]'); }
async function tab(index) { await click('.dss-tabs button:nth-child(' + index + ')'); }
async function focus(selector) {
  await until(`document.querySelector(${JSON.stringify(selector)})`, selector);
  assert(await evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!node) return false; node.focus(); return document.activeElement === node; })()`), 'focus ' + selector);
  await delay(50);
}
const KEY_CODES = { Tab: 9, Escape: 27, Enter: 13, ArrowLeft: 37, ArrowRight: 39, ArrowUp: 38, ArrowDown: 40, ' ': 32 };
async function press(key, modifiers = 0) {
  const vk = KEY_CODES[key];
  assert(vk, 'unsupported key ' + key);
  const code = key === ' ' ? 'Space' : key;
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
  await delay(80);
}
const PANEL_FOCUSABLES = `(() => {
  const panel = document.querySelector('.dss-panel');
  if (!panel) return [];
  return [...panel.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])')]
    .filter(node => !node.disabled && !node.hidden && node.getClientRects().length && node.tabIndex >= 0);
})()`;
const DRAWER_FOCUSABLES = `(() => {
  const drawer = document.querySelector('.dss-drawer');
  if (!drawer) return [];
  return [...drawer.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])')]
    .filter(node => !node.disabled && !node.hidden && node.getClientRects().length && node.tabIndex >= 0);
})()`;
async function headerMetrics() {
  return evaluate(`(() => {
    const panel = document.querySelector('.dss-panel').getBoundingClientRect();
    const title = document.querySelector('.dss-head h2').getBoundingClientRect();
    const tabs = document.querySelector('.dss-tabs').getBoundingClientRect();
    const lines = [...document.querySelectorAll('[role=tab]')].map(node => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getClientRects().length;
    });
    const status = document.querySelector('.dss-status-text');
    const exportLabel = document.querySelector('.dss-export-label');
    return {
      panelWidth: panel.width,
      ownRow: tabs.top >= title.bottom - 1,
      lines,
      statusDisplay: status ? getComputedStyle(status).display : 'none',
      exportDisplay: exportLabel ? getComputedStyle(exportLabel).display : 'none'
    };
  })()`);
}
// Page.navigate can return before the old document is replaced; clear its ready
// flag first so the wait cannot pass on the page being navigated away from.
async function navigate(path) {
  await evaluate('window.__fixture && (window.__fixture.ready = false)').catch(() => {});
  await command('Page.navigate', { url: url + path });
  await until('window.__fixture?.ready');
}
async function capture(name) {
  const result = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const filename = name + '.png'; writeFileSync(join(output, filename), Buffer.from(result.data, 'base64')); report.screenshots.push(filename);
}
async function layout(name) {
  const issues = await evaluate(`(() => {
    const selectors = ['.dss-head','.dss-tabs','.dss-data-status','.dss-status-banner','.dss-tools','.dss-kpis','.dss-strip','.dss-ptable','.dss-balance-head','.dss-balance-account','.dss-hero'];
    return selectors.flatMap(selector => [...document.querySelectorAll(selector)].flatMap(node => {
      if (!node.getClientRects().length || node.scrollWidth <= node.clientWidth + 2) return [];
      // The tablist is intentionally horizontally scrollable below 860px.
      if (selector === '.dss-tabs' && getComputedStyle(node).overflowX === 'auto') return [];
      return [selector + ': ' + node.scrollWidth + ' > ' + node.clientWidth];
    }));
  })()`);
  assert.deepEqual(issues, [], name + ' content overflow');
  const pageSize = await evaluate(`({ width: innerWidth, scroll: document.documentElement.scrollWidth, nodes: [...document.querySelectorAll('body *')].filter(node => node.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map(node => [node.className, node.getBoundingClientRect().right]) })`);
  assert(pageSize.scroll <= pageSize.width + 1, name + ' page overflow: ' + JSON.stringify(pageSize));
  const overlaps = await evaluate(`(() => {
    const issues = [], rect = node => node.getBoundingClientRect();
    const overlaps = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    const head = document.querySelector('.dss-head'), bounds = rect(head);
    const controls = [...head.children].filter(node => node.getClientRects().length);
    for (const [i, node] of controls.entries()) {
      const r = rect(node);
      if (r.width < 1 || r.left < bounds.left || r.right > bounds.right + 1) issues.push('header clipped: ' + node.className);
      for (const other of controls.slice(i + 1)) if (overlaps(r, rect(other))) issues.push('header overlap');
    }
    for (const card of document.querySelectorAll('.dss-price-rule')) {
      const summary = card.querySelector('summary'), boundary = rect(summary);
      for (const selector of ['.dss-price-rule-lead','.dss-price-rule-trail']) {
        const group = card.querySelector(selector), r = rect(group), children = [...group.children];
        if (r.right > boundary.right + 1 || group.scrollWidth > group.clientWidth + 2) issues.push('card clipped: ' + card.textContent.slice(0, 80));
        for (const [i, child] of children.entries()) for (const other of children.slice(i + 1)) if (overlaps(rect(child), rect(other))) issues.push('card text overlap');
      }
      if (overlaps(rect(card.querySelector('.dss-price-rule-lead')), rect(card.querySelector('.dss-price-rule-trail')))) issues.push('model/rate overlap');
      for (const value of card.querySelectorAll('.dss-price-rate-v')) if (value.scrollWidth > value.clientWidth + 2) issues.push('rate clipped');
    }
    return issues.slice(0, 10);
  })()`);
  assert.deepEqual(overlaps, [], name + ' internal overlap or clipping');
}
try {
  const port = await chromePort();
  const pages = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  socket.on('message', raw => {
    const message = JSON.parse(String(raw));
    if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
    if (message.method === 'Runtime.exceptionThrown') report.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') report.errors.push(message.params.args.map(arg => arg.value || arg.description).join(' '));
    if (message.method === 'Network.loadingFailed') report.errors.push(message.params.errorText);
  });
  await once(socket, 'open');
  await command('Runtime.enable'); await command('Page.enable'); await command('Network.enable');
  // Runs first, while the stored tab preference is still the default overview.
  await navigate('/?lang=zh');
  await until('document.querySelector(".dss-trigger")'); await delay(100);
  const closedRenders = await evaluate('window.__fixture.panelRenders');
  await evaluate('window.__fixture.bumpSessions(); window.__fixture.bumpWorkspaces()'); await delay(200);
  assert.equal(await evaluate('window.__fixture.sessionReads'), 0, 'closed panel must not aggregate session updates');
  assert.equal(await evaluate('window.__fixture.panelRenders'), closedRenders, 'closed panel must not render on session/workspace updates');
  await click('.dss-trigger');
  await until('document.querySelector(".dss-data-status.exact")');
  assert.equal(await evaluate('document.activeElement.id'), 'dss-tab-overview', 'panel opens with focus on the current tab');
  assert.equal(await evaluate('document.querySelector(".dss-trigger").getAttribute("aria-expanded")'), 'true', 'trigger exposes the open state');
  assert(await evaluate('!document.querySelector(".dss-status-banner")'), 'exact state has no banner');
  assert(await evaluate('["refresh","export","pricing","close"].every(a => !!document.querySelector("[data-action=" + a + "]"))'), 'header exposes data-action hooks');
  const hostRenders = await evaluate('window.__fixture.panelRenders');
  await evaluate('window.__fixture.sessionReads = 0; window.__fixture.bumpSessions(); window.__fixture.bumpWorkspaces()'); await delay(200);
  assert.equal(await evaluate('window.__fixture.sessionReads'), 0, 'host data must not be recomputed from session updates');
  assert.equal(await evaluate('window.__fixture.panelRenders'), hostRenders, 'host data must not render on session/workspace updates');
  const accountCalls = () => evaluate('window.__fixture.calls.filter(row => row[0] === "account").map(row => row[1])');
  assert.deepEqual(await accountCalls(), [], 'balance must not be queried outside its tab');
  await tab(4); await until('document.querySelector(".dss-balance-name")');
  assert.deepEqual(await accountCalls(), [false]);
  await refresh(); await delay(300);
  await tab(1); await tab(4); await until('document.querySelector(".dss-balance-name")'); await delay(300);
  assert.deepEqual(await accountCalls(), [false, true, false], 'forced refresh applies once; re-entry uses the host cache');
  await tab(1);
  report.checks.push('closed panel skips aggregation; balance queried only on its tab, forced refresh once');
  // 1b/2: export-menu Escape order, then panel Escape order.
  await focus('[data-action=export]');
  await click('[data-action=export]');
  await until('document.querySelector("[role=menu]")');
  assert.equal(await evaluate('document.querySelector("[data-action=export]").getAttribute("aria-expanded")'), 'true', 'export menu opens');
  assert(await evaluate('!!document.querySelector("[data-action=export-csv]") && !!document.querySelector("[data-action=export-json]")'), 'export menu items expose data-action');
  await press('Escape');
  await until('!document.querySelector("[role=menu]")');
  assert(await evaluate('document.activeElement === document.querySelector("[data-action=export]")'), 'export menu Escape returns focus to the export button');
  assert(await evaluate('document.querySelector(".dss-panel") !== null'), 'export menu Escape must not close the panel');
  assert.equal(await evaluate('document.querySelector("[data-action=export]").getAttribute("aria-expanded")'), 'false', 'export menu closes');
  await press('Escape');
  await until('!document.querySelector(".dss-panel")');
  assert(await evaluate('document.activeElement === document.querySelector(".dss-trigger")'), 'panel Escape returns focus to the trigger');
  assert.equal(await evaluate('document.querySelector(".dss-trigger").getAttribute("aria-expanded")'), 'false', 'trigger exposes the closed state');
  await focus('.dss-trigger');
  await click('.dss-trigger');
  await until('document.querySelector(".dss-data-status.exact")');
  assert.equal(await evaluate('document.activeElement.id'), 'dss-tab-overview', 'reopened panel focuses the current tab');
  assert.equal(await evaluate('document.querySelector(".dss-panel").getAttribute("role")'), 'dialog', 'panel uses dialog semantics');
  assert.equal(await evaluate('document.querySelector(".dss-panel").getAttribute("aria-modal")'), 'true', 'panel is modal');
  assert.equal(await evaluate('document.querySelector(".dss-tabs").getAttribute("role")'), 'tablist', 'tabs use tablist semantics');
  assert.equal(await evaluate('document.querySelector("#dss-tabpanel").getAttribute("role")'), 'tabpanel');
  assert.equal(await evaluate('document.querySelector("#dss-tabpanel").getAttribute("aria-labelledby")'), 'dss-tab-overview');
  const callsBeforeArrows = await accountCalls();
  await press('ArrowRight');
  assert.equal(await evaluate('document.activeElement.id'), 'dss-tab-timeline', 'ArrowRight moves focus only');
  assert.equal(await evaluate('document.querySelector("#dss-tab-overview").getAttribute("aria-selected")'), 'true', 'ArrowRight does not activate');
  assert.equal(await evaluate('document.querySelector("#dss-tab-timeline").getAttribute("aria-selected")'), 'false');
  await press('Enter');
  await until('document.querySelector(".dss-tl")');
  assert.equal(await evaluate('document.querySelector("#dss-tab-timeline").getAttribute("aria-selected")'), 'true', 'Enter activates the focused tab');
  assert.equal(await evaluate('document.querySelector("#dss-tabpanel").getAttribute("aria-labelledby")'), 'dss-tab-timeline', 'tabpanel follows the active tab');
  assert.deepEqual(await accountCalls(), callsBeforeArrows, 'tab keyboard navigation must not query the balance account');
  await press('ArrowLeft');
  assert.equal(await evaluate('document.activeElement.id'), 'dss-tab-overview');
  await press('Enter');
  await until('document.querySelector(".dss-kpis")');
  await evaluate(`(() => { const nodes = ${PANEL_FOCUSABLES}; if (!nodes.length) return false; nodes[nodes.length - 1].focus(); return true; })()`);
  await press('Tab');
  assert(await evaluate(`(() => { const nodes = ${PANEL_FOCUSABLES}; return nodes.length > 0 && document.activeElement === nodes[0]; })()`), 'Tab wraps from the last focusable to the first');
  await evaluate(`(() => { const nodes = ${PANEL_FOCUSABLES}; if (!nodes.length) return false; nodes[0].focus(); return true; })()`);
  await press('Tab', 8);
  assert(await evaluate(`(() => { const nodes = ${PANEL_FOCUSABLES}; return nodes.length > 0 && document.activeElement === nodes[nodes.length - 1]; })()`), 'Shift+Tab wraps from the first focusable to the last');
  await navigate('/?hold=1&lang=zh');
  await focus('.dss-trigger');
  await click('.dss-trigger');
  await until('typeof window.__fixture.releaseStats === "function"');
  await evaluate('window.__fixture.releaseStats()');
  await until('document.querySelector(".dss-data-status.exact")');
  await evaluate('window.__fixture.released = false');
  await focus('[data-action=refresh]');
  await click('[data-action=refresh]');
  await until("document.querySelector('[data-action=refresh]').disabled");
  await delay(100);
  const activeAfterDisabled = await evaluate(`(() => {
    const active = document.activeElement;
    return { tag: active?.tagName, id: active?.id, className: active?.className,
      inside: !!(active && active.closest && active.closest('.dss-panel')),
      body: active === document.body, html: active === document.documentElement };
  })()`);
  assert(activeAfterDisabled.inside, 'disabled refresh keeps focus inside the panel: ' + JSON.stringify(activeAfterDisabled));
  await press('Escape');
  await until('!document.querySelector(".dss-panel")');
  assert(await evaluate('document.activeElement === document.querySelector(".dss-trigger")'), 'Escape after disabled refresh restores focus to the trigger');
  await evaluate('window.__fixture.releaseStats()').catch(() => {});
  report.checks.push('dialog semantics: focus starts on the current tab, Tab/Shift+Tab loop, arrows move focus only, Enter activates, export-menu and panel Escape order, IME-safe Escape restores focus');
  for (const mode of ['stats=error', 'hold=1']) {
    await navigate('/?' + mode + '&lang=zh'); await click('.dss-trigger');
    await until('document.querySelector(".dss-kpis")');
    if (mode === 'stats=error') await until('document.querySelector(".dss-data-status.fallback")');
    const before = await evaluate('document.querySelector(".dss-kpis").innerText');
    await evaluate('window.__fixture.bumpSessions(1000000); window.__fixture.bumpWorkspaces()');
    await until('document.querySelector(".dss-kpis").innerText !== ' + JSON.stringify(before));
    await until('[...document.querySelectorAll("[data-project-id] .dss-pname")].some(node => node.textContent === "Fixture workspace updated")');
    if (mode === 'hold=1') {
      await until('typeof window.__fixture.releaseStats === "function"');
      await evaluate('window.__fixture.releaseStats()');
      await until('document.querySelector(".dss-data-status.exact")');
      const renders = await evaluate('window.__fixture.panelRenders');
      await evaluate('window.__fixture.bumpSessions(); window.__fixture.bumpWorkspaces()'); await delay(200);
      assert.equal(await evaluate('window.__fixture.panelRenders'), renders, 'host arrival disables fallback subscriptions');
    }
  }
  report.checks.push('session/workspace updates cause zero panel renders while closed or using host data; initial loading and failed-host fallback remain reactive');
  const views = {};
  for (const query of ['lang=zh', 'stats=error&lang=zh']) for (const timezoneId of ['Asia/Shanghai', 'America/Los_Angeles']) {
    await command('Emulation.setTimezoneOverride', { timezoneId });
    await navigate('/?' + query);
    await click('.dss-trigger');
    await until('document.querySelector(".dss-data-status.' + (query.startsWith('stats=error') ? 'fallback' : 'exact') + '")');
    const texts = [];
    for (const index of [1, 2, 3]) { await tab(index); texts.push(await evaluate('document.querySelector(".dss-body").innerText')); }
    await tab(1);
    await click('.dss-prow [data-action=expand]');
    await until('document.querySelector(".dss-pdetail .dss-sess")');
    texts.push(await evaluate('document.querySelector(".dss-pdetail").innerText'));
    (views[query] ||= []).push(texts);
  }
  await command('Emulation.setTimezoneOverride', { timezoneId: '' });
  for (const [query, [shanghai, losAngeles]] of Object.entries(views)) assert.deepEqual(losAngeles, shanghai, query + ' views depend on the browser timezone');
  report.checks.push('host and local-fallback views identical in Asia/Shanghai and America/Los_Angeles');
  for (const [name, width, height, lang] of [['desktop',1440,1000,'zh'], ['mobile',390,844,'zh'], ['narrow',320,740,'en']]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await navigate('/?lang=' + lang);
    await click('.dss-trigger');
    await tab(1);
    await until('document.querySelector(".dss-data-status.exact")');
    assert(await evaluate('!document.querySelector(".dss-data-cost")'));
    const metrics = await headerMetrics();
    assert(metrics.lines.every(n => n === 1), 'tab labels must not wrap at ' + width + 'px');
    assert.equal(metrics.ownRow, metrics.panelWidth < 860, 'tablist row layout at ' + width + 'px');
    assert.equal(metrics.statusDisplay === 'none', width < 420, 'status text display at ' + width + 'px');
    assert.equal(metrics.exportDisplay === 'none', width < 420, 'export label display at ' + width + 'px');
    for (const [index, view] of [[1,'overview'],[2,'timeline'],[3,'trends'],[4,'balance']]) {
      await tab(index);
      if (view === 'timeline') { await click('[data-action=mode-day]'); await until('document.querySelector(".dss-tl[data-mode=day]")'); }
      await layout(name + '-' + view); await capture(name + '-' + view);
      if (width < 600 && ['overview', 'trends'].includes(view)) {
        await evaluate('document.querySelector(".dss-body").scrollTop = 10000');
        await capture(name + '-' + view + '-bottom');
        await evaluate('document.querySelector(".dss-body").scrollTop = 0');
      }
    }
    await evaluate(`(() => { const select=document.querySelector('.dss-provider-picker select'); select.value='minimax-coding'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await until('document.querySelector(".dss-balance-plan")?.textContent === "Professional Coding Plan"');
    await layout(name + '-subscription'); await capture(name + '-subscription');
    report.checks.push(name + ': all four tabs, provider selection and layout');
  }
  for (const width of [641, 700, 768, 1024, 1100, 1101]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await navigate('/?lang=en'); await click('.dss-trigger'); await tab(1);
    if (width === 641) {
      const panelTop = await evaluate('document.querySelector(".dss-panel").getBoundingClientRect().top');
      assert(panelTop >= 45, 'desktop panel keeps a comfortable top offset');
    }
    const metrics = await headerMetrics();
    assert(metrics.lines.every(n => n === 1), 'tab labels must not wrap at ' + width + 'px');
    assert.equal(metrics.ownRow, metrics.panelWidth < 860, 'tablist row layout at ' + width + 'px');
    assert.equal(metrics.statusDisplay === 'none', metrics.panelWidth < 420, 'status text display at ' + width + 'px');
    assert.equal(metrics.exportDisplay === 'none', metrics.panelWidth < 420, 'export label display at ' + width + 'px');
    assert(await evaluate('["refresh","export","pricing","close"].every(a => !!document.querySelector("[data-action=" + a + "]"))'), 'header action hooks at ' + width + 'px');
    await tab(1);
    if (width === 641) await capture('intermediate-header');
    if (width === 1024) await capture('header-1024');
    for (const index of [1, 2, 3, 4]) { await tab(index); await layout('header-' + width + '-' + index); }
  }
  report.checks.push('English header boundaries 641/700/768/1024/1100/1101px: all controls visible and disjoint, tabs stay on one line, tablist drops below 860px');
  await evaluate('window.__fixture.accountMode = "error"'); await refresh();
  await until('document.querySelector(".dss-balance-status.stale")');
  assert.equal(await evaluate('window.__fixture.calls.filter(row => row[0] === "current").length'), 0);
  assert(await evaluate('window.__fixture.calls.some(row => row[0] === "account" && row[1] === true)'));
  await evaluate('window.__fixture.accountMode = "legacy"'); await refresh();
  await until('document.querySelector(".dss-balance-warning")?.textContent.includes("Legacy account service")');
  assert(await evaluate('!document.querySelector(".dss-provider-picker select") && document.querySelector(".dss-balance-name").textContent === "DeepSeek"'));
  await evaluate('window.__fixture.accountMode = "stale"'); await refresh();
  await until('document.querySelector(".dss-balance-status.stale")');
  assert(await evaluate('document.querySelector(".dss-balance-total")?.textContent.includes("123.45")'));
  await layout('stale-balance'); await capture('narrow-stale-balance');
  report.checks.push('forced refresh, account RPC error without fallback, explicit legacy fallback, stale balance retained');
  await tab(1);
  await evaluate('window.__fixture.statsMode = "partial"'); await refresh();
  await until('document.querySelector(".dss-data-status.partial")');
  await until('document.querySelector(".dss-status-banner.partial")');
  assert(await evaluate('!document.querySelector("[data-action=retry]")'), 'partial banner has no retry');
  assert(await evaluate('!!document.querySelector(".dss-status-banner .dss-data-diagnostics div")'), 'partial banner exposes diagnostics');
  await until('document.querySelector(".dss-kpis")?.textContent.includes("*")');
  await click('[data-action=pricing-pending]');
  await until('document.querySelector(".dss-drawer")');
  await until(`(() => { const input = [...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.model')); return input && input.value === 'fixture-unpriced'; })()`);
  assert.equal(await evaluate('document.querySelector("[data-action=pricing-pending]").getAttribute("data-action")'), 'pricing-pending');
  await press('Escape');
  await until('!document.querySelector(".dss-drawer")');
  assert(await evaluate('document.activeElement.getAttribute("data-action") === "pricing-pending"'), 'pending focus returns to the chip');
  assert(await evaluate('!!document.querySelector(".dss-prow [data-action=pricing-pending]")'), 'a row exposes its own pending chip');
  const rowExpandedBefore = await evaluate('document.querySelector(".dss-prow [data-action=pricing-pending]").closest("tr").getAttribute("aria-expanded")');
  await click('.dss-prow [data-action=pricing-pending]');
  await until('document.querySelector(".dss-drawer")');
  const rowExpandedAfter = await evaluate('document.querySelector(".dss-prow [data-action=pricing-pending]").closest("tr").getAttribute("aria-expanded")');
  assert.equal(rowExpandedAfter, rowExpandedBefore, 'row chip must not expand its row');
  await press('Escape'); await until('!document.querySelector(".dss-drawer")');
  await layout('partial'); await capture('narrow-partial');
  const modelSelector = `[...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.model'))`;
  await click('.dss-kpi [data-action=pricing-pending]');
  await until('document.querySelector(".dss-drawer")');
  await until(`(() => { const input = ${modelSelector}; return !!input && input.value === 'fixture-unpriced'; })()`);
  assert(await evaluate(`(() => { const input = ${modelSelector}; return !!input; })()`), 'pending chip prefills the model field');
  await evaluate(`(() => { const chip = document.querySelector('.dss-kpi [data-action=pricing-pending]'); const parent = chip.parentNode, next = chip.nextSibling; parent.removeChild(chip); window.__removedPendingChip = { chip, parent, next }; })()`);
  await press('Escape'); await until('!document.querySelector(".dss-drawer")');
  assert(await evaluate('document.activeElement.matches("[data-action=pricing]")'), 'a disappeared chip falls back to the gear button');
  await evaluate('(() => { const removed = window.__removedPendingChip; if (removed && removed.parent) removed.parent.insertBefore(removed.chip, removed.next); delete window.__removedPendingChip; })()');
  assert(await evaluate('window.__fixture.statsMode = "unsupported"') === 'unsupported');
  await refresh();
  await until('document.querySelector(".dss-kpis")?.textContent.includes(window.__fixture.t("pricing.pending"))');
  await layout('unsupported'); await capture('narrow-unsupported');
  await evaluate('window.__fixture.statsMode = "error"'); await refresh();
  await until('document.querySelector(".dss-data-status.stale")');
  await until('document.querySelector(".dss-status-banner.stale")');
  assert(await evaluate('!!document.querySelector("[data-action=retry]")'), 'stale banner exposes retry');
  assert(await evaluate('!!document.querySelector(".dss-status-banner .dss-data-diagnostics div")'), 'stale banner exposes diagnostics');
  await layout('stale'); await capture('narrow-stale');
  await navigate('/?stats=error&lang=en');
  await click('.dss-trigger');
  await until('document.querySelector(".dss-data-status.fallback")');
  await until('document.querySelector(".dss-status-banner.fallback")');
  assert(await evaluate('!document.querySelector("[data-action=retry]")'), 'fallback without host remote has no retry');
  assert(await evaluate('!!document.querySelector(".dss-status-banner .dss-data-diagnostics div")'), 'fallback banner exposes diagnostics');
  assert(await evaluate('document.querySelector(".dss-data-status").textContent.includes(window.__fixture.t("source.local"))'));
  await layout('fallback'); await capture('narrow-fallback');
  report.checks.push('estimated/partial/unsupported pricing, diagnostics, stale host data, local fallback, pending-chip focusModel/fallback and row actions');
  await navigate('/?stats=partial&lang=en');
  await evaluate('Date.now = () => 1792238400000'); // Catalog phases as of 2026-10-17; usage fixtures remain in September.
  await click('.dss-trigger'); await tab(1);
  const priceButton = key => evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(n => n.textContent === window.__fixture.t(${JSON.stringify(key)})); if (!button || button.disabled) throw new Error('Missing enabled button ' + ${JSON.stringify(key)}); button.click(); })()`);
  await click('[data-action=pricing]');
  await until('document.querySelector(".dss-pricing")?.textContent.includes("fixture-unpriced")');
  await until('document.querySelector(".dss-drawer")');
  assert.equal(await evaluate('document.querySelector(".dss-drawer").getAttribute("role")'), 'dialog', 'pricing drawer uses dialog semantics');
  assert.equal(await evaluate('document.querySelector(".dss-drawer").getAttribute("aria-modal")'), 'true', 'pricing drawer is modal');
  assert.equal(await evaluate('document.querySelector("[data-action=pricing]").getAttribute("aria-haspopup")'), 'dialog', 'gear exposes its dialog popup');
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".dss-price-actions label")).fontSize'), '13px', 'price auto label uses the md size');
  assert.equal(await evaluate('document.activeElement.getAttribute("data-action")'), 'drawer-close', 'drawer focuses its close button');
  assert(await evaluate('!!document.querySelector("[data-action=drawer-close]")'), 'drawer exposes its close action');
  await evaluate(`(() => { const nodes = ${DRAWER_FOCUSABLES}; if (!nodes.length) return false; nodes[nodes.length - 1].focus(); return true; })()`);
  await press('Tab');
  assert(await evaluate(`(() => { const nodes = ${DRAWER_FOCUSABLES}; return nodes.length > 0 && document.activeElement === nodes[0]; })()`), 'drawer Tab wraps to its first control');
  await press('Tab', 8);
  assert(await evaluate(`(() => { const nodes = ${DRAWER_FOCUSABLES}; return nodes.length > 0 && document.activeElement === nodes[nodes.length - 1]; })()`), 'drawer Shift+Tab wraps to its last control');
  assert.equal(await evaluate('document.querySelectorAll(".dss-price-rule").length'), 0, 'collapsed catalog mounts no cards');
  const catalogSummary = await evaluate(`(() => {
    const summary = [...document.querySelectorAll('summary')].find(s => s.textContent.includes(window.__fixture.t('price.catalog')));
    if (!summary) return 'missing summary';
    summary.click();
    return 'clicked summary';
  })()`);
  if (catalogSummary !== 'clicked summary') throw new Error('Failed to expand price catalog');
  await until('document.querySelectorAll(".dss-price-rule").length > 0');
  const rulesCount = await evaluate(`document.querySelectorAll('.dss-price-rule').length`);
  assert(rulesCount > 0 && rulesCount <= 25, 'catalog pages are bounded');
  assert.equal(await evaluate('document.querySelectorAll(".dss-price-rule-body").length'), 0);
  await click('.dss-price-rule summary');
  await until('document.querySelector(".dss-price-rule-body")');
  await priceButton('price.next');
  await until('document.querySelector(".dss-price-pagination span").textContent.startsWith("2 /")');
  assert.equal(await evaluate('document.querySelectorAll(".dss-price-rule-body").length'), 0);
  const search = value => evaluate(`(() => { const input = document.querySelector('.dss-price-search-input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await search('deepseek');
  await until('(!document.querySelector(".dss-price-pagination") || document.querySelector(".dss-price-pagination span").textContent.startsWith("1 /")) && [...document.querySelectorAll(".dss-price-rule")].every(n => n.textContent.toLowerCase().includes("deepseek"))');
  assert(await evaluate('[...document.querySelectorAll(".dss-price-rule")].every(n => n.dataset.phase === "current")'));
  await click('.dss-price-history-filter input');
  await until('document.querySelector(".dss-price-rule[data-phase=historical]")');
  assert(await evaluate('document.querySelector(".dss-price-badge").textContent.includes("rules")'));
  await search('');
  await until('document.querySelectorAll(".dss-price-rule").length === 25');
  // Inspect every rule, including historical periods, at the narrowest width.
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  let inspected = 0;
  while (true) {
    await layout('narrow-price-page'); inspected += await evaluate('document.querySelectorAll(".dss-price-rule").length');
    if (await evaluate('document.querySelector(".dss-price-pagination button:last-child").disabled')) break;
    const previous = await evaluate('document.querySelector(".dss-price-pagination span").textContent');
    await priceButton('price.next');
    await until('document.querySelector(".dss-price-pagination span").textContent !== ' + JSON.stringify(previous));
  }
  assert.equal(inspected, JSON.parse(readFileSync(join(root, 'data/pricing/catalog.json'), 'utf8')).rules.length, 'all signed catalog periods inspected');
  await priceButton('price.previous');
  await search('deepseek');
  await until('document.querySelector(".dss-price-pagination span").textContent.startsWith("1 /")');
  await click('.dss-price-rule summary'); await until('document.querySelector(".dss-price-rule-body")');
  for (const width of [320, 390, 641, 700, 768, 1024, 1440]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    await layout('pricing-' + width);
    const drawerBox = await evaluate(`(() => {
      const drawer = document.querySelector('.dss-drawer').getBoundingClientRect();
      const panelNode = document.querySelector('.dss-panel');
      const panel = panelNode.getBoundingClientRect();
      return { width: drawer.width, right: drawer.right, panelWidth: panelNode.clientWidth, panelRight: panel.right };
    })()`);
    assert.equal(Math.round(drawerBox.width), Math.round(Math.min(460, drawerBox.panelWidth)), 'drawer width at ' + width + 'px');
    assert(Math.abs(drawerBox.right - drawerBox.panelRight) <= 1, 'drawer is flush with the panel right edge at ' + width + 'px');
    if (width === 320 || width === 641) {
      await evaluate('document.querySelector(".dss-pricing").scrollIntoView(); document.querySelector(".dss-body").scrollTop = 0');
      await capture('prices-' + width);
    }
    if (width === 1440) {
      await evaluate('document.querySelector(".dss-body").scrollTop = 0; document.querySelector(".dss-drawer-body").scrollTop = 0');
      await capture('desktop-pricing-drawer');
    }
  }
  await click('.dss-price-catalog-section > summary');
  await until('!document.querySelector(".dss-price-rule")');
  report.checks.push('catalog: lazy cards and bodies, 25-row pages, search reset, history labels/counts, all ' + inspected + ' rules at 320px, expanded cards at seven widths inside the pricing drawer');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await priceButton('price.configure');
  for (const [field, value] of [['uncached','1'],['output','2'],['cacheRead','0']]) {
    await evaluate(`(() => { const input = document.querySelector('[aria-label="' + window.__fixture.t('price.${field}') + '"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '${value}'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  }
  await priceButton('price.add'); await priceButton('price.preview');
  await until('document.querySelector(".dss-price-preview")');
  assert(await evaluate('!document.querySelector(".dss-price-preview").textContent.includes("Affected sessions 0")'));
  await layout('pricing-preview'); await capture('narrow-pricing-preview');
  await priceButton('price.save');
  await until('!document.querySelector(".dss-price-preview")');
  assert(await evaluate('window.__fixture.calls.some(row => row[0] === "pricing" && row[1] === "save")'));
  await priceButton('price.edit');
  assert.equal(await evaluate(`document.querySelector('[aria-label="Uncached input"]').value`), '1');
  await priceButton('price.refresh');
  await until('document.querySelector(".dss-pricing").textContent.includes(window.__fixture.t("price.refreshFailed"))');
  await layout('pricing-failure'); await capture('narrow-pricing-failure');
  await press('Escape');
  await until('!document.querySelector(".dss-drawer")');
  assert(await evaluate('document.activeElement === document.querySelector("[data-action=pricing]")'), 'drawer Escape returns focus to the gear');
  assert(await evaluate('document.querySelector(".dss-panel") !== null'), 'drawer Escape must not close the panel');
  await press('Escape');
  await until('!document.querySelector(".dss-panel")');
  assert(await evaluate('document.activeElement === document.querySelector(".dss-trigger")'), 'panel Escape after drawer returns focus to the trigger');
  await click('.dss-trigger');
  await until('document.querySelector(".dss-panel")');
  await click('[data-action=pricing]');
  await until('document.querySelector(".dss-drawer")');
  await click('.dss-overlay');
  await until('!document.querySelector(".dss-panel")');
  await delay(100);
  await click('.dss-trigger');
  await until('document.querySelector(".dss-panel")');
  assert(await evaluate('!document.querySelector(".dss-drawer")'), 'closed panel resets the pricing drawer');
  assert.equal(await evaluate('document.activeElement.id'), 'dss-tab-overview', 'reopened panel focuses the current tab');
  report.checks.push('price settings: missing models, custom price preview/save/edit, offline refresh, drawer Escape order and overlay-close drawer reset');
  await navigate('/?theme=dark&lang=en');
  await click('.dss-trigger'); await tab(4);
  await evaluate('window.__fixture.accountMode = "stale"'); await refresh();
  await until('document.querySelector(".dss-balance-status.stale")');
  await layout('dark-stale-balance'); await capture('narrow-dark-stale-balance');
  report.checks.push('dark-theme stale account state');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/?theme=dark&lang=zh'); await click('.dss-trigger'); await tab(1);
  await until('document.querySelector(".dss-kpis")');
  await layout('dark-overview'); await capture('dark-overview');
  await navigate('/?stats=estimated&lang=zh');
  await click('.dss-trigger'); await tab(1);
  await until('document.querySelector(".dss-kpis")');
  const fixtureDates = await evaluate('window.__fixture.data.estimated.timeline.days.map(day => day.date).sort()');
  assert(fixtureDates.length >= 2, 'fixture needs at least two active days');
  const previousFixtureDate = fixtureDates[fixtureDates.length - 2];
  const deltaText = await evaluate('document.querySelector(".dss-kpi-delta")?.textContent || ""');
  assert(deltaText.includes(previousFixtureDate.slice(5)), 'day view compares against the previous active day: ' + deltaText);
  await click('.dss-prow [data-action=expand]');
  await until('document.querySelector(".dss-pdetail")');
  const daySession = await evaluate(`(() => {
    const header = document.querySelector('.dss-sess-h');
    const row = document.querySelector('.dss-pdetail .dss-sess:not(.dss-sess-h)');
    return { header: header?.textContent || '', time: row?.querySelector('.dss-sess-time')?.textContent || '', title: row?.querySelector('.dss-sess-time')?.getAttribute('title') || '', llm: row?.querySelector('.dss-sess-llm')?.textContent || '' };
  })()`);
  assert(daySession.header.includes('时间'), 'day session header says time: ' + daySession.header);
  assert(/^\d{2}:\d{2}$/.test(daySession.time), 'day time is HH:MM: ' + daySession.time);
  assert(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(daySession.title), 'session time title is full: ' + daySession.title);
  assert(daySession.llm.includes(' / '), 'day session row shows LLM and tool: ' + daySession.llm);
  await click('.dss-prow [data-action=expand]');
  await until('!document.querySelector(".dss-pdetail")');
  while (!(await evaluate('document.querySelector("[data-action=date-prev]").disabled'))) {
    const currentLabel = await evaluate('document.querySelector(".dss-date-label").textContent');
    await click('[data-action=date-prev]');
    await until('document.querySelector(".dss-date-label").textContent !== ' + JSON.stringify(currentLabel));
  }
  assert(await evaluate('!document.querySelector(".dss-kpi-delta")'), 'first active day has no delta');
  await click('[data-action=mode-all]');
  await until('document.querySelector(".dss-kpis")');
  const activeText = await evaluate('document.querySelector(".dss-kpi.cost .dss-kpi-s")?.textContent || ""');
  const activeDaysLabel = await evaluate('window.__fixture.t("kpi.activeDays").replace("%d", ' + JSON.stringify(String(fixtureDates.length)) + ')');
  assert(activeText.includes(activeDaysLabel), 'all mode counts active days: ' + activeText);
  report.checks.push('day-over-day compares the previous active day, first day omits delta, all mode counts active days');
  await navigate('/?stats=large&lang=zh');
  await focus('.dss-trigger');
  await click('.dss-trigger'); await tab(1);
  await until('document.querySelector(".dss-data-status.exact")');
  await click('[data-action=mode-all]');
  await until('document.querySelectorAll(".dss-prow").length === 50');
  const summaryBeforePaging = await evaluate('document.querySelector(".dss-kpis").innerText');
  async function collectPages(scope, rowSelector, readRow) {
    const found = [];
    for (;;) {
      const rows = await evaluate(`[...document.querySelectorAll(${JSON.stringify(rowSelector)})].map(node => ${readRow})`);
      assert(rows.length <= (scope === 'sessions' ? 100 : 50), scope + ' mounted row budget');
      found.push(...rows);
      if (await evaluate(`document.querySelector('[data-pages="${scope}"] button:last-child').disabled`)) break;
      await click(`[data-pages="${scope}"] button:last-child`);
    }
    assert.equal(new Set(found).size, found.length, scope + ' duplicated rows');
    return found;
  }
  async function openFilter() {
    await click('[data-action=filter]');
    await until('document.querySelector(".dss-filter-item")');
  }
  async function closeFilter() {
    await press('Escape');
    await until('!document.querySelector(".dss-filter-item")');
  }
  async function openProject(id) {
    for (;;) {
      if (await evaluate(`!!document.querySelector('[data-project-id="${id}"]')`)) {
        await click(`[data-project-id="${id}"] [data-action=expand]`);
        return;
      }
      const next = await evaluate('document.querySelector("[data-pages=projects] button:last-child")');
      if (!next || await evaluate('document.querySelector("[data-pages=projects] button:last-child").disabled')) throw new Error('project not found: ' + id);
      const before = await evaluate('document.querySelector("[data-pages=projects] span")?.textContent || ""');
      await click('[data-pages=projects] button:last-child');
      await until('document.querySelector("[data-pages=projects] span")?.textContent !== ' + JSON.stringify(before));
    }
  }

  async function assertSessionCellsFit(label) {
    const issues = await evaluate(`(() => {
      const bad = [];
      for (const row of document.querySelectorAll('.dss-pdetail .dss-sess:not(.dss-sess-h)')) {
        for (const cell of [...row.children]) {
          if (!cell.getClientRects().length) continue;
          if (cell.scrollWidth > cell.clientWidth + 1) bad.push({ cls: String(cell.className || ''), text: cell.textContent.slice(0, 36), sw: cell.scrollWidth, cw: cell.clientWidth });
        }
      }
      return bad.slice(0, 10);
    })()`);
    assert.deepEqual(issues, [], label + ' session cells must not truncate: ' + JSON.stringify(issues));
  }
  async function assertNarrowSessionMeta() {
    const meta = await evaluate(`(() => {
      const node = document.querySelector('.dss-pdetail .dss-sess-meta');
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { display: getComputedStyle(node).display, text: node.textContent, sw: node.scrollWidth, cw: node.clientWidth, w: rect.width };
    })()`);
    assert(meta && meta.display !== 'none' && meta.text.includes('工具') && meta.text.includes('LLM') && meta.text.includes('命中') && meta.text.includes('入/出'), 'narrow session meta exists: ' + JSON.stringify(meta));
    assert(meta.sw <= meta.cw + 1, 'narrow session meta must not truncate: ' + JSON.stringify(meta));
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".dss-sess-h")).display'), 'none', 'narrow session header must be hidden');
  }

  const scrollables = await evaluate(`(() => {
    const panel = document.querySelector('.dss-panel');
    return [...panel.querySelectorAll('*')].filter(node => {
      const style = getComputedStyle(node);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1;
    }).map(node => String(node.className || node.tagName));
  })()`);
  assert.deepEqual(scrollables, ['dss-body'], 'only the body may scroll: ' + JSON.stringify(scrollables));
  const smallFonts = await evaluate(`(() => {
    const bad = [];
    for (const node of document.querySelectorAll('.dss-overlay *')) {
      if (![...node.childNodes].some(child => child.nodeType === 3 && child.textContent.trim())) continue;
      const size = parseFloat(getComputedStyle(node).fontSize);
      if (size < 11) bad.push({ tag: node.tagName, cls: String(node.className || ''), size });
    }
    return bad.slice(0, 10);
  })()`);
  assert.deepEqual(smallFonts, [], 'all direct text must be >= 11px: ' + JSON.stringify(smallFonts));
  const legend = await evaluate(`[...document.querySelectorAll('.dss-tok-legend span')].map(node => ({ text: node.textContent, dots: node.querySelectorAll('.dot').length }))`);
  assert.equal(legend.length, 3, 'token legend keeps three items');
  assert(legend[0].text.startsWith('命中') && legend[0].dots === 1, 'cache legend dot belongs to hit: ' + JSON.stringify(legend));
  assert(legend[1].text === '未命中' && legend[1].dots === 1, 'uncached legend has a dot and no amount: ' + JSON.stringify(legend));
  assert(legend[2].text.startsWith('输出') && legend[2].dots === 1, 'output legend has a dot: ' + JSON.stringify(legend));
  assert(!legend.some(item => item.text.startsWith('输入')), 'input total is not repeated in the token legend: ' + JSON.stringify(legend));
  const tokenAria = await evaluate('document.querySelector(".dss-tokbar").getAttribute("aria-label")');
  assert(tokenAria.startsWith('缓存命中输入 ') && tokenAria.includes('，未命中输入 ') && tokenAria.includes('，输出 '), 'token bar aria-label names cache/uncached/output: ' + tokenAria);
  assert(await evaluate('!document.querySelector(".dss-strip").hasAttribute("aria-label")'), 'strip must not carry an aria-label');
  const strip = await evaluate('document.querySelector(".dss-strip").textContent');
  assert(!strip.startsWith('项目') && !strip.includes('项目 '), 'strip must not repeat the project count: ' + strip);
  assert(/轮 \/ 步\d/.test(strip), 'strip keeps turns/steps flush with the label: ' + strip);
  if (strip.includes('首 token')) assert(/首 token 均值\d/.test(strip), 'strip names the first-token average: ' + strip);
  if (strip.includes('输出速度')) assert(/输出速度\d/.test(strip) && strip.includes(' tok/s'), 'strip names output speed with its unit: ' + strip);
  assert(/活跃时段\d{2}:\d{2}/.test(strip) || /活跃日\d/.test(strip), 'strip keeps the active span or active days flush with its label: ' + strip);
  await evaluate('document.querySelector(".dss-body").scrollTop = 400');
  await delay(80);
  const sticky = await evaluate(`(() => {
    const body = document.querySelector('.dss-body').getBoundingClientRect();
    const th = document.querySelector('.dss-ptable thead th').getBoundingClientRect();
    return { bodyTop: body.top, thTop: th.top, scrollTop: document.querySelector('.dss-body').scrollTop };
  })()`);
  assert(Math.abs(sticky.thTop - sticky.bodyTop) <= 1, 'thead sticks to the body top: ' + JSON.stringify(sticky));
  await capture('overview-sticky');
  await evaluate('document.querySelector(".dss-body").scrollTop = 0');
  report.checks.push('single scroll container, >=11px text floor, sticky project header and aligned token legend');

  const projectIds = await collectPages('projects', '.dss-prow', 'node.dataset.projectId');
  assert.equal(projectIds.length, 120, 'all projects reachable');
  await click('th[data-sort-key=cost] button'); await click('th[data-sort-key=cost] button');
  assert(await evaluate('document.querySelector("[data-pages=projects] button").disabled'));
  await click('[data-pages=projects] button:last-child');
  assert(!(await evaluate('document.querySelector("[data-pages=projects] button").disabled')));
  await openFilter();
  assert.equal(await evaluate('document.querySelector("[data-action=filter]").hasAttribute("aria-label")'), false, 'filter button name comes from its visible text');
  await press('Escape');
  await until('!document.querySelector(".dss-filter-item")');
  assert(await evaluate('!!document.querySelector(".dss-panel")'), 'filter Escape leaves the panel open');
  assert.equal(await evaluate('document.activeElement.getAttribute("data-action")'), 'filter', 'filter Escape returns focus to the trigger');
  await openFilter();
  const legendIds = await collectPages('legend', '.dss-filter-item', 'node.dataset.projectId');
  assert.equal(legendIds.length, 120, 'all filter items reachable');
  await closeFilter();
  await click('[data-action=mode-day]');
  await until('document.querySelector("[data-pages=projects] button").disabled');
  await openFilter();
  await until('document.querySelector("[data-pages=legend] button").disabled');
  await closeFilter();
  await click('[data-action=mode-all]');
  await until('document.querySelector("[data-pages=projects] button").disabled');
  await openFilter();
  await until('document.querySelector("[data-pages=legend] button").disabled');
  await closeFilter();
  assert.equal(await evaluate('document.querySelector(".dss-kpis").innerText'), summaryBeforePaging, 'paging must not change totals');

  const firstProjectId = await evaluate('document.querySelector(".dss-prow")?.dataset.projectId');
  const kpiBeforeHide = await evaluate('document.querySelector(".dss-kpis").innerText');
  const stripBeforeHide = await evaluate('document.querySelector(".dss-strip").innerText');
  await openFilter();
  await click(`.dss-filter-item[data-project-id="${firstProjectId}"] input`);
  await closeFilter();
  assert(await evaluate('document.querySelector(".dss-filter-badge")?.textContent.includes("1")'), 'hidden badge shows one');
  assert(await evaluate(`!document.querySelector('[data-project-id="${firstProjectId}"]')`), 'hidden project leaves the table');
  assert.notEqual(await evaluate('document.querySelector(".dss-kpis").innerText'), kpiBeforeHide, 'hidden project changes KPIs');
  assert.notEqual(await evaluate('document.querySelector(".dss-strip").innerText'), stripBeforeHide, 'hidden project changes the strip');
  await click('[data-action=close]');
  await until('!document.querySelector(".dss-panel")');
  await click('.dss-trigger');
  await until('document.querySelector(".dss-panel")');
  assert(await evaluate('document.querySelector(".dss-filter-badge")?.textContent.includes("1")'), 'hidden state survives reopening');
  assert(await evaluate(`!document.querySelector('[data-project-id="${firstProjectId}"]')`), 'hidden project stays hidden');
  await openFilter();
  await click('[data-action=filter-show-all]');
  await closeFilter();
  assert(await evaluate('!document.querySelector(".dss-filter-badge")'), 'show-all clears the badge');
  assert(await evaluate(`!!document.querySelector('[data-project-id="${firstProjectId}"]')`), 'show-all restores the project');
  await openFilter();
  await click('[data-pages=legend] button:last-child');
  await evaluate(`(() => { const input = document.querySelector('.dss-filter-search'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'large-1'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await delay(120);
  assert(await evaluate("(() => { const button = document.querySelector('[data-pages=legend] button'); return !button || button.disabled; })()"), 'filter search returns to page one');
  await evaluate(`(() => { const input = document.querySelector('.dss-filter-search'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ''); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await closeFilter();
  report.checks.push('filter Escape/focus, hide/show, persistence, show-all, KPI/strip sync and search page reset');

  await click('[data-action=mode-all]');
  await until('document.querySelector(".dss-kpis")');
  await focus('th[data-sort-key=name] button');
  await press('Enter');
  assert.equal(await evaluate('document.querySelector("th[data-sort-key=name]").getAttribute("aria-sort")'), 'ascending');
  await openProject('large-0');
  assert.equal(await evaluate('document.querySelector("[data-project-id=large-0] [data-action=expand]").getAttribute("aria-expanded")'), 'true');
  await assertSessionCellsFit('large zh 1440');
  const wideSession = await evaluate(`(() => {
    const header = document.querySelector('.dss-sess-h');
    const row = document.querySelector('.dss-pdetail .dss-sess:not(.dss-sess-h)');
    return { header: header?.textContent || '', hidden: header?.getAttribute('aria-hidden'), time: row?.querySelector('.dss-sess-time')?.textContent || '', llm: row?.querySelector('.dss-sess-llm')?.textContent || '' };
  })()`);
  assert.equal(wideSession.hidden, 'true');
  assert(wideSession.header.includes('会话') && wideSession.header.includes('更新') && wideSession.header.includes('轮 · 步') && wideSession.header.includes('LLM / 工具') && wideSession.header.includes('Token 入 / 出'), 'wide session header labels: ' + wideSession.header);
  assert(/^\d{2}-\d{2} \d{2}:\d{2}$/.test(wideSession.time), 'all-mode time shows MM-DD HH:MM: ' + wideSession.time);
  const expectedSessionTime = await evaluate(`(() => {
    const row = document.querySelector('.dss-pdetail .dss-sess:not(.dss-sess-h)');
    const id = row?.dataset.sessionId;
    const sessions = (window.__fixture.data.large.projects || []).flatMap(project => project.sessions || []);
    const session = sessions.find(item => item.id === id);
    if (!session || !session.updatedAt) return null;
    const date = new Date(session.updatedAt + 8 * 3600 * 1000);
    const pad = value => String(value).padStart(2, '0');
    return pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate()) + ' ' + pad(date.getUTCHours()) + ':' + pad(date.getUTCMinutes());
  })()`);
  assert(expectedSessionTime && wideSession.time === expectedSessionTime, 'all-mode session time uses UTC+8: ' + wideSession.time + ' expected ' + expectedSessionTime);
  const headerColors = await evaluate(`(() => {
    const header = document.querySelector('.dss-sess-h');
    const cost = header?.querySelector('.dss-sess-cost');
    return { header: header ? getComputedStyle(header).color : null, cost: cost ? getComputedStyle(cost).color : null };
  })()`);
  assert(headerColors.header && headerColors.cost === headerColors.header, 'session cost header uses the normal header color: ' + JSON.stringify(headerColors));
  assert(wideSession.llm.includes(' / '), 'session row shows LLM and tool: ' + wideSession.llm);
  assert(await evaluate('!!document.querySelector(".dss-pdetail-meta")'), 'expanded row exposes project detail metrics');
  const detailMeta = await evaluate('document.querySelector(".dss-pdetail-meta").textContent');
  assert(detailMeta.includes('/fixture/large-0') && detailMeta.includes('轮 / 步') && detailMeta.includes('工具') && detailMeta.includes('首 token') && detailMeta.includes('tok/s'), 'detail meta keeps turns/steps, tool, ttft, tps and full path: ' + detailMeta);
  await focus('[data-project-id=large-0] [data-action=expand]');
  await press('Enter');
  assert.equal(await evaluate('document.querySelector("[data-project-id=large-0] [data-action=expand]").getAttribute("aria-expanded")'), 'false');
  await press('Enter');
  assert.equal(await evaluate('document.querySelector("[data-project-id=large-0] [data-action=expand]").getAttribute("aria-expanded")'), 'true');
  report.checks.push('table keyboard sort and expand keep aria-sort/aria-expanded in sync; session header/time/LLM+tool and detail meta keep every metric');

  const sessionIds = await collectPages('sessions', '.dss-sess:not(.dss-sess-h)', 'node.dataset.sessionId');
  assert.equal(sessionIds.length, 205, 'main and subagent sessions all reachable');
  assert(await evaluate('document.querySelector(".dss-group").textContent.includes("95")'));
  await click('.dss-sess-title');
  assert(sessionIds.includes(await evaluate('window.__fixture.openedSession')), 'paged sessions retain navigation');
  assert(await evaluate('document.activeElement !== document.querySelector(".dss-trigger")'), 'opening a session must not restore focus to the trigger');
  assert.equal(await evaluate('document.querySelector(".dss-trigger").getAttribute("aria-expanded")'), 'false', 'trigger closes its expanded state');
  await click('.dss-trigger'); await tab(2);
  await until('document.querySelector(".dss-timeline-limit")');
  const recentDay = await evaluate('document.querySelector(".dss-day").id');
  const datesSeen = [];
  for (;;) {
    const dates = await evaluate('[...document.querySelectorAll(".dss-day")].map(node => node.id)');
    assert(dates.length <= 30, 'timeline mounted day budget'); datesSeen.push(...dates);
    if (await evaluate('document.querySelector(".dss-timeline-limit button:nth-of-type(2)").disabled')) break;
    await click('.dss-timeline-limit button:nth-of-type(2)');
  }
  assert.equal(datesSeen.length, 75, 'all history dates reachable');
  assert.equal(new Set(datesSeen).size, 75, 'history pages do not overlap');
  await click('.dss-timeline-limit button:last-child');
  assert.equal(await evaluate('document.querySelector(".dss-day").id'), recentDay, 'recent button returns to newest page');
  await click('.dss-timeline-limit button:nth-of-type(2)');
  await click('[data-action=mode-day]');
  await until('!document.querySelector(".dss-timeline-limit")');
  await click('[data-action=mode-all]');
  await until('document.querySelector(".dss-timeline-limit")');
  await until('document.querySelector(".dss-timeline-limit button:nth-of-type(1)").disabled');
  assert(await evaluate('document.querySelector(".dss-timeline-limit button:nth-of-type(1)").disabled'));
  for (const [width, lang] of [[320,'zh'], [641,'en'], [1440,'en']]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    await navigate('/?stats=large&lang=' + lang); await click('.dss-trigger');
    await tab(1); await layout('large-pages-' + width);
    if (width === 320) {
      await focus('.dss-kpi.cost .dss-info');
      await delay(50);
      const tip = await evaluate(`(() => {
        const node = document.querySelector('.dss-kpi.cost .dss-info-tip');
        const body = document.querySelector('.dss-body').getBoundingClientRect();
        const rect = node.getBoundingClientRect();
        return { display: getComputedStyle(node).display, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, bodyLeft: body.left, bodyRight: body.right, bodyTop: body.top, bodyBottom: body.bottom };
      })()`);
      assert(tip.display !== 'none' && tip.left >= tip.bodyLeft - 1 && tip.right <= tip.bodyRight + 1 && tip.top >= tip.bodyTop - 1 && tip.bottom <= tip.bodyBottom + 1, 'cost info tip stays inside the body at 320: ' + JSON.stringify(tip));
      await evaluate('document.activeElement.blur()');
    }
    await openProject('large-0');
    if (width === 320) {
      await assertNarrowSessionMeta();
      const detailLayout = await evaluate(`(() => {
        const meta = document.querySelector('.dss-pdetail-meta');
        const items = [...meta.children].filter(node => node.getClientRects().length);
        const tps = items.find(node => node.textContent.startsWith('tok/s'));
        const ttft = items.find(node => node.textContent.startsWith('首 token'));
        return { display: getComputedStyle(meta).display, tpsTop: tps?.getBoundingClientRect().top, ttftTop: ttft?.getBoundingClientRect().top };
      })()`);
      assert(detailLayout.display === 'grid' && Math.abs(detailLayout.tpsTop - detailLayout.ttftTop) <= 1, '320 detail metrics align on a grid: ' + JSON.stringify(detailLayout));
    }
    if (width === 1440) await assertSessionCellsFit('large en 1440');
    await layout('large-sessions-' + width);
    await evaluate('document.querySelector(".dss-ptable").scrollIntoView({ block: "start" })');
    await capture('large-pages-' + width);
    if (width === 1440) {
      await click('[data-action=mode-all]');
      await until('document.querySelector(".dss-kpis")');
      const overviewPanelHeight = Math.round(await evaluate('document.querySelector(".dss-panel").getBoundingClientRect().height'));
      await click('[data-action=mode-day]');
      await until('document.querySelector(".dss-kpis")');
      const dayPanelHeight = Math.round(await evaluate('document.querySelector(".dss-panel").getBoundingClientRect().height'));
      assert.equal(dayPanelHeight, overviewPanelHeight, 'day and all overview panels end on the same line');
      await click('[data-action=mode-all]');
      await until('document.querySelector(".dss-kpis")');
      await tab(2); await until('document.querySelector(".dss-tl[data-mode=all]")');
      const timelinePanelHeight = Math.round(await evaluate('document.querySelector(".dss-panel").getBoundingClientRect().height'));
      assert.equal(overviewPanelHeight, timelinePanelHeight, 'overview and timeline panels end on the same line');
      await click('[data-action=mode-day]');
      await until('document.querySelector(".dss-tl[data-mode=day]")');
      await tab(1);
    }
  }
  report.checks.push('bounded pages: all 120 projects/filter items, 205 main/subagent sessions, 75 history days; stable totals, day/all overview and timeline panels share a bottom line, sort/date reset, recent reset, session navigation, three widths');

  // 4b: day timeline
  await navigate('/?stats=estimated&lang=zh');
  await click('.dss-trigger'); await tab(1); await until('document.querySelector(".dss-data-status.exact")');
  const estimatedKpi = await evaluate('document.querySelector(".dss-kpi.cost .dss-kpi-v").textContent');
  await tab(2); await until('document.querySelector(".dss-tl")');
  if (await evaluate('!!document.querySelector("[data-action=mode-day]")')) await click('[data-action=mode-day]');
  await until('document.querySelector(".dss-tl[data-mode=day]")');
  assert.equal(await evaluate('document.querySelector(".dss-tl-hist-total").textContent'), estimatedKpi, 'day timeline cost matches the overview KPI');
  const timelineScrollables = await evaluate(`(() => {
    const panel = document.querySelector('.dss-panel');
    return [...panel.querySelectorAll('*')].filter(node => {
      const style = getComputedStyle(node);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1;
    }).map(node => String(node.className || node.tagName));
  })()`);
  assert.deepEqual(timelineScrollables.filter(name => name !== 'dss-body'), [], 'day timeline keeps a single scroll container: ' + JSON.stringify(timelineScrollables));
  const timelineSmallFonts = await evaluate(`(() => {
    const bad = [];
    for (const node of document.querySelectorAll('.dss-overlay *')) {
      if (![...node.childNodes].some(child => child.nodeType === 3 && child.textContent.trim())) continue;
      const size = parseFloat(getComputedStyle(node).fontSize);
      if (size < 11) bad.push({ tag: node.tagName, cls: String(node.className || ''), size });
    }
    return bad.slice(0, 10);
  })()`);
  assert.deepEqual(timelineSmallFonts, [], 'day timeline text must be >= 11px: ' + JSON.stringify(timelineSmallFonts));
  const misalignedTicks = await evaluate(`(() => {
    const lines = [...document.querySelectorAll('.dss-tl-lines i[data-hour]')];
    return [...document.querySelectorAll('.dss-tl-tick')]
      .filter(tick => !tick.classList.contains('is-first') && !tick.classList.contains('is-last'))
      .map(tick => {
        const slot = Number(tick.dataset.slot), hour = slot / 2;
        const line = lines.find(node => Number(node.dataset.hour) === hour);
        if (!line) return { slot: slot, missing: true };
        const a = tick.getBoundingClientRect(), b = line.getBoundingClientRect();
        return { slot: slot, diff: Math.abs(a.left + a.width / 2 - b.left) };
      })
      .filter(row => row.missing || row.diff > 1);
  })()`);
  assert.deepEqual(misalignedTicks, [], 'day timeline ticks align with hour grid lines: ' + JSON.stringify(misalignedTicks));
  const minRunWidth = await evaluate('Math.min(...[...document.querySelectorAll(".dss-tl-run")].map(node => node.getBoundingClientRect().width))');
  assert(minRunWidth >= 3.5, 'day timeline runs keep at least 4px: ' + minRunWidth);
  await click('.dss-tl-run');
  await until('document.querySelector(".dss-tl-pop[role=dialog]")');
  assert(await evaluate('document.querySelector(".dss-tl-pop").contains(document.activeElement)'), 'slot detail receives focus');
  await press('Escape');
  await until('!document.querySelector(".dss-tl-pop")');
  assert(await evaluate('!!document.querySelector(".dss-panel")'), 'first Escape only closes the slot detail');
  assert(await evaluate('document.activeElement.classList.contains("dss-tl-run")'), 'slot detail Escape returns focus to the run');
  await press('Escape');
  await until('!document.querySelector(".dss-panel")');
  await click('.dss-trigger'); await tab(2); await until('document.querySelector(".dss-tl[data-mode=day]")');
  await click('.dss-tl-run'); await until('document.querySelector(".dss-tl-pop[role=dialog]")');
  await click('[data-action=tl-pop-session]');
  await until('!document.querySelector(".dss-panel")');
  assert(await evaluate('!!window.__fixture.openedSession'), 'slot detail opens the selected session');
  await click('.dss-trigger'); await tab(2); await until('document.querySelector(".dss-tl[data-mode=day]")');
  const selectedDay = await evaluate('document.querySelector(".dss-date-label").textContent.slice(0, 10)');
  const slotProjectIds = await evaluate(`(() => {
    const day = window.__fixture.data.estimated.timeline.days.find(item => item.date === ${JSON.stringify(selectedDay)});
    return [...new Set(((day && day.slotBlocks) || []).map(block => block.projectId))].sort();
  })()`);
  await click('[data-action=filter]'); await until('document.querySelector(".dss-filter-item")');
  const filterProjectIds = await evaluate('[...document.querySelectorAll(".dss-filter-item")].map(node => node.dataset.projectId).sort()');
  assert.deepEqual(filterProjectIds, slotProjectIds, 'timeline filter lists every active project: ' + JSON.stringify({ filterProjectIds, slotProjectIds }));
  const filterValues = await evaluate('[...document.querySelectorAll(".dss-filter-item .dss-filter-val")].map(node => node.textContent)');
  assert.equal(filterValues.length, filterProjectIds.length, 'timeline filter shows a duration for every project');
  assert(filterValues.every(text => text === '—' || /[hms]/.test(text)), 'timeline filter values are durations: ' + JSON.stringify(filterValues));
  assert.equal(await evaluate('document.querySelectorAll(".dss-filter-item .dss-filter-cost").length'), 0, 'timeline filter does not show costs');
  const hiddenProject = filterProjectIds[0];
  await evaluate(`document.querySelector('.dss-filter-item[data-project-id="${hiddenProject}"] input').click()`);
  await until(`!document.querySelector('.dss-tl-lane[data-project-id="${hiddenProject}"]')`);
  await press('Escape'); await until('!document.querySelector(".dss-filter-item")');
  await tab(1); await until('document.querySelector(".dss-kpis")');
  const hiddenKpi = await evaluate('document.querySelector(".dss-kpi.cost .dss-kpi-v").textContent');
  await tab(2); await until('document.querySelector(".dss-tl-hist-total")');
  assert.equal(await evaluate('document.querySelector(".dss-tl-hist-total").textContent'), hiddenKpi, 'day timeline cost stays in sync after hiding a project');
  await click('[data-action=tl-axis-full]'); await click('[data-action=tl-metric-token]');
  assert(await evaluate('document.querySelector("[data-action=tl-axis-full]").getAttribute("aria-pressed") === "true"'));
  assert(await evaluate('document.querySelector("[data-action=tl-metric-token]").getAttribute("aria-pressed") === "true"'));
  await press('Escape'); await until('!document.querySelector(".dss-panel")');
  await click('.dss-trigger'); await tab(2); await until('document.querySelector(".dss-tl")');
  assert(await evaluate('document.querySelector("[data-action=tl-axis-full]").getAttribute("aria-pressed") === "true"'), 'axis preference persists');
  assert(await evaluate('document.querySelector("[data-action=tl-metric-token]").getAttribute("aria-pressed") === "true"'), 'metric preference persists');
  report.checks.push('day timeline: single scroll, >=11px text, overview cost parity, tick alignment, run width, slot detail Esc/focus and session opening');
  await evaluate('localStorage.removeItem("dsh-stats.hidden")');
  await navigate('/?stats=partial&lang=zh');
  await click('.dss-trigger'); await tab(1); await until('document.querySelector(".dss-data-status.partial")');
  const partialKpi = await evaluate('document.querySelector(".dss-kpi.cost .dss-kpi-v").textContent');
  await tab(2); await until('document.querySelector(".dss-tl")');
  if (await evaluate('!!document.querySelector("[data-action=mode-day]")')) await click('[data-action=mode-day]');
  await until('document.querySelector(".dss-tl[data-mode=day]")');
  await click('[data-action=tl-metric-cost]');
  const partialTotal = await evaluate('document.querySelector(".dss-tl-hist-total").textContent');
  assert.equal(partialTotal, partialKpi, 'partial day timeline cost matches the overview KPI');
  assert(partialTotal.includes('*'), 'partial day cost keeps the unpriced marker: ' + partialTotal);
  report.checks.push('day timeline: filter project set and duration values, persisted axis/metric preferences, partial cost marker, lane pagination');
  await navigate('/?stats=large&lang=zh');
  await click('.dss-trigger'); await tab(2); await until('document.querySelector(".dss-data-status.exact")');
  await until('document.querySelector(".dss-tl")');
  if (await evaluate('!!document.querySelector("[data-action=mode-day]")')) await click('[data-action=mode-day]');
  await until('document.querySelector(".dss-tl[data-mode=day]")');
  const laneIds = await collectPages('lanes', '.dss-tl-lane', 'node.dataset.projectId');
  assert.equal(laneIds.length, 120, 'all large-day lanes reachable');
  assert.equal(new Set(laneIds).size, 120, 'lane pages do not overlap');

  for (const width of [320, 390, 641]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    await navigate('/?stats=estimated&lang=zh');
    await click('.dss-trigger'); await tab(2); await until('document.querySelector(".dss-tl")');
    if (await evaluate('!!document.querySelector("[data-action=mode-day]")')) await click('[data-action=mode-day]');
    await until('document.querySelector(".dss-tl[data-mode=day]")');
    await click('[data-action=tl-axis-focus]');
    await until('document.querySelector(".dss-tl-now")');
    const layering = await evaluate(`(() => {
      const line = document.querySelector('.dss-tl-now');
      if (!line) return { skip: true, bad: [] };
      const x = line.getBoundingClientRect().left;
      const lineZ = Number(getComputedStyle(line).zIndex) || 0;
      const bad = [];
      for (const lab of document.querySelectorAll('.dss-tl-lab')) {
        const rect = lab.getBoundingClientRect();
        if (x < rect.left || x > rect.right) continue;
        const labZ = Number(getComputedStyle(lab).zIndex) || 0;
        const hit = document.elementFromPoint(x, rect.top + rect.height / 2);
        if (labZ < lineZ || !hit || !lab.contains(hit)) bad.push({ text: lab.textContent.slice(0, 40), labZ: labZ, lineZ: lineZ, hit: hit && (hit.className || hit.tagName) });
      }
      return { skip: false, bad: bad };
    })()`);
    assert(layering.skip || layering.bad.length === 0, 'now line stays behind labels at ' + width + ': ' + JSON.stringify(layering));
    await capture('timeline-now-' + width);
  }
  report.checks.push('day timeline: now line stays behind labels at 320/390/641');
  assert.deepEqual(report.errors, []);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failure = error.stack;
  report.chrome = { exitCode: chrome.exitCode, signal: chrome.signalCode, stderr: chromeStderr };
  if (socket?.readyState === WebSocket.OPEN) await capture('failure').catch(() => {});
  process.exitCode = 1;
} finally {
  // Preserve assertion failures even if browser shutdown itself fails.
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (socket?.readyState === WebSocket.OPEN) await command('Browser.close').catch(() => {});
  socket?.close();
  const stopBrowser = signal => {
    if (!chrome.pid) return;
    try {
      // Chrome's launcher may exit before its helpers. This process group was
      // created exclusively for this fixture, so it never includes user Chrome.
      if (process.platform !== 'win32') process.kill(-chrome.pid, signal);
      else chrome.kill(signal);
    } catch (error) { if (error.code !== 'ESRCH') throw error; }
  };
  if (chrome.pid && chrome.exitCode === null && chrome.signalCode === null) {
    const stopped = once(chrome, 'exit');
    stopBrowser('SIGTERM'); await Promise.race([stopped, delay(3000)]);
    if (chrome.exitCode === null && chrome.signalCode === null) { stopBrowser('SIGKILL'); await stopped; }
  }
  stopBrowser('SIGKILL');
  await new Promise(resolve => server.close(resolve));
  // Chromium helpers can briefly finish profile writes after the parent exits.
  rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  console.log(JSON.stringify({ ...report, output }, null, 2));
}
