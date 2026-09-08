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
2. Pending: account reliability, visible data quality and shared RPC validation.
3. Pending: compatibility matrix, integration checks and final documentation.

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
