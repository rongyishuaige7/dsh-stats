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

// src/rpc-schemas.cjs
var require_rpc_schemas = __commonJS({
  "src/rpc-schemas.cjs"(exports, module) {
    module.exports = function createRpcSchemas2(z2) {
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
        estimatedAmount: z2.number().nonnegative()
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
        pricing: z2.object({ catalogVersion: z2.number().int().positive().optional(), ruleRevision: z2.string().optional(), pricedAt: z2.number().nonnegative().optional(), basis: z2.enum(["custom", "reference", "provider"]).optional(), historicalEstimate: z2.boolean().optional(), nativeAmount: z2.number().nonnegative().optional(), nativeCurrency: z2.string().optional(), fxRate: z2.number().positive().optional(), fxDate: z2.string().optional(), fxSource: z2.string().optional() }).strict().optional()
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
      const pricingRequestSchema2 = z2.object({ action: z2.enum(["status", "refresh", "preview", "save", "rollback"]), revision: z2.number().int().nonnegative().optional(), version: z2.number().int().positive().optional(), autoUpdate: z2.boolean().optional(), overridesJson: z2.string().max(262144).optional() }).strict().optional();
      const pricingResultSchema2 = z2.object({ version: z2.number().int().positive(), publishedAt: z2.string(), fingerprint: z2.string(), lastCheckAt: z2.number().nullable(), lastSuccessAt: z2.number().nullable(), error: z2.string().nullable(), revision: z2.number().int().nonnegative(), autoUpdate: z2.boolean(), pinnedVersion: z2.number().nullable(), catalogJson: z2.string().max(4194304), overridesJson: z2.string().max(262144), history: z2.array(z2.number().int().positive()), previewJson: z2.string().optional() }).strict();
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

// src/typert-remote-client.js
var import_rpc_schemas = __toESM(require_rpc_schemas(), 1);
import { z } from "zod";
var schemas = (0, import_rpc_schemas.default)(z);
var { pricingRequestSchema, pricingResultSchema, aggregateSchema: _result$schema, balanceSchema: _balanceResult$schema, accountSchema: _accountResult$schema, providersSchema: _providersResult$schema, forceSchema: _accountForce$schema } = schemas;
var TYPERT_REMOTE = {
  package: "@rongyi7/dsh-stats",
  descriptors: [
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
  ]
};
var typert_remote_client_default = TYPERT_REMOTE;
export {
  TYPERT_REMOTE,
  typert_remote_client_default as default
};
