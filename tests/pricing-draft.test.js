import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  blankDraft, draftRule, draftEqual, rulesEqual, ruleHasConditions, draftHasConditions,
  workingForSaved, customRuleRows, buildPreviewRequest, buildSaveRequest,
} = require('../src/pricing-panel.cjs');

const rule = (id, extra = {}) => ({
  id, providerId: 'one', family: 'one', canonical: 'demo', aliases: ['demo'],
  currency: 'CNY', sourceUrl: null, retrievedAt: '2026-10-17', confidence: 'estimated',
  reasoningIncludedInOutput: true,
  rates: { uncached: 1, cacheRead: 0.5, cacheWrite: 2, output: 4 }, ...extra,
});

test('a prefilled baseline is clean until a field changes', () => {
  const baseline = blankDraft('one', 'demo');
  expect(draftEqual({ ...baseline }, baseline)).toBe(true);
  expect(draftEqual({ ...baseline, output: '5' }, baseline)).toBe(false);
  expect(draftEqual({ ...baseline, accountType: 'relay' }, baseline)).toBe(false);
});

test('settings compare by rule identity and full value', () => {
  const first = rule('a');
  const second = rule('b');
  expect(rulesEqual([first, second], [first, second])).toBe(true);
  expect(rulesEqual([first], [first, second])).toBe(false);
  expect(rulesEqual([{ ...first, rates: { ...first.rates, output: 9 } }], [first])).toBe(false);
  expect(rulesEqual([{ ...first, id: 'new' }], [first])).toBe(false);
});

test('condition detection covers dates, context, multipliers and account types', () => {
  expect(ruleHasConditions(rule('plain'))).toBe(false);
  expect(ruleHasConditions(rule('dates', { effectiveFrom: '2026-10-17T00:00:00Z' }))).toBe(true);
  expect(ruleHasConditions(rule('context', { rates: null, contextThreshold: 128000, contextTiers: { short: {}, long: {} } }))).toBe(true);
  expect(ruleHasConditions(rule('tiers', { tierMultipliers: { standard: 1, priority: 2 } }))).toBe(true);
  expect(ruleHasConditions(rule('account', { accountType: 'relay' }))).toBe(true);
  expect(ruleHasConditions(rule('unit', { tierMultipliers: { standard: 1 } }))).toBe(false);
  expect(draftHasConditions(blankDraft())).toBe(false);
  expect(draftHasConditions({ ...blankDraft(), threshold: '128000' })).toBe(true);
  expect(draftHasConditions({ ...blankDraft(), longOutput: '4' })).toBe(true);
  expect(draftHasConditions({ ...blankDraft(), priority: '2' })).toBe(true);
  expect(draftHasConditions({ ...blankDraft(), accountType: 'local' })).toBe(true);
});

test('removal markers come only from explicit saved-rule removals', () => {
  const saved = rule('saved');
  const newRule = rule('new');
  const edited = rule('edited', { id: 'edited-new' });
  expect(customRuleRows([newRule], [saved], new Map(), new Map())).toEqual([{ rule: newRule, isSaved: false, pendingRemove: false, savedId: null }]);
  expect(customRuleRows([saved], [saved], new Map(), new Map())).toEqual([{ rule: saved, isSaved: true, pendingRemove: false, savedId: 'saved' }]);
  expect(customRuleRows([], [saved], new Map(), new Map([['saved', saved]]))).toEqual([{ rule: saved, isSaved: true, pendingRemove: true, savedId: 'saved' }]);
  expect(customRuleRows([edited], [saved], new Map(), new Map())).toEqual([{ rule: edited, isSaved: false, pendingRemove: false, savedId: null }]);
});

test('an edited saved rule keeps one working association through repeated edits', () => {
  const saved = rule('saved');
  const first = rule('first', { id: 'first', rates: { uncached: 2, cacheRead: null, cacheWrite: null, output: 3 } });
  const second = rule('second', { id: 'second', rates: { uncached: 2, cacheRead: null, cacheWrite: null, output: 4 } });
  const origins = new Map([['first', 'saved']]);
  expect(workingForSaved([first], origins, 'saved')).toBe(first);
  expect(customRuleRows([first], [saved], origins, new Map())).toEqual([{ rule: first, isSaved: false, pendingRemove: false, savedId: 'saved' }]);
  const nextOrigins = new Map([['second', 'saved']]);
  expect(workingForSaved([second], nextOrigins, 'saved')).toBe(second);
  expect(customRuleRows([second], [saved], nextOrigins, new Map())).toEqual([{ rule: second, isSaved: false, pendingRemove: false, savedId: 'saved' }]);
});

test('pending removal keeps the edited working rule for undo', () => {
  const saved = rule('saved');
  const edited = rule('edited', { id: 'edited', rates: { uncached: 2, cacheRead: null, cacheWrite: null, output: 3 } });
  const pending = customRuleRows([], [saved], new Map(), new Map([['saved', edited]]));
  expect(pending).toEqual([{ rule: edited, isSaved: true, pendingRemove: true, savedId: 'saved' }]);
  expect(pending[0].rule.rates.output).toBe(3);
});

test('preview and save requests carry only the documented fields', () => {
  const overrides = [rule('a')];
  expect(buildPreviewRequest(overrides)).toEqual({ action: 'preview', overridesJson: JSON.stringify(overrides) });
  expect(buildSaveRequest({ overrides, autoUpdate: false, fingerprint: 'fp-1', revision: 7 })).toEqual({
    action: 'save', overridesJson: JSON.stringify(overrides), autoUpdate: false, fingerprint: 'fp-1', revision: 7,
  });
});

test('a generated rule uses the current draft values and validates', () => {
  const draft = { ...blankDraft('one', 'demo'), uncached: '1', output: '2' };
  const generated = draftRule(draft, [], new Date('2026-10-17T00:00:00Z'));
  expect(generated).toMatchObject({ providerId: 'one', canonical: 'demo', currency: 'CNY', accountType: 'api' });
  expect(generated.rates).toEqual({ uncached: 1, cacheRead: null, cacheWrite: null, output: 2 });
  expect(generated.tierMultipliers).toEqual({ standard: 1 });
});
