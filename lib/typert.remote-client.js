/* Typert remote-client face for @rongyi7/dsh-stats — hand-written. */
import { z } from 'zod'

const _result$schema = z.unknown()

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
