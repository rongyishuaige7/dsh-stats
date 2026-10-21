import view from '../src/pricing-view.cjs';
import pricing from '../src/pricing.cjs';
const { fmtRateValue, rulePhase, usedModelKeys, catalogGroups,
  modelPriceSummary, selectModelGroups, catalogSnapshotRows } = view;
const at = Date.parse('2026-10-17T12:00:00Z');

test('rate formatting keeps tiny prices and zero distinct from unknown, without float noise', () => {
  expect(fmtRateValue(0.39999999999999997, 'USD')).toBe('$0.4');
  expect(fmtRateValue(4.300000000000001, 'CNY')).toBe('¥4.3');
  expect(fmtRateValue(0.00000000012345678, 'USD')).toBe('$0.00000000012345678');
  expect(fmtRateValue(0, 'USD')).toBe('$0');
  expect(fmtRateValue(null, 'USD')).toBe('—');
});

test('catalog phases respect inclusive start and exclusive end', () => {
  const rule = { effectiveFrom: '2026-10-17T12:00:00Z', effectiveTo: '2026-10-18T12:00:00Z' };
  expect(rulePhase(rule, at - 1)).toBe('upcoming');
  expect(rulePhase(rule, at)).toBe('current');
  expect(rulePhase(rule, Date.parse(rule.effectiveTo) - 1)).toBe('current');
  expect(rulePhase(rule, Date.parse(rule.effectiveTo))).toBe('historical');
  expect(rulePhase({ observedFrom: '2026-10-18T00:00:00Z' }, at)).toBe('current');
});

test('used model priority keeps providers and real thinking variants separate', () => {
  const catalog = pricing.BUILTIN;
  const model = 'moonshotai/kimi-k2-thinking';
  const cost = pricing.priceUsage({ providerId: 'openrouter', model, time: at, uncached: 1, output: 1 });
  const projects = [{ sessions: [{ slotUsage: [{ providerId: 'openrouter', model, time: at, cost }] }] }];
  const groups = catalogGroups(catalog, usedModelKeys(projects, catalog), at);
  const rows = selectModelGroups(groups, { scope: 'all', page: 0, pageSize: 25 }).rows;
  expect(rows[0]).toMatchObject({ isUsed: true, provider: 'openrouter', canonical: model });
  expect(rows.filter(row => row.isUsed).every(row => row.provider === 'openrouter' && row.canonical === model)).toBe(true);
  const withoutCost = [{ sessions: [{ modelUsage: [{ providerId: 'openrouter', model, time: at, accountType: 'subscription' }] }] }];
  expect(usedModelKeys(withoutCost, catalog)).toEqual(usedModelKeys(projects, catalog));
});

const ruleOf = (id, providerId, canonical, extra = {}) => ({
  id, providerId, family: providerId, canonical, aliases: [canonical.toLowerCase()],
  currency: 'CNY', sourceUrl: null, retrievedAt: '2026-10-01', confidence: 'exact',
  reasoningIncludedInOutput: true,
  rates: { uncached: 1, cacheRead: 0.5, cacheWrite: 2, output: 4 },
  ...extra,
});
const groupsOf = rules => catalogGroups({ rules }, new Set(), at);
const rates = { uncached: 1, cacheRead: 0.5, cacheWrite: 2, output: 4 };

test('model price summary is flat only for one current plain-rates rule', () => {
  const now = ruleOf('now', 'one', 'demo');
  const periods = groupsOf([
    ruleOf('old', 'one', 'demo', { effectiveTo: '2026-10-01T00:00:00Z' }),
    now,
    ruleOf('future', 'one', 'demo', { effectiveFrom: '2027-01-01T00:00:00Z' }),
  ])[0];
  expect(modelPriceSummary(periods)).toMatchObject({ kind: 'flat', currentCount: 1, historicalCount: 1, upcomingCount: 1 });
  expect(modelPriceSummary(periods).rule).toBe(now);
  expect(modelPriceSummary(groupsOf([ruleOf('unit', 'one', 'demo', { tierMultipliers: { standard: 1 } })])[0]).kind).toBe('flat');
  expect(modelPriceSummary(groupsOf([ruleOf('multi', 'one', 'demo', { tierMultipliers: { standard: 1, priority: 2 } })])[0]).kind).toBe('tiered');
});

test('model price summary keeps complex prices tiered and never promotes one tier', () => {
  const tiered = [
    groupsOf([ruleOf('context', 'one', 'demo', { rates: null, contextThreshold: 128000, contextTiers: { short: rates, long: rates } })]),
    groupsOf([ruleOf('service', 'one', 'demo', { rates: null, serviceTiers: { standard: { short: rates, long: rates } } })]),
    groupsOf([ruleOf('time', 'deepseek', 'deepseek-chat', { rates: null, timeOfUse: { peak: rates, offPeak: rates,
      calendar: { from: '2026-01-01', to: '2026-12-31', holidays: [], sourceUrl: 'https://example.com/calendar' } } })]),
    groupsOf([ruleOf('legacy', 'deepseek', 'deepseek-chat', { rates: null, legacy: rates, peak: rates, offPeak: rates })]),
    groupsOf([ruleOf('first', 'one', 'demo'), ruleOf('second', 'one', 'demo')]),
  ];
  for (const [group] of tiered) {
    const summary = modelPriceSummary(group);
    expect(summary.kind).toBe('tiered');
    expect(summary.rule).toBeUndefined();
    expect(summary.currentCount).toBeGreaterThan(0);
  }
  const past = groupsOf([
    ruleOf('old', 'one', 'demo', { effectiveTo: '2026-10-01T00:00:00Z' }),
    ruleOf('future', 'one', 'demo', { effectiveFrom: '2027-01-01T00:00:00Z' }),
  ])[0];
  expect(modelPriceSummary(past)).toEqual({ kind: 'none', currentCount: 0, historicalCount: 1, upcomingCount: 1 });
  expect(modelPriceSummary({ rules: [] })).toEqual({ kind: 'none', currentCount: 0, historicalCount: 0, upcomingCount: 0 });
});

test('flat summary preserves unknown, zero and tiny prices without rounding', () => {
  const tiny = ruleOf('tiny', 'one', 'tiny', { currency: 'USD',
    rates: { uncached: null, cacheRead: 0, cacheWrite: 0.00000000012345678, output: 0 } });
  const summary = modelPriceSummary(groupsOf([tiny])[0]);
  expect(summary.kind).toBe('flat');
  expect(fmtRateValue(summary.rule.rates.uncached, 'USD')).toBe('—');
  expect(fmtRateValue(summary.rule.rates.cacheRead, 'USD')).toBe('$0');
  expect(fmtRateValue(summary.rule.rates.cacheWrite, 'USD')).toBe('$0.00000000012345678');
});

test('model pagination groups periods, separates counts and clamps invalid pages', () => {
  const groups = groupsOf([
    ruleOf('a-old', 'one', 'alpha', { effectiveTo: '2026-10-01T00:00:00Z' }),
    ruleOf('a-now', 'one', 'alpha'),
    ruleOf('a-future', 'one', 'alpha', { effectiveFrom: '2027-01-01T00:00:00Z' }),
    ruleOf('b-now', 'two', 'beta', { aliases: ['beta', 'beta-alias'] }),
    ruleOf('c-now', 'three', 'gamma'),
  ]);
  const first = selectModelGroups(groups, { search: '', scope: 'all', page: 0, pageSize: 2 });
  expect(first).toMatchObject({ modelCount: 3, ruleCount: 5, page: 0, pageCount: 2 });
  expect(first.rows).toHaveLength(2);
  expect(first.rows.find(group => group.canonical === 'alpha').rules).toHaveLength(3);
  expect(selectModelGroups(groups, { page: 1, pageSize: 2 })).toMatchObject({ page: 1, pageCount: 2 });
  expect(selectModelGroups(groups, { page: 99, pageSize: 2 })).toMatchObject({ page: 1, pageCount: 2 });
  expect(selectModelGroups(groups, { page: -1, pageSize: 0 })).toMatchObject({ page: 0, pageCount: 1, ruleCount: 5 });
  expect(selectModelGroups(groups, { page: 1.5, pageSize: 2.5 })).toMatchObject({ page: 0, pageCount: 1 });
  expect(selectModelGroups(groups, { search: 'missing' })).toEqual({ rows: [], modelCount: 0, ruleCount: 0, page: 0, pageCount: 1 });
  expect(selectModelGroups(groups, { search: '  beta-alias  ', scope: 'all' }).rows.map(group => group.canonical)).toEqual(['beta']);
});

test('model pagination intersects search with the used scope', () => {
  const groups = groupsOf([
    ruleOf('a-now', 'one', 'alpha'),
    ruleOf('b-now', 'two', 'beta', { aliases: ['beta', 'beta-alias'] }),
    ruleOf('c-now', 'three', 'gamma'),
  ]).map(group => group.canonical === 'beta' ? { ...group, isUsed: true } : group);
  expect(selectModelGroups(groups, { scope: 'used' }).modelCount).toBe(1);
  expect(selectModelGroups(groups, { scope: 'used', search: 'beta-alias' }).rows.map(group => group.canonical)).toEqual(['beta']);
  expect(selectModelGroups(groups, { scope: 'used', search: 'gamma' })).toMatchObject({ modelCount: 0, page: 0, pageCount: 1 });
  expect(selectModelGroups(groups, { scope: 'all', search: 'gamma' }).rows.map(group => group.canonical)).toEqual(['gamma']);
});

test('model pagination defaults to 25 groups per page', () => {
  const groups = groupsOf(Array.from({ length: 26 }, (_, index) =>
    ruleOf('model-' + index, 'provider-' + String(index).padStart(2, '0'), 'model-' + index)));
  const first = selectModelGroups(groups);
  expect(first).toMatchObject({ modelCount: 26, ruleCount: 26, page: 0, pageCount: 2 });
  expect(first.rows).toHaveLength(25);
  expect(selectModelGroups(groups, { page: 1 })).toMatchObject({ page: 1, pageCount: 2 });
  expect(selectModelGroups(groups, { page: 1 }).rows).toHaveLength(1);
});

test('shipped catalog pagination covers every group and rule exactly once', () => {
  const catalog = pricing.BUILTIN;
  const groups = catalogGroups(catalog, new Set(), at);
  const first = selectModelGroups(groups, { search: '', scope: 'all', page: 0, pageSize: 25 });
  expect(first.modelCount).toBe(groups.length);
  expect(first.ruleCount).toBe(catalog.rules.length);
  expect(first.pageCount).toBe(Math.ceil(groups.length / 25));
  const seenGroups = new Set(), seenRules = new Set();
  for (let page = 0; page < first.pageCount; page++) {
    const result = selectModelGroups(groups, { search: '', scope: 'all', page, pageSize: 25 });
    expect(result.page).toBe(page);
    expect(result.rows.length).toBeLessThanOrEqual(25);
    for (const group of result.rows) {
      expect(seenGroups.has(group.key)).toBe(false);
      seenGroups.add(group.key);
      for (const row of group.rules) {
        expect(seenRules.has(row.rule.id)).toBe(false);
        seenRules.add(row.rule.id);
      }
    }
  }
  expect(seenGroups.size).toBe(groups.length);
  expect(seenRules.size).toBe(catalog.rules.length);
});

test('catalog snapshots filter, dedupe, sort and exclude the current version', () => {
  expect(catalogSnapshotRows({ version: 5, history: [3, 1, 5, 3, '2', 0, -1, 1.5, NaN, 6, 4] }))
    .toEqual({ versions: [6, 4, 3, 1], total: 4, hasMore: false });
  expect(catalogSnapshotRows({ version: 9, history: [1, 2, 3, 4, 5] }))
    .toEqual({ versions: [5, 4, 3, 2, 1], total: 5, hasMore: false });
  expect(catalogSnapshotRows({ version: 9, history: [1, 2, 3, 4, 5, 6] }))
    .toEqual({ versions: [6, 5, 4, 3, 2], total: 6, hasMore: true });
  expect(catalogSnapshotRows({ version: 99, history: [8, 6, 4, 2, 7, 5, 3] }, 5))
    .toEqual({ versions: [8, 7, 6, 5, 4], total: 7, hasMore: true });
  expect(catalogSnapshotRows({ version: 99, history: [8, 6, 4, 2, 7, 5, 3] }, 10))
    .toEqual({ versions: [8, 7, 6, 5, 4, 3, 2], total: 7, hasMore: false });
  expect(catalogSnapshotRows({ version: 9, history: [1, 2, 3, 4, 5, 6] }, 6))
    .toEqual({ versions: [6, 5, 4, 3, 2, 1], total: 6, hasMore: false });
  expect(catalogSnapshotRows({ version: 9, history: [1, 2, 3, 4, 5, 6] }, 2))
    .toEqual({ versions: [6, 5], total: 6, hasMore: true });
  expect(catalogSnapshotRows({ version: 5, history: [] })).toEqual({ versions: [], total: 0, hasMore: false });
  expect(catalogSnapshotRows(null)).toEqual({ versions: [], total: 0, hasMore: false });
  expect(catalogSnapshotRows({ version: 9, history: [1, 2, 3, 4, 5, 6] }, 0).versions).toEqual([6, 5, 4, 3, 2]);
  expect(catalogSnapshotRows({ version: 9, history: [1, 2, 3, 4, 5, 6] }, '3').versions).toEqual([6, 5, 4, 3, 2]);
  const history = [3, 1, 3];
  catalogSnapshotRows({ version: 9, history });
  expect(history).toEqual([3, 1, 3]);
});
