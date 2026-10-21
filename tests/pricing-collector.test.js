import { parseOpenAI, parseAnthropic, parseGoogle, openRouterRule, appendObservedRule, collect, deepSeekObservation } from '../scripts/collect-pricing.mjs';
import pricing from '../src/pricing.cjs';
import { draftRule, blankDraft, ruleDraft, missingModels, fmtBeijing } from '../src/pricing-panel.cjs';
const at = '2026-09-18T00:00:00.000Z';
const deepSeekHtml = '<article><table><tr><td>deepseek-flash 缓存 高峰 2</td></tr></table></article>';
const deepSeekBaseline = deepSeekObservation(deepSeekHtml);
const model = (id = 'vendor/new-model') => ({ id, architecture: { output_modalities: ['text'] }, pricing: { prompt: '0.000001', completion: '0.000002', input_cache_read: '0', request: '0' } });
const anthropicMd = `## Model pricing
| Model | Base input tokens | 5m cache writes | 1h cache writes | Cache hits and refreshes | Output tokens |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Claude Opus 5 | $5 / MTok | $6.25 / MTok | $10 / MTok | $0.50 / MTok | $25 / MTok |
## Prompt caching`;
const googleHtml = `<h2 id="gemini-3.8-flash">Gemini 3.8 Flash</h2>
<table class="pricing-table"><tr><td>Input price</td><td>Free</td><td>$0.75</td></tr><tr><td>Output price (including thinking tokens)</td><td>Free</td><td>$3.75</td></tr><tr><td>Context caching price</td><td>Free</td><td>$0.075</td></tr></table>
<h2 id="gemini-next">Gemini Next</h2>`;
const openaiHeader = '| Model | Short context input | Short context output | Short context cached input | Short context 30m write | Short context 12h write | Long context input | Long context output | Long context cached input | Long context 30m write | Long context 12h write |';
const openaiDoc = (frontier, legacy = []) => ['### Standard pricing data', openaiHeader,
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |', ...frontier,
  ...(legacy.length ? ['', '| Model | Input | Output | Cached input |', '| --- | --- | --- | --- |', ...legacy] : []),
  '### Batch pricing data'].join('\n');
const source = async url => url.includes('openrouter') ? { data: Array.from({ length: 10 }, (_, i) => model('vendor/new-' + i)) }
  : url.includes('deepseek') ? deepSeekHtml : url.includes('claude.com') ? anthropicMd : url.includes('google') ? googleHtml : markdown;
const markdown = openaiDoc([
  '| gpt-6-astra | $10 | $50 | $1 | $12.5 | $25 | $20 | $75 | $2 | $25 | $50 |',
  '| gpt-new | $1 | $2 | - | - | - | - | - | - | - | - |',
  '| gpt-other | $1 | $2 | $0 | - | - | - | - | - | - | - |'
]);

test('official parser distinguishes missing and free rates, and fails closed on changed markup', () => {
  expect(parseOpenAI(markdown)[1].short.cacheRead).toBeNull();
  expect(parseOpenAI(markdown)[2].short.cacheRead).toBe(0);
  expect(() => parseOpenAI('changed markup')).toThrow();
  expect(() => parseOpenAI(markdown.replace('$10', 'contact sales'))).toThrow();
});

test('official parser maps long-context annotations and honours the unknown cache-write convention', async () => {
  const annotated = openaiDoc([
    '| gpt-6-astra | $10 | $50 | $1 | $12.5 | $25 | $20 | $75 | $2 | $25 | $50 |',
    '| gpt-5.4 (<272K context length) | $2.50 | $15.00 | $0.25 | - | - | $5.00 | $22.50 | $0.50 | - | - |'
  ], [
    '| gpt-5.4-mini | $0.75 | $4.50 | $0.075 |',
    '| gpt-4o (legacy tier) | $1 | - | - |'
  ]);
  const rows = parseOpenAI(annotated);
  expect(rows.map(r => r.model)).toEqual(['gpt-6-astra', 'gpt-5.4', 'gpt-5.4-mini']);
  expect(rows[1]).toMatchObject({ threshold: 272000, long: { output: 22.5, cacheWrite: null } });
  // The 4-column legacy table has no cache-write column at all.
  expect(rows[2]).toMatchObject({ short: { uncached: 0.75, cacheRead: 0.075, cacheWrite: null, output: 4.5 }, long: null });
  const fetchSource = async url => url.includes('openrouter') ? { data: Array.from({ length: 10 }, (_, i) => model('vendor/new-' + i)) } : url.includes('deepseek') ? deepSeekHtml : url.includes('claude.com') ? anthropicMd : url.includes('google') ? googleHtml : annotated;
  // Reviewed rules estimate unpublished cache writes at the input price: not a change.
  const reviewed = await collect({ fetchSource, at, deepSeekBaseline });
  expect(reviewed.report.candidates.filter(c => c.source.includes('openai'))).toEqual([]);
  // A differing long-context rate is still proposed for review.
  const stale = structuredClone(pricing.BUILTIN);
  stale.rules.find(r => r.family === 'openai' && r.canonical === 'gpt-5.4' && !r.effectiveTo).contextTiers.long.output = 30;
  const changed = await collect({ fetchSource, at, baseCatalog: stale, deepSeekBaseline });
  expect(changed.report.candidates.filter(c => c.source.includes('openai')).map(c => c.model)).toEqual(['gpt-5.4']);
  expect(changed.report.autoPublished.map(r => r.canonical)).not.toContain('gpt-5.4');
});

test('official parser maps the reordered 11-column table by header, not by position', () => {
  const reordered = `### Standard pricing data
| Model | Short context output | Short context input | Short context 30m write | Short context 12h write | Short context cached input | Long context output | Long context input | Long context 30m write | Long context cached input |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gpt-6-astra | $50 | $10 | $12.5 | $25 | $1 | $75 | $20 | $25 | $2 |
| gpt-a | $2 | $1 | $2.5 | $5 | $0.1 | $3 | $4 | $5 | $0.2 |
| gpt-b | $4 | $2 | $5 | $10 | $0.2 | $6 | $8 | $10 | $0.4 |
### Batch pricing data`;
  // Same numbers as the catalog: only the 30m write is the cacheWrite rate, and
  // the column order must not shift any price into the wrong slot.
  expect(parseOpenAI(reordered)[0]).toMatchObject({
    short: { uncached: 10, cacheRead: 1, cacheWrite: 12.5, output: 50 },
    long: { uncached: 20, cacheRead: 2, cacheWrite: 25, output: 75 }
  });
  // A table without a recognizable header fails closed instead of guessing.
  expect(() => parseOpenAI('### Standard pricing data\n| gpt-a | $1 | $2 |\n### Batch pricing data')).toThrow();
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
  const fetchSource = source;
  const result = await collect({ fetchSource, at, deepSeekBaseline });
  expect(result.report.failures).toEqual([]);
  expect(result.report.changes).toBe(12);
  expect(result.report.autoPublished.map(r => r.canonical).sort()).toEqual(['gpt-new', 'gpt-other']);
  expect(result.report.candidates).toEqual([]);
  for (const model of ['gpt-new', 'gpt-other']) expect(result.catalog.rules.find(r => r.canonical === model)?.note).toMatch(/^\[provisional\]/);
  expect(result.catalog.version).toBe(pricing.BUILTIN.version + 1);
  const repeat = await collect({ fetchSource, at, baseCatalog: result.catalog, deepSeekBaseline });
  expect(repeat.report.changes).toBe(0);
  const failed = await collect({ fetchSource: async () => { throw new Error('offline'); }, at });
  expect(failed.report.failures).toHaveLength(5);
  expect(failed.catalog).toEqual(pricing.BUILTIN);
});

test('official Anthropic and Google adapters auto-publish new models as provisional', async () => {
  const anthropicNew = anthropicMd.replace('| Claude Opus 5 |', '| Claude New 6 |').replace('$5 / MTok | $6.25 / MTok | $10 / MTok | $0.50 / MTok | $25 / MTok', '$3 / MTok | $3.75 / MTok | $6 / MTok | $0.30 / MTok | $15 / MTok');
  const googleNew = googleHtml.replace('gemini-3.8-flash', 'gemini-new').replace('Gemini 3.8 Flash', 'Gemini Next').replace('$0.75', '$1').replace('$3.75', '$5').replace('$0.075', '$0.10');
  const fetchSource = async url => url.includes('openrouter') ? { data: Array.from({ length: 10 }, (_, i) => model('vendor/new-' + i)) }
    : url.includes('deepseek') ? deepSeekHtml : url.includes('claude.com') ? anthropicNew : url.includes('google') ? googleNew : markdown;
  const result = await collect({ fetchSource, at, deepSeekBaseline });
  expect(result.report.failures).toEqual([]);
  expect(parseAnthropic(anthropicNew)).toEqual([{ model: 'claude-new-6', display: 'Claude New 6', rates: { uncached: 3, cacheWrite: 3.75, cacheRead: 0.3, output: 15 }, cacheWrite1h: 6 }]);
  expect(parseGoogle(googleNew)).toEqual([
    { model: 'gemini-new', display: 'Gemini Next', rates: { uncached: 1, cacheWrite: 1, cacheRead: 0.1, output: 5 } }
  ]);
  const anthropicRule = result.report.autoPublished.find(r => r.canonical === 'claude-new-6');
  const googleRule = result.report.autoPublished.find(r => r.canonical === 'gemini-new');
  expect(anthropicRule).toMatchObject({ confidence: 'estimated', note: expect.stringMatching(/^\[provisional\]/), rates: { uncached: 3, cacheWrite: 3.75, cacheRead: 0.3, output: 15 } });
  expect(googleRule).toMatchObject({ confidence: 'estimated', note: expect.stringMatching(/^\[provisional\]/), rates: { uncached: 1, cacheWrite: 1, cacheRead: 0.1, output: 5 } });
  expect(result.catalog.rules.some(r => r.canonical === 'claude-new-6' || r.canonical === 'gemini-new')).toBe(true);
  const engine = pricing.createPricing(result.catalog);
  expect(engine.priceUsage({ providerId: 'anthropic', model: 'claude-new-6', time: Date.parse(at), uncached: 1000000, output: 1000000 })).toMatchObject({ status: 'estimated' });
  expect(() => parseAnthropic('changed')).toThrow();
  expect(() => parseGoogle('<html></html>')).toThrow();
});

test('auto provisional policy skips retired and non-text models', async () => {
  const retiredAnthropic = anthropicMd.replace('| Claude Opus 5 |', '| Claude Retired 1 (retired, except legacy deployments) |');
  const nonTextGoogle = googleHtml + '<h2 id="gemini-image-1">Gemini Image 1</h2><table class="pricing-table"><tr><td>Input price</td><td>Free</td><td>$1</td></tr><tr><td>Output price</td><td>Free</td><td>$2</td></tr></table>';
  const fetchSource = async url => url.includes('openrouter') ? { data: Array.from({ length: 10 }, (_, i) => model('vendor/new-' + i)) }
    : url.includes('deepseek') ? deepSeekHtml : url.includes('claude.com') ? retiredAnthropic : url.includes('google') ? nonTextGoogle : markdown;
  const result = await collect({ fetchSource, at, deepSeekBaseline });
  expect(result.report.failures).toEqual([]);
  expect(result.report.autoPublished.map(r => r.canonical)).not.toContain('claude-retired-1');
  expect(result.report.autoPublished.map(r => r.canonical)).not.toContain('gemini-image-1');
  expect(result.report.candidates.find(c => c.model === 'claude-retired-1')).toMatchObject({ reason: 'Missing official model coverage' });
  expect(result.report.candidates.find(c => c.model === 'gemini-image-1')).toBeUndefined();
  expect(parseAnthropic(retiredAnthropic)[0]).toMatchObject({ model: 'claude-retired-1', restricted: true });
});

test('custom price times are Beijing time regardless of the host timezone', () => {
  const draft = { ...blankDraft('yi-api', 'gpt-6-astra'), uncached: '1', output: '2', from: '2026-09-17T08:00', to: '2026-10-01T00:00' };
  const rule = draftRule(draft, [], new Date(at));
  expect(rule.effectiveFrom).toBe('2026-09-17T00:00:00.000Z');
  expect(rule.effectiveTo).toBe('2026-09-30T16:00:00.000Z');
  expect(ruleDraft(rule).from).toBe('2026-09-17T08:00');
  expect(ruleDraft(rule).to).toBe('2026-10-01T00:00');
  expect(fmtBeijing('2026-09-17T00:00:00.000Z')).toBe('2026-09-17 08:00');
  // status.lastSuccessAt is a millisecond number; invalid values render empty instead of throwing.
  expect(fmtBeijing(Date.parse('2026-09-17T00:00:00.000Z'))).toBe('2026-09-17 08:00');
  expect(fmtBeijing(NaN)).toBe('');
  expect(fmtBeijing('not-a-time')).toBe('');
  expect(() => draftRule({ ...draft, from: 'not-a-time' }, [])).toThrow();
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
  const fetchSource = async url => url.includes('deepseek') ? deepSeekHtml.replace('deepseek-flash', 'deepseek-new').replace('高峰 2', '高峰 3') : url.includes('openrouter') ? { data: Array.from({ length: 10 }, (_, i) => model('vendor/new-' + i)) } : url.includes('claude.com') ? anthropicMd : url.includes('google') ? googleHtml : markdown;
  const result = await collect({ fetchSource, at, deepSeekBaseline });
  expect(result.report.failures).toEqual([]);
  const candidates = result.report.candidates.filter(c => c.source.includes('deepseek'));
  expect(candidates).toHaveLength(2);
  expect(candidates[1].model).toBe('deepseek-new');
  expect(result.catalog.rules.some(r => r.canonical === 'deepseek-new')).toBe(false);
  expect(() => deepSeekObservation('<article>captcha</article>')).toThrow();
});
