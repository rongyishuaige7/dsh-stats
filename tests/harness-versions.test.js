import { readFileSync } from 'node:fs';

// scripts/harness-versions.json is the single list of verified Harness releases:
// CI builds its contract matrix from it and the contract smoke accepts only it.
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const verified = JSON.parse(readFileSync(new URL('../scripts/harness-versions.json', import.meta.url), 'utf8'));
// Published only for early releases; kept as an optional legacy peer.
const RETIRED = new Set(['@deepseek-ai/dsh-client-runtime']);

function parse(version) {
	const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(version);
	if (!m) throw new Error('invalid version ' + version);
	return { tuple: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split('.') : [] };
}
function compare(a, b) {
	const x = parse(a), y = parse(b);
	for (let i = 0; i < 3; i++) if (x.tuple[i] !== y.tuple[i]) return x.tuple[i] - y.tuple[i];
	if (!x.pre.length || !y.pre.length) return (y.pre.length ? 1 : 0) - (x.pre.length ? 1 : 0);
	for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
		const p = x.pre[i], q = y.pre[i];
		if (p === undefined) return -1;
		if (q === undefined) return 1;
		const np = /^\d+$/.test(p), nq = /^\d+$/.test(q);
		if (np && nq && Number(p) !== Number(q)) return Number(p) - Number(q);
		if (np !== nq) return np ? -1 : 1;
		if (p !== q) return p < q ? -1 : 1;
	}
	return 0;
}
// npm caret semantics for 0.x bases; prereleases match only within the base tuple.
function caret(version, base) {
	const v = parse(version), b = parse(base);
	if (compare(version, base) < 0) return false;
	const upper = b.tuple[0] > 0 ? [b.tuple[0] + 1, 0, 0] : b.tuple[1] > 0 ? [0, b.tuple[1] + 1, 0] : [0, 0, b.tuple[2] + 1];
	if (compare(version, upper.join('.') + '-0') >= 0) return false;
	return !v.pre.length || v.tuple.join('.') === b.tuple.join('.');
}
function bases(range) {
	return range.split('||').map(part => {
		const m = /^\s*\^(\S+)\s*$/.exec(part);
		if (!m) throw new Error('unsupported peer comparator: ' + part);
		return m[1];
	});
}
const satisfies = (version, range) => bases(range).some(base => caret(version, base));
const harnessPeers = Object.entries(pkg.peerDependencies).filter(([name]) => name.startsWith('@deepseek-ai/dsh-') && !RETIRED.has(name));

test('verified Harness list is unique, ordered and exact', () => {
	expect(verified.length).toBeGreaterThan(0);
	expect(new Set(verified).size).toBe(verified.length);
	expect([...verified].sort(compare)).toEqual(verified);
});

test('Harness peer ranges cover every verified release after the peer was introduced', () => {
	for (const [name, range] of harnessPeers) {
		const introduced = bases(range).sort(compare)[0];
		for (const version of verified) {
			if (compare(version, introduced) < 0) continue;
			expect(satisfies(version, range), name + ' ' + range + ' misses ' + version).toBe(true);
		}
	}
});

test('Harness peer ranges exclude prereleases of the next unverified patch', () => {
	const latest = parse(verified.at(-1)).tuple;
	const next = [latest[0], latest[1], latest[2] + 1].join('.') + '-rc.1';
	for (const [name, range] of harnessPeers) expect(satisfies(next, range), name + ' accepts ' + next).toBe(false);
});

test('CI builds its Harness contract matrix from the verified list', () => {
	const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
	expect(ci).toContain('scripts/harness-versions.json');
	expect(ci).not.toMatch(/version: \[['"]0\.1\./);
});
