/* Typert host face for @rongyi7/dsh-stats — hand-written (no generator available out-of-tree). */
import { z } from 'zod'

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
  status: z.enum(['exact', 'estimated', 'free', 'subscription', 'unsupported', 'ambiguous']),
  amount: z.number().nonnegative().nullable(), currency: z.string().nullable(),
  exactAmount: z.number().nonnegative(), estimatedAmount: z.number().nonnegative(), unpricedTokens: z.number().nonnegative(),
  ruleId: z.string().nullable(), sourceUrl: z.string().url().nullable(), retrievedAt: z.string().nullable(),
  providerId: z.string(), providerFamily: z.string(), modelCanonical: z.string(),
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
  serviceTier: z.enum(['standard', 'priority']), contextTokens: z.number().nonnegative(), contextOver512k: z.boolean(), slot: z.number().int().nonnegative(),
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
  meta: z.object({ schemaVersion: z.number().int().positive(), source: z.literal('host'), generatedAt: z.number().nonnegative(), degraded: z.boolean(), warnings: z.array(z.object({ code: z.string(), message: z.string(), sessionId: z.string().optional() }).strict()) }).strict(),
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

export const TYPERT = {
  package: '@rongyi7/dsh-stats',
  face: 'host',
  schemas: [],
  invocations: [
    {
      id: '@rongyi7/dsh-stats#stats/aggregate',
      service: 'stats',
      namespace: 'stats',
      method: 'aggregate',
      invocation: { kind: 'direct' },
      parameters: [],
      result: {
        mode: 'strict',
        typeSymbol: '@rongyi7/dsh-stats#stats/aggregate:result',
        schema: _result$schema,
      },
      sourceLocation: { "file": "packages/stats/src/index.ts", "line": 1, "column": 1 },
    },
    {
      id: '@rongyi7/dsh-stats#stats/current',
      service: 'stats',
      namespace: 'stats',
      method: 'current',
      invocation: { kind: 'direct' },
      parameters: [],
      result: {
        mode: 'strict',
        typeSymbol: '@rongyi7/dsh-stats#stats/current:result',
        schema: _balanceResult$schema,
      },
      sourceLocation: { "file": "packages/stats/src/index.ts", "line": 1, "column": 1 },
    },
    {
      id: '@rongyi7/dsh-stats#stats/providers',
      service: 'stats', namespace: 'stats', method: 'providers', invocation: { kind: 'direct' }, parameters: [],
      result: { mode: 'strict', typeSymbol: '@rongyi7/dsh-stats#stats/providers:result', schema: _providersResult$schema },
      sourceLocation: { "file": "packages/stats/src/index.ts", "line": 1, "column": 1 },
    },
    {
      id: '@rongyi7/dsh-stats#stats/account',
      service: 'stats', namespace: 'stats', method: 'account', invocation: { kind: 'direct' }, parameters: [{
        name: 'force', wire: 'force', source: 'json', codec: { mode: 'strict', typeSymbol: '@rongyi7/dsh-stats#stats/account:force', schema: _accountForce$schema },
      }],
      result: { mode: 'strict', typeSymbol: '@rongyi7/dsh-stats#stats/account:result', schema: _accountResult$schema },
      sourceLocation: { "file": "packages/stats/src/index.ts", "line": 1, "column": 1 },
    },
  ],
  model: {
    "services": [],
    "events": [],
    "objects": []
  },
}
