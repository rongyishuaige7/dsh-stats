# September 25 compatibility and correctness fixes

## Scope and delivery

1. Verify DeepSeek V4.1 Flash prices, preserve historical rules, fix preview
   snapshot consistency and monitor the official DeepSeek pricing source.
2. Adapt SettingsForms, session navigation and Session V4 to the official
   0.1.5-rc.3 (latest) and 0.1.7-rc.2 (next) packages; bound peer declarations
   and exercise real published contracts.
3. Avoid hidden-panel aggregation and unnecessary balance requests; verify
   browser behavior, timezone consistency and packaged artifacts.

Each stage requires focused tests, build, commit and push before the next one.
No production upgrades, service restarts, credential changes, source-session
edits, unrelated dependency updates or npm publication are included.

## Architecture and risks

Pricing previews read usage once, then reprice that immutable observation.
Request context, incomplete usage and subscription semantics must survive.
New time-of-use rules use a validated calendar and explicit observation date;
unknown calendar coverage is estimated. Schema 2 readers retain schema 1
support; old plugins reject schema 2 and keep their last verified catalog.
The reviewed catalog must be signed by the existing Actions workflow and
verified against the pinned public key before the pricing stage is complete.

Compatibility adapters select explicit supported host capabilities. V4 tests
must cover native records, migration and inherited fork boundaries; unknown
future formats remain degraded. UI performance changes preserve hook order,
navigation, fallback data and account error visibility.

## Verification

Focused regressions plus full tests in local timezone and UTC, bundle build
and syntax checks, real Harness contract probes for supported releases,
Chrome fixtures and package preview. Only task-owned browser/server processes
may be started and cleaned up. Record completed evidence below.

## Pricing sources (verified September 25)

- DeepSeek pricing: https://api-docs.deepseek.com/zh-cn/quick_start/pricing
  Flash peak input/cache-read/output: CNY 2/0.04/8 per million tokens;
  off-peak: 1/0.02/4. Cache-write is not separately specified and stays null.
  Pro peak: 9/0.30/27; off-peak: 4.5/0.15/13.5.
- Release history: https://api-docs.deepseek.com/zh-cn/updates establishes the
  September 10 V4.1 release and the old Flash aliases' routing change, but no
  exact switching timestamp. Existing aliases retain their previous price
  intervals through our observation (2026-09-25T09:45:27Z). The new model ID
  can be back-estimated with observedFrom; no invented midnight cutover.
- 2026 holiday notice: https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm
  Calendar holidays include the published holiday periods. DeepSeek explicitly
  excludes weekends; make-up weekend workdays therefore remain off-peak.
  Beyond reviewed calendar coverage, possible weekday peaks are estimated.
- The collector compares the normalized official article against a reviewed
  SHA-256 observation and detects model coverage gaps. It only proposes review;
  it never publishes a website-derived DeepSeek change automatically.

Stage 1 verification: 241 tests pass in local timezone and UTC. All four
bundles build and pass syntax checks. Regression cases include changing live
usage during previews, projection-only estimates, holidays, make-up weekends,
peak boundaries, unknown calendars, historical aliases and source monitoring.
Signing the reviewed schema 2 catalog follows this implementation push.
