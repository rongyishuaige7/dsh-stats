import view from '../src/pricing-view.cjs';
import pricing from '../src/pricing.cjs';
const { fmtRateValue, rulePhase, usedModelKeys, catalogGroups, selectCatalog } = view;
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

test('catalog counts provider/model pairs separately from rule periods and filters history', () => {
  const rule = (id, providerId, canonical, extra = {}) => ({ id, providerId, canonical, aliases: [canonical], ...extra });
  const catalog = { rules: [
    rule('old', 'one', 'demo', { aliases: ['old-alias'], effectiveTo: '2026-10-01T00:00:00Z' }),
    rule('now', 'one', 'demo'), rule('future', 'one', 'demo', { effectiveFrom: '2027-01-01T00:00:00Z' }),
    rule('other', 'two', 'demo'),
  ] };
  const groups = catalogGroups(catalog, new Set(), at);
  expect(selectCatalog(groups, '', false)).toMatchObject({ modelCount: 2, rows: [{ rule: { id: 'now' } }, { rule: { id: 'other' } }] });
  const all = selectCatalog(groups, '', true);
  expect(all.modelCount).toBe(2);
  expect(all.rows).toHaveLength(4);
  expect(all.rows[0].rule.id).toBe('now');
  expect(selectCatalog(groups, 'old-alias', false).rows.map(row => row.rule.id)).toEqual(['now']);
  expect(selectCatalog(groups, 'old-alias', true).rows.map(row => row.phase)).toEqual(['current', 'upcoming', 'historical']);
  expect(selectCatalog(groups, 'missing', true)).toEqual({ rows: [], modelCount: 0 });
});

test('used model priority keeps providers and real thinking variants separate', () => {
  const catalog = pricing.BUILTIN;
  const model = 'moonshotai/kimi-k2-thinking';
  const cost = pricing.priceUsage({ providerId: 'openrouter', model, time: at, uncached: 1, output: 1 });
  const projects = [{ sessions: [{ slotUsage: [{ providerId: 'openrouter', model, time: at, cost }] }] }];
  const rows = selectCatalog(catalogGroups(catalog, usedModelKeys(projects, catalog), at), '', false).rows;
  expect(rows[0]).toMatchObject({ isUsed: true, rule: { family: 'openrouter', canonical: model } });
  expect(rows.filter(row => row.isUsed).every(row => (row.rule.providerId || row.rule.family) === 'openrouter' && row.rule.canonical === model)).toBe(true);
  const withoutCost = [{ sessions: [{ modelUsage: [{ providerId: 'openrouter', model, time: at, accountType: 'subscription' }] }] }];
  expect(usedModelKeys(withoutCost, catalog)).toEqual(usedModelKeys(projects, catalog));
});
