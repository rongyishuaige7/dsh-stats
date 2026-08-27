import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { once } from "node:events";
import WebSocket from "ws";

const targetUrl = process.env.DSH_RC2_URL || "http://127.0.0.1:58538/";
const chromePath = process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const configuredTimeoutMs = Number(process.env.DSH_SMOKE_TIMEOUT_MS);
const timeoutMs = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0 ? configuredTimeoutMs : 45_000;

function redact(value) {
	return String(value ?? "")
		.replace(/(Bearer\s+)[^\s"']+/gi, "$1[redacted]")
		.replace(/([?&](?:key|token|api_key|apikey|authorization)=)[^&\s]+/gi, "$1[redacted]")
		.slice(0, 500);
}

function pageUrl(value) {
	try {
		const url = new URL(value);
		return `${url.origin}${url.pathname}`;
	} catch {
		return redact(value);
	}
}

async function freePort() {
	const server = createServer();
	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	const port = server.address().port;
	await new Promise((resolve) => server.close(resolve));
	return port;
}

async function waitForJson(url, deadline) {
	let lastError;
	while (Date.now() < deadline) {
		try {
			const response = await fetch(url);
			if (response.ok) return await response.json();
			lastError = new Error(`HTTP ${response.status}`);
		} catch (error) {
			lastError = error;
		}
		await delay(100);
	}
	throw lastError || new Error(`timed out waiting for ${url}`);
}

async function waitForPage(page, expression, deadline, description) {
	let lastValue;
	while (Date.now() < deadline) {
		try {
			lastValue = await page.evaluate(expression);
			if (lastValue) return lastValue;
		} catch (error) {
			lastValue = error?.message || String(error);
		}
		await delay(150);
	}
	throw new Error(`${description || "page condition"} timed out${lastValue ? ` (${redact(lastValue)})` : ""}`);
}

class CdpPage {
	constructor(url, result) {
		this.url = url;
		this.result = result;
		this.socket = null;
		this.nextId = 0;
		this.pending = new Map();
		this.requestUrls = new Map();
	}

	async connect() {
		this.socket = new WebSocket(this.url);
		this.socket.on("message", (raw) => {
			const message = JSON.parse(raw.toString());
			if (message.id && this.pending.has(message.id)) {
				const pending = this.pending.get(message.id);
				this.pending.delete(message.id);
				pending(message);
			}
			if (message.method === "Runtime.consoleAPICalled") {
				const text = (message.params.args || []).map((arg) => arg.value ?? arg.description ?? "").join(" ");
				if (message.params.type === "error") this.result.consoleErrors.push(redact(text));
			}
			if (message.method === "Runtime.exceptionThrown") {
				this.result.runtimeExceptions.push(redact(message.params.exceptionDetails?.text || message.params.exceptionDetails?.exception?.description));
			}
			if (message.method === "Log.entryAdded" && message.params.entry?.level === "error") {
				this.result.consoleErrors.push(redact(message.params.entry.text));
			}
			if (message.method === "Network.loadingFailed") {
				this.result.failedRequests.push({ url: pageUrl(this.requestUrls.get(message.params.requestId) || message.params.requestId), error: redact(message.params.errorText) });
				this.requestUrls.delete(message.params.requestId);
			}
			if (message.method === "Network.requestWillBeSent") {
				this.requestUrls.set(message.params.requestId, message.params.request?.url || "");
			}
		});
		await new Promise((resolve, reject) => {
			this.socket.once("open", resolve);
			this.socket.once("error", reject);
		});
		await this.command("Page.enable");
		await this.command("Runtime.enable");
		await this.command("Log.enable");
		await this.command("Network.enable");
	}

	command(method, params = {}) {
		return new Promise((resolve, reject) => {
			const id = ++this.nextId;
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(new Error(`${method} timed out`));
			}, 8_000);
			this.pending.set(id, (message) => {
				clearTimeout(timer);
				if (message.error) reject(new Error(message.error.message || method));
				else resolve(message.result || {});
			});
			this.socket.send(JSON.stringify({ id, method, params }));
		});
	}

	async evaluate(expression) {
		const result = await this.command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
		if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "runtime evaluation failed");
		return result.result?.value;
	}

	async clickButton({ text, aria }) {
		const encodedText = JSON.stringify(text || "");
		const encodedAria = JSON.stringify(aria || "");
		return this.evaluate(`(() => {
			const wantedText = ${encodedText};
			const wantedAria = ${encodedAria};
			const button = [...document.querySelectorAll("button")].find((node) =>
				(wantedAria && node.getAttribute("aria-label") === wantedAria) ||
				(wantedText && node.innerText.trim() === wantedText));
			if (!button) return false;
			button.click();
			return true;
		})()`);
	}

	async clickText(texts, selector = "button") {
		const wanted = JSON.stringify(Array.isArray(texts) ? texts : [texts]);
		return this.evaluate(`(() => {
			const wanted = ${wanted};
			const node = [...document.querySelectorAll(${JSON.stringify(selector)})].find((candidate) => wanted.includes(candidate.innerText.trim()));
			if (!node) return false;
			node.click();
			return true;
		})()`);
	}

	close() {
		if (this.socket && this.socket.readyState === WebSocket.OPEN) this.socket.close();
	}
}

const startedAt = new Date().toISOString();
const result = {
	targetUrl,
	startedAt,
	status: "blocked",
	panel: false,
	dataVisible: false,
	onboardingDismissed: false,
	workspaceSelection: "not-attempted",
	consoleErrors: [],
	runtimeExceptions: [],
	failedRequests: [],
	artifacts: {}
};

let chrome;
let userDataDir;
let page;
try {
	const deadline = Date.now() + timeoutMs;
	const port = await freePort();
	userDataDir = mkdtempSync(join(tmpdir(), "dsh-stats-rc2-smoke-"));
	chrome = spawn(chromePath, [
		"--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage",
		`--user-data-dir=${userDataDir}`, `--remote-debugging-port=${port}`,
		"--window-size=1440,1000", "about:blank"
	], { stdio: ["ignore", "pipe", "pipe"] });
	chrome.stderr.on("data", () => {});
	const version = await waitForJson(`http://127.0.0.1:${port}/json/version`, deadline);
	const tabs = await waitForJson(`http://127.0.0.1:${port}/json`, deadline);
	const tab = tabs.find((item) => item.type === "page");
	if (!tab?.webSocketDebuggerUrl) throw new Error("Chrome did not expose a page target");
	page = new CdpPage(tab.webSocketDebuggerUrl, result);
	await page.connect();
	await page.command("Page.navigate", { url: targetUrl });
	await waitForPage(page, "(document.body?.innerText || '').trim() && !(document.body?.innerText || '').includes('Loading plugins') && !(document.body?.innerText || '').includes('加载插件')", deadline, "DSH shell");
	result.initialText = (await page.evaluate("document.body?.innerText || \"\""))?.slice(0, 1_000) || "";
	result.pluginLoaded = Boolean(await page.evaluate("document.documentElement.outerHTML.includes('@rongyi7/dsh-stats')"));

	if (await page.clickButton({ text: "继续" })) {
		result.onboardingDismissed = true;
		await delay(500);
	}
	// API-key onboarding can cover the app but still permits the stats action.
	const skippedApiKey = await page.clickButton({ text: "稍后配置" });
	if (skippedApiKey) result.onboardingDismissed = true;
	if (await page.clickButton({ aria: "选择工作区" })) {
		result.workspaceSelection = "clicked";
		await delay(300);
		const options = await page.evaluate("[...document.querySelectorAll('[role=option], [role=dialog] button')].map((node) => node.innerText.trim()).filter(Boolean)");
		result.workspaceOptions = options?.slice(0, 20) || [];
		if (result.workspaceOptions.length === 0) result.workspaceSelection = "no-options";
	}
	const statsClicked = (await page.clickButton({ aria: "统计" })) || (await page.clickButton({ text: "统计" })) || (await page.clickButton({ aria: "Stats" })) || (await page.clickButton({ text: "Stats" }));
	if (!statsClicked) throw new Error("统计/Stats entry button not found");
	await waitForPage(page, "Boolean(document.querySelector('.dss-panel'))", deadline, "stats panel");
	result.panel = true;
	result.dataVisible = Boolean(await page.evaluate("document.querySelector('.dss-panel')?.innerText.includes('项目统计') || document.querySelector('.dss-panel')?.innerText.includes('Project Stats')"));
	result.panelText = (await page.evaluate("document.querySelector('.dss-panel')?.innerText || ''"))?.slice(0, 1_500) || "";
	const accountClicked = (await page.clickText(["账户余额", "Account Balance"], ".dss-panel button"));
	if (!accountClicked) throw new Error("账户余额/Account Balance tab not found");
	await waitForPage(page, "Boolean(document.querySelector('.dss-balance, .dss-balance-state.error'))", deadline, "account balance view");
	result.accountTab = true;
	result.accountText = (await page.evaluate("document.querySelector('.dss-panel')?.innerText || ''"))?.slice(0, 2_000) || "";
	result.providers = await page.evaluate("[...document.querySelectorAll('.dss-provider-picker option')].map((option) => option.textContent.trim()).filter(Boolean)");
	result.yiApiPresent = result.providers.some((name) => name.toLowerCase() === "yi-api");
	if (result.yiApiPresent) {
		const selected = await page.evaluate(`(() => {
			const select = document.querySelector('.dss-provider-picker select');
			if (!select) return false;
			const option = [...select.options].find((item) => item.value === 'yi-api' || item.textContent.trim().toLowerCase() === 'yi-api');
			if (!option) return false;
			select.value = option.value;
			select.dispatchEvent(new Event('change', { bubbles: true }));
			return true;
		})()`);
		if (!selected) throw new Error("yi-api provider option could not be selected");
		await waitForPage(page, "(document.querySelector('.dss-balance-name')?.textContent || '').trim().toLowerCase() === 'yi-api'", deadline, "yi-api account card");
		result.yiApiText = (await page.evaluate("document.querySelector('.dss-panel')?.innerText || ''"))?.slice(0, 2_000) || "";
		const yiApiLower = result.yiApiText.toLowerCase();
		result.yiApiVisible = yiApiLower.includes("yi-api");
		result.yiApiNotUnknown = !yiApiLower.includes("unknown");
		result.yiApiHealthy = result.yiApiText.includes("正常") || yiApiLower.includes("ok") || yiApiLower.includes("healthy");
		result.yiApiUsdBalance = yiApiLower.includes("usd") && /[0-9]/.test(result.yiApiText);
		if (!result.yiApiVisible || !result.yiApiNotUnknown || !result.yiApiHealthy || !result.yiApiUsdBalance) {
			throw new Error("yi-api account card did not show a healthy non-unknown USD balance");
		}
	} else {
		result.note = "runtime 中未配置 yi-api，已完成账户页渲染检查";
	}
	const screenshotDir = process.env.DSH_SMOKE_ARTIFACT_DIR;
	if (screenshotDir) {
		const desktop = await page.command("Page.captureScreenshot", { format: "png" });
		result.artifacts.desktop = join(screenshotDir, "rc2-desktop.png");
		const { writeFileSync, mkdirSync } = await import("node:fs");
		mkdirSync(screenshotDir, { recursive: true });
		writeFileSync(result.artifacts.desktop, Buffer.from(desktop.data, "base64"));
		await page.command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
		const mobile = await page.command("Page.captureScreenshot", { format: "png" });
		result.artifacts.mobile = join(screenshotDir, "rc2-mobile.png");
		writeFileSync(result.artifacts.mobile, Buffer.from(mobile.data, "base64"));
	}
	result.status = result.panel && result.dataVisible && result.accountTab ? "passed" : "blocked";
	if (!result.panel) result.blockedReason = "统计入口未能渲染 .dss-panel";
	else if (!result.dataVisible) result.blockedReason = "统计面板未显示预期标题";
	else if (!result.accountTab) result.blockedReason = "账户余额页未能渲染";
	else if (result.workspaceSelection === "no-options") result.note = "rc2 runtime 面板通过，但隔离实例没有可选择的 workspace，数据为空";
	result.chromeVersion = version.Browser || null;
} catch (error) {
	result.status = "blocked";
	result.blockedReason = redact(error?.message || error);
} finally {
	page?.close();
	if (chrome && !chrome.killed) {
		chrome.kill("SIGTERM");
		await Promise.race([once(chrome, "exit"), delay(1_000)]);
	}
	if (userDataDir) {
		try { rmSync(userDataDir, { recursive: true, force: true }); }
		catch (error) { result.cleanupWarning = redact(error?.message || error); }
	}
}

result.finishedAt = new Date().toISOString();
console.log(JSON.stringify(result, null, 2));
if (result.status !== "passed") process.exitCode = 1;
