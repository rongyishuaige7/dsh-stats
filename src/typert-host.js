import { z } from 'zod'
import createRpcSchemas from './rpc-schemas.cjs'
const schemas = createRpcSchemas(z)
const { pricingRequestSchema, pricingResultSchema, aggregateSchema: _result$schema, balanceSchema: _balanceResult$schema, accountSchema: _accountResult$schema, providersSchema: _providersResult$schema, forceSchema: _accountForce$schema } = schemas

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
    {
      id: '@rongyi7/dsh-stats#stats/pricing', service: 'stats', namespace: 'stats', method: 'pricing', invocation: { kind: 'direct' },
      parameters: [{ name: 'request', wire: 'request', source: 'json', codec: { mode: 'strict', typeSymbol: '@rongyi7/dsh-stats#stats/pricing:request', schema: pricingRequestSchema } }],
      result: { mode: 'strict', typeSymbol: '@rongyi7/dsh-stats#stats/pricing:result', schema: pricingResultSchema },
      sourceLocation: { file: 'src/index.js', line: 1, column: 1 },
    },
  ],
  model: {
    "services": [],
    "events": [],
    "objects": []
  },
}
