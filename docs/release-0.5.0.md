# 0.5.0 release

Pre-1.0 feature release, 2026-10-18.

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
  details. The panel has a fixed height and a single body scroll for the overview; the
  timeline keeps its internal viewport until slice 4. The header, status banner
  and pricing drawer stay in place. The pricing settings moved to
  a right-side drawer with focus-model locating, and Esc closes the top layer
  (filter, menu, drawer) before the panel.
- **Responsive detail**: 320/390/640 layouts keep session time, turns/steps,
  LLM and tool time, cache hit, input/output and model in a non-truncated meta
  line; wide rows keep every column unclipped.

## Compatibility

| Harness | Verification |
| --- | --- |
| `0.1.3-alpha.2` through `0.2.0-rc.2` | previously verified; see `docs/compatibility.md` |
| `0.2.1-rc.2` | isolated real-module contract: 6/6 checks pass on Node `22.22.0`; full Web not rerun |

`0.2.1-rc.2` is supported by peer ranges. The desktop app currently bundles
this Harness release; clean installation should no longer report peer mismatches.

## Verification

- Full test suite: **357 tests** pass in the default timezone and `TZ=UTC`.
- Browser fixture: **18 check groups / 37 screenshots**, 0 console errors,
  0 runtime exceptions, 0 failed requests at 1440/390/320 px.
- Real Harness contracts: matrix includes `0.1.3-alpha.2`, `0.1.5-rc.1`,
  `0.1.5-rc.2`, `0.1.5-rc.3`, `0.1.6-alpha.1`, `0.1.7-rc.2`, `0.2.0-rc.2`,
  and `0.2.1-rc.2`.
- Signed catalog `2026101805`: 836 rules, verified against the pinned public key.
- Fresh build matches committed `lib/*`; `npm pack` preview contains the four
  runtime bundles, license and READMEs.
- Pricing auto-publish workflow run: success (16 provisional models signed).

## Upgrade

```bash
dsh plugin --profile web add @rongyi7/dsh-stats@0.5.0
# or, for the desktop profile
dsh plugin --profile desktop add @rongyi7/dsh-stats@0.5.0
```

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
- Full Web boot and a dedicated 0.2.1 browser run were not repeated; the
  browser fixture is version-independent.
- The fixed-height panel aligns day, all and timeline bottoms at 1440 px;
  narrow layout and non-truncation are asserted separately at 320/390/640 px.

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
