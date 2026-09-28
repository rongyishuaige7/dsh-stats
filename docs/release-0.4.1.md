# 0.4.1 release

0.4.0 accepts only schema 1 price catalogs. The signed catalog moved to schema 2
on 2026-09-25 (DeepSeek V4.1 rates with a reviewed holiday calendar), so 0.4.0
installs kept their last schema 1 catalog. 0.4.0 also does not load on Harness
0.1.7. This release fixes both; no new features.

- Pricing: schema 1 and 2 catalogs; DeepSeek V4.1 Flash/Pro peak and off-peak
  rates; historical aliases keep their intervals; previews reprice one immutable
  usage observation. The maintainer workflow failed every scheduled run from
  2026-09-25 17:08 because the DeepSeek pricing page now redirects; it fetches
  the canonical URL again and published catalog 2026092502 (343 rules).
- Harness 0.1.2-rc.1 to 0.1.7-rc.2: SettingsForms provider enumeration,
  `uiWorkspace` session navigation, Session v4, codec `create()` on every strict
  codec, fallbacks for removed icons, and the renamed DeepSeek API-key module.
  The DeepSeek account sign-in provider has no API key and is not queried for
  balances.
- Account page on 0.1.5: absent optional services no longer fail provider
  enumeration.
- Performance: the closed panel does not aggregate session updates; balances
  are queried only on their tab; a manual refresh bypasses the host cache once.

Pre-publication verification on Node 22.22.0 / Chrome 153:

- 252 tests pass in the default timezone and UTC; all four bundles build, pass
  syntax checks and match the committed `lib/`. npm pack contains 16 entries.
- Real module contracts pass for 0.1.2-rc.1, 0.1.3-alpha.2, 0.1.5-rc.1,
  0.1.5-rc.2, 0.1.5-rc.3, 0.1.6-alpha.1 and 0.1.7-rc.2, including each
  release's own `validateTypertManifest`.
- Browser fixture: 9 checks with zero errors, including identical views in
  Asia/Shanghai and America/Los_Angeles.
- The packed 0.4.1 installs through `dsh plugin` in isolated full Web profiles
  of npm `latest` 0.1.5-rc.3 and `next` 0.1.7-rc.2. Both show exact host
  statistics (12.3K input, 678 output, CNY 0.02), all four tabs and DeepSeek as
  unconfigured, with zero console, runtime or network errors.
- The Web probe could throw EPERM on macOS while stopping an exited Chrome
  group, discarding its report; it now treats EPERM like ESRCH for that group.

Not verified in isolated profiles: real provider account requests and live
subagent navigation.

Delivery gates: release-commit CI, `v0.4.1` tag publication, public registry
verification, registry package reinstalled into both isolated profiles, and a
backed-up upgrade of the local production Web profile with browser validation.
