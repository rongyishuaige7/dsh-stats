# DSH compatibility matrix

| DSH | Node | Host boot | Bundle registration | Stats RPC | Projection source | Browser runtime |
| --- | --- | --- | --- | --- | --- | --- |
| `0.1.0-rc.6` | `>=22` | verified | verified | verified | official-first, fallback | pending |
| `0.1.1-rc.2` | `^22.19.0 || >=24.0.0` | verified | verified | verified | official-first, fallback | verified |
| `0.1.2-rc.1` | tested on `22.22.0` | module boot verified | not rerun | service + schema verified | real cache/restore/JSONL/live Session | fixture verified |
| `0.1.3-alpha.2` | tested on `22.22.0` | module boot verified | not rerun | service + schema verified | real cache/restore/v2 handles/live Session | fixture verified |
| `0.1.5-rc.1` | tested on `22.22.0` | full Web boot verified | official plugin install verified | full Web + schema verified | real cache/restore/v3 handles/live Session | full Web verified |
| `0.1.5-rc.2` | tested on `22.22.0` | module boot verified | not rerun | service + schema verified | real cache/restore/v3 handles/live Session | fixture verified |
| `0.1.6-alpha.1` | tested on `22.22.0` | module boot verified | not rerun | service + schema verified | real cache/restore/v3 handles/live Session | fixture verified |

The rc2 row was verified with a fresh `@deepseek-ai/dsh@0.1.1-rc.2` process on 2026-08-27. `npm run smoke:rc2` launched a temporary Chrome 151 runtime, loaded the Web profile, confirmed the plugin entry and `.dss-panel`, rendered populated project/session data, selected `yi-api` and verified its USD balance card, and observed zero console errors, runtime exceptions, or failed network requests. A separate isolated run also covered the explicit empty-workspace state. The rc6 browser cell remains pending because no separate rc6 browser run was requested.

## September 2026 verification

On 2026-09-08 npm reported `latest`/`next` as `0.1.2-rc.1` and `alpha` as
`0.1.3-alpha.2`. The new rows use the published packages in independent temporary
installations, not reconstructed service mocks. The script boots Cordis, storage,
projection/cache, token-meter, session-stats, JSONL persistence and StatsService.
Workspace membership is a deterministic fixture. It checks:

- Official writes and reads through rc1 `inspect` and alpha2 `open/read/close`.
- Projection initialization, cold snapshots, JSON checkpoint restore and real
  `Session.snapshotEvents()` reads with the inherited fork prefix excluded.
- Two MiniMax-M3 requests at 300000 input tokens each remain two calls and
  CNY 1.2768 in both live and cold aggregation.
- Sessions without workspace membership survive both header and snapshot list
  formats, and aggregate output passes the shared RPC wire schema.

The browser fixture loads the published-format `lib/client.js` through its module
loader wrapper, with real React and the installed Harness icons. It checks the
overview, timeline, trends and balance views at 1440x1000, 390x844 and 320x740,
including Chinese/English text, provider selection, forced refresh, stale data,
partial pricing, diagnostics and explicit legacy fallback. It writes screenshots
and `report.json` to a temporary result directory (or `DSH_SMOKE_OUTPUT`).

This is module integration plus an isolated browser fixture. A complete rc1/alpha2
Web profile installation and real account API requests were not run. No running
Harness installation was restarted or modified.

## Reproduce

```bash
npm ci
npm run build
npm test
TZ=UTC npm test
npm run smoke:browser
```

`smoke:browser` needs Chrome; set `CHROME_BIN` outside the default macOS location.
It starts and stops its own loopback server and temporary browser profile.

For each version, pin the entire upstream module closure in a fresh directory:

```bash
smoke_root=$(mktemp -d)
node scripts/install-harness-fixture.mjs 0.1.5-rc.1 "$smoke_root"
DSH_HARNESS_ROOT="$smoke_root" npm run smoke:harness
```

Repeat with `0.1.2-rc.1`, `0.1.3-alpha.2`, `0.1.5-rc.2` and `0.1.6-alpha.1`.
CI runs this exact matrix plus the Chrome browser fixture. Exact module versions
prevent npm from mixing prerelease peers across RCs. These temporary installations
do not change a DSH profile or the plugin's resolved Harness dependency versions.

## September 17 update

npm reports `latest=0.1.5-rc.1`, `next=0.1.5-rc.2`, `alpha=0.1.6-alpha.1`.
All three use Session format v3. The plugin accepts v3 headers and plain/zstd v3
files while retaining the older formats and rejecting unknown future formats.
Current session and remote services are declared in the client arrival list.
The retired `dsh-client-runtime` remains an optional legacy peer at its actual
published versions; current service packages are optional peers for old hosts.

The module probes check real persistence and projections; browser fixtures check
the plugin UI. For the 0.3.1 release, a fresh complete `0.1.5-rc.1` Web profile
also passed: 231 upstream modules pinned to that release, official `dsh plugin`
tarball installation, bundle registration, authenticated browser entry, exact
host statistics, all four tabs, and desktop/mobile screenshots. A synthetic v3
zstd session displays one project, one session, 12.3K input and 678 output tokens.
Chrome reports no console errors, runtime exceptions or failed requests. The
account page correctly reports missing credentials; no real provider API is used.
Current pnpm requires `add -w` because the profile is a workspace root.

Full Web runs for `0.1.5-rc.2` and `0.1.6-alpha.1` remain unverified; their module
contract and independent UI fixture coverage is unchanged. See
[0.3.1 release verification](release-0.3.1.md).
