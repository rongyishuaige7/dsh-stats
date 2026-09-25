import { parseOpenAI, openRouterRule, appendObservedRule, collect, deepSeekObservation } from '../scripts/collect-pricing.mjs';
import pricing from '../src/pricing.cjs';
import { draftRule, blankDraft, ruleDraft, missingModels } from '../src/pricing-panel.cjs';
const at = '2026-09-18T00:00:00.000Z';
const deepSeekHtml = '<article><table><tr><td>deepseek-flash 缓存 高峰 2</td></tr></table></article>';
const deepSeekBaseline = deepSeekObservation(deepSeekHtml);
const model = (id = 'vendor/new-model') => ({ id, architecture: { output_modalities: ['text'] }, pricing: { prompt: '0.000001', completion: '0.000002', input_cache_read: '0', request: '0' } });
const markdown = `### Standard pricing data
| gpt-6-astra | $10 | $1 | $12.5 | $50 | $20 | $2 | $25 | $75 |
| gpt-new | $1 | - | - | $2 | - | - | - | - |
| gpt-other | $1 | $0 | - | $2 | - | - | - | - |
### Batch pricing data`;

test('official parser distinguishes missing and free rates, and fails closed on changed markup', () => {
  expect(parseOpenAI(markdown)[1].short.cacheRead).toBeNull();
  expect(parseOpenAI(markdown)[2].short.cacheRead).toBe(0);
  expect(() => parseOpenAI('changed markup')).toThrow();
  expect(() => parseOpenAI(markdown.replace('$10', 'contact sales'))).toThrow();
});

test('structured collector scopes models to OpenRouter and rejects unsupported billing dimensions', () => {
  const rule = openRouterRule(model(), at);
  expect(rule).toMatchObject({ family: 'openrouter', rates: { uncached: 1, output: 2, cacheRead: 0, cacheWrite: null } });
  expect(openRouterRule({ ...model(), pricing: { ...model().pricing, image: '1' } }, at)).toBeNull();
  expect(openRouterRule({ ...model(), architecture: { output_modalities: ['text', 'image'] } }, at)).toBeNull();
  expect(openRouterRule({ ...model(), pricing: { prompt: null, completion: '1' } }, at)).toBeNull();
});

test('observed changes preserve historical prices and ignore property order', () => {
  const catalog = structuredClone(pricing.BUILTIN);
  const first = openRouterRule(model(), at);
  expect(appendObservedRule(catalog, first, at)).toBe(true);
  const reversed = { ...first, rates: Object.fromEntries(Object.entries(first.rates).reverse()) };
  expect(appendObservedRule(catalog, reversed, at)).toBe(false);
  const nextAt = '2026-09-19T00:00:00.000Z';
  const next = openRouterRule({ ...model(), pricing: { ...model().pricing, prompt: '0.000002' } }, nextAt);
  expect(appendObservedRule(catalog, next, nextAt)).toBe(true);
  const engine = pricing.createPricing(catalog);
  const usage = { providerId: 'openrouter', model: model().id, uncached: 1000000 };
  expect(engine.priceUsage({ ...usage, time: Date.parse(nextAt) - 1 }).amount).toBe(1);
  expect(engine.priceUsage({ ...usage, time: Date.parse(nextAt) }).amount).toBe(2);
  expect(engine.priceUsage({ ...usage, providerId: 'other-provider' }).amount).toBeNull();
});

test('collection separates reviewed official candidates and publishes only validated structured rows', async () => {
  const fetchSource = async url => url.includes('openrouter') ? { data: Array.from({ length: 10 }, (_, i) => model('vendor/new-' + i)) } : url.includes('deepseek') ? deepSeekHtml : markdown;
  const result = await collect({ fetchSource, at, deepSeekBaseline });
  expect(result.report.failures).toEqual([]);
  expect(result.report.changes).toBe(10);
  expect(result.report.candidates.map(c => c.model)).toEqual(['gpt-new', 'gpt-other']);
  expect(result.catalog.version).toBe(pricing.BUILTIN.version + 1);
  const repeat = await collect({ fetchSource, at, baseCatalog: result.catalog, deepSeekBaseline });
  expect(repeat.report.changes).toBe(0);
  const failed = await collect({ fetchSource: async () => { throw new Error('offline'); }, at });
  expect(failed.report.failures).toHaveLength(3);
  expect(failed.catalog).toEqual(pricing.BUILTIN);
});

test('custom price editor round-trips context tiers and keeps blanks distinct from zero', () => {
  const draft = { ...blankDraft('yi-api', 'gpt-6-astra'), uncached: '1', output: '2', cacheRead: '0', threshold: '272000', longUncached: '2', longOutput: '3', priority: '2', from: '2026-09-17T08:00' };
  const rule = draftRule(draft, [], new Date(at));
  expect(rule.contextTiers.short.cacheWrite).toBeNull();
  expect(rule.contextTiers.short.cacheRead).toBe(0);
  expect(ruleDraft(rule)).toEqual(draft);
  expect(() => draftRule({ ...draft, uncached: '-1' }, [])).toThrow();
  expect(missingModels([{ sessions: [{ slotUsage: [{ providerId: 'x', model: 'y', cost: { status: 'partial', unpricedTokens: 12 } }, { cost: { status: 'subscription', unpricedTokens: 20 } }] }] }])).toEqual([{ provider: 'x', model: 'y', tokens: 12 }]);
});


test('DeepSeek monitoring reports changed rates and uncovered models without publishing them', async () => {
  const fetchSource = async url => url.includes('deepseek') ? deepSeekHtml.replace('deepseek-flash', 'deepseek-new').replace('高峰 2', '高峰 3') : url.includes('openrouter') ? { data: Array.from({ length: 10 }, (_, i) => model('vendor/new-' + i)) } : markdown;
  const result = await collect({ fetchSource, at, deepSeekBaseline });
  expect(result.report.failures).toEqual([]);
  const candidates = result.report.candidates.filter(c => c.source.includes('deepseek'));
  expect(candidates).toHaveLength(2);
  expect(candidates[1].model).toBe('deepseek-new');
  expect(result.catalog.rules.some(r => r.canonical === 'deepseek-new')).toBe(false);
  expect(() => deepSeekObservation('<article>captcha</article>')).toThrow();
});
