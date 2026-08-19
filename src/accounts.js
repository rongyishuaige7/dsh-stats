/*
 * Provider account registry.
 *
 * Secrets are resolved through the Harness credentials service and never leave
 * this module. Only documented, provider-owned HTTPS endpoints are queried.
 */

import pricing from "./pricing.cjs";

const { normalizeAccountType, providerFamilyOf } = pricing;
const CACHE_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15 * 1000;
const MAX_RESPONSE_BYTES = 1024 * 1024;

const STATUS_MESSAGES = {
	"not-configured": "credential is not configured",
	unauthorized: "credential is invalid or lacks permission",
	"rate-limited": "provider rate limit reached",
	unavailable: "provider account service is unavailable",
	"invalid-response": "provider returned an invalid account response",
	blocked: "provider account endpoint was blocked by the safety policy",
	unsupported: "provider has no supported public account endpoint"
};

const DEFAULTS = {
	deepseek: { apiKeyRef: "DEEPSEEK_API_KEY", baseURL: "https://api.deepseek.com", actionUrl: "https://platform.deepseek.com/top_up" },
	openrouter: { apiKeyRef: "OPENROUTER_MANAGEMENT_KEY", baseURL: "https://openrouter.ai", actionUrl: "https://openrouter.ai/credits" },
	moonshot: { apiKeyRef: "MOONSHOT_API_KEY", baseURL: "https://api.moonshot.cn", actionUrl: "https://platform.moonshot.cn/console/account" },
	zai: { apiKeyRef: "ZAI_API_KEY", baseURL: "https://api.z.ai", actionUrl: "https://z.ai/manage-apikey/apikey-list" },
	kimi: { apiKeyRef: "KIMI_API_KEY", baseURL: "https://api.kimi.com", actionUrl: "https://www.kimi.com/code/console" },
	minimax: { apiKeyRef: "MINIMAX_API_KEY", baseURL: "https://www.minimax.io", actionUrl: "https://platform.minimaxi.com/console/usage" }
};

class AccountError extends Error {
	constructor(status, code = status) {
		super(STATUS_MESSAGES[status] || "provider account query failed");
		this.name = "AccountError";
		this.status = status;
		this.code = code;
	}
}

function nonEmpty(value) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

function nonNegativeOrNull(value) {
	const parsed = numberOrNull(value);
	return parsed !== null && parsed >= 0 ? parsed : null;
}

function clampPercent(value) {
	const parsed = numberOrNull(value);
	return parsed === null ? null : Math.round(Math.max(0, Math.min(100, parsed)) * 10) / 10;
}

function timestampOrNull(value) {
	if (value === null || value === undefined || value === "") return null;
	const parsed = typeof value === "number" && Number.isFinite(value)
		? new Date(value < 20_000_000_000 ? value * 1000 : value)
		: new Date(String(value));
	return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function serviceFrom(ctx, name) {
	try {
		return ctx?.reflect?.get?.(name, false) || ctx?.get?.(name) || ctx?.[name] || null;
	} catch {
		return ctx?.[name] || null;
	}
}

async function setting(settings, name) {
	try { return await settings?.get?.(name); } catch { return null; }
}

function displayName(id, configured) {
	return nonEmpty(configured) || ({
		"deepseek-official": "DeepSeek",
		openrouter: "OpenRouter",
		moonshotai: "Moonshot",
		"moonshotai-cn": "Moonshot",
		kimi: "Kimi",
		"kimi-coding": "Kimi For Coding",
		zai: "Z.ai",
		"zai-coding-cn": "Z.ai Coding Plan",
		minimax: "MiniMax",
		"minimax-cn": "MiniMax"
	}[id] || id);
}

/** Enumerate connection metadata from Harness settings without resolving keys. */
async function configuredProviders(ctx) {
	const settings = serviceFrom(ctx, "settings");
	const deepseek = await setting(settings, "llm-deepseek");
	const providers = [{
		id: "deepseek-official",
		displayName: "DeepSeek",
		apiKeyRef: nonEmpty(deepseek?.apiKeyEnv),
		accountApiKeyRef: nonEmpty(deepseek?.accountApiKeyEnv),
		baseURL: nonEmpty(deepseek?.baseURL) || DEFAULTS.deepseek.baseURL,
		accountType: nonEmpty(deepseek?.accountType) || "api"
	}];
	const pi = await setting(settings, "llm-pi-ai");
	if (pi && typeof pi === "object" && pi.providers && typeof pi.providers === "object") {
		for (const [id, profile] of Object.entries(pi.providers)) {
			if (!profile || typeof profile !== "object" || !nonEmpty(id)) continue;
			providers.push({
				id,
				displayName: displayName(id, profile.displayName),
				apiKeyRef: nonEmpty(profile.apiKeyEnv),
				accountApiKeyRef: nonEmpty(profile.accountApiKeyEnv),
				baseURL: nonEmpty(profile.baseURL),
				accountType: nonEmpty(profile.accountType) || nonEmpty(profile.billingMode)
			});
		}
	}
	const unique = new Map();
	for (const provider of providers) if (!unique.has(provider.id)) unique.set(provider.id, provider);
	return [...unique.values()];
}

function accountSpec(provider) {
	const id = String(provider.id || "unknown").toLowerCase();
	const family = providerFamilyOf(id);
	const configuredAccountType = nonEmpty(provider.accountType);
	const accountType = normalizeAccountType(configuredAccountType || (family === "minimax" ? "token-plan" : "api"));
	const subscription = accountType === "subscription" || accountType === "token-plan";
	let adapter = null, mode = "unsupported", defaults = null;
	if (id === "deepseek" || id === "deepseek-official") { adapter = "deepseek-balance"; mode = "balance"; defaults = DEFAULTS.deepseek; }
	else if (id === "openrouter") { adapter = "openrouter-balance"; mode = "balance"; defaults = DEFAULTS.openrouter; }
	else if (["moonshotai", "moonshotai-cn", "kimi", "kimi-api"].includes(id) && !subscription) { adapter = "moonshot-balance"; mode = "balance"; defaults = DEFAULTS.moonshot; }
	else if (["kimi-coding", "kimi-for-coding"].includes(id) || family === "moonshot" && subscription) { adapter = "kimi-token-plan"; mode = "subscription"; defaults = DEFAULTS.kimi; }
	else if (["zai-coding-cn", "zai-coding"].includes(id) || family === "zai" && subscription) { adapter = "zai-token-plan"; mode = "subscription"; defaults = DEFAULTS.zai; }
	else if (family === "zai") { adapter = "zai-balance"; mode = "balance"; defaults = DEFAULTS.zai; }
	else if (family === "minimax") {
		defaults = DEFAULTS.minimax;
		if (subscription) { adapter = "minimax-token-plan"; mode = "subscription"; }
	}
	// OpenRouter's credits endpoint requires a Management Key. Keep its
	// account-specific reference separate from the normal inference API key.
	const apiKeyRef = adapter === "openrouter-balance"
		? nonEmpty(provider.accountApiKeyRef) || DEFAULTS.openrouter.apiKeyRef
		: nonEmpty(provider.accountApiKeyRef) || nonEmpty(provider.apiKeyRef) || defaults?.apiKeyRef || null;
	return {
		id: provider.id,
		displayName: displayName(provider.id, provider.displayName),
		providerFamily: family,
		adapter,
		mode,
		apiKeyRef,
		baseURL: nonEmpty(provider.baseURL) || defaults?.baseURL || null,
		actionUrl: defaults?.actionUrl || null,
		accountType
	};
}

function allowedUrl(baseURL, path, allowedHosts) {
	let base;
	try { base = new URL(baseURL); } catch { throw new AccountError("blocked", "invalid-url"); }
	if (base.protocol !== "https:" || base.username || base.password || !allowedHosts.includes(base.hostname.toLowerCase())) {
		throw new AccountError("blocked", "endpoint-not-allowed");
	}
	return new URL(path, base.origin).href;
}

function httpStatus(status) {
	if (status === 401 || status === 403) return "unauthorized";
	if (status === 429) return "rate-limited";
	if (status === 404 || status === 405) return "unsupported";
	return status >= 500 ? "unavailable" : "invalid-response";
}

async function responseJson(response) {
	const declared = numberOrNull(response?.headers?.get?.("content-length"));
	if (declared !== null && declared > MAX_RESPONSE_BYTES) throw new AccountError("invalid-response", "response-too-large");
	if (typeof response?.arrayBuffer === "function") {
		const bytes = new Uint8Array(await response.arrayBuffer());
		if (bytes.byteLength > MAX_RESPONSE_BYTES) throw new AccountError("invalid-response", "response-too-large");
		try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new AccountError("invalid-response", "invalid-json"); }
	}
	try { return await response.json(); } catch { throw new AccountError("invalid-response", "invalid-json"); }
}

async function requestJson(url, headers, deps) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), deps.timeoutMs || REQUEST_TIMEOUT_MS);
	try {
		let response;
		try {
			response = await (deps.fetch || globalThis.fetch)(url, {
				method: "GET",
				headers: { accept: "application/json", ...headers },
				redirect: "error",
				signal: controller.signal
			});
		} catch (error) {
			if (controller.signal.aborted || error?.name === "AbortError" || error?.name === "TimeoutError") throw new AccountError("unavailable", "timeout");
			throw new AccountError("unavailable", "transport-failed");
		}
		if (!response?.ok) throw new AccountError(httpStatus(Number(response?.status)), `http-${response?.status || 0}`);
		return await responseJson(response);
	} finally {
		clearTimeout(timer);
	}
}

async function resolveCredential(credentials, ref) {
	if (!ref || !credentials || typeof credentials.resolve !== "function") return "";
	try {
		const hit = await credentials.resolve(ref);
		return nonEmpty(typeof hit === "string" ? hit : hit?.value) || "";
	} catch {
		return "";
	}
}

function emptyAccount(spec, status, now, code = status) {
	return {
		id: spec.id,
		displayName: spec.displayName,
		providerFamily: spec.providerFamily,
		mode: spec.mode,
		adapter: spec.adapter,
		status,
		stale: false,
		fetchedAt: now,
		lastSuccessAt: null,
		errorCode: status === "ok" ? null : code,
		missingCredential: status === "not-configured" ? spec.apiKeyRef : null,
		actionUrl: spec.actionUrl,
		balance: null,
		plan: null,
		windows: []
	};
}

function balanceView(currency, remaining, fields = {}) {
	if (!nonEmpty(currency) || nonNegativeOrNull(remaining) === null) throw new AccountError("invalid-response");
	return {
		currency: String(currency).toUpperCase(),
		remaining: nonNegativeOrNull(remaining),
		used: nonNegativeOrNull(fields.used),
		total: nonNegativeOrNull(fields.total),
		toppedUp: nonNegativeOrNull(fields.toppedUp),
		granted: nonNegativeOrNull(fields.granted),
		unlimited: fields.unlimited === true
	};
}

function windowView(kind, used, remaining, reset) {
	let usedPercent = clampPercent(used), remainingPercent = clampPercent(remaining);
	if (usedPercent === null && remainingPercent !== null) usedPercent = Math.round((100 - remainingPercent) * 10) / 10;
	if (remainingPercent === null && usedPercent !== null) remainingPercent = Math.round((100 - usedPercent) * 10) / 10;
	if (usedPercent === null || remainingPercent === null) return null;
	return { kind, usedPercent, remainingPercent, resetsAt: timestampOrNull(reset) };
}

function limitWindow(value, kind) {
	if (!value || typeof value !== "object") return null;
	const total = nonNegativeOrNull(value.limit ?? value.total);
	const remaining = nonNegativeOrNull(value.remaining);
	if (total === null || remaining === null || total <= 0) return null;
	return windowView(kind, (total - remaining) / total * 100, remaining / total * 100, value.resetTime ?? value.reset_time ?? value.resetsAt);
}

function parseMiniMax(body, now) {
	const code = numberOrNull(body?.base_resp?.status_code ?? body?.baseResp?.statusCode);
	if (code !== null && code !== 0) return [];
	const remains = Array.isArray(body?.model_remains) ? body.model_remains : Array.isArray(body?.data?.model_remains) ? body.data.model_remains : [];
	const row = remains.find((entry) => String(entry?.model_name ?? entry?.modelName ?? "").toLowerCase() === "general")
		|| remains.find((entry) => /^(minimax-m|coding-plan)/i.test(String(entry?.model_name ?? entry?.modelName ?? "")));
	if (!row) return [];
	const percentage = (prefix, camel) => {
		const remaining = clampPercent(row[`${prefix}_remaining_percent`] ?? row[`${camel}RemainingPercent`]);
		if (remaining !== null) return remaining;
		const total = nonNegativeOrNull(row[`${prefix}_total_count`] ?? row[`${camel}TotalCount`]);
		const used = nonNegativeOrNull(row[`${prefix}_usage_count`] ?? row[`${camel}UsageCount`]);
		if (total !== null && total > 0 && used !== null) return clampPercent((1 - used / total) * 100);
		const status = numberOrNull(row[`${prefix}_status`] ?? row[`${camel}Status`]);
		if (status === 2) return 0;
		if (status === 3) return 100;
		return null;
	};
	const sessionRemaining = percentage("current_interval", "currentInterval");
	const weeklyRemaining = percentage("current_weekly", "currentWeekly");
	const durationReset = (value) => nonNegativeOrNull(value) === null ? null : now + Number(value);
	return [
		sessionRemaining === null ? null : windowView("session", 100 - sessionRemaining, sessionRemaining, row.current_interval_end_time ?? row.currentIntervalEndTime ?? durationReset(row.remains_time ?? row.remainsTime)),
		weeklyRemaining === null ? null : windowView("weekly", 100 - weeklyRemaining, weeklyRemaining, row.current_weekly_end_time ?? row.currentWeeklyEndTime ?? durationReset(row.weekly_remains_time ?? row.weeklyRemainsTime))
	].filter(Boolean);
}

function zaiWindowMinutes(limit) {
	const unit = numberOrNull(limit?.unit);
	const count = numberOrNull(limit?.number);
	if (unit === null || count === null || count <= 0) return null;
	if (unit === 5) return count;
	if (unit === 3) return count * 60;
	if (unit === 1) return count * 24 * 60;
	if (unit === 6) return count * 7 * 24 * 60;
	return null;
}

function zaiUsedPercent(limit) {
	const total = nonNegativeOrNull(limit?.usage);
	const remaining = nonNegativeOrNull(limit?.remaining);
	const current = nonNegativeOrNull(limit?.currentValue ?? limit?.current_value);
	if (total !== null && total > 0) {
		const used = remaining === null ? current : current === null ? total - remaining : Math.max(total - remaining, current);
		if (used !== null) return clampPercent(Math.max(0, Math.min(total, used)) / total * 100);
	}
	return clampPercent(limit?.percentage ?? limit?.usedPercent ?? limit?.used_percent);
}

function displayPlan(value) {
	return String(value ?? "").trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").replace(/\bglm\b/gi, "GLM").replace(/\b\w/g, (char) => char.toUpperCase());
}

function zaiPlan(quota, subscription) {
	const row = Array.isArray(subscription?.data) ? subscription.data.find((entry) => entry && typeof entry === "object") : null;
	for (const source of [row, quota?.data]) {
		for (const key of ["product_name", "productName", "plan_name", "planName", "package_name", "packageName", "plan_type", "planType", "level"]) {
			const value = displayPlan(source?.[key]);
			if (value) return value;
		}
	}
	return "GLM Coding Plan";
}

function zaiWindow(limit, kind, fallbackReset = null) {
	const used = zaiUsedPercent(limit);
	return used === null ? null : windowView(kind, used, 100 - used, limit?.nextResetTime ?? limit?.next_reset_time ?? fallbackReset);
}

async function queryBalance(spec, key, deps, now) {
	let url, body, balance;
	if (spec.adapter === "deepseek-balance") {
		url = allowedUrl(spec.baseURL, "/user/balance", ["api.deepseek.com"]);
		body = await requestJson(url, { authorization: `Bearer ${key}` }, deps);
		const infos = Array.isArray(body?.balance_infos) ? body.balance_infos : [];
		if (!infos.length || body?.is_available === false) throw new AccountError("invalid-response", "balance-unavailable");
		const info = infos.find((entry) => String(entry?.currency).toUpperCase() === "CNY") || infos[0];
		balance = balanceView(info?.currency, info?.total_balance, { toppedUp: info?.topped_up_balance, granted: info?.granted_balance });
	} else if (spec.adapter === "openrouter-balance") {
		url = allowedUrl(DEFAULTS.openrouter.baseURL, "/api/v1/credits", ["openrouter.ai"]);
		body = await requestJson(url, { authorization: `Bearer ${key}` }, deps);
		const total = nonNegativeOrNull(body?.data?.total_credits), used = nonNegativeOrNull(body?.data?.total_usage);
		if (total === null || used === null) throw new AccountError("invalid-response");
		balance = balanceView("USD", Math.max(0, total - used), { total, used });
	} else if (spec.adapter === "moonshot-balance") {
		url = allowedUrl(spec.baseURL || DEFAULTS.moonshot.baseURL, "/v1/users/me/balance", ["api.moonshot.cn", "api.moonshot.ai"]);
		body = await requestJson(url, { authorization: `Bearer ${key}` }, deps);
		balance = balanceView(body?.data?.currency || "CNY", body?.data?.available_balance, { toppedUp: body?.data?.cash_balance, granted: body?.data?.voucher_balance });
	} else {
		url = allowedUrl(spec.baseURL || DEFAULTS.zai.baseURL, "/api/paas/v4/balance", ["api.z.ai", "open.bigmodel.cn"]);
		body = await requestJson(url, { authorization: `Bearer ${key}` }, deps);
		balance = balanceView(body?.data?.currency || "USD", body?.data?.available_balance ?? body?.data?.total_balance, { total: body?.data?.total_balance });
	}
	return { ...emptyAccount(spec, "ok", now, null), balance, lastSuccessAt: now };
}

async function querySubscription(spec, key, deps, now) {
	let plan = spec.displayName, windows = [];
	if (spec.adapter === "kimi-token-plan") {
		const url = allowedUrl(spec.baseURL || DEFAULTS.kimi.baseURL, "/coding/v1/usages", ["api.kimi.com"]);
		const body = await requestJson(url, { authorization: `Bearer ${key}` }, deps);
		const data = body?.data ?? body;
		const limits = Array.isArray(data?.limits) ? data.limits : [];
		const session = limits.map((entry) => limitWindow(entry?.detail ?? entry, "session")).find(Boolean) || null;
		const weekly = limitWindow(data?.usage, "weekly");
		windows = [session, weekly].filter(Boolean);
		plan = nonEmpty(data?.plan ?? data?.planName) || "Kimi For Coding";
	} else if (spec.adapter === "zai-token-plan") {
		const cn = String(spec.id).includes("cn") || String(spec.baseURL).includes("bigmodel.cn");
		const host = cn ? "https://open.bigmodel.cn" : "https://api.z.ai";
		const headers = { authorization: key };
		const body = await requestJson(host + "/api/monitor/usage/quota/limit", headers, deps);
		let subscription = null;
		try { subscription = await requestJson(host + "/api/biz/subscription/list", headers, deps); } catch { /* Optional plan/reset metadata. */ }
		const limits = Array.isArray(body?.data?.limits) ? body.data.limits : [];
		const tokenLimits = limits
			.filter((row) => ["TOKENS_LIMIT", "CREDIT_LIMIT"].includes(String(row?.type ?? row?.limit_type).toUpperCase()) && zaiUsedPercent(row) !== null)
			.sort((a, b) => (zaiWindowMinutes(a) ?? Number.MAX_SAFE_INTEGER) - (zaiWindowMinutes(b) ?? Number.MAX_SAFE_INTEGER));
		const first = tokenLimits[0] || null;
		const session = tokenLimits.length >= 2 ? first : zaiWindowMinutes(first) !== null && zaiWindowMinutes(first) <= 360 ? first : null;
		const weekly = tokenLimits.length >= 2 ? tokenLimits[tokenLimits.length - 1] : session === null ? first : null;
		windows = [session ? zaiWindow(session, "session") : null, weekly ? zaiWindow(weekly, "weekly") : null].filter(Boolean);
		const timeLimit = limits.find((row) => String(row?.type ?? row?.limit_type).toUpperCase() === "TIME_LIMIT");
		const subscriptionRow = Array.isArray(subscription?.data) ? subscription.data[0] : null;
		const renewAt = subscriptionRow?.next_renew_time ?? subscriptionRow?.nextRenewTime ?? null;
		const billing = zaiWindow(timeLimit, "billing", renewAt);
		if (billing) windows.push(billing);
		plan = zaiPlan(body, subscription);
	} else {
		const cn = String(spec.id).includes("cn") || String(spec.baseURL).includes("minimaxi.com");
		const hosts = cn
			? ["https://www.minimaxi.com/v1/token_plan/remains", "https://api.minimaxi.com/v1/token_plan/remains", "https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains"]
			: ["https://www.minimax.io/v1/token_plan/remains", "https://api.minimax.io/v1/token_plan/remains", "https://api.minimax.io/v1/api/openplatform/coding_plan/remains"];
		let lastError = null;
		for (let index = 0; index < hosts.length; index++) {
			try {
				const body = await requestJson(hosts[index], { authorization: `Bearer ${key}` }, deps);
				const parsed = parseMiniMax(body, now);
				if (parsed.length) {
					windows = parsed;
					lastError = null;
					break;
				}
				lastError = new AccountError("invalid-response", "quota-windows-missing");
				if (index === hosts.length - 1) throw lastError;
			} catch (error) {
				lastError = error;
				if (index === hosts.length - 1 || !["unsupported", "invalid-response"].includes(error?.status)) throw error;
			}
		}
		if (lastError) throw lastError;
		plan = "MiniMax Coding Plan";
	}
	if (!windows.length) throw new AccountError("invalid-response", "quota-windows-missing");
	return { ...emptyAccount(spec, "ok", now, null), plan, windows, lastSuccessAt: now };
}

async function queryProviderAccount(spec, credentials, deps = {}) {
	const now = (deps.now || Date.now)();
	if (!spec.adapter || spec.mode === "unsupported") return emptyAccount(spec, "unsupported", now);
	const key = await resolveCredential(credentials, spec.apiKeyRef);
	if (!key) return emptyAccount(spec, "not-configured", now);
	try {
		return spec.mode === "balance" ? await queryBalance(spec, key, deps, now) : await querySubscription(spec, key, deps, now);
	} catch (error) {
		return emptyAccount(spec, error?.status || "unavailable", now, error?.code || "query-failed");
	}
}

function transient(status) {
	return status === "unavailable" || status === "rate-limited" || status === "invalid-response";
}

function staleResult(previous, current) {
	if (!previous || previous.status !== "ok" || !transient(current.status)) return current;
	return {
		...previous,
		status: current.status,
		stale: true,
		fetchedAt: current.fetchedAt,
		lastSuccessAt: previous.lastSuccessAt || previous.fetchedAt,
		errorCode: current.errorCode
	};
}

const stateByOwner = new WeakMap();
function registryState(owner) {
	let state = stateByOwner.get(owner);
	if (!state) {
		state = { cache: new Map(), inflight: new Map() };
		stateByOwner.set(owner, state);
	}
	return state;
}

function credentialsFrom(ctx) {
	return serviceFrom(ctx, "credentials");
}

async function refreshOne(state, spec, credentials, deps) {
	const signature = JSON.stringify(spec);
	const active = state.inflight.get(spec.id);
	if (active?.signature === signature) return active.promise;

	let promise;
	promise = queryProviderAccount(spec, credentials, deps).then((current) => {
		const cached = state.cache.get(spec.id);
		const previous = cached?.signature === signature ? cached.account : null;
		const account = staleResult(previous, current);
		if (state.inflight.get(spec.id)?.promise === promise) {
			state.cache.set(spec.id, { signature, account });
		}
		return account;
	}).finally(() => {
		if (state.inflight.get(spec.id)?.promise === promise) state.inflight.delete(spec.id);
	});
	state.inflight.set(spec.id, { signature, promise });
	return promise;
}

async function collectAccounts(owner, ctx, options = {}) {
	const deps = options.deps || {};
	const now = (deps.now || Date.now)();
	const specs = (await configuredProviders(ctx)).map(accountSpec);
	const state = registryState(owner);
	const credentials = credentialsFrom(ctx);
	const accounts = await Promise.all(specs.map(async (spec) => {
		const signature = JSON.stringify(spec);
		const hit = state.cache.get(spec.id);
		const age = now - (hit?.account?.fetchedAt || 0);
		if (!options.force && hit?.signature === signature && age >= 0 && age < (deps.cacheMs ?? CACHE_MS)) return hit.account;
		return refreshOne(state, spec, credentials, deps);
	}));
	const warnings = accounts.filter((account) => account.status !== "ok" && account.status !== "unsupported" && account.status !== "not-configured").map((account) => ({
		providerId: account.id,
		code: String(account.errorCode || account.status).toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
		message: STATUS_MESSAGES[account.status] || "provider account query failed"
	}));
	return { generatedAt: now, accounts, warnings };
}

async function providerViews(owner, ctx) {
	const now = Date.now();
	const state = registryState(owner);
	const credentials = credentialsFrom(ctx);
	const specs = (await configuredProviders(ctx)).map(accountSpec);
	const providers = await Promise.all(specs.map(async (spec) => {
		const signature = JSON.stringify(spec);
		const hit = state.cache.get(spec.id);
		const cached = hit?.signature === signature ? hit.account : null;
		const configured = spec.adapter !== null && (cached ? cached.status !== "not-configured" : !!(await resolveCredential(credentials, spec.apiKeyRef)));
		return {
			id: spec.id,
			displayName: spec.displayName,
			providerFamily: spec.providerFamily,
			accountMode: spec.mode,
			adapter: spec.adapter,
			configured,
			status: cached?.status || (spec.adapter ? "pending" : "unsupported"),
			fetchedAt: cached?.fetchedAt || null
		};
	}));
	return { generatedAt: now, providers };
}

export {
	AccountError,
	configuredProviders,
	accountSpec,
	queryProviderAccount,
	collectAccounts,
	providerViews,
	STATUS_MESSAGES
};
