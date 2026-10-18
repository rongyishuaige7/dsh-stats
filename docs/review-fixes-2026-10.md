# October review fixes

## Scope

Repair the regressions found in the last ten commits: model suffix collisions,
rules added outside signed snapshots, intermediate-width header clipping and
narrow price-card overlap. Reduce catalog rendering and lookup work, separate
current prices from historical observations, fix clock-dependent tests, and
guard signed catalog/version consistency in CI.

No provider rates, account credentials, RPC schemas, dependencies or release
versions change. Existing custom-rule precedence, historical intervals,
subscription semantics and explicit estimated costs remain supported.

## Architecture and risks

- Build provider/family/alias indexes once per immutable pricing engine. Within
  each precedence layer, try the literal model first, then progressively remove
  effort suffixes. Keep dated Anthropic matching and account/date qualification.
- Resolve identity and prices together so one quote does not repeat lookup.
  Every effective built-in rule must belong to the selected signed catalog;
  rolling back must restore that exact set of rules.
- Cache catalog and usage-derived presentation data. Mount catalog rows only
  when requested, page the current rules, and load rule bodies on expansion.
  Historical rules remain reachable with their intervals and distinct labels.
- Allow the header and price cards to reflow before controls overlap. Format
  prices with significant digits so small nonzero prices remain visible.
- Verify catalog/signature equality and reject changed catalog content without
  a higher version, both for normal CI and automated price publishing.

The main risks are alias precedence across providers, historical boundary
selection, hiding prices behind pagination and layout at breakpoint edges.
Tests must cover these behaviors rather than assert implementation details.

## Delivery and verification

1. Pricing correctness and lookup indexes: regression tests for real thinking
   variants, custom variants, dated ids, active aliases, fixed request times,
   and rollback/restart without injected rules. Build and push this slice.
2. Catalog/layout: pure selection/formatting tests and the existing real Chrome
   fixture extended to 320/390/641/700/768/1440px, internal overlap, lazy content,
   pagination/history and custom-price editing. Build and push this slice.
3. Catalog delivery gates: signed-data and version-transition failure fixtures,
   workflow integration, full tests in local/UTC timezones, browser smoke,
   syntax/package checks and relevant Harness contracts. Push final results.

Local measurements before changes: the collapsed price catalog mounted 804
cards and 23,114 descendants; clearing a search took about 76–85ms. A 10,000-row
OpenRouter pricing microbenchmark took about 1.3s. These are local observations,
not portable timing gates; regression checks should bound rendered work.

## Slice 1 results

268 tests pass, including real OpenRouter thinking aliases, explicit custom
variants, all active literal aliases, effort suffixes, account/date boundaries,
Gemini expiry and signed rollback/restart without injected rules. All four
bundles build. The same 10,000-row OpenRouter probe now takes about 13ms locally
(unknown-provider fallback about 17ms); no rates or signed data were changed.

## Slice 2 results

272 tests pass and all four bundles build. The collapsed catalog now mounts
zero rule cards; an open page mounts at most 25 cards and only expanded cards
mount detailed prices. Counts distinguish provider/model pairs from rules;
historical and upcoming prices require an explicit filter and carry labels.
Used-model priority respects providers and real thinking variants.

The real Chrome fixture passes with 30 screenshots and no browser errors:
all 804 rules checked internally at 320px, expanded cards at seven widths,
header controls at 641/700/768/1024/1100/1101px, pagination, search resets,
history filters and custom price preview/save/edit/offline refresh. Both browser
timezones retain identical usage views. Test-owned server and browser exited;
no local service was replaced or retained.

## Slice 3 results

Added a shared delivery validator and tests for pinned signatures, divergent
payloads, malformed data, unchanged/reordered JSON, changed rules/metadata/FX,
version regressions and missing Git baselines. Signing checks the previous
signed snapshot before writing. Normal CI compares against the PR base/push
before revision; price automation compares against its checkout. Publishing
and prepublishOnly also verify the signed payload. Bot price commits explicitly
dispatch full CI because GITHUB_TOKEN pushes do not trigger push workflows.
Reviewed prices can be signed on their review branch before merging.

277 tests pass in default and UTC timezones. All four bundles, artifact syntax,
npm package dry-run and prepublishOnly pass. The final Chrome fixture again
passes (30 screenshots, zero browser errors); its server/browser exited. The
validator rejects historical commit addab1a's unsigned catalog change and
accepts its signed successor 849481b and the current snapshot. All three changed
workflow files parse successfully. Slice 2's remote CI passed all eight Harness
versions; the final push repeats the complete remote gate. Local node_modules
contain an older unlisted Harness release, so contracts use CI's isolated,
coherent installations rather than relabeling that local fixture as supported.

No provider rates, signed catalog data, package dependencies or version changed;
this repair does not publish an npm release or replace a running installation.

## Follow-up review: scope and staged delivery

Address the review of `75f6a84..0dde02e` without changing provider prices,
dependencies, release versions or running installations. Keep the RPC field
shape and existing persistence formats compatible.

1. Preserve literal model variants through route-prefix normalization. Share
   candidate ordering between indexed quotes and single-rule matching.
2. Isolate concurrent aggregations by home and pricing fingerprint. Capture
   price engine and exported metadata together so a save/rollback cannot label
   an old result with a new fingerprint.
3. Define separate UTF-8 budgets for catalog/overrides, signed envelopes and
   cache wrappers. Verify download, persistence, restart and RPC boundaries.
4. Keep projects, session details, timeline and legend pages bounded. Preserve
   access to every item, reset explicit recent-day navigation, and verify large
   datasets and page transitions in the browser.
5. Subscribe to browser sessions/workspaces only while fallback data is needed,
   including transitions from initial loading and remote failure.
6. Bound compressed input, cumulative decoded bytes and record counts in the
   legacy reader; process large logs in batches that yield to the host. Budget
   failures must be visible as degraded statistics, never a successful zero.

Each slice is built, verified and pushed independently. The final gate includes
default/UTC tests, pricing verification, artifact/package checks, the Chrome
fixture and the existing seven-version Harness CI matrix. Main risks are model
precedence, concurrent settings updates, multibyte/escaped JSON growth, hidden
items after pagination and partial log attribution. Regression tests exercise
these observable behaviors with synthetic data and isolated temporary homes.

## Follow-up review results

All four correctness fixes and three performance improvements are implemented
in six independently verified delivery slices:

- `4488f48`: literal model variants survive route-prefix normalization; indexed
  quotes and single-rule matching use the same candidate precedence.
- `bfe973c`: aggregate flights capture the home, price engine and fingerprint
  together; save/rollback races cannot return an old price under new metadata.
- `1e207d6`: separate UTF-8 budgets cover catalog payloads, overrides, signed
  envelopes and disk wrappers, including escaped and multibyte content.
- `5b57e5e`: projects/legend mount at most 50 rows, session details 100 and
  timeline pages 30 days. Every row remains reachable, summaries/export keep
  the full data, and sorting/recent navigation resets the relevant page.
- `ad64858`: closed panels and panels with host data no longer render for
  unrelated browser session/workspace snapshots. Loading/error fallback stays
  reactive, including the transition to the first host snapshot.
- Legacy decoding now uses bounded asynchronous file reads and Zstd decoding.
  Parsing, frame scanning, packed expansion and event replay yield in batches;
  the official in-memory synchronous API uses the same derivation logic.

Legacy budgets apply per session: 64 MiB file input, 64 MiB per decoded frame,
128 MiB cumulative decoded content, 8 MiB per committed JSONL record, 250,000
records/frames, 500,000 expanded events and 1,000,000 interval-slot operations.
Actual bytes read are bounded even when a file grows after stat. Stable reads
also verify the open descriptor against the current path, retry replacements,
and mark continually appended snapshots partial after three attempts. Cached
normalized statistics have a 300-entry LRU cap and a 32 MiB estimated
retained-byte cap covering timestamps, usage samples and slot rows. The byte
budget is deliberately larger than a typical working set so a stable scan does
not evict the oldest session before it is revisited. Over-budget entries are
not cached, stale entries for a file that grew over budget are dropped, and
asynchronous cache hits cannot resurrect an evicted entry.

A budget failure emits `SESSION_LOG_BUDGET_EXCEEDED` and degraded metadata;
available projection totals remain available as a partial fallback. Unversioned
legacy rows are used directly; versioned rows are used without a verified log
watermark and additionally emit `SESSION_CACHE_WATERMARK_UNKNOWN`. Forks whose
parent/seed lifecycle is known from the projection entry exclude the
seed-inclusive projection totals instead of guessing attribution, and the
session keeps its parent/seed metadata. An over-budget file also drops its
previous cached statistics. Other sessions still aggregate.
Committed malformed records, plain uncommitted tails, complete Zstd batches,
skippable frames, fork boundaries, retries and sequence checks retain their
existing behavior. Oversized logs require an official session/projection
service or a smaller legacy log to recover complete attribution; no arbitrary
prefix is reported as an exact complete result.

Final local verification: 326 tests pass in both default and UTC timezones;
signed pricing/version checks against `0dde02e`, all four bundles, artifact
syntax checks and npm package dry-run pass. The final real Chrome fixture
passes with 33 screenshots and zero browser errors, including complete access
to 120 projects/legend filters, 205 main/subagent sessions and 75 history days,
stable totals across pages, responsive breakpoints and subscription transitions.
The first five delivery slices have successful full CI runs; the final push
repeats the build/browser checks and seven-version Harness contract matrix.

## Follow-up slice: degraded attribution and cache working sets

The follow-up keeps budget failures attributable without trusting an unknown
log watermark. Versioned projection rows serve as a partial fallback and add
`SESSION_CACHE_WATERMARK_UNKNOWN`; fork parent/seed metadata is recovered from
the projection identity; seed-inclusive projection totals are not attributed
to a known fork; and a file that grows over budget drops its stale cache entry.
The legacy cache now uses a 32 MiB estimated retained-byte cap (300-entry LRU)
instead of 100,000 abstract weight units, so a stable scan over a normal
working set does not evict the oldest session before it is revisited. A
regression test covers 130 sessions x 800 events; the old cap would have
re-read every file on each aggregate.

Verification: 329 tests pass in default and UTC timezones; the four bundles are
rebuilt and compared byte-for-byte with a fresh build; signed pricing checks,
artifact syntax checks and npm package dry-run remain unchanged. The browser
fixture is unchanged and continues to run in CI.

Provider prices, signed catalogs, dependencies and package version are
unchanged. This delivery does not publish npm or replace a running service.
