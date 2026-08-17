/* Typert remote-client face for @rongyi7/dsh-stats — hand-written. */
import { z } from 'zod'

const _stats$schema = z.object({
  turns: z.number().nonnegative(), steps: z.number().nonnegative(),
  llmMs: z.number().nonnegative(), toolMs: z.number().nonnegative(),
  ttftMs: z.number().nonnegative(), ttftSteps: z.number().nonnegative(),
  decodeMs: z.number().nonnegative(), decodeTokens: z.number().nonnegative(),
  uncached: z.number().nonnegative(), output: z.number().nonnegative(),
  cacheRead: z.number().nonnegative(), cacheWrite: z.number().nonnegative(), reasoning: z.number().nonnegative(),
}).strict()
const _modelUsage$schema = z.object({
  model: z.string(), uncached: z.number().nonnegative(), output: z.number().nonnegative(),
  cacheRead: z.number().nonnegative(), cacheWrite: z.number().nonnegative(), reasoning: z.number().nonnegative(),
}).strict()
const _session$schema = z.object({
  id: z.string(), title: z.string().nullable(), updatedAt: z.number().nullable(), createdAt: z.number().nullable(),
  model: z.string().nullable(), modelUsage: z.array(_modelUsage$schema), archived: z.boolean(), blank: z.boolean(),
  subagent: z.boolean(), origin: z.string().nullable(), parentSession: z.string().nullable(), seedLength: z.number().nullable(),
  calls: z.number().nonnegative(), stats: _stats$schema, durMs: z.number().nonnegative(),
  slots: z.array(z.object({ slot: z.number().int().nonnegative(), ms: z.number().nonnegative() }).strict()),
  slotStats: z.array(z.object({ slot: z.number().int().nonnegative(), turns: z.number().nonnegative(), steps: z.number().nonnegative(), llmMs: z.number().nonnegative(), toolMs: z.number().nonnegative(), ttftMs: z.number().nonnegative(), ttftSteps: z.number().nonnegative(), decodeMs: z.number().nonnegative(), decodeTokens: z.number().nonnegative() }).strict()),
  slotUsage: z.array(z.object({ model: z.string(), serviceTier: z.enum(['standard', 'priority']), contextOver512k: z.boolean(), slot: z.number().int().nonnegative(), uncached: z.number().nonnegative(), output: z.number().nonnegative(), cacheRead: z.number().nonnegative(), cacheWrite: z.number().nonnegative(), reasoning: z.number().nonnegative() }).strict()),
  quality: z.enum(['exact', 'partial', 'stale']), cwd: z.string().nullable(),
}).strict()
const _result$schema = z.object({
  projects: z.array(z.object({
    id: z.string(), name: z.string(), path: z.string(), sessionCount: z.number().nonnegative(), subagentCount: z.number().nonnegative(),
    lastActiveAt: z.number().nullable(), stats: _stats$schema, sessions: z.array(_session$schema),
  }).strict()),
  timeline: z.object({ slotMinutes: z.number().int().positive().optional(), days: z.array(z.object({ date: z.string(), dayTotalMs: z.number().nonnegative(), slotBlocks: z.array(z.object({ slot: z.number().int(), projectId: z.string(), name: z.string(), colorIndex: z.number().int().nonnegative(), ms: z.number().nonnegative() }).strict()) }).strict()) }).strict(),
  meta: z.object({ source: z.literal('host'), generatedAt: z.number().nonnegative(), degraded: z.boolean(), warnings: z.array(z.object({ code: z.string(), message: z.string(), sessionId: z.string().optional() }).strict()) }).strict(),
}).strict()

export const TYPERT_REMOTE = {
  package: '@rongyi7/dsh-stats',
  descriptors: [
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
  ],
}

export default TYPERT_REMOTE
