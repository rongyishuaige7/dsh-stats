// Emit the scheduled Harness watch matrix from npm dist-tags of @deepseek-ai/dsh.
// latest and next are required to pass and to be verified; alpha is informational.
import { appendFileSync, readFileSync } from 'node:fs';

const verified = JSON.parse(readFileSync(new URL('./harness-versions.json', import.meta.url), 'utf8'));
const response = await fetch('https://registry.npmjs.org/-/package/@deepseek-ai%2fdsh/dist-tags', { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error('dist-tags: registry HTTP ' + response.status);
const tags = await response.json();
const rows = new Map();
for (const tag of ['latest', 'next', 'alpha']) {
  const version = tags[tag];
  if (typeof version !== 'string') continue;
  const row = rows.get(version) || { version, tags: [], required: false, verified: verified.includes(version) };
  row.tags.push(tag);
  row.required ||= tag !== 'alpha';
  rows.set(version, row);
}
const include = [...rows.values()].map(row => ({ ...row, tags: row.tags.join(',') }));
if (!include.some(row => row.required)) throw new Error('dist-tags: neither latest nor next is published');
for (const row of include) console.log(`${row.tags}: ${row.version} ${row.verified ? 'verified' : 'unverified'}${row.required ? '' : ' (informational)'}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, 'matrix=' + JSON.stringify({ include }) + '\n');
