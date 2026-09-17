/*
 * Provider-scoped, effective-dated token pricing.
 *
 * Prices are expressed per one million tokens in the rule currency. A direct
 * provider match is exact; when an API-compatible route has no provider
 * pricing metadata, a unique first-party model match is available as an
 * explicitly estimated fallback. The original provider identity is retained
 * so an estimate is never presented as that provider's official bill.
 */

const BUILTIN = require('../data/pricing/catalog.json');
const { validateCatalog, validateOverrides } = require('./pricing-validation.cjs');

function createPricing(input = BUILTIN, customRules = []) {
const catalog = validateCatalog(input);
const overrides = validateOverrides(customRules);
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
var USD_CNY_RATE = catalog.fx.at(-1).usdCny;
var FX_RETRIEVED_AT = catalog.fx.at(-1).date;
var FX_SOURCE = catalog.fx.at(-1).sourceUrl;
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

var RULES = catalog.rules;

function ruleMatchesModel(rule, raw) {
	var model = String(raw || "").trim().toLowerCase();
	if (rule.aliases.indexOf(model) >= 0) return true;
	// Anthropic dated model ids are stable aliases of the named family.
	if (rule.family === "anthropic" && model.startsWith(rule.canonical.toLowerCase() + "-20")) return true;
	return false;
}

function matchingRules(family, modelRaw, at, providerId, accountType) {
	var when = Number.isFinite(at) ? at : Date.now();
	return RULES.filter(function(rule) {
		if ((rule.providerId ? rule.providerId !== providerId : rule.family !== family) || !ruleMatchesModel(rule, modelRaw)) return false;
		if (rule.accountType && rule.accountType !== accountType) return false;
		if (rule.effectiveFrom && when < Date.parse(rule.effectiveFrom)) return false;
		if (rule.effectiveTo && when >= Date.parse(rule.effectiveTo)) return false;
		return true;
	});
}

function modelFallbackRules(modelRaw, at) {
	var when = Number.isFinite(at) ? at : Date.now();
	return RULES.filter(function(rule) {
		if (MODEL_FALLBACK_EXCLUDED_FAMILIES.has(rule.family) || rule.providerId || rule.confidence !== "exact" || !ruleMatchesModel(rule, modelRaw)) return false;
		if (rule.effectiveFrom && when < Date.parse(rule.effectiveFrom)) return false;
		if (rule.effectiveTo && when >= Date.parse(rule.effectiveTo)) return false;
		return true;
	});
}

// Resolve provider-scoped rules first. Unknown provider ids may use a unique
// first-party model row as an estimate, but the provider family stays unknown.
function rulesForIdentity(family, modelRaw, at, providerId, accountType) {
	var custom = overrides.filter(rule => rule.providerId === providerId && (!rule.accountType || rule.accountType === accountType)
		&& ruleMatchesModel(rule, modelRaw) && (!rule.effectiveFrom || at >= Date.parse(rule.effectiveFrom)) && (!rule.effectiveTo || at < Date.parse(rule.effectiveTo)));
	if (custom.length) return { matches: custom, estimatedFallback: false, custom: true };
	var direct = matchingRules(family, modelRaw, at, providerId, accountType);
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
	var matches = rulesForIdentity(family, raw, at, provider, normalizeAccountType(accountType)).matches;
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
	var fxAt = cost.pricing?.pricedAt;
	var day = Number.isFinite(fxAt) ? new Date(fxAt).toISOString().slice(0, 10) : "9999-12-31";
	var fx = catalog.fx.filter(row => row.date <= day).at(-1) || catalog.fx[0];
	var rate = positiveRate(options?.usdCnyRate) || fx.usdCny;
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
		estimatedAmount: convertedAmount,
		pricing: { ...cost.pricing, nativeAmount: cost.amount, nativeCurrency: "USD", fxRate: rate, fxDate: fx.date, fxSource: fx.sourceUrl }
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

function normalizeServiceTier(value) {
	if (value === "fast") return "priority";
	if (value == null || value === "auto" || value === "default") return "standard";
	return ["standard", "priority", "batch", "flex"].includes(value) ? value : "unknown";
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
		var service = normalizeServiceTier(usage?.serviceTier);
		return rule.serviceTiers[service]?.[contextTokens > 512000 ? "long" : "short"] || null;
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
	var at = Number.isFinite(usage?.time) ? usage.time : Number.isFinite(usage && usage.slot) ? usage.slot * 30 * 60 * 1000 : Date.now();
	var identity = normalizeIdentity(
		identityInput && identityInput.providerId || usage && usage.providerId,
		identityInput && identityInput.modelRaw || usage && (usage.modelRaw || usage.model),
		identityInput && identityInput.accountType || usage && usage.accountType,
		at
	);
	var tokens = tokenCounts(usage);
	var resolved = rulesForIdentity(identity.providerFamily, identity.modelRaw, at, identity.providerId, identity.accountType);
	if (identity.accountType === "free") {
		var freeMatches = resolved.matches;
		return { ...emptyCost("free", identity, tokens), amount: 0, currency: freeMatches.length === 1 ? freeMatches[0].currency : null, unpricedTokens: 0 };
	}
	if (identity.accountType === "subscription" || identity.accountType === "token-plan") {
		return emptyCost("subscription", identity, tokens);
	}
	if (identity.accountType === "unknown" || !resolved.custom && (identity.accountType === "relay" || identity.accountType === "local")) {
		return emptyCost("unsupported", identity, tokens);
	}
	if (identity.providerFamily === "unknown" && !resolved.estimatedFallback && !resolved.custom && !resolved.matches.some(rule => rule.providerId === identity.providerId)) {
		return emptyCost(resolved.matches.length > 1 ? "ambiguous" : "unsupported", identity, tokens);
	}
	var matches = resolved.matches;
	if (matches.length > 1) return emptyCost("ambiguous", identity, tokens);
	if (matches.length === 0) return emptyCost("unsupported", identity, tokens);
	var rule = matches[0];
	var rates = ratesFor(rule, usage, at);
	var tier = normalizeServiceTier(usage?.serviceTier);
	if (tier === "unknown" || tier !== "standard" && !rule.tierMultipliers && !rule.serviceTiers) return emptyCost("unsupported", identity, tokens);
	if (rule.tierMultipliers) {
		var multiplier = rule.tierMultipliers[tier];
		if (!Number.isFinite(multiplier)) return emptyCost("unsupported", identity, tokens);
		if (rates) rates = Object.fromEntries(Object.entries(rates).map(([key, rate]) => [key, rate === null ? null : rate * multiplier]));
	}
	if (!rates) return emptyCost("unsupported", identity, tokens);
	var fields = ["uncached", "cacheRead", "cacheWrite", "output"];
	var missing = fields.filter(key => rates[key] === null && tokens[key] > 0);
	var unpricedTokens = missing.reduce((total, key) => total + tokens[key], 0);
	var amount = fields.reduce((total, key) => total + (rates[key] === null ? 0 : tokens[key] * rates[key]), 0) / MILLION;
	if (unpricedTokens > 0 && fields.every(key => rates[key] === null || tokens[key] === 0)) return emptyCost("unsupported", identity, tokens);
	if (!Number.isFinite(amount)) return emptyCost("unsupported", identity, tokens);
	var allZero = rates.uncached === 0 && rates.cacheRead === 0 && rates.cacheWrite === 0 && rates.output === 0;
	var uncertain = usage?.pricingIncomplete === true || resolved.estimatedFallback || rule.confidence === "estimated"
		|| rule.observedFrom && at < Date.parse(rule.observedFrom)
		|| rule.cacheWriteDurationUnknown && tokens.cacheWrite > 0
		|| rule.cacheStorageUnknown && tokens.cacheWrite > 0
		|| rule.cacheWritePriceUnknown && tokens.cacheWrite > 0;
	var status = unpricedTokens > 0 ? "partial" : allZero ? "free" : uncertain ? "estimated" : "exact";
	return {
		status: status,
		amount: amount,
		currency: rule.currency,
		exactAmount: status === "exact" || status === "free" ? amount : 0,
		estimatedAmount: status === "estimated" || status === "partial" ? amount : 0,
		unpricedTokens: unpricedTokens,
		ruleId: rule.id,
		sourceUrl: rule.sourceUrl,
		retrievedAt: rule.retrievedAt,
		providerId: identity.providerId,
		providerFamily: identity.providerFamily,
		modelCanonical: rule.canonical,
		pricing: { catalogVersion: catalog.version, ruleRevision: rule.id, pricedAt: at,
			basis: resolved.custom ? "custom" : resolved.estimatedFallback ? "reference" : "provider",
			historicalEstimate: !!(rule.observedFrom && at < Date.parse(rule.observedFrom)) }
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

return {
	catalog,
	SOURCES: SOURCES,
	RULES: RULES,
	DISPLAY_CURRENCY: DISPLAY_CURRENCY,
	USD_CNY_RATE: USD_CNY_RATE,
	FX_RETRIEVED_AT: FX_RETRIEVED_AT,
	FX_SOURCE: FX_SOURCE,
	providerFamilyOf: providerFamilyOf,
	normalizeAccountType: normalizeAccountType,
	normalizeServiceTier: normalizeServiceTier,
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

}
module.exports = Object.assign(createPricing(), { createPricing, BUILTIN, validateCatalog, validateOverrides });
