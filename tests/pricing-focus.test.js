import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { draftForFocus } = require('../src/pricing-panel.cjs');

test('draftForFocus returns a blank draft for the pending model', () => {
	const draft = draftForFocus({ provider: 'fixture-compatible', model: 'fixture-unpriced', nonce: 3 });
	expect(draft).toMatchObject({ provider: 'fixture-compatible', model: 'fixture-unpriced', currency: 'CNY', uncached: '', output: '', accountType: 'api' });
	expect(draftForFocus(null)).toBeNull();
	expect(draftForFocus({ provider: 'fixture-compatible' })).toBeNull();
	expect(draftForFocus({ provider: 1, model: 'm' })).toBeNull();
});
