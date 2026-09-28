// Legacy DeepSeek balance RPC: fetching, normalization and cached payloads.
import { responseJson } from "./accounts.js";

// DeepSeek 余额查询与统计聚合解耦：余额是宿主凭证能力，不应让统计日志
// 读取失败或网络波动改变现有 stats/aggregate 的语义。
const DEEPSEEK_BALANCE_API = "https://api.deepseek.com/user/balance";
const DEEPSEEK_TOP_UP_URL = "https://platform.deepseek.com/top_up";
const DEEPSEEK_API_KEY_REF = "DEEPSEEK_API_KEY";
const BALANCE_CACHE_MS = 60 * 1000;
const BALANCE_TIMEOUT_MS = 15 * 1000;

const BALANCE_ERROR_MESSAGES = {
	"no-api-key": "未配置 DEEPSEEK_API_KEY",
	"credential-failed": "读取 DeepSeek 凭证失败",
	"fetch-unavailable": "当前宿主不支持网络请求",
	"fetch-timeout": "DeepSeek 余额请求超时",
	"fetch-failed": "DeepSeek 余额请求失败",
	"http-401": "DeepSeek 凭证无效或已过期",
	"http-403": "DeepSeek 凭证没有余额查询权限",
	"http-429": "DeepSeek 余额请求过于频繁",
	"http-4xx": "DeepSeek 余额请求被拒绝",
	"http-5xx": "DeepSeek 服务暂时不可用",
	"invalid-response": "DeepSeek 返回的余额数据无效",
	"balance-unavailable": "DeepSeek 余额暂不可用"
};

class DeepSeekBalanceError extends Error {
	constructor(code) {
		super(BALANCE_ERROR_MESSAGES[code] || "DeepSeek 余额查询失败");
		this.name = "DeepSeekBalanceError";
		this.code = code;
	}
}

function balanceErrorCode(error) {
	return error?.code && typeof error.code === "string" ? error.code : "fetch-failed";
}

function parseBalanceAmount(value) {
	if (value === undefined || value === null || value === "") return null;
	const number = typeof value === "string" ? Number(value.trim()) : value;
	return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeBalanceInfo(info) {
	if (!info || typeof info !== "object" || Array.isArray(info)) throw new DeepSeekBalanceError("invalid-response");
	const currency = typeof info.currency === "string" && info.currency.trim() ? info.currency.trim().toUpperCase() : null;
	const total = parseBalanceAmount(info.total_balance);
	const toppedUp = parseBalanceAmount(info.topped_up_balance);
	const granted = parseBalanceAmount(info.granted_balance);
	if (!currency || total === null || (info.topped_up_balance != null && toppedUp === null) || (info.granted_balance != null && granted === null)) {
		throw new DeepSeekBalanceError("invalid-response");
	}
	return {
		provider: "deepseek",
		name: currency === "CNY" ? "DeepSeek" : `DeepSeek ${currency}`,
		status: "ok",
		currency,
		total,
		toppedUp,
		granted,
		fetchedAt: null,
		topUpUrl: DEEPSEEK_TOP_UP_URL,
		errorCode: null
	};
}

function balancePayload(generatedAt, accounts, warnings = []) {
	return { generatedAt, accounts, warnings };
}

function unavailableBalancePayload(now, status, code) {
	const message = BALANCE_ERROR_MESSAGES[code] || BALANCE_ERROR_MESSAGES["fetch-failed"];
	return balancePayload(now, [{
		provider: "deepseek", name: "DeepSeek", status, currency: "CNY",
		total: null, toppedUp: null, granted: null, fetchedAt: null,
		topUpUrl: DEEPSEEK_TOP_UP_URL, errorCode: code
	}], [{ code: `BALANCE_${code.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`, message }]);
}

function staleBalancePayload(cached, now, error) {
	const code = balanceErrorCode(error);
	const message = BALANCE_ERROR_MESSAGES[code] || BALANCE_ERROR_MESSAGES["fetch-failed"];
	return balancePayload(now, cached.accounts.map((account) => ({ ...account, status: "stale", errorCode: code })), [{
		code: `BALANCE_${code.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
		message
	}]);
}

/**
 * 请求并校验 DeepSeek 官方余额响应。该函数不缓存、不暴露凭证，便于测试。
 */
async function fetchDeepSeekBalance(credentials, fetchImpl = globalThis.fetch, now = Date.now()) {
	let resolved;
	if (!credentials || typeof credentials.resolve !== "function") throw new DeepSeekBalanceError("no-api-key");
	try {
		resolved = await credentials.resolve(DEEPSEEK_API_KEY_REF);
	} catch {
		throw new DeepSeekBalanceError("credential-failed");
	}
	const apiKey = typeof resolved === "string" ? resolved : resolved?.value;
	if (typeof apiKey !== "string" || !apiKey.trim()) throw new DeepSeekBalanceError("no-api-key");
	if (typeof fetchImpl !== "function") throw new DeepSeekBalanceError("fetch-unavailable");

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), BALANCE_TIMEOUT_MS);
	try {
		let response;
		try {
			response = await fetchImpl(DEEPSEEK_BALANCE_API, {
				headers: { authorization: `Bearer ${apiKey}` },
				redirect: "error",
				signal: controller.signal
			});
		} catch (error) {
			if (error?.name === "AbortError" || error?.name === "TimeoutError" || controller.signal.aborted) {
				throw new DeepSeekBalanceError("fetch-timeout");
			}
			throw new DeepSeekBalanceError("fetch-failed");
		}
		if (!response || !response.ok) {
			const status = Number(response?.status);
			if (status === 401) throw new DeepSeekBalanceError("http-401");
			if (status === 403) throw new DeepSeekBalanceError("http-403");
			if (status === 429) throw new DeepSeekBalanceError("http-429");
			if (status >= 500) throw new DeepSeekBalanceError("http-5xx");
			throw new DeepSeekBalanceError("http-4xx");
		}
		let body;
		try { body = await responseJson(response, controller.signal); } catch (error) {
			throw new DeepSeekBalanceError(error?.code === "timeout" ? "fetch-timeout" : "invalid-response");
		}
		if (!Array.isArray(body?.balance_infos) || body.balance_infos.length === 0) throw new DeepSeekBalanceError("invalid-response");
		const accounts = body.balance_infos.map(normalizeBalanceInfo).map((account) => ({ ...account, fetchedAt: now }));
		return balancePayload(now, accounts);
	} finally {
		clearTimeout(timer);
	}
}

const balanceStateByService = new WeakMap();
function balanceState(service) {
	let state = balanceStateByService.get(service);
	if (!state) {
		state = { cache: null, inflight: null };
		balanceStateByService.set(service, state);
	}
	return state;
}

export { BALANCE_CACHE_MS, balanceErrorCode, balanceState, fetchDeepSeekBalance, normalizeBalanceInfo, staleBalancePayload, unavailableBalancePayload };
