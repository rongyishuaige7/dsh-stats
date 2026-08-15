/* Typert host face for @rongyi7/dsh-stats — hand-written (no generator available out-of-tree). */
import { z } from 'zod'

const _result$schema = z.unknown()

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
  ],
  model: {
    "services": [],
    "events": [],
    "objects": []
  },
}
