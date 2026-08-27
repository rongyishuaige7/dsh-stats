/*
 * Provider-scoped, effective-dated token pricing.
 *
 * Prices are expressed per one million tokens in the rule currency. A direct
 * provider match is exact; when an API-compatible route has no provider
 * pricing metadata, a unique first-party model match is available as an
 * explicitly estimated fallback. The original provider identity is retained
 * so an estimate is never presented as that provider's official bill.
 */

var MILLION = 1e6;
var BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
var DEEPSEEK_CHANGE_AT = Date.parse("2026-08-17T00:00:00+08:00");
var OPENAI_LONG_CONTEXT = 272000;
var GEMINI_LONG_CONTEXT = 200000;
var RETRIEVED_AT = "2026-08-18";
var OPENAI_RETRIEVED_AT = "2026-08-26";
// The dashboard reports one currency. Keep the FX snapshot explicit and
// replaceable so a future host-side rate provider can pass a newer value
// without changing the pricing rules themselves.
var DISPLAY_CURRENCY = "CNY";
var USD_CNY_RATE = 6.7205;
var FX_RETRIEVED_AT = "2026-08-26";
var FX_SOURCE = "https://api.frankfurter.app/2026-08-26?from=USD&to=CNY";
// OpenRouter rows are provider-specific snapshots, not a source for the
// model-only fallback. A model fallback must resolve to one first-party rule.
var MODEL_FALLBACK_EXCLUDED_FAMILIES = new Set(["openrouter"]);

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
	// These routes preserve DeepSeek's official API billing while exposing a
	// distinct provider id in DSH. Keep the allowlist explicit: model names alone
	// are insufficient for exact billing on an arbitrary relay.
	deepseek: new Set(["deepseek", "deepseek-official", "deepseek-modlens", "nbdeepseek"]),
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
	var retrievedAt = extra && typeof extra.retrievedAt === "string" && extra.retrievedAt ? extra.retrievedAt : RETRIEVED_AT;
	return {
		id: family + "/" + canonical + "@" + retrievedAt,
		family: family,
		canonical: canonical,
		aliases: modelAliases(canonical, aliases),
		currency: currency,
		sourceUrl: SOURCES[family],
		retrievedAt: retrievedAt,
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
		...fixedRule("openai", "gpt-5.6-sol", "USD", null, ["openai/gpt-5.6-sol", "daybreak-blue-latest"], { retrievedAt: OPENAI_RETRIEVED_AT }),
		contextTiers: {
			short: { cacheRead: 0.4, uncached: 4, cacheWrite: 5, output: 20 },
			long: { cacheRead: 0.8, uncached: 8, cacheWrite: 10, output: 30 }
		}, contextThreshold: OPENAI_LONG_CONTEXT
	},
	{
		...fixedRule("openai", "gpt-5.6-terra", "USD", null, ["openai/gpt-5.6-terra"], { retrievedAt: OPENAI_RETRIEVED_AT }),
		contextTiers: {
			short: { cacheRead: 0.2, uncached: 2, cacheWrite: 2.5, output: 12 },
			long: { cacheRead: 0.4, uncached: 4, cacheWrite: 5, output: 18 }
		}, contextThreshold: OPENAI_LONG_CONTEXT
	},
	{
		...fixedRule("openai", "gpt-5.6-luna", "USD", null, ["openai/gpt-5.6-luna"], { retrievedAt: OPENAI_RETRIEVED_AT }),
		contextTiers: {
			short: { cacheRead: 0.02, uncached: 0.2, cacheWrite: 0.25, output: 1.2 },
			long: { cacheRead: 0.04, uncached: 0.4, cacheWrite: 0.5, output: 1.8 }
		}, contextThreshold: OPENAI_LONG_CONTEXT
	},
	{
		// OpenAI lists cache writes as unavailable for these models. Keep a
		// conservative input-rate proxy and mark rows with writes estimated.
		...fixedRule("openai", "gpt-5.4", "USD", null, ["openai/gpt-5.4"], { retrievedAt: OPENAI_RETRIEVED_AT }),
		contextTiers: {
			short: { cacheRead: 0.25, uncached: 2.5, cacheWrite: 2.5, output: 15 },
			long: { cacheRead: 0.5, uncached: 5, cacheWrite: 5, output: 30 }
		}, contextThreshold: OPENAI_LONG_CONTEXT, cacheWritePriceUnknown: true
	},
	{
		...fixedRule("openai", "gpt-5.4-mini", "USD", null, ["openai/gpt-5.4-mini"], { retrievedAt: OPENAI_RETRIEVED_AT }),
		contextTiers: {
			short: { cacheRead: 0.075, uncached: 0.75, cacheWrite: 0.75, output: 4.5 },
			long: { cacheRead: 0.15, uncached: 1.5, cacheWrite: 1.5, output: 9 }
		}, contextThreshold: OPENAI_LONG_CONTEXT, cacheWritePriceUnknown: true
	},
	fixedRule("openai", "gpt-5.6-cyber", "USD", { cacheRead: 1.25, uncached: 12.5, cacheWrite: 15.625, output: 75 }, ["openai/gpt-5.6-cyber", "daybreak-red-latest"], { retrievedAt: OPENAI_RETRIEVED_AT }),

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

function modelFallbackRules(modelRaw, at) {
	var when = Number.isFinite(at) ? at : Date.now();
	return RULES.filter(function(rule) {
		if (MODEL_FALLBACK_EXCLUDED_FAMILIES.has(rule.family) || rule.confidence !== "exact" || !ruleMatchesModel(rule, modelRaw)) return false;
		if (rule.effectiveFrom && when < Date.parse(rule.effectiveFrom)) return false;
		if (rule.effectiveTo && when > Date.parse(rule.effectiveTo)) return false;
		return true;
	});
}

// Resolve provider-scoped rules first. Unknown provider ids may use a unique
// first-party model row as an estimate, but the provider family stays unknown.
function rulesForIdentity(family, modelRaw, at) {
	var direct = matchingRules(family, modelRaw, at);
	if (direct.length > 0 || family !== "unknown") return { matches: direct, estimatedFallback: false };
	var fallback = modelFallbackRules(modelRaw, at);
	return { matches: fallback, estimatedFallback: fallback.length === 1 };
}

function normalizeAccountType(value) {
	var type = String(value || "api").trim().toLowerCase().replace(/_/g, "-");
	if (["coding-plan", "subscription-plan", "paid-plan"].indexOf(type) >= 0) type = "token-plan";
	return ["api", "subscription", "token-plan", "relay", "local", "free", "unknown"].indexOf(type) >= 0 ? type : "unknown";
}

function normalizeIdentity(providerId, modelRaw, accountType, at) {
	var provider = typeof providerId === "string" && providerId.trim() ? providerId.trim() : "unknown";
	var raw = typeof modelRaw === "string" && modelRaw.trim() ? modelRaw.trim() : "(unknown)";
	var family = providerFamilyOf(provider);
	var matches = rulesForIdentity(family, raw, at).matches;
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

function positiveRate(value) {
	return Number.isFinite(value) && value > 0 ? value : null;
}

function usdCnyRate(options) {
	var override = positiveRate(options && options.usdCnyRate);
	return override || USD_CNY_RATE;
}

// Convert a single priced row for display/aggregation. Native pricing remains
// in priceUsage(); this boundary keeps the official USD rule auditable while
// making all dashboard totals comparable in CNY.
function convertCostToCny(cost, options) {
	if (!cost || typeof cost !== "object") return cost;
	var currency = typeof cost.currency === "string" ? cost.currency.toUpperCase() : "";
	if (currency === DISPLAY_CURRENCY) return { ...cost, currency: DISPLAY_CURRENCY };
	if (cost.amount == null || currency !== "USD") return { ...cost };
	var rate = usdCnyRate(options);
	if (!rate) return { ...cost };
	// A USD list-price row converted with a fixed FX snapshot is useful for
	// comparison, but it cannot represent the provider's settled RMB bill.
	// Move the converted amount into the estimated bucket so the UI and summary
	// never describe it as an exact charge.
	var convertedAmount = cost.amount * rate;
	return {
		...cost,
		status: convertedAmount > 0 ? "estimated" : cost.status === "free" ? "free" : cost.status,
		currency: DISPLAY_CURRENCY,
		amount: convertedAmount,
		exactAmount: 0,
		estimatedAmount: convertedAmount
	};
}

function convertCostSummaryToCny(summary, options) {
	if (!summary || !Array.isArray(summary.totals)) return summary;
	var totals = new Map();
	var conversionFailures = 0;
	for (var total of summary.totals) {
		var converted = convertCostToCny({
			status: (total.estimatedAmount || 0) > 0 ? "estimated" : "exact",
			amount: total.amount,
			currency: total.currency,
			exactAmount: total.exactAmount || 0,
			estimatedAmount: total.estimatedAmount || 0
		}, options);
		if (!converted || converted.currency !== DISPLAY_CURRENCY) {
			conversionFailures++;
			continue;
		}
		var row = totals.get(DISPLAY_CURRENCY) || { currency: DISPLAY_CURRENCY, amount: 0, exactAmount: 0, estimatedAmount: 0 };
		row.amount += converted.amount || 0;
		row.exactAmount += converted.exactAmount || 0;
		row.estimatedAmount += converted.estimatedAmount || 0;
		totals.set(DISPLAY_CURRENCY, row);
	}
	var status = summary.status;
	var unpricedTokens = Number.isFinite(summary.unpricedTokens) ? summary.unpricedTokens : 0;
	var unknownRows = (Number.isFinite(summary.unknownRows) ? summary.unknownRows : 0) + conversionFailures;
	if (conversionFailures > 0 || unknownRows > 0 || unpricedTokens > 0) status = totals.size > 0 ? "partial" : "unsupported";
	return {
		status: status,
		totals: Array.from(totals.values()),
		unpricedTokens: unpricedTokens,
		unknownRows: unknownRows
	};
}

function summarizeCostsCny(costs, options) {
	return summarizeCosts((costs || []).map(function(cost) { return convertCostToCny(cost, options); }));
}

function mergeCostSummariesCny(summaries, options) {
	return mergeCostSummaries((summaries || []).map(function(summary) { return convertCostSummaryToCny(summary, options); }));
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
	var resolved = rulesForIdentity(identity.providerFamily, identity.modelRaw, at);
	if (identity.accountType === "free") {
		var freeMatches = resolved.matches;
		return { ...emptyCost("free", identity, tokens), amount: 0, currency: freeMatches.length === 1 ? freeMatches[0].currency : null, unpricedTokens: 0 };
	}
	if (identity.accountType === "subscription" || identity.accountType === "token-plan") {
		return emptyCost("subscription", identity, tokens);
	}
	if (identity.accountType === "unknown" || identity.accountType === "relay" || identity.accountType === "local") {
		return emptyCost("unsupported", identity, tokens);
	}
	if (identity.providerFamily === "unknown" && !resolved.estimatedFallback) {
		return emptyCost(resolved.matches.length > 1 ? "ambiguous" : "unsupported", identity, tokens);
	}
	var matches = resolved.matches;
	if (matches.length > 1) return emptyCost("ambiguous", identity, tokens);
	if (matches.length === 0) return emptyCost("unsupported", identity, tokens);
	var rule = matches[0];
	var rates = ratesFor(rule, usage, at);
	if (!rates) return emptyCost("unsupported", identity, tokens);
	var amount = (tokens.uncached * rates.uncached + tokens.cacheRead * rates.cacheRead + tokens.cacheWrite * rates.cacheWrite + tokens.output * rates.output) / MILLION;
	var allZero = rates.uncached === 0 && rates.cacheRead === 0 && rates.cacheWrite === 0 && rates.output === 0;
	var uncertain = resolved.estimatedFallback || rule.confidence === "estimated"
		|| rule.cacheWriteDurationUnknown && tokens.cacheWrite > 0
		|| rule.cacheStorageUnknown && tokens.cacheWrite > 0
		|| rule.cacheWritePriceUnknown && tokens.cacheWrite > 0;
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
	var freeRows = 0;
	for (var cost of costs || []) {
		if (!cost || typeof cost !== "object") continue;
		if (cost.status === "free") freeRows++;
		unpricedTokens += Number.isFinite(cost.unpricedTokens) ? cost.unpricedTokens : 0;
		if (cost.amount == null || !cost.currency) {
			if ((cost.unpricedTokens || 0) > 0) unknownRows++;
			continue;
		}
		pricedRows++;
		// Metadata-only usage rows can carry a model/provider identity but no
		// tokens. They must not turn an otherwise exact summary into estimated.
		if (cost.status === "estimated" && (cost.estimatedAmount || cost.amount || 0) > 0) estimatedRows++;
		var row = totals.get(cost.currency) || { currency: cost.currency, amount: 0, exactAmount: 0, estimatedAmount: 0 };
		row.amount += cost.amount;
		row.exactAmount += cost.exactAmount || 0;
		row.estimatedAmount += cost.estimatedAmount || 0;
		totals.set(cost.currency, row);
	}
	var status = "unsupported";
	if ((pricedRows > 0 || freeRows > 0) && (unknownRows > 0 || unpricedTokens > 0)) status = "partial";
	else if (pricedRows > 0 && estimatedRows > 0) status = "estimated";
	else if (freeRows > 0 && pricedRows === freeRows) status = "free";
	else if (pricedRows > 0) status = "exact";
	else if (freeRows > 0) status = "free";
	return { status: status, totals: Array.from(totals.values()).sort(function(a, b) { return a.currency.localeCompare(b.currency); }), unpricedTokens: unpricedTokens, unknownRows: unknownRows };
}

function mergeCostSummaries(summaries) {
	var pseudoCosts = [];
	for (var summary of summaries || []) {
		if (!summary) continue;
		for (var total of summary.totals || []) {
			pseudoCosts.push({
				status: summary.status === "free" ? "free" : total.estimatedAmount > 0 ? "estimated" : "exact",
				amount: total.amount,
				currency: total.currency,
				exactAmount: total.exactAmount,
				estimatedAmount: total.estimatedAmount,
				unpricedTokens: 0
			});
		}
		if ((summary.unpricedTokens || 0) > 0 || (summary.unknownRows || 0) > 0) {
			pseudoCosts.push({ status: "unsupported", amount: null, currency: null, exactAmount: 0, estimatedAmount: 0, unpricedTokens: summary.unpricedTokens || 0 });
		} else if (summary.status === "free" && !(summary.totals || []).length) {
			pseudoCosts.push({ status: "free", amount: 0, currency: null, exactAmount: 0, estimatedAmount: 0, unpricedTokens: 0 });
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
	DISPLAY_CURRENCY: DISPLAY_CURRENCY,
	USD_CNY_RATE: USD_CNY_RATE,
	FX_RETRIEVED_AT: FX_RETRIEVED_AT,
	FX_SOURCE: FX_SOURCE,
	providerFamilyOf: providerFamilyOf,
	normalizeAccountType: normalizeAccountType,
	normalizeIdentity: normalizeIdentity,
	priceUsage: priceUsage,
	summarizeCosts: summarizeCosts,
	mergeCostSummaries: mergeCostSummaries,
	convertCostToCny: convertCostToCny,
	convertCostSummaryToCny: convertCostSummaryToCny,
	summarizeCostsCny: summarizeCostsCny,
	mergeCostSummariesCny: mergeCostSummariesCny,
	emptyCostSummary: emptyCostSummary,
	pricingCatalog: pricingCatalog,
	tokenCounts: tokenCounts
};
