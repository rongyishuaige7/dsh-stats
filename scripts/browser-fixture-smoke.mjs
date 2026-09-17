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
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DSH Stats Fixture</title><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;letter-spacing:0;background:#f4f5f6;--dsw-specific-menu:#fff;--dsw-alias-label-primary:#20242b;--dsw-alias-label-secondary:#565e6b;--dsw-alias-label-tertiary:#707986;--dsw-alias-border:#dce0e5;--dsw-alias-border-inverted:#dce0e5}</style></head><body><div id="app"></div><script src="/runtime.js"></script><script src="/client.js"></script></body></html>';
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1').pathname;
  const [type, body] = path === '/runtime.js' ? ['text/javascript', runtime.outputFiles[0].contents]
    : path === '/client.js' ? ['text/javascript', client] : path === '/data' ? ['application/json', JSON.stringify(data)] : ['text/html', html];
  response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); response.end(body);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = 'http://127.0.0.1:' + server.address().port;
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
  assert(await evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!node) return false; node.click(); return true; })()`), selector);
  await delay(100);
}
async function refresh() { await click('.dss-head-actions .dss-export'); }
async function tab(index) { await click('.dss-tabs button:nth-child(' + index + ')'); }
async function capture(name) {
  const result = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const filename = name + '.png'; writeFileSync(join(output, filename), Buffer.from(result.data, 'base64')); report.screenshots.push(filename);
}
async function layout(name) {
  const issues = await evaluate(`(() => {
    const selectors = ['.dss-head','.dss-tabs','.dss-data-status','.dss-balance-head','.dss-balance-account','.dss-hero','.dss-card'];
    return selectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(node => node.getClientRects().length && node.scrollWidth > node.clientWidth + 2).map(node => selector + ': ' + node.scrollWidth + ' > ' + node.clientWidth));
  })()`);
  assert.deepEqual(issues, [], name + ' content overflow');
  const pageSize = await evaluate(`({ width: innerWidth, scroll: document.documentElement.scrollWidth, nodes: [...document.querySelectorAll('body *')].filter(node => node.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map(node => [node.className, node.getBoundingClientRect().right]) })`);
  assert(pageSize.scroll <= pageSize.width + 1, name + ' page overflow: ' + JSON.stringify(pageSize));
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
  for (const [name, width, height, lang] of [['desktop',1440,1000,'zh'], ['mobile',390,844,'zh'], ['narrow',320,740,'en']]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await command('Page.navigate', { url: url + '/?lang=' + lang });
    await until('window.__fixture?.ready');
    await click('.dss-trigger');
    await tab(1);
    await until('document.querySelector(".dss-data-status.exact")');
    await until('document.querySelector(".dss-data-cost")?.textContent === window.__fixture.t("pricing.estimated")');
    for (const [index, view] of [[1,'overview'],[2,'timeline'],[3,'trends'],[4,'balance']]) {
      await tab(index); await layout(name + '-' + view); await capture(name + '-' + view);
      if (width < 600 && ['overview', 'trends'].includes(view)) {
        await evaluate('document.querySelector(".dss-overlay").scrollTop = 10000');
        await capture(name + '-' + view + '-bottom');
        await evaluate('document.querySelector(".dss-overlay").scrollTop = 0');
      }
    }
    await evaluate(`(() => { const select=document.querySelector('.dss-provider-picker select'); select.value='minimax-coding'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await until('document.querySelector(".dss-balance-plan")?.textContent === "Professional Coding Plan"');
    await layout(name + '-subscription'); await capture(name + '-subscription');
    report.checks.push(name + ': all four tabs, provider selection and layout');
  }
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
  await until('document.querySelector(".dss-data-cost")?.textContent === window.__fixture.t("pricing.partial")');
  await click('.dss-data-diagnostics summary'); await layout('partial'); await capture('narrow-partial');
  await evaluate('window.__fixture.statsMode = "unsupported"'); await refresh();
  await until('document.querySelector(".dss-data-cost")?.textContent === window.__fixture.t("pricing.unsupported")');
  await layout('unsupported'); await capture('narrow-unsupported');
  await evaluate('window.__fixture.statsMode = "error"'); await refresh();
  await until('document.querySelector(".dss-data-status.stale")');
  await layout('stale'); await capture('narrow-stale');
  await command('Page.navigate', { url: url + '/?stats=error&lang=en' });
  await until('window.__fixture?.ready'); await click('.dss-trigger');
  await until('document.querySelector(".dss-data-status.fallback")');
  assert(await evaluate('document.querySelector(".dss-data-status").textContent.includes(window.__fixture.t("source.local"))'));
  await layout('fallback'); await capture('narrow-fallback');
  report.checks.push('estimated/partial/unsupported pricing, diagnostics, stale host data and local fallback');
  await command('Page.navigate', { url: url + '/?theme=dark&lang=en' });
  await until('window.__fixture?.ready'); await click('.dss-trigger'); await tab(4);
  await evaluate('window.__fixture.accountMode = "stale"'); await refresh();
  await until('document.querySelector(".dss-balance-status.stale")');
  await layout('dark-stale-balance'); await capture('narrow-dark-stale-balance');
  report.checks.push('dark-theme stale account state');
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
