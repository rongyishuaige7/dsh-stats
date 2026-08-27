var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/pricing.cjs
var require_pricing = __commonJS({
  "src/pricing.cjs"(exports, module) {
    var MILLION = 1e6;
    var BEIJING_OFFSET_MS = 8 * 60 * 60 * 1e3;
    var DEEPSEEK_CHANGE_AT = Date.parse("2026-08-17T00:00:00+08:00");
    var OPENAI_LONG_CONTEXT = 272e3;
    var GEMINI_LONG_CONTEXT = 2e5;
    var RETRIEVED_AT = "2026-08-18";
    var OPENAI_RETRIEVED_AT = "2026-08-26";
    var DISPLAY_CURRENCY = "CNY";
    var USD_CNY_RATE = 6.7205;
    var FX_RETRIEVED_AT = "2026-08-26";
    var FX_SOURCE = "https://api.frankfurter.app/2026-08-26?from=USD&to=CNY";
    var MODEL_FALLBACK_EXCLUDED_FAMILIES = /* @__PURE__ */ new Set(["openrouter"]);
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
      deepseek: /* @__PURE__ */ new Set(["deepseek", "deepseek-official", "deepseek-modlens", "nbdeepseek"]),
      minimax: /* @__PURE__ */ new Set(["minimax", "minimax-cn", "minimaxi", "minimax-global", "minimax-coding"]),
      openai: /* @__PURE__ */ new Set(["openai", "openai-official", "openai-codex"]),
      anthropic: /* @__PURE__ */ new Set(["anthropic", "anthropic-official", "claude"]),
      google: /* @__PURE__ */ new Set(["google", "google-gemini", "gemini", "google-ai"]),
      moonshot: /* @__PURE__ */ new Set(["moonshot", "moonshotai", "moonshotai-cn", "kimi", "kimi-api", "kimi-coding", "kimi-for-coding"]),
      zai: /* @__PURE__ */ new Set(["zai", "z-ai", "zai-coding", "zai-coding-cn", "zhipu", "bigmodel-cn"]),
      qwen: /* @__PURE__ */ new Set(["qwen", "dashscope", "aliyun-bailian"]),
      mistral: /* @__PURE__ */ new Set(["mistral", "mistral-official"]),
      openrouter: /* @__PURE__ */ new Set(["openrouter"])
    };
    function providerFamilyOf2(providerId) {
      var id = String(providerId || "unknown").trim().toLowerCase();
      for (var family of Object.keys(OFFICIAL_PROVIDER_IDS)) {
        if (OFFICIAL_PROVIDER_IDS[family].has(id)) return family;
      }
      return "unknown";
    }
    function modelAliases(canonical, aliases) {
      return [canonical].concat(aliases || []).map(function(value) {
        return String(value).toLowerCase();
      });
    }
    function fixedRule(family, canonical, currency, rates, aliases, extra) {
      var retrievedAt = extra && typeof extra.retrievedAt === "string" && extra.retrievedAt ? extra.retrievedAt : RETRIEVED_AT;
      return {
        id: family + "/" + canonical + "@" + retrievedAt,
        family,
        canonical,
        aliases: modelAliases(canonical, aliases),
        currency,
        sourceUrl: SOURCES[family],
        retrievedAt,
        rates,
        reasoningIncludedInOutput: true,
        confidence: "exact",
        ...extra || {}
      };
    }
    var RULES = [
      {
        ...fixedRule("deepseek", "deepseek-v4-pro", "CNY", null),
        legacy: { cacheRead: 0.025, uncached: 3, cacheWrite: 3, output: 6 },
        offPeak: { cacheRead: 0.15, uncached: 4.5, cacheWrite: 4.5, output: 13.5 },
        peak: { cacheRead: 0.3, uncached: 9, cacheWrite: 9, output: 27 }
      },
      {
        ...fixedRule("deepseek", "deepseek-v4-flash", "CNY", null),
        legacy: { cacheRead: 0.02, uncached: 1, cacheWrite: 1, output: 2 },
        offPeak: { cacheRead: 0.05, uncached: 1.5, cacheWrite: 1.5, output: 4.5 },
        peak: { cacheRead: 0.1, uncached: 3, cacheWrite: 3, output: 9 }
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
        },
        contextThreshold: OPENAI_LONG_CONTEXT
      },
      {
        ...fixedRule("openai", "gpt-5.6-terra", "USD", null, ["openai/gpt-5.6-terra"], { retrievedAt: OPENAI_RETRIEVED_AT }),
        contextTiers: {
          short: { cacheRead: 0.2, uncached: 2, cacheWrite: 2.5, output: 12 },
          long: { cacheRead: 0.4, uncached: 4, cacheWrite: 5, output: 18 }
        },
        contextThreshold: OPENAI_LONG_CONTEXT
      },
      {
        ...fixedRule("openai", "gpt-5.6-luna", "USD", null, ["openai/gpt-5.6-luna"], { retrievedAt: OPENAI_RETRIEVED_AT }),
        contextTiers: {
          short: { cacheRead: 0.02, uncached: 0.2, cacheWrite: 0.25, output: 1.2 },
          long: { cacheRead: 0.04, uncached: 0.4, cacheWrite: 0.5, output: 1.8 }
        },
        contextThreshold: OPENAI_LONG_CONTEXT
      },
      {
        // OpenAI lists cache writes as unavailable for these models. Keep a
        // conservative input-rate proxy and mark rows with writes estimated.
        ...fixedRule("openai", "gpt-5.4", "USD", null, ["openai/gpt-5.4"], { retrievedAt: OPENAI_RETRIEVED_AT }),
        contextTiers: {
          short: { cacheRead: 0.25, uncached: 2.5, cacheWrite: 2.5, output: 15 },
          long: { cacheRead: 0.5, uncached: 5, cacheWrite: 5, output: 30 }
        },
        contextThreshold: OPENAI_LONG_CONTEXT,
        cacheWritePriceUnknown: true
      },
      {
        ...fixedRule("openai", "gpt-5.4-mini", "USD", null, ["openai/gpt-5.4-mini"], { retrievedAt: OPENAI_RETRIEVED_AT }),
        contextTiers: {
          short: { cacheRead: 0.075, uncached: 0.75, cacheWrite: 0.75, output: 4.5 },
          long: { cacheRead: 0.15, uncached: 1.5, cacheWrite: 1.5, output: 9 }
        },
        contextThreshold: OPENAI_LONG_CONTEXT,
        cacheWritePriceUnknown: true
      },
      fixedRule("openai", "gpt-5.6-cyber", "USD", { cacheRead: 1.25, uncached: 12.5, cacheWrite: 15.625, output: 75 }, ["openai/gpt-5.6-cyber", "daybreak-red-latest"], { retrievedAt: OPENAI_RETRIEVED_AT }),
      fixedRule("anthropic", "claude-opus-5", "USD", { cacheRead: 0.5, uncached: 5, cacheWrite: 6.25, output: 25 }, ["anthropic/claude-opus-5"], { cacheWriteDurationUnknown: true }),
      fixedRule("anthropic", "claude-sonnet-5", "USD", { cacheRead: 0.2, uncached: 2, cacheWrite: 2.5, output: 10 }, ["anthropic/claude-sonnet-5"], { cacheWriteDurationUnknown: true }),
      fixedRule("anthropic", "claude-sonnet-4-6", "USD", { cacheRead: 0.3, uncached: 3, cacheWrite: 3.75, output: 15 }, ["claude-sonnet-4.6", "anthropic/claude-sonnet-4.6", "anthropic/claude-sonnet-4-6"], { cacheWriteDurationUnknown: true }),
      fixedRule("anthropic", "claude-haiku-4-5", "USD", { cacheRead: 0.1, uncached: 1, cacheWrite: 1.25, output: 5 }, ["claude-haiku-4.5", "anthropic/claude-haiku-4.5", "anthropic/claude-haiku-4-5"], { cacheWriteDurationUnknown: true }),
      {
        ...fixedRule("google", "gemini-3.7-flash", "USD", { cacheRead: 0.075, uncached: 0.75, cacheWrite: 0.75, output: 3.75 }, ["google/gemini-3.7-flash"]),
        effectiveTo: "2026-12-31T23:59:59.999Z",
        cacheStorageUnknown: true
      },
      {
        ...fixedRule("google", "gemini-3.1-pro-preview", "USD", null, ["gemini-3.1-pro-preview-customtools", "google/gemini-3.1-pro-preview"]),
        contextTiers: {
          short: { cacheRead: 0.2, uncached: 2, cacheWrite: 2, output: 12 },
          long: { cacheRead: 0.4, uncached: 4, cacheWrite: 4, output: 18 }
        },
        contextThreshold: GEMINI_LONG_CONTEXT,
        cacheStorageUnknown: true
      },
      {
        ...fixedRule("google", "gemini-2.5-pro", "USD", null, ["google/gemini-2.5-pro"]),
        contextTiers: {
          short: { cacheRead: 0.125, uncached: 1.25, cacheWrite: 1.25, output: 10 },
          long: { cacheRead: 0.25, uncached: 2.5, cacheWrite: 2.5, output: 15 }
        },
        contextThreshold: GEMINI_LONG_CONTEXT,
        cacheStorageUnknown: true
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
    function rulesForIdentity(family, modelRaw, at) {
      var direct = matchingRules(family, modelRaw, at);
      if (direct.length > 0 || family !== "unknown") return { matches: direct, estimatedFallback: false };
      var fallback = modelFallbackRules(modelRaw, at);
      return { matches: fallback, estimatedFallback: fallback.length === 1 };
    }
    function normalizeAccountType2(value) {
      var type = String(value || "api").trim().toLowerCase().replace(/_/g, "-");
      if (["coding-plan", "subscription-plan", "paid-plan"].indexOf(type) >= 0) type = "token-plan";
      return ["api", "subscription", "token-plan", "relay", "local", "free", "unknown"].indexOf(type) >= 0 ? type : "unknown";
    }
    function normalizeIdentity2(providerId, modelRaw, accountType, at) {
      var provider = typeof providerId === "string" && providerId.trim() ? providerId.trim() : "unknown";
      var raw = typeof modelRaw === "string" && modelRaw.trim() ? modelRaw.trim() : "(unknown)";
      var family = providerFamilyOf2(provider);
      var matches = rulesForIdentity(family, raw, at).matches;
      return {
        providerId: provider,
        providerFamily: family,
        modelRaw: raw,
        modelCanonical: matches.length === 1 ? matches[0].canonical : raw,
        accountType: normalizeAccountType2(accountType),
        ambiguous: matches.length > 1
      };
    }
    function tokenCounts(usage) {
      function n(value) {
        return Number.isFinite(value) && value >= 0 ? value : 0;
      }
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
    function convertCostToCny2(cost, options) {
      if (!cost || typeof cost !== "object") return cost;
      var currency = typeof cost.currency === "string" ? cost.currency.toUpperCase() : "";
      if (currency === DISPLAY_CURRENCY) return { ...cost, currency: DISPLAY_CURRENCY };
      if (cost.amount == null || currency !== "USD") return { ...cost };
      var rate = usdCnyRate(options);
      if (!rate) return { ...cost };
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
      var totals = /* @__PURE__ */ new Map();
      var conversionFailures = 0;
      for (var total of summary.totals) {
        var converted = convertCostToCny2({
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
        status,
        totals: Array.from(totals.values()),
        unpricedTokens,
        unknownRows
      };
    }
    function summarizeCostsCny2(costs, options) {
      return summarizeCosts((costs || []).map(function(cost) {
        return convertCostToCny2(cost, options);
      }));
    }
    function mergeCostSummariesCny2(summaries, options) {
      return mergeCostSummaries((summaries || []).map(function(summary) {
        return convertCostSummaryToCny(summary, options);
      }));
    }
    function deepSeekPeak(slot) {
      var t = slot * 30 * 60 * 1e3;
      var bj = new Date(t + BEIJING_OFFSET_MS);
      var minutes = bj.getUTCHours() * 60 + bj.getUTCMinutes();
      return minutes >= 9 * 60 && minutes < 12 * 60 || minutes >= 14 * 60 && minutes < 18 * 60;
    }
    function ratesFor(rule, usage, at) {
      var contextTokens = Number.isFinite(usage && usage.contextTokens) ? usage.contextTokens : usage && usage.contextOver512k === true ? 512001 : tokenCounts(usage).uncached + tokenCounts(usage).cacheRead + tokenCounts(usage).cacheWrite;
      if (rule.legacy) {
        var time = Number.isFinite(at) ? at : Number.isFinite(usage && usage.slot) ? usage.slot * 30 * 60 * 1e3 : Date.now();
        if (time < DEEPSEEK_CHANGE_AT) return rule.legacy;
        return deepSeekPeak(Number.isFinite(usage && usage.slot) ? usage.slot : Math.floor(time / (30 * 60 * 1e3))) ? rule.peak : rule.offPeak;
      }
      if (rule.serviceTiers) {
        var service = usage && usage.serviceTier === "priority" ? "priority" : "standard";
        return rule.serviceTiers[service][contextTokens > 512e3 ? "long" : "short"];
      }
      if (rule.contextTiers) return rule.contextTiers[contextTokens > rule.contextThreshold ? "long" : "short"];
      return rule.rates;
    }
    function emptyCost(status, identity, tokens, extra) {
      return {
        status,
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
        ...extra || {}
      };
    }
    function priceUsage2(usage, identityInput) {
      var at = Number.isFinite(usage && usage.slot) ? usage.slot * 30 * 60 * 1e3 : Date.now();
      var identity = normalizeIdentity2(
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
      var uncertain = resolved.estimatedFallback || rule.confidence === "estimated" || rule.cacheWriteDurationUnknown && tokens.cacheWrite > 0 || rule.cacheStorageUnknown && tokens.cacheWrite > 0 || rule.cacheWritePriceUnknown && tokens.cacheWrite > 0;
      var status = allZero ? "free" : uncertain ? "estimated" : "exact";
      return {
        status,
        amount,
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
      var totals = /* @__PURE__ */ new Map();
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
      return { status, totals: Array.from(totals.values()).sort(function(a, b) {
        return a.currency.localeCompare(b.currency);
      }), unpricedTokens, unknownRows };
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
      result.unknownRows = (summaries || []).reduce(function(sum, item) {
        return sum + (item && item.unknownRows || 0);
      }, 0);
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
      SOURCES,
      RULES,
      DISPLAY_CURRENCY,
      USD_CNY_RATE,
      FX_RETRIEVED_AT,
      FX_SOURCE,
      providerFamilyOf: providerFamilyOf2,
      normalizeAccountType: normalizeAccountType2,
      normalizeIdentity: normalizeIdentity2,
      priceUsage: priceUsage2,
      summarizeCosts,
      mergeCostSummaries,
      convertCostToCny: convertCostToCny2,
      convertCostSummaryToCny,
      summarizeCostsCny: summarizeCostsCny2,
      mergeCostSummariesCny: mergeCostSummariesCny2,
      emptyCostSummary,
      pricingCatalog,
      tokenCounts
    };
  }
});

// src/index.js
var import_pricing2 = __toESM(require_pricing(), 1);
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { readFileSync, readdirSync, lstatSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { homedir } from "node:os";
import { zstdDecompressSync } from "node:zlib";

// src/accounts.js
var import_pricing = __toESM(require_pricing(), 1);
var { normalizeAccountType, providerFamilyOf } = import_pricing.default;
var CACHE_MS = 5 * 60 * 1e3;
var REQUEST_TIMEOUT_MS = 15 * 1e3;
var MAX_RESPONSE_BYTES = 1024 * 1024;
var STATUS_MESSAGES = {
  "not-configured": "credential is not configured",
  unauthorized: "credential is invalid or lacks permission",
  "rate-limited": "provider rate limit reached",
  unavailable: "provider account service is unavailable",
  "invalid-response": "provider returned an invalid account response",
  blocked: "provider account endpoint was blocked by the safety policy",
  unsupported: "provider has no supported public account endpoint"
};
var DEFAULTS = {
  deepseek: { apiKeyRef: "DEEPSEEK_API_KEY", baseURL: "https://api.deepseek.com", actionUrl: "https://platform.deepseek.com/top_up" },
  openrouter: { apiKeyRef: "OPENROUTER_MANAGEMENT_KEY", baseURL: "https://openrouter.ai", actionUrl: "https://openrouter.ai/credits" },
  moonshot: { apiKeyRef: "MOONSHOT_API_KEY", baseURL: "https://api.moonshot.cn", actionUrl: "https://platform.moonshot.cn/console/account" },
  zai: { apiKeyRef: "ZAI_API_KEY", baseURL: "https://api.z.ai", actionUrl: "https://z.ai/manage-apikey/apikey-list" },
  kimi: { apiKeyRef: "KIMI_API_KEY", baseURL: "https://api.kimi.com", actionUrl: "https://www.kimi.com/code/console" },
  minimax: { apiKeyRef: "MINIMAX_API_KEY", baseURL: "https://www.minimax.io", actionUrl: "https://platform.minimaxi.com/console/usage" }
};
function defaultUsageExtractor(response) {
  const remaining = response?.remaining ?? response?.quota?.remaining ?? response?.balance;
  const unit = response?.unit ?? response?.quota?.unit ?? "USD";
  return {
    isValid: response?.is_active ?? response?.isValid ?? true,
    remaining,
    unit,
    total: response?.total ?? response?.quota?.total,
    used: response?.used ?? response?.quota?.used
  };
}
var DEFAULT_GENERIC_USAGE_TEMPLATE = Object.freeze({
  request: Object.freeze({
    url: "{{baseUrl}}/v1/usage",
    method: "GET",
    headers: Object.freeze({ Authorization: "Bearer {{apiKey}}" })
  }),
  extractor: defaultUsageExtractor
});
function firstNonEmpty(...values) {
  for (const value of values) {
    const hit = nonEmpty(value);
    if (hit) return hit;
  }
  return null;
}
function objectRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function profileBaseURL(profile) {
  return firstNonEmpty(profile?.baseURL, profile?.baseUrl, profile?.base_url);
}
function profileApiKeyRef(profile) {
  return firstNonEmpty(profile?.apiKeyEnv, profile?.apiKeyRef, profile?.api_key_env, profile?.api_key_ref);
}
function profileAccountApiKeyRef(profile) {
  return firstNonEmpty(profile?.accountApiKeyEnv, profile?.accountApiKeyRef, profile?.account_api_key_env, profile?.account_api_key_ref);
}
function profileUsageTemplate(profile) {
  for (const key of ["accountUsage", "account_usage", "usageTemplate", "usage_template"]) {
    if (Object.prototype.hasOwnProperty.call(profile || {}, key)) {
      const value = objectRecord(profile[key]);
      return value;
    }
  }
  return null;
}
function validTemplateBase(baseURL) {
  try {
    const url = new URL(baseURL);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}
function defaultUsageTemplateFor(baseURL) {
  let url;
  try {
    url = new URL(baseURL);
  } catch {
    return DEFAULT_GENERIC_USAGE_TEMPLATE;
  }
  const path = url.pathname.replace(/\/+$/, "");
  if (!/\/v1$/i.test(path)) return DEFAULT_GENERIC_USAGE_TEMPLATE;
  return Object.freeze({
    request: Object.freeze({
      url: "{{baseUrl}}/usage",
      method: "GET",
      headers: Object.freeze({ Authorization: "Bearer {{apiKey}}" })
    }),
    extractor: defaultUsageExtractor
  });
}
var AccountError = class extends Error {
  constructor(status, code = status) {
    super(STATUS_MESSAGES[status] || "provider account query failed");
    this.name = "AccountError";
    this.status = status;
    this.code = code;
  }
};
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
  if (value === null || value === void 0 || value === "") return null;
  const parsed = typeof value === "number" && Number.isFinite(value) ? new Date(value < 2e10 ? value * 1e3 : value) : new Date(String(value));
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
  try {
    return await settings?.get?.(name);
  } catch {
    return null;
  }
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
async function configuredProviders(ctx) {
  const settings = serviceFrom(ctx, "settings");
  const deepseek = await setting(settings, "llm-deepseek");
  const providers = [{
    id: "deepseek-official",
    displayName: "DeepSeek",
    apiKeyRef: profileApiKeyRef(deepseek),
    accountApiKeyRef: profileAccountApiKeyRef(deepseek),
    baseURL: profileBaseURL(deepseek) || DEFAULTS.deepseek.baseURL,
    accountType: nonEmpty(deepseek?.accountType) || "api",
    accountUsage: profileUsageTemplate(deepseek),
    source: "deepseek"
  }];
  const pi = await setting(settings, "llm-pi-ai");
  if (pi && typeof pi === "object" && pi.providers && typeof pi.providers === "object") {
    for (const [id, profile] of Object.entries(pi.providers)) {
      if (!profile || typeof profile !== "object" || !nonEmpty(id)) continue;
      providers.push({
        id,
        displayName: displayName(id, profile.displayName),
        apiKeyRef: profileApiKeyRef(profile),
        accountApiKeyRef: profileAccountApiKeyRef(profile),
        baseURL: profileBaseURL(profile),
        accountType: nonEmpty(profile.accountType) || nonEmpty(profile.billingMode),
        accountUsage: profileUsageTemplate(profile),
        api: firstNonEmpty(profile.api, profile.protocol),
        source: "pi-ai"
      });
    }
  }
  const unique = /* @__PURE__ */ new Map();
  for (const provider of providers) if (!unique.has(provider.id)) unique.set(provider.id, provider);
  return [...unique.values()];
}
function accountSpec(provider) {
  const id = String(provider.id || "unknown").toLowerCase();
  const family = providerFamilyOf(id);
  const configuredAccountType = nonEmpty(provider.accountType);
  const accountType = normalizeAccountType(configuredAccountType || (family === "minimax" ? "token-plan" : "api"));
  const subscription = accountType === "subscription" || accountType === "token-plan";
  const configuredBaseURL = firstNonEmpty(provider.baseURL, provider.baseUrl, provider.base_url);
  const configuredApiKeyRef = firstNonEmpty(provider.apiKeyRef, provider.apiKeyEnv, provider.api_key_ref, provider.api_key_env);
  const configuredAccountApiKeyRef = firstNonEmpty(provider.accountApiKeyRef, provider.accountApiKeyEnv, provider.account_api_key_ref, provider.account_api_key_env);
  let adapter = null, mode = "unsupported", defaults = null;
  const usageTemplate = objectRecord(provider.accountUsage);
  if (usageTemplate?.request && typeof usageTemplate.request === "object") {
    adapter = "generic-usage";
    mode = "balance";
  } else if (id === "deepseek" || id === "deepseek-official") {
    adapter = "deepseek-balance";
    mode = "balance";
    defaults = DEFAULTS.deepseek;
  } else if (id === "openrouter") {
    adapter = "openrouter-balance";
    mode = "balance";
    defaults = DEFAULTS.openrouter;
  } else if (["moonshotai", "moonshotai-cn", "kimi", "kimi-api"].includes(id) && !subscription) {
    adapter = "moonshot-balance";
    mode = "balance";
    defaults = DEFAULTS.moonshot;
  } else if (["kimi-coding", "kimi-for-coding"].includes(id) || family === "moonshot" && subscription) {
    adapter = "kimi-token-plan";
    mode = "subscription";
    defaults = DEFAULTS.kimi;
  } else if (["zai-coding-cn", "zai-coding"].includes(id) || family === "zai" && subscription) {
    adapter = "zai-token-plan";
    mode = "subscription";
    defaults = DEFAULTS.zai;
  } else if (family === "zai") {
    adapter = "zai-balance";
    mode = "balance";
    defaults = DEFAULTS.zai;
  } else if (family === "minimax") {
    defaults = DEFAULTS.minimax;
    if (subscription) {
      adapter = "minimax-token-plan";
      mode = "subscription";
    }
  }
  const customRoute = provider.source === "pi-ai" || family === "unknown";
  const hasCredentialRef = firstNonEmpty(configuredApiKeyRef, configuredAccountApiKeyRef, usageTemplate?.apiKeyRef, usageTemplate?.apiKeyEnv);
  if (!adapter && !subscription && customRoute && validTemplateBase(configuredBaseURL) && hasCredentialRef) {
    adapter = "generic-usage";
    mode = "balance";
  }
  const templateKeyRef = nonEmpty(usageTemplate?.apiKeyRef) || nonEmpty(usageTemplate?.apiKeyEnv);
  const apiKeyRef = adapter === "openrouter-balance" ? configuredAccountApiKeyRef || DEFAULTS.openrouter.apiKeyRef : templateKeyRef || configuredAccountApiKeyRef || configuredApiKeyRef || defaults?.apiKeyRef || null;
  return {
    id: provider.id,
    displayName: displayName(provider.id, provider.displayName),
    providerFamily: family,
    adapter,
    mode,
    apiKeyRef,
    baseURL: configuredBaseURL || firstNonEmpty(usageTemplate?.baseURL) || defaults?.baseURL || null,
    actionUrl: defaults?.actionUrl || null,
    accountType,
    usageTemplate: adapter === "generic-usage" ? usageTemplate?.request ? usageTemplate : defaultUsageTemplateFor(configuredBaseURL) : usageTemplate
  };
}
function allowedUrl(baseURL, path, allowedHosts) {
  let base;
  try {
    base = new URL(baseURL);
  } catch {
    throw new AccountError("blocked", "invalid-url");
  }
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
    try {
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new AccountError("invalid-response", "invalid-json");
    }
  }
  try {
    return await response.json();
  } catch {
    throw new AccountError("invalid-response", "invalid-json");
  }
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
function interpolateTemplate(value, variables) {
  if (typeof value === "string") return value.replace(/\{\{(baseUrl|apiKey)\}\}/g, (_match, key) => variables[key]);
  if (Array.isArray(value)) return value.map((item) => interpolateTemplate(item, variables));
  if (value && typeof value === "object") {
    const result = {};
    for (const [key, item] of Object.entries(value)) result[key] = interpolateTemplate(item, variables);
    return result;
  }
  return value;
}
function templateUrl(baseURL, configuredUrl) {
  let base;
  try {
    base = new URL(baseURL);
  } catch {
    throw new AccountError("blocked", "invalid-url");
  }
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) throw new AccountError("blocked", "endpoint-not-allowed");
  if (typeof configuredUrl !== "string" || !configuredUrl.trim()) throw new AccountError("invalid-response", "usage-request-missing");
  if (/\{\{apiKey\}\}/.test(configuredUrl)) throw new AccountError("blocked", "credential-in-url");
  const expanded = configuredUrl.replace(/\{\{baseUrl\}\}/g, base.toString().replace(/\/$/, ""));
  let target;
  try {
    target = new URL(expanded, base);
  } catch {
    throw new AccountError("blocked", "invalid-url");
  }
  if (target.protocol !== "https:" || target.origin !== base.origin || target.username || target.password) {
    throw new AccountError("blocked", "endpoint-not-allowed");
  }
  return target.href;
}
async function requestTemplate(template, spec, key, deps) {
  const request = template?.request;
  if (!request || typeof request !== "object") throw new AccountError("invalid-response", "usage-request-missing");
  const method = String(request.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "POST") throw new AccountError("blocked", "method-not-allowed");
  const url = templateUrl(spec.baseURL, request.url);
  const variables = { baseUrl: spec.baseURL.replace(/\/$/, ""), apiKey: key };
  const headers = interpolateTemplate(request.headers && typeof request.headers === "object" ? request.headers : {}, variables);
  const bodyValue = request.body === void 0 ? void 0 : interpolateTemplate(request.body, variables);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs || REQUEST_TIMEOUT_MS);
  try {
    let response;
    try {
      const init = { method, headers: { accept: "application/json", ...headers }, redirect: "error", signal: controller.signal };
      if (bodyValue !== void 0 && method !== "GET") {
        init.body = typeof bodyValue === "string" ? bodyValue : JSON.stringify(bodyValue);
        if (!Object.keys(init.headers).some((name) => name.toLowerCase() === "content-type")) init.headers["content-type"] = "application/json";
      }
      response = await (deps.fetch || globalThis.fetch)(url, init);
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
function pathValue(value, path) {
  if (typeof path !== "string" || !path.trim()) return void 0;
  return path.split(".").filter(Boolean).reduce((current, key) => current == null ? void 0 : current[key], value);
}
function extractorValue(body, descriptor) {
  if (Array.isArray(descriptor)) {
    for (const path of descriptor) {
      const value = pathValue(body, path);
      if (value !== void 0 && value !== null) return value;
    }
    return void 0;
  }
  return pathValue(body, descriptor);
}
function genericUsageView(template, body) {
  let extracted;
  try {
    if (typeof template?.extractor === "function") extracted = template.extractor(body);
    else if (template?.extractor && typeof template.extractor === "object") {
      extracted = {};
      for (const [key, path] of Object.entries(template.extractor)) extracted[key] = extractorValue(body, path);
    } else extracted = body;
  } catch (error) {
    if (error instanceof AccountError) throw error;
    throw new AccountError("invalid-response", "extractor-failed");
  }
  if (!extracted || typeof extracted !== "object" || Array.isArray(extracted)) throw new AccountError("invalid-response", "invalid-usage-extractor");
  const source = body && typeof body === "object" && !Array.isArray(body) ? body : null;
  const isValid = extracted.isValid ?? source?.is_active ?? source?.isValid;
  if (isValid === false) throw new AccountError("invalid-response", "provider-invalid");
  const quota = extracted.quota && typeof extracted.quota === "object" ? extracted.quota : null;
  const sourceQuota = source?.quota && typeof source.quota === "object" ? source.quota : null;
  const remaining = extracted.remaining ?? quota?.remaining ?? extracted.balance ?? source?.remaining ?? sourceQuota?.remaining ?? source?.balance;
  const unit = extracted.unit ?? quota?.unit ?? source?.unit ?? sourceQuota?.unit ?? "USD";
  const total = extracted.total ?? quota?.total ?? source?.total ?? sourceQuota?.total;
  const used = extracted.used ?? quota?.used ?? source?.used ?? sourceQuota?.used;
  return balanceView(unit, remaining, { total, used, toppedUp: extracted.toppedUp, granted: extracted.granted, unlimited: extracted.unlimited === true });
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
  const row = remains.find((entry) => String(entry?.model_name ?? entry?.modelName ?? "").toLowerCase() === "general") || remains.find((entry) => /^(minimax-m|coding-plan)/i.test(String(entry?.model_name ?? entry?.modelName ?? "")));
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
  if (spec.adapter === "generic-usage") {
    body = await requestTemplate(spec.usageTemplate, spec, key, deps);
    balance = genericUsageView(spec.usageTemplate, body);
  } else if (spec.adapter === "deepseek-balance") {
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
    try {
      subscription = await requestJson(host + "/api/biz/subscription/list", headers, deps);
    } catch {
    }
    const limits = Array.isArray(body?.data?.limits) ? body.data.limits : [];
    const tokenLimits = limits.filter((row) => ["TOKENS_LIMIT", "CREDIT_LIMIT"].includes(String(row?.type ?? row?.limit_type).toUpperCase()) && zaiUsedPercent(row) !== null).sort((a, b) => (zaiWindowMinutes(a) ?? Number.MAX_SAFE_INTEGER) - (zaiWindowMinutes(b) ?? Number.MAX_SAFE_INTEGER));
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
    const hosts = cn ? ["https://www.minimaxi.com/v1/token_plan/remains", "https://api.minimaxi.com/v1/token_plan/remains", "https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains"] : ["https://www.minimax.io/v1/token_plan/remains", "https://api.minimax.io/v1/token_plan/remains", "https://api.minimax.io/v1/api/openplatform/coding_plan/remains"];
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
var stateByOwner = /* @__PURE__ */ new WeakMap();
function registryState(owner) {
  let state = stateByOwner.get(owner);
  if (!state) {
    state = { cache: /* @__PURE__ */ new Map(), inflight: /* @__PURE__ */ new Map() };
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
    const configured = spec.adapter !== null && (cached ? cached.status !== "not-configured" : !!await resolveCredential(credentials, spec.apiKeyRef));
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

// src/index.js
var { normalizeIdentity, priceUsage, convertCostToCny, summarizeCostsCny, mergeCostSummariesCny } = import_pricing2.default;
var __runInitializers = function(thisArg, initializers, value) {
  var useValue = arguments.length > 2;
  for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
  return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
  function accept(f) {
    if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
    return f;
  }
  var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
  var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
  var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
  var _, done = false;
  for (var i = decorators.length - 1; i >= 0; i--) {
    var context = {};
    for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
    for (var p in contextIn.access) context.access[p] = contextIn.access[p];
    context.addInitializer = function(f) {
      if (done) throw new TypeError("Cannot add initializers after decoration has completed");
      extraInitializers.push(accept(f || null));
    };
    var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
    if (kind === "accessor") {
      if (result === void 0) continue;
      if (result === null || typeof result !== "object") throw new TypeError("Object expected");
      if (_ = accept(result.get)) descriptor.get = _;
      if (_ = accept(result.set)) descriptor.set = _;
      if (_ = accept(result.init)) initializers.unshift(_);
    } else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
    else descriptor[key] = _;
  }
  if (target) Object.defineProperty(target, contextIn.name, descriptor);
  done = true;
};
var SLOT_MINUTES = 30;
var SLOT_MS = SLOT_MINUTES * 60 * 1e3;
var GAP_MS = 10 * 60 * 1e3;
var MIN_INTERVAL_MS = 60 * 1e3;
var LONG_CONTEXT_TOKENS = 512e3;
var ZSTD_MAGIC = 4247762216;
var STATS_SCHEMA_VERSION = 2;
var SESSION_PROJECTION_DOMAIN_VERSION = 3;
var PROJECTION_ROW_VERSIONS = Object.freeze({ sessionStats: 1, tokenUsage: 1, title: 1, sessionListMetadata: 1, statsRoute: 1 });
var DEEPSEEK_BALANCE_API = "https://api.deepseek.com/user/balance";
var DEEPSEEK_TOP_UP_URL = "https://platform.deepseek.com/top_up";
var DEEPSEEK_API_KEY_REF = "DEEPSEEK_API_KEY";
var BALANCE_CACHE_MS = 60 * 1e3;
var BALANCE_TIMEOUT_MS = 15 * 1e3;
var BALANCE_ERROR_MESSAGES = {
  "no-api-key": "\u672A\u914D\u7F6E DEEPSEEK_API_KEY",
  "credential-failed": "\u8BFB\u53D6 DeepSeek \u51ED\u8BC1\u5931\u8D25",
  "fetch-unavailable": "\u5F53\u524D\u5BBF\u4E3B\u4E0D\u652F\u6301\u7F51\u7EDC\u8BF7\u6C42",
  "fetch-timeout": "DeepSeek \u4F59\u989D\u8BF7\u6C42\u8D85\u65F6",
  "fetch-failed": "DeepSeek \u4F59\u989D\u8BF7\u6C42\u5931\u8D25",
  "http-401": "DeepSeek \u51ED\u8BC1\u65E0\u6548\u6216\u5DF2\u8FC7\u671F",
  "http-403": "DeepSeek \u51ED\u8BC1\u6CA1\u6709\u4F59\u989D\u67E5\u8BE2\u6743\u9650",
  "http-429": "DeepSeek \u4F59\u989D\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41",
  "http-4xx": "DeepSeek \u4F59\u989D\u8BF7\u6C42\u88AB\u62D2\u7EDD",
  "http-5xx": "DeepSeek \u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528",
  "invalid-response": "DeepSeek \u8FD4\u56DE\u7684\u4F59\u989D\u6570\u636E\u65E0\u6548",
  "balance-unavailable": "DeepSeek \u4F59\u989D\u6682\u4E0D\u53EF\u7528"
};
var DeepSeekBalanceError = class extends Error {
  constructor(code) {
    super(BALANCE_ERROR_MESSAGES[code] || "DeepSeek \u4F59\u989D\u67E5\u8BE2\u5931\u8D25");
    this.name = "DeepSeekBalanceError";
    this.code = code;
  }
};
function balanceErrorCode(error) {
  return error?.code && typeof error.code === "string" ? error.code : "fetch-failed";
}
function parseBalanceAmount(value) {
  if (value === void 0 || value === null || value === "") return null;
  const number = typeof value === "string" ? Number(value.trim()) : value;
  return Number.isFinite(number) && number >= 0 ? number : null;
}
function normalizeBalanceInfo(info) {
  if (!info || typeof info !== "object" || Array.isArray(info)) throw new DeepSeekBalanceError("invalid-response");
  const currency = typeof info.currency === "string" && info.currency.trim() ? info.currency.trim().toUpperCase() : null;
  const total = parseBalanceAmount(info.total_balance);
  const toppedUp = parseBalanceAmount(info.topped_up_balance);
  const granted = parseBalanceAmount(info.granted_balance);
  if (!currency || total === null || info.topped_up_balance != null && toppedUp === null || info.granted_balance != null && granted === null) {
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
    provider: "deepseek",
    name: "DeepSeek",
    status,
    currency: "CNY",
    total: null,
    toppedUp: null,
    granted: null,
    fetchedAt: null,
    topUpUrl: DEEPSEEK_TOP_UP_URL,
    errorCode: code
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
    try {
      body = await response.json();
    } catch {
      throw new DeepSeekBalanceError("invalid-response");
    }
    if (body?.is_available === false) throw new DeepSeekBalanceError("balance-unavailable");
    if (!Array.isArray(body?.balance_infos) || body.balance_infos.length === 0) throw new DeepSeekBalanceError("invalid-response");
    const accounts = body.balance_infos.map(normalizeBalanceInfo).map((account) => ({ ...account, fetchedAt: now }));
    return balancePayload(now, accounts);
  } finally {
    clearTimeout(timer);
  }
}
var balanceStateByService = /* @__PURE__ */ new WeakMap();
function balanceState(service) {
  let state = balanceStateByService.get(service);
  if (!state) {
    state = { cache: null, inflight: null };
    balanceStateByService.set(service, state);
  }
  return state;
}
function credentialsService(ctx) {
  try {
    return ctx?.reflect?.get?.("credentials", false) || ctx?.credentials || null;
  } catch {
    return null;
  }
}
function dshHome() {
  return process.env.DSH_HOME || join(homedir(), ".dsh");
}
function scanZstdFrames(buffer) {
  const frames = [];
  let truncated = false;
  let offset = 0;
  while (offset < buffer.length) {
    const start = offset;
    if (buffer.length - offset < 4) {
      truncated = true;
      break;
    }
    if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) throw new Error("corrupt Zstandard session log: invalid frame magic");
    offset += 4;
    if (offset >= buffer.length) {
      truncated = true;
      break;
    }
    const descriptor = buffer.readUInt8(offset);
    offset += 1;
    if ((descriptor & 8) !== 0) throw new Error("corrupt Zstandard session log: reserved frame-header bit");
    const contentSizeFlag = descriptor >>> 6;
    const singleSegment = (descriptor & 32) !== 0;
    const checksum = (descriptor & 4) !== 0;
    const dictionaryFlag = descriptor & 3;
    const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
    const contentSizeBytes = contentSizeFlag === 0 ? singleSegment ? 1 : 0 : 1 << contentSizeFlag;
    const headerBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
    if (offset + headerBytes > buffer.length) {
      truncated = true;
      break;
    }
    offset += headerBytes;
    for (; ; ) {
      if (offset + 3 > buffer.length) {
        truncated = true;
        offset = buffer.length;
        break;
      }
      const blockHeader = buffer.readUIntLE(offset, 3);
      offset += 3;
      const lastBlock = (blockHeader & 1) !== 0;
      const blockType = blockHeader >>> 1 & 3;
      const blockSize = blockHeader >>> 3;
      const storedBytes = blockType === 1 ? 1 : blockSize;
      if (blockType === 3) throw new Error("corrupt Zstandard session log: reserved block type");
      if (offset + storedBytes > buffer.length) {
        truncated = true;
        offset = buffer.length;
        break;
      }
      offset += storedBytes;
      if (lastBlock) break;
    }
    if (truncated) break;
    if (checksum && offset + 4 > buffer.length) {
      truncated = true;
      break;
    }
    if (checksum) offset += 4;
    frames.push({ start, end: offset });
  }
  return { frames, truncated };
}
function readJson(file) {
  try {
    return { ok: true, value: JSON.parse(readFileSync(file, "utf8")), error: null };
  } catch (error) {
    return { ok: false, value: null, error };
  }
}
function readStable(file, attempts = 3) {
  let last = null;
  for (let i = 0; i < attempts; i++) {
    const before = statSync(file);
    const buf = readFileSync(file);
    const after = statSync(file);
    last = {
      buf,
      mtimeMs: after.mtimeMs,
      ctimeMs: after.ctimeMs,
      size: after.size,
      ino: after.ino,
      stable: before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs && before.size === after.size && before.ino === after.ino
    };
    if (last.stable) return last;
  }
  return last;
}
function beijingDate(ms) {
  return new Date(ms + 8 * 3600 * 1e3);
}
function localDayKey(ms) {
  const d = beijingDate(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function minutesOfDay(ms) {
  const d = beijingDate(ms);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
function basename(p) {
  return (p || "").replace(/[/\\]+$/, "").split(/[/\\]/).pop() || "";
}
function objectRecord2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function nonNegativeNumber(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
function firstString(...values) {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}
function accountTypeOf(source, fallback = "api") {
  return firstString(source?.accountType, source?.account_type, source?.billingMode, source?.billing_mode, fallback) || "api";
}
function rawIdentity(providerId, modelRaw, accountType, at) {
  return normalizeIdentity(providerId || "unknown", modelRaw || "(unknown)", accountType || "api", at);
}
function identityKey(identity) {
  return [identity.providerId, identity.modelRaw, identity.accountType].join("\0");
}
function identityFields(identity) {
  return {
    providerId: identity.providerId,
    providerFamily: identity.providerFamily,
    modelRaw: identity.modelRaw,
    modelCanonical: identity.modelCanonical,
    accountType: identity.accountType
  };
}
function activityIntervals(times) {
  if (!times.length) return [];
  const intervals = [];
  let s = times[0], last = times[0];
  for (let i = 1; i < times.length; i++) {
    const t = times[i];
    if (t - last <= GAP_MS) last = t;
    else {
      intervals.push([s, last]);
      s = last = t;
    }
  }
  intervals.push([s, last]);
  return intervals.map(([a, b]) => [a, Math.max(b, a + MIN_INTERVAL_MS)]);
}
var sessionsDirCache = { home: null, at: 0, dirs: [] };
function sessionDirs(home) {
  const now = Date.now();
  if (sessionsDirCache.home !== home || now - sessionsDirCache.at > 5e3) {
    try {
      sessionsDirCache = { home, at: now, dirs: readdirSync(join(home, "sessions")) };
    } catch {
      sessionsDirCache = { home, at: now, dirs: [] };
    }
  }
  return sessionsDirCache.dirs;
}
function findSessionFile(home, sessionId) {
  if (typeof sessionId !== "string" || !sessionId) return null;
  let root;
  try {
    root = realpathSync(join(home, "sessions"));
  } catch {
    return null;
  }
  const encodedId = encodeSegment(sessionId);
  const rawIdIsSafe = sessionId !== "." && sessionId !== ".." && !/[/\\\0]/.test(sessionId);
  for (const enc of sessionDirs(home)) {
    const dirIds = rawIdIsSafe && encodedId !== sessionId ? [encodedId, sessionId] : [encodedId];
    for (const dirId of dirIds) for (const suffix of ["session.jsonl.zstd", "session.jsonl"]) {
      const cand = join(root, enc, dirId, suffix);
      try {
        const stat = lstatSync(cand);
        if (!stat.isFile() || stat.isSymbolicLink()) continue;
        const real = realpathSync(cand);
        const rel = relative(root, real);
        if (rel && rel !== ".." && !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) && !isAbsolute(rel)) return real;
      } catch {
      }
    }
  }
  return null;
}
function encodeSegment(raw) {
  if (raw.length === 0) throw new Error("cannot encode an empty path segment");
  if (raw === ".") return "~002E";
  if (raw === "..") return "~002E~002E";
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    const ch = String.fromCharCode(code);
    out += ch !== "~" && /^[A-Za-z0-9._-]$/.test(ch) ? ch : `~${code.toString(16).toUpperCase().padStart(4, "0")}`;
  }
  return out;
}
function expandStorageRecord(record) {
  if (!record || typeof record !== "object") return [record];
  const type = record.type;
  if (type !== "text-chunks" && type !== "reasoning-chunks" && type !== "tool-call-chunks") return [record];
  const exactKeys = (value, keys2) => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === keys2.length && keys2.every((key) => Object.prototype.hasOwnProperty.call(value, key));
  const data = record.data;
  const envelopeKeys = ["type", "seq0", "time0", "data"];
  if (!exactKeys(record, envelopeKeys) || !Number.isSafeInteger(record.seq0) || record.seq0 < 0 || !Number.isSafeInteger(record.time0)) {
    throw new Error("corrupt session log: malformed packed chunk envelope");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("corrupt session log: malformed packed chunk data");
  const membersKey = type === "tool-call-chunks" ? "args" : "texts";
  const members = data[membersKey];
  const keys = type === "tool-call-chunks" ? Object.prototype.hasOwnProperty.call(data, "name") ? ["turn", "step", "index", "id", "name", "dt", "args"] : ["turn", "step", "index", "id", "dt", "args"] : ["turn", "step", "index", "dt", "texts"];
  if (!exactKeys(data, keys) || !Number.isFinite(data.turn) || !Number.isFinite(data.step) || !Number.isFinite(data.index)) {
    throw new Error("corrupt session log: malformed packed chunk data");
  }
  if (!Array.isArray(members) || members.length === 0 || members.some((value) => typeof value !== "string")) throw new Error("corrupt session log: packed chunk members must be non-empty strings");
  if (!Array.isArray(data.dt) || data.dt.length !== members.length - 1 || data.dt.some((dt) => !Number.isSafeInteger(dt))) throw new Error("corrupt session log: invalid packed chunk offsets");
  if (type === "tool-call-chunks" && (typeof data.id !== "string" || Object.prototype.hasOwnProperty.call(data, "name") && typeof data.name !== "string")) throw new Error("corrupt session log: invalid packed tool call");
  if (!Number.isSafeInteger(record.seq0 + members.length - 1)) throw new Error("corrupt session log: packed chunk sequence overflow");
  let time = record.time0;
  return members.map((value, index) => {
    if (index > 0) {
      time += data.dt[index - 1];
      if (!Number.isSafeInteger(time)) throw new Error("corrupt session log: packed chunk time overflow");
    }
    let chunk;
    if (type === "text-chunks") chunk = { type: "text-delta", index: data.index, text: value };
    else if (type === "reasoning-chunks") chunk = { type: "reasoning-delta", index: data.index, text: value };
    else chunk = { type: "tool-call-delta", index: data.index, id: data.id, ...data.name !== void 0 ? { name: data.name } : {}, argumentsDelta: value };
    return { type: "assistant/chunk", seq: record.seq0 + index, time, data: { turn: data.turn, step: data.step, chunk } };
  });
}
function contextService(ctx, name) {
  try {
    if (!ctx) return null;
    if (typeof ctx.get === "function") {
      const value = ctx.get(name);
      if (value !== void 0) return value;
    }
    if (typeof ctx.reflect?.get === "function") {
      const value = ctx.reflect.get(name, false);
      if (value !== void 0) return value;
    }
    return ctx[name] || null;
  } catch {
    return null;
  }
}
function normalizeProjectionUsage(value) {
  const totals = objectRecord2(value?.totals) || value;
  if (!totals) return null;
  return {
    uncached: nonNegativeNumber(totals.uncachedInputTokens),
    output: nonNegativeNumber(totals.outputTokens),
    cacheRead: nonNegativeNumber(totals.cacheReadTokens),
    cacheWrite: nonNegativeNumber(totals.cacheWriteTokens),
    reasoning: 0
  };
}
function projectionCheckpoint(entry, sessionId, header, warnings, domainVersion) {
  const checkpoint = {};
  if (!objectRecord2(entry)) return checkpoint;
  if (domainVersion !== void 0 && domainVersion !== SESSION_PROJECTION_DOMAIN_VERSION) {
    warnings.push({ code: "SESSION_CACHE_DOMAIN_VERSION_UNSUPPORTED", sessionId, message: `projection cache domain version ${String(domainVersion)} is not supported` });
    return checkpoint;
  }
  const identity = objectRecord2(entry.identity);
  if (identity) {
    if (identity.id !== void 0 && identity.id !== sessionId) {
      warnings.push({ code: "SESSION_CACHE_IDENTITY_MISMATCH", sessionId, message: "projection cache identity id did not match the requested session" });
      return checkpoint;
    }
    if (header?.id && identity.id && identity.id !== header.id) return checkpoint;
    if (header?.cwd !== void 0 && identity.cwd !== void 0 && identity.cwd !== header.cwd) {
      warnings.push({ code: "SESSION_CACHE_CWD_MISMATCH", sessionId, message: "projection cache cwd did not match the session header" });
      return checkpoint;
    }
    if (header?.createdAt !== void 0 && identity.createdAt !== void 0 && identity.createdAt !== header.createdAt) {
      warnings.push({ code: "SESSION_CACHE_CREATED_AT_MISMATCH", sessionId, message: "projection cache createdAt did not match the session header" });
      return checkpoint;
    }
    for (const key of ["parentSession", "seedLength"]) {
      if (header?.[key] !== void 0 && identity[key] !== void 0 && identity[key] !== header[key]) {
        warnings.push({ code: "SESSION_CACHE_LIFECYCLE_MISMATCH", sessionId, message: `projection cache ${key} did not match the session lifecycle` });
        return checkpoint;
      }
    }
  }
  const rows = objectRecord2(entry.rows);
  if (!rows) return checkpoint;
  for (const [key, row] of Object.entries(rows)) {
    if (!objectRecord2(row) || !Number.isSafeInteger(row.ver) || row.ver < 0 || !Number.isSafeInteger(row.seq) || row.seq < -1) {
      warnings.push({ code: "SESSION_CACHE_ROW_INVALID", sessionId, message: `projection row ${key} had invalid ver/seq and was ignored` });
      continue;
    }
    if (PROJECTION_ROW_VERSIONS[key] !== void 0 && row.ver !== PROJECTION_ROW_VERSIONS[key]) {
      warnings.push({ code: "SESSION_CACHE_ROW_VERSION_UNSUPPORTED", sessionId, message: `projection row ${key} version ${row.ver} is not supported` });
      continue;
    }
    checkpoint[key] = { ver: row.ver, seq: row.seq, val: row.val };
  }
  return checkpoint;
}
function projectionLifecycleMismatch(route, ...expectedValues) {
  if (!objectRecord2(route)) return null;
  for (const key of ["parentSession", "seedLength"]) {
    if (route[key] === void 0) continue;
    for (const expected of expectedValues) {
      if (!objectRecord2(expected) || expected[key] === void 0) continue;
      if (route[key] !== expected[key]) return key;
    }
  }
  return null;
}
function routeProjectionState() {
  return {
    origin: null,
    parentSession: null,
    seedLength: null,
    current: { providerId: "unknown", model: null, accountType: "api", serviceTier: "standard" },
    routes: {},
    samples: {}
  };
}
function routeProjectionSchema(value) {
  const record = objectRecord2(value);
  if (!record || !objectRecord2(record.current) || !Array.isArray(record.routes)) throw new TypeError("invalid statsRoute projection");
  if (record.origin !== null && typeof record.origin !== "string") throw new TypeError("invalid statsRoute origin");
  if (record.parentSession !== null && typeof record.parentSession !== "string") throw new TypeError("invalid statsRoute parentSession");
  if (record.seedLength !== null && (!Number.isSafeInteger(record.seedLength) || record.seedLength < 0)) throw new TypeError("invalid statsRoute seedLength");
  if (typeof record.current.providerId !== "string" || record.current.model !== null && typeof record.current.model !== "string" || typeof record.current.accountType !== "string" || !["standard", "priority"].includes(record.current.serviceTier)) throw new TypeError("invalid statsRoute current route");
  for (const row of record.routes) {
    if (!objectRecord2(row) || row.model !== null && typeof row.model !== "string" || typeof row.providerId !== "string" || typeof row.accountType !== "string" || !["standard", "priority"].includes(row.serviceTier) || !Number.isSafeInteger(row.slot) || row.slot < 0 || !Number.isFinite(row.time) || row.time < 0) throw new TypeError("invalid statsRoute row");
    for (const key of ["uncached", "output", "cacheRead", "cacheWrite", "reasoning"]) if (!Number.isFinite(row[key]) || row[key] < 0) throw new TypeError("invalid statsRoute token count");
  }
  return value;
}
function routeProjectionStateSchema(value) {
  const record = objectRecord2(value);
  if (!record || !objectRecord2(record.routes) || !objectRecord2(record.samples)) throw new TypeError("invalid statsRoute state");
  routeProjectionSchema(routeProjectionView(record));
  for (const [key, sample] of Object.entries(record.samples)) {
    if (!objectRecord2(sample) || typeof sample.routeKey !== "string") throw new TypeError(`invalid statsRoute sample ${key}`);
    for (const field of ["uncached", "output", "cacheRead", "cacheWrite", "reasoning"]) {
      if (!Number.isFinite(sample[field]) || sample[field] < 0) throw new TypeError(`invalid statsRoute sample ${key}.${field}`);
    }
  }
  return value;
}
function routeProjectionRoute(config, current) {
  const requestedTier = firstString(config?.serviceTier, config?.service_tier);
  return {
    providerId: firstString(config?.provider, config?.providerId, config?.provider_id, current?.providerId) || "unknown",
    model: firstString(config?.model, current?.model),
    accountType: accountTypeOf(config, current?.accountType || "api"),
    serviceTier: requestedTier === "priority" ? "priority" : requestedTier === "standard" ? "standard" : current?.serviceTier === "priority" ? "priority" : "standard"
  };
}
function routeProjectionUsage(event) {
  if (event?.type === "assistant/chunk" && event.data?.chunk?.type === "usage") return event.data.chunk.usage || {};
  if (event?.type === "assistant/message" && event.data?.usage !== void 0) return event.data.usage || {};
  return null;
}
function routeProjectionApply(state, event) {
  if (!event || typeof event !== "object") return state;
  if (event.type === "session") {
    const next = { ...state };
    if (typeof event.origin === "string") next.origin = event.origin;
    if (typeof event.parentSession === "string") next.parentSession = event.parentSession;
    if (Number.isSafeInteger(event.seedLength) && event.seedLength >= 0) next.seedLength = event.seedLength;
    return next;
  }
  const firstOwnSeq = state.parentSession !== null ? state.seedLength ?? 0 : 0;
  if (Number.isSafeInteger(event.seq) && event.seq < firstOwnSeq) return state;
  let current = state.current;
  if (event.type === "request/header") {
    const header = event.data?.header;
    const config = header?.config;
    current = routeProjectionRoute({ ...config, provider: firstString(config?.provider, config?.providerId, config?.provider_id, header?.provider) }, current);
    return { ...state, current };
  }
  const usage = routeProjectionUsage(event);
  if (!usage || !Number.isFinite(event.time) || event.time < 0) return state;
  const source = event.type === "assistant/message" ? event.data?.message?.source : null;
  const route = routeProjectionRoute({
    provider: firstString(source?.provider, source?.providerId, source?.provider_id),
    model: source?.model,
    accountType: accountTypeOf(source, current.accountType),
    serviceTier: source?.serviceTier,
    service_tier: source?.service_tier
  }, current);
  if (!route.model) return { ...state, current: route };
  const uncached = nonNegativeNumber(usage.inputTokens);
  const output = nonNegativeNumber(usage.outputTokens);
  const cacheRead = nonNegativeNumber(usage.cacheReadTokens);
  const cacheWrite = nonNegativeNumber(usage.cacheWriteTokens);
  const reasoning = nonNegativeNumber(usage.reasoningTokens);
  const contextTokens = uncached + cacheRead + cacheWrite;
  const slot = Math.floor(event.time / SLOT_MS);
  const routeKey = JSON.stringify([route.providerId, route.model, route.accountType, route.serviceTier, slot, contextTokens]);
  const sampleKey = Number.isSafeInteger(event.data?.turn) && Number.isSafeInteger(event.data?.step) ? `${event.data.turn}:${event.data.step}` : `event:${Number.isSafeInteger(event.seq) ? event.seq : Object.keys(state.samples).length}`;
  const routes = { ...state.routes };
  const adjust = (key, delta) => {
    const previous2 = routes[key];
    if (!previous2) return;
    const next = { ...previous2 };
    for (const field of ["uncached", "output", "cacheRead", "cacheWrite", "reasoning"]) next[field] = Math.max(0, next[field] + delta * (state.samples[sampleKey]?.[field] || 0));
    if (next.uncached + next.output + next.cacheRead + next.cacheWrite + next.reasoning === 0) delete routes[key];
    else routes[key] = next;
  };
  const previous = state.samples[sampleKey];
  if (previous) adjust(previous.routeKey, -1);
  const row = routes[routeKey] || { providerId: route.providerId, model: route.model, accountType: route.accountType, serviceTier: route.serviceTier, slot, time: event.time, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
  routes[routeKey] = { ...row, time: Math.max(row.time, event.time), uncached: row.uncached + uncached, output: row.output + output, cacheRead: row.cacheRead + cacheRead, cacheWrite: row.cacheWrite + cacheWrite, reasoning: row.reasoning + reasoning };
  const samples = { ...state.samples, [sampleKey]: { routeKey, uncached, output, cacheRead, cacheWrite, reasoning } };
  return { ...state, current: route, routes, samples };
}
function routeProjectionView(state) {
  const routes = Object.values(state.routes).map((row) => ({ ...row })).sort((a, b) => a.slot - b.slot || a.providerId.localeCompare(b.providerId) || String(a.model ?? "").localeCompare(String(b.model ?? "")));
  let primary = state.current;
  let weight = -1;
  for (const row of routes) {
    const nextWeight = row.uncached + row.output + row.cacheRead + row.cacheWrite;
    if (nextWeight > weight) {
      weight = nextWeight;
      primary = row;
    }
  }
  return {
    origin: state.origin,
    parentSession: state.parentSession,
    seedLength: state.seedLength,
    current: { providerId: primary.providerId, model: primary.model, accountType: primary.accountType, serviceTier: primary.serviceTier },
    routes
  };
}
var STATS_ROUTE_PROJECTION = Object.freeze({
  key: "statsRoute",
  stateVersion: 1,
  schema: { parse: routeProjectionSchema },
  stateSchema: { parse: routeProjectionStateSchema },
  init: routeProjectionState,
  apply: routeProjectionApply,
  view: routeProjectionView,
  wire: { viewSchema: { parse: routeProjectionSchema }, view: routeProjectionView }
});
function deriveSessionInfoFromEvents(rawEvents, header = null, quality = {}) {
  const events = [];
  let malformedRecords = 0;
  for (const raw of Array.isArray(rawEvents) ? rawEvents : []) {
    try {
      const expanded = expandStorageRecord(raw);
      for (const event of expanded) events.push(event);
    } catch {
      malformedRecords++;
    }
  }
  const times = [];
  let currentModel = null;
  let currentProvider = "unknown";
  let currentAccountType = "api";
  let currentServiceTier = "standard";
  let origin = typeof header?.origin === "string" ? header.origin : null;
  let parentSession = typeof header?.parentSession === "string" ? header.parentSession : null;
  let seedLength = Number.isSafeInteger(header?.seedLength) && header.seedLength >= 0 ? header.seedLength : null;
  let firstOwnSeq = parentSession !== null ? seedLength ?? 0 : 0;
  const usageByStep = /* @__PURE__ */ new Map();
  const derived = emptyRaw();
  const slotStats = /* @__PURE__ */ new Map();
  const addSlot = (time, field, value) => {
    if (!Number.isFinite(time) || !value) return;
    const slot = Math.floor(time / SLOT_MS);
    const row = slotStats.get(slot) || { slot, turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 };
    row[field] += value;
    slotStats.set(slot, row);
  };
  const addInterval = (field, start, end) => {
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    const first = Math.floor(start / SLOT_MS), last = Math.floor((end - 1) / SLOT_MS);
    for (let slot = first; slot <= last; slot++) {
      const overlap = Math.min(end, (slot + 1) * SLOT_MS) - Math.max(start, slot * SLOT_MS);
      if (overlap > 0) addSlot(slot * SLOT_MS, field, overlap);
    }
  };
  let openStep = null;
  let lastTurn = null;
  const pendingCalls = /* @__PURE__ */ new Map();
  let derivedEvents = 0;
  let lastSeq = -1;
  let expectedSeq = 0;
  let seqGap = false;
  for (const ev of events) {
    const evSeq = ev?.seq;
    if (evSeq !== void 0 && (!Number.isSafeInteger(evSeq) || evSeq < 0)) {
      malformedRecords++;
      continue;
    }
    if (Number.isSafeInteger(evSeq)) {
      if (evSeq !== expectedSeq) {
        if (!(evSeq === firstOwnSeq && expectedSeq < firstOwnSeq)) seqGap = true;
      }
      if (evSeq >= expectedSeq) expectedSeq = evSeq + 1;
      lastSeq = Math.max(lastSeq, evSeq);
    }
    if (evSeq !== void 0 && evSeq < firstOwnSeq) continue;
    const t = ev?.time;
    if (Object.prototype.hasOwnProperty.call(ev || {}, "time") && (!Number.isFinite(t) || t < 0)) {
      malformedRecords++;
      continue;
    }
    if (Number.isFinite(t)) times.push(t);
    if (!ev || typeof ev !== "object") continue;
    if (ev.type === "session") {
      origin = typeof ev.origin === "string" ? ev.origin : origin;
      parentSession = typeof ev.parentSession === "string" ? ev.parentSession : parentSession;
      seedLength = Number.isSafeInteger(ev.seedLength) && ev.seedLength >= 0 ? ev.seedLength : seedLength;
      if (parentSession !== null) firstOwnSeq = seedLength ?? 0;
    } else if (ev.type === "request/header") {
      const config = ev.data?.header?.config;
      if (config?.model) currentModel = config.model;
      const provider = firstString(config?.provider, config?.providerId, config?.provider_id, ev.data?.header?.provider);
      if (provider) currentProvider = provider;
      currentAccountType = accountTypeOf(config, currentAccountType);
      currentServiceTier = config?.serviceTier === "priority" || config?.service_tier === "priority" ? "priority" : "standard";
    } else if (ev.type === "step/start") {
      openStep = Number.isFinite(t) ? { turn: ev.data?.turn, step: ev.data?.step, startTime: t, firstTokenTime: null } : null;
    } else if (ev.type === "assistant/chunk") {
      if (ev.data?.chunk?.type === "usage" && Number.isFinite(t)) {
        const u = ev.data.chunk.usage || {};
        const key = ev.data?.turn !== void 0 && ev.data?.step !== void 0 ? `${ev.data.turn}:${ev.data.step}` : `event:${evSeq ?? events.indexOf(ev)}`;
        usageByStep.set(key, {
          time: t,
          model: currentModel,
          providerId: currentProvider,
          accountType: currentAccountType,
          serviceTier: currentServiceTier,
          uncached: nonNegativeNumber(u.inputTokens),
          output: nonNegativeNumber(u.outputTokens),
          cacheRead: nonNegativeNumber(u.cacheReadTokens),
          cacheWrite: nonNegativeNumber(u.cacheWriteTokens),
          reasoning: nonNegativeNumber(u.reasoningTokens)
        });
      } else if (openStep && openStep.turn === ev.data?.turn && openStep.step === ev.data?.step && openStep.firstTokenTime === null && Number.isFinite(t) && isTokenDelta(ev.data?.chunk)) openStep.firstTokenTime = t;
    } else if (ev.type === "assistant/message") {
      const u = ev.data?.usage;
      const source = ev.data?.message?.source;
      const msgModel = source?.model || currentModel;
      const msgProvider = firstString(source?.provider, source?.providerId, source?.provider_id, currentProvider) || "unknown";
      const msgAccountType = accountTypeOf(source, currentAccountType);
      const msgServiceTier = source?.serviceTier === "priority" || source?.service_tier === "priority" ? "priority" : currentServiceTier;
      if (u !== void 0 && Number.isFinite(t)) {
        const key = ev.data?.turn !== void 0 && ev.data?.step !== void 0 ? `${ev.data.turn}:${ev.data.step}` : `event:${evSeq ?? events.indexOf(ev)}`;
        usageByStep.set(key, {
          time: t,
          model: msgModel,
          providerId: msgProvider,
          accountType: msgAccountType,
          serviceTier: msgServiceTier,
          uncached: nonNegativeNumber(u.inputTokens),
          output: nonNegativeNumber(u.outputTokens),
          cacheRead: nonNegativeNumber(u.cacheReadTokens),
          cacheWrite: nonNegativeNumber(u.cacheWriteTokens),
          reasoning: nonNegativeNumber(u.reasoningTokens)
        });
      }
      if (openStep && openStep.turn === ev.data?.turn && openStep.step === ev.data?.step && Number.isFinite(t)) {
        const llm = Math.max(0, t - openStep.startTime);
        derived.llmMs += llm;
        addInterval("llmMs", openStep.startTime, t);
        if (openStep.firstTokenTime !== null) {
          const ttft = Math.max(0, openStep.firstTokenTime - openStep.startTime);
          derived.ttftMs += ttft;
          derived.ttftSteps++;
          addSlot(openStep.firstTokenTime, "ttftMs", ttft);
          addSlot(openStep.firstTokenTime, "ttftSteps", 1);
          const out = Number.isFinite(u?.outputTokens) && u.outputTokens >= 0 ? u.outputTokens : null;
          if (out !== null) {
            const decode = Math.max(0, t - openStep.firstTokenTime);
            derived.decodeMs += decode;
            derived.decodeTokens += out;
            addInterval("decodeMs", openStep.firstTokenTime, t);
            addSlot(t, "decodeTokens", out);
          }
        }
        derivedEvents++;
        openStep = null;
      }
    } else if (ev.type === "tool/call") {
      const callId = ev.data?.callId;
      if (typeof callId === "string" && Number.isFinite(t)) pendingCalls.set(callId, t);
    } else if (ev.type === "tool/result") {
      const callId = ev.data?.message?.source?.callId;
      if (typeof callId === "string" && pendingCalls.has(callId) && Number.isFinite(t)) {
        const start = pendingCalls.get(callId);
        const tool = Math.max(0, t - start);
        derived.toolMs += tool;
        addInterval("toolMs", start, t);
        pendingCalls.delete(callId);
        derivedEvents++;
      }
    } else if (ev.type === "step/end") {
      derived.steps++;
      addSlot(t, "steps", 1);
      derivedEvents++;
      if (lastTurn !== ev.data?.turn) {
        derived.turns++;
        addSlot(t, "turns", 1);
        lastTurn = ev.data?.turn;
      }
      openStep = null;
    } else if (ev.type === "turn/end") pendingCalls.clear();
  }
  times.sort((a, b) => a - b);
  const modelTokens = /* @__PURE__ */ new Map();
  for (const u of usageByStep.values()) {
    const identity = rawIdentity(u.providerId, u.model, u.accountType, u.time);
    const key = identityKey(identity);
    const row = modelTokens.get(key) || { identity, weight: 0 };
    row.weight += (u.cacheRead || 0) + (u.cacheWrite || 0) + (u.output || 0) + (u.uncached || 0);
    modelTokens.set(key, row);
  }
  let primary = null, modelWeight = -1;
  for (const row of modelTokens.values()) if (row.weight > modelWeight) {
    modelWeight = row.weight;
    primary = row.identity;
  }
  if (primary === null) primary = rawIdentity(currentProvider, currentModel, currentAccountType, times[times.length - 1]);
  return {
    times,
    lastTime: times.length ? times[times.length - 1] : null,
    model: primary.modelRaw === "(unknown)" ? null : primary.modelRaw,
    providerId: primary.providerId,
    accountType: primary.accountType,
    usages: [...usageByStep.values()],
    origin,
    parentSession,
    seedLength,
    stats: derivedEvents ? derived : null,
    slotStats: [...slotStats.values()].sort((a, b) => a.slot - b.slot),
    partial: Boolean(quality.partial) || malformedRecords > 0 || seqGap || header?.version !== void 0 && header.version !== 0,
    stale: Boolean(quality.stale),
    missing: false,
    unavailable: false,
    malformedRecords,
    lastSeq,
    seqGap,
    formatVersion: header?.version,
    futureVersion: header?.version !== void 0 && header.version > 0,
    header: header || null
  };
}
async function officialSessionSource(ctx, sessionId) {
  const sessions = contextService(ctx, "sessions");
  const live = sessions?.get?.(sessionId);
  if (live && Array.isArray(live.events)) return { header: live.header, events: live.events, source: "live", liveSession: live };
  const query = contextService(ctx, "sessionQuery");
  if (query && typeof query.readSession === "function") {
    const loaded = await query.readSession(sessionId);
    if (loaded && Array.isArray(loaded.events)) return { header: loaded.header || loaded.meta || loaded.session, events: loaded.events, source: "sessionQuery" };
  }
  const persistence = contextService(ctx, "sessionPersistence");
  if (persistence && typeof persistence.inspect === "function") {
    const loaded = await persistence.inspect(sessionId);
    if (loaded && Array.isArray(loaded.events)) return { header: loaded.meta || loaded.header || loaded.session, events: loaded.events, source: "sessionPersistence" };
  }
  if (persistence && typeof persistence.load === "function") {
    const loaded = await persistence.load(sessionId);
    if (loaded && Array.isArray(loaded.events)) return { header: loaded.meta || loaded.header || loaded.session, events: loaded.events, source: "sessionPersistence" };
  }
  return null;
}
async function officialProjectionValues(ctx, source, entry, warnings, sessionId, domainVersion) {
  const projections = contextService(ctx, "sessionProjections");
  const projectionCache = contextService(ctx, "sessionProjectionCache");
  try {
    if (source?.source === "live" && source.liveSession && typeof projections?.snapshot === "function") {
      return projections.snapshot(source.liveSession)?.values || null;
    }
    if (projectionCache && typeof projectionCache.coldSnapshot === "function") {
      try {
        const snapshot = await projectionCache.coldSnapshot(sessionId);
        const snapshotSeq = snapshot?.asOfSeq;
        const snapshotDomain = snapshot?.domain ?? snapshot?.unit;
        const snapshotVersion = snapshot?.version;
        const snapshotIdentity = objectRecord2(snapshot?.identity);
        const expectedIdentity = objectRecord2(entry?.identity) || objectRecord2(source?.header);
        const lifecycleMismatch = projectionLifecycleMismatch(snapshot?.values?.statsRoute, entry?.identity, source?.header);
        const identityMismatch = snapshotIdentity && expectedIdentity && (snapshotIdentity.id !== void 0 && expectedIdentity.id !== void 0 && snapshotIdentity.id !== expectedIdentity.id || snapshotIdentity.createdAt !== void 0 && expectedIdentity.createdAt !== void 0 && snapshotIdentity.createdAt !== expectedIdentity.createdAt || snapshotIdentity.cwd !== void 0 && expectedIdentity.cwd !== void 0 && snapshotIdentity.cwd !== expectedIdentity.cwd);
        if (snapshotDomain !== void 0 && snapshotDomain !== "session_projcache") {
          warnings.push({ code: "SESSION_CACHE_DOMAIN_MISMATCH", sessionId, message: "official projection snapshot belonged to a different domain" });
        } else if (identityMismatch) {
          warnings.push({ code: "SESSION_CACHE_IDENTITY_MISMATCH", sessionId, message: "official projection snapshot identity did not match the requested lifecycle" });
        } else if (lifecycleMismatch) {
          warnings.push({ code: "SESSION_CACHE_LIFECYCLE_MISMATCH", sessionId, message: `official projection snapshot ${lifecycleMismatch} did not match the session lifecycle` });
        } else if (snapshotVersion !== void 0 && snapshotVersion !== SESSION_PROJECTION_DOMAIN_VERSION) {
          warnings.push({ code: "SESSION_CACHE_DOMAIN_VERSION_UNSUPPORTED", sessionId, message: `official projection snapshot version ${String(snapshotVersion)} is not supported` });
        } else if (snapshotSeq !== void 0 && (!Number.isSafeInteger(snapshotSeq) || snapshotSeq < -1)) {
          warnings.push({ code: "SESSION_CACHE_WATERMARK_INVALID", sessionId, message: "official projection snapshot watermark was invalid" });
        } else if (snapshot?.values && typeof snapshot.values === "object" && !Array.isArray(snapshot.values)) {
          warnings.push({ code: "OFFICIAL_PROJECTION_CACHE_USED", sessionId, message: "projection values loaded through sessionProjectionCache coldSnapshot" });
          return snapshot.values;
        }
      } catch {
      }
    }
    if (!projections) return null;
    const persistence = contextService(ctx, "sessionPersistence");
    if (persistence && typeof persistence.readFrom === "function" && typeof projections.restore === "function" && typeof projections.restoreFloor === "function") {
      const checkpoint = projectionCheckpoint(entry, sessionId, source?.header, warnings, domainVersion);
      const floor = projections.restoreFloor(checkpoint);
      if (floor !== void 0) {
        const suffix = await persistence.readFrom(sessionId, floor);
        if (suffix && Array.isArray(suffix.events)) {
          const restored = projections.restore(checkpoint, suffix.events, floor);
          return restored?.snapshot?.values || null;
        }
      }
    }
    if (typeof projections.restore === "function" && source?.events) {
      const checkpoint = projectionCheckpoint(entry, sessionId, source.header, warnings, domainVersion);
      const restored = projections.restore(checkpoint, source.events, 0);
      return restored?.snapshot?.values || null;
    }
  } catch (error) {
    warnings.push({ code: "OFFICIAL_PROJECTION_FAILED", sessionId, message: error?.message || String(error) });
  }
  return null;
}
function infoFromProjectionValues(values, entry) {
  const metadata = objectRecord2(values?.sessionListMetadata) || objectRecord2(entry?.rows?.sessionListMetadata?.val) || {};
  const identity = objectRecord2(entry?.identity) || {};
  const createdAt = Number.isFinite(identity.createdAt) && identity.createdAt >= 0 ? identity.createdAt : null;
  const lastPromptAt = Number.isFinite(metadata.lastPromptAt) && metadata.lastPromptAt >= 0 ? metadata.lastPromptAt : null;
  const routeProjection = objectRecord2(values?.statsRoute);
  const routeRows = Array.isArray(routeProjection?.routes) ? routeProjection.routes.filter((row) => objectRecord2(row) && typeof row.model === "string") : [];
  const routeTimes = routeRows.map((row) => row.time).filter((value) => Number.isFinite(value) && value >= 0);
  const times = [createdAt, lastPromptAt, ...routeTimes].filter((value, index, list) => value !== null && list.indexOf(value) === index).sort((a, b) => a - b);
  const usages = routeRows.map((row) => ({
    time: row.time,
    model: row.model,
    providerId: row.providerId,
    accountType: row.accountType,
    serviceTier: row.serviceTier,
    uncached: nonNegativeNumber(row.uncached),
    output: nonNegativeNumber(row.output),
    cacheRead: nonNegativeNumber(row.cacheRead),
    cacheWrite: nonNegativeNumber(row.cacheWrite),
    reasoning: nonNegativeNumber(row.reasoning)
  }));
  const current = objectRecord2(routeProjection?.current) || {};
  return {
    times,
    lastTime: times.length ? times.at(-1) : null,
    model: firstString(current.model, metadata.model, identity.model),
    providerId: firstString(current.providerId, metadata.providerId, identity.providerId) || "unknown",
    accountType: firstString(current.accountType, metadata.accountType, identity.accountType) || "api",
    usages,
    origin: firstString(routeProjection?.origin, metadata.origin, identity.origin),
    parentSession: firstString(routeProjection?.parentSession, metadata.parentSession, identity.parentSession),
    seedLength: Number.isSafeInteger(routeProjection?.seedLength) && routeProjection.seedLength >= 0 ? routeProjection.seedLength : Number.isSafeInteger(metadata.seedLength) && metadata.seedLength >= 0 ? metadata.seedLength : null,
    stats: objectRecord2(values?.sessionStats),
    slotStats: [],
    partial: true,
    cacheOnly: true,
    stale: false,
    missing: false,
    unavailable: false,
    seqGap: false,
    futureVersion: false,
    lastSeq: -1
  };
}
function isTokenDelta(chunk) {
  if (!chunk || typeof chunk !== "object") return false;
  if (chunk.type === "text-delta" || chunk.type === "reasoning-delta") return chunk.text !== "";
  return chunk.type === "tool-call-delta" && (chunk.argumentsDelta !== "" || chunk.name !== void 0);
}
function readSessionRecords(file, snapshot) {
  const records = [];
  let truncated = false;
  if (file.endsWith(".jsonl")) {
    const text = snapshot.buf.toString("utf8");
    const lines = text.split("\n");
    if (lines.length && lines.at(-1) !== "") {
      truncated = true;
      lines.pop();
    }
    for (const line of lines) {
      if (!line) continue;
      try {
        records.push(JSON.parse(line));
      } catch {
        records.push(null);
      }
    }
    return { records, truncated };
  }
  const scanned = scanZstdFrames(snapshot.buf);
  truncated = scanned.truncated;
  for (const frame of scanned.frames) {
    const text = zstdDecompressSync(snapshot.buf.subarray(frame.start, frame.end)).toString("utf8");
    const lines = text.split("\n");
    if (lines.at(-1) !== "") truncated = true;
    for (const line of lines) {
      if (!line) continue;
      try {
        records.push(JSON.parse(line));
      } catch {
        records.push(null);
      }
    }
  }
  return { records, truncated };
}
var sessionInfoCache = /* @__PURE__ */ new Map();
var SESSION_CACHE_LIMIT = 300;
function sessionInfo(home, sessionId) {
  const file = findSessionFile(home, sessionId);
  if (!file) return { times: [], lastTime: null, model: null, providerId: "unknown", accountType: "api", usages: [], origin: null, parentSession: null, seedLength: null, stats: null, slotStats: [], partial: false, stale: false, missing: true, seqGap: false, futureVersion: false, header: null };
  const cached = sessionInfoCache.get(file);
  let snapshot;
  try {
    snapshot = readStable(file);
  } catch (error) {
    if (cached) return { ...cached.info, stale: true, readError: error.message };
    throw error;
  }
  const { mtimeMs, ctimeMs, size, ino } = snapshot;
  if (cached && cached.mtimeMs === mtimeMs && cached.ctimeMs === ctimeMs && cached.size === size && cached.ino === ino) {
    sessionInfoCache.delete(file);
    sessionInfoCache.set(file, cached);
    return cached.info;
  }
  const decoded = readSessionRecords(file, snapshot);
  const records = decoded.records;
  const times = [];
  let currentModel = null;
  let currentProvider = "unknown";
  let currentAccountType = "api";
  let currentServiceTier = "standard";
  let sessionHeader = null;
  for (const record of records) {
    try {
      for (const ev of expandStorageRecord(record)) if (ev?.type === "session") {
        sessionHeader = ev;
        break;
      }
    } catch {
    }
    if (sessionHeader) break;
  }
  let origin = typeof sessionHeader?.origin === "string" ? sessionHeader.origin : null;
  let parentSession = typeof sessionHeader?.parentSession === "string" ? sessionHeader.parentSession : null;
  let seedLength = Number.isInteger(sessionHeader?.seedLength) && sessionHeader.seedLength >= 0 ? sessionHeader.seedLength : null;
  const invalidSessionHeader = !!sessionHeader && (sessionHeader.origin !== void 0 && sessionHeader.origin !== null && typeof sessionHeader.origin !== "string" || sessionHeader.parentSession !== void 0 && sessionHeader.parentSession !== null && typeof sessionHeader.parentSession !== "string" || sessionHeader.seedLength !== void 0 && sessionHeader.seedLength !== null && seedLength === null);
  let firstOwnSeq = parentSession !== null ? Number.isInteger(seedLength) && seedLength >= 0 ? seedLength : 0 : 0;
  const usageByStep = /* @__PURE__ */ new Map();
  const derived = emptyRaw();
  const slotStats = /* @__PURE__ */ new Map();
  const addSlot = (time, field, value) => {
    if (typeof time !== "number" || !Number.isFinite(time) || !value) return;
    const slot = Math.floor(time / SLOT_MS);
    const row = slotStats.get(slot) || { slot, turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 };
    row[field] += value;
    slotStats.set(slot, row);
  };
  const addInterval = (field, start, end) => {
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    const first = Math.floor(start / SLOT_MS), last = Math.floor((end - 1) / SLOT_MS);
    for (let slot = first; slot <= last; slot++) {
      const overlap = Math.min(end, (slot + 1) * SLOT_MS) - Math.max(start, slot * SLOT_MS);
      if (overlap > 0) addSlot(slot * SLOT_MS, field, overlap);
    }
  };
  let openStep = null;
  let lastTurn = null;
  const pendingCalls = /* @__PURE__ */ new Map();
  let derivedEvents = 0;
  let malformedRecords = invalidSessionHeader ? 1 : 0;
  let decodedEvents = sessionHeader ? 1 : 0;
  let lastSeq = -1;
  let expectedSeq = 0;
  let seqGap = false;
  let futureVersion = false;
  let usageFallbackIndex = 0;
  for (const record of records) {
    if (record === null) {
      malformedRecords++;
      continue;
    }
    let events;
    try {
      events = expandStorageRecord(record);
    } catch {
      malformedRecords++;
      continue;
    }
    for (const ev of events) {
      const evSeq = ev?.seq;
      if (evSeq !== void 0 && (!Number.isInteger(evSeq) || evSeq < 0)) {
        malformedRecords++;
        continue;
      }
      if (Number.isSafeInteger(evSeq)) {
        if (evSeq !== expectedSeq && !(evSeq === firstOwnSeq && expectedSeq < firstOwnSeq)) seqGap = true;
        if (evSeq >= expectedSeq) expectedSeq = evSeq + 1;
        lastSeq = Math.max(lastSeq, evSeq);
      }
      if (evSeq !== void 0 && evSeq < firstOwnSeq) continue;
      const t = ev?.time;
      if (ev && Object.prototype.hasOwnProperty.call(ev, "time") && (!Number.isFinite(t) || t < 0)) {
        malformedRecords++;
        continue;
      }
      if (Number.isFinite(t)) times.push(t);
      if (!ev || typeof ev !== "object") continue;
      decodedEvents++;
      if (ev.type === "session") {
        if (ev.origin !== void 0 && ev.origin !== null && typeof ev.origin !== "string") malformedRecords++;
        if (ev.parentSession !== void 0 && ev.parentSession !== null && typeof ev.parentSession !== "string") malformedRecords++;
        origin = typeof ev.origin === "string" ? ev.origin : null;
        parentSession = typeof ev.parentSession === "string" ? ev.parentSession : null;
        if (ev.seedLength !== void 0 && ev.seedLength !== null && (!Number.isInteger(ev.seedLength) || ev.seedLength < 0)) malformedRecords++;
        seedLength = Number.isInteger(ev.seedLength) && ev.seedLength >= 0 ? ev.seedLength : null;
        if (parentSession !== null) firstOwnSeq = seedLength ?? 0;
      } else if (ev.type === "request/header") {
        const header = ev.data?.header;
        const config = header?.config;
        const m = config?.model;
        if (m) currentModel = m;
        const provider = firstString(config?.provider, config?.providerId, config?.provider_id, header?.provider);
        if (provider) currentProvider = provider;
        currentAccountType = accountTypeOf(config, currentAccountType);
        currentServiceTier = config?.serviceTier === "priority" || config?.service_tier === "priority" ? "priority" : "standard";
      } else if (ev.type === "step/start") {
        openStep = Number.isFinite(t) ? { turn: ev.data?.turn, step: ev.data?.step, startTime: t, firstTokenTime: null } : null;
      } else if (ev.type === "assistant/chunk") {
        if (ev.data?.chunk?.type === "usage" && Number.isFinite(t)) {
          const u = ev.data.chunk.usage || {};
          const hasStepIdentity = ev.data?.turn !== void 0 && ev.data?.step !== void 0;
          if (!hasStepIdentity) malformedRecords++;
          const usageKey = hasStepIdentity ? `${ev.data.turn}:${ev.data.step}` : `event:${evSeq ?? "missing"}:${usageFallbackIndex++}`;
          usageByStep.set(usageKey, {
            time: t,
            model: currentModel,
            providerId: currentProvider,
            accountType: currentAccountType,
            serviceTier: currentServiceTier,
            uncached: nonNegativeNumber(u.inputTokens),
            output: nonNegativeNumber(u.outputTokens),
            cacheRead: nonNegativeNumber(u.cacheReadTokens),
            cacheWrite: nonNegativeNumber(u.cacheWriteTokens),
            reasoning: nonNegativeNumber(u.reasoningTokens)
          });
        } else if (openStep && openStep.turn === ev.data?.turn && openStep.step === ev.data?.step && openStep.firstTokenTime === null && Number.isFinite(t) && isTokenDelta(ev.data?.chunk)) {
          openStep.firstTokenTime = t;
        }
      } else if (ev.type === "assistant/message") {
        const u = ev.data?.usage;
        const source = ev.data?.message?.source;
        const msgModel = source?.model || currentModel;
        const msgProvider = firstString(source?.provider, source?.providerId, source?.provider_id, currentProvider) || "unknown";
        const msgAccountType = accountTypeOf(source, currentAccountType);
        const msgServiceTier = source?.serviceTier === "priority" || source?.service_tier === "priority" ? "priority" : currentServiceTier;
        if (u !== void 0 && Number.isFinite(t)) {
          const hasStepIdentity = ev.data?.turn !== void 0 && ev.data?.step !== void 0;
          if (!hasStepIdentity) malformedRecords++;
          const usageKey = hasStepIdentity ? `${ev.data.turn}:${ev.data.step}` : `event:${evSeq ?? "missing"}:${usageFallbackIndex++}`;
          usageByStep.set(usageKey, {
            time: t,
            model: msgModel,
            providerId: msgProvider,
            accountType: msgAccountType,
            serviceTier: msgServiceTier,
            uncached: nonNegativeNumber(u.inputTokens),
            output: nonNegativeNumber(u.outputTokens),
            cacheRead: nonNegativeNumber(u.cacheReadTokens),
            cacheWrite: nonNegativeNumber(u.cacheWriteTokens),
            reasoning: nonNegativeNumber(u.reasoningTokens)
          });
        }
        if (openStep && openStep.turn === ev.data?.turn && openStep.step === ev.data?.step && Number.isFinite(t)) {
          const llm = Math.max(0, t - openStep.startTime);
          derived.llmMs += llm;
          addInterval("llmMs", openStep.startTime, t);
          if (openStep.firstTokenTime !== null) {
            const ttft = Math.max(0, openStep.firstTokenTime - openStep.startTime);
            derived.ttftMs += ttft;
            derived.ttftSteps++;
            addSlot(openStep.firstTokenTime, "ttftMs", ttft);
            addSlot(openStep.firstTokenTime, "ttftSteps", 1);
            const out = Number.isFinite(u?.outputTokens) && u.outputTokens >= 0 ? u.outputTokens : null;
            if (out !== null) {
              const decode = Math.max(0, t - openStep.firstTokenTime);
              derived.decodeMs += decode;
              derived.decodeTokens += out;
              addInterval("decodeMs", openStep.firstTokenTime, t);
              addSlot(t, "decodeTokens", out);
            }
          }
          derivedEvents++;
          openStep = null;
        }
      } else if (ev.type === "tool/call") {
        const callId = ev.data?.callId;
        if (callId !== void 0 && Number.isFinite(t)) pendingCalls.set(callId, t);
      } else if (ev.type === "tool/result") {
        const callId = ev.data?.message?.source?.callId;
        if (pendingCalls.has(callId) && Number.isFinite(t)) {
          const start = pendingCalls.get(callId);
          const tool = Math.max(0, t - start);
          derived.toolMs += tool;
          addInterval("toolMs", start, t);
          pendingCalls.delete(callId);
          derivedEvents++;
        }
      } else if (ev.type === "step/end") {
        derived.steps++;
        addSlot(t, "steps", 1);
        derivedEvents++;
        if (lastTurn !== ev.data?.turn) {
          derived.turns++;
          addSlot(t, "turns", 1);
          lastTurn = ev.data?.turn;
        }
        openStep = null;
      } else if (ev.type === "turn/end") {
        pendingCalls.clear();
      }
    }
  }
  if (sessionHeader && sessionHeader.version !== 0) futureVersion = sessionHeader.version > 0;
  times.sort((a, b) => a - b);
  const modelTokens = /* @__PURE__ */ new Map();
  for (const u of usageByStep.values()) {
    const identity = rawIdentity(u.providerId, u.model, u.accountType, u.time);
    const mk = identityKey(identity);
    const weight = (u.cacheRead || 0) + (u.cacheWrite || 0) + (u.output || 0) + (u.uncached || 0);
    const row = modelTokens.get(mk) || { identity, weight: 0 };
    row.weight += weight;
    modelTokens.set(mk, row);
  }
  let primary = null, modelWeight = -1;
  for (const row of modelTokens.values()) {
    if (row.weight > modelWeight) {
      modelWeight = row.weight;
      primary = row.identity;
    }
  }
  if (primary === null) primary = rawIdentity(currentProvider, currentModel, currentAccountType, times[times.length - 1]);
  const info = {
    times,
    lastTime: times.length ? times[times.length - 1] : null,
    lastSeq,
    model: primary.modelRaw === "(unknown)" ? null : primary.modelRaw,
    providerId: primary.providerId,
    accountType: primary.accountType,
    usages: [...usageByStep.values()],
    origin,
    parentSession,
    seedLength,
    stats: derivedEvents ? derived : null,
    slotStats: [...slotStats.values()].sort((a, b) => a.slot - b.slot),
    partial: decoded.truncated || !snapshot.stable || malformedRecords > 0 || decodedEvents === 0 || seqGap || futureVersion,
    stale: false,
    missing: false,
    seqGap,
    formatVersion: sessionHeader?.version,
    futureVersion,
    header: sessionHeader
  };
  sessionInfoCache.set(file, { mtimeMs, ctimeMs, size, ino, info });
  while (sessionInfoCache.size > SESSION_CACHE_LIMIT) {
    const oldest = sessionInfoCache.keys().next().value;
    sessionInfoCache.delete(oldest);
  }
  return info;
}
function emptyRaw() {
  return { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, uncached: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
}
function addRaw(a, b) {
  a.turns += b.turns;
  a.steps += b.steps;
  a.llmMs += b.llmMs;
  a.toolMs += b.toolMs;
  a.ttftMs += b.ttftMs;
  a.ttftSteps += b.ttftSteps;
  a.decodeMs += b.decodeMs;
  a.decodeTokens += b.decodeTokens;
  a.uncached += b.uncached;
  a.output += b.output;
  a.cacheRead += b.cacheRead;
  a.cacheWrite += b.cacheWrite;
  a.reasoning += b.reasoning;
}
function slotDurations(times) {
  const slotMs = /* @__PURE__ */ new Map();
  for (const [s, e] of activityIntervals(times)) {
    const startSlot = Math.floor(s / SLOT_MS);
    const endSlot = Math.floor(e / SLOT_MS);
    for (let k = startSlot; k <= endSlot; k++) {
      const overlap = Math.min(e, (k + 1) * SLOT_MS) - Math.max(s, k * SLOT_MS);
      if (overlap > 0) slotMs.set(k, (slotMs.get(k) || 0) + overlap);
    }
  }
  return [...slotMs.entries()].map(([slot, ms]) => ({ slot, ms }));
}
function slotUsages(usages) {
  const m = /* @__PURE__ */ new Map();
  for (const u of usages) {
    const k = Math.floor(u.time / SLOT_MS);
    const identity = rawIdentity(u.providerId, u.model, u.accountType, u.time);
    const serviceTier = u.serviceTier === "priority" ? "priority" : "standard";
    const contextTokens = u.uncached + u.cacheRead + u.cacheWrite;
    const contextOver512k = contextTokens > LONG_CONTEXT_TOKENS;
    const key = identityKey(identity) + "\0" + serviceTier + "\0" + contextTokens + "\0" + k;
    const cur = m.get(key) || {
      model: identity.modelRaw,
      ...identityFields(identity),
      serviceTier,
      contextTokens,
      contextOver512k,
      slot: k,
      uncached: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      reasoning: 0
    };
    cur.uncached += u.uncached;
    cur.output += u.output;
    cur.cacheRead += u.cacheRead;
    cur.cacheWrite += u.cacheWrite;
    cur.reasoning += u.reasoning;
    m.set(key, cur);
  }
  return [...m.values()].map((row) => ({ ...row, cost: convertCostToCny(priceUsage(row, row)) }));
}
function modelUsages(rows) {
  const grouped = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const identity = rawIdentity(row.providerId, row.modelRaw || row.model, row.accountType, row.slot * SLOT_MS);
    const key = identityKey(identity);
    const current = grouped.get(key) || {
      model: identity.modelRaw,
      ...identityFields(identity),
      uncached: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      reasoning: 0,
      _costs: []
    };
    current.uncached += row.uncached || 0;
    current.output += row.output || 0;
    current.cacheRead += row.cacheRead || 0;
    current.cacheWrite += row.cacheWrite || 0;
    current.reasoning += row.reasoning || 0;
    current._costs.push(convertCostToCny(row.cost || priceUsage(row, row)));
    grouped.set(key, current);
  }
  return [...grouped.values()].map(({ _costs, ...row }) => ({ ...row, cost: summarizeCostsCny(_costs) }));
}
function projectionSlotUsage(info, usage, updatedAt) {
  const identity = rawIdentity(info.providerId, info.model, info.accountType, updatedAt);
  const contextTokens = usage.uncached + usage.cacheRead + usage.cacheWrite;
  const row = {
    model: identity.modelRaw,
    ...identityFields(identity),
    serviceTier: "standard",
    contextTokens,
    contextOver512k: contextTokens > LONG_CONTEXT_TOKENS,
    slot: Math.floor(updatedAt / SLOT_MS),
    ...usage
  };
  return { ...row, cost: convertCostToCny(priceUsage(row, row)) };
}
var StatsService = (() => {
  let _classSuper = TypertRemoteService;
  let _instanceExtraInitializers = [];
  let _aggregate_decorators;
  let _current_decorators;
  let _providers_decorators;
  let _account_decorators;
  return class StatsService extends _classSuper {
    static {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _aggregate_decorators = [Remote("aggregate")];
      _current_decorators = [Remote("current")];
      _providers_decorators = [Remote("providers")];
      _account_decorators = [Remote("account")];
      __esDecorate(this, null, _aggregate_decorators, {
        kind: "method",
        name: "aggregate",
        static: false,
        private: false,
        access: { has: (obj) => "aggregate" in obj, get: (obj) => obj.aggregate },
        metadata: _metadata
      }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _current_decorators, {
        kind: "method",
        name: "current",
        static: false,
        private: false,
        access: { has: (obj) => "current" in obj, get: (obj) => obj.current },
        metadata: _metadata
      }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _providers_decorators, {
        kind: "method",
        name: "providers",
        static: false,
        private: false,
        access: { has: (obj) => "providers" in obj, get: (obj) => obj.providers },
        metadata: _metadata
      }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _account_decorators, {
        kind: "method",
        name: "account",
        static: false,
        private: false,
        access: { has: (obj) => "account" in obj, get: (obj) => obj.account },
        metadata: _metadata
      }, null, _instanceExtraInitializers);
      if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    }
    constructor(ctx) {
      super(ctx, "stats");
      __runInitializers(this, _instanceExtraInitializers);
      if (ctx && typeof ctx.inject === "function") {
        ctx.inject(["sessionProjections"], (projectionCtx) => {
          const registry = projectionCtx?.sessionProjections;
          if (registry && typeof registry.register === "function") registry.register(STATS_ROUTE_PROJECTION);
        });
      }
    }
    async aggregate() {
      const home = dshHome();
      const warnings = [];
      const hostCtx = this.ctx || {};
      const workspaceRegistry = contextService(hostCtx, "workspaceRegistry");
      const persistence = contextService(hostCtx, "sessionPersistence");
      const sessionQuery = contextService(hostCtx, "sessionQuery");
      const sessionProjections = contextService(hostCtx, "sessionProjections");
      const projectionCache = contextService(hostCtx, "sessionProjectionCache");
      const officialWorkspaceAvailable = typeof workspaceRegistry?.list === "function";
      const officialProjectionAvailable = typeof projectionCache?.coldSnapshot === "function" || typeof sessionProjections?.restoreFloor === "function" && typeof persistence?.readFrom === "function";
      let wsRead = { ok: false, value: null, error: null };
      let sessionsRead = { ok: false, value: null, error: null };
      let wsJson = null;
      if (!officialWorkspaceAvailable) {
        wsRead = readJson(join(home, "storages", "workspace.json"));
        if (!wsRead.ok) warnings.push({ code: "WORKSPACE_READ_FAILED", message: wsRead.error?.message || "workspace storage read failed" });
        wsJson = wsRead.value;
      }
      if (!officialProjectionAvailable) {
        sessionsRead = readJson(join(home, "storages", "session_projcache.json"));
        if (!sessionsRead.ok) warnings.push({ code: "SESSION_CACHE_READ_FAILED", message: sessionsRead.error?.message || "session projection cache read failed" });
      }
      if (officialWorkspaceAvailable) {
        try {
          const records = {};
          for (const entity of workspaceRegistry.list()) {
            if (!entity || typeof entity.id !== "string") continue;
            records[entity.id] = { title: typeof entity.title === "string" ? entity.title : "", path: typeof entity.path === "string" ? entity.path : "", sessionIds: Array.isArray(entity.sessionIds) ? [...entity.sessionIds] : [] };
          }
          wsJson = { tables: { workspaces: records }, global: { archivedSessionIds: Array.isArray(workspaceRegistry.archivedSessionIds) ? [...workspaceRegistry.archivedSessionIds] : [] } };
        } catch (error) {
          warnings.push({ code: "OFFICIAL_WORKSPACE_FAILED", message: error?.message || String(error) });
        }
      }
      if (!wsJson) {
        wsRead = readJson(join(home, "storages", "workspace.json"));
        if (!wsRead.ok) warnings.push({ code: "WORKSPACE_READ_FAILED", message: wsRead.error?.message || "workspace storage read failed" });
        wsJson = wsRead.value;
      }
      const rawWorkspaces = wsJson?.tables?.workspaces;
      const workspaces = objectRecord2(rawWorkspaces) || {};
      if (wsRead.ok && !objectRecord2(rawWorkspaces)) warnings.push({ code: "WORKSPACE_SHAPE_INVALID", message: "workspace table was missing or not an object; invalid entries were ignored" });
      const rawArchivedIds = wsJson?.global?.archivedSessionIds;
      if (wsRead.ok && rawArchivedIds !== void 0 && !Array.isArray(rawArchivedIds)) warnings.push({ code: "ARCHIVED_IDS_SHAPE_INVALID", message: "archivedSessionIds was not an array; the value was ignored" });
      const archivedSet = new Set((Array.isArray(rawArchivedIds) ? rawArchivedIds : []).filter((id) => typeof id === "string" && id));
      const rawSessionsTable = sessionsRead.value?.tables?.sessions;
      const sessionsTable = objectRecord2(rawSessionsTable) || {};
      const projectionDomainVersion = sessionsRead.value?.unit?.version;
      if (projectionDomainVersion !== void 0 && projectionDomainVersion !== SESSION_PROJECTION_DOMAIN_VERSION) warnings.push({ code: "SESSION_CACHE_DOMAIN_VERSION_UNSUPPORTED", message: `projection cache domain version ${String(projectionDomainVersion)} is not supported` });
      if (sessionsRead.ok && !objectRecord2(rawSessionsTable)) warnings.push({ code: "SESSION_TABLE_SHAPE_INVALID", message: "session projection table was missing or not an object; the value was ignored" });
      let persistedHeaders = [];
      let sessionListResolved = false;
      if (sessionQuery && typeof sessionQuery.listSessions === "function") {
        try {
          const records = await sessionQuery.listSessions();
          persistedHeaders = records.map((record) => record?.header).filter((header) => header && typeof header.id === "string");
          sessionListResolved = true;
        } catch (error) {
          warnings.push({ code: "OFFICIAL_SESSION_LIST_FAILED", message: error?.message || String(error) });
        }
      }
      if (!sessionListResolved && persistence && typeof persistence.list === "function") {
        try {
          persistedHeaders = await persistence.list();
        } catch (error) {
          warnings.push({ code: "OFFICIAL_SESSION_LIST_FAILED", message: error?.message || String(error) });
        }
      }
      for (const header of persistedHeaders) if (header?.id && !sessionsTable[header.id]) {
        sessionsTable[header.id] = { identity: { id: header.id, createdAt: header.createdAt, cwd: header.cwd, parentSession: header.parentSession, seedLength: header.seedLength } };
      }
      const seen = /* @__PURE__ */ new Set();
      const workspaceEntries = [];
      for (const [wsId, ws] of Object.entries(workspaces)) {
        if (!objectRecord2(ws)) {
          warnings.push({ code: "WORKSPACE_ENTRY_INVALID", message: `workspace ${wsId} was not an object and was ignored` });
          continue;
        }
        const rawSessionIds = ws.sessionIds;
        if (rawSessionIds !== void 0 && !Array.isArray(rawSessionIds)) warnings.push({ code: "SESSION_IDS_SHAPE_INVALID", message: `workspace ${wsId} sessionIds was not an array; the value was ignored` });
        const sessionIds = [];
        const localIds = /* @__PURE__ */ new Set();
        for (const id of Array.isArray(rawSessionIds) ? rawSessionIds : []) {
          if (typeof id !== "string" || !id) {
            warnings.push({ code: "SESSION_ID_INVALID", message: `workspace ${wsId} contained an invalid session id` });
            continue;
          }
          if (localIds.has(id)) {
            warnings.push({ code: "SESSION_ID_DUPLICATE", sessionId: id, message: `session ${id} appeared more than once in workspace ${wsId}` });
            continue;
          }
          localIds.add(id);
          sessionIds.push(id);
        }
        const title = typeof ws.title === "string" ? ws.title : "";
        const path = typeof ws.path === "string" ? ws.path : "";
        if (ws.title !== void 0 && typeof ws.title !== "string") warnings.push({ code: "WORKSPACE_METADATA_INVALID", message: `workspace ${wsId} title was not a string` });
        if (ws.path !== void 0 && typeof ws.path !== "string") warnings.push({ code: "WORKSPACE_METADATA_INVALID", message: `workspace ${wsId} path was not a string` });
        workspaceEntries.push({ wsId, ws: { title, path }, sessionIds });
      }
      const memberships = /* @__PURE__ */ new Map();
      for (const entry of workspaceEntries) for (const sessionId of entry.sessionIds) {
        const owners = memberships.get(sessionId) || [];
        owners.push(entry);
        memberships.set(sessionId, owners);
      }
      const ownerBySession = /* @__PURE__ */ new Map();
      for (const [sessionId, owners] of memberships) {
        const cwd = sessionsTable[sessionId]?.identity?.cwd;
        const owner = owners.find((entry) => typeof cwd === "string" && cwd && entry.ws.path === cwd) || owners[0];
        ownerBySession.set(sessionId, owner.wsId);
        if (owners.length > 1) warnings.push({ code: "SESSION_MULTIPLE_WORKSPACES", sessionId, message: `session ${sessionId} belonged to multiple workspaces and was counted only in ${owner.wsId}` });
      }
      const processSession = async (sessionId, cwdFallback) => {
        seen.add(sessionId);
        const entry = sessionsTable[sessionId];
        let statsRow = objectRecord2(entry?.rows?.sessionStats?.val);
        let usageTotals = objectRecord2(entry?.rows?.tokenUsage?.val?.totals);
        const rawTitle = entry?.rows?.title?.val;
        const title = typeof rawTitle === "string" ? rawTitle : null;
        const meta = objectRecord2(entry?.rows?.sessionListMetadata?.val) || {};
        const rawCreatedAt = entry?.identity?.createdAt;
        const rawLastPromptAt = meta.lastPromptAt;
        let createdAt = Number.isFinite(rawCreatedAt) && rawCreatedAt >= 0 ? rawCreatedAt : null;
        let lastPromptAt = Number.isFinite(rawLastPromptAt) && rawLastPromptAt >= 0 ? rawLastPromptAt : null;
        let info;
        let officialSource = null;
        let officialValues = null;
        let cacheOnly = false;
        const liveSession = contextService(hostCtx, "sessions")?.get?.(sessionId);
        if (!liveSession && officialProjectionAvailable) {
          try {
            officialValues = await officialProjectionValues(hostCtx, null, entry, warnings, sessionId, projectionDomainVersion);
          } catch (error) {
            warnings.push({ code: "OFFICIAL_PROJECTION_FAILED", sessionId, message: error?.message || String(error) });
          }
        }
        const routeProjectionAvailable = objectRecord2(officialValues?.statsRoute) !== null;
        const projectionValuesAvailable = objectRecord2(officialValues) !== null && (objectRecord2(officialValues?.sessionStats) !== null || objectRecord2(officialValues?.tokenUsage) !== null || routeProjectionAvailable);
        if (!liveSession && projectionValuesAvailable) {
          info = infoFromProjectionValues(officialValues, entry);
          if (objectRecord2(officialValues?.sessionStats)) statsRow = officialValues.sessionStats;
          const officialUsage = normalizeProjectionUsage(officialValues?.tokenUsage);
          if (officialUsage) usageTotals = {
            uncachedInputTokens: officialUsage.uncached,
            outputTokens: officialUsage.output,
            cacheReadTokens: officialUsage.cacheRead,
            cacheWriteTokens: officialUsage.cacheWrite
          };
          cacheOnly = true;
          warnings.push({ code: routeProjectionAvailable ? "OFFICIAL_ROUTE_PROJECTION_USED" : "OFFICIAL_PROJECTION_VALUES_USED", sessionId, message: routeProjectionAvailable ? "model route and token buckets came from the official projection cache" : "session statistics and token usage came from the official projection cache" });
        } else try {
          officialSource = await officialSessionSource(hostCtx, sessionId);
          if (officialSource) {
            info = deriveSessionInfoFromEvents(officialSource.events, officialSource.header);
            if (!officialValues) officialValues = await officialProjectionValues(hostCtx, officialSource, entry, warnings, sessionId, projectionDomainVersion);
            if (objectRecord2(officialValues?.sessionStats)) statsRow = officialValues.sessionStats;
            const officialUsage = normalizeProjectionUsage(officialValues?.tokenUsage);
            if (officialUsage) usageTotals = {
              uncachedInputTokens: officialUsage.uncached,
              outputTokens: officialUsage.output,
              cacheReadTokens: officialUsage.cacheRead,
              cacheWriteTokens: officialUsage.cacheWrite
            };
          }
        } catch (error) {
          warnings.push({ code: "OFFICIAL_PERSISTENCE_FAILED", sessionId, message: error?.message || String(error) });
        }
        if (!info && !officialSource && officialValues) {
          info = infoFromProjectionValues(officialValues, entry);
          if (objectRecord2(officialValues.sessionStats)) statsRow = officialValues.sessionStats;
          const officialUsage = normalizeProjectionUsage(officialValues.tokenUsage);
          if (officialUsage) usageTotals = {
            uncachedInputTokens: officialUsage.uncached,
            outputTokens: officialUsage.output,
            cacheReadTokens: officialUsage.cacheRead,
            cacheWriteTokens: officialUsage.cacheWrite
          };
        }
        if (!officialSource && !officialValues) try {
          await new Promise((resolve) => setImmediate(resolve));
          info = sessionInfo(home, sessionId);
        } catch (err) {
          const message = err?.message || String(err);
          console.warn(`[dsh-stats] \u4F1A\u8BDD ${sessionId} \u65E5\u5FD7\u89E3\u7801\u5931\u8D25\uFF08\u4F7F\u7528 projection cache\uFF09:`, message);
          warnings.push({ code: "SESSION_DECODE_FAILED", sessionId, message });
          info = { times: [], lastTime: null, model: null, providerId: "unknown", accountType: "api", usages: [], slotStats: [], stats: null, partial: false, stale: false, missing: false, unavailable: true };
        }
        const sourceHeader = officialSource?.header || info?.header || null;
        if (createdAt === null && Number.isFinite(sourceHeader?.createdAt) && sourceHeader.createdAt >= 0) createdAt = sourceHeader.createdAt;
        if (lastPromptAt === null && Number.isFinite(sourceHeader?.lastPromptAt) && sourceHeader.lastPromptAt >= 0) lastPromptAt = sourceHeader.lastPromptAt;
        const cwd = firstString(entry?.identity?.cwd, sourceHeader?.cwd, cwdFallback);
        const projectionInvalid = rawTitle !== void 0 && rawTitle !== null && typeof rawTitle !== "string" || rawCreatedAt !== void 0 && rawCreatedAt !== null && createdAt === null || rawLastPromptAt !== void 0 && rawLastPromptAt !== null && lastPromptAt === null || entry?.identity?.cwd !== void 0 && entry?.identity?.cwd !== null && typeof entry.identity.cwd !== "string";
        const archived = archivedSet.has(sessionId);
        if (officialSource?.source === "sessionPersistence" || officialSource?.source === "sessionQuery") warnings.push({ code: "OFFICIAL_SOURCE_USED", sessionId, message: `session events loaded through ${officialSource.source}` });
        if (!officialSource && entry && !cacheOnly) {
          const checkpoint = projectionCheckpoint(entry, sessionId, sourceHeader, warnings, projectionDomainVersion);
          const rawRows = objectRecord2(entry.rows);
          const hasVersionedRows = rawRows && Object.values(rawRows).some((row) => objectRecord2(row) && (Object.prototype.hasOwnProperty.call(row, "ver") || Object.prototype.hasOwnProperty.call(row, "seq")));
          if (Object.keys(checkpoint).length > 0) {
            statsRow = null;
            usageTotals = null;
            for (const row of Object.values(checkpoint)) if (info.lastSeq >= 0 && row.seq > info.lastSeq) {
              warnings.push({ code: "SESSION_CACHE_AHEAD_OF_LOG", sessionId, message: "projection cache watermark was ahead of the session log and was ignored" });
              break;
            }
            for (const [key, row] of Object.entries(checkpoint)) if (info.lastSeq >= 0 && row.seq !== info.lastSeq) {
              warnings.push({ code: "SESSION_CACHE_STALE", sessionId, message: `projection row ${key} was at seq ${row.seq}, log ended at seq ${info.lastSeq}` });
            }
            const checkedStats = checkpoint.sessionStats;
            const checkedUsage = checkpoint.tokenUsage;
            if (checkedStats && (info.lastSeq < 0 || checkedStats.seq === info.lastSeq)) statsRow = objectRecord2(checkedStats.val) || statsRow;
            if (checkedUsage && (info.lastSeq < 0 || checkedUsage.seq === info.lastSeq)) usageTotals = objectRecord2(checkedUsage.val?.totals) || usageTotals;
          } else if (hasVersionedRows) {
            statsRow = null;
            usageTotals = null;
          }
        }
        if (info.seqGap || info.futureVersion) {
          statsRow = null;
          usageTotals = null;
        }
        if (info.seqGap) warnings.push({ code: "SESSION_SEQ_GAP", sessionId, message: "session log sequence had a gap; cache values were not trusted" });
        if (info.futureVersion) warnings.push({ code: "SESSION_FORMAT_VERSION_UNSUPPORTED", sessionId, message: `session log format version ${String(info.formatVersion ?? sourceHeader?.version ?? "unknown")} is newer than this plugin` });
        let totalUncached = 0, totalOutput = 0, totalCacheRead = 0, totalCacheWrite = 0, totalReasoning = 0;
        for (const u of info.usages) {
          totalUncached += u.uncached || 0;
          totalOutput += u.output || 0;
          totalCacheRead += u.cacheRead || 0;
          totalCacheWrite += u.cacheWrite || 0;
          totalReasoning += u.reasoning || 0;
        }
        const projectionUsage = {
          uncached: nonNegativeNumber(usageTotals?.uncachedInputTokens),
          output: nonNegativeNumber(usageTotals?.outputTokens),
          cacheRead: nonNegativeNumber(usageTotals?.cacheReadTokens),
          cacheWrite: nonNegativeNumber(usageTotals?.cacheWriteTokens),
          reasoning: 0
        };
        const projectionTokens = projectionUsage.uncached + projectionUsage.output + projectionUsage.cacheRead + projectionUsage.cacheWrite;
        const usedProjectionUsage = info.usages.length === 0 && projectionTokens > 0;
        const effectiveParentSession = info.parentSession ?? firstString(entry?.identity?.parentSession, meta?.parentSession);
        const cacheOnlyArchived = archived && info.missing && info.usages.length === 0 && usedProjectionUsage;
        if (archived && effectiveParentSession !== null && info.usages.length === 0 && usedProjectionUsage || cacheOnlyArchived) {
          warnings.push({ code: "SESSION_ORPHAN_FORK_DISCARDED", sessionId, message: "archived fork had no own usage; inherited projection tokens were excluded from statistics" });
          return null;
        }
        if (info.missing) warnings.push({ code: "SESSION_LOG_MISSING", sessionId, message: "session log was not found; projection cache was used where available" });
        if (info.partial) warnings.push({ code: "SESSION_LOG_PARTIAL", sessionId, message: "session log was incomplete or malformed; only valid committed records were used" });
        if (info.stale) warnings.push({ code: "SESSION_LOG_STALE", sessionId, message: info.readError || "cached session snapshot was used" });
        if (projectionInvalid) warnings.push({ code: "SESSION_METADATA_INVALID", sessionId, message: "invalid projection metadata was ignored" });
        if (usedProjectionUsage) {
          totalUncached = projectionUsage.uncached;
          totalOutput = projectionUsage.output;
          totalCacheRead = projectionUsage.cacheRead;
          totalCacheWrite = projectionUsage.cacheWrite;
          warnings.push({ code: "SESSION_USAGE_FALLBACK", sessionId, message: "token usage came from the projection cache and may include inherited fork context" });
        }
        const eventStats = info.stats || statsRow || {};
        const raw = {
          turns: nonNegativeNumber(eventStats.turns),
          steps: nonNegativeNumber(eventStats.steps),
          llmMs: nonNegativeNumber(eventStats.llmMs),
          toolMs: nonNegativeNumber(eventStats.toolMs),
          ttftMs: nonNegativeNumber(eventStats.ttftMs),
          ttftSteps: nonNegativeNumber(eventStats.ttftSteps),
          decodeMs: nonNegativeNumber(eventStats.decodeMs),
          decodeTokens: nonNegativeNumber(eventStats.decodeTokens),
          uncached: totalUncached,
          output: totalOutput,
          cacheRead: totalCacheRead,
          cacheWrite: totalCacheWrite,
          reasoning: totalReasoning
        };
        const updatedAt = Math.max(info.lastTime ?? 0, lastPromptAt ?? 0, createdAt ?? 0) || null;
        let perSlotUsage = slotUsages(info.usages);
        if (usedProjectionUsage && updatedAt !== null) perSlotUsage = [projectionSlotUsage(info, projectionUsage, updatedAt)];
        const modelUsage = modelUsages(perSlotUsage);
        const primaryIdentity = rawIdentity(info.providerId, info.model, info.accountType, updatedAt);
        const sessionCost = summarizeCostsCny(perSlotUsage.map((row) => row.cost));
        const session = {
          id: sessionId,
          title: title ?? null,
          updatedAt,
          createdAt,
          model: info.model ?? null,
          ...identityFields(primaryIdentity),
          modelUsage,
          cost: sessionCost,
          archived,
          blank: meta?.blank === true,
          subagent: info.origin === "subagent",
          origin: info.origin ?? null,
          parentSession: effectiveParentSession ?? null,
          seedLength: info.seedLength ?? null,
          calls: info.usages.length,
          stats: raw,
          durMs: raw.llmMs + raw.toolMs,
          slots: slotDurations(info.times),
          slotStats: info.slotStats || [],
          slotUsage: perSlotUsage,
          quality: info.stale ? "stale" : info.partial || info.missing || info.unavailable || info.cacheOnly || cacheOnly || usedProjectionUsage || projectionInvalid ? "partial" : "exact",
          cwd
        };
        Object.defineProperty(session, "_intervals", { value: activityIntervals(info.times), enumerable: false });
        return session;
      };
      const processSessions = async (sessionIds, cwdFallback, limit = 4) => {
        const ids = Array.isArray(sessionIds) ? sessionIds : [];
        const results = new Array(ids.length);
        let cursor = 0;
        const worker = async () => {
          for (; ; ) {
            const index = cursor++;
            if (index >= ids.length) return;
            results[index] = await processSession(ids[index], cwdFallback);
          }
        };
        const workers = Math.min(Math.max(1, limit), ids.length);
        await Promise.all(Array.from({ length: workers }, () => worker()));
        return results;
      };
      const projects = [];
      for (const { wsId, ws, sessionIds } of workspaceEntries) {
        const sessions = [];
        const agg = emptyRaw();
        let lastActiveAt = null;
        let subagentCount = 0;
        const ownedIds = sessionIds.filter((sessionId) => ownerBySession.get(sessionId) === wsId);
        for (const s of await processSessions(ownedIds, ws.path)) {
          if (!s || s.blank) continue;
          addRaw(agg, s.stats);
          sessions.push(s);
          if (s.subagent) subagentCount++;
          if (s.updatedAt != null && (lastActiveAt == null || s.updatedAt > lastActiveAt)) lastActiveAt = s.updatedAt;
        }
        sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        projects.push({
          id: wsId,
          name: ws.title || basename(ws.path) || "?",
          path: ws.path || "",
          sessionCount: sessions.length,
          subagentCount,
          lastActiveAt,
          stats: agg,
          cost: mergeCostSummariesCny(sessions.map((session) => session.cost)),
          sessions
        });
      }
      const strayByCwd = /* @__PURE__ */ new Map();
      const strayIds = Object.keys(sessionsTable).filter((sessionId) => !seen.has(sessionId));
      for (const s of await processSessions(strayIds, null)) {
        if (!s || s.blank) continue;
        const cwd = s.cwd || "(uncategorized)";
        if (!strayByCwd.has(cwd)) strayByCwd.set(cwd, []);
        strayByCwd.get(cwd).push(s);
      }
      strayByCwd.forEach((sessions, cwd) => {
        const existing = projects.find((p) => p.path === cwd);
        const target = existing ?? {
          id: "cwd-" + cwd,
          name: cwd === "(uncategorized)" ? cwd : basename(cwd),
          path: cwd,
          sessionCount: 0,
          subagentCount: 0,
          lastActiveAt: null,
          stats: emptyRaw(),
          sessions: []
        };
        if (!existing) projects.push(target);
        sessions.forEach((s) => {
          target.sessions.push(s);
          if (s.subagent) target.subagentCount++;
          addRaw(target.stats, s.stats);
          if (s.updatedAt != null && (target.lastActiveAt == null || s.updatedAt > target.lastActiveAt)) target.lastActiveAt = s.updatedAt;
        });
        target.sessionCount = target.sessions.length;
        target.sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        target.cost = mergeCostSummariesCny(target.sessions.map((session) => session.cost));
      });
      projects.sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));
      const cost = mergeCostSummariesCny(projects.map((project) => project.cost));
      const projectIndex = /* @__PURE__ */ new Map();
      projects.forEach((p, i) => projectIndex.set(p.id, i));
      const daysMap = /* @__PURE__ */ new Map();
      for (const p of projects) {
        const intervals = p.sessions.flatMap((s) => s._intervals || []).sort((a, b) => a[0] - b[0]);
        const merged = [];
        for (const interval of intervals) {
          const last = merged[merged.length - 1];
          if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]);
          else merged.push([...interval]);
        }
        const projectSlots = /* @__PURE__ */ new Map();
        for (const [start, end] of merged) {
          const first = Math.floor(start / SLOT_MS), last = Math.floor((end - 1) / SLOT_MS);
          for (let slot = first; slot <= last; slot++) {
            const overlap = Math.min(end, (slot + 1) * SLOT_MS) - Math.max(start, slot * SLOT_MS);
            if (overlap > 0) projectSlots.set(slot, (projectSlots.get(slot) || 0) + overlap);
          }
        }
        for (const [slot, ms] of projectSlots) {
          const slotStartMs = slot * SLOT_MS;
          const date = localDayKey(slotStartMs);
          const slotOfDay = Math.floor(minutesOfDay(slotStartMs) / SLOT_MINUTES);
          let day = daysMap.get(date);
          if (!day) {
            day = { date, dayTotalMs: 0, slotBlocks: [] };
            daysMap.set(date, day);
          }
          day.dayTotalMs += ms;
          day.slotBlocks.push({ slot: slotOfDay, projectId: p.id, name: p.name, colorIndex: projectIndex.get(p.id), ms });
        }
      }
      const days = [...daysMap.values()].sort((a, b) => a.date < b.date ? -1 : 1);
      days.forEach((d) => d.slotBlocks.sort((a, b) => a.slot - b.slot));
      return {
        projects,
        cost,
        timeline: { slotMinutes: SLOT_MINUTES, days },
        meta: { schemaVersion: STATS_SCHEMA_VERSION, source: "host", generatedAt: Date.now(), degraded: warnings.length > 0, warnings }
      };
    }
    async providers() {
      return providerViews(this, this.ctx || {});
    }
    async account(force = false) {
      return collectAccounts(this, this.ctx || {}, { force: force === true });
    }
    async current() {
      const state = balanceState(this);
      const now = Date.now();
      if (state.cache && now - state.cache.at < BALANCE_CACHE_MS) return state.cache.payload;
      if (state.inflight) return state.inflight;
      state.inflight = (async () => {
        try {
          const payload = await fetchDeepSeekBalance(credentialsService(this.ctx), globalThis.fetch, Date.now());
          state.cache = { at: Date.now(), payload };
          return payload;
        } catch (error) {
          const code = balanceErrorCode(error);
          if (code === "no-api-key") return unavailableBalancePayload(Date.now(), "unconfigured", code);
          if (state.cache?.payload) return staleBalancePayload(state.cache.payload, Date.now(), error);
          return unavailableBalancePayload(Date.now(), "error", code);
        } finally {
          state.inflight = null;
        }
      })();
      return state.inflight;
    }
  };
})();
export {
  StatsService,
  StatsService as default,
  fetchDeepSeekBalance,
  normalizeBalanceInfo
};
