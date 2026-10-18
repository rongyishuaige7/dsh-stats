import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compatibilityFor, compatibilityMatrix } from '../src/compatibility.cjs';

const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));

test('compatibility matrix records historical and current tested Harness releases', () => {
	expect(compatibilityMatrix.map(row => row.dsh)).toEqual([
		'0.1.0-rc.6', '0.1.1-rc.2', '0.1.3-alpha.2',
		'0.1.5-rc.1', '0.1.5-rc.2', '0.1.5-rc.3', '0.1.6-alpha.1',
		'0.1.7-rc.2', '0.2.0-rc.2', '0.2.1-rc.2',
	]);
	expect(compatibilityFor('0.1.1-rc.2')).toMatchObject({ host: 'verified', bundle: 'verified', browser: 'verified' });
	expect(compatibilityFor('0.1.2-rc.1')).toBeNull();
	for (const version of ['0.1.3-alpha.2', '0.1.5-rc.2', '0.1.6-alpha.1', '0.2.0-rc.2', '0.2.1-rc.2']) {
		expect(compatibilityFor(version)).toMatchObject({
			host: 'module boot verified',
			rpc: 'service + schema verified',
			browser: 'fixture verified',
		});
	}
	for (const version of ['0.1.5-rc.1', '0.1.5-rc.3', '0.1.7-rc.2']) {
		expect(compatibilityFor(version)).toMatchObject({
			host: 'full Web boot verified',
			bundle: 'official plugin install verified',
			rpc: 'full Web + schema verified',
			browser: 'full Web verified',
		});
	}
});

test('current peers are supported without requiring the retired client runtime', () => {
	for (const [name, range] of Object.entries(packageJson.peerDependencies)) {
		if (!name.startsWith('@deepseek-ai/dsh-') || name === '@deepseek-ai/dsh-client-runtime') continue;
		expect(range).toContain('^0.1.5-rc.1');
		expect(range).toContain('^0.1.6-alpha.1');
		expect(range).toContain('^0.2.1-rc.2');
	}
	expect(packageJson.peerDependencies['@deepseek-ai/dsh-client-runtime']).toBe('^0.1.0-rc.6 || ^0.1.1-rc.2');
	expect(packageJson.peerDependenciesMeta['@deepseek-ai/dsh-client-runtime'].optional).toBe(true);
	expect(packageJson.dsh.client.inject).toEqual(expect.arrayContaining(['@deepseek-ai/dsh-api-session-controller', '@deepseek-ai/dsh-api-remotes']));
});

test('engines.dsh defines runtime range covering all supported releases', () => {
	expect(packageJson.engines?.dsh).toBe('>=0.1.0-rc.6 <0.3.0');
});

test('peer ranges exclude the defective 0.1.2-rc.1 release', () => {
	for (const [name, range] of Object.entries(packageJson.peerDependencies)) {
		expect(range, name).not.toContain('^0.1.2-rc.1');
	}
});
