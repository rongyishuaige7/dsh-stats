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

// src/pricing-validation.cjs
var require_pricing_validation = __commonJS({
  "src/pricing-validation.cjs"(exports, module) {
    var MAX_CATALOG_BYTES = 8 * 1024 * 1024;
    var MAX_OVERRIDES_BYTES = 1 * 1024 * 1024;
    var MAX_ENVELOPE_BYTES = 2 * MAX_CATALOG_BYTES + 1024;
    var MAX_CACHE_BYTES = MAX_ENVELOPE_BYTES + 1024;
    function utf8ByteLength(value) {
      return new TextEncoder().encode(value).byteLength;
    }
    function snapshotJson(value, limit, label) {
      const json = JSON.stringify(value);
      check(utf8ByteLength(json) <= limit, label + " bytes");
      return json;
    }
    var FIELDS = ["uncached", "cacheRead", "cacheWrite", "output"];
    var TIERS = ["standard", "priority", "batch", "flex"];
    var RULE_KEYS = /* @__PURE__ */ new Set(["id", "family", "canonical", "aliases", "currency", "sourceUrl", "retrievedAt", "rates", "reasoningIncludedInOutput", "confidence", "legacy", "offPeak", "peak", "contextTiers", "contextThreshold", "serviceTiers", "tierMultipliers", "effectiveFrom", "effectiveTo", "observedFrom", "providerId", "accountType", "cacheWriteDurationUnknown", "cacheStorageUnknown", "cacheWritePriceUnknown", "note", "timeOfUse"]);
    function check(ok, label) {
      if (!ok) throw new TypeError("Invalid pricing: " + label);
    }
    function record(value) {
      return value !== null && typeof value === "object" && !Array.isArray(value);
    }
    function text(value, limit = 250) {
      return typeof value === "string" && value.length > 0 && value.length <= limit && !/[\x00-\x1f]/.test(value);
    }
    function timestamp(value) {
      return typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
    }
    function source(value) {
      try {
        const u = new URL(value);
        return u.protocol === "https:" && !u.username && !u.password && !u.search && !u.hash;
      } catch {
        return false;
      }
    }
    function rates(value) {
      check(record(value) && Object.keys(value).length === 4, "rates");
      for (const k of FIELDS) check(value[k] === null || Number.isFinite(value[k]) && value[k] >= 0 && value[k] <= 1e7, k);
    }
    function tiers(value) {
      check(record(value) && Object.keys(value).length === 2, "context tiers");
      rates(value.short);
      rates(value.long);
    }
    function rule(value, custom) {
      check(record(value) && Object.keys(value).every((k) => RULE_KEYS.has(k)), "rule fields");
      for (const k of ["id", "family", "canonical"]) check(text(value[k]), k);
      check(["CNY", "USD"].includes(value.currency), "currency");
      check(["exact", "estimated"].includes(value.confidence), "confidence");
      check(value.sourceUrl === null && custom || source(value.sourceUrl), "source URL");
      check(typeof value.retrievedAt === "string" && /^\d{4}-\d\d-\d\d$/.test(value.retrievedAt) && Number.isFinite(Date.parse(value.retrievedAt)), "retrieved date");
      check(Array.isArray(value.aliases) && value.aliases.length > 0 && value.aliases.length <= 30 && value.aliases.every((a) => text(a) && a === a.toLowerCase()) && value.aliases.includes(value.canonical.toLowerCase()), "aliases");
      check(value.reasoningIncludedInOutput === true, "reasoning billing semantics");
      if (custom || value.providerId !== void 0) check(text(value.providerId), "provider ID");
      if (value.accountType !== void 0) check(["api", "relay", "local"].includes(value.accountType), "account type");
      for (const k of ["effectiveFrom", "effectiveTo", "observedFrom"]) if (value[k] !== void 0) check(timestamp(value[k]), k);
      if (value.effectiveFrom && value.effectiveTo) check(Date.parse(value.effectiveFrom) < Date.parse(value.effectiveTo), "effective interval");
      for (const k of ["cacheWriteDurationUnknown", "cacheStorageUnknown", "cacheWritePriceUnknown"]) if (value[k] !== void 0) check(typeof value[k] === "boolean", k);
      if (value.note !== void 0) check(text(value.note, 1e3), "note");
      const modes = [value.rates != null, value.legacy != null, value.contextTiers != null, value.serviceTiers != null, value.timeOfUse != null].filter(Boolean).length;
      check(modes === 1, "one rate mode required");
      if (value.timeOfUse) {
        const t = value.timeOfUse, c = t.calendar;
        check(value.family === "deepseek" && record(t) && Object.keys(t).every((k) => ["peak", "offPeak", "calendar"].includes(k)), "time of use");
        rates(t.peak);
        rates(t.offPeak);
        const day = (v) => typeof v === "string" && /^\d{4}-\d\d-\d\d$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
        check(record(c) && Object.keys(c).every((k) => ["from", "to", "holidays", "sourceUrl"].includes(k)) && day(c.from) && day(c.to) && c.from <= c.to && source(c.sourceUrl), "calendar");
        check(Array.isArray(c.holidays) && c.holidays.length <= 1e3 && new Set(c.holidays).size === c.holidays.length && c.holidays.every((d) => day(d) && d >= c.from && d <= c.to), "calendar holidays");
      }
      if (value.rates != null) rates(value.rates);
      if (value.legacy) {
        check(value.family === "deepseek", "legacy family");
        rates(value.legacy);
        rates(value.peak);
        rates(value.offPeak);
      }
      if (value.contextTiers) {
        tiers(value.contextTiers);
        check(Number.isSafeInteger(value.contextThreshold) && value.contextThreshold > 0, "context threshold");
      }
      if (value.serviceTiers) {
        check(record(value.serviceTiers) && Object.keys(value.serviceTiers).every((k) => TIERS.includes(k)), "service tiers");
        for (const v of Object.values(value.serviceTiers)) tiers(v);
      }
      if (value.tierMultipliers !== void 0) {
        check(record(value.tierMultipliers) && Object.keys(value.tierMultipliers).every((k) => TIERS.includes(k)), "multipliers");
        for (const v of Object.values(value.tierMultipliers)) check(Number.isFinite(v) && v > 0 && v <= 100, "multiplier");
      }
    }
    function freeze(value) {
      if (value && typeof value === "object" && !Object.isFrozen(value)) {
        Object.values(value).forEach(freeze);
        Object.freeze(value);
      }
      return value;
    }
    function rules(values, custom) {
      check(Array.isArray(values) && values.length <= (custom ? 500 : 2e4) && (custom || values.length > 0), "rule count");
      const ids = /* @__PURE__ */ new Set(), aliases = /* @__PURE__ */ new Map();
      for (const value of values) {
        rule(value, custom);
        check(!ids.has(value.id), "duplicate rule ID");
        ids.add(value.id);
        for (const alias of value.aliases) {
          const key = JSON.stringify([value.providerId || "family:" + value.family, alias]);
          const spans = aliases.get(key) || [];
          const from = value.effectiveFrom ? Date.parse(value.effectiveFrom) : -Infinity, to = value.effectiveTo ? Date.parse(value.effectiveTo) : Infinity;
          check(!spans.some(([a, b, account]) => from < b && a < to && (!account || !value.accountType || account === value.accountType)), "overlapping rules: " + alias);
          spans.push([from, to, value.accountType]);
          aliases.set(key, spans);
        }
      }
    }
    var validated = /* @__PURE__ */ new WeakSet();
    function validateCatalog(input) {
      if (validated.has(input)) return input;
      check(record(input) && Object.keys(input).every((k) => ["schemaVersion", "version", "publishedAt", "rules", "fx"].includes(k)), "catalog fields");
      check([1, 2].includes(input.schemaVersion) && Number.isSafeInteger(input.version) && input.version > 0 && timestamp(input.publishedAt), "catalog version");
      rules(input.rules, false);
      check(input.schemaVersion >= 2 || input.rules.every((r) => !r.timeOfUse), "time of use requires schema 2");
      check(Array.isArray(input.fx) && input.fx.length > 0 && input.fx.length <= 1e4, "FX entries");
      let previous = -Infinity;
      for (const fx of input.fx) {
        check(record(fx) && Object.keys(fx).every((k) => ["date", "usdCny", "sourceUrl"].includes(k)), "FX fields");
        const time = Date.parse(fx.date);
        check(/^\d{4}-\d\d-\d\d$/.test(fx.date) && Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === fx.date && time > previous, "FX date order");
        check(Number.isFinite(fx.usdCny) && fx.usdCny > 0 && fx.usdCny <= 100 && typeof fx.sourceUrl === "string" && (() => {
          try {
            const url = new URL(fx.sourceUrl);
            return url.protocol === "https:" && !url.username && !url.password && !url.hash;
          } catch {
            return false;
          }
        })(), "FX rate");
        previous = time;
      }
      const result = freeze(JSON.parse(snapshotJson(input, MAX_CATALOG_BYTES, "catalog")));
      validated.add(result);
      return result;
    }
    function validateOverrides(input) {
      rules(input, true);
      return freeze(JSON.parse(snapshotJson(input, MAX_OVERRIDES_BYTES, "overrides")));
    }
    module.exports = { MAX_CATALOG_BYTES, MAX_OVERRIDES_BYTES, MAX_ENVELOPE_BYTES, MAX_CACHE_BYTES, utf8ByteLength, validateCatalog, validateOverrides };
  }
});

// src/rpc-schemas.cjs
var require_rpc_schemas = __commonJS({
  "src/rpc-schemas.cjs"(exports, module) {
    var { MAX_CATALOG_BYTES, MAX_OVERRIDES_BYTES, utf8ByteLength } = require_pricing_validation();
    module.exports = function createRpcSchemas2(z2) {
      const payloadString = (limit) => z2.string().max(limit).refine((value) => utf8ByteLength(value) <= limit, "UTF-8 payload is too large");
      const _stats$schema = z2.object({
        turns: z2.number().nonnegative(),
        steps: z2.number().nonnegative(),
        llmMs: z2.number().nonnegative(),
        toolMs: z2.number().nonnegative(),
        ttftMs: z2.number().nonnegative(),
        ttftSteps: z2.number().nonnegative(),
        decodeMs: z2.number().nonnegative(),
        decodeTokens: z2.number().nonnegative(),
        uncached: z2.number().nonnegative(),
        output: z2.number().nonnegative(),
        cacheRead: z2.number().nonnegative(),
        cacheWrite: z2.number().nonnegative(),
        reasoning: z2.number().nonnegative()
      }).strict();
      const _costTotal$schema = z2.object({
        currency: z2.string(),
        amount: z2.number().nonnegative(),
        exactAmount: z2.number().nonnegative(),
        estimatedAmount: z2.number().nonnegative(),
        // The usage day behind a total, kept so a later CNY merge reuses the same FX
        // snapshot instead of the newest one. Optional: older payloads omit it.
        pricing: z2.object({ pricedAt: z2.number().nonnegative() }).strict().optional()
      }).strict();
      const _costSummary$schema = z2.object({
        status: z2.enum(["exact", "estimated", "free", "partial", "unsupported"]),
        totals: z2.array(_costTotal$schema),
        unpricedTokens: z2.number().nonnegative(),
        unknownRows: z2.number().int().nonnegative()
      }).strict();
      const _cost$schema = z2.object({
        status: z2.enum(["exact", "estimated", "free", "subscription", "unsupported", "ambiguous", "partial"]),
        amount: z2.number().nonnegative().nullable(),
        currency: z2.string().nullable(),
        exactAmount: z2.number().nonnegative(),
        estimatedAmount: z2.number().nonnegative(),
        unpricedTokens: z2.number().nonnegative(),
        ruleId: z2.string().nullable(),
        sourceUrl: z2.string().url().nullable(),
        retrievedAt: z2.string().nullable(),
        providerId: z2.string(),
        providerFamily: z2.string(),
        modelCanonical: z2.string(),
        pricing: z2.object({ catalogVersion: z2.number().int().positive().optional(), ruleRevision: z2.string().optional(), pricedAt: z2.number().nonnegative().optional(), basis: z2.enum(["custom", "reference", "provider"]).optional(), historicalEstimate: z2.boolean().optional(), calendarEstimate: z2.boolean().optional(), nativeAmount: z2.number().nonnegative().optional(), nativeCurrency: z2.string().optional(), fxRate: z2.number().positive().optional(), fxDate: z2.string().optional(), fxSource: z2.string().optional() }).strict().optional()
      }).strict();
      const _modelUsage$schema = z2.object({
        model: z2.string(),
        providerId: z2.string(),
        providerFamily: z2.string(),
        modelRaw: z2.string(),
        modelCanonical: z2.string(),
        accountType: z2.string(),
        uncached: z2.number().nonnegative(),
        output: z2.number().nonnegative(),
        cacheRead: z2.number().nonnegative(),
        cacheWrite: z2.number().nonnegative(),
        reasoning: z2.number().nonnegative(),
        cost: _costSummary$schema
      }).strict();
      const _slot$schema = z2.object({ slot: z2.number().int().nonnegative(), ms: z2.number().nonnegative() }).strict();
      const _slotStat$schema = z2.object({
        slot: z2.number().int().nonnegative(),
        turns: z2.number().nonnegative(),
        steps: z2.number().nonnegative(),
        llmMs: z2.number().nonnegative(),
        toolMs: z2.number().nonnegative(),
        ttftMs: z2.number().nonnegative(),
        ttftSteps: z2.number().nonnegative(),
        decodeMs: z2.number().nonnegative(),
        decodeTokens: z2.number().nonnegative()
      }).strict();
      const _usage$schema = z2.object({
        model: z2.string(),
        providerId: z2.string(),
        providerFamily: z2.string(),
        modelRaw: z2.string(),
        modelCanonical: z2.string(),
        accountType: z2.string(),
        serviceTier: z2.enum(["standard", "priority", "batch", "flex", "unknown"]),
        contextTokens: z2.number().nonnegative(),
        contextOver512k: z2.boolean(),
        slot: z2.number().int().nonnegative(),
        time: z2.number().nonnegative().optional(),
        uncached: z2.number().nonnegative(),
        output: z2.number().nonnegative(),
        cacheRead: z2.number().nonnegative(),
        cacheWrite: z2.number().nonnegative(),
        reasoning: z2.number().nonnegative(),
        cost: _cost$schema
      }).strict();
      const _session$schema = z2.object({
        id: z2.string(),
        title: z2.string().nullable(),
        updatedAt: z2.number().nullable(),
        createdAt: z2.number().nullable(),
        model: z2.string().nullable(),
        providerId: z2.string(),
        providerFamily: z2.string(),
        modelRaw: z2.string(),
        modelCanonical: z2.string(),
        accountType: z2.string(),
        modelUsage: z2.array(_modelUsage$schema),
        cost: _costSummary$schema,
        archived: z2.boolean(),
        blank: z2.boolean(),
        subagent: z2.boolean(),
        origin: z2.string().nullable(),
        parentSession: z2.string().nullable(),
        seedLength: z2.number().nullable(),
        calls: z2.number().int().nonnegative(),
        stats: _stats$schema,
        durMs: z2.number().nonnegative(),
        slots: z2.array(_slot$schema),
        slotStats: z2.array(_slotStat$schema),
        slotUsage: z2.array(_usage$schema),
        quality: z2.enum(["exact", "partial", "stale"]),
        cwd: z2.string().nullable()
      }).strict();
      const _project$schema = z2.object({
        id: z2.string(),
        name: z2.string(),
        path: z2.string(),
        sessionCount: z2.number().int().nonnegative(),
        subagentCount: z2.number().int().nonnegative(),
        lastActiveAt: z2.number().nullable(),
        stats: _stats$schema,
        cost: _costSummary$schema,
        sessions: z2.array(_session$schema)
      }).strict();
      const _result$schema2 = z2.object({
        projects: z2.array(_project$schema),
        cost: _costSummary$schema,
        timeline: z2.object({ slotMinutes: z2.number().int().positive(), days: z2.array(z2.object({ date: z2.string(), dayTotalMs: z2.number().nonnegative(), slotBlocks: z2.array(z2.object({ slot: z2.number().int().nonnegative(), projectId: z2.string(), name: z2.string(), colorIndex: z2.number().int().nonnegative(), ms: z2.number().nonnegative() }).strict()) }).strict()) }).strict(),
        meta: z2.object({ schemaVersion: z2.literal(2), source: z2.literal("host"), pricingVersion: z2.number().int().positive().optional(), pricingFingerprint: z2.string().optional(), generatedAt: z2.number().nonnegative(), degraded: z2.boolean(), warnings: z2.array(z2.object({ code: z2.string(), message: z2.string(), sessionId: z2.string().optional() }).strict()) }).strict()
      }).strict();
      const _balanceAccount$schema = z2.object({
        provider: z2.literal("deepseek"),
        name: z2.string(),
        status: z2.enum(["ok", "stale", "unconfigured", "error"]),
        currency: z2.string(),
        total: z2.number().nonnegative().nullable(),
        toppedUp: z2.number().nonnegative().nullable(),
        granted: z2.number().nonnegative().nullable(),
        fetchedAt: z2.number().nonnegative().nullable(),
        topUpUrl: z2.string().url(),
        errorCode: z2.string().nullable()
      }).strict();
      const _balanceResult$schema2 = z2.object({
        generatedAt: z2.number().nonnegative(),
        accounts: z2.array(_balanceAccount$schema),
        warnings: z2.array(z2.object({ code: z2.string(), message: z2.string() }).strict())
      }).strict();
      const _providerStatus$schema = z2.enum(["pending", "ok", "not-configured", "unauthorized", "rate-limited", "unavailable", "invalid-response", "blocked", "unsupported"]);
      const _provider$schema = z2.object({
        id: z2.string(),
        displayName: z2.string(),
        providerFamily: z2.string(),
        accountMode: z2.enum(["balance", "subscription", "unsupported"]),
        adapter: z2.string().nullable(),
        configured: z2.boolean(),
        status: _providerStatus$schema,
        fetchedAt: z2.number().nonnegative().nullable()
      }).strict();
      const _providersResult$schema2 = z2.object({ generatedAt: z2.number().nonnegative(), providers: z2.array(_provider$schema) }).strict();
      const _balanceView$schema = z2.object({
        currency: z2.string(),
        remaining: z2.number().nonnegative(),
        used: z2.number().nonnegative().nullable(),
        total: z2.number().nonnegative().nullable(),
        toppedUp: z2.number().nonnegative().nullable(),
        granted: z2.number().nonnegative().nullable(),
        unlimited: z2.boolean()
      }).strict();
      const _quotaWindow$schema = z2.object({
        kind: z2.string(),
        usedPercent: z2.number().min(0).max(100),
        remainingPercent: z2.number().min(0).max(100),
        resetsAt: z2.number().nonnegative().nullable()
      }).strict();
      const _account$schema = z2.object({
        id: z2.string(),
        displayName: z2.string(),
        providerFamily: z2.string(),
        mode: z2.enum(["balance", "subscription", "unsupported"]),
        adapter: z2.string().nullable(),
        status: z2.enum(["ok", "not-configured", "unauthorized", "rate-limited", "unavailable", "invalid-response", "blocked", "unsupported"]),
        stale: z2.boolean(),
        fetchedAt: z2.number().nonnegative(),
        lastSuccessAt: z2.number().nonnegative().nullable(),
        errorCode: z2.string().nullable(),
        missingCredential: z2.string().nullable(),
        actionUrl: z2.string().url().nullable(),
        balance: _balanceView$schema.nullable(),
        plan: z2.string().nullable(),
        windows: z2.array(_quotaWindow$schema)
      }).strict();
      const _accountResult$schema2 = z2.object({
        generatedAt: z2.number().nonnegative(),
        accounts: z2.array(_account$schema),
        warnings: z2.array(z2.object({ providerId: z2.string(), code: z2.string(), message: z2.string() }).strict())
      }).strict();
      const _accountForce$schema2 = z2.boolean().optional();
      const pricingRequestSchema2 = z2.object({ action: z2.enum(["status", "refresh", "preview", "save", "rollback"]), fingerprint: z2.string().max(64).optional(), revision: z2.number().int().nonnegative().optional(), version: z2.number().int().positive().optional(), autoUpdate: z2.boolean().optional(), overridesJson: payloadString(MAX_OVERRIDES_BYTES).optional() }).strict().optional();
      const pricingResultSchema2 = z2.object({ version: z2.number().int().positive(), publishedAt: z2.string(), fingerprint: z2.string(), lastCheckAt: z2.number().nullable(), lastSuccessAt: z2.number().nullable(), error: z2.string().nullable(), errorDetail: z2.string().max(200).nullable().optional(), errorAt: z2.number().nullable().optional(), attempts: z2.number().int().nonnegative().optional(), consecutiveFailures: z2.number().int().nonnegative().optional(), nextCheckAt: z2.number().nullable().optional(), revision: z2.number().int().nonnegative(), autoUpdate: z2.boolean(), pinnedVersion: z2.number().nullable(), catalogJson: payloadString(MAX_CATALOG_BYTES), overridesJson: payloadString(MAX_OVERRIDES_BYTES), history: z2.array(z2.number().int().positive()), previewJson: z2.string().optional() }).strict();
      const legacyIdentity = { providerId: true, providerFamily: true, modelRaw: true, modelCanonical: true, accountType: true, cost: true };
      const legacySession = _session$schema.partial(legacyIdentity).extend({
        modelUsage: z2.array(_modelUsage$schema.partial(legacyIdentity)),
        slotUsage: z2.array(_usage$schema.partial({ ...legacyIdentity, contextTokens: true }))
      });
      const legacyAggregate = _result$schema2.partial({ cost: true }).extend({
        projects: z2.array(_project$schema.partial({ cost: true }).extend({ sessions: z2.array(legacySession) })),
        meta: _result$schema2.shape.meta.extend({ schemaVersion: z2.literal(1).optional() })
      });
      function validate(schema, value) {
        const result = schema.safeParse(value);
        if (!result.success) {
          const issue = result.error.issues[0];
          const path = issue.path.map((key, i) => typeof key === "number" ? "[" + key + "]" : (i ? "." : "") + key).join("");
          throw new TypeError((path || "RPC result") + ": " + issue.message);
        }
        return value;
      }
      function parseAggregateResult(value) {
        return validate(value?.meta?.schemaVersion === void 0 || value?.meta?.schemaVersion === 1 ? legacyAggregate : _result$schema2, value);
      }
      const parseBalanceResult = (value) => validate(_balanceResult$schema2, value);
      const parseAccountResult = (value) => validate(_accountResult$schema2, value);
      const parseProvidersResult = (value) => validate(_providersResult$schema2, value);
      return {
        pricingRequestSchema: pricingRequestSchema2,
        pricingResultSchema: pricingResultSchema2,
        parsePricingResult: (value) => validate(pricingResultSchema2, value),
        aggregateSchema: _result$schema2,
        balanceSchema: _balanceResult$schema2,
        accountSchema: _accountResult$schema2,
        providersSchema: _providersResult$schema2,
        forceSchema: _accountForce$schema2,
        parseAggregateResult,
        parseBalanceResult,
        parseAccountResult,
        parseProvidersResult
      };
    };
  }
});

// src/typert-host.js
var import_rpc_schemas = __toESM(require_rpc_schemas(), 1);
import { z } from "zod";
var schemas = (0, import_rpc_schemas.default)(z);
var { pricingRequestSchema, pricingResultSchema, aggregateSchema: _result$schema, balanceSchema: _balanceResult$schema, accountSchema: _accountResult$schema, providersSchema: _providersResult$schema, forceSchema: _accountForce$schema } = schemas;
var TYPERT = {
  package: "@rongyi7/dsh-stats",
  face: "host",
  schemas: [],
  invocations: [
    {
      id: "@rongyi7/dsh-stats#stats/aggregate",
      service: "stats",
      namespace: "stats",
      method: "aggregate",
      invocation: { kind: "direct" },
      parameters: [],
      result: {
        mode: "strict",
        typeSymbol: "@rongyi7/dsh-stats#stats/aggregate:result",
        schema: _result$schema
      },
      sourceLocation: { "file": "packages/stats/src/index.ts", "line": 1, "column": 1 }
    },
    {
      id: "@rongyi7/dsh-stats#stats/current",
      service: "stats",
      namespace: "stats",
      method: "current",
      invocation: { kind: "direct" },
      parameters: [],
      result: {
        mode: "strict",
        typeSymbol: "@rongyi7/dsh-stats#stats/current:result",
        schema: _balanceResult$schema
      },
      sourceLocation: { "file": "packages/stats/src/index.ts", "line": 1, "column": 1 }
    },
    {
      id: "@rongyi7/dsh-stats#stats/providers",
      service: "stats",
      namespace: "stats",
      method: "providers",
      invocation: { kind: "direct" },
      parameters: [],
      result: { mode: "strict", typeSymbol: "@rongyi7/dsh-stats#stats/providers:result", schema: _providersResult$schema },
      sourceLocation: { "file": "packages/stats/src/index.ts", "line": 1, "column": 1 }
    },
    {
      id: "@rongyi7/dsh-stats#stats/account",
      service: "stats",
      namespace: "stats",
      method: "account",
      invocation: { kind: "direct" },
      parameters: [{
        name: "force",
        wire: "force",
        source: "json",
        codec: { mode: "strict", typeSymbol: "@rongyi7/dsh-stats#stats/account:force", schema: _accountForce$schema }
      }],
      result: { mode: "strict", typeSymbol: "@rongyi7/dsh-stats#stats/account:result", schema: _accountResult$schema },
      sourceLocation: { "file": "packages/stats/src/index.ts", "line": 1, "column": 1 }
    },
    {
      id: "@rongyi7/dsh-stats#stats/pricing",
      service: "stats",
      namespace: "stats",
      method: "pricing",
      invocation: { kind: "direct" },
      parameters: [{ name: "request", wire: "request", source: "json", codec: { mode: "strict", typeSymbol: "@rongyi7/dsh-stats#stats/pricing:request", schema: pricingRequestSchema } }],
      result: { mode: "strict", typeSymbol: "@rongyi7/dsh-stats#stats/pricing:result", schema: pricingResultSchema },
      sourceLocation: { file: "src/index.js", line: 1, column: 1 }
    }
  ],
  model: {
    "services": [],
    "events": [],
    "objects": []
  }
};
for (const row of TYPERT.invocations) {
  for (const codec of [row.result, ...row.parameters.map((p) => p.codec)]) {
    if (codec?.mode === "strict" && typeof codec.create !== "function") codec.create = () => codec.schema;
  }
}
export {
  TYPERT
};
