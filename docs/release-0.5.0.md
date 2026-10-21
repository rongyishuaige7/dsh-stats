# 0.5.0 release

Pre-1.0 feature release candidate, 2026-10-21. Tag and npm publication are still pending.

## Highlights

- **DSH 0.2.1-rc.2 support**: peer ranges, isolated Harness contract matrix and
  compatibility docs now include `0.2.1-rc.2`. The contract smoke accepts both
  plugin export shapes used by 0.2.0 (`default`) and 0.2.1 (`apply` object).
- **Official new-model onboarding**: the 30-minute pricing workflow collects
  OpenAI, Anthropic and Google official pages. A new text model with an
  unambiguous standard price is appended as an `estimated` rule carrying a
  `[provisional]` note and auto-signed. Existing model price changes,
  retired/limited models, non-text models and ambiguous identities remain
  review candidates.
- **Longest-known model fallback**: route suffixes such as
  `global:...-sg` can resolve through the longest known alias instead of
  becoming `待计价`; estimated pricing is never presented as exact.
- **Latest catalog coverage**: GPT-6.1 Sol, Claude Opus 5.5 and Gemini 4 Argon
  rules, plus provisional official coverage for current Anthropic and Google
  models.
- **Project overview rework (0.5.0)**: a cost-first KPI row, Token-structure
  legend, active-span strip, a seven-column project table with a sticky header,
  a filter menu with hidden-state persistence, and expandable project/session
  details. The panel has a fixed height and a single body scroll for both the
  overview and the timeline. The header, status banner and pricing drawer stay
  in place. Esc closes the top layer (filter, menu, drawer) before the panel.
- **Pricing settings drawer (0.5.0)**: the old long pricing page is replaced by
  a 560px three-section drawer (full panel width on narrow screens): Models,
  Custom rules, and Updates & versions. Models use 25-group pages with
  used/all filtering, search, flat/tiered summaries, and complete rule detail;
  custom rules use a list/editor split with conditions, two-layer drafts,
  pending removal/undo, preview invalidation, and a fixed action footer.
  Updates & versions separates the current catalog, check/sync times, the
  auto-update draft, and 5-at-a-time catalog snapshots. Restoring a snapshot
  pins it and pauses automatic updates while preserving custom rules; unpinning
  requires a previewed save and does not trigger a refresh. Model history rates
  remain distinct from whole-catalog snapshots. See
  `docs/pricing-settings-0.5.0.md`.
- **Timeline rework (0.5.0)**: the day view now uses project lanes above
  half-hour cost/token bars, a keyboard-reachable half-hour detail popover and
  expandable session rows. The all view is a calendar matrix, 30 days per page,
  with intensity/project coloring, idle rows, week gaps, a time-of-day profile
  and daily bars. The timeline has no internal viewport; the panel keeps its
  single body scroll.
- **Balance page rework (0.5.0)**: all connected accounts now appear in one
  urgency-ordered list instead of a provider dropdown. A summary strip totals
  available balance per currency, highlights the tightest quota and counts the
  accounts that need attention. Rows show the balance breakdown or remaining
  quota bars, can link to the provider console, and support a per-account alert
  line stored in the browser only. First load uses a `stats/providers` skeleton;
  a single failed account stays in its own row while a whole-query failure moves
  to the header and a retry banner.
- **Responsive detail**: 320/390/640 layouts keep session time, turns/steps,
  LLM and tool time, cache hit, input/output and model in a non-truncated meta
  line; wide rows keep every column unclipped.
- **Trends rework (0.5.0)**: the trends tab now offers 7/30/90-day ranges and a
  cost/token switch, with a summary strip, daily bars, a fixed 26-week heatmap
  and a model ring plus sortable table. Clicking a bar or a heat cell opens that
  day in the overview, and the page follows the project filter.

## Trends page (0.5.0)

- **Ranges**: the last 7, 30 or 90 days, always ending today. The range drives
  the summary strip, the daily bars and the model section; the heatmap is fixed
  at 26 weeks and says so in its own heading.
- **Metrics**: cost or tokens. Switching changes the bars, the heatmap shading,
  the model shares and the ring.
- **26-week heatmap**: one cell per day, shaded by quartiles of active days, with
  active days, current streak and longest streak beside it.
- **Day jump**: clicking a bar or a heat cell opens that day in the overview and
  moves focus to the overview tab.
- **Project filter**: hidden projects are excluded here exactly as in the
  overview and timeline, and the hidden state is shared across the three pages.
- **Current streak**: it now means a run that reaches today or yesterday, so a
  streak that ended last month no longer reads as current. The previous
  "current streak" counted back from the most recent active day.

## Compatibility

| Harness | Verification |
| --- | --- |
| `0.1.3-alpha.2` through `0.2.0-rc.2` | previously verified; see `docs/compatibility.md` |
| `0.2.1-rc.2` | isolated real-module contract: 6/6 checks pass on Node `22.22.0`; full Web verified with plugin 0.5.0 (R1/R16 and UI checks) |

`0.2.1-rc.2` is supported by peer ranges. The desktop app currently bundles
this Harness release; clean installation should no longer report peer mismatches.

## Verification

- Full test suite: **504 tests** pass in the default timezone and `TZ=UTC`.
- Browser fixture: **44 check groups / 77 screenshots**, 0 console errors,
  0 runtime exceptions, 0 failed requests at 1440/390/320 px. The fixture covers
  the pricing drawer model list/detail, custom drafts, preview races, pinned and
  unpinned updates, seven signed historical snapshots, empty history, restore
  success/failure, long identities/forms, short windows, and the previous
  6b–6e regressions.
- Real Harness contracts: matrix includes `0.1.3-alpha.2`, `0.1.5-rc.1`,
  `0.1.5-rc.2`, `0.1.5-rc.3`, `0.1.6-alpha.1`, `0.1.7-rc.2`, `0.2.0-rc.2`,
  and `0.2.1-rc.2`.
- Signed catalog `2026101817`: 876 rules, verified against the pinned public key.
- Fresh build matches committed `lib/*`; `npm pack` preview contains the four
  runtime bundles, license and READMEs.
- Pricing auto-publish workflow remains separate from this UI slice.

## Upgrade

```bash
# Web
dsh plugin --profile web add -w @rongyi7/dsh-stats@0.5.0

# Desktop app: use the CLI bundled with the app
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin \
  --profile desktop add -w @rongyi7/dsh-stats@0.5.0
```

The npm commands above apply once `0.5.0` is published. Before that, install the local
`rongyi7-dsh-stats-0.5.0.tgz` tarball with the same command shape. The `desktop` profile is managed
by the app, so a separately installed npm `dsh` refuses it.

Restart the host after replacing the plugin. The signed catalog updates
independently; do not reinstall merely to receive new prices.

## Known limitations

- Provisional rules cover **standard rates only**. Fast/Priority/Batch/Flex,
  1-hour cache writes and special tiers require review or remain unsupported.
- Provisional rules are not promoted automatically. A maintainer reviews the
  `[provisional]` rule, changes confidence to `exact`, removes the marker and
  signs through `sign_reviewed_catalog`.
- Existing model price changes intentionally require review.
- Meta open-weight models do not have a single first-party token price; they
  follow the actual host/OpenRouter route.
- Real Web verification covered exact-status data, R1 generation Esc and R16
  approval Esc. Unpriced-price flows and partial/stale banners remain
  fixture-only; no provider was added to exercise them.
- The fixed-height panel aligns day, all and timeline bottoms at 1440 px;
  the timeline no longer has an internal viewport. Narrow layout and
  non-truncation are asserted separately at 320/390/640 px.
- Desktop real-device acceptance for the pricing drawer (Chinese/English,
  light/dark, narrow window, pending-model direct entry, preview/save,
  restore/unpin) remains pending; fixture coverage is not real-device
  acceptance.

## Release gates

1. `npm ci`
2. `npm run verify:pricing`
3. `npm run build` and confirm `git diff --exit-code -- lib`
4. `npm test` and `TZ=UTC npm test`
5. `node scripts/install-harness-fixture.mjs 0.2.1-rc.2 "$TMP"` then
   `DSH_HARNESS_ROOT="$TMP" npm run smoke:harness`
6. `npm run smoke:browser`
7. `npm pack --dry-run`
8. Commit the version bump, create tag `v0.5.0`, publish `@rongyi7/dsh-stats@0.5.0`
   with `prepublishOnly`, then create the GitHub release from this document.

## Release infrastructure

- `ci.yml` is the release gate: signed-catalog verification, build drift,
  timezone-independent tests, artifact syntax, package preview, browser fixture
  and the real Harness contract matrix.
- `scripts/harness-versions.json` is the single source of truth for the matrix;
  adding a version there automatically adds a CI job.
- `scripts/install-harness-fixture.mjs` pins the complete upstream module
  closure so npm prerelease peers cannot mix RCs.
- `pricing.yml` runs every 30 minutes, collects only allowlisted structured
  sources, signs with the CI secret, commits the catalog and leaves a review
  report artifact. A failed fetch fails closed and leaves the last verified
  catalog active.
- `sign_reviewed_catalog` remains the human path for corrections and promotions;
  catalog rollback is a signed previous version, never a local overwrite.
