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
