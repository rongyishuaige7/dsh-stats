# 0.5.1 release

Patch release, 2026-10-23. Correctness only: no new features, no pricing-catalog
change, no peer-range change, no new dependency.

## What changed

`0.5.0` shipped a large UI release. This patch is the result of a full review
sweep over the plugin's data path, pricing engine and client state, run as
small, individually tested fixes. 95 commits since `v0.5.0`; every confirmed
defect carries a regression test under `tests/regression/`.

**Aggregation and time boundaries**

- A session whose activity spans midnight no longer loses tokens in either day
  window, and UTC slots are attributed to the local day that contains them.
  The previous slot loop keyed days by `slot * 30min`, so a local evening in a
  non-UTC zone could land on the wrong date.
- `updatedAt` is now the maximum of the real timestamps instead of
  `max(...) || null`, so a session whose only timestamp is `0` keeps it.
- An invalid or out-of-range timestamp no longer aborts the whole export or the
  whole aggregate; it degrades to an empty field.
- One unreadable session no longer fails the entire aggregate: the session is
  reported as `unavailable` with a warning and the rest of the data still loads.

**Pricing**

- DeepSeek legacy peak rates now exclude Beijing weekends, matching the
  time-of-use rules. Previously a Saturday morning was billed at peak.
- `contextOver512k: false` is honoured instead of being treated as "unknown".
- `providerId` comparisons are case-insensitive, so `DeepSeek` and `deepseek`
  no longer resolve to different rules (and no longer report `unsupported`).
- A historical USD total converts at the FX row for its own usage day instead of
  the newest row; the day is carried through merges and the wire payload.
- Calendar validation rejects impossible dates (`2026-02-30`) and an empty
  catalog is rejected instead of validating successfully.
- `tierMultipliers` with a falsy value can no longer bypass validation, and a
  multiplier of `1` is no longer shown as an extra pricing condition.
- A summary mixing free rows with unpriced rows no longer reports `free`.

**State, cache and versions**

- Route rows stay ordered after a cache hit; previously an updated row was
  spliced into a stale position.
- The pricing store keeps the previous settings when a settings read fails,
  restores the pinned catalog version exactly, and returns a copy of its history
  instead of the internal array.
- Projection cache rows are rejected when their identity (`id`, `cwd`,
  `createdAt`) or lifecycle does not match the session header.
- Warning objects no longer leak their internal `count` field to the RPC payload.

**Null and prototype safety**

- Lookups keyed by user data (`__proto__`, `constructor`) use own-property checks
  in the project filter, balance chips, route cache and trend series.
- `null` projects, sessions, windows and balance entries are skipped instead of
  throwing, and an empty-string balance is treated as "not reported" rather than
  "invalid".

**Client behaviour**

- The balance alert bell appears again (it was suppressed by a truthiness bug),
  and the alert input no longer keeps a stale value after an external change.
- An expired `resetsAt` no longer reads as "resets soon".
- The session table's "sessions" column sorts by a real value; the model share
  ring, heatmap legend and average line match what is actually drawn.
- The day-mode button restores the day you left instead of writing `null`, so
  switching Overview → All → Day no longer resets to the newest day.
- Closing the pricing drawer returns focus to the trigger, and Tab stays inside
  the modal drawer.
- CSV export uses the session-level authoritative cost when the host provides
  one, so a session no longer shows two different amounts in the summary column
  and in its detail rows.

**Kept as-is on purpose**

One review finding was rejected during release review because the proposed
change contradicted an existing, documented contract:

- The subagent group header keeps showing the project-wide subagent count. A
  per-page count makes the same header change while paging and breaks the
  browser fixture baseline.

## Compatibility

Unchanged from `0.5.0`: same peer ranges, same `engines.dsh`
(`>=0.1.0-rc.6 <0.3.0`), same signed catalog. The only wire change is one
optional `pricing` field on a cost total; older payloads remain valid and the
schema still rejects unknown fields.

| Harness | Verification |
| --- | --- |
| `0.2.1-rc.2` | isolated real-module contract: 6/6 checks pass on Node `22.22.0` |
| earlier rows | unchanged, see `docs/compatibility.md` |

## Verification

- Full test suite: **652 tests / 152 files** pass in the default timezone and
  `TZ=UTC` (up from 505 at `0.5.0`; 125 regression tests).
- Browser fixture: **50 check groups / 80 screenshots**, 0 console errors,
  0 runtime exceptions, 0 failed requests at 1440/390/320 px, including the
  preview-before-save hint added in this release.
- Real Harness contract on `0.2.1-rc.2`: TYPERT manifest, JSONL persistence,
  projection init/restore/checkpoint with fork exclusion, aggregate wire schema
  and live `snapshotEvents` agreement.
- Signed catalog `2026101824`: 900 rules, verified against the pinned public key.
- Fresh build matches committed `lib/*`; `npm pack` preview contains the same ten
  files as `0.5.0` (282 kB).

## Upgrade

```bash
# Web
dsh plugin --profile web add -w @rongyi7/dsh-stats@0.5.1

# Desktop app: use the CLI bundled with the app
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin \
  --profile desktop add -w @rongyi7/dsh-stats@0.5.1
```

Restart the host after replacing the plugin. The signed catalog updates
independently; do not reinstall merely to receive new prices.

## Known limitations

- The sweep is not exhaustive: open findings that would need a product decision
  rather than a defect fix are left for a later release.
- Live balances, unpriced-price flows and partial/stale banners remain
  fixture-only on this release; no new real-account run was performed.
- The browser fixture runs headless Chrome; it cannot cover OS-level focus
  behaviour in the desktop shell.
