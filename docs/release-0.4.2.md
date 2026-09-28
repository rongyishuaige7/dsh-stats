# 0.4.2 release

Patch release after 0.4.1; no new features.

- Price settings: custom rule start/end times are entered, back-filled and shown
  in Beijing time (UTC+8) like the rest of the panel, and labelled as such. The
  last sync time is shown the same way. Stored rules remain absolute timestamps.
- Package: README screenshots load from GitHub instead of being packed; npm
  ships 10 entries (about 170 KB) instead of 16 (1.4 MB).
- Internal: `client.cjs` and `index.js` are split into format/data/remote and
  util/balance/sessions/usage modules, moved verbatim; the bundled price catalog
  is 2026092503 (schema 2, 344 rules).
- Maintenance: verified Harness releases live in `scripts/harness-versions.json`
  (CI matrix, contract allowlist, peer-range test); a daily Harness watch runs
  contracts against npm latest/next/alpha; workflows use Node 24 actions on
  ubuntu-24.04; the browser fixture waits for the new document after navigation.

Pre-publication verification on Node 22.22.0 / Chrome 153:

- 257 tests pass in Asia/Shanghai, UTC and America/Los_Angeles; all four bundles
  build, pass syntax checks and match the committed `lib/`. npm pack contains 10
  entries.
- CI runs real module contracts for all seven listed Harness releases with each
  release's own `validateTypertManifest`, and the browser fixture (9 checks).
- The packed plugin installs through `dsh plugin` in isolated full Web profiles
  of Harness 0.1.7-rc.2 (npm latest and next) and 0.1.5-rc.3. Both show exact
  host statistics (12.3K input, 678 output, CNY 0.02), open price settings, show
  DeepSeek as unconfigured and report zero console, runtime or network errors.
- The first full Web run of this release found a regression from the Beijing-time
  change: once the catalog had synced, the millisecond `lastSuccessAt` was parsed
  as an ISO string and the statistics overlay crashed on opening price settings.
  The browser fixture had only covered an unsynced store. Fixed in `5448d89`; the
  fixture now starts from a synced store and failed before the fix.

Not verified in isolated profiles: real provider account requests and live
subagent navigation.

Delivery gates: release-commit CI, `v0.4.2` tag publication (first run of the
Node 24 publish workflow), public registry verification, registry package
reinstalled into both isolated profiles, and a backed-up upgrade of the local
production Web profile with browser validation.

Delivery completed on 2026-09-28:

- Release commit `b83bbda` and tag `v0.4.2` are pushed. Release CI
  [36412090389](https://github.com/rongyishuaige7/dsh-stats/actions/runs/36412090389)
  and npm publication
  [36412207034](https://github.com/rongyishuaige7/dsh-stats/actions/runs/36412207034)
  succeeded; the Node 24 publish workflow works. The registry serves
  `latest=0.4.2` (shasum `69b8fb39…`). Its contents match the local pack; the
  archives differ only in the mode of `LICENSE` and `cordis.patch.yml` (0600 in
  the local checkout, 0644 in CI).
- The registry package, reinstalled into the isolated 0.1.7-rc.2 and 0.1.5-rc.3
  profiles, passes the same full Web checks.
- The local production Web profile (launcher Harness 0.1.5-rc.2) was stopped
  before the upgrade. Backup: `$DSH_HOME/backups/dsh-stats-0.4.2-20260928-185837/`.
  The upgrade used the profile's pnpm 11.21.0; installed files match the registry.
- On a temporary start at 127.0.0.1:3080 the catalog refreshed from 2026092502 to
  2026092503 with a numeric `lastSuccessAt` (the state that crashed before
  `5448d89`). Host statistics, all tabs, price settings and six account providers
  render with zero console, runtime or network errors; data status stays
  "incomplete" for the same 59 historical records as 0.4.1.
- The server was stopped again. All 124 session logs match the pre-upgrade
  fingerprints.
