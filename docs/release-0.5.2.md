# 0.5.2 release

Patch release, 2026-10-28. Pricing-catalog update resilience only: no
new models, no interface redesign, no peer-range change, no dependency change.

**Status: published 2026-10-28 as `v0.5.2`; npm `latest` points at it.**

## Why

The first automatic catalog check ran about a second after the plugin mounted,
used a single 12 s request for a 743 KB payload and, when it failed, waited a
full hour before trying again. On a cold resolver or a slow link the drawer then
showed "价格更新失败，继续使用上次有效版本" together with the generic
`pricing-update-failed` code — the same banner for a DNS failure, a timeout and a
malformed payload. The valid catalog stayed in use, but the cause was invisible
and the retry was an hour away.

## What changed

**Scheduling**

- The first automatic check now waits 15–25 s after mount, so the host's network
  stack is ready and the first attempt is not wasted on a cold resolver. The
  unpriced-usage trigger shares that gate, so an aggregate that runs during
  startup cannot start a download early either.
- A one-minute tick asks the store whether a check is due; the store answers.
  After a success the interval is one hour, after consecutive failures it backs
  off 5 → 15 → 30 minutes, and the unpriced-usage path keeps its 15-minute
  cooldown. This also removes the old 1-hour timer/gate race that could skip a
  whole cycle.

**Retries**

- One check retries transient failures: automatic checks make four attempts
  (3 s, 10 s, 30 s, ±20% jitter), a user-initiated check makes two (2 s).
- Rejected signatures, version regressions/conflicts, oversized payloads,
  future-dated catalogs and 4xx responses other than 408/429 are final and are
  not retried. 408 and 429 are treated as transient and retried.
- The per-attempt timeout rose from 12 s to 20 s, and a timeout now reports
  `pricing-timeout` instead of the generic code.

**Diagnostics**

- The store records `errorDetail`, `errorAt`, `attempts`, `consecutiveFailures`
  and `nextCheckAt`.
- The drawer keeps the detail collapsed behind 数据诊断 and shows the code, the
  underlying reason (for example `fetch failed (ENOTFOUND)`), how many attempts
  ran and when the next automatic check happens.
- These are optional fields on the `pricing` result; the schema still rejects
  unknown fields, and payloads without them remain valid.

## Compatibility

Unchanged from `0.5.1`: same peer ranges, same `engines.dsh`
(`>=0.1.0-rc.6 <0.3.0`), same catalog format and signing rules. The `pricing`
result gains five optional fields.

| Harness | Verification |
| --- | --- |
| `0.2.1-rc.2` | isolated real-module contract: 6/6 checks pass on Node `22.22.0` |
| earlier rows | unchanged, see `docs/compatibility.md` |

## Verification

- Full test suite: **667 tests / 153 files** pass in the default timezone and
  `TZ=UTC` (up from 652 at `0.5.1`).
- New coverage: transient retry and success, 4xx/5xx classification (including
  408/429 retried versus other 4xx final), signature and version-regression
  finality, timeout classification, close during backoff, the shorter manual
  ladder, backoff growth and reset, the automatic gate, the startup gate for the
  unpriced-usage trigger, and the drawer's failure banner with its detail rows.
- Browser fixture: 50 check groups / 80 screenshots, 0 console errors.
- Live download check against `data/pricing/latest.json` (743 KB, 2–5 s on the
  release machine): envelope verifies and matches the shipped payload.
- Built-in catalog: signed `2026101851` (979 rules), including `gpt-6.1-terra`.

## Upgrade

```bash
# Web
dsh plugin --profile web add -w @rongyi7/dsh-stats@0.5.2

# Desktop app: use the CLI bundled with the app
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin \
  --profile desktop add -w @rongyi7/dsh-stats@0.5.2
```

Restart the host after replacing the plugin. The signed catalog updates
independently of the plugin version.

## Known limitations

- Retries are bounded: a host that stays offline still shows the failure banner,
  now with the reason and the next attempt time.
- The catalog is a 743 KB download; a conditional request (`If-None-Match`) is
  planned for a later release and is not part of this patch.
- A failed check never rolls the catalog back: the last valid version keeps
  applying and the drawer reports the failure with its cause and the next
  attempt time.
