# @rongyi7/dsh-stats — DSH Project Stats Plugin

English | [简体中文](README.zh.md)

[![npm version](https://img.shields.io/npm/v/@rongyi7/dsh-stats)](https://www.npmjs.com/package/@rongyi7/dsh-stats)
[![npm downloads](https://img.shields.io/npm/dm/@rongyi7/dsh-stats)](https://www.npmjs.com/package/@rongyi7/dsh-stats)
[![license](https://img.shields.io/npm/l/@rongyi7/dsh-stats)](https://github.com/rongyishuaige7/dsh-stats/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/@rongyi7/dsh-stats)](https://nodejs.org)
[![CI](https://github.com/rongyishuaige7/dsh-stats/actions/workflows/ci.yml/badge.svg)](https://github.com/rongyishuaige7/dsh-stats/actions/workflows/ci.yml)

Project-level token usage, a daily development timeline, and cost tracking — integrated into the DeepSeek Harness (DSH) web sidebar.

> Tier 2 architecture: a host-side Typert RPC aggregates the durable session logs, and a client-side React UI renders the dashboard. Falls back to a pure client-side approximation if the RPC is unavailable.

## Layout

```
src/                       # source files
  index.js                 #   host half: StatsService (stats/aggregate Typert RPC)
  client.cjs               #   client half: $mount + ctx.inject + React UI
  typert-host.js           #   host Typert manifest (strict descriptor + zod schema)
  typert-remote-client.js  #   client descriptor (reference; inlined + $mount at runtime)
scripts/build.mjs          # esbuild build script (node scripts/build.mjs)
lib/                       # build output (shipped; do not edit by hand)
  index.js / client.js / typert.host.js / typert.remote-client.js
reference/server.mjs       # first standalone dashboard backend (slot-bucketing algorithm reference)
DESIGN.md                  # full integration design (Tier 1 + Tier 2)
```

## Build & publish

```bash
npm run build              # esbuild → lib/ (client wrapped as __ModuleLoader__ artifact)
npm publish                # prepublishOnly rebuilds automatically (npm login first)
```

Preview the publish contents with `npm pack --dry-run` (LICENSE/README*/lib/*/cordis.patch.yml/package.json, ~25 KB).

## Install into a DSH profile

> ⚠️ **Never install into a DSH profile with `npm install --prefix ~/.dsh/profiles/web ...`.**
> DSH profiles are managed by **pnpm** (workspace + virtual store + supply-chain policies). npm writes its own
> `package-lock.json`, rewrites `node_modules` in a flat layout, and auto-installs this package's
> peerDependencies — producing duplicate copies of `@deepseek-ai/dsh-*` internals and a split cordis context.
> The symptom after restart: `agent-presets: refusing to compose an unscoped context` on session resume,
> only fixed by `rm -rf node_modules package-lock.json && pnpm install`.
> Always use the official `dsh plugin` command (it forwards to pnpm).

```bash
# Option A (from the npm registry; install or upgrade)
dsh plugin --profile web add @rongyi7/dsh-stats            # latest
dsh plugin --profile web add @rongyi7/dsh-stats@0.2.3     # pinned
# Option B (from a local tarball)
dsh plugin --profile web add ./rongyi7-dsh-stats-0.2.3.tgz
```

That's it — this package declares `dsh.bundle` (with a `cordis.patch.yml` that inserts the plugin row), so `dsh plugin add` registers it into `dsh.profile.bundles` automatically. No manual patch line needed.

Verify: `dsh --profile web --dump-config` (you should see `- id: stats` and `@rongyi7/dsh-stats` in the bundle list).

## Activation

`dsh-client-modules` / `dsh-typert-loader` cache per package — **restart to take effect**:

```bash
dsh web
```

After restart, a “Stats” button appears in the sidebar footer. The panel title shows “精确（宿主）” (host-accurate) when Tier 2 is live, or “近似（客户端）” (client fallback) with the error in the tooltip otherwise.

## Features

- **Projects overview** — summary cards (incl. cost) + one row per project + expandable session detail (model / cost / archived tag).
- **Development timeline** — exact 30-minute slots (host slices activity intervals from event timestamps) + a daily total heat strip.
- **Cost** — auto-priced by the actual model and official rules: DeepSeek uses the price effective in each 30-minute slot; MiniMax M3 uses the request's service tier and input-context tier. No manual model selection.
- **Date scope** — switch between one active day and all recorded activity; the overview and timeline stay in sync.
- **Data quality** — the panel labels host-exact, partial, stale, and client-approximate results; incomplete or missing logs are surfaced in the source tooltip instead of being presented as exact.
- **Polish** — option persistence (localStorage), column sorting, CSV/JSON export, legend filtering, 60 s auto-refresh + manual refresh.

Supported pay-as-you-go pricing:

| Models | Rules |
|---|---|
| `deepseek-v4-pro`, `deepseek-v4-flash` | Official historical and 2026-08-17 peak/off-peak prices, by Beijing-time slot |
| `MiniMax-M3` | Official standard/priority and `≤512K`/`>512K` input-token tiers |
| `MiniMax-M2.7`, `MiniMax-M2.7-highspeed` | Official input/output/cache-read/cache-write prices |

MiniMax prices come from the [official pay-as-you-go pricing page](https://platform.minimaxi.com/docs/guides/pricing-paygo). Model matching is case-insensitive but otherwise exact; provider-prefixed or unknown model ids are not silently remapped.

## Data flow (Tier 2)

```
browser client.cjs:
  apply() → ctx.remote.$mount(inlined STATS_REMOTE_CONTRIBUTION)
         → ctx.inject(["remote","remote.stats"], childCtx)
           (direct ctx.remote.stats fails with "without inject" in this fiber,
            and injecting it deadlocks — $mount is the provider itself; the child ctx sidesteps this)
         → aggregateRemote = () => childCtx.remote.stats.aggregate()
host index.js:
  StatsService extends TypertRemoteService (@Remote("aggregate"))
    constructor: __runInitializers triggers the @Remote marker registration
                 (skipping it breaks SRC dispatch)
    aggregate(): reads workspace.json + session_projcache.json (tokenUsage/sessionStats)
               + decodes session.jsonl.zstd (timestamps / model / usage, deduped by turn:step)
               → { projects, timeline, meta } (sessions carry model / slots / slotStats / slotUsage / quality)
```

Gotchas (hard-won):

1. **DSH does not auto-mount third-party `./remote`** — the client must inline the descriptor and `$mount` it manually.
2. **`ctx.remote.stats` cannot be accessed directly** — the traceable proxy forwards it to `ctx["remote.stats"]`, which requires the service in this fiber's `inject` (otherwise "without inject"), but injecting it deadlocks. Use a `ctx.inject` child context.
3. **The `@Remote` decorator initializer must run manually** — hand-written ESM lacks the instance-field `__runInitializers(this, _instanceExtraInitializers)`, so call it in the constructor.
4. **The client `$mount` result schema only needs `.parse`** — client decoding only calls `schema.parse(value)`, so `{ parse: v => v }` passes through; but the host `typert.host.js` schema must be a real zod schema (`_zod`).

## Local development iteration

```bash
# after editing src/: rebuild, repack, reinstall into the profile, then restart
npm run build && npm pack
dsh plugin --profile web add ./rongyi7-dsh-stats-0.2.3.tgz   # pnpm reinstall
# restart dsh web
```

## Known limitations

| Item | Note |
|---|---|
| Archived sessions | Kept in stats with an “(archived)” tag, not excluded |
| Freshness | Current session's projection cache may lag by seconds; 60 s auto-refresh mitigates |
| Decode cost | Many sessions → the host fully decodes on each RPC (mtime-cached, so repeat requests don't re-decode; the first read is still slow) |
| Price boundary | DeepSeek sessions after the 2026-08-17 change use the price in effect at their own time (intended); no historical price backfill |
| Unknown model | Sessions whose model is not recognized are shown with an unknown cost (`—`); the plugin does not guess a price |
| Duration semantics | Project LLM/tool totals are cumulative work metrics; the timeline merges overlapping sessions in the same project into wall-clock intervals |
| Incomplete storage | A missing, malformed, or actively-written log is marked partial/stale and may use projection-cache token totals with a warning |

Note: timeline days, peak/off-peak hours, and pricing are all bucketed in explicit Beijing time (UTC+8), independent of the host machine's timezone.
