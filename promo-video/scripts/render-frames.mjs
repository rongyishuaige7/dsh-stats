import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import WebSocket from 'ws';

const chromeBinary = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function readArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const startFrame = Number.parseInt(readArgument('--start', '0'), 10);
const endFrame = Number.parseInt(readArgument('--end', '96'), 10);
const outputDirectory = path.resolve(readArgument('--output', 'promo-video/pilot/frames'));
const compositionPath = path.resolve(readArgument('--composition', 'promo-video/src/composition.html'));
const quality = Number.parseInt(readArgument('--quality', '92'), 10);

if (!Number.isInteger(startFrame) || !Number.isInteger(endFrame) || endFrame <= startFrame) {
  throw new Error('Expected integer --start and --end values with end > start');
}

if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
  throw new Error('--quality must be an integer between 1 and 100');
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForDevTools(profileDirectory) {
  const activePortPath = path.join(profileDirectory, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const [portLine] = (await readFile(activePortPath, 'utf8')).trim().split('\n');
      if (portLine) return Number.parseInt(portLine, 10);
    } catch {
      // Chrome creates this file after the remote debugger is ready.
    }
    await wait(50);
  }
  throw new Error('Chrome remote debugger did not become ready');
}

async function createClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let nextId = 1;

  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });

  socket.on('message', (rawMessage) => {
    const message = JSON.parse(rawMessage.toString());
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });

  return {
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() {
      socket.close();
    },
  };
}

async function waitForComposition(client) {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const result = await client.send('Runtime.evaluate', {
      expression: '({ ready: window.__READY__, error: window.__LOAD_ERROR__ })',
      returnByValue: true,
    });
    const status = result.result.value;
    if (status?.error) throw new Error(status.error);
    if (status?.ready) return;
    await wait(50);
  }
  throw new Error('Composition assets did not become ready');
}

async function render() {
  await mkdir(outputDirectory, { recursive: true });
  const profileDirectory = await mkdtemp(path.join(tmpdir(), 'dsh-promo-chrome-'));
  const chrome = spawn(chromeBinary, [
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--mute-audio',
    '--allow-file-access-from-files',
    '--force-device-scale-factor=1',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDirectory}`,
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    const port = await waitForDevTools(profileDirectory);
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
    const pageTarget = targets.find((target) => target.type === 'page');
    if (!pageTarget) throw new Error('Chrome did not expose a page target');

    const client = await createClient(pageTarget.webSocketDebuggerUrl);
    try {
      await client.send('Page.enable');
      await client.send('Runtime.enable');
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await client.send('Page.navigate', { url: pathToFileURL(compositionPath).href });
      await waitForComposition(client);

      for (let frame = startFrame; frame < endFrame; frame += 1) {
        const rendered = await client.send('Runtime.evaluate', {
          expression: `window.renderFrame(${frame})`,
          returnByValue: true,
        });
        if (rendered.exceptionDetails) {
          throw new Error(rendered.exceptionDetails.text || `Frame ${frame} failed`);
        }
        const screenshot = await client.send('Page.captureScreenshot', {
          format: 'jpeg',
          quality,
          fromSurface: true,
          captureBeyondViewport: false,
        });
        const filename = `frame-${String(frame).padStart(4, '0')}.jpg`;
        await writeFile(path.join(outputDirectory, filename), Buffer.from(screenshot.data, 'base64'));
        if (frame === startFrame || (frame + 1) % 24 === 0 || frame === endFrame - 1) {
          process.stdout.write(`Rendered ${frame + 1 - startFrame}/${endFrame - startFrame} frames\n`);
        }
      }
    } finally {
      client.close();
    }
  } finally {
    chrome.kill('SIGTERM');
    await new Promise((resolve) => chrome.once('exit', resolve));
    await rm(profileDirectory, { recursive: true, force: true });
  }
}

await render();
