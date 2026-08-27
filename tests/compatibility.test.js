import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compatibilityFor, compatibilityMatrix } from '../src/compatibility.cjs';

const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));

test('compatibility matrix covers the local rc6 and official latest rc2', () => {
	 expect(compatibilityMatrix.map((row) => row.dsh)).toEqual(['0.1.0-rc.6', '0.1.1-rc.2']);
	 expect(compatibilityFor('0.1.0-rc.6')).toMatchObject({ host: 'verified', bundle: 'verified' });
	 expect(compatibilityFor('0.1.1-rc.2')).toMatchObject({ host: 'verified', bundle: 'verified', browser: 'verified' });
});

test('all DSH peers explicitly include both tested release candidates', () => {
	for (const [name, range] of Object.entries(packageJson.peerDependencies)) {
		if (!name.startsWith('@deepseek-ai/dsh-')) continue;
		expect(range).toContain('^0.1.0-rc.6');
		expect(range).toContain('^0.1.1-rc.2');
	}
});
