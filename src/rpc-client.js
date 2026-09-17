// Named ESM imports let the browser build omit unused Zod APIs and locales.
import { object, number, string, array, boolean, literal, enum as enumeration } from 'zod';
import createRpcSchemas from './rpc-schemas.cjs';

export const {
  parsePricingResult, pricingRequestSchema, parseAggregateResult, parseBalanceResult, parseAccountResult, parseProvidersResult, forceSchema,
} = createRpcSchemas({ object, number, string, array, boolean, literal, enum: enumeration });
