# Reliability and current Harness compatibility

## Scope

Fix the September 2026 audit findings: preserve request-level pricing across
live/cold reads; exclude inherited fork usage; support Harness rc1 and alpha v2
events and persistence; retain official metadata; expose incomplete/stale data;
preserve successful account snapshots across repeated failures; restrict legacy
RPC fallback to unsupported methods; reduce replay and file-read overhead.

## Non-goals

No changes to user credentials, provider routing, running Harness installations,
historical session files, unrelated dependencies, or upstream Harness source.
No npm publication or service restart as part of this maintenance task.

## Architecture

- Normalize host log observations into header, inherited-event count and events.
  Prefer live observations and official persistence/projection interfaces; keep
  explicit legacy compatibility and surface failed capabilities.
- Version the route projection state. Keep per-request context and call counts
  with route buckets, bounded replacement state, and immutable snapshots without
  copying every historical sample for each event.
- Share durable usage interpretation across replay and projection paths,
  including v2 assistant streams and billed retry attempts.
- Share RPC validation across the host and browser. Show provenance, freshness
  and pricing completeness where the aggregate is displayed.
- Retain account last-success data independently of the latest transient error.

## Risks

- Pre-release Harness interfaces differ; method presence alone is insufficient.
- Old projection buckets cannot recover request context. Invalidate their state
  version and rebuild where logs exist; mark unrecoverable data incomplete.
- Fork inheritance, retries and usage replacement must not double count.
- File caches must distinguish replacement/truncation and preserve stale data on
  read failure without hiding errors or reading outside the session root.
- Browser schema reuse must keep the published bundle self-contained.

## Verification criteria

- Identical usage, calls and prices for live and cold reads, including context
  thresholds and multiple requests in the same half-hour.
- Inherited usage excluded with legacy seedLength and current inheritedEventCount.
- v2 message/attempt streams counted; retry samples and timing remain attributable.
- Official titles and blank metadata survive every supported read path.
- Consecutive transient failures preserve last-success balances; ordinary RPC
  errors do not become successful legacy-only account responses.
- User-visible stale/fallback/partial states and pricing qualification, covered
  by component checks and browser verification with deterministic fixtures.
- Full tests in the default timezone and UTC, build, artifact syntax/pack checks,
  and contract probes against supported upstream versions.
- Benchmark replay scaling and ensure unchanged fallback logs avoid body reads.

## Staged delivery

1. Verified: statistics correctness, host compatibility and replay/read cost.
2. Verified: account reliability, visible data quality and shared RPC validation.
3. Verified: compatibility matrix, integration checks and final documentation.

Each stage is verified and committed/pushed before the next stage starts.
Tests may run in an isolated copy with the same lockfile because this checkout's
existing node_modules has a recorded picomatch startup failure. The original
dependency directory is preserved.

## Stage 1 evidence

- 169 tests pass in the default timezone and UTC; all four bundles build.
- Regression coverage includes request context/count preservation, immutable
  checkpoint round trips, v2 streams and retries through query/live/handle/disk,
  current projection signatures and metadata, legacy cost qualification, and
  stat-only cache hits followed by changed-file invalidation.
- Synthetic projection updates for 250/500/1000/2000 distinct request contexts:
  7.81/8.08/17.28/33.54 ms on this machine (the pre-fix 2000-request audit probe
  took about 4806 ms). This measures fold updates, not full UI rendering.
- The isolated validation copy uses the original lockfile. Its rebuilt tracked
  bundles are synchronized back to the working checkout before the commit.

## Stage 2 evidence

- 182 tests pass, including repeated transient balance failures, configuration
  isolation, structured unsupported-method fallback, ordinary error propagation,
  shared validation rejection cases, visible stale/partial/cost states and
  duplicate workspace membership.
- All four bundles build. Built host/remote manifests import successfully and
  expose all four RPC methods. The browser uses named Zod imports to retain
  only the APIs used by the shared schema. Minification reduces the browser
  artifact to 214129 bytes (59468 bytes gzip).
- Source information events no longer mark otherwise valid host data degraded.
  The panel exposes provenance, freshness, diagnostics and pricing completeness;
  account failures retain the last success time and an explicit stale marker.
- Browser interaction and upstream contract checks follow in stage 3.

## Stage 3 evidence

- Published rc1 and alpha2 modules pass real Cordis/plugin initialization,
  JSONL writes/reads, projection checkpoint restoration, cold snapshots and
  real Session reads. The fork fixture excludes inherited usage and preserves
  two MiniMax-M3 calls at CNY 1.2768 on both live and cold paths.
- The actual alpha2 contract probe found another omission: `persistence.list()`
  now wraps headers in snapshot records. The plugin accepts both list shapes
  and retains sessions without workspace membership. Two focused unit cases
  and both upstream contract runs cover this path.
- The isolated browser run passes all four views at 1440x1000, 390x844 and
  320x740, including provider changes, forced refresh, stale balance retention,
  structured legacy fallback, data diagnostics and estimated/partial pricing.
  It captures 25 screenshots and reports no console/runtime/network errors.
  Unsupported pricing and dark-theme stale account states are covered as well.
  Light-theme account status colors were darkened after screenshot review.
- Peer ranges now include the tested releases. Only the lockfile's root peer
  metadata changed; the resolved dependency graph is unchanged.
- The browser fixture uses real React and installed Harness icons, with fixture
  stores/RPC responses. A complete rc1/alpha2 Web host and real provider API
  calls remain outside this task. No npm publication or service restart occurred.
- All 184 tests pass in the default timezone and UTC. All four bundles build
  and pass syntax checks; the built host and manifests import successfully and
  expose all four RPC methods. `npm pack --dry-run --json` verifies 16 package
  entries. The final browser artifact is 214824 bytes (59547 bytes gzip).

## September 17 follow-up implementation

Scope: resolve exhausted-balance handling, streamed response limits, fork usage
ownership, fallback pricing accuracy and CSV safety; support Session v3 and the
current published Harness; reduce projection notification and repeated read costs.
The non-goals above still apply. Preserve historical files and immutable projection
checkpoints, and never infer exact request context from session totals.

Delivery stages (each with focused tests, build, commit and push):
1. Share bounded account response decoding and accept valid exhausted balances.
2. Unify own-session usage, qualify incomplete pricing and escape CSV formulas.
3. Adapt current Harness contracts and dependency/CI compatibility checks.
4. Optimize projection/read hot paths with real-registry benchmarks, then run
   the complete timezone, browser, upstream contract and package validations.

Risks: preview peer resolution must stay internally consistent; cached official
logs need reliable revision evidence; per-request pricing and fork inheritance
must survive any performance change. Browser fixtures verify the plugin UI, while
upstream contract probes exercise real published server modules separately.

Follow-up stage 1 verified: 77 account/host tests pass, including zero-balance
refresh, chunked/declared oversize cancellation, stalled-body timeout, split UTF-8
and legacy endpoint coverage. All four published bundles build successfully.

Follow-up stage 2 verified: all 204 tests pass. Live/query inherited-only forks
remain zero despite official inherited token totals; client overview, trends and
CSV use the same own-session route usage. Legacy empty metadata-only route maps
retain non-fork token fallback. Missing request context produces estimated pricing
and an empty CSV context field. CSV text formulas are escaped while numeric
negative values remain numeric. All four bundles build successfully.

Follow-up stage 3 verified: all 210 tests pass, including plain/zstd v2/v3 paths.
Real module smoke passes for 0.1.2-rc.1, 0.1.3-alpha.2, 0.1.5-rc.1,
0.1.5-rc.2 and 0.1.6-alpha.1. Browser smoke passes with 25 screenshots and zero
reported errors. Fresh npm ci succeeds with the unchanged resolved Harness graph;
optional remotes peers retain the older versions required by legacy client-locale.
CI now runs the five-version contract matrix and the Chrome UI fixture. Workflow
YAML parses locally; execution on GitHub is verified separately from local probes.

Dependency security stage verified: Vitest is pinned to 4.1.11 and transitive
js-yaml to 4.3.2. npm audit reports zero vulnerabilities. The Harness module graph
is unchanged. All 210 tests pass in the default timezone and UTC; all bundles
build unchanged. Fresh npm ci succeeds. npm 10's update resolver crashed during
the targeted upgrade, so npm 11.6.0 was used only for lockfile resolution; normal
npm ci remains supported and no global npm installation was changed.

GitHub CI follow-up: the compatibility commit passed every job. The security
commit exposed an intermittent Linux Chrome profile cleanup race (`ENOTEMPTY`)
after the UI checks. The browser fixture now retries only its own temporary
profile cleanup, allowing short-lived Chromium helper writes to finish. Local
browser smoke still passes all views and reports no runtime errors.

The Linux cleanup retry alone was insufficient: the Chrome launcher can exit
while helper processes keep writing. The fixture now requests CDP Browser.close,
terminates its exclusively owned process group, and records report.json before
cleanup so an assertion failure cannot be masked. The complete local browser
fixture passes with this lifecycle change; GitHub verification follows the push.

## Follow-up performance architecture and evidence

- Wire readers reuse ordered immutable rows. Updates replace/remove the changed
  bucket and insert new buckets in order; unchanged rows are not recopied or
  revalidated. Weak caches do not retain predecessor states or raw event bodies.
  No request contexts are coalesced, and no notifications are dropped.
- Normalized official reads are cached only across matching backend revision and
  header observations before/after a successful read. Cache ownership follows
  StatsService, and service/identity changes, stat failures and live promotion
  invalidate reuse. Query-only hosts without visible live-session state and hosts
  without revision support always read fresh. Cache limits: 128 entries and
  100000 weighted usage/timing records; raw conversation bodies are never retained.
- All 213 tests pass in the default timezone and UTC. Tests exercise same-seq
  replacement, a revision changing during a read, stat failure, live promotion,
  caller mutation, retry/replacement buckets and immutable checkpoint equivalence.
- All five real upstream contract probes pass. On revision-capable releases the
  two-session fixture opens 2 logs on the first aggregate and 0 on the unchanged
  second aggregate, with identical project results.

Real `0.1.5-rc.1` registry benchmark, cumulative time for all submitted requests:

| Requests | No subscriber (ms) | With subscriber (ms) |
| --- | ---: | ---: |
| 500 | 9.8 | 26.5 |
| 1000 | 14.6 | 75.0 |
| 2000 | 29.9 | 270.9 |
| 4000 | 62.7 | 1127.3 |

The September 17 audit measured 13476 ms for 4000 subscribed updates; an additional
pre-change run during implementation measured 22338 ms under different machine
load. Treat these as local measurements, not portable latency guarantees. The
probe validates every notification's row count, retained first view, token totals,
request counts and JSON checkpoint restoration. It does not measure network
serialization or browser rendering. Whole-value wire delivery still emits
O(n²) rows across n updates; this change reduces local reconstruction overhead.

Reproduce after building:

```bash
DSH_HARNESS_ROOT=/path/to/isolated/harness node scripts/harness-projection-benchmark.mjs
```

Client fallback follow-up verified: all 216 tests pass. Unknown-model route usage
is retained in overview, model aggregation and CSV and remains explicitly unpriced,
even when the session's current model is known. Missing or malformed own-session
projections mark the session partial and do not import a fork parent's token totals.
Valid empty own projections remain exact zero, and parent metadata survives the
client fallback path. All bundles build; the browser fixture passes 25 screenshots
with no reported runtime, console or network errors.
