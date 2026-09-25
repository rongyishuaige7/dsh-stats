// The host imports zod as ESM; the browser bundles it. Keep the schema
// definitions independent of module-loading semantics in both artifacts.
module.exports = function createRpcSchemas(z) {

const _stats$schema = z.object({
  turns: z.number().nonnegative(), steps: z.number().nonnegative(),
  llmMs: z.number().nonnegative(), toolMs: z.number().nonnegative(),
  ttftMs: z.number().nonnegative(), ttftSteps: z.number().nonnegative(),
  decodeMs: z.number().nonnegative(), decodeTokens: z.number().nonnegative(),
  uncached: z.number().nonnegative(), output: z.number().nonnegative(),
  cacheRead: z.number().nonnegative(), cacheWrite: z.number().nonnegative(),
  reasoning: z.number().nonnegative(),
}).strict()
const _costTotal$schema = z.object({
  currency: z.string(), amount: z.number().nonnegative(), exactAmount: z.number().nonnegative(), estimatedAmount: z.number().nonnegative(),
}).strict()
const _costSummary$schema = z.object({
  status: z.enum(['exact', 'estimated', 'free', 'partial', 'unsupported']), totals: z.array(_costTotal$schema),
  unpricedTokens: z.number().nonnegative(), unknownRows: z.number().int().nonnegative(),
}).strict()
const _cost$schema = z.object({
  status: z.enum(['exact', 'estimated', 'free', 'subscription', 'unsupported', 'ambiguous', 'partial']),
  amount: z.number().nonnegative().nullable(), currency: z.string().nullable(),
  exactAmount: z.number().nonnegative(), estimatedAmount: z.number().nonnegative(), unpricedTokens: z.number().nonnegative(),
  ruleId: z.string().nullable(), sourceUrl: z.string().url().nullable(), retrievedAt: z.string().nullable(),
  providerId: z.string(), providerFamily: z.string(), modelCanonical: z.string(),
  pricing: z.object({ catalogVersion: z.number().int().positive().optional(), ruleRevision: z.string().optional(), pricedAt: z.number().nonnegative().optional(), basis: z.enum(['custom', 'reference', 'provider']).optional(), historicalEstimate: z.boolean().optional(), calendarEstimate: z.boolean().optional(), nativeAmount: z.number().nonnegative().optional(), nativeCurrency: z.string().optional(), fxRate: z.number().positive().optional(), fxDate: z.string().optional(), fxSource: z.string().optional() }).strict().optional(),
}).strict()
const _modelUsage$schema = z.object({
  model: z.string(), providerId: z.string(), providerFamily: z.string(), modelRaw: z.string(), modelCanonical: z.string(), accountType: z.string(),
  uncached: z.number().nonnegative(), output: z.number().nonnegative(),
  cacheRead: z.number().nonnegative(), cacheWrite: z.number().nonnegative(), reasoning: z.number().nonnegative(),
  cost: _costSummary$schema,
}).strict()
const _slot$schema = z.object({ slot: z.number().int().nonnegative(), ms: z.number().nonnegative() }).strict()
const _slotStat$schema = z.object({
  slot: z.number().int().nonnegative(), turns: z.number().nonnegative(), steps: z.number().nonnegative(),
  llmMs: z.number().nonnegative(), toolMs: z.number().nonnegative(),
  ttftMs: z.number().nonnegative(), ttftSteps: z.number().nonnegative(),
  decodeMs: z.number().nonnegative(), decodeTokens: z.number().nonnegative(),
}).strict()
const _usage$schema = z.object({
  model: z.string(), providerId: z.string(), providerFamily: z.string(), modelRaw: z.string(), modelCanonical: z.string(), accountType: z.string(),
  serviceTier: z.enum(['standard', 'priority', 'batch', 'flex', 'unknown']), contextTokens: z.number().nonnegative(), contextOver512k: z.boolean(), slot: z.number().int().nonnegative(), time: z.number().nonnegative().optional(),
  uncached: z.number().nonnegative(), output: z.number().nonnegative(),
  cacheRead: z.number().nonnegative(), cacheWrite: z.number().nonnegative(), reasoning: z.number().nonnegative(),
  cost: _cost$schema,
}).strict()
const _session$schema = z.object({
  id: z.string(), title: z.string().nullable(), updatedAt: z.number().nullable(), createdAt: z.number().nullable(),
  model: z.string().nullable(), providerId: z.string(), providerFamily: z.string(), modelRaw: z.string(), modelCanonical: z.string(), accountType: z.string(),
  modelUsage: z.array(_modelUsage$schema), cost: _costSummary$schema, archived: z.boolean(), blank: z.boolean(),
  subagent: z.boolean(), origin: z.string().nullable(), parentSession: z.string().nullable(), seedLength: z.number().nullable(),
  calls: z.number().int().nonnegative(), stats: _stats$schema, durMs: z.number().nonnegative(),
  slots: z.array(_slot$schema), slotStats: z.array(_slotStat$schema), slotUsage: z.array(_usage$schema),
  quality: z.enum(['exact', 'partial', 'stale']), cwd: z.string().nullable(),
}).strict()
const _project$schema = z.object({
  id: z.string(), name: z.string(), path: z.string(), sessionCount: z.number().int().nonnegative(), subagentCount: z.number().int().nonnegative(),
  lastActiveAt: z.number().nullable(), stats: _stats$schema, cost: _costSummary$schema, sessions: z.array(_session$schema),
}).strict()
const _result$schema = z.object({
  projects: z.array(_project$schema), cost: _costSummary$schema,
  timeline: z.object({ slotMinutes: z.number().int().positive(), days: z.array(z.object({ date: z.string(), dayTotalMs: z.number().nonnegative(), slotBlocks: z.array(z.object({ slot: z.number().int().nonnegative(), projectId: z.string(), name: z.string(), colorIndex: z.number().int().nonnegative(), ms: z.number().nonnegative() }).strict()) }).strict()) }).strict(),
  meta: z.object({ schemaVersion: z.literal(2), source: z.literal('host'), pricingVersion: z.number().int().positive().optional(), pricingFingerprint: z.string().optional(), generatedAt: z.number().nonnegative(), degraded: z.boolean(), warnings: z.array(z.object({ code: z.string(), message: z.string(), sessionId: z.string().optional() }).strict()) }).strict(),
}).strict()
const _balanceAccount$schema = z.object({
  provider: z.literal('deepseek'), name: z.string(), status: z.enum(['ok', 'stale', 'unconfigured', 'error']),
  currency: z.string(), total: z.number().nonnegative().nullable(), toppedUp: z.number().nonnegative().nullable(),
  granted: z.number().nonnegative().nullable(), fetchedAt: z.number().nonnegative().nullable(),
  topUpUrl: z.string().url(), errorCode: z.string().nullable(),
}).strict()
const _balanceResult$schema = z.object({
  generatedAt: z.number().nonnegative(), accounts: z.array(_balanceAccount$schema),
  warnings: z.array(z.object({ code: z.string(), message: z.string() }).strict()),
}).strict()
const _providerStatus$schema = z.enum(['pending', 'ok', 'not-configured', 'unauthorized', 'rate-limited', 'unavailable', 'invalid-response', 'blocked', 'unsupported'])
const _provider$schema = z.object({
  id: z.string(), displayName: z.string(), providerFamily: z.string(), accountMode: z.enum(['balance', 'subscription', 'unsupported']),
  adapter: z.string().nullable(), configured: z.boolean(), status: _providerStatus$schema, fetchedAt: z.number().nonnegative().nullable(),
}).strict()
const _providersResult$schema = z.object({ generatedAt: z.number().nonnegative(), providers: z.array(_provider$schema) }).strict()
const _balanceView$schema = z.object({
  currency: z.string(), remaining: z.number().nonnegative(), used: z.number().nonnegative().nullable(), total: z.number().nonnegative().nullable(),
  toppedUp: z.number().nonnegative().nullable(), granted: z.number().nonnegative().nullable(), unlimited: z.boolean(),
}).strict()
const _quotaWindow$schema = z.object({
  kind: z.string(), usedPercent: z.number().min(0).max(100), remainingPercent: z.number().min(0).max(100), resetsAt: z.number().nonnegative().nullable(),
}).strict()
const _account$schema = z.object({
  id: z.string(), displayName: z.string(), providerFamily: z.string(), mode: z.enum(['balance', 'subscription', 'unsupported']), adapter: z.string().nullable(),
  status: z.enum(['ok', 'not-configured', 'unauthorized', 'rate-limited', 'unavailable', 'invalid-response', 'blocked', 'unsupported']),
  stale: z.boolean(), fetchedAt: z.number().nonnegative(), lastSuccessAt: z.number().nonnegative().nullable(), errorCode: z.string().nullable(),
  missingCredential: z.string().nullable(), actionUrl: z.string().url().nullable(), balance: _balanceView$schema.nullable(), plan: z.string().nullable(), windows: z.array(_quotaWindow$schema),
}).strict()
const _accountResult$schema = z.object({
  generatedAt: z.number().nonnegative(), accounts: z.array(_account$schema),
  warnings: z.array(z.object({ providerId: z.string(), code: z.string(), message: z.string() }).strict()),
}).strict()
const _accountForce$schema = z.boolean().optional()
const pricingRequestSchema = z.object({ action: z.enum(['status', 'refresh', 'preview', 'save', 'rollback']), fingerprint: z.string().max(64).optional(), revision: z.number().int().nonnegative().optional(), version: z.number().int().positive().optional(), autoUpdate: z.boolean().optional(), overridesJson: z.string().max(262144).optional() }).strict().optional();
const pricingResultSchema = z.object({ version: z.number().int().positive(), publishedAt: z.string(), fingerprint: z.string(), lastCheckAt: z.number().nullable(), lastSuccessAt: z.number().nullable(), error: z.string().nullable(), revision: z.number().int().nonnegative(), autoUpdate: z.boolean(), pinnedVersion: z.number().nullable(), catalogJson: z.string().max(4194304), overridesJson: z.string().max(262144), history: z.array(z.number().int().positive()), previewJson: z.string().optional() }).strict();



// Schema v1 is accepted only at the browser boundary for older plugin hosts.
const legacyIdentity = { providerId: true, providerFamily: true, modelRaw: true, modelCanonical: true, accountType: true, cost: true };
const legacySession = _session$schema.partial(legacyIdentity).extend({
  modelUsage: z.array(_modelUsage$schema.partial(legacyIdentity)),
  slotUsage: z.array(_usage$schema.partial({ ...legacyIdentity, contextTokens: true }))
});
const legacyAggregate = _result$schema.partial({ cost: true }).extend({
  projects: z.array(_project$schema.partial({ cost: true }).extend({ sessions: z.array(legacySession) })),
  meta: _result$schema.shape.meta.extend({ schemaVersion: z.literal(1).optional() })
});

function validate(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue.path.map((key, i) => typeof key === 'number' ? '[' + key + ']' : (i ? '.' : '') + key).join('');
    throw new TypeError((path || 'RPC result') + ': ' + issue.message);
  }
  return value;
}

function parseAggregateResult(value) {
  return validate(value?.meta?.schemaVersion === undefined || value?.meta?.schemaVersion === 1 ? legacyAggregate : _result$schema, value);
}
const parseBalanceResult = value => validate(_balanceResult$schema, value);
const parseAccountResult = value => validate(_accountResult$schema, value);
const parseProvidersResult = value => validate(_providersResult$schema, value);

return {
  pricingRequestSchema, pricingResultSchema, parsePricingResult: value => validate(pricingResultSchema, value),
  aggregateSchema: _result$schema, balanceSchema: _balanceResult$schema,
  accountSchema: _accountResult$schema, providersSchema: _providersResult$schema, forceSchema: _accountForce$schema,
  parseAggregateResult, parseBalanceResult, parseAccountResult, parseProvidersResult
};
};
