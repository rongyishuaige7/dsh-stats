/*
 * Provider-scoped, effective-dated token pricing.
 *
 * Prices are expressed per one million tokens in the rule currency. Model
 * aliases are intentionally scoped to a provider family: a relay that happens
 * to expose the same model id is never charged at a first-party list price.
 */

var MILLION = 1e6;
var BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
var DEEPSEEK_CHANGE_AT = Date.parse("2026-08-17T00:00:00+08:00");
var OPENAI_LONG_CONTEXT = 272000;
var GEMINI_LONG_CONTEXT = 200000;
var RETRIEVED_AT = "2026-08-18";

var SOURCES = {
	deepseek: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing",
	minimax: "https://platform.minimaxi.com/docs/guides/pricing-paygo",
	openai: "https://developers.openai.com/api/docs/pricing",
	anthropic: "https://docs.anthropic.com/en/docs/about-claude/pricing",
	google: "https://ai.google.dev/gemini-api/docs/pricing",
	moonshot: "https://platform.kimi.com/docs/pricing/chat.md",
	zai: "https://docs.z.ai/guides/overview/pricing",
	openrouter: "https://openrouter.ai/api/v1/models"
};

var OFFICIAL_PROVIDER_IDS = {
	deepseek: new Set(["deepseek", "deepseek-official"]),
	minimax: new Set(["minimax", "minimax-cn", "minimaxi", "minimax-global", "minimax-coding"]),
	openai: new Set(["openai", "openai-official", "openai-codex"]),
	anthropic: new Set(["anthropic", "anthropic-official", "claude"]),
	google: new Set(["google", "google-gemini", "gemini", "google-ai"]),
	moonshot: new Set(["moonshot", "moonshotai", "moonshotai-cn", "kimi", "kimi-api", "kimi-coding", "kimi-for-coding"]),
	zai: new Set(["zai", "z-ai", "zai-coding", "zai-coding-cn", "zhipu", "bigmodel-cn"]),
	qwen: new Set(["qwen", "dashscope", "aliyun-bailian"]),
	mistral: new Set(["mistral", "mistral-official"]),
	openrouter: new Set(["openrouter"])
};

function providerFamilyOf(providerId) {
	var id = String(providerId || "unknown").trim().toLowerCase();
	for (var family of Object.keys(OFFICIAL_PROVIDER_IDS)) {
		if (OFFICIAL_PROVIDER_IDS[family].has(id)) return family;
	}
	return "unknown";
}

function modelAliases(canonical, aliases) {
	return [canonical].concat(aliases || []).map(function(value) { return String(value).toLowerCase(); });
}

function fixedRule(family, canonical, currency, rates, aliases, extra) {
	return {
		id: family + "/" + canonical + "@" + RETRIEVED_AT,
		family: family,
		canonical: canonical,
		aliases: modelAliases(canonical, aliases),
		currency: currency,
		sourceUrl: SOURCES[family],
		retrievedAt: RETRIEVED_AT,
		rates: rates,
		reasoningIncludedInOutput: true,
		confidence: "exact",
		...(extra || {})
	};
}

var RULES = [
	{
		...fixedRule("deepseek", "deepseek-v4-pro", "CNY", null),
		legacy: { cacheRead: 0.025, uncached: 3, cacheWrite: 3, output: 6 },
		offPeak: { cacheRead: 0.15, uncached: 4.5, cacheWrite: 4.5, output: 13.5 },
		peak: { cacheRead: 0.30, uncached: 9, cacheWrite: 9, output: 27 }
	},
	{
		...fixedRule("deepseek", "deepseek-v4-flash", "CNY", null),
		legacy: { cacheRead: 0.02, uncached: 1, cacheWrite: 1, output: 2 },
		offPeak: { cacheRead: 0.05, uncached: 1.5, cacheWrite: 1.5, output: 4.5 },
		peak: { cacheRead: 0.10, uncached: 3, cacheWrite: 3, output: 9 }
	},
	{
		...fixedRule("minimax", "MiniMax-M3", "CNY", null, ["minimax-m3"]),
		serviceTiers: {
			standard: {
				short: { cacheRead: 0.42, uncached: 2.1, cacheWrite: 2.1, output: 8.4 },
				long: { cacheRead: 0.84, uncached: 4.2, cacheWrite: 4.2, output: 16.8 }
			},
			priority: {
				short: { cacheRead: 0.63, uncached: 3.15, cacheWrite: 3.15, output: 12.6 },
				long: { cacheRead: 1.26, uncached: 6.3, cacheWrite: 6.3, output: 25.2 }
			}
		}
	},
	fixedRule("minimax", "MiniMax-M2.7", "CNY", { cacheRead: 0.42, uncached: 2.1, cacheWrite: 2.625, output: 8.4 }, ["minimax-m2.7"]),
	fixedRule("minimax", "MiniMax-M2.7-highspeed", "CNY", { cacheRead: 0.42, uncached: 4.2, cacheWrite: 2.625, output: 16.8 }, ["minimax-m2.7-highspeed"]),

	{
		...fixedRule("openai", "gpt-5.6-sol", "USD", null, ["openai/gpt-5.6-sol"]),
		contextTiers: {
			short: { cacheRead: 0.5, uncached: 5, cacheWrite: 6.25, output: 30 },
			long: { cacheRead: 1, uncached: 10, cacheWrite: 12.5, output: 45 }
		}, contextThreshold: OPENAI_LONG_CONTEXT
	},
	{
		...fixedRule("openai", "gpt-5.6-terra", "USD", null, ["openai/gpt-5.6-terra"]),
		contextTiers: {
			short: { cacheRead: 0.2, uncached: 2, cacheWrite: 2.5, output: 12 },
			long: { cacheRead: 0.4, uncached: 4, cacheWrite: 5, output: 18 }
		}, contextThreshold: OPENAI_LONG_CONTEXT
	},
	{
		...fixedRule("openai", "gpt-5.6-luna", "USD", null, ["openai/gpt-5.6-luna"]),
		contextTiers: {
			short: { cacheRead: 0.02, uncached: 0.2, cacheWrite: 0.25, output: 1.2 },
			long: { cacheRead: 0.04, uncached: 0.4, cacheWrite: 0.5, output: 1.8 }
		}, contextThreshold: OPENAI_LONG_CONTEXT
	},
	fixedRule("openai", "gpt-5.6-cyber", "USD", { cacheRead: 1.25, uncached: 12.5, cacheWrite: 15.625, output: 75 }, ["openai/gpt-5.6-cyber"]),

	fixedRule("anthropic", "claude-opus-5", "USD", { cacheRead: 0.5, uncached: 5, cacheWrite: 6.25, output: 25 }, ["anthropic/claude-opus-5"], { cacheWriteDurationUnknown: true }),
	fixedRule("anthropic", "claude-sonnet-5", "USD", { cacheRead: 0.2, uncached: 2, cacheWrite: 2.5, output: 10 }, ["anthropic/claude-sonnet-5"], { cacheWriteDurationUnknown: true }),
	fixedRule("anthropic", "claude-sonnet-4-6", "USD", { cacheRead: 0.3, uncached: 3, cacheWrite: 3.75, output: 15 }, ["claude-sonnet-4.6", "anthropic/claude-sonnet-4.6", "anthropic/claude-sonnet-4-6"], { cacheWriteDurationUnknown: true }),
	fixedRule("anthropic", "claude-haiku-4-5", "USD", { cacheRead: 0.1, uncached: 1, cacheWrite: 1.25, output: 5 }, ["claude-haiku-4.5", "anthropic/claude-haiku-4.5", "anthropic/claude-haiku-4-5"], { cacheWriteDurationUnknown: true }),

	{
		...fixedRule("google", "gemini-3.7-flash", "USD", { cacheRead: 0.075, uncached: 0.75, cacheWrite: 0.75, output: 3.75 }, ["google/gemini-3.7-flash"]),
		effectiveTo: "2026-12-31T23:59:59.999Z", cacheStorageUnknown: true
	},
	{
		...fixedRule("google", "gemini-3.1-pro-preview", "USD", null, ["gemini-3.1-pro-preview-customtools", "google/gemini-3.1-pro-preview"]),
		contextTiers: {
			short: { cacheRead: 0.2, uncached: 2, cacheWrite: 2, output: 12 },
			long: { cacheRead: 0.4, uncached: 4, cacheWrite: 4, output: 18 }
		}, contextThreshold: GEMINI_LONG_CONTEXT, cacheStorageUnknown: true
	},
	{
		...fixedRule("google", "gemini-2.5-pro", "USD", null, ["google/gemini-2.5-pro"]),
		contextTiers: {
			short: { cacheRead: 0.125, uncached: 1.25, cacheWrite: 1.25, output: 10 },
			long: { cacheRead: 0.25, uncached: 2.5, cacheWrite: 2.5, output: 15 }
		}, contextThreshold: GEMINI_LONG_CONTEXT, cacheStorageUnknown: true
	},
	fixedRule("google", "gemini-2.5-flash", "USD", { cacheRead: 0.03, uncached: 0.3, cacheWrite: 0.3, output: 2.5 }, ["google/gemini-2.5-flash"], { cacheStorageUnknown: true }),

	fixedRule("moonshot", "kimi-k3", "CNY", { cacheRead: 2, uncached: 20, cacheWrite: 20, output: 100 }, ["moonshotai/kimi-k3"]),
	fixedRule("moonshot", "kimi-k2.7-code", "CNY", { cacheRead: 1.3, uncached: 6.5, cacheWrite: 6.5, output: 27 }, ["moonshotai/kimi-k2.7-code"]),
	fixedRule("moonshot", "kimi-k2.7-code-highspeed", "CNY", { cacheRead: 2.6, uncached: 13, cacheWrite: 13, output: 54 }, ["moonshotai/kimi-k2.7-code-highspeed"]),
	fixedRule("moonshot", "kimi-k2.6", "CNY", { cacheRead: 1.1, uncached: 6.5, cacheWrite: 6.5, output: 27 }, ["moonshotai/kimi-k2.6"]),

	fixedRule("zai", "glm-5.2", "USD", { cacheRead: 0.26, uncached: 1.4, cacheWrite: 1.4, output: 4.4 }, ["z-ai/glm-5.2"]),
	fixedRule("zai", "glm-5.1", "USD", { cacheRead: 0.26, uncached: 1.4, cacheWrite: 1.4, output: 4.4 }, ["z-ai/glm-5.1"]),
	fixedRule("zai", "glm-5", "USD", { cacheRead: 0.2, uncached: 1, cacheWrite: 1, output: 3.2 }, ["z-ai/glm-5"]),
	fixedRule("zai", "glm-5-turbo", "USD", { cacheRead: 0.24, uncached: 1.2, cacheWrite: 1.2, output: 4 }, ["z-ai/glm-5-turbo"]),
	fixedRule("zai", "glm-4.7", "USD", { cacheRead: 0.11, uncached: 0.6, cacheWrite: 0.6, output: 2.2 }, ["z-ai/glm-4.7"]),
	fixedRule("zai", "glm-4.7-flashx", "USD", { cacheRead: 0.01, uncached: 0.07, cacheWrite: 0.07, output: 0.4 }, ["z-ai/glm-4.7-flashx"]),
	fixedRule("zai", "glm-4.7-flash", "USD", { cacheRead: 0, uncached: 0, cacheWrite: 0, output: 0 }, ["z-ai/glm-4.7-flash"]),

	// OpenRouter publishes per-token prices dynamically. These rows are a dated
	// snapshot and therefore estimated for historical usage.
	fixedRule("openrouter", "openai/gpt-5.6-sol", "USD", { cacheRead: 0.25, uncached: 2.5, cacheWrite: 3.125, output: 15 }, [], { confidence: "estimated" }),
	fixedRule("openrouter", "openai/gpt-5.6-terra", "USD", { cacheRead: 0.2, uncached: 2, cacheWrite: 2.5, output: 12 }, [], { confidence: "estimated" }),
	fixedRule("openrouter", "openai/gpt-5.6-luna", "USD", { cacheRead: 0.02, uncached: 0.2, cacheWrite: 0.25, output: 1.2 }, [], { confidence: "estimated" }),
	fixedRule("openrouter", "anthropic/claude-opus-5", "USD", { cacheRead: 0.5, uncached: 5, cacheWrite: 6.25, output: 25 }, [], { confidence: "estimated" }),
	fixedRule("openrouter", "anthropic/claude-sonnet-5", "USD", { cacheRead: 0.2, uncached: 2, cacheWrite: 2.5, output: 10 }, [], { confidence: "estimated" }),
	fixedRule("openrouter", "google/gemini-3.7-flash", "USD", { cacheRead: 0.0375, uncached: 0.375, cacheWrite: 0.0208333333333333, output: 1.875 }, [], { confidence: "estimated" }),
	fixedRule("openrouter", "moonshotai/kimi-k3", "USD", { cacheRead: 0.3, uncached: 3, cacheWrite: 3, output: 15 }, [], { confidence: "estimated" }),
	fixedRule("openrouter", "z-ai/glm-5.2", "USD", { cacheRead: 0.115, uncached: 0.5, cacheWrite: 0.5, output: 3.15 }, [], { confidence: "estimated" })
];

function ruleMatchesModel(rule, raw) {
	var model = String(raw || "").trim().toLowerCase();
	if (rule.aliases.indexOf(model) >= 0) return true;
	// Anthropic dated model ids are stable aliases of the named family.
	if (rule.family === "anthropic" && model.startsWith(rule.canonical.toLowerCase() + "-20")) return true;
	return false;
}

function matchingRules(family, modelRaw, at) {
	var when = Number.isFinite(at) ? at : Date.now();
	return RULES.filter(function(rule) {
		if (rule.family !== family || !ruleMatchesModel(rule, modelRaw)) return false;
		if (rule.effectiveFrom && when < Date.parse(rule.effectiveFrom)) return false;
		if (rule.effectiveTo && when > Date.parse(rule.effectiveTo)) return false;
		return true;
	});
}

function normalizeAccountType(value) {
	var type = String(value || "api").trim().toLowerCase();
	return ["api", "subscription", "token-plan", "relay", "local", "free", "unknown"].indexOf(type) >= 0 ? type : "unknown";
}

function normalizeIdentity(providerId, modelRaw, accountType, at) {
	var provider = typeof providerId === "string" && providerId.trim() ? providerId.trim() : "unknown";
	var raw = typeof modelRaw === "string" && modelRaw.trim() ? modelRaw.trim() : "(unknown)";
	var family = providerFamilyOf(provider);
	var matches = matchingRules(family, raw, at);
	return {
		providerId: provider,
		providerFamily: family,
		modelRaw: raw,
		modelCanonical: matches.length === 1 ? matches[0].canonical : raw,
		accountType: normalizeAccountType(accountType),
		ambiguous: matches.length > 1
	};
}

function tokenCounts(usage) {
	function n(value) { return Number.isFinite(value) && value >= 0 ? value : 0; }
	return {
		uncached: n(usage && usage.uncached),
		cacheRead: n(usage && usage.cacheRead),
		cacheWrite: n(usage && usage.cacheWrite),
		output: n(usage && usage.output),
		reasoning: n(usage && usage.reasoning)
	};
}

function totalBillableTokens(tokens) {
	return tokens.uncached + tokens.cacheRead + tokens.cacheWrite + tokens.output;
}

function deepSeekPeak(slot) {
	var t = slot * 30 * 60 * 1000;
	var bj = new Date(t + BEIJING_OFFSET_MS);
	var minutes = bj.getUTCHours() * 60 + bj.getUTCMinutes();
	return minutes >= 9 * 60 && minutes < 12 * 60 || minutes >= 14 * 60 && minutes < 18 * 60;
}

function ratesFor(rule, usage, at) {
	var contextTokens = Number.isFinite(usage && usage.contextTokens)
		? usage.contextTokens
		: usage && usage.contextOver512k === true
			? 512001
			: tokenCounts(usage).uncached + tokenCounts(usage).cacheRead + tokenCounts(usage).cacheWrite;
	if (rule.legacy) {
		var time = Number.isFinite(at) ? at : Number.isFinite(usage && usage.slot) ? usage.slot * 30 * 60 * 1000 : Date.now();
		if (time < DEEPSEEK_CHANGE_AT) return rule.legacy;
		return deepSeekPeak(Number.isFinite(usage && usage.slot) ? usage.slot : Math.floor(time / (30 * 60 * 1000))) ? rule.peak : rule.offPeak;
	}
	if (rule.serviceTiers) {
		var service = usage && usage.serviceTier === "priority" ? "priority" : "standard";
		return rule.serviceTiers[service][contextTokens > 512000 ? "long" : "short"];
	}
	if (rule.contextTiers) return rule.contextTiers[contextTokens > rule.contextThreshold ? "long" : "short"];
	return rule.rates;
}

function emptyCost(status, identity, tokens, extra) {
	return {
		status: status,
		amount: null,
		currency: null,
		exactAmount: 0,
		estimatedAmount: 0,
		unpricedTokens: totalBillableTokens(tokens),
		ruleId: null,
		sourceUrl: null,
		retrievedAt: null,
		providerId: identity.providerId,
		providerFamily: identity.providerFamily,
		modelCanonical: identity.modelCanonical,
		...(extra || {})
	};
}

function priceUsage(usage, identityInput) {
	var at = Number.isFinite(usage && usage.slot) ? usage.slot * 30 * 60 * 1000 : Date.now();
	var identity = normalizeIdentity(
		identityInput && identityInput.providerId || usage && usage.providerId,
		identityInput && identityInput.modelRaw || usage && (usage.modelRaw || usage.model),
		identityInput && identityInput.accountType || usage && usage.accountType,
		at
	);
	var tokens = tokenCounts(usage);
	if (identity.accountType === "free") {
		return { ...emptyCost("free", identity, tokens), amount: 0, currency: null, unpricedTokens: 0 };
	}
	if (identity.accountType === "subscription" || identity.accountType === "token-plan") {
		return emptyCost("subscription", identity, tokens);
	}
	if (identity.providerFamily === "unknown" || identity.accountType === "relay" || identity.accountType === "local") {
		return emptyCost("unsupported", identity, tokens);
	}
	var matches = matchingRules(identity.providerFamily, identity.modelRaw, at);
	if (matches.length > 1) return emptyCost("ambiguous", identity, tokens);
	if (matches.length === 0) return emptyCost("unsupported", identity, tokens);
	var rule = matches[0];
	var rates = ratesFor(rule, usage, at);
	if (!rates) return emptyCost("unsupported", identity, tokens);
	var amount = (tokens.uncached * rates.uncached + tokens.cacheRead * rates.cacheRead + tokens.cacheWrite * rates.cacheWrite + tokens.output * rates.output) / MILLION;
	var allZero = rates.uncached === 0 && rates.cacheRead === 0 && rates.cacheWrite === 0 && rates.output === 0;
	var uncertain = rule.confidence === "estimated"
		|| rule.cacheWriteDurationUnknown && tokens.cacheWrite > 0
		|| rule.cacheStorageUnknown && tokens.cacheWrite > 0;
	var status = allZero ? "free" : uncertain ? "estimated" : "exact";
	return {
		status: status,
		amount: amount,
		currency: rule.currency,
		exactAmount: status === "exact" || status === "free" ? amount : 0,
		estimatedAmount: status === "estimated" ? amount : 0,
		unpricedTokens: 0,
		ruleId: rule.id,
		sourceUrl: rule.sourceUrl,
		retrievedAt: rule.retrievedAt,
		providerId: identity.providerId,
		providerFamily: identity.providerFamily,
		modelCanonical: rule.canonical
	};
}

function emptyCostSummary() {
	return { status: "unsupported", totals: [], unpricedTokens: 0, unknownRows: 0 };
}

function summarizeCosts(costs) {
	var totals = new Map();
	var unpricedTokens = 0;
	var unknownRows = 0;
	var pricedRows = 0;
	var estimatedRows = 0;
	for (var cost of costs || []) {
		if (!cost || typeof cost !== "object") continue;
		unpricedTokens += Number.isFinite(cost.unpricedTokens) ? cost.unpricedTokens : 0;
		if (cost.amount == null || !cost.currency) {
			if ((cost.unpricedTokens || 0) > 0) unknownRows++;
			continue;
		}
		pricedRows++;
		if (cost.status === "estimated") estimatedRows++;
		var row = totals.get(cost.currency) || { currency: cost.currency, amount: 0, exactAmount: 0, estimatedAmount: 0 };
		row.amount += cost.amount;
		row.exactAmount += cost.exactAmount || 0;
		row.estimatedAmount += cost.estimatedAmount || 0;
		totals.set(cost.currency, row);
	}
	var status = "unsupported";
	if (pricedRows > 0 && (unknownRows > 0 || unpricedTokens > 0)) status = "partial";
	else if (pricedRows > 0 && estimatedRows > 0) status = "estimated";
	else if (pricedRows > 0) status = "exact";
	return { status: status, totals: Array.from(totals.values()).sort(function(a, b) { return a.currency.localeCompare(b.currency); }), unpricedTokens: unpricedTokens, unknownRows: unknownRows };
}

function mergeCostSummaries(summaries) {
	var pseudoCosts = [];
	for (var summary of summaries || []) {
		if (!summary) continue;
		for (var total of summary.totals || []) {
			pseudoCosts.push({
				status: total.estimatedAmount > 0 ? "estimated" : "exact",
				amount: total.amount,
				currency: total.currency,
				exactAmount: total.exactAmount,
				estimatedAmount: total.estimatedAmount,
				unpricedTokens: 0
			});
		}
		if ((summary.unpricedTokens || 0) > 0 || (summary.unknownRows || 0) > 0) {
			pseudoCosts.push({ status: "unsupported", amount: null, currency: null, exactAmount: 0, estimatedAmount: 0, unpricedTokens: summary.unpricedTokens || 0 });
		}
	}
	var result = summarizeCosts(pseudoCosts);
	result.unknownRows = (summaries || []).reduce(function(sum, item) { return sum + (item && item.unknownRows || 0); }, 0);
	if (result.totals.length > 0 && result.unknownRows > 0) result.status = "partial";
	return result;
}

function pricingCatalog() {
	return RULES.map(function(rule) {
		return {
			ruleId: rule.id,
			providerFamily: rule.family,
			modelCanonical: rule.canonical,
			currency: rule.currency,
			status: rule.confidence === "estimated" ? "estimated" : "exact",
			sourceUrl: rule.sourceUrl,
			retrievedAt: rule.retrievedAt
		};
	});
}

module.exports = {
	SOURCES: SOURCES,
	RULES: RULES,
	providerFamilyOf: providerFamilyOf,
	normalizeIdentity: normalizeIdentity,
	priceUsage: priceUsage,
	summarizeCosts: summarizeCosts,
	mergeCostSummaries: mergeCostSummaries,
	emptyCostSummary: emptyCostSummary,
	pricingCatalog: pricingCatalog,
	tokenCounts: tokenCounts
};
