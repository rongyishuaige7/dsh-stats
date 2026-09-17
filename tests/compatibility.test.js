import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compatibilityFor, compatibilityMatrix } from '../src/compatibility.cjs';

const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));

test('compatibility matrix records historical and current tested Harness releases', () => {
	expect(compatibilityMatrix.map(row => row.dsh)).toEqual(['0.1.0-rc.6', '0.1.1-rc.2', '0.1.2-rc.1', '0.1.3-alpha.2', '0.1.5-rc.1', '0.1.5-rc.2', '0.1.6-alpha.1']);
	expect(compatibilityFor('0.1.1-rc.2')).toMatchObject({ host: 'verified', bundle: 'verified', browser: 'verified' });
	for (const version of ['0.1.5-rc.1', '0.1.5-rc.2', '0.1.6-alpha.1']) {
		expect(compatibilityFor(version)).toMatchObject({ host: 'verified', rpc: 'verified', browser: 'fixture verified' });
	}
});

test('current peers are supported without requiring the retired client runtime', () => {
	for (const [name, range] of Object.entries(packageJson.peerDependencies)) {
		if (!name.startsWith('@deepseek-ai/dsh-') || name === '@deepseek-ai/dsh-client-runtime') continue;
		expect(range).toContain('^0.1.5-rc.1');
		expect(range).toContain('^0.1.6-alpha.1');
	}
	expect(packageJson.peerDependencies['@deepseek-ai/dsh-client-runtime']).toBe('^0.1.0-rc.6 || ^0.1.1-rc.2');
	expect(packageJson.peerDependenciesMeta['@deepseek-ai/dsh-client-runtime'].optional).toBe(true);
	expect(packageJson.dsh.client.inject).toEqual(expect.arrayContaining(['@deepseek-ai/dsh-api-session-controller', '@deepseek-ai/dsh-api-remotes']));
});
