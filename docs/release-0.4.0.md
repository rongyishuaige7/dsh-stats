# 0.4.0 release

Astra usage from compatible API providers previously had no matching price and
showed a dash. This release adds its official reference prices and keeps the
main UI concise: Estimated cost, a currency amount, `*` for partial pricing, or
Awaiting price. Relay estimates remain distinct from actual provider bills in
pricing metadata.

Prices can now update independently of plugin releases. Signed catalogs retain
historical rule intervals; failed or invalid downloads retain valid prices.
Price settings supports sources, missing models, provider-specific overrides,
preview before saving, edit/remove, automatic updates and version restore.
Settings revisions and FX snapshots remain auditable. The updater never uploads
session data or credentials.

The maintainer workflow checks sources every six hours. Validated simple
OpenRouter text rates can publish automatically; official webpage changes and
unusual adjustments require review. The first successful workflow published
catalog 2026091702 with 286 rules; its Ed25519 signature matches the pinned key.

Pre-publication verification on Node 22.22.0 / Chrome 152:

- 235 tests pass in the default timezone and UTC; all bundles build and pass
  syntax checks. npm pack contains the intended 16 entries.
- Published Harness 0.1.2-rc.1, 0.1.3-alpha.2, 0.1.5-rc.1, 0.1.5-rc.2 and
  0.1.6-alpha.1 pass persistence/projection/RPC contracts.
- Browser fixtures pass at 1440, 390 and 320 px, covering four tabs, pricing
  preview/save/edit, missing/partial prices, offline updates, fallback and dark
  mode. 27 screenshots, zero console/runtime/network errors.
- The packed 0.4.0 plugin installs through `dsh plugin` in an isolated full Web
  profile on npm-latest Harness 0.1.5-rc.1. Real zstd session statistics, the four
  tabs and the new price settings RPC pass. Six desktop/mobile screenshots,
  zero browser errors.
- Read-only production log checks reproduce Astra totals for September 16/17
  as CNY 13.71237379 and 3.596583103 with unchanged token counts and no unpriced
  tokens on those dates. These are official-price estimates; yi-api's actual
  rates remain unverified.

Delivery gates: release-commit CI, v0.4.0 tag publication, public npm registry
verification, backed-up production profile upgrade and 3080 Web validation.
The existing server command, environment and working directory are retained.
Original sessions and provider credentials are not modified.

Delivery completed on 2026-09-17:

- Release commit `b188ed9` and tag `v0.4.0` are pushed. Release CI
  [35202171414](https://github.com/rongyishuaige7/dsh-stats/actions/runs/35202171414)
  and npm publication
  [35202410271](https://github.com/rongyishuaige7/dsh-stats/actions/runs/35202410271)
  succeeded; the public registry serves 0.4.0.
- The production Web profile on port 3080 runs the published 0.4.0 files,
  compared byte-for-byte with the registry archive after SHA-512 verification.
  The profile backup is under `$DSH_HOME/backups/dsh-stats-0.4.0-20260917-165308/`.
  Its original pnpm 11.21.0 installation was retained; Harness's bundled pnpm 9
  correctly rejected the incompatible store and made no upgrade. The cached
  matching pnpm completed the scoped update without global configuration changes.
- Production browser checks confirm host-sourced CNY 13.71 on September 16 and
  CNY 3.60 on September 17, all four tabs, price settings, and a healthy yi-api
  account response, with zero console/runtime/network errors. The signed catalog
  refreshed successfully to 2026091702.
- Existing settings and usage records are preserved. Harness appended one normal
  `session/end-seed` lifecycle marker on restart; the original log prefix matches
  its pre-upgrade SHA-256. No original usage bytes were changed, and both days'
  token totals still match the pre-upgrade audit.
