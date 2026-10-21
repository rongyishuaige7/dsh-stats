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
import view from '../src/pricing-view.cjs';
import pricing from '../src/pricing.cjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const chromePath = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
accessSync(chromePath, constants.X_OK);
const scratch = mkdtempSync(join(tmpdir(), 'dsh-stats-browser-'));
const output = process.env.DSH_SMOKE_OUTPUT ? resolve(process.env.DSH_SMOKE_OUTPUT) : mkdtempSync(join(tmpdir(), 'dsh-stats-browser-results-'));
mkdirSync(output, { recursive: true });
const report = { status: 'running', screenshots: [], checks: [], errors: [] };
const data = await browserData(join(scratch, 'home'));
const smokeAt = Date.parse('2026-10-17T12:00:00Z');
const signedCatalog = pricing.validateCatalog(JSON.parse(readFileSync(join(root, 'data/pricing/catalog.json'), 'utf8')));
const expectedRuleIds = new Set(signedCatalog.rules.map(rule => rule.id));
const catalogGroups = view.catalogGroups(signedCatalog, new Set(), smokeAt);
const canonicalCounts = new Map();
const summariesByKey = new Map();
for (const group of catalogGroups) {
  canonicalCounts.set(group.canonical, (canonicalCounts.get(group.canonical) || 0) + 1);
  summariesByKey.set(group.key, view.modelPriceSummary(group));
}
const uniqueModel = group => canonicalCounts.get(group.canonical) === 1;
const flatModel = catalogGroups.find(group => summariesByKey.get(group.key).kind === 'flat' && uniqueModel(group));
const tieredModel = catalogGroups.find(group => summariesByKey.get(group.key).kind === 'tiered' && uniqueModel(group) && group.rules.length > 1)
  || catalogGroups.find(group => summariesByKey.get(group.key).kind === 'tiered' && uniqueModel(group));
const provisionalModel = catalogGroups.find(group => uniqueModel(group)
  && group.rules.some(row => row.phase === 'current' && typeof row.rule.note === 'string' && row.rule.note.startsWith('[provisional]')));
const fixtureUsed = view.usedModelKeys(data.partial.projects, signedCatalog);
const fixtureGroups = view.catalogGroups(signedCatalog, fixtureUsed, smokeAt);
const usedModel = fixtureGroups.find(group => group.isUsed);
const longModel = [...catalogGroups].sort((a, b) => (b.provider.length + b.canonical.length) - (a.provider.length + a.canonical.length))[0];
const fixtureUsedSelection = view.selectModelGroups(fixtureGroups, { scope: 'used', page: 0, pageSize: 25 });
const fixtureAllSelection = view.selectModelGroups(fixtureGroups, { scope: 'all', page: 0, pageSize: 25 });
const fillTemplate = (template, ...values) => values.reduce((text, value) => text.replace('%d', String(value)), template);
const runtime = await build({ entryPoints: [join(root, 'scripts/fixtures/browser-entry.js')], bundle: true, write: false,
  format: 'iife', platform: 'browser', minify: true, define: { 'process.env.NODE_ENV': '"production"' },
  // Only the two official icons are used; their barrel also imports KaTeX CSS.
  loader: { '.css': 'empty' } });
const client = readFileSync(join(root, 'lib/client.js'));
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DSH Stats Fixture</title><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;letter-spacing:0;background:#f4f5f6;--dsw-specific-menu:#fff;--dsw-alias-bg-layer-1:#fff;--dsw-alias-bg-layer-2:#fff;--dsw-alias-label-primary:#20242b;--dsw-alias-label-secondary:#565e6b;--dsw-alias-label-tertiary:#707986;--dsw-alias-border:#dce0e5;--dsw-alias-border-inverted:#dce0e5}</style></head><body><div id="app"></div><script src="/runtime.js"></script><script src="/client.js"></script></body></html>';
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1').pathname;
  if (path === '/pricing-history' && request.method === 'POST') {
    try {
      let body = ''; for await (const chunk of request) body += chunk;
      const { action } = JSON.parse(body);
      if (action === 'clear') data.pricingHistory.clear();
      else if (action === 'restore') data.pricingHistory.restore();
      else throw new Error('pricing-history-action');
      response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify({ ok: true }));
    } catch { response.writeHead(400, { 'content-type': 'application/json' }); response.end(JSON.stringify({ ok: false })); }
    return;
  }
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
const KEY_CODES = { Tab: 9, Escape: 27, Enter: 13, ArrowLeft: 37, ArrowRight: 39, ArrowUp: 38, ArrowDown: 40, Home: 36, End: 35, ' ': 32 };
async function drawerScrollables() {
  return evaluate(`(() => {
    const drawer = document.querySelector('.dss-drawer');
    if (!drawer) return [];
    return [...drawer.querySelectorAll('*')].filter(node => {
      const style = getComputedStyle(node);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1;
    }).map(node => String(node.className || node.tagName));
  })()`);
}
async function assertDrawerSingleScroll(name) {
  const scrollables = await drawerScrollables();
  assert(scrollables.every(selector => selector === 'dss-drawer-body'), name + ' only drawer body scrolls: ' + JSON.stringify(scrollables));
}
async function pricingSection(name) {
  await click('[data-action=price-section-' + name + ']');
  await delay(120);
}
async function pricingSearch(value) {
  await evaluate(`(() => {
    const input = document.querySelector('.dss-price-search-input');
    if (!input) return false;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  await delay(150);
}
async function setPricingLabel(label, value) {
  return evaluate(`(() => {
    const input = [...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === ${JSON.stringify(label)});
    if (!input) return false;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
}
async function setPricingInput(key, value) {
  const label = await evaluate(`window.__fixture.t(${JSON.stringify(key)})`);
  return setPricingLabel(label, value);
}
async function setPricingSelect(label, value) {
  return evaluate(`(() => {
    const select = [...document.querySelectorAll('.dss-pricing select')].find(node => node.getAttribute('aria-label') === ${JSON.stringify(label)});
    if (!select) return false;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, ${JSON.stringify(value)});
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
}
async function pricingPayload(action) {
  return evaluate(`(() => {
    const call = [...window.__fixture.calls].reverse().find(row => row[0] === 'pricing' && row[1] === ${JSON.stringify(action)});
    return call ? call[2] : null;
  })()`);
}
async function tagStyle(modelKey, selector) {
  return evaluate(`(() => {
    const row = [...document.querySelectorAll('.dss-price-model-row')].find(node => node.dataset.modelKey === ${JSON.stringify(modelKey)});
    const node = row && row.querySelector(${JSON.stringify(selector)});
    if (!node) return null;
    const style = getComputedStyle(node);
    return { fontSize: style.fontSize, color: style.color, background: style.backgroundColor, borderColor: style.borderTopColor };
  })()`);
}
async function openPricingModel(key) {
  assert(await evaluate(`(() => {
    const row = [...document.querySelectorAll('.dss-price-model-row')].find(node => node.dataset.modelKey === ${JSON.stringify(key)});
    if (!row) return false;
    row.click();
    return true;
  })()`), 'open model ' + key);
  await until('document.querySelector(".dss-price-detail-title")');
}
async function backPricingModel(key) {
  await click('[data-action=price-back-models]');
  await until('document.querySelector(".dss-price-model-list")');
  await until(`document.activeElement && document.activeElement.dataset && document.activeElement.dataset.modelKey === ${JSON.stringify(key)}`, 'focus returns to model row');
}
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
    const selectors = ['.dss-head','.dss-tabs','.dss-data-status','.dss-status-banner','.dss-tools','.dss-kpis','.dss-tr-kpis','.dss-tr-tools','.dss-tr-chart','.dss-tr-heat','.dss-tr-mtable','.dss-strip','.dss-ptable','.dss-bal-kpis','.dss-bal-row','.dss-bal-meter','.dss-bal-idle','.dss-price-nav','.dss-price-sync','.dss-price-pending','.dss-price-model-row','.dss-price-detail-head','.dss-price-rule-detail','.dss-price-commit'];
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
    for (const row of document.querySelectorAll('.dss-price-model-row')) {
      const boundary = rect(row), identity = row.querySelector('.dss-price-model-identity'), summary = row.querySelector('.dss-price-model-summary');
      for (const group of [identity, summary]) {
        if (!group) continue;
        const r = rect(group);
        if (r.right > boundary.right + 1 || group.scrollWidth > group.clientWidth + 2) issues.push('model row clipped: ' + row.textContent.slice(0, 80));
      }
      if (identity && summary && overlaps(rect(identity), rect(summary))) issues.push('model identity/summary overlap');
      for (const value of row.querySelectorAll('.dss-price-model-price,.dss-price-model-meta')) if (value.scrollWidth > value.clientWidth + 2) issues.push('model summary clipped');
    }
    for (const detail of document.querySelectorAll('.dss-price-rule-detail')) {
      const boundary = rect(detail), head = detail.querySelector('.dss-price-rule-detail-head');
      if (head && (head.scrollWidth > head.clientWidth + 2 || rect(head).right > boundary.right + 1)) issues.push('rule head clipped');
      for (const value of detail.querySelectorAll('.dss-price-rate-v')) if (value.scrollWidth > value.clientWidth + 2) issues.push('rate clipped');
    }
    return issues.slice(0, 10);
  })()`);
  assert.deepEqual(overlaps, [], name + ' internal overlap or clipping');
}
// 趋势页和余额页共用：只有 .dss-body 可以滚动，正文不小于 11px（§9.2、§9.3 第 10 条）。
async function scrollableNames() {
  return evaluate(`(() => {
    const panel = document.querySelector('.dss-panel');
    return [...panel.querySelectorAll('*')].filter(node => {
      const style = getComputedStyle(node);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1;
    }).map(node => String(node.className || node.tagName));
  })()`);
}
async function assertSingleScroll(name, options = {}) {
  const scrollables = await scrollableNames();
  assert(scrollables.every(selector => selector === 'dss-body'), name + ' only body scrolls: ' + JSON.stringify(scrollables));
  if (options.requireBody) assert.deepEqual(scrollables, ['dss-body'], name + ' body scrolls when content overflows: ' + JSON.stringify(scrollables));
  return scrollables;
}
async function assertTextFloor(name) {
  const smallFonts = await evaluate(`(() => {
    const bad = [];
    for (const node of document.querySelectorAll('.dss-overlay *')) {
      if (![...node.childNodes].some(child => child.nodeType === 3 && child.textContent.trim())) continue;
      const size = parseFloat(getComputedStyle(node).fontSize);
      if (size < 11) bad.push({ tag: node.tagName, cls: String(node.className || ''), size });
    }
    return bad.slice(0, 10);
  })()`);
  assert.deepEqual(smallFonts, [], name + ' text floor: ' + JSON.stringify(smallFonts));
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
  const providerCalls = () => evaluate('window.__fixture.calls.filter(row => row[0] === "providers").length');
  assert.deepEqual(await accountCalls(), [], 'balance must not be queried outside its tab');
  assert.equal(await providerCalls(), 0, 'providers must not be queried outside the balance tab');
  await tab(4); await until('document.querySelector(".dss-bal-row")');
  assert.deepEqual(await accountCalls(), [false]);
  assert.equal(await providerCalls(), 1, 'providers is queried once when the balance tab first loads');
  await refresh(); await delay(300);
  await tab(1); await tab(4); await until('document.querySelector(".dss-bal-row")'); await delay(300);
  assert.deepEqual(await accountCalls(), [false, true, false], 'forced refresh applies once; re-entry uses the host cache');
  assert.equal(await providerCalls(), 1, 'providers is not queried again on refresh or re-entry');
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
  assert.equal(await providerCalls(), 1, 'tab keyboard navigation must not query providers');
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
    for (const index of [1, 2, 3, 4]) {
      await tab(index);
      if (index === 4) await until('document.querySelector(".dss-bal-row")');
      texts.push(await evaluate('document.querySelector(".dss-body").innerText'));
    }
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
      if (view === 'balance') {
        await assertSingleScroll(name + ' balance', { requireBody: width < 600 });
        await assertTextFloor(name + ' balance');
        if (lang === 'en') {
          const englishNames = await evaluate('document.querySelector(".dss-bal-kpi-names")?.textContent || ""');
          assert(!englishNames.includes('、'), 'English attention names use commas: ' + englishNames);
        }
      }
      if (view === 'trends') {
        await until('document.querySelector(".dss-tr-kpis")');
        await assertSingleScroll(name + ' trends', { requireBody: width < 600 });
        await assertTextFloor(name + ' trends');
      }
      await layout(name + '-' + view); await capture(name + '-' + view);
      if ((width < 600 && (['overview', 'trends'].includes(view) || (view === 'balance' && width === 390))) || (name === 'desktop' && view === 'trends')) {
        await evaluate('document.querySelector(".dss-body").scrollTop = 10000');
        await capture(name + '-' + view + '-bottom');
        await evaluate('document.querySelector(".dss-body").scrollTop = 0');
      }
    }
    if (name === 'desktop') {
      await tab(4);
      await until('document.querySelectorAll(".dss-bal-row").length === 6');
      const rowIds = await evaluate('[...document.querySelectorAll(".dss-bal-row")].map(node => node.dataset.accountId)');
      assert.deepEqual(rowIds, ['kimi-coding', 'minimax-coding', 'moonshotai-cn', 'deepseek-official', 'openrouter', 'yi-api'], 'balance rows follow B2 order');
      assert(await evaluate('!document.querySelector(".dss-panel select")'), 'balance page has no provider select');
      const chips = await evaluate(`[...document.querySelectorAll('.dss-bal-row')].slice(0, 3).map(node => { const chip = node.querySelector('.dss-bal-chip'); return { text: chip?.textContent || '', cls: chip?.className || '' }; })`);
      assert.deepEqual(chips.map(row => row.text), ['额度将用完', '额度紧张', '已过期'], 'balance chips follow B7');
      assert(chips[0].cls.includes('is-danger') && chips[1].cls.includes('is-warn') && chips[2].cls.includes('is-warn'), 'balance chip tones');
      assert(await evaluate(`[...document.querySelectorAll('.dss-bal-row')].slice(3).every(node => !node.querySelector('.dss-bal-chip') && node.querySelector('.dss-sr')?.textContent === '状态正常')`), 'ok rows expose only a screen-reader status');
      const metas = await evaluate(`Object.fromEntries([...document.querySelectorAll('.dss-bal-row')].map(node => [node.dataset.accountId, node.querySelector('.dss-bal-meta')?.textContent || '']))`);
      assert.equal(metas['kimi-coding'], '订阅 · kimi-coding');
      assert.equal(metas['minimax-coding'], '订阅 · Professional Coding Plan');
      assert.equal(metas['yi-api'], '余额 · 自定义路由');
      const kimiMeter = await evaluate(`(() => { const bar = document.querySelector('[data-account-id="kimi-coding"] .dss-bal-bar'); return { now: bar.getAttribute('aria-valuenow'), cls: bar.className, width: bar.querySelector('i').style.width }; })()`);
      assert.deepEqual(kimiMeter, { now: '4', cls: 'dss-bal-bar is-danger', width: '4%' }, 'kimi meter shows remaining');
      const minimaxMeter = await evaluate(`(() => { const bar = document.querySelector('[data-account-id="minimax-coding"] .dss-bal-meter .dss-bal-bar'); return { now: bar.getAttribute('aria-valuenow'), cls: bar.className, width: bar.querySelector('i').style.width }; })()`);
      assert.deepEqual(minimaxMeter, { now: '18', cls: 'dss-bal-bar is-warn', width: '18%' }, 'minimax session meter shows remaining');
      assert.equal(await evaluate(`document.querySelector('[data-account-id="minimax-coding"] .dss-bal-meter .dss-bal-reset').textContent`), '2 小时 10 分后重置');
      await command('Emulation.setFocusEmulationEnabled', { enabled: true });
      let resetTip = '';
      try {
        await focus('[data-account-id="minimax-coding"] .dss-bal-meter .dss-bal-reset');
        resetTip = await evaluate('document.querySelector("#dss-tooltip")?.textContent || ""');
      } finally {
        await command('Emulation.setFocusEmulationEnabled', { enabled: false }).catch(() => {});
      }
      assert(resetTip.includes('北京时间 2026-09-08 12:10 重置'), 'reset tooltip shows Beijing time: ' + resetTip);
      assert.equal(await evaluate(`document.querySelector('[data-account-id="kimi-coding"] .dss-bal-reset').textContent`), '2 天 14 小时后重置');
      const kpis = await evaluate(`(() => { const cells = [...document.querySelectorAll('.dss-bal-kpi')]; return { count: cells.length, lead: cells[0]?.querySelector('.dss-bal-kpi-v')?.textContent, leadSub: cells[0]?.querySelector('.dss-bal-kpi-s')?.textContent, tight: cells[1]?.querySelector('.dss-bal-kpi-v')?.textContent, tightCls: cells[1]?.querySelector('.dss-bal-kpi-v')?.className, tightSub: cells[1]?.querySelector('.dss-bal-kpi-s')?.textContent, attention: cells[2]?.querySelector('.dss-bal-kpi-v')?.textContent, attentionSub: cells[2]?.querySelector('.dss-bal-kpi-s')?.textContent }; })()`);
      assert.equal(kpis.count, 3);
      assert.equal(kpis.lead, '¥159.65');
      assert(kpis.leadSub.includes('$58.30') && kpis.leadSub.includes('4 个余额账户') && kpis.leadSub.includes('1 个为过期快照'), 'balance summary subline: ' + kpis.leadSub);
      assert.equal(kpis.tight, '剩余 4%');
      assert(kpis.tightCls.includes('is-danger'));
      assert(kpis.tightSub.includes('Kimi For Coding 本周'));
      assert.equal(kpis.attention, '3');
      assert.equal(kpis.attentionSub, 'Kimi For Coding、MiniMax Coding Plan、Moonshot');
      assert.equal(await evaluate(`document.querySelector('[data-account-id="deepseek-official"] .dss-bal-amt-sub').textContent`), '充值 ¥100.00 · 赠送 ¥23.45');
      const openrouter = await evaluate(`(() => { const row = document.querySelector('[data-account-id="openrouter"]'); const bar = row.querySelector('.dss-bal-meter[data-kind="credit"] .dss-bal-bar'); return { amount: row.querySelector('.dss-bal-amt').textContent, sub: row.querySelector('.dss-bal-amt-sub').textContent, now: bar.getAttribute('aria-valuenow'), cls: bar.className }; })()`);
      assert.equal(openrouter.amount, '$15.50');
      assert.equal(openrouter.sub, '已用 $4.50 / $20.00');
      assert.equal(openrouter.now, '77');
      assert(!openrouter.cls.includes('is-warn') && !openrouter.cls.includes('is-danger'));
      const moonshot = await evaluate(`(() => { const row = document.querySelector('[data-account-id="moonshotai-cn"]'); return { amount: row.querySelector('.dss-bal-amt').textContent, cls: row.querySelector('.dss-bal-amt').className, reason: row.querySelector('.dss-bal-reason')?.textContent || '' }; })()`);
      assert.equal(moonshot.amount, '¥36.20');
      assert(moonshot.cls.includes('is-stale'));
      assert.equal(moonshot.reason, '刷新失败，显示的是 2026-09-08 09:34 的结果');
      const idle = await evaluate(`(() => { const details = document.querySelector('.dss-bal-idle'); return { open: details.open, summary: details.querySelector('summary').textContent }; })()`);
      assert.equal(idle.open, false);
      assert.equal(idle.summary, '未接入 2 个：Z.ai Coding Plan · Anthropic');
      await click('.dss-bal-idle-sum');
      await until('document.querySelector(".dss-bal-idle").open');
      const idleRows = await evaluate(`[...document.querySelectorAll('.dss-bal-idle-row')].map(node => ({ id: node.dataset.accountId, code: node.querySelector('code')?.textContent || '', link: !!node.querySelector('.dss-bal-link') }))`);
      assert.deepEqual(idleRows, [
        { id: 'zai-coding-cn', code: 'ZAI_API_KEY', link: true },
        { id: 'anthropic', code: '', link: false }
      ]);
      const links = await evaluate(`[...document.querySelectorAll('.dss-bal-link')].map(node => ({ href: node.getAttribute('href'), target: node.getAttribute('target'), rel: node.getAttribute('rel') }))`);
      assert(links.length > 0 && links.every(link => link.href.startsWith('https:') && link.target === '_blank' && link.rel.includes('noreferrer')), 'balance links are safe external links');
      assert(await evaluate(`!document.querySelector('[data-account-id="yi-api"] .dss-bal-link')`), 'yi-api has no link');
      assert(!(await evaluate('document.querySelector(".dss-panel").innerText')).includes('provider account service is unavailable'), 'host warning text must not reach the body');
      await refresh(); await delay(300);
      await until('document.querySelectorAll(".dss-bal-row").length === 6');
      assert(await evaluate('document.querySelector(".dss-bal-idle").open'), 'idle group stays open after refresh');
      report.checks.push('balance: account order, chips, metadata, remaining meters, summary strip, idle group and safe links');
    }
    report.checks.push(name + ': all four tabs, account list order and layout');
  }
  report.checks.push('balance: single scroll container and >=11px text at 1440/390/320');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/?accountSet=single&lang=zh');
  await click('.dss-trigger'); await tab(4);
  await until('document.querySelectorAll(".dss-bal-row").length === 1');
  assert(await evaluate('!document.querySelector(".dss-bal-kpis")'), 'single account has no summary strip');
  await navigate('/?accountSet=attention&lang=zh');
  await click('.dss-trigger'); await tab(4);
  await until('document.querySelectorAll(".dss-bal-row").length === 6');
  const attentionRows = await evaluate(`[...document.querySelectorAll('.dss-bal-row')].slice(0, 3).map(node => ({ id: node.dataset.accountId, chip: node.querySelector('.dss-bal-chip')?.textContent || '', amount: node.querySelector('.dss-bal-amt')?.textContent || '', cls: node.querySelector('.dss-bal-amt')?.className || '', reason: node.querySelector('.dss-bal-reason')?.textContent || '' }))`);
  assert.deepEqual(attentionRows.map(row => row.id), ['deepseek-official', 'openrouter', 'kimi-coding']);
  assert.equal(attentionRows[0].chip, '余额已用完');
  assert.equal(attentionRows[0].amount, '¥0.00');
  assert(attentionRows[0].cls.includes('is-zero'));
  assert.equal(attentionRows[0].reason, '余额为 0，充值后才能继续调用');
  assert.equal(attentionRows[1].chip, '凭证无效');
  assert.equal(attentionRows[1].amount, '—');
  assert.equal(attentionRows[1].reason, '凭证无效或没有查询权限');
  await layout('desktop-balance-attention'); await capture('desktop-balance-attention');
  await navigate('/?lang=zh');
  await evaluate('window.__fixture.accountMode = "error"');
  await click('.dss-trigger');
  await tab(4);
  await until('document.querySelector(".dss-data-status.error")');
  await until('document.querySelector(".dss-bal-failed [data-action=balance-retry]")');
  assert(await evaluate('!document.querySelector(".dss-status-banner")'), 'first failure has no banner');
  assert.equal(await evaluate('document.querySelector(".dss-bal-failed").getAttribute("role")'), 'status');
  await layout('balance-failed'); await capture('balance-failed');
  await evaluate('window.__fixture.accountMode = "ok"');
  await click('[data-action=balance-retry]');
  await until('document.querySelectorAll(".dss-bal-row").length === 6');
  assert.equal(await evaluate('window.__fixture.calls.filter(row => row[0] === "account").at(-1)[1]'), true, 'balance retry forces a host refresh');
  report.checks.push('balance: attention fixture and first-load failure retry');

  // 5c: per-account balance alerts.
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate('localStorage.removeItem("dsh-stats.balanceAlerts")');
  await navigate('/?lang=zh');
  await click('.dss-trigger'); await tab(4);
  await until('document.querySelectorAll(".dss-bal-row").length === 6');
  const bellIds = await evaluate(`[...document.querySelectorAll('[data-action=balance-alert]')].map(node => node.closest('[data-account-id]').dataset.accountId)`);
  assert.deepEqual([...bellIds].sort(), ['deepseek-official', 'moonshotai-cn', 'openrouter', 'yi-api'], 'bells only on readable balance rows');
  const desktopBellRights = await evaluate(`[...document.querySelectorAll('[data-action=balance-alert]')].map(node => node.getBoundingClientRect().right)`);
  assert(Math.max(...desktopBellRights) - Math.min(...desktopBellRights) <= 1, 'desktop bells share a right edge: ' + JSON.stringify(desktopBellRights));
  const desktopLinkRights = await evaluate(`[...document.querySelectorAll('.dss-bal-act [data-action=balance-link]')].map(node => node.getBoundingClientRect().right)`);
  assert(Math.max(...desktopLinkRights) - Math.min(...desktopLinkRights) <= 1, 'desktop action links share a right edge: ' + JSON.stringify(desktopLinkRights));
  assert(await evaluate(`[...document.querySelectorAll('.dss-bal-row')].every(row => { const bell = row.querySelector('[data-action=balance-alert]'); const link = row.querySelector('.dss-bal-act [data-action=balance-link]'); return !bell || !link || link.getBoundingClientRect().left > bell.getBoundingClientRect().right; })`), 'desktop action links start after the bell');
  assert(await evaluate(`[...document.querySelectorAll('[data-action=balance-alert]')].every(node => !node.classList.contains('is-on'))`), 'no bell starts enabled');
  assert.equal(await evaluate(`document.querySelector('[data-account-id=deepseek-official] [data-action=balance-alert]').getAttribute('aria-label')`), 'DeepSeek 余额提醒：未设置');
  assert.equal(await evaluate(`document.querySelector('[data-account-id=deepseek-official] [data-action=balance-alert]').getAttribute('aria-expanded')`), 'false');

  const setAlertValue = value => evaluate(`(() => { const input = document.querySelector('.dss-bal-alert input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await click('[data-account-id=deepseek-official] [data-action=balance-alert]');
  await until('document.querySelector(".dss-bal-alert[role=dialog]")');
  assert.equal(await evaluate(`document.querySelector('[data-account-id=deepseek-official] [data-action=balance-alert]').getAttribute('aria-expanded')`), 'true');
  assert.equal(await evaluate('document.activeElement.getAttribute("data-popover-autofocus")'), 'true', 'alert input receives focus');
  await setAlertValue('abc');
  await click('[data-action=balance-alert-save]');
  await until('document.querySelector(".dss-bal-alert-error")');
  assert.equal(await evaluate('document.querySelector(".dss-bal-alert-error").textContent'), '请输入大于 0 的金额，最多两位小数');
  assert.equal(await evaluate('document.querySelector(".dss-bal-alert input").getAttribute("aria-invalid")'), 'true');
  assert(await evaluate('!!document.querySelector(".dss-bal-alert") && document.activeElement === document.querySelector(".dss-bal-alert input")'), 'invalid input keeps focus');
  await setAlertValue('');
  await click('[data-action=balance-alert-save]');
  await until('document.querySelector(".dss-bal-alert-error")?.textContent === "请输入金额"');
  await setAlertValue('200');
  await click('[data-action=balance-alert-save]');
  await until('!document.querySelector(".dss-bal-alert")');
  assert(await evaluate(`document.querySelector('[data-account-id=deepseek-official] [data-action=balance-alert]').classList.contains('is-on')`), 'saved bell is on');
  assert(await evaluate(`document.activeElement === document.querySelector('[data-account-id=deepseek-official] [data-action=balance-alert]')`), 'save returns focus to the bell');
  assert.equal(await evaluate(`document.querySelector('[data-account-id=deepseek-official] .dss-bal-chip').textContent`), '余额偏低');
  assert.equal(await evaluate(`document.querySelector('[data-account-id=deepseek-official] .dss-bal-alert-line.is-warn').textContent`), '提醒线 ¥200.00');
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.dss-bal-row')].map(node => node.dataset.accountId)`), ['kimi-coding', 'deepseek-official', 'minimax-coding', 'moonshotai-cn', 'openrouter', 'yi-api'], 'alert moves the row');
  await delay(200);
  const storedAlerts = await evaluate('localStorage.getItem("dsh-stats.balanceAlerts")');
  assert.deepEqual(JSON.parse(storedAlerts), { 'deepseek-official': { amount: 200, currency: 'CNY' } });
  assert.equal(await evaluate('document.querySelector(".dss-bal-kpi:nth-child(3) .dss-bal-kpi-v").textContent'), '4');

  await click('[data-action=close]');
  await until('!document.querySelector(".dss-panel")');
  await click('.dss-trigger'); await tab(4);
  await until('document.querySelectorAll(".dss-bal-row").length === 6');
  assert(await evaluate(`document.querySelector('[data-account-id=deepseek-official] [data-action=balance-alert]').classList.contains('is-on')`), 'alert survives reopening');
  assert.equal(await evaluate(`document.querySelector('[data-account-id=deepseek-official] .dss-bal-chip').textContent`), '余额偏低');

  await focus('[data-account-id=deepseek-official] [data-action=balance-alert]');
  await click('[data-account-id=deepseek-official] [data-action=balance-alert]');
  await until('document.querySelector(".dss-bal-alert")');
  await press('Escape');
  await until('!document.querySelector(".dss-bal-alert")');
  assert(await evaluate('!!document.querySelector(".dss-panel")'), 'first Escape closes only the popover');
  assert(await evaluate(`document.activeElement === document.querySelector('[data-account-id=deepseek-official] [data-action=balance-alert]')`), 'popover Escape returns focus to the bell');
  await press('Escape');
  await until('!document.querySelector(".dss-panel")');

  await focus('.dss-trigger');
  await click('.dss-trigger'); await tab(4);
  await until('document.querySelectorAll(".dss-bal-row").length === 6');
  await click('[data-account-id=deepseek-official] [data-action=balance-alert]');
  await until('document.querySelector(".dss-bal-alert")');
  await evaluate(`document.querySelector('.dss-bal-foot').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`);
  await until('!document.querySelector(".dss-bal-alert")');
  assert(await evaluate(`document.activeElement !== document.querySelector('[data-account-id=deepseek-official] [data-action=balance-alert]')`), 'outside pointer does not restore the bell');
  await click('[data-account-id=deepseek-official] [data-action=balance-alert]');
  await until('document.querySelector(".dss-bal-alert")');
  await evaluate(`document.querySelector('[data-account-id=openrouter] [data-action=balance-alert]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`);
  await click('[data-account-id=openrouter] [data-action=balance-alert]');
  await until('document.querySelectorAll(".dss-bal-alert").length === 1');
  assert(await evaluate('!!document.querySelector("[data-account-id=openrouter] .dss-bal-alert")'), 'only the newest bell popover stays open');
  await click('[data-account-id=openrouter] [data-action=balance-alert]');
  await until('!document.querySelector(".dss-bal-alert")');

  await click('[data-account-id=deepseek-official] [data-action=balance-alert]');
  await until('document.querySelector(".dss-bal-alert")');
  await click('[data-action=balance-alert-clear]');
  await until('!document.querySelector(".dss-bal-alert")');
  assert(await evaluate(`!document.querySelector('[data-account-id=deepseek-official] [data-action=balance-alert]').classList.contains('is-on')`), 'clear turns the bell off');
  assert(await evaluate(`!document.querySelector('[data-account-id=deepseek-official] .dss-bal-chip')`), 'clear removes the chip');
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.dss-bal-row')].map(node => node.dataset.accountId)`), ['kimi-coding', 'minimax-coding', 'moonshotai-cn', 'deepseek-official', 'openrouter', 'yi-api'], 'clear restores the order');
  assert(await evaluate('!("deepseek-official" in JSON.parse(localStorage.getItem("dsh-stats.balanceAlerts")))'), 'clear removes the stored alert');
  await click('[data-account-id=deepseek-official] [data-action=balance-alert]');
  await until('document.querySelector(".dss-bal-alert")');
  await setAlertValue('200');
  await click('[data-action=balance-alert-save]');
  await until('!document.querySelector(".dss-bal-alert")');
  await click('[data-account-id=deepseek-official] [data-action=balance-alert]');
  await until('document.querySelector(".dss-bal-alert")');
  await setAlertValue('');
  await click('[data-action=balance-alert-save]');
  await until('!document.querySelector(".dss-bal-alert")');
  assert(await evaluate('!("deepseek-official" in JSON.parse(localStorage.getItem("dsh-stats.balanceAlerts")))'), 'empty submit clears an existing alert');

  await evaluate('localStorage.setItem("dsh-stats.balanceAlerts", JSON.stringify({ openrouter: { amount: 999, currency: "CNY" } }))');
  await navigate('/?lang=zh');
  await click('.dss-trigger'); await tab(4);
  await until('document.querySelectorAll(".dss-bal-row").length === 6');
  assert(await evaluate(`!document.querySelector('[data-account-id=openrouter] [data-action=balance-alert]').classList.contains('is-on')`), 'currency mismatch disables the alert');
  assert.equal(await evaluate(`document.querySelector('[data-account-id=openrouter] [data-action=balance-alert]').getAttribute('aria-label')`), 'OpenRouter 余额提醒：未设置');
  assert.equal(await evaluate('document.querySelector("[data-account-id=openrouter]").dataset.tone'), 'ok');

  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate('/?lang=zh');
  await click('.dss-trigger'); await tab(4);
  await until('document.querySelectorAll(".dss-bal-row").length === 6');
  const mobileBellRights = await evaluate(`[...document.querySelectorAll('[data-action=balance-alert]')].map(node => node.getBoundingClientRect().right)`);
  assert(Math.max(...mobileBellRights) - Math.min(...mobileBellRights) <= 1, 'mobile bells share a right edge: ' + JSON.stringify(mobileBellRights));
  const mobileLinkRights = await evaluate(`[...document.querySelectorAll('.dss-bal-act [data-action=balance-link]')].map(node => node.getBoundingClientRect().right)`);
  assert(Math.max(...mobileLinkRights) - Math.min(...mobileLinkRights) <= 1, 'mobile action links share a right edge: ' + JSON.stringify(mobileLinkRights));
  assert(await evaluate(`[...document.querySelectorAll('.dss-bal-row')].every(row => { const bell = row.querySelector('[data-action=balance-alert]'); const link = row.querySelector('.dss-bal-act [data-action=balance-link]'); return !bell || !link || link.getBoundingClientRect().left > bell.getBoundingClientRect().right; })`), 'mobile action links start after the bell');
  await evaluate('document.querySelector(".dss-body").scrollTop = 10000'); await delay(100);
  await evaluate(`document.querySelector('[data-account-id=yi-api] [data-action=balance-alert]').click()`);
  await until('document.querySelector(".dss-bal-alert")');
  const alertBox = await evaluate(`(() => {
    const panel = document.querySelector('.dss-bal-alert').getBoundingClientRect();
    const body = document.querySelector('.dss-body').getBoundingClientRect();
    return { top: panel.top, bottom: panel.bottom, left: panel.left, right: panel.right,
      bodyTop: body.top, bodyBottom: body.bottom, bodyLeft: body.left, bodyRight: body.right };
  })()`);
  assert(alertBox.top >= alertBox.bodyTop - 1 && alertBox.bottom <= alertBox.bodyBottom + 1 && alertBox.left >= alertBox.bodyLeft - 1 && alertBox.right <= alertBox.bodyRight + 1, 'alert popover stays inside the body: ' + JSON.stringify(alertBox));
  await evaluate(`document.querySelector('[data-account-id=yi-api] [data-action=balance-alert]').click()`);
  await until('!document.querySelector(".dss-bal-alert")');

  // Removing the idle group leaves no room below the last row, so the popover
  // must flip above the bell. This is the screenshot state.
  await navigate('/?lang=zh');
  await evaluate('window.__fixture.omit = ["zai-coding-cn", "anthropic"]');
  await click('.dss-trigger'); await tab(4);
  await until('document.querySelectorAll(".dss-bal-row").length === 6');
  assert(await evaluate('!document.querySelector(".dss-bal-idle")'), 'idle group is gone for the flip fixture');
  // The footer leaves ~200px below the last row at the bottom, enough for this
  // short popover to fit without flipping. Hide it while opening so the last
  // bell really sits at the edge, then restore it for the screenshot.
  await evaluate('document.querySelector(".dss-bal-foot").style.display = "none"');
  await evaluate('document.querySelector(".dss-body").scrollTop = 10000'); await delay(100);
  await evaluate(`document.querySelector('[data-account-id=yi-api] [data-action=balance-alert]').click()`);
  await until('document.querySelector(".dss-bal-alert.is-up")');
  await evaluate('document.querySelector(".dss-bal-foot").style.display = ""');
  const flippedBox = await evaluate(`(() => {
    const panel = document.querySelector('.dss-bal-alert').getBoundingClientRect();
    const body = document.querySelector('.dss-body').getBoundingClientRect();
    return { top: panel.top, bottom: panel.bottom, left: panel.left, right: panel.right,
      bodyTop: body.top, bodyBottom: body.bottom, bodyLeft: body.left, bodyRight: body.right,
      up: document.querySelector('.dss-bal-alert').classList.contains('is-up') };
  })()`);
  assert(flippedBox.up, 'popover flips above the last bell');
  assert(flippedBox.top >= flippedBox.bodyTop - 1 && flippedBox.bottom <= flippedBox.bodyBottom + 1 && flippedBox.left >= flippedBox.bodyLeft - 1 && flippedBox.right <= flippedBox.bodyRight + 1, 'flipped popover stays inside the body: ' + JSON.stringify(flippedBox));
  await layout('mobile-balance-alert'); await capture('mobile-balance-alert');
  await evaluate(`document.querySelector('[data-account-id=yi-api] [data-action=balance-alert]').click()`);
  await until('!document.querySelector(".dss-bal-alert")');
  await evaluate('window.__fixture.omit = []');

  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/?lang=zh');
  await click('.dss-trigger'); await tab(4);
  await until('document.querySelectorAll(".dss-bal-row").length === 6');
  await click('[data-account-id=yi-api] [data-action=balance-alert]');
  await until('document.querySelector(".dss-bal-alert")');
  await evaluate('window.__fixture.omit = ["yi-api"]');
  await evaluate('document.querySelector("[data-action=refresh]").click()');
  await until('!document.querySelector("[data-account-id=yi-api]")');
  await until('!document.querySelector(".dss-bal-alert")');
  const afterRemoval = await evaluate(`(() => { const active = document.activeElement; return { body: active === document.body, html: active === document.documentElement, inside: !!(active && active.closest && active.closest('.dss-panel')) }; })()`);
  assert(!afterRemoval.body && !afterRemoval.html && afterRemoval.inside, 'removed row hands focus to the panel: ' + JSON.stringify(afterRemoval));
  await evaluate('window.__fixture.omit = []');
  report.checks.push('balance alerts: bell, validation, persistence, Esc, outside click, clear, currency mismatch, flip and row removal');

  // 5d: first-load skeleton.
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/?lang=zh&holdAccount=1');
  await click('.dss-trigger'); await tab(4);
  await until('document.querySelectorAll(".dss-bal-row.is-skeleton").length === 6');
  await until('typeof window.__fixture.releaseAccount === "function"');
  const skeletonNames = await evaluate('[...document.querySelectorAll(".dss-bal-row.is-skeleton .dss-bal-name")].map(node => node.textContent)');
  assert.deepEqual(skeletonNames, ['DeepSeek', 'MiniMax Coding Plan', 'OpenRouter', 'Kimi For Coding', 'Moonshot', 'yi-api'], 'skeleton names follow providers');
  assert(await evaluate('!!document.querySelector(".dss-bal-kpis.is-skeleton")'), 'skeleton has a summary strip');
  assert.equal(await evaluate('document.querySelector(".dss-bal").getAttribute("aria-busy")'), 'true');
  assert.equal(await evaluate('document.querySelector(".dss-bal-idle-sum").textContent'), '未接入 2 个：Z.ai Coding Plan · Anthropic');
  assert.equal(await evaluate('document.querySelector(".dss-data-status").className'), 'dss-data-status loading');
  assert.equal(await evaluate('document.querySelector(".dss-bal-foot").textContent'), '正在读取 6 个账户…');
  await layout('desktop-balance-skeleton'); await capture('desktop-balance-skeleton');
  await evaluate('window.__fixture.releaseAccount()');
  await until('document.querySelectorAll(".dss-bal-row.is-skeleton").length === 0 && document.querySelectorAll(".dss-bal-row").length === 6');
  assert(await evaluate('!document.querySelector(".dss-bal").hasAttribute("aria-busy")'), 'skeleton clears after account data');
  await tab(1); await tab(4); await until('document.querySelectorAll(".dss-bal-row").length === 6');
  await refresh(); await delay(300);
  assert.equal(await providerCalls(), 1, 'providers is still queried only once after refresh');
  await navigate('/?lang=zh&holdAccount=1&noProviders=1');
  await click('.dss-trigger'); await tab(4);
  await until('document.querySelectorAll(".dss-bal-row.is-skeleton").length === 3');
  assert.equal(await evaluate('document.querySelectorAll(".dss-bal-name").length'), 0, 'old hosts get unnamed placeholders');
  assert(await evaluate('!document.querySelector(".dss-bal-kpis")'), 'old hosts get no KPI skeleton');
  assert.equal(await evaluate('document.querySelector(".dss-bal-foot").textContent'), '正在读取账户数据…');
  assert.deepEqual(report.errors, [], 'old host skeleton reports no browser errors');
  report.checks.push('balance: providers queried once, named/unnamed skeleton and release');

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
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await evaluate('window.__fixture.accountMode = "error"'); await refresh();
  await until('document.querySelector(".dss-data-status.stale")');
  assert(await evaluate('!!document.querySelector(".dss-status-banner.stale [data-action=retry]")'), 'stale banner exposes retry');
  assert(await evaluate('!!document.querySelector(".dss-bal-row")'), 'stale query keeps the last rows');
  assert.equal(await evaluate('window.__fixture.calls.filter(row => row[0] === "current").length'), 0);
  assert(await evaluate('window.__fixture.calls.some(row => row[0] === "account" && row[1] === true)'));
  await evaluate('window.__fixture.accountMode = "legacy"'); await refresh();
  await until('document.querySelector(".dss-bal-note[data-code=LEGACY_ACCOUNT_API]")');
  assert(await evaluate('!document.querySelector(".dss-panel").innerText.includes("Legacy account service")'), 'legacy warning text stays out of the body');
  assert(await evaluate('!document.querySelector(".dss-panel select") && document.querySelectorAll(".dss-bal-row").length === 1 && document.querySelector(".dss-bal-row").dataset.accountId === "deepseek-official" && document.querySelector(".dss-bal-name").textContent === "DeepSeek"'), 'legacy host shows the single DeepSeek row');
  await evaluate('window.__fixture.accountMode = "stale"'); await refresh();
  await until('document.querySelector("[data-account-id=deepseek-official] .dss-bal-chip.is-warn")');
  assert.equal(await evaluate('document.querySelector(".dss-data-status").className'), 'dss-data-status exact', 'single stale account keeps the header exact');
  assert.equal(await evaluate('document.querySelector("[data-account-id=deepseek-official] .dss-bal-chip").textContent'), 'Stale');
  assert.equal(await evaluate('document.querySelector("[data-account-id=deepseek-official] .dss-bal-amt").textContent'), '¥123.45');
  assert(await evaluate('document.querySelector("[data-account-id=deepseek-official] .dss-bal-amt").classList.contains("is-stale")'));
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
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await click('.dss-trigger'); await tab(1);
  await click('[data-action=pricing]');
  await until('document.querySelector(".dss-drawer")');
  await until('document.querySelector(".dss-price-model-row")');
  assert.equal(await evaluate('document.querySelector(".dss-drawer").getAttribute("role")'), 'dialog', 'pricing drawer uses dialog semantics');
  assert.equal(await evaluate('document.querySelector(".dss-drawer").getAttribute("aria-modal")'), 'true', 'pricing drawer is modal');
  assert.equal(await evaluate('document.querySelector("[data-action=pricing]").getAttribute("aria-haspopup")'), 'dialog', 'gear exposes its dialog popup');
  assert.equal(await evaluate('document.querySelector("#dss-drawer-title").textContent'), await evaluate('window.__fixture.t("price.title")'), 'drawer title is localized');
  assert.equal(await evaluate('document.activeElement.getAttribute("data-action")'), 'drawer-close', 'drawer focuses its close button');
  assert.equal(await evaluate('document.querySelectorAll(".dss-price-nav-btn").length'), 3, 'drawer exposes three sections');
  assert(await evaluate('document.querySelector("[data-action=price-section-models]").getAttribute("aria-pressed") === "true"'), 'models section is the default');
  assert(await evaluate('document.querySelector("[data-action=price-scope-used]").getAttribute("aria-pressed") === "true"'), 'used scope is the default when usage matches the catalog');
  const usedCountText = fillTemplate(await evaluate('window.__fixture.t("price.modelCount")'), fixtureUsedSelection.modelCount) + ' · '
    + fillTemplate(await evaluate('window.__fixture.t("price.pricingRuleCount")'), fixtureUsedSelection.ruleCount);
  await until(`document.querySelector('.dss-price-count')?.textContent === ${JSON.stringify(usedCountText)}`);
  assert.equal(await evaluate('document.querySelectorAll(".dss-price-model-row").length'), fixtureUsedSelection.rows.length, 'used model page is bounded by group pagination');
  assert.equal(await evaluate('document.querySelectorAll(".dss-price-rule-detail").length'), 0, 'model list keeps rule details lazy');
  await layout('pricing-models'); await assertDrawerSingleScroll('pricing-models'); await assertTextFloor('pricing-models');
  await capture('desktop-pricing-models');
  await evaluate(`(() => { const nodes = ${DRAWER_FOCUSABLES}; if (!nodes.length) return false; nodes[nodes.length - 1].focus(); return true; })()`);
  await press('Tab');
  assert(await evaluate(`(() => { const nodes = ${DRAWER_FOCUSABLES}; return nodes.length > 0 && document.activeElement === nodes[0]; })()`), 'drawer Tab wraps to its first control');
  await press('Tab', 8);
  assert(await evaluate(`(() => { const nodes = ${DRAWER_FOCUSABLES}; return nodes.length > 0 && document.activeElement === nodes[nodes.length - 1]; })()`), 'drawer Shift+Tab wraps to its last control');
  await click('[data-action=price-scope-all]');
  const allCountText = fillTemplate(await evaluate('window.__fixture.t("price.modelCount")'), fixtureAllSelection.modelCount) + ' · '
    + fillTemplate(await evaluate('window.__fixture.t("price.pricingRuleCount")'), fixtureAllSelection.ruleCount);
  await until(`document.querySelector('.dss-price-count')?.textContent === ${JSON.stringify(allCountText)}`);
  assert.equal(await evaluate('document.querySelectorAll(".dss-price-model-row").length'), 25, 'all-model page holds 25 groups');
  assert.equal(await evaluate('document.querySelector(".dss-price-pagination span").textContent'), '1 / ' + fixtureAllSelection.pageCount, 'group pagination starts at page one');
  await pricingSearch(flatModel.canonical);
  await until(`[...document.querySelectorAll('.dss-price-model-row')].some(node => node.dataset.modelKey === ${JSON.stringify(flatModel.key)})`);
  const flatRowText = await evaluate(`[...document.querySelectorAll('.dss-price-model-row')].find(node => node.dataset.modelKey === ${JSON.stringify(flatModel.key)}).textContent`);
  const flatSummary = summariesByKey.get(flatModel.key);
  assert(flatRowText.includes((await evaluate('window.__fixture.t("price.quickRates")')).split('%s')[0]), 'flat model shows input/output summary');
  assert(flatRowText.includes(flatModel.provider) && flatRowText.includes(flatSummary.rule.currency), 'flat model keeps provider and currency');
  assert(!flatRowText.includes((await evaluate('window.__fixture.t("price.tieredPrice")')).split('%d')[0]), 'flat model is not promoted to tiered');
  await pricingSearch('');
  await until('document.querySelectorAll(".dss-price-model-row").length === 25');
  await click('[data-action=price-next-page]');
  await until('document.querySelector(".dss-price-pagination span").textContent.startsWith("2 /")');
  assert(await evaluate('document.activeElement && document.activeElement.dataset && document.activeElement.dataset.modelKey === document.querySelector(".dss-price-model-row").dataset.modelKey'), 'pagination focuses the first new row');
  await pricingSearch(flatModel.canonical);
  await until(`[...document.querySelectorAll('.dss-price-model-row')].some(node => node.dataset.modelKey === ${JSON.stringify(flatModel.key)}) && (!document.querySelector('.dss-price-pagination') || document.querySelector('.dss-price-pagination span').textContent.startsWith('1 /'))`);
  await pricingSearch('no-such-model-zzz');
  await until('document.querySelector(".dss-price-empty-state")');
  assert.equal(await evaluate('document.querySelectorAll(".dss-price-model-row").length'), 0, 'empty search mounts no model rows');
  assert(await evaluate('document.querySelector(".dss-price-empty-state").textContent.includes(window.__fixture.t("price.noMatch"))'), 'empty search explains no match');
  assert(await evaluate('!!document.querySelector("[data-action=price-clear-search]")'), 'empty search offers a clear action');
  await click('[data-action=price-clear-search]');
  await until('document.querySelectorAll(".dss-price-model-row").length === 25');
  await pricingSearch(tieredModel.canonical);
  await until(`[...document.querySelectorAll('.dss-price-model-row')].some(node => node.dataset.modelKey === ${JSON.stringify(tieredModel.key)})`);
  const tieredRowText = await evaluate(`[...document.querySelectorAll('.dss-price-model-row')].find(node => node.dataset.modelKey === ${JSON.stringify(tieredModel.key)}).textContent`);
  assert(tieredRowText.includes((await evaluate('window.__fixture.t("price.tieredPrice")')).split('%d')[0]), 'complex model shows tiered summary');
  await openPricingModel(tieredModel.key);
  assert(await evaluate('document.activeElement === document.querySelector(".dss-price-detail-title")'), 'detail focuses its title');
  const tieredSummary = summariesByKey.get(tieredModel.key);
  assert.equal(await evaluate('document.querySelector(".dss-price-detail-title").textContent'), tieredModel.provider + ' / ' + tieredModel.canonical, 'detail shows the complete identity');
  assert.equal(await evaluate('document.querySelectorAll(".dss-price-rule-detail[data-phase=current]").length'), tieredSummary.currentCount, 'detail shows every current rule');
  assert.equal(await evaluate('document.querySelectorAll("[data-action=price-rollback]").length'), 0, 'model detail never exposes catalog rollback');
  const otherCount = tieredModel.rules.length - tieredSummary.currentCount;
  if (otherCount > 0) {
    assert(await evaluate('!!document.querySelector("[data-action=price-other-periods]")'), 'detail exposes other periods');
    await click('[data-action=price-other-periods]');
    await until(`document.querySelectorAll('.dss-price-rule-detail').length === ${tieredModel.rules.length}`);
    const phases = await evaluate('[...document.querySelectorAll(".dss-price-rule-detail")].map(node => node.dataset.phase)');
    assert(phases.every(phase => ['current', 'historical', 'upcoming'].includes(phase)), 'detail labels every phase');
  } else {
    assert(await evaluate('!document.querySelector("[data-action=price-other-periods]")'), 'single-period detail hides the empty other-periods section');
  }
  await layout('pricing-detail'); await assertDrawerSingleScroll('pricing-detail'); await assertTextFloor('pricing-detail');
  await capture('desktop-pricing-detail');
  await backPricingModel(tieredModel.key);
  assert.equal(await evaluate('document.querySelector(".dss-price-search-input").value'), tieredModel.canonical, 'back restores the search');
  await pricingSearch('');
  await until('document.querySelectorAll(".dss-price-model-row").length === 25');
  await click('[data-action=price-scope-all]');
  await until(`document.querySelector('.dss-price-count')?.textContent === ${JSON.stringify(allCountText)}`);
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  const expectedByKey = new Map(fixtureGroups.map(group => [group.key, group]));
  const visited = new Set(), collected = new Set();
  while (true) {
    await layout('narrow-price-page');
    const keys = await evaluate('[...document.querySelectorAll(".dss-price-model-row")].map(node => node.dataset.modelKey)');
    for (const key of keys) {
      const expected = expectedByKey.get(key);
      const summary = summariesByKey.get(key);
      assert(expected && summary, 'model page contains a known group');
      await openPricingModel(key);
      visited.add(key);
      assert.equal(await evaluate('document.querySelector(".dss-price-detail-title").textContent'), expected.provider + ' / ' + expected.canonical, 'detail identity at 320px');
      const currentIds = await evaluate('[...document.querySelectorAll(".dss-price-rule-detail[data-phase=current]")].map(node => node.dataset.ruleId)');
      assert.equal(currentIds.length, summary.currentCount, 'current rule count at 320px');
      for (const id of currentIds) collected.add(id);
      const expectedOther = expected.rules.length - summary.currentCount;
      if (expectedOther > 0) {
        assert(await evaluate('!!document.querySelector("[data-action=price-other-periods]")'), 'other periods are present at 320px');
        await click('[data-action=price-other-periods]');
        await until(`document.querySelectorAll('.dss-price-rule-detail').length === ${expected.rules.length}`);
        const ids = await evaluate('[...document.querySelectorAll(".dss-price-rule-detail")].map(node => node.dataset.ruleId)');
        assert.equal(new Set(ids).size, expected.rules.length, 'other periods add every rule once');
        for (const id of ids) collected.add(id);
      } else {
        assert(await evaluate('!document.querySelector("[data-action=price-other-periods]")'), 'no empty other-periods section at 320px');
      }
      if (visited.size === 1) await assertDrawerSingleScroll('pricing-detail-320');
      await backPricingModel(key);
    }
    if (await evaluate('document.querySelector("[data-action=price-next-page]").disabled')) break;
    const previous = await evaluate('document.querySelector(".dss-price-pagination span").textContent');
    await click('[data-action=price-next-page]');
    await until('document.querySelector(".dss-price-pagination span").textContent !== ' + JSON.stringify(previous));
  }
  assert.equal(visited.size, fixtureGroups.length, 'every model group is reachable');
  assert.equal(collected.size, expectedRuleIds.size, 'every signed catalog rule is reachable exactly once');
  for (const id of expectedRuleIds) assert(collected.has(id), 'catalog rule is reachable: ' + id);
  await pricingSearch('deepseek');
  await until('document.querySelectorAll(".dss-price-model-row").length > 0');
  await layout('narrow-price-page');
  await pricingSearch('');
  await click('[data-action=price-scope-used]');
  await until(`document.querySelectorAll('.dss-price-model-row').length === ${fixtureUsedSelection.rows.length}`);
  for (const width of [320, 390, 641, 700, 768, 1024, 1440]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    await layout('pricing-' + width);
    await assertDrawerSingleScroll('pricing-' + width);
    await assertTextFloor('pricing-' + width);
    const drawerBox = await evaluate(`(() => {
      const drawer = document.querySelector('.dss-drawer').getBoundingClientRect();
      const panelNode = document.querySelector('.dss-panel');
      const panel = panelNode.getBoundingClientRect();
      return { width: drawer.width, right: drawer.right, panelWidth: panelNode.clientWidth, panelRight: panel.right };
    })()`);
    assert.equal(Math.round(drawerBox.width), Math.round(Math.min(560, drawerBox.panelWidth)), 'drawer width at ' + width + 'px');
    assert(Math.abs(drawerBox.right - drawerBox.panelRight) <= 1, 'drawer is flush with the panel right edge at ' + width + 'px');
    if (width === 320 || width === 641) {
      await evaluate('document.querySelector(".dss-body").scrollTop = 0; document.querySelector(".dss-drawer-body").scrollTop = 0');
      await capture('prices-' + width);
    }
    if (width === 1440) {
      await evaluate('document.querySelector(".dss-body").scrollTop = 0; document.querySelector(".dss-drawer-body").scrollTop = 0');
      await capture('desktop-pricing-drawer');
    }
  }
  report.checks.push('pricing models: used/all scope, 25-group pages, search reset and empty state, flat/tiered summaries, complete detail with other periods, all ' + visited.size + ' groups and ' + collected.size + ' rules at 320px, seven widths, 560px drawer and one drawer scroll');
  await navigate('/?stats=partial&lang=en');
  await evaluate('Date.now = () => 1792238400000');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await click('.dss-trigger'); await tab(1); await click('[data-action=pricing]');
  await until('document.querySelectorAll(".dss-price-nav-btn").length === 3');
  await until('document.querySelector(".dss-price-model-row")');
  await layout('pricing-en-320'); await assertTextFloor('pricing-en-320');
  const navText = await evaluate('[...document.querySelectorAll(".dss-price-nav-btn")].map(node => node.textContent)');
  assert.deepEqual(navText, ['Models', 'Custom', 'Updates'], 'English section labels stay short');
  const navFits = () => evaluate('(() => { const nav = document.querySelector(".dss-price-nav"); return nav.scrollWidth <= nav.clientWidth + 1 && [...nav.querySelectorAll("button")].every(node => node.getClientRects().length && node.getBoundingClientRect().right <= nav.getBoundingClientRect().right + 1 && node.scrollWidth <= node.clientWidth + 1); })()');
  assert(await navFits(), 'English sections are all visible at 320px');
  for (const name of ['custom', 'updates', 'models']) {
    await pricingSection(name);
    assert(await navFits(), 'English ' + name + ' active section stays unclipped at 320px');
  }
  await capture('narrow-pricing-nav-en');
  await navigate('/?stats=partial&theme=dark&lang=zh');
  await evaluate('Date.now = () => 1792238400000');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await click('.dss-trigger'); await tab(1); await click('[data-action=pricing]');
  await until('document.querySelector(".dss-price-model-row")');
  await layout('pricing-dark'); await capture('dark-pricing-models');
  report.checks.push('pricing language and theme: English three-section nav fits at 320px; dark model page keeps the same structure');
  await navigate('/?stats=partial&lang=en');
  await evaluate('Date.now = () => 1792238400000');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await click('.dss-trigger'); await tab(1); await click('[data-action=pricing]');
  await until('document.querySelector(".dss-price-model-row")');
  await click('[data-action=price-scope-all]');
  await pricingSection('custom');
  await until('document.querySelector("[data-action=price-add-rule]")');
  await click('[data-action=price-add-rule]');
  await until('document.querySelector(".dss-price-form")');
  for (const [key, value] of [['price.provider', tieredModel.provider], ['price.model', tieredModel.canonical], ['price.uncached', '1'], ['price.output', '2'], ['price.cacheRead', '0']]) {
    assert(await setPricingInput(key, value), 'saved-rule field ' + key);
  }
  await click('[data-action=price-stage-rule]');
  await until('document.querySelector(".dss-price-commit")');
  await pricingSection('models');
  await pricingSearch(tieredModel.canonical);
  await until(`[...document.querySelectorAll('.dss-price-model-row')].some(node => node.dataset.modelKey === ${JSON.stringify(tieredModel.key)})`);
  await openPricingModel(tieredModel.key);
  assert(await evaluate('!document.querySelector("[data-action=price-edit-saved]")'), 'unsaved working rule is not a saved override in detail');
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  await click('[data-action=price-save]');
  await until('!document.querySelector(".dss-price-commit")');
  await until('document.querySelector("[data-action=price-edit-saved]")');
  assert(await evaluate('document.querySelector(".dss-price-saved").textContent.includes(window.__fixture.t("price.savedCustomRules"))'), 'saved rule appears in detail after save');
  await pricingSection('custom');
  await until('document.querySelector("[data-action=price-remove-rule]")');
  await click('[data-action=price-remove-rule]');
  await until('document.querySelector(".dss-price-commit")');
  await pricingSection('models');
  await until('document.querySelector(".dss-price-detail-title")');
  assert(await evaluate('!!document.querySelector("[data-action=price-edit-saved]")'), 'unsaved removal keeps the saved override in detail');
  await click('[data-action=price-discard]');
  await until('!document.querySelector(".dss-price-commit")');
  assert(await evaluate('!!document.querySelector("[data-action=price-edit-saved]")'), 'discard restores the saved override in detail');
  await pricingSection('custom');
  await until('document.querySelector("[data-action=price-remove-rule]")');
  await click('[data-action=price-remove-rule]');
  await until('document.querySelector(".dss-price-commit")');
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  await click('[data-action=price-save]');
  await until('!document.querySelector(".dss-price-commit")');
  await pricingSection('models');
  await until('document.querySelector(".dss-price-detail-title")');
  assert(await evaluate('!document.querySelector("[data-action=price-edit-saved]")'), 'saved removal clears the detail override entry');
  report.checks.push('pricing saved overrides: working add/remove is not shown as saved; save adds, discard restores and saved removal clears the detail entry');

  await navigate('/?stats=partial&lang=en');
  await evaluate('Date.now = () => 1792238400000');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await click('.dss-trigger'); await tab(1); await click('[data-action=pricing]');
  await until('document.querySelector(".dss-price-model-row")');
  await click('[data-action=price-scope-all]');
  assert(provisionalModel, 'a provisional catalog model exists');
  assert(usedModel, 'a used catalog model exists');
  const provisionalRule = provisionalModel.rules.find(row => row.phase === 'current' && typeof row.rule.note === 'string' && row.rule.note.startsWith('[provisional]')).rule;
  const provisionalBody = provisionalRule.note.slice('[provisional]'.length).trim();
  await pricingSearch(provisionalModel.canonical);
  await until(`[...document.querySelectorAll('.dss-price-model-row')].some(node => node.dataset.modelKey === ${JSON.stringify(provisionalModel.key)})`);
  const lightProvisionalTag = await tagStyle(provisionalModel.key, '.dss-price-provisional');
  assert(lightProvisionalTag && lightProvisionalTag.fontSize === '11px', 'light provisional tag uses the xs size');
  assert(lightProvisionalTag.background !== 'rgba(0, 0, 0, 0)' && lightProvisionalTag.color !== lightProvisionalTag.background, 'light provisional tag uses semantic colors');
  await openPricingModel(provisionalModel.key);
  const provisionalDetail = await evaluate(`(() => {
    const rule = [...document.querySelectorAll('.dss-price-rule-detail')].find(node => node.dataset.ruleId === ${JSON.stringify(provisionalRule.id)});
    return rule ? { note: rule.querySelector('.dss-price-note')?.textContent || '', tag: !!rule.querySelector('.dss-price-provisional') } : null;
  })()`);
  assert(provisionalDetail && provisionalDetail.note.includes(provisionalBody), 'provisional note body is visible');
  assert(!provisionalDetail.note.includes('[provisional]'), 'provisional prefix is not shown');
  assert(provisionalDetail.tag, 'provisional review tag stays in detail');
  await capture('desktop-pricing-provisional');
  await backPricingModel(provisionalModel.key);
  await pricingSearch(usedModel.canonical);
  await until(`[...document.querySelectorAll('.dss-price-model-row')].some(node => node.dataset.modelKey === ${JSON.stringify(usedModel.key)})`);
  const lightUsedTag = await tagStyle(usedModel.key, '.dss-price-used-tag');
  assert(lightUsedTag && lightUsedTag.fontSize === '11px', 'light used tag uses the xs size');
  assert(lightUsedTag.background !== 'rgba(0, 0, 0, 0)' && lightUsedTag.color !== lightUsedTag.background, 'light used tag uses semantic colors');
  await navigate('/?stats=partial&theme=dark&lang=en');
  await evaluate('Date.now = () => 1792238400000');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await click('.dss-trigger'); await tab(1); await click('[data-action=pricing]');
  await until('document.querySelector(".dss-price-model-row")');
  await click('[data-action=price-scope-all]');
  await pricingSearch(provisionalModel.canonical);
  await until(`[...document.querySelectorAll('.dss-price-model-row')].some(node => node.dataset.modelKey === ${JSON.stringify(provisionalModel.key)})`);
  const darkProvisionalTag = await tagStyle(provisionalModel.key, '.dss-price-provisional');
  assert(darkProvisionalTag && darkProvisionalTag.fontSize === '11px', 'dark provisional tag uses the xs size');
  await openPricingModel(provisionalModel.key);
  const darkProvisionalDetail = await evaluate(`(() => {
    const rule = [...document.querySelectorAll('.dss-price-rule-detail')].find(node => node.dataset.ruleId === ${JSON.stringify(provisionalRule.id)});
    return rule ? { note: rule.querySelector('.dss-price-note')?.textContent || '', tag: !!rule.querySelector('.dss-price-provisional') } : null;
  })()`);
  assert(darkProvisionalDetail && darkProvisionalDetail.note.includes(provisionalBody), 'provisional note body is visible in dark theme');
  assert(darkProvisionalDetail.tag, 'provisional review tag stays in dark detail');
  await capture('dark-pricing-provisional');
  await backPricingModel(provisionalModel.key);
  await pricingSearch(usedModel.canonical);
  await until(`[...document.querySelectorAll('.dss-price-model-row')].some(node => node.dataset.modelKey === ${JSON.stringify(usedModel.key)})`);
  const darkUsedTag = await tagStyle(usedModel.key, '.dss-price-used-tag');
  assert(darkUsedTag && darkUsedTag.fontSize === '11px', 'dark used tag uses the xs size');
  assert(lightUsedTag.color !== darkUsedTag.color, 'used tag follows the light and dark info tokens');
  assert(lightProvisionalTag.color !== darkProvisionalTag.color, 'provisional tag follows the light and dark warn tokens');
  report.checks.push('pricing labels: used and provisional tags keep 11px semantic styles in light and dark; provisional note body stays visible without the prefix');
  await navigate('/?stats=partial&lang=en');
  await evaluate('Date.now = () => 1792238400000');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await click('.dss-trigger'); await tab(1); await click('[data-action=pricing]');
  await until('document.querySelector(".dss-price-model-row")');
  await pricingSection('custom');
  await until('document.querySelector("[data-action=price-add-rule]")');
  assert(await evaluate('!document.querySelector(".dss-price-form")'), 'custom section opens on the rule list');
  await click('[data-action=price-add-rule]');
  await until('document.querySelector(".dss-price-form")');
  assert(await evaluate('!document.querySelector(".dss-price-commit")'), 'a clean new form does not show the footer');
  for (const [key, value] of [['price.provider', 'fixture-compatible'], ['price.model', 'fixture-unpriced'], ['price.uncached', '1'], ['price.output', '2'], ['price.cacheRead', '0']]) {
    assert(await setPricingInput(key, value), 'custom field ' + key);
  }
  await until('document.querySelector(".dss-price-commit")');
  assert(await evaluate('document.querySelector("[data-action=price-preview]").disabled && document.querySelector("[data-action=price-save]").disabled'), 'editor dirty blocks preview and save');
  assert(await evaluate('!!document.querySelector("[data-action=price-continue-editing]")'), 'editor dirty offers continue editing');
  await layout('pricing-custom'); await assertDrawerSingleScroll('pricing-custom'); await assertTextFloor('pricing-custom');
  await capture('narrow-pricing-custom');
  // Same model focus restores the unfinished form without overwriting it.
  await evaluate('document.querySelector("[data-action=pricing-pending]").click()');
  await delay(150);
  assert.equal(await evaluate(`[...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.uncached')).value`), '1', 'same-model focus keeps the dirty form');
  // A different model is deferred instead of replacing the dirty form.
  await setPricingInput('price.model', 'deepseek-v4-flash');
  await evaluate('document.querySelector("[data-action=pricing-pending]").click()');
  await delay(150);
  assert.equal(await evaluate(`[...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.model')).value`), 'deepseek-v4-flash', 'different-model focus does not replace the dirty form');
  await click('[data-action=price-cancel-editor]');
  await until('document.querySelector("[data-action=price-locate-deferred]")');
  assert(await evaluate('document.querySelector(".dss-price-editor-notice").textContent.includes("fixture-unpriced")'), 'deferred model is kept for the user');
  await click('[data-action=price-locate-deferred]');
  await until('document.querySelector(".dss-price-form")');
  assert.equal(await evaluate(`[...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.model')).value`), 'fixture-unpriced', 'deferred model opens after the dirty form is resolved');
  assert(await evaluate('!document.querySelector(".dss-price-commit")'), 'deferred prefilled form is clean');
  await click('[data-action=price-cancel-editor]');
  await until('document.querySelector("[data-action=price-add-rule]")');
  // Start the real draft rule again.
  await click('[data-action=price-add-rule]');
  await until('document.querySelector(".dss-price-form")');
  for (const [key, value] of [['price.provider', 'fixture-compatible'], ['price.model', 'fixture-unpriced'], ['price.uncached', '1'], ['price.output', '2'], ['price.cacheRead', '0']]) {
    assert(await setPricingInput(key, value), 'draft field ' + key);
  }
  await until('document.querySelector(".dss-price-commit")');
  await pricingSection('models'); await pricingSection('custom');
  await until('document.querySelector(".dss-price-form")');
  assert.equal(await evaluate(`[...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.uncached')).value`), '1', 'section switches keep the editor');
  await click('[data-action=price-back-custom-list]');
  await until('document.querySelector("[data-action=price-add-rule]")');
  assert(await evaluate('!!document.querySelector(".dss-price-editor-notice") && !!document.querySelector("[data-action=price-continue-editing]")'), 'back to list keeps the dirty editor notice');
  await click('[data-action=price-add-rule]');
  assert(await evaluate('!document.querySelector(".dss-price-form")'), 'a dirty editor blocks starting another rule');
  await click('[data-action=price-continue-editing]');
  await until('document.querySelector(".dss-price-form")');
  assert.equal(await evaluate(`[...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.uncached')).value`), '1', 'continue editing restores the fields');
  await click('[data-action=price-stage-rule]');
  await until('document.querySelector(".dss-price-custom-row")');
  assert(await evaluate('!!document.querySelector(".dss-price-unsaved")'), 'staged rule is marked unsaved');
  assert(await evaluate('!document.querySelector(".dss-price-form")'), 'staging returns to the rule list');
  assert(await evaluate('document.activeElement.getAttribute("data-action") === "price-add-rule"'), 'staging focuses the add entry');
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  const previewCall = await pricingPayload('preview');
  assert(previewCall && previewCall.action === 'preview', 'preview request reaches the host');
  assert(!('autoUpdate' in previewCall) && !('fingerprint' in previewCall) && !('revision' in previewCall), 'preview request has no save-only fields');
  const previewRules = JSON.parse(previewCall.overridesJson);
  assert(previewRules.length === 1 && previewRules[0].providerId === 'fixture-compatible' && previewRules[0].canonical === 'fixture-unpriced', 'preview request carries the working rule');
  await capture('narrow-pricing-preview');
  await pricingSection('models');
  assert(await evaluate('!!document.querySelector(".dss-price-preview")'), 'section switch keeps the preview');
  await pricingSearch(usedModel.canonical);
  assert(await evaluate('!!document.querySelector(".dss-price-preview")'), 'search keeps the preview');
  await openPricingModel(usedModel.key);
  assert(await evaluate('!!document.querySelector(".dss-price-preview")'), 'model detail keeps the preview');
  await backPricingModel(usedModel.key);
  assert(await evaluate('!!document.querySelector(".dss-price-preview")'), 'returning to the list keeps the preview');
  await pricingSearch('');
  await click('[data-action=price-scope-all]');
  await until('document.querySelectorAll(".dss-price-model-row").length === 25');
  await click('[data-action=price-next-page]');
  await until('document.querySelector(".dss-price-pagination span").textContent.startsWith("2 /")');
  assert(await evaluate('!!document.querySelector(".dss-price-preview")'), 'pagination keeps the preview');
  await until('document.querySelector("[data-action=price-refresh]")');
  assert(await evaluate('document.querySelector("[data-action=price-refresh]").disabled'), 'dirty settings disable the model-page check updates');
  await pricingSection('updates');
  await until('document.querySelector("[data-action=price-refresh]")');
  assert(await evaluate('document.querySelector("[data-action=price-refresh]").disabled'), 'dirty settings disable check updates');
  assert(await evaluate('document.querySelector("[data-action=price-refresh]").title === window.__fixture.t("price.saveFirst")'), 'disabled check updates explains why');
  assert(await evaluate('!document.querySelector("[data-action=price-rollback]") || document.querySelector("[data-action=price-rollback]").disabled'), 'dirty settings disable version restore');
  await click('[data-action=price-auto]');
  await until('!document.querySelector(".dss-price-preview")');
  await click('[data-action=price-auto]');
  await until('document.querySelector(".dss-price-commit")');
  await pricingSection('custom');
  assert(await evaluate('!document.querySelector(".dss-price-preview")'), 'auto-update change invalidates the preview');
  await click('[data-action=price-edit-rule]');
  await until('document.querySelector(".dss-price-form")');
  assert.equal(await evaluate(`[...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.output')).value`), '2', 'editing restores the staged rule');
  await setPricingInput('price.output', '3');
  assert(await evaluate('!document.querySelector(".dss-price-preview") && document.querySelector("[data-action=price-save]").disabled'), 'field changes clear the preview and block save');
  await click('[data-action=price-cancel-editor]');
  await until('document.querySelector("[data-action=price-add-rule]")');
  assert(await evaluate('!!document.querySelector(".dss-price-custom-row")'), 'cancel editing keeps other staged rules');
  await click('[data-action=price-remove-rule]');
  await until('!document.querySelector(".dss-price-custom-row")');
  assert(await evaluate('!document.querySelector(".dss-price-commit")'), 'removing the only unsaved rule clears the footer');
  assert(await evaluate('!document.querySelector(".dss-price-pending-remove")'), 'unsaved rule removal is not a pending saved removal');

  // Conditions, saved rule, discard-all and pending removal.
  await click('[data-action=price-add-rule]');
  await until('document.querySelector(".dss-price-form")');
  for (const [key, value] of [['price.provider', 'deepseek'], ['price.model', 'deepseek-v4-flash'], ['price.uncached', '1'], ['price.output', '2'], ['price.cacheRead', '0']]) {
    assert(await setPricingInput(key, value), 'conditions field ' + key);
  }
  await click('[data-action=price-toggle-conditions]');
  await until('document.querySelector(".dss-price-form details").open');
  await setPricingInput('price.threshold', '128000');
  const longUncached = await evaluate('window.__fixture.t("price.long") + " " + window.__fixture.t("price.uncached")');
  const longOutput = await evaluate('window.__fixture.t("price.long") + " " + window.__fixture.t("price.output")');
  assert(await setPricingLabel(longUncached, '2'), 'long uncached rate');
  assert(await setPricingLabel(longOutput, '4'), 'long output rate');
  assert(await setPricingLabel(await evaluate('"priority " + window.__fixture.t("price.multiplier")'), '2'), 'priority multiplier');
  assert(await setPricingSelect(await evaluate('window.__fixture.t("price.accountType")'), 'relay'), 'account type');
  await click('[data-action=price-stage-rule]');
  await until('document.querySelector(".dss-price-custom-row")');
  const conditionsRow = await evaluate('document.querySelector(".dss-price-custom-row").textContent');
  assert(conditionsRow.includes('128k') && conditionsRow.includes('priority ×2') && conditionsRow.includes('relay'), 'rule list summarizes conditions');
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  await click('[data-action=price-save]');
  await until('!document.querySelector(".dss-price-commit")');
  const saveCall = await pricingPayload('save');
  assert(saveCall && saveCall.action === 'save', 'save request reaches the host');
  assert(saveCall.autoUpdate === true, 'save request carries the auto-update draft');
  assert(typeof saveCall.fingerprint === 'string' && saveCall.fingerprint.length > 0, 'save request carries the preview fingerprint');
  assert(Number.isSafeInteger(saveCall.revision), 'save request carries the baseline revision');
  const savedRules = JSON.parse(saveCall.overridesJson);
  assert(savedRules.length === 1 && savedRules[0].providerId === 'deepseek' && savedRules[0].canonical === 'deepseek-v4-flash', 'save request carries the working overrides');
  const savedConditions = savedRules[0];
  assert(savedConditions.contextThreshold === 128000, 'context threshold saved');
  assert(savedConditions.contextTiers.short.uncached === 1 && savedConditions.contextTiers.long.uncached === 2 && savedConditions.contextTiers.long.output === 4, 'long context rates saved');
  assert(savedConditions.tierMultipliers.priority === 2 && savedConditions.accountType === 'relay', 'tier multiplier and account type saved');
  assert(await evaluate('!document.querySelector(".dss-price-unsaved")'), 'saved rule is no longer marked unsaved');
  await click('[data-action=price-edit-rule]');
  await until('document.querySelector(".dss-price-form")');
  assert(await evaluate('document.querySelector(".dss-price-form details").open'), 'conditions auto-open when editing a conditional rule');
  assert(await evaluate('!!document.querySelector(".dss-price-conditions-set")'), 'conditions-set label is visible');
  assert.equal(await evaluate(`[...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.threshold')).value`), '128000', 'threshold restored');
  assert.equal(await evaluate(`[...document.querySelectorAll('.dss-pricing select')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.accountType')).value`), 'relay', 'account type restored');
  await click('[data-action=price-cancel-editor]');
  await until('document.querySelector("[data-action=price-add-rule]")');
  // Discard all restores the saved rule and the saved auto-update value.
  await click('[data-action=price-add-rule]');
  await until('document.querySelector(".dss-price-form")');
  for (const [key, value] of [['price.provider', 'fixture-compatible'], ['price.model', 'fixture-unpriced'], ['price.uncached', '1'], ['price.output', '2']]) {
    assert(await setPricingInput(key, value), 'discard field ' + key);
  }
  await click('[data-action=price-stage-rule]');
  await until('document.querySelector(".dss-price-commit")');
  await pricingSection('updates');
  await click('[data-action=price-auto]');
  await until('document.querySelector(".dss-price-commit")');
  await click('[data-action=price-discard]');
  await until('!document.querySelector(".dss-price-commit")');
  await pricingSection('custom');
  await until('document.querySelector("[data-action=price-add-rule]")');
  assert.equal(await evaluate('document.querySelectorAll(".dss-price-custom-row").length'), 1, 'discard keeps the saved rule');
  assert(await evaluate('!document.querySelector(".dss-price-unsaved") && !document.querySelector(".dss-price-pending-remove")'), 'discard keeps saved state clean');
  await pricingSection('updates');
  assert(await evaluate('document.querySelector("[data-action=price-auto]").checked'), 'discard restores the saved auto-update value');
  await pricingSection('custom');
  await click('[data-action=price-remove-rule]');
  await until('document.querySelector(".dss-price-pending-remove")');
  assert(await evaluate('!!document.querySelector("[data-action=price-undo-remove]")'), 'pending removal exposes undo');
  assert(await evaluate('document.querySelector("[data-action=price-save]").disabled && !document.querySelector("[data-action=price-preview]").disabled'), 'pending removal requires a fresh preview');
  await capture('narrow-pricing-pending-remove');
  await click('[data-action=price-undo-remove]');
  await until('!document.querySelector(".dss-price-pending-remove")');
  assert(await evaluate('!document.querySelector(".dss-price-commit")'), 'undoing removal restores the saved state');
  await click('[data-action=price-remove-rule]');
  await until('document.querySelector(".dss-price-pending-remove")');
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  await click('[data-action=price-save]');
  await until('!document.querySelector(".dss-price-custom-row")');
  assert(await evaluate('!document.querySelector(".dss-price-commit")'), 'saved removal clears the footer');
  report.checks.push('pricing custom: list/editor, conditions, dirty form protection, preview invalidation, payload, save/discard, pending removal and undo');
  // Saved rule association survives repeated edits and pending removal.
  await navigate('/?stats=partial&lang=en');
  await evaluate('Date.now = () => 1792238400000');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await click('.dss-trigger'); await tab(1); await click('[data-action=pricing]');
  await until('document.querySelector(".dss-price-model-row")');
  await pricingSection('custom');
  await click('[data-action=price-add-rule]');
  await until('document.querySelector(".dss-price-form")');
  for (const [key, value] of [['price.provider', 'deepseek'], ['price.model', 'deepseek-v4-flash'], ['price.uncached', '1'], ['price.output', '2'], ['price.cacheRead', '0']]) {
    assert(await setPricingInput(key, value), 'association field ' + key);
  }
  await click('[data-action=price-stage-rule]');
  await until('document.querySelector(".dss-price-commit")');
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  await click('[data-action=price-save]');
  await until('!document.querySelector(".dss-price-commit")');
  await click('[data-action=price-edit-rule]');
  await until('document.querySelector(".dss-price-form")');
  assert.equal(await evaluate(`[...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.output')).value`), '2', 'saved rule opens its saved value');
  await setPricingInput('price.output', '3');
  await click('[data-action=price-stage-rule]');
  await until('document.querySelector(".dss-price-custom-row")');
  assert.equal(await evaluate('document.querySelectorAll(".dss-price-custom-row").length'), 1, 'first edit leaves one working rule');
  const firstWorking = await evaluate('({ id: document.querySelector(".dss-price-custom-row").dataset.ruleId, savedId: document.querySelector(".dss-price-custom-row").dataset.savedId })');
  assert(firstWorking.savedId, 'working edit keeps its saved association');
  await pricingSection('models');
  await pricingSearch('deepseek-v4-flash');
  await until(`[...document.querySelectorAll('.dss-price-model-row')].some(node => node.dataset.modelKey === ${JSON.stringify(tieredModel.key)})`);
  await openPricingModel(tieredModel.key);
  await until('document.querySelector("[data-action=price-edit-saved]")');
  await click('[data-action=price-edit-saved]');
  await until('document.querySelector(".dss-price-form")');
  assert.equal(await evaluate(`[...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.output')).value`), '3', 'detail edit loads the current working value');
  await setPricingInput('price.output', '4');
  await click('[data-action=price-stage-rule]');
  await until('document.querySelector(".dss-price-custom-row")');
  assert.equal(await evaluate('document.querySelectorAll(".dss-price-custom-row").length'), 1, 'second edit still leaves one working rule');
  const secondWorking = await evaluate('({ id: document.querySelector(".dss-price-custom-row").dataset.ruleId, savedId: document.querySelector(".dss-price-custom-row").dataset.savedId })');
  assert.equal(secondWorking.savedId, firstWorking.savedId, 'repeated edits keep the same saved association');
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  const associationPreview = await pricingPayload('preview');
  const associationRules = JSON.parse(associationPreview.overridesJson);
  assert(associationRules.length === 1 && associationRules[0].rates.output === 4, 'repeated edits preview exactly one working rule');
  await click('[data-action=price-save]');
  await until('!document.querySelector(".dss-price-commit")');
  await click('[data-action=price-edit-rule]');
  await until('document.querySelector(".dss-price-form")');
  assert.equal(await evaluate(`[...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.output')).value`), '4', 'save keeps the latest value');
  await click('[data-action=price-cancel-editor]');
  await until('document.querySelector("[data-action=price-add-rule]")');
  // Discard resets the association to the saved value.
  await click('[data-action=price-edit-rule]');
  await until('document.querySelector(".dss-price-form")');
  await setPricingInput('price.output', '5');
  await click('[data-action=price-stage-rule]');
  await until('document.querySelector(".dss-price-commit")');
  await click('[data-action=price-discard]');
  await until('!document.querySelector(".dss-price-commit")');
  await click('[data-action=price-edit-rule]');
  await until('document.querySelector(".dss-price-form")');
  assert.equal(await evaluate(`[...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.output')).value`), '4', 'discard resets the association');
  await click('[data-action=price-cancel-editor]');
  await until('document.querySelector("[data-action=price-add-rule]")');
  // Reopening resets the association from the host snapshot.
  await press('Escape'); await until('!document.querySelector(".dss-drawer")');
  await click('.dss-trigger'); await tab(1); await click('[data-action=pricing]');
  await until('document.querySelector(".dss-price-model-row")');
  await pricingSection('custom');
  await until('document.querySelector("[data-action=price-edit-rule]")');
  await click('[data-action=price-edit-rule]');
  await until('document.querySelector(".dss-price-form")');
  assert.equal(await evaluate(`[...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.output')).value`), '4', 'reopening resets the association');
  await click('[data-action=price-cancel-editor]');
  await until('document.querySelector("[data-action=price-add-rule]")');
  // An edited saved rule can be removed and undone with its edited value.
  await click('[data-action=price-edit-rule]');
  await until('document.querySelector(".dss-price-form")');
  await setPricingInput('price.output', '6');
  await click('[data-action=price-stage-rule]');
  await until('document.querySelector(".dss-price-custom-row")');
  assert(await evaluate('!document.querySelector(".dss-price-pending-remove")'), 'editing alone does not mark a pending removal');
  await click('[data-action=price-remove-rule]');
  await until('document.querySelector(".dss-price-pending-remove")');
  await click('[data-action=price-undo-remove]');
  await until('!document.querySelector(".dss-price-pending-remove")');
  await click('[data-action=price-edit-rule]');
  await until('document.querySelector(".dss-price-form")');
  assert.equal(await evaluate(`[...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.output')).value`), '6', 'undo restores the edited working value');
  await click('[data-action=price-cancel-editor]');
  await until('document.querySelector("[data-action=price-add-rule]")');
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  const undoPreview = await pricingPayload('preview');
  const undoRules = JSON.parse(undoPreview.overridesJson);
  assert(undoRules.length === 1 && undoRules[0].rates.output === 6, 'undo restores one working rule in preview payload');
  await click('[data-action=price-save]');
  await until('!document.querySelector(".dss-price-commit")');
  await click('[data-action=price-remove-rule]');
  await until('document.querySelector(".dss-price-pending-remove")');
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  await click('[data-action=price-save]');
  await until('!document.querySelector(".dss-price-custom-row")');
  report.checks.push('pricing association: repeated edits keep one working rule and saved link; pending removal undo restores the edited values and payload');

  // Continue editing from models or updates always returns to the custom editor.
  await navigate('/?stats=partial&lang=en');
  await evaluate('Date.now = () => 1792238400000');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await click('.dss-trigger'); await tab(1); await click('[data-action=pricing]');
  await until('document.querySelector(".dss-price-model-row")');
  await pricingSection('custom');
  await click('[data-action=price-add-rule]');
  await until('document.querySelector(".dss-price-form")');
  for (const [key, value] of [['price.provider', 'fixture-compatible'], ['price.model', 'fixture-unpriced'], ['price.uncached', '1'], ['price.output', '2']]) {
    assert(await setPricingInput(key, value), 'continue field ' + key);
  }
  await click('[data-action=price-toggle-conditions]');
  await until('document.querySelector(".dss-price-form details").open');
  await setPricingInput('price.threshold', '128000');
  await setPricingLabel(await evaluate('"priority " + window.__fixture.t("price.multiplier")'), '2');
  await pricingSection('models');
  await until('document.querySelector("[data-action=price-continue-editing]")');
  await click('[data-action=price-continue-editing]');
  await until('document.querySelector(".dss-price-form")');
  assert(await evaluate('document.querySelector("[data-action=price-section-custom]").getAttribute("aria-pressed") === "true"'), 'model continue editing enters custom');
  assert.equal(await evaluate(`[...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.threshold')).value`), '128000', 'model continue keeps fields');
  assert(await evaluate('document.querySelector(".dss-price-form details").open'), 'model continue keeps conditions open');
  assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), await evaluate('window.__fixture.t("price.provider")'), 'model continue focuses the first input');
  await pricingSection('updates');
  await until('document.querySelector("[data-action=price-continue-editing]")');
  await click('[data-action=price-continue-editing]');
  await until('document.querySelector(".dss-price-form")');
  assert(await evaluate('document.querySelector("[data-action=price-section-custom]").getAttribute("aria-pressed") === "true"'), 'updates continue editing enters custom');
  assert.equal(await evaluate(`[...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.threshold')).value`), '128000', 'updates continue keeps fields');
  assert(await evaluate('document.querySelector(".dss-price-form details").open'), 'updates continue keeps conditions open');
  assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), await evaluate('window.__fixture.t("price.provider")'), 'updates continue focuses the first input');
  await click('[data-action=price-cancel-editor]');
  await until('document.querySelector("[data-action=price-add-rule]")');
  assert(await evaluate('!document.querySelector(".dss-price-commit")'), 'canceling the continued editor clears the footer');
  report.checks.push('pricing continue editing: models and updates both return to the custom editor with fields, conditions and focus preserved');
  // A delayed preview response must not revive a draft changed during the request.
  await navigate('/?stats=partial&lang=en');
  await evaluate('Date.now = () => 1792238400000');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await click('.dss-trigger'); await tab(1); await click('[data-action=pricing]');
  await until('document.querySelector(".dss-price-model-row")');
  await pricingSection('custom');
  await click('[data-action=price-add-rule]');
  await until('document.querySelector(".dss-price-form")');
  for (const [key, value] of [['price.provider', 'deepseek'], ['price.model', 'deepseek-v4-flash'], ['price.uncached', '1'], ['price.output', '2']]) {
    assert(await setPricingInput(key, value), 'race saved field ' + key);
  }
  await click('[data-action=price-stage-rule]');
  await until('document.querySelector(".dss-price-commit")');
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  await click('[data-action=price-save]');
  await until('!document.querySelector(".dss-price-commit")');
  await click('[data-action=price-edit-rule]');
  await until('document.querySelector(".dss-price-form")');
  await setPricingInput('price.output', '3');
  await click('[data-action=price-stage-rule]');
  await until('document.querySelector(".dss-price-custom-row")');
  await click('[data-action=price-remove-rule]');
  await until('document.querySelector(".dss-price-pending-remove")');
  await click('[data-action=price-add-rule]');
  await until('document.querySelector(".dss-price-form")');
  for (const [key, value] of [['price.provider', 'fixture-compatible'], ['price.model', 'fixture-unpriced'], ['price.uncached', '1'], ['price.output', '2']]) {
    assert(await setPricingInput(key, value), 'race new field ' + key);
  }
  await click('[data-action=price-stage-rule]');
  await until('document.querySelectorAll(".dss-price-custom-row").length === 2');
  await pricingSection('models');
  await pricingSearch('deepseek-v4-flash');
  await until(`[...document.querySelectorAll('.dss-price-model-row')].some(node => node.dataset.modelKey === ${JSON.stringify(tieredModel.key)})`);
  await openPricingModel(tieredModel.key);
  await until('document.querySelector("[data-action=price-edit-saved]")');
  await evaluate('window.__fixture.holdPricing = "preview"');
  assert(await evaluate(`(() => {
    const preview = document.querySelector('[data-action=price-preview]');
    const edit = document.querySelector('[data-action=price-edit-saved]');
    if (!preview || !edit) return false;
    preview.click();
    edit.click();
    return true;
  })()`), 'preview and detail edit are both available for the race');
  await until('window.__fixture.calls.some(row => row[0] === "pricing" && row[1] === "preview")');
  await delay(100);
  assert(await evaluate('document.querySelector("[data-action=price-edit-saved]").disabled'), 'detail edit is disabled while preview is in flight');
  await pricingSection('custom');
  await until('document.querySelector(".dss-price-pending-remove")');
  assert(await evaluate('!document.querySelector(".dss-price-form")'), 'detail edit cannot restore a pending removal during preview');
  assert.equal(await evaluate('document.querySelectorAll(".dss-price-custom-row").length'), 2, 'pending removal and new working rule remain');
  await evaluate('window.__fixture.releasePricing && window.__fixture.releasePricing()');
  await evaluate('window.__fixture.holdPricing = null');
  await until('document.querySelector(".dss-price-preview")');
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  const racePreview = await pricingPayload('preview');
  await click('[data-action=price-save]');
  await until('!document.querySelector(".dss-price-commit")');
  const raceSave = await pricingPayload('save');
  assert.equal(raceSave.overridesJson, racePreview.overridesJson, 're-preview and save carry the same rule set');
  const raceRules = JSON.parse(raceSave.overridesJson);
  assert(raceRules.length === 1 && raceRules[0].providerId === 'fixture-compatible' && raceRules[0].canonical === 'fixture-unpriced', 'stale response cannot add the restored saved rule');
  assert(!raceRules.some(rule => rule.providerId === 'deepseek' && rule.canonical === 'deepseek-v4-flash'), 'saved A is not revived into the save payload');
  await click('[data-action=price-remove-rule]');
  await until('document.querySelector(".dss-price-pending-remove")');
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  await click('[data-action=price-save]');
  await until('!document.querySelector(".dss-price-custom-row")');
  report.checks.push('pricing preview race: in-flight preview blocks draft entries, stale response cannot revive a removed rule, and re-preview matches save');

  // Conflict and preview failure keep the drafts.
  await navigate('/?stats=partial&lang=en');
  await evaluate('Date.now = () => 1792238400000');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await click('.dss-trigger'); await tab(1); await click('[data-action=pricing]');
  await until('document.querySelector(".dss-price-model-row")');
  await pricingSection('custom');
  await click('[data-action=price-add-rule]');
  await until('document.querySelector(".dss-price-form")');
  for (const [key, value] of [['price.provider', 'fixture-compatible'], ['price.model', 'fixture-unpriced'], ['price.uncached', '1'], ['price.output', '2']]) {
    assert(await setPricingInput(key, value), 'conflict field ' + key);
  }
  await click('[data-action=price-stage-rule]');
  await until('document.querySelector(".dss-price-commit")');
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  await evaluate('window.__fixture.pricingConflict = true');
  await click('[data-action=price-save]');
  await until(`document.querySelector(".dss-pricing [role=alert]")?.textContent.includes(${JSON.stringify(await evaluate('window.__fixture.t("price.conflict")'))})`);
  assert(await evaluate('!document.querySelector(".dss-price-preview") && document.querySelector("[data-action=price-save]").disabled'), 'conflict clears the preview and blocks retry');
  assert(await evaluate('!!document.querySelector(".dss-price-custom-row")'), 'conflict keeps the working rule');
  await capture('narrow-pricing-conflict');
  await evaluate('window.__fixture.pricingConflict = false');
  await evaluate('window.__fixture.pricingFailAction = "preview"');
  await click('[data-action=price-preview]');
  await until(`document.querySelector(".dss-pricing [role=alert]")?.textContent.includes(${JSON.stringify(await evaluate('window.__fixture.t("price.failed")'))})`);
  assert(await evaluate('!document.querySelector(".dss-price-preview") && !!document.querySelector(".dss-price-custom-row")'), 'preview failure keeps the working rule and clears the preview');
  await evaluate('window.__fixture.pricingFailAction = null');
  await click('[data-action=price-discard]');
  await until('!document.querySelector(".dss-price-commit")');
  assert(await evaluate('!document.querySelector(".dss-price-custom-row")'), 'discard after failure clears the working rule');
  report.checks.push('pricing errors: conflict and preview failure keep drafts, clear preview and block stale save');

  // Closing during a save does not write the unmounted page or reopen the drawer.
  await navigate('/?stats=partial&lang=en');
  await evaluate('Date.now = () => 1792238400000');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await click('.dss-trigger'); await tab(1); await click('[data-action=pricing]');
  await until('document.querySelector(".dss-price-model-row")');
  await pricingSection('custom');
  await click('[data-action=price-add-rule]');
  await until('document.querySelector(".dss-price-form")');
  for (const [key, value] of [['price.provider', 'fixture-compatible'], ['price.model', 'fixture-unpriced'], ['price.uncached', '1'], ['price.output', '2']]) {
    assert(await setPricingInput(key, value), 'close-during-save field ' + key);
  }
  await click('[data-action=price-stage-rule]');
  await until('document.querySelector(".dss-price-commit")');
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  const aggregatesBefore = await evaluate('window.__fixture.calls.filter(row => row[0] === "aggregate").length');
  await evaluate('window.__fixture.holdPricing = "save"');
  await click('[data-action=price-save]');
  await until('window.__fixture.calls.some(row => row[0] === "pricing" && row[1] === "save")');
  await press('Escape');
  await until('!document.querySelector(".dss-drawer")');
  await evaluate('window.__fixture.releasePricing && window.__fixture.releasePricing()');
  await evaluate('window.__fixture.holdPricing = null');
  await until(`window.__fixture.calls.filter(row => row[0] === "aggregate").length > ${aggregatesBefore}`);
  assert(await evaluate('!document.querySelector(".dss-drawer")'), 'closing during save does not reopen the drawer');
  await click('.dss-trigger'); await tab(1); await click('[data-action=pricing]');
  await until('document.querySelector(".dss-price-model-row")');
  await pricingSection('custom');
  await until('document.querySelector(".dss-price-custom-row")');
  assert(await evaluate('!document.querySelector(".dss-price-unsaved")'), 'completed save is visible after reopening');
  await click('[data-action=price-remove-rule]');
  await until('document.querySelector(".dss-price-commit")');
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  await click('[data-action=price-save]');
  await until('!document.querySelector(".dss-price-custom-row")');
  report.checks.push('pricing lifecycle: save after drawer close still refreshes the parent and never reopens the drawer');

  // A pending-model focus that arrives before status is cached and applied after load.
  await navigate('/?stats=partial&lang=en');
  await evaluate('Date.now = () => 1792238400000');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await evaluate('window.__fixture.holdPricing = "status"');
  await click('.dss-trigger'); await tab(1); await click('[data-action=pricing]');
  await until('window.__fixture.calls.some(row => row[0] === "pricing" && row[1] === "status")');
  await evaluate('document.querySelector("[data-action=pricing-pending]").click()');
  await delay(100);
  await evaluate('window.__fixture.releasePricing && window.__fixture.releasePricing()');
  await evaluate('window.__fixture.holdPricing = null');
  await until(`(() => { const input = [...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.model')); return input && input.value === 'fixture-unpriced'; })()`);
  assert(await evaluate('!document.querySelector(".dss-price-commit")'), 'delayed pending focus opens a clean prefilled editor');
  assert(await evaluate('document.querySelector("[data-action=price-section-custom]").getAttribute("aria-pressed") === "true"'), 'delayed pending focus switches to the custom section');
  await click('[data-action=price-cancel-editor]');
  await press('Escape'); await until('!document.querySelector(".dss-drawer")');
  report.checks.push('pricing focus: pending model received before status is cached and prefilled after load');

  // Overall acceptance: long identities/forms and short windows.
  await navigate('/?stats=partial&lang=en');
  await evaluate('Date.now = () => 1792238400000');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await click('.dss-trigger'); await tab(1); await click('[data-action=pricing]');
  await until('document.querySelector(".dss-price-model-row")');
  await click('[data-action=price-scope-all]');
  await pricingSearch(longModel.canonical);
  await until(`[...document.querySelectorAll('.dss-price-model-row')].some(node => node.dataset.modelKey === ${JSON.stringify(longModel.key)})`);
  await openPricingModel(longModel.key);
  assert.equal(await evaluate('document.querySelector(".dss-price-detail-title").textContent'), longModel.provider + ' / ' + longModel.canonical, 'long model identity is complete');
  await layout('pricing-long-detail'); await assertDrawerSingleScroll('pricing-long-detail');
  await capture('narrow-pricing-long-detail');
  await backPricingModel(longModel.key);
  await pricingSection('custom');
  await click('[data-action=price-add-rule]');
  await until('document.querySelector(".dss-price-form")');
  const longProvider = 'fixture-compatible-provider-' + 'x'.repeat(50);
  const longCanonical = 'fixture-model-' + 'y'.repeat(60);
  assert(await setPricingInput('price.provider', longProvider), 'long provider field');
  assert(await setPricingInput('price.model', longCanonical), 'long model field');
  assert(await setPricingInput('price.uncached', '1'), 'long form rate');
  assert(await setPricingInput('price.output', '2'), 'long form output');
  await until('document.querySelector(".dss-price-commit")');
  await layout('pricing-long-form'); await assertDrawerSingleScroll('pricing-long-form');
  await capture('narrow-pricing-long-form');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 420, deviceScaleFactor: 1, mobile: true });
  await layout('pricing-short-window'); await assertDrawerSingleScroll('pricing-short-window');
  const shortFooter = await evaluate('(() => { const box = document.querySelector(".dss-price-commit").getBoundingClientRect(); return { top: box.top, bottom: box.bottom, viewport: innerHeight }; })()');
  assert(shortFooter.top < shortFooter.viewport && shortFooter.bottom <= shortFooter.viewport + 1, 'short window keeps the footer inside the viewport');
  await capture('narrow-pricing-short-window');
  await click('[data-action=price-cancel-editor]');
  await until('document.querySelector("[data-action=price-add-rule]")');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await press('Escape'); await until('!document.querySelector(".dss-drawer")');
  report.checks.push('pricing acceptance: long model/form content, short-window footer and single drawer scroll');
  // Updates, catalog snapshots, pinning and manual checks.
  await navigate('/?stats=partial&lang=en');
  await evaluate('Date.now = () => 1792238400000');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const pricingHistoryAction = action => evaluate(`fetch('/pricing-history', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: ${JSON.stringify(action)} }) }).then(response => response.ok)`);
  const openPricingUpdates = async () => {
    if (!(await evaluate('!!document.querySelector(".dss-panel")'))) await click('.dss-trigger');
    await tab(1); await click('[data-action=pricing]');
    await until('document.querySelector(".dss-price-model-row")');
    await pricingSection('updates');
    await until('document.querySelector("[data-action=price-auto]")');
  };
  const snapshotVersions = () => evaluate('[...document.querySelectorAll("[data-snapshot-index]")].map(node => Number(node.dataset.version))');
  const refreshCallCount = () => evaluate('window.__fixture.calls.filter(row => row[0] === "pricing" && row[1] === "refresh").length');
  await openPricingUpdates();
  assert.equal(await evaluate('document.querySelector(".dss-price-updates-current strong").textContent'), String(signedCatalog.version), 'current summary uses the host version');
  assert(await evaluate('document.querySelector(".dss-price-updates-current").textContent.includes(window.__fixture.t("price.publishedAt"))'), 'current summary shows publishedAt label');
  assert(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(await evaluate('document.querySelector(".dss-price-updates-current").textContent')), 'current summary shows a real publishedAt timestamp');
  assert(await evaluate('document.querySelector(".dss-price-sync-times").textContent.includes(window.__fixture.t("price.neverChecked"))'), 'lastCheckAt has an accurate empty state');
  assert(await evaluate('document.querySelector(".dss-price-sync-times").textContent.includes(window.__fixture.t("price.lastSuccess"))'), 'lastSuccessAt is shown separately');
  assert(await evaluate('document.querySelector(".dss-price-pinned").textContent.includes(window.__fixture.t("price.notPinned"))'), 'unpinned state is explicit');
  let versions = await snapshotVersions();
  assert.equal(versions.length, 5, 'snapshots start with five entries');
  assert.deepEqual(versions, [...versions].sort((a, b) => b - a), 'snapshots are numerically descending');
  assert.equal(new Set(versions).size, versions.length, 'snapshots are deduplicated');
  assert(!versions.includes(signedCatalog.version), 'current version is not in the recoverable list');
  assert(versions.every(version => Number.isSafeInteger(version) && version > 0), 'invalid versions are filtered');
  const snapshotText = await evaluate('[...document.querySelectorAll("[data-snapshot-index]")].map(node => node.textContent).join(" ")');
  assert(!/\d{4}-\d{2}-\d{2}/.test(snapshotText), 'snapshots do not invent dates');
  assert(await evaluate('!!document.querySelector("[data-action=price-snapshots-more]")'), 'more snapshots are available');
  await layout('pricing-updates'); await assertDrawerSingleScroll('pricing-updates'); await capture('desktop-pricing-updates');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await layout('narrow-pricing-updates'); await capture('narrow-pricing-updates');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const pricingCallsBeforeMore = await evaluate('window.__fixture.calls.filter(row => row[0] === "pricing").length');
  await click('[data-action=price-snapshots-more]');
  await until('document.querySelectorAll("[data-snapshot-index]").length === 7');
  assert.equal(await evaluate('window.__fixture.calls.filter(row => row[0] === "pricing").length'), pricingCallsBeforeMore, 'show more is frontend-only');
  assert(await evaluate('!document.querySelector("[data-action=price-snapshots-more]")'), 'show more hides when exhausted');
  assert(await evaluate('document.activeElement.dataset.snapshotIndex === "5"'), 'show more focuses the first new snapshot');
  assert.deepEqual(await snapshotVersions(), [...await snapshotVersions()].sort((a, b) => b - a), 'expanded snapshots remain sorted');
  await pricingHistoryAction('clear');
  await press('Escape'); await until('!document.querySelector(".dss-drawer")');
  await openPricingUpdates();
  assert.equal(await evaluate('document.querySelectorAll("[data-snapshot-index]").length'), 0, 'empty history has no snapshot rows');
  assert(await evaluate('document.querySelector(".dss-price-history-section").textContent.includes(window.__fixture.t("price.noSnapshots"))'), 'empty history has an explicit state');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await layout('pricing-updates-empty'); await capture('narrow-pricing-updates-empty');
  await pricingHistoryAction('restore');
  await press('Escape'); await until('!document.querySelector(".dss-drawer")');
  await openPricingUpdates();
  assert.equal(await evaluate('document.querySelectorAll("[data-snapshot-index]").length'), 5, 'restored history pages from five again');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  // Keep one saved custom rule across rollback.
  await pricingSection('custom');
  await click('[data-action=price-add-rule]');
  await until('document.querySelector(".dss-price-form")');
  for (const [key, value] of [['price.provider', 'deepseek'], ['price.model', 'deepseek-v4-flash'], ['price.uncached', '1'], ['price.output', '2']]) {
    assert(await setPricingInput(key, value), 'snapshot custom field ' + key);
  }
  await click('[data-action=price-stage-rule]');
  await until('document.querySelector(".dss-price-commit")');
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  await click('[data-action=price-save]');
  await until('!document.querySelector(".dss-price-commit")');
  await pricingSection('updates');
  // Dirty form blocks restore.
  await pricingSection('custom');
  await click('[data-action=price-add-rule]');
  await until('document.querySelector(".dss-price-form")');
  await setPricingInput('price.provider', 'fixture-compatible');
  await setPricingInput('price.model', 'fixture-unpriced');
  await pricingSection('updates');
  await until('document.querySelector("[data-action=price-rollback]")');
  assert(await evaluate('[...document.querySelectorAll("[data-action=price-rollback]")].every(node => node.disabled)'), 'dirty form disables every restore');
  assert(await evaluate('document.querySelector("[data-action=price-rollback]").title === window.__fixture.t("price.saveFirst")'), 'disabled restore explains why');
  await pricingSection('custom');
  await click('[data-action=price-cancel-editor]');
  await until('document.querySelector("[data-action=price-add-rule]")');
  await pricingSection('updates');
  await until('document.querySelector("[data-action=price-rollback]")');
  // A failed restore keeps the current state and list.
  const beforeFailure = await evaluate('document.querySelector(".dss-price-updates-current strong").textContent');
  await evaluate('window.__fixture.pricingFailAction = "rollback"');
  await click('[data-action=price-rollback]');
  await until(`document.querySelector(".dss-pricing [role=alert]")?.textContent.includes(${JSON.stringify(await evaluate('window.__fixture.t("price.failed")'))})`);
  assert.equal(await evaluate('document.querySelector(".dss-price-updates-current strong").textContent'), beforeFailure, 'failed restore keeps the current version');
  assert(await evaluate('document.querySelector(".dss-price-pinned").textContent.includes(window.__fixture.t("price.notPinned"))'), 'failed restore keeps the unpinned state');
  assert.equal(await evaluate('document.querySelectorAll("[data-snapshot-index]").length'), 5, 'failed restore keeps the snapshot list');
  await evaluate('window.__fixture.pricingFailAction = null');
  // Real rollback pins the selected version and preserves custom rules.
  const target = (await snapshotVersions())[0];
  await click('[data-action=price-rollback]');
  await until(`document.querySelector(".dss-price-updates-current strong").textContent === ${JSON.stringify(String(target))}`);
  await until('document.querySelector(".dss-price-pinned.is-on")');
  await until('!document.querySelector("[data-action=price-auto]").checked');
  await until('document.querySelectorAll("[data-snapshot-index]").length === 5');
  const rollbackPayload = await pricingPayload('rollback');
  assert(await evaluate('document.activeElement === document.querySelector(".dss-price-history-section h4")'), 'rollback focuses the snapshot heading');
  assert.deepEqual(Object.keys(rollbackPayload).sort(), ['action', 'revision', 'version'], 'rollback sends only version and revision');
  assert.equal(rollbackPayload.version, target, 'rollback sends the selected version');
  assert(Number.isSafeInteger(rollbackPayload.revision), 'rollback sends the current revision');
  assert(!(await snapshotVersions()).includes(target), 'restored version leaves the recoverable list');
  await pricingSection('custom');
  await until('document.querySelector(".dss-price-custom-row")');
  assert(await evaluate('!document.querySelector(".dss-price-unsaved")'), 'rollback preserves the saved custom rule');
  await pricingSection('updates');
  await until('document.querySelector("[data-action=price-refresh]")');
  assert(await evaluate('document.querySelector("[data-action=price-refresh]").disabled'), 'pinned updates disable check updates');
  assert(await evaluate('document.querySelector("[data-action=price-refresh]").title === window.__fixture.t("price.pinnedHint")'), 'pinned updates explain the disabled check');
  await pricingSection('models');
  await until('document.querySelector("[data-action=price-refresh]")');
  assert(await evaluate('document.querySelector("[data-action=price-refresh]").disabled'), 'pinned model summary disables check updates');
  assert(await evaluate('document.querySelector("[data-action=price-refresh]").title === window.__fixture.t("price.pinnedHint")'), 'pinned model summary explains the disabled check');
  await pricingSection('updates');
  await until('document.querySelector(".dss-price-pinned.is-on")');
  await capture('desktop-pricing-pinned');
  await click('[data-action=price-auto]');
  await until('document.querySelector(".dss-price-commit")');
  assert(await evaluate('!!document.querySelector(".dss-price-updates .dss-price-unsaved")'), 'auto-update draft is marked pending');
  assert(await evaluate('document.querySelector("[data-action=price-refresh]").disabled'), 'auto-update draft does not unpin');
  await pricingSection('models');
  assert(await evaluate('document.querySelector("[data-action=price-refresh]").disabled'), 'pinned model summary stays disabled with a draft');
  await pricingSection('updates');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await layout('pricing-pinned'); await capture('narrow-pricing-pinned');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const refreshBeforeUnpin = await refreshCallCount();
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  await click('[data-action=price-save]');
  await until('!document.querySelector(".dss-price-commit")');
  assert(await evaluate('document.querySelector("[data-action=price-auto]").checked'), 'saved auto-update draft is checked');
  assert(await evaluate('document.querySelector(".dss-price-pinned").textContent.includes(window.__fixture.t("price.notPinned"))'), 'saving auto-update unpins');
  const unpinnedVersion = await evaluate('document.querySelector(".dss-price-updates-current strong").textContent');
  assert(Number.isSafeInteger(Number(unpinnedVersion)), 'unpin keeps a real host version');
  assert(await evaluate('!document.querySelector("[data-action=price-refresh]").disabled'), 'unpin enables check updates');
  assert.equal(await refreshCallCount(), refreshBeforeUnpin, 'unpin does not call refresh');
  const unpinSave = await pricingPayload('save');
  assert(unpinSave.autoUpdate === true && JSON.parse(unpinSave.overridesJson).length === 1, 'unpin save carries the custom rule and auto-update');
  // Auto-update off but unpinned still permits a manual check.
  await click('[data-action=price-auto]');
  await until('document.querySelector(".dss-price-commit")');
  await click('[data-action=price-preview]');
  await until('document.querySelector(".dss-price-preview")');
  await click('[data-action=price-save]');
  await until('!document.querySelector(".dss-price-commit")');
  assert(await evaluate('!document.querySelector("[data-action=price-auto]").checked'), 'auto-update can be saved off');
  const manualVersion = await evaluate('document.querySelector(".dss-price-updates-current strong").textContent');
  assert(await evaluate('document.querySelector(".dss-price-pinned").textContent.includes(window.__fixture.t("price.notPinned"))'), 'auto-off remains unpinned');
  assert(await evaluate('!document.querySelector("[data-action=price-refresh]").disabled'), 'manual check remains enabled with auto-update off');
  assert(await evaluate('document.querySelector(".dss-price-updates").textContent.includes(window.__fixture.t("price.manualHint"))'), 'manual check hint is visible');
  const lastSuccessBefore = await evaluate('document.querySelector(".dss-price-sync-times span:nth-child(2)").textContent');
  await evaluate('window.__fixture.holdPricing = "refresh"');
  await click('[data-action=price-refresh]');
  await until('window.__fixture.calls.some(row => row[0] === "pricing" && row[1] === "refresh")');
  assert.equal(await evaluate('document.querySelector("[data-action=price-refresh]").textContent'), await evaluate('window.__fixture.t("price.checking")'), 'checking state is shown');
  assert(await evaluate('document.querySelector("[data-action=price-refresh]").disabled'), 'checking disables repeat checks');
  assert(await evaluate('[...document.querySelectorAll("[data-action=price-rollback]")].every(node => node.disabled)'), 'checking disables restore');
  await evaluate('window.__fixture.releasePricing && window.__fixture.releasePricing()');
  await evaluate('window.__fixture.holdPricing = null');
  await until('document.querySelector(".dss-price-status-error")?.textContent.includes(window.__fixture.t("price.refreshFailed"))');
  assert.equal(await evaluate('document.querySelector(".dss-price-updates-current strong").textContent'), manualVersion, 'failed refresh keeps the valid catalog');
  assert.equal(await evaluate('document.querySelector(".dss-price-sync-times span:nth-child(2)").textContent'), lastSuccessBefore, 'failed refresh keeps lastSuccessAt');
  assert(!(await evaluate('document.querySelector(".dss-price-sync-times span:nth-child(1)").textContent.includes(window.__fixture.t("price.neverChecked"))')), 'failed refresh records lastCheckAt');
  assert(await evaluate('!document.querySelector("[data-action=price-refresh]").disabled'), 'failed refresh allows a retry');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await layout('pricing-failure'); await capture('narrow-pricing-failure');
  report.checks.push('pricing updates: current/published/sync times, five-plus snapshots, empty history, pinning, unpin save, auto-off manual refresh and failure');

  // English narrow and dark updates screenshots.
  await navigate('/?stats=partial&lang=en');
  await evaluate('Date.now = () => 1792238400000');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await openPricingUpdates();
  await layout('pricing-updates-en'); await capture('narrow-pricing-updates-en');
  await navigate('/?stats=partial&theme=dark&lang=zh');
  await evaluate('Date.now = () => 1792238400000');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await openPricingUpdates();
  await layout('pricing-updates-dark'); await capture('dark-pricing-updates');
  await navigate('/?stats=partial&lang=en');
  await evaluate('Date.now = () => 1792238400000');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await openPricingUpdates();
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

  await navigate('/?theme=dark&lang=en');
  await click('.dss-trigger'); await tab(4);
  await evaluate('window.__fixture.accountMode = "stale"'); await refresh();
  await until('document.querySelector("[data-account-id=deepseek-official] .dss-bal-chip.is-warn")');
  assert.equal(await evaluate('document.querySelector(".dss-data-status").className'), 'dss-data-status exact', 'single stale account keeps the header exact in dark mode');
  await layout('dark-stale-balance'); await capture('narrow-dark-stale-balance');
  report.checks.push('dark-theme stale account state');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/?theme=dark&lang=zh'); await click('.dss-trigger'); await tab(4);
  await until('document.querySelectorAll(".dss-bal-row").length === 6');
  await layout('dark-balance'); await capture('dark-balance');
  await tab(1);
  await until('document.querySelector(".dss-kpis")');
  await layout('dark-overview'); await capture('dark-overview');
  await tab(3);
  await until('document.querySelector(".dss-tr-kpis")');
  await layout('dark-trends'); await capture('dark-trends');
  await evaluate('document.querySelector(".dss-body").scrollTop = 10000');
  await layout('dark-trends-bottom'); await capture('dark-trends-bottom');
  await evaluate('document.querySelector(".dss-body").scrollTop = 0');
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
  assert(detailMeta.includes('轮 / 步') && detailMeta.includes('工具') && detailMeta.includes('首 token') && detailMeta.includes('tok/s'), 'detail meta keeps turns/steps, tool, ttft and tps: ' + detailMeta);
  assert(!detailMeta.includes('/fixture/large-0'), 'detail meta does not repeat the project path: ' + detailMeta);
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
  await click('[data-action=mode-all]');
  await until('document.querySelector(".dss-tl-pager")');
  const recentDay = await evaluate('document.querySelector(".dss-mx-row.is-day").dataset.date');
  const datesSeen = [];
  for (;;) {
    const dates = await evaluate('[...document.querySelectorAll(".dss-mx-row.is-day")].map(node => node.dataset.date)');
    assert(dates.length <= 30, 'timeline mounted day budget'); datesSeen.push(...dates);
    if (await evaluate('document.querySelector("[data-action=tl-older]").disabled')) break;
    await click('[data-action=tl-older]');
  }
  assert.equal(datesSeen.length, 75, 'all history dates reachable');
  assert.equal(new Set(datesSeen).size, 75, 'history pages do not overlap');
  await click('[data-action=tl-latest]');
  assert.equal(await evaluate('document.querySelector(".dss-mx-row.is-day").dataset.date'), recentDay, 'latest button returns to newest page');
  await click('[data-action=tl-older]');
  await click('[data-action=mode-day]');
  await until('!document.querySelector(".dss-tl-pager")');
  await click('[data-action=mode-all]');
  await until('document.querySelector(".dss-tl-pager")');
  await until('document.querySelector("[data-action=tl-newer]").disabled');
  assert(await evaluate('document.querySelector("[data-action=tl-newer]").disabled'));
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
    await capture('large-sessions-' + width);
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
    await tab(2);
    if (await evaluate('!!document.querySelector("[data-action=mode-all]")')) await click('[data-action=mode-all]');
    await until('document.querySelector(".dss-mx")');
    await layout('large-pages-' + width);
    await capture('large-pages-' + width);
    if (width === 1440) {
      await click('[data-action=tl-color-project]');
      await until('document.querySelector(".dss-mx-proj")');
      await layout('large-pages-1440-project');
      await capture('large-pages-1440-project');
      await click('[data-action=tl-color-level]');
    }
  }
  report.checks.push('bounded pages: all 120 projects/filter items, 205 main/subagent sessions, 75 history days; timeline calendar pages, idle rows and week gaps, slot details; stable totals, day/all overview and timeline panels share a bottom line, sort/date reset, recent reset, session navigation, three widths');

  // 4b: day timeline
  await navigate('/?stats=estimated&lang=zh');
  await click('.dss-trigger'); await tab(1); await until('document.querySelector(".dss-data-status.exact")');
  await click('[data-action=mode-day]');
  const estimatedKpi = await evaluate('document.querySelector(".dss-kpi.cost .dss-kpi-v").textContent');
  await tab(2); await until('document.querySelector(".dss-tl")');
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
  const hoverFirstBar = () => evaluate(`(() => {
    const bar = document.querySelector('.dss-tl-bar');
    const rect = bar.getBoundingClientRect();
    bar.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: rect.left + rect.width / 2, clientY: rect.top + 2 }));
  })()`);
  await hoverFirstBar();
  await until('document.querySelector(".dss-tt.show")');
  const costBarTip = await evaluate('document.querySelector(".dss-tt").textContent');
  assert(/^\d{2}:\d{2}–\d{2}:\d{2} · ¥/.test(costBarTip), 'cost bar tooltip is one line: ' + costBarTip);
  assert(!costBarTip.includes('半小时') && !costBarTip.includes('30 min'), 'cost bar tooltip omits the half-hour unit: ' + costBarTip);
  await click('[data-action=tl-metric-token]');
  await delay(100);
  await hoverFirstBar();
  await until('document.querySelector(".dss-tt.show")');
  const tokenBarTip = await evaluate('document.querySelector(".dss-tt").textContent');
  assert(/^\d{2}:\d{2}–\d{2}:\d{2} · .+ Token$/.test(tokenBarTip), 'token bar tooltip is one line with its unit: ' + tokenBarTip);
  assert(!tokenBarTip.includes('半小时') && !tokenBarTip.includes('30 min'), 'token bar tooltip omits the half-hour unit: ' + tokenBarTip);
  await click('[data-action=tl-metric-cost]');
  const barState = () => evaluate(`(() => {
    const bars = [...document.querySelectorAll('.dss-tl-bar')];
    return { count: bars.length, activeIndex: bars.indexOf(document.activeElement), zero: bars.map(bar => bar.tabIndex) };
  })()`);
  assert.equal(await evaluate(`document.querySelectorAll('.dss-tl-bar[tabindex="0"]').length`), 1, 'exactly one bar is tabbable');
  await focus('.dss-tl-bar[tabindex="0"]');
  const barCount = (await barState()).count;
  await press('End');
  let state = await barState();
  assert.equal(state.activeIndex, barCount - 1, 'End focuses the last bar');
  assert.equal(state.zero.filter(value => value === 0).length, 1);
  assert.equal(state.zero[barCount - 1], 0, 'End moves the roving tab stop');
  await press('Home');
  state = await barState();
  assert.equal(state.activeIndex, 0, 'Home focuses the first bar');
  assert.equal(state.zero[0], 0, 'Home moves the roving tab stop');
  await press('ArrowRight');
  state = await barState();
  assert.equal(state.activeIndex, 1, 'ArrowRight focuses the second bar');
  assert.equal(state.zero[1], 0, 'ArrowRight moves the roving tab stop');
  await press('Enter');
  await until('document.querySelector(".dss-tl-pop[role=dialog]")');
  await press('Escape');
  await until('!document.querySelector(".dss-tl-pop")');
  state = await barState();
  assert.equal(state.activeIndex, 1, 'bar detail Escape returns focus to the bar');
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
  const popSessionId = await evaluate('document.querySelector("[data-action=tl-pop-session]").dataset.sessionId');
  assert(popSessionId, 'slot detail session rows expose data-session-id');
  await click('[data-action=tl-pop-session]');
  await until('!document.querySelector(".dss-panel")');
  assert.equal(await evaluate('window.__fixture.openedSession'), popSessionId, 'slot detail opens the selected session');
  assert(await evaluate('document.activeElement !== document.querySelector(".dss-trigger")'), 'opening a slot-detail session does not restore focus to the trigger');
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
  report.checks.push('day timeline: single scroll, >=11px text, overview cost parity, tick alignment, run width, bar keyboard, slot detail Esc/focus and session opening');
  await evaluate('localStorage.removeItem("dsh-stats.hidden")');
  await navigate('/?stats=partial&lang=zh');
  await click('.dss-trigger'); await tab(1); await until('document.querySelector(".dss-data-status.partial")');
  await click('[data-action=mode-day]');
  const partialKpi = await evaluate('document.querySelector(".dss-kpi.cost .dss-kpi-v").textContent');
  await tab(2); await until('document.querySelector(".dss-tl")');
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

  // 4c: all-mode calendar matrix
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/?stats=large&lang=zh');
  await click('.dss-trigger'); await tab(2); await until('document.querySelector(".dss-tl")');
  await click('[data-action=mode-all]');
  await until('document.querySelector(".dss-mx")');
  await click('[data-action=tl-color-level]');
  await layout('desktop-timeline-all');
  await capture('desktop-timeline-all');
  const allScrollables = await evaluate(`(() => {
    const panel = document.querySelector('.dss-panel');
    return [...panel.querySelectorAll('*')].filter(node => {
      const style = getComputedStyle(node);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1;
    }).map(node => String(node.className || node.tagName));
  })()`);
  assert.deepEqual(allScrollables.filter(name => name !== 'dss-body'), [], 'all timeline keeps a single scroll container: ' + JSON.stringify(allScrollables));
  const allSmallFonts = await evaluate(`(() => {
    const bad = [];
    for (const node of document.querySelectorAll('.dss-overlay *')) {
      if (![...node.childNodes].some(child => child.nodeType === 3 && child.textContent.trim())) continue;
      const size = parseFloat(getComputedStyle(node).fontSize);
      if (size < 11) bad.push({ tag: node.tagName, cls: String(node.className || ''), size });
    }
    return bad.slice(0, 10);
  })()`);
  assert.deepEqual(allSmallFonts, [], 'all timeline text must be >= 11px: ' + JSON.stringify(allSmallFonts));
  const barWidths = await evaluate(`[...document.querySelectorAll('.dss-mx-row.is-day:not(.is-idle) .dss-mx-bar > span')].map(node => node.getBoundingClientRect().width)`);
  assert(barWidths.length > 0 && barWidths.every(width => width >= 2.5), 'non-empty daily bars keep at least 3px: ' + JSON.stringify(barWidths));
  const legendMatch = await evaluate(`(() => {
    const swatches = [...document.querySelectorAll('.dss-mx-lg')];
    const cells = [...document.querySelectorAll('.dss-mx-cell')];
    const host = document.querySelector('.dss-mx-cells');
    const out = [];
    for (const swatch of swatches) {
      const level = swatch.dataset.level;
      let cell = cells.find(node => node.dataset.level === level);
      let temp = null;
      if (!cell) {
        temp = document.createElement('i');
        temp.className = 'dss-mx-cell';
        temp.dataset.level = level;
        host.appendChild(temp);
        cell = temp;
      }
      const swatchStyle = getComputedStyle(swatch), cellStyle = getComputedStyle(cell);
      const swatchAfter = getComputedStyle(swatch, '::after'), cellAfter = getComputedStyle(cell, '::after');
      out.push({ level: level, bg: [swatchStyle.backgroundColor, cellStyle.backgroundColor], after: [swatchAfter.backgroundColor, cellAfter.backgroundColor], opacity: [swatchAfter.opacity, cellAfter.opacity] });
      if (temp) temp.remove();
    }
    return out;
  })()`);
  for (const row of legendMatch) {
    assert.equal(row.bg[0], row.bg[1], 'legend level ' + row.level + ' base color matches cells: ' + JSON.stringify(row));
    assert.equal(row.after[0], row.after[1], 'legend level ' + row.level + ' overlay color matches cells: ' + JSON.stringify(row));
    assert.equal(row.opacity[0], row.opacity[1], 'legend level ' + row.level + ' overlay opacity matches cells: ' + JSON.stringify(row));
  }
  const nowMarker = await evaluate(`(() => {
    const cell = document.querySelector('.dss-mx-cell.is-now');
    return cell ? { exists: true, shadow: getComputedStyle(cell, '::before').boxShadow } : { exists: false, shadow: 'none' };
  })()`);
  assert(nowMarker.exists && nowMarker.shadow !== 'none', 'now cell keeps a visible outline: ' + JSON.stringify(nowMarker));
  const hoveredCell = await evaluate(`(() => {
    const cell = document.querySelector('.dss-mx-row.is-day:not(.is-idle) .dss-mx-cell:not([data-level="0"])');
    const rect = cell.getBoundingClientRect();
    cell.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }));
    return { level: cell.dataset.level };
  })()`);
  await until('document.querySelector(".dss-tt.show")');
  const cellTip = await evaluate('document.querySelector(".dss-tt").textContent');
  assert(cellTip.includes('–') && /Large project \d+/.test(cellTip), 'matrix cell tooltip names the time range and projects: ' + cellTip);
  await click('[data-action=filter]'); await until('document.querySelector(".dss-filter-item")');
  await evaluate('document.querySelector(\'.dss-filter-item[data-project-id="large-0"] input\').click()');
  await until('document.querySelectorAll(".dss-mx-row.is-day.is-idle").length === 29');
  await press('Escape'); await until('!document.querySelector(".dss-filter-item")');
  const idleGeometry = await evaluate(`(() => {
    const rows = [...document.querySelectorAll('.dss-mx-row.is-day')];
    const today = rows.find(row => !row.classList.contains('is-idle'));
    const idle = rows.filter(row => row.classList.contains('is-idle'));
    const todayHeight = today.getBoundingClientRect().height;
    const heights = idle.map(row => Math.round(row.getBoundingClientRect().height * 10) / 10);
    const disabled = idle.every(row => row.querySelector('.dss-mx-date').disabled);
    const gaps = [];
    for (let index = 1; index < rows.length; index++) {
      gaps.push(Math.round((rows[index].getBoundingClientRect().top - rows[index - 1].getBoundingClientRect().bottom) * 10) / 10);
    }
    const weekGaps = rows.slice(1).map((row, index) => row.classList.contains('is-week') ? gaps[index] : null).filter(value => value != null);
    return { count: idle.length, todayHeight: todayHeight, heights: heights, disabled: disabled, gaps: [...new Set(gaps)], weekGaps: [...new Set(weekGaps)] };
  })()`);
  assert.equal(idleGeometry.count, 29, 'first page has 29 idle rows after hiding large-0');
  assert(idleGeometry.heights.every(height => Math.abs(height - idleGeometry.todayHeight) <= 0.5), 'idle rows match the active row height: ' + JSON.stringify(idleGeometry));
  assert(idleGeometry.disabled, 'idle date buttons are disabled');
  assert.equal(idleGeometry.gaps.length, 2, 'week gaps add one spacing value: ' + JSON.stringify(idleGeometry.gaps));
  assert.equal(idleGeometry.weekGaps[0], Math.max(...idleGeometry.gaps), 'week rows carry the larger gap: ' + JSON.stringify(idleGeometry));
  assert(Math.abs(Math.max(...idleGeometry.gaps) - Math.min(...idleGeometry.gaps) - 8) <= 1, 'week gap is 8px: ' + JSON.stringify(idleGeometry.gaps));
  await evaluate(`(() => { const tot = document.querySelector('.dss-mx-row.is-day:not(.is-idle) .dss-mx-tot'); const rect = tot.getBoundingClientRect(); tot.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 })); })()`);
  await until('document.querySelector(".dss-tt.show")');
  const totTip = await evaluate('document.querySelector(".dss-tt").textContent');
  assert(totTip.includes('另有 111 个项目'), 'daily bar tooltip merges projects beyond eight: ' + totTip);
  await click('[data-action=tl-color-project]');
  await until('document.querySelector(".dss-mx-proj")');
  const projectLegend = await evaluate(`({ count: document.querySelectorAll('.dss-mx-proj').length, text: document.querySelector('.dss-tl-legend').textContent })`);
  assert(projectLegend.count <= 8, 'project legend lists at most eight projects: ' + JSON.stringify(projectLegend));
  assert(projectLegend.text.includes('另有 111 个项目'), 'project legend merges the rest: ' + JSON.stringify(projectLegend));
  await click('[data-action=tl-color-level]');
  await focus('.dss-mx-row.is-day:not(.is-idle) .dss-mx-date');
  await until('document.querySelector(".dss-tt.show")');
  const dailyTip = await evaluate(`({ text: document.querySelector('.dss-tt').textContent, rows: document.querySelectorAll('.dss-tt .dss-tip-row').length })`);
  assert(dailyTip.text.includes('另有 111 个项目'), 'daily bar tooltip merges projects beyond eight: ' + dailyTip.text);
  assert.equal(dailyTip.rows, 11, 'daily bar tooltip keeps two summary rows, eight projects and one more row');
  await evaluate('document.activeElement.blur()');
  await focus('#dss-tl-active-only');
  await press(' ');
  await until('document.querySelectorAll(".dss-mx-row.is-day").length === 1');
  assert(await evaluate('document.querySelector(".dss-tl-pager span").textContent.includes("1/1")'), 'active-only collapses to one page');
  await focus('#dss-tl-active-only');
  await press(' ');
  await until('document.querySelectorAll(".dss-mx-row.is-day").length === 30');
  assert(await evaluate('document.querySelector(".dss-tl-pager span").textContent.includes("1/3")'), 'unchecking active-only restores calendar paging');
  const columnsAt = async width => {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    await evaluate('window.dispatchEvent(new Event("resize"))');
    await delay(200);
    return evaluate('document.querySelector(".dss-mx-cells").children.length');
  };
  assert.equal(await columnsAt(1440), 48, '1440 uses 48 matrix columns');
  assert.equal(await columnsAt(390), 24, '390 uses 24 matrix columns');
  assert.equal(await columnsAt(320), 24, '320 uses 24 matrix columns');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await delay(200);
  await click('.dss-mx-row.is-day:not(.is-idle) .dss-mx-cell:not([data-level="0"])');
  await until('document.querySelector(".dss-tl[data-mode=day]")');
  await until('document.querySelector(".dss-tl-pop[role=dialog]")');
  assert((await evaluate('document.querySelector(".dss-date-label").textContent')).includes('2026-09-08'), 'cell jump selects the row date');
  assert.equal(await evaluate('document.querySelector(".dss-tl-lane[data-project-id] .dss-tl-chev").getAttribute("aria-expanded")'), 'true', 'cell jump opens the first lane');
  await press('Escape');
  await until('!document.querySelector(".dss-tl-pop")');
  assert(await evaluate('document.activeElement === document.querySelector(".dss-tl-day")'), 'closing a jumped slot detail focuses the day');
  await press('Escape');
  report.checks.push('all-mode timeline: single scroll, >=11px text, legend/cell colors, cell and daily tooltips, now outline, calendar pages, idle rows and week gaps, active-only paging, project legend, 24/48 columns, cell jump');

  // 4e: deterministic showcase screenshots for the README
  await evaluate('localStorage.removeItem("dsh-stats.timeline"); localStorage.removeItem("dsh-stats.hidden"); localStorage.setItem("dsh-stats.nav", JSON.stringify({ mode: "day", date: null }))');
  await navigate('/?stats=showcase&lang=zh');
  await click('.dss-trigger'); await tab(2);
  await until('document.querySelector(".dss-data-status.exact")');
  await until('document.querySelector(".dss-tl[data-mode=day]")');
  await click('[data-action=date-prev]');
  await until('document.querySelector(".dss-date-label").textContent.includes("2026-09-07")');
  const showcaseLanes = await evaluate('document.querySelectorAll(".dss-tl-lane").length');
  assert(showcaseLanes >= 4, 'showcase 09-07 has at least four lanes: ' + showcaseLanes);
  const subTagHeight = await evaluate('document.querySelector(".dss-tl-sess.is-sub .dss-tag").getBoundingClientRect().height');
  assert(subTagHeight <= 20, 'subagent tag stays on one line at 1440: ' + subTagHeight);
  await layout('readme-timeline-day');
  await capture('readme-timeline-day');
  await click('[data-action=mode-all]');
  await until('document.querySelector(".dss-mx")');
  await click('[data-action=tl-color-level]');
  const showcaseActive = await evaluate('document.querySelectorAll(".dss-mx-row.is-day:not(.is-idle)").length');
  assert(showcaseActive >= 15, 'showcase first matrix page has at least fifteen active days: ' + showcaseActive);
  await layout('readme-timeline-all');
  await capture('readme-timeline-all');
  await click('[data-action=mode-day]');
  await until('document.querySelector(".dss-tl[data-mode=day]")');
  await click('[data-action=date-prev]');
  await until('document.querySelector(".dss-date-label").textContent.includes("2026-09-07")');
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 900, deviceScaleFactor: 1, mobile: true });
  await evaluate('window.dispatchEvent(new Event("resize"))');
  await delay(200);
  const subTagHeight320 = await evaluate('document.querySelector(".dss-tl-sess.is-sub .dss-tag").getBoundingClientRect().height');
  assert(subTagHeight320 <= 20, 'subagent tag stays on one line at 320: ' + subTagHeight320);
  await click('.dss-tl-sess.is-sub .dss-tl-run');
  await until('document.querySelector(".dss-tl-pop[role=dialog]")');
  const popTagHeight = await evaluate('document.querySelector(".dss-tl-pop-s .dss-tag").getBoundingClientRect().height');
  assert(popTagHeight <= 20, 'popover subagent tag stays on one line at 320: ' + popTagHeight);
  await press('Escape'); await press('Escape');
  report.checks.push('showcase timeline: 09-07 lanes, first-page active days and one-line subagent tags (unchanged with 26 weeks of history)');

  // §9.3 第 23 条：展示夹具的趋势页，用作 README 截图。
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate('window.dispatchEvent(new Event("resize"))');
  await evaluate('localStorage.removeItem("dsh-stats.trends"); localStorage.removeItem("dsh-stats.hidden")');
  await navigate('/?stats=showcase&lang=zh');
  await click('.dss-trigger'); await tab(3);
  await until('document.querySelector(".dss-tr-kpis")');
  await until('document.querySelectorAll(".dss-tr-col").length === 30');
  const showcaseBars = await evaluate('document.querySelectorAll("button.dss-tr-bar").length');
  assert(showcaseBars >= 20, 'showcase 30 days has at least twenty active bars: ' + showcaseBars);
  const showcaseModelRows = await evaluate('document.querySelectorAll(".dss-tr-mrow").length');
  assert(showcaseModelRows >= 4, 'showcase model table has at least four rows: ' + showcaseModelRows);
  const showcaseRingColors = await evaluate('new Set([...document.querySelectorAll(".dss-tr-mrow .dss-pdot[data-color]")].map(node => node.dataset.color)).size');
  assert(showcaseRingColors >= 4, 'showcase ring carries four model colors: ' + showcaseRingColors);
  const showcaseCells = await evaluate('document.querySelectorAll("button.dss-tr-cell").length');
  assert(showcaseCells >= 100, 'showcase heatmap has at least a hundred active cells: ' + showcaseCells);
  const showcaseKpis = await evaluate('document.querySelector(".dss-tr-kpis").innerText');
  assert(!showcaseKpis.includes('*'), 'showcase summary carries no partial marker: ' + showcaseKpis.slice(0, 120));
  assert(!(await evaluate('!!document.querySelector(".dss-tr .is-partial")')), 'showcase has no partial bars or cells');
  await layout('readme-trends');
  await capture('readme-trends');
  report.checks.push('showcase trends: 30-day cost mode with ' + showcaseBars + ' bars, ' + showcaseModelRows + ' models, ' + showcaseCells + ' heat cells, no partial marker');

  // §9.3 第 1–12 条：趋势页工具栏、摘要条、每日柱图和跳转。
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/?lang=zh');
  await evaluate('localStorage.removeItem("dsh-stats.trends"); localStorage.removeItem("dsh-stats.hidden")');
  await navigate('/?lang=zh');
  await click('.dss-trigger'); await tab(3);
  await until('document.querySelector(".dss-tr-kpis")');

  // 1. 默认
  assert.equal(await evaluate('document.querySelector("[data-action=tr-range-30]").getAttribute("aria-pressed")'), 'true', 'default range is 30 days');
  assert.equal(await evaluate('document.querySelector("[data-action=tr-metric-cost]").getAttribute("aria-pressed")'), 'true', 'default metric is cost');
  assert.equal(await evaluate('document.querySelector(".dss-tr-range").textContent'), '08-10 至 09-08', 'range label');
  assert(await evaluate('!document.querySelector(".dss-body .dss-date-nav") && !document.querySelector(".dss-body [data-action=mode-day]") && !document.querySelector(".dss-body .dss-kpis")'), 'trends has no overview date tools');
  assert.equal(await evaluate('document.querySelectorAll(".dss-tr-kpis .dss-kpi").length'), 4, 'summary strip has four cells');

  // 2. 柱数
  assert.equal(await evaluate('document.querySelectorAll(".dss-tr-col").length'), 30, '30 day columns');
  assert.equal(await evaluate('document.querySelectorAll("button.dss-tr-bar").length'), 7, 'one bar per active day');
  assert.equal(await evaluate('[...document.querySelectorAll("button.dss-tr-bar")].pop().dataset.date'), '2026-09-08', 'last bar is today');

  // 3. 与总览一致
  const trendsCost30 = await evaluate('document.querySelector(".dss-tr-kpis .dss-kpi.cost .dss-kpi-v").textContent');
  await tab(1);
  await until('document.querySelector(".dss-kpis")');
  await click('[data-action=mode-all]');
  await until('document.querySelector(".dss-kpis")');
  const overviewCost = await evaluate('document.querySelector(".dss-kpis .dss-kpi.cost .dss-kpi-v").textContent');
  assert.equal(trendsCost30, overviewCost, '30-day trends cost equals overview all-history cost');
  await tab(3);
  await until('document.querySelector(".dss-tr-kpis")');
  await click('[data-action=tr-range-7]');
  await until('document.querySelectorAll(".dss-tr-col").length === 7');
  const trendsCost7 = await evaluate('document.querySelector(".dss-tr-kpis .dss-kpi.cost .dss-kpi-v").textContent');
  assert.equal(trendsCost7, overviewCost, '7-day trends cost equals overview all-history cost');
  await tab(1);
  await until('document.querySelector(".dss-kpis")');
  await click('[data-action=mode-day]');
  await until('document.querySelector(".dss-kpis")');
  await tab(3);
  await until('document.querySelector(".dss-tr-kpis")');

  // 4. 切换与持久化
  await click('[data-action=tr-range-7]');
  await until('document.querySelectorAll(".dss-tr-col").length === 7');
  assert.equal(await evaluate('document.querySelector(".dss-tr-range").textContent'), '09-02 至 09-08', '7-day range label');
  await click('[data-action=tr-metric-token]');
  await until('document.querySelector(".dss-tr-daily h3").textContent === "每日 Token"');
  assert(await evaluate('[...document.querySelectorAll(".dss-tr-bar")].every(node => node.classList.contains("is-token") && node.querySelectorAll("i").length === 3)'), 'token bars carry three segments');
  assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("dsh-stats.trends"))'), { range: 7, metric: 'token' }, 'trends prefs persist');
  await click('[data-action=close]');
  await until('!document.querySelector(".dss-panel")');
  await click('.dss-trigger');
  await until('document.querySelector(".dss-panel")');
  await tab(3);
  await until('document.querySelector(".dss-tr-kpis")');
  assert.equal(await evaluate('document.querySelectorAll(".dss-tr-col").length'), 7, 'reopening keeps 7 days');
  assert.equal(await evaluate('document.querySelector("[data-action=tr-metric-token]").getAttribute("aria-pressed")'), 'true', 'reopening keeps the token metric');
  await evaluate('localStorage.setItem("dsh-stats.trends", JSON.stringify({ range: 14, metric: "x" }))');
  await navigate('/?lang=zh');
  await click('.dss-trigger'); await tab(3);
  await until('document.querySelector(".dss-tr-kpis")');
  assert.equal(await evaluate('document.querySelectorAll(".dss-tr-col").length'), 30, 'invalid prefs fall back to 30 days');
  assert.equal(await evaluate('document.querySelector("[data-action=tr-metric-cost]").getAttribute("aria-pressed")'), 'true', 'invalid prefs fall back to cost');

  // 5. x 轴
  const xTexts = () => evaluate('[...document.querySelectorAll(".dss-tr-x span")].map(node => node.textContent)');
  await click('[data-action=tr-range-30]');
  await until('document.querySelectorAll(".dss-tr-col").length === 30');
  assert.deepEqual(await xTexts(), ['08-10', '08-17', '08-24', '08-31', '今天'], '30-day x labels');
  await click('[data-action=tr-range-7]');
  await until('document.querySelectorAll(".dss-tr-col").length === 7');
  assert.deepEqual(await xTexts(), ['09-02', '09-03', '09-04', '09-05', '09-06', '09-07', '今天'], '7-day x labels');
  await click('[data-action=tr-range-90]');
  await until('document.querySelectorAll(".dss-tr-col").length === 90');
  assert.deepEqual(await xTexts(), ['7月', '8月', '今天'], '90-day x labels');
  await layout('desktop-trends-90'); await capture('desktop-trends-90');
  await click('[data-action=tr-range-30]');
  await until('document.querySelectorAll(".dss-tr-col").length === 30');

  // 12. Token 模式截图
  await click('[data-action=tr-metric-token]');
  await until('document.querySelector(".dss-tr-daily h3").textContent === "每日 Token"');
  await layout('desktop-trends-token'); await capture('desktop-trends-token');
  await click('[data-action=tr-metric-cost]');
  await until('document.querySelector(".dss-tr-daily h3").textContent === "每日费用"');

  // 6. 键盘与跳转
  const barHeights = await evaluate('[...document.querySelectorAll(".dss-tr-bar")].map(node => ({ date: node.dataset.date, height: parseFloat(node.style.height) }))');
  const peakBar = barHeights.reduce((best, bar) => (!best || bar.height >= best.height ? bar : best), null);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".dss-tr-bar")].filter(node => node.tabIndex === 0).map(node => node.dataset.date)'), [peakBar.date], 'the only tab stop is the peak day');
  await command('Emulation.setFocusEmulationEnabled', { enabled: true });
  try {
    await focus('.dss-tr-bar[tabindex="0"]');
    await press('Home');
    assert.equal(await evaluate('document.activeElement.dataset.date'), '2026-09-02', 'Home moves to the first active day');
    assert((await evaluate('document.querySelector("#dss-tooltip")?.textContent || ""')).includes('09-02'), 'bar tooltip follows keyboard focus');
    await press('ArrowRight');
    assert.equal(await evaluate('document.activeElement.dataset.date'), '2026-09-03', 'ArrowRight moves one active day');
    await press('End');
    assert.equal(await evaluate('document.activeElement.dataset.date'), '2026-09-08', 'End moves to the last active day');
    await press('Enter');
    await until('document.querySelector("#dss-tab-overview").getAttribute("aria-selected") === "true"');
    assert.equal(await evaluate('document.activeElement.id'), 'dss-tab-overview', 'focus lands on the overview tab');
    assert((await evaluate('document.querySelector(".dss-date-label").textContent')).includes('2026-09-08'), 'jump selects that day');
    assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("dsh-stats.nav"))'), { mode: 'day', date: '2026-09-08' }, 'jump writes the day nav');
  } finally {
    await command('Emulation.setFocusEmulationEnabled', { enabled: false }).catch(() => {});
  }

  // 7. 筛选联动
  await tab(3);
  await until('document.querySelector(".dss-tr-kpis")');
  const costBeforeHide = await evaluate('document.querySelector(".dss-tr-kpis .dss-kpi.cost .dss-kpi-v").textContent');
  await openFilter();
  await click('.dss-filter-item[data-project-id="client-dashboard"] input');
  await closeFilter();
  assert((await evaluate('document.querySelector(".dss-filter-badge")?.textContent || ""')).includes('1'), 'filter badge counts one hidden project');
  assert.notEqual(await evaluate('document.querySelector(".dss-tr-kpis .dss-kpi.cost .dss-kpi-v").textContent'), costBeforeHide, 'hiding a project changes the trends cost');
  await tab(1);
  await until('document.querySelector(".dss-kpis")');
  assert(await evaluate('!document.querySelector(\'.dss-prow[data-project-id="client-dashboard"]\')'), 'hidden project leaves the overview table');
  await tab(3);
  await until('document.querySelector(".dss-tr-kpis")');
  await openFilter();
  await click('[data-action=filter-show-all]');
  await closeFilter();
  assert.equal(await evaluate('document.querySelector(".dss-tr-kpis .dss-kpi.cost .dss-kpi-v").textContent'), costBeforeHide, 'show all restores the trends cost');

  // 8. 全部隐藏
  await openFilter();
  await click('.dss-filter-item[data-project-id="api-service"] input');
  await click('.dss-filter-item[data-project-id="client-dashboard"] input');
  await closeFilter();
  await until('document.querySelector(".dss-tr-empty")');
  assert((await evaluate('document.querySelector(".dss-tr-empty").textContent')).includes('所有项目都已隐藏'), 'all-hidden empty state');
  await click('[data-action=tr-show-all]');
  await until('document.querySelector(".dss-tr-kpis")');

  // 9. 部分计价
  await navigate('/?stats=partial&lang=zh');
  await click('.dss-trigger'); await tab(3);
  await until('document.querySelector(".dss-tr-kpis")');
  assert(await evaluate('document.querySelectorAll(".dss-tr-bar.is-partial").length > 0'), 'partial days use the striped bar');
  assert((await evaluate('document.querySelector(".dss-tr-kpis .dss-kpi.cost .dss-kpi-v").textContent')).endsWith('*'), 'partial cost ends with *');
  await layout('desktop-trends-partial'); await capture('desktop-trends-partial');
  await evaluate('document.querySelector(".dss-body").scrollTop = 10000');
  await layout('desktop-trends-partial-bottom'); await capture('desktop-trends-partial-bottom');
  await evaluate('document.querySelector(".dss-body").scrollTop = 0');
  await click('.dss-tr-kpis [data-action=pricing-pending]');
  await until('document.querySelector(".dss-drawer")');
  await until(`(() => { const input = [...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.model')); return input && input.value === 'fixture-unpriced'; })()`);
  await press('Escape'); await until('!document.querySelector(".dss-drawer")');

  // 11. 空范围
  await navigate('/?shiftDays=20&lang=zh');
  await click('.dss-trigger'); await tab(3);
  await until('document.querySelector(".dss-tr-kpis")');
  await click('[data-action=tr-range-7]');
  await until('document.querySelector(".dss-tr-empty")');
  assert((await evaluate('document.querySelector(".dss-tr-empty").textContent')).includes('近 7 天没有 Token 消耗'), 'empty range copy');
  assert.equal(await evaluate('document.querySelector("[data-action=tr-empty-range]")?.textContent || ""'), '看近 30 天', 'empty range points at 30 days');
  await click('[data-action=tr-empty-range]');
  await until('document.querySelectorAll(".dss-tr-col").length === 30');
  assert.equal(await evaluate('document.querySelectorAll("button.dss-tr-bar").length'), 7, '30 days bring the bars back');
  report.checks.push('trends: range/metric persistence, overview cost parity, 30/7/90 columns and x labels, bar keyboard and day jump, filter linkage, all-hidden, partial pricing, empty range, single scroll and >=11px text');

  // §9.3 第 13–17 条：26 周热力图与连续统计。
  await navigate('/?shiftDays=20&lang=zh');
  await click('.dss-trigger'); await tab(3);
  await until('document.querySelector(".dss-tr-kpis")');
  await click('[data-action=tr-range-7]');
  await until('document.querySelector(".dss-tr-empty")');
  assert(await evaluate('!!document.querySelector(".dss-tr-heat")'), 'empty range still renders the heatmap');
  assert.equal(await evaluate('document.querySelectorAll("button.dss-tr-cell").length'), 7, 'empty range keeps seven active cells');

  await navigate('/?lang=zh');
  await click('.dss-trigger'); await tab(3);
  await until('document.querySelector(".dss-tr-kpis")');
  // 13. 格子
  assert.equal(await evaluate('document.querySelectorAll(".dss-tr-cell").length'), 177, '26 weeks of cells');
  assert.equal(await evaluate('document.querySelector(".dss-tr-cell").dataset.date'), '2026-03-16', 'first cell is the window start');
  assert.equal(await evaluate('[...document.querySelectorAll(".dss-tr-cell")].filter(node => node.style.gridColumnStart === "26").length'), 2, 'last column holds two cells');
  assert.equal(await evaluate('document.querySelectorAll("button.dss-tr-cell").length'), 7, 'seven active cells');
  assert(await evaluate('document.querySelector(\'button.dss-tr-cell[data-date="2026-09-08"]\').classList.contains("is-today")'), 'today cell is marked');
  // 14. 标签
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".dss-tr-month")].map(node => node.textContent)'), ['4月', '5月', '6月', '7月', '8月', '9月'], 'month labels run April to September');
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".dss-tr-heat-dow span")].map(node => node.textContent).filter(Boolean)'), ['一', '三', '五'], 'weekday column shows Mon/Wed/Fri only');
  // 15. 统计
  const heatStats = await evaluate('[...document.querySelectorAll(".dss-tr-stat")].map(node => node.textContent)');
  assert.equal(heatStats.length, 3, 'three heat statistics');
  assert(heatStats[0].includes('7 / 177 天'), 'active days stat: ' + heatStats[0]);
  assert(heatStats[1].includes('7 天') && heatStats[1].includes('截至今天'), 'current streak stat: ' + heatStats[1]);
  assert(heatStats[2].includes('7 天') && heatStats[2].includes('09-02 至 09-08'), 'longest streak stat: ' + heatStats[2]);
  // 16. 键盘与跳转
  assert.deepEqual(await evaluate('[...document.querySelectorAll("button.dss-tr-cell")].filter(node => node.tabIndex === 0).map(node => node.dataset.date)'), ['2026-09-08'], 'the only heat tab stop is today');
  await command('Emulation.setFocusEmulationEnabled', { enabled: true });
  try {
    await focus('button.dss-tr-cell[tabindex="0"]');
    await press('ArrowLeft');
    assert.equal(await evaluate('document.activeElement.dataset.date'), '2026-09-07', 'ArrowLeft moves to the previous active day');
    assert((await evaluate('document.querySelector("#dss-tooltip")?.textContent || ""')).includes('2026-09-07'), 'heat tooltip follows keyboard focus');
    await press('Home');
    assert.equal(await evaluate('document.activeElement.dataset.date'), '2026-09-02', 'Home moves to the first active day');
    await press('Enter');
    await until('document.querySelector("#dss-tab-overview").getAttribute("aria-selected") === "true"');
    assert.equal(await evaluate('document.activeElement.id'), 'dss-tab-overview', 'heat jump focuses the overview tab');
    assert((await evaluate('document.querySelector(".dss-date-label").textContent')).includes('2026-09-02'), 'heat jump selects that day');
    assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("dsh-stats.nav"))'), { mode: 'day', date: '2026-09-02' }, 'heat jump writes the day nav');
  } finally {
    await command('Emulation.setFocusEmulationEnabled', { enabled: false }).catch(() => {});
  }
  report.checks.push('trends heatmap: 177 cells and two-cell last column, April–September labels, Mon/Wed/Fri column, streak stats, roving keyboard and day jump, empty range keeps the heatmap');

  // §9.3 第 18–22 条：模型区。
  await tab(3);
  await until('document.querySelector(".dss-tr-models")');
  await click('[data-action=tr-range-30]');
  await until('document.querySelectorAll(".dss-tr-col").length === 30');
  await until('document.querySelectorAll(".dss-tr-mrow").length === 2');
  // 18. 行与排序
  assert.equal(await evaluate('document.querySelector(".dss-tr-mtable th.c-cost").getAttribute("aria-sort")'), 'descending', 'cost column sorts descending by default');
  const costAmounts = await evaluate('[...document.querySelectorAll(".dss-tr-mrow .c-cost .dss-cost-amt")].map(node => parseFloat(node.textContent.replace(/[^0-9.]/g, "")))');
  assert(costAmounts.length === 2 && costAmounts[0] >= costAmounts[1], 'cost rows descend: ' + JSON.stringify(costAmounts));
  await click('[data-action=tr-metric-token]');
  await until('document.querySelector(".dss-tr-mtable th.c-tokens").getAttribute("aria-sort") === "descending"');
  await click('.dss-tr-mtable th.c-model .dss-sort-btn');
  await until('document.querySelector(".dss-tr-mtable th.c-model").getAttribute("aria-sort") === "ascending"');
  const modelNames = await evaluate('[...document.querySelectorAll(".dss-tr-mrow .dss-tr-mname span")].map(node => node.textContent)');
  assert.deepEqual(modelNames, [...modelNames].sort(), 'model rows ascend by name: ' + JSON.stringify(modelNames));
  // 19. 占比
  const shareSum = () => evaluate('[...document.querySelectorAll(".dss-tr-mrow .dss-share-pct")].reduce((sum, node) => sum + parseFloat(node.textContent), 0)');
  const tokenShare = await shareSum();
  assert(tokenShare >= 99.8 && tokenShare <= 100.2, 'token shares add up: ' + tokenShare);
  await click('[data-action=tr-metric-cost]');
  await until('document.querySelector(".dss-tr-mtable th.c-cost").getAttribute("aria-sort") === "descending"');
  const costShare = await shareSum();
  assert(costShare >= 99.8 && costShare <= 100.2, 'cost shares add up: ' + costShare);
  // 20. 环
  const ringAria = await evaluate('document.querySelector(".dss-tr-ring[role=img]").getAttribute("aria-label")');
  assert(ringAria.includes('deepseek-v4-flash') && ringAria.includes('MiniMax-M3'), 'ring aria-label names both models: ' + ringAria);
  assert(await evaluate('!document.querySelector(".dss-model-list-viewport")'), 'the old scrolling model list is gone');
  // 21. 颜色稳定
  const dotColor = () => evaluate(`(() => { const row = [...document.querySelectorAll('.dss-tr-mrow')].find(node => node.dataset.modelKey.includes('deepseek-v4-flash')); return row?.querySelector('.dss-pdot')?.getAttribute('data-color') || null; })()`);
  const baseColor = await dotColor();
  assert(baseColor !== null, 'deepseek-v4-flash has a palette color');
  await click('[data-action=tr-range-7]');
  await until('document.querySelectorAll(".dss-tr-col").length === 7');
  assert.equal(await dotColor(), baseColor, 'color survives the 7-day range');
  await click('[data-action=tr-range-90]');
  await until('document.querySelectorAll(".dss-tr-col").length === 90');
  assert.equal(await dotColor(), baseColor, 'color survives the 90-day range');
  await click('[data-action=tr-metric-token]');
  await until('document.querySelector(".dss-tr-mtable th.c-tokens").getAttribute("aria-sort") === "descending"');
  assert.equal(await dotColor(), baseColor, 'color survives the token metric');
  await openFilter();
  await click('.dss-filter-item[data-project-id="client-dashboard"] input');
  await closeFilter();
  assert.equal(await dotColor(), baseColor, 'color survives hiding another project');
  await openFilter();
  await click('[data-action=filter-show-all]');
  await closeFilter();
  await click('[data-action=tr-range-30]');
  await until('document.querySelectorAll(".dss-tr-col").length === 30');
  await click('[data-action=tr-metric-cost]');
  // 22. 模型待计价
  await navigate('/?stats=partial&lang=zh');
  await click('.dss-trigger'); await tab(3);
  await until('document.querySelector(".dss-tr-models")');
  const unpricedRow = await evaluate(`(() => {
    const row = [...document.querySelectorAll('.dss-tr-mrow')].find(node => node.dataset.modelKey.includes('fixture-unpriced'));
    if (!row) return null;
    const cell = row.querySelector('.c-cost');
    const text = cell ? cell.textContent : '';
    return {
      chip: !!row.querySelector('[data-action=pricing-pending]'),
      amt: !!row.querySelector('.dss-cost-amt'),
      pendingCount: text.split('待计价').length - 1
    };
  })()`);
  assert(unpricedRow && unpricedRow.chip, 'unpriced model row carries a compact pending chip: ' + JSON.stringify(unpricedRow));
  assert(!unpricedRow.amt, 'a fully unpriced row drops the duplicate amount: ' + JSON.stringify(unpricedRow));
  assert(unpricedRow.pendingCount === 1, 'a fully unpriced row says pending exactly once: ' + JSON.stringify(unpricedRow));
  await click('.dss-tr-mrow .c-cost [data-action=pricing-pending]');
  await until('document.querySelector(".dss-drawer")');
  await until(`(() => { const input = [...document.querySelectorAll('.dss-pricing input')].find(node => node.getAttribute('aria-label') === window.__fixture.t('price.model')); return input && input.value === 'fixture-unpriced'; })()`);
  await press('Escape'); await until('!document.querySelector(".dss-drawer")');
  report.checks.push('trends models: two sortable rows and cost-descending default, metric switch resets the sort, shares add up, ring aria-label, stable colors across range/metric/hidden, partial model pending chip opens the pricing drawer, fully unpriced row says pending once');
  report.checks.push('slice 5j: the showcase fixture now spans 26 weeks and four models, and feeds the README trends, timeline and overview shots');

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
