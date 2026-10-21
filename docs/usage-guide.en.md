# DSH Usage guide

This guide covers installing `@rongyi7/dsh-stats` (UI brand **DSH Usage**), the four tabs,
pricing, account queries, data sources and exports. For the introduction see the
[README](../README.en.md); for architecture and data contracts see [DESIGN.md](../DESIGN.md).

- Applies to: `main` at `0.5.0`. The npm stable release is `0.4.3`, so small UI details may differ
  in an installed copy.
- Supported environments: the DSH desktop app and a DSH Web host.

## 1. Installation

The plugin installs into a DSH **profile**. The desktop app and Web are separate profiles
(`desktop` and `web`); installing into one does not install into the other.

The plugin requires Node.js 22 or newer. The desktop app ships its own runtime (Node 24 today),
so no separate Node install is needed there; a Web host follows DSH's own requirements.

The `-w` flag is pnpm's workspace install option: it installs into the profile directory, which is
the workspace root. It is not a file path.

### 1.1 Desktop app

```bash
dsh plugin --profile desktop add -w @rongyi7/dsh-stats
```

Then **quit DSH completely** (Cmd+Q on macOS, not just closing the window) and open it again.
The “Usage” entry sits at the bottom of the sidebar.

`dsh` must be a CLI that shares the same `~/.dsh` as the app. The desktop app bundles one; on macOS:

```bash
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin \
  --profile desktop add -w @rongyi7/dsh-stats
```

A `dsh` from a separate npm install can still manage the same profile directory, but it belongs to a
different runtime. If a profile command fails, retry with the bundled CLI before editing
`~/.dsh/profiles/desktop` by hand.

### 1.2 Web

```bash
dsh plugin --profile web add -w @rongyi7/dsh-stats
```

Restart the Web host:

```bash
dsh web
```

Reload the page and the “Usage” entry appears at the bottom of the sidebar. Reloading the browser
alone does not reload host-side plugins.

### 1.3 Custom profiles

Replace `desktop` / `web` with the real profile name:

```bash
dsh plugin --profile <name> add -w @rongyi7/dsh-stats
```

### 1.4 Pinned versions and local tarballs

Pin a published version (the current stable release in this example):

```bash
dsh plugin --profile web add -w @rongyi7/dsh-stats@0.4.3
```

Install a tarball built locally with `npm pack`:

```bash
dsh plugin --profile desktop add -w ./rongyi7-dsh-stats-0.5.0.tgz
```

The file name follows the version. `0.5.0` is not on npm yet, so `@0.5.0` is not a downloadable
example; local tarballs are only for your own builds and verification.

### 1.5 Verify registration

```bash
dsh --profile web --dump-config
```

The output should contain `stats` and `@rongyi7/dsh-stats`. Use `desktop` for the desktop app.

### 1.6 Upgrading and removing

Upgrading means running the install command again with the target version, then restarting as in
1.1 / 1.2:

```bash
dsh plugin --profile web add -w @rongyi7/dsh-stats@latest
```

Removing:

```bash
dsh plugin --profile web remove @rongyi7/dsh-stats
```

Restart the host afterwards.

### 1.7 Common install problems

| Symptom | Fix |
| --- | --- |
| pnpm reports `ERR_PNPM_ADDING_TO_ROOT` | Add `-w`; the profile directory is the workspace root. |
| No “Usage” entry after installing | Confirm the command succeeded, fully restart the host, and hard-refresh the browser. DSH caches client modules and Typert descriptors. |
| Still missing after restarting the desktop app | Make sure you installed into the `desktop` profile, not only `web`. |
| Running `npm install --prefix ~/.dsh/profiles/web ...` to edit a profile | Don't. Profiles are managed by pnpm, and the official `dsh plugin` command keeps dependencies and bundle registration in sync. |
| Pricing settings say “Pricing settings are unavailable” | The host did not load the current plugin version. Restart the host and check `--dump-config` if it persists. |

### 1.8 Versions and compatibility

| Item | Status (checked 2026-10-21) |
| --- | --- |
| npm stable | `0.4.3`, published 2026-10-15 |
| This repository (`main`) | `0.5.0`, not published yet |
| Harness bundled in the desktop app | `0.2.1-rc.2` |
| Plugin `0.5.0` peer range | Covers `0.2.0-rc.2` and `0.2.1-rc.2` |
| Plugin `0.4.3` peer range | Up to `0.2.0-rc.2` |

So until `0.5.0` ships, installing the npm stable release into the desktop app is an **unverified
combination**: `0.4.3` does not declare `0.2.1-rc.2` as a peer, and the install may print peer
warnings. Once `0.5.0` is published, both the desktop app and Web can use the stable release.

Per-release real-host, module-contract and browser-fixture results are in the
[compatibility matrix](compatibility.md). “Supports the desktop app” means the current release works
there; it does not mean every historical release and operating system has real-device acceptance.

## 2. The four tabs

The panel has four tabs: Overview, Timeline, Usage Trends and Account Balance. The header always
shows the current data-source status, refresh, export, pricing settings (gear) and close.

### 2.1 Overview

- The top row shows estimated cost, token composition, sessions and LLM time; the strip below adds
  active span, active days, average first token and output speed.
- The project table sorts by any column with a sticky header; expanding a row reveals that project's
  turns/steps, tool time, first token, tok/s and session details.
- “Filter projects” in the top-right searches projects or paths and hides the ones you don't want.
  Hidden projects are excluded from metrics, the table and the trends page.
- Projects page 50 at a time and sessions 100 at a time; paging never changes the top summary.
- Overview, Timeline and Usage Trends share the project filter; Account Balance is not affected.

### 2.2 Timeline

- **Day**: projects become lanes above half-hour cost or token bars. Click a segment or bar for that
  half hour, or expand a lane to open its sessions.
- **All**: a calendar matrix, 30 days per page; click a cell to open that day.
- The bar metric switches between cost and tokens; shading can follow intensity or project.
- Overlapping sessions in one project merge into wall-clock intervals; project LLM/tool durations
  remain cumulative work metrics.

### 2.3 Usage trends

- Ranges are the last 7, 30 or 90 days; the metric switches between cost and tokens.
- The summary strip gives the range total, daily average, active days and the top model.
- Daily bars follow, with a dashed line for the average per active day.
- A fixed 26-week activity heatmap shades cells by quartiles of active days; “current streak” counts
  back from today or yesterday.
- The model section ranks shares by the current metric. Clicking a bar or heat cell opens that day in
  the overview.
- LLM time is split from sessions by token share and is approximate.

### 2.4 Account balance

- Every connected account appears in one list, ordered by urgency: exhausted or nearly exhausted
  quotas, invalid credentials and stale snapshots come first.
- With multiple accounts, the summary strip totals available balance per currency and shows the
  tightest quota plus how many accounts need attention.
- Each row shows the balance breakdown, or a remaining-quota bar per subscription window with its
  reset time (Beijing time).
- Each balance account can have an alert line. It is saved in this browser only and compares amounts
  in the account's own currency, without FX conversion.
- A failed refresh only affects its own row and marks it stale; if the whole query fails, the header
  turns stale and a banner offers retry while existing rows stay visible.
- The account tab has no export: balances are a live snapshot, not historical statistics.

## 3. Pricing

### 3.1 How amounts are computed

- All rates are per **million tokens**, and spend summaries are converted to RMB (CNY). The UI and
  spend exports show RMB only.
- The current fixed FX snapshot is `1 USD = 6.7205 CNY`, retrieved on `2026-08-26` from
  [Frankfurter](https://api.frankfurter.app/2026-08-26?from=USD&to=CNY). It does not follow live
  rates, and historical values are not re-fetched each time the panel opens.
- The pricing engine considers context length, service tier, cache type and effective time.
- The balance tab keeps each provider's native currency without conversion.
- Everything here is an **estimate** derived from public prices; it is not the provider's bill.

### 3.2 The three amounts in the UI

| Display | Meaning |
| --- | --- |
| `¥12.34` | A usable price exists and the amount is included in the total. |
| `¥12.34*` | Some usage is priced and some cannot be priced safely; click for details. |
| Awaiting price | No safe rule applies; the session is excluded from the spend total. |

The ⓘ next to the cost explains it. The pricing drawer and session details also use labels such as
“Includes estimates”, “Some usage is unpriced” and “No available prices”.

### 3.3 Cost status

| Status | Meaning |
| --- | --- |
| `exact` | Every priced usage row matched a deterministic built-in rule. |
| `estimated` | An amount is available, but at least one row comes from a dynamic snapshot, is missing price-affecting metadata, or is an unknown API provider borrowing a uniquely matching or longest-known-name official rule. The UI shows the calculated RMB amount and the estimate status stays in data and exports. |
| `free` | All matched usage is free; the summary keeps a zero amount instead of showing an unknown cost. |
| `partial` | Priced and unpriced usage coexist; the main total shows included CNY with a `*`. |
| `unsupported` | No safe rule applies; the session is excluded from the total and shows “Awaiting price”. |

Individual usage rows may also be marked `subscription` (subscription or token plan) or `ambiguous`
(conflicting rules). Subscription aliases such as `coding-plan` and `coding_plan` are normalized
before pricing and are never presented as API spend.

### 3.4 When prices are not guessed

- Explicit `relay` / `local` modes without a custom rate.
- Subscription / token-plan usage: never converted into API spend.
- Unknown models, or a missing model name.
- Conflicting rules (`ambiguous`).
- Price-sensitive suffixes such as `-mini`, `-pro`, `-vision`, `:batch` and `:free`.

Those sessions stay out of the primary spend total and keep the reason in session details and in
`meta.warnings` in exports.

### 3.5 Provider matching

- Pricing is primarily **provider-scoped**: explicitly recognized first-party providers use their
  list prices and are `exact`.
- The DSH pass-through routes `nbdeepseek` and `deepseek-modlens` explicitly inherit DeepSeek's
  official API pricing.
- For an unknown or API-compatible provider, a model that uniquely matches one official rule, or
  uniquely matches at a token boundary by longest known name (for example a regional or deployment
  suffix), keeps its original provider and is marked `estimated`.
- That is a public-price estimate, not the relay's bill.

Use “Pricing settings → Models” for the actual rates; this document does not copy the price table.
Collection, signing and maintenance are described in [pricing updates](pricing-updates.md).

### 3.6 The pricing settings drawer

The gear icon in the header opens “Pricing settings” from the right: 560px on desktop and full panel
width on narrow screens. It always has three sections.

**Models**

- Used models are listed first; you can switch to all models, search, or page through model groups
  (25 per page).
- Opening a model shows the full provider/model, current rules, source (official pricing) and a
  collapsed “Other periods” section.
- Simple prices show an input/output summary; complex prices show “Tiered pricing · N current rules”.
- Pending models offer “Set price”, prefilled with the provider and model.

**Custom rules**

- The rule list and the add/edit page are separate, with a footer for “Preview impact / Save /
  Discard changes”.
- Enter provider ID, model ID and per-million-token rates (uncached input, cache read, cache write,
  output). Empty means unknown; `0` means free.
- “More conditions” covers start and end times, account type, a long-context threshold and service
  multipliers. Without a start time, earlier usage is estimated with that rate; with one, the rule
  applies only inside its interval.
- Times use Beijing time (UTC+8), like the rest of the panel.
- Adding to the draft, pending removal and undo all operate on the local rule set; a form with
  unadded changes blocks preview and save.
- Closing the drawer discards unsaved changes.

**Updates & versions**

- Shows the full catalog version, real publish time, last check, last successful sync, the
  auto-update switch and catalog snapshots.
- Auto-update changes need preview and save to take effect.
- Snapshots start with the latest five and reveal five more per “Show more”. Restoring replaces the
  whole catalog, pauses automatic updates and keeps saved custom rules.
- While a version is pinned, both “Check updates” entries are disabled. Re-enabling automatic
  updates and saving only unpins the catalog; it does not download anything, and you can check
  manually afterwards.
- When unpinned with automatic updates off, manual checks remain available.
- Failed updates keep the last valid catalog.

“Other periods” inside a model is that model's historical rate data; “Catalog snapshots” is a whole
signed catalog version. They are different data layers. Custom rules take precedence over the public
catalog.

### 3.7 Automatic updates

- The host checks the signed catalog at startup and hourly.
- A missing price for a used model triggers a cooled-down check.
- Only public pricing data is downloaded; no sessions or credentials are uploaded.
- The local catalog lives in `$DSH_HOME/plugins/dsh-stats/pricing/`
  (default `~/.dsh/plugins/dsh-stats/pricing/`) and holds effective prices, historical catalogs and
  custom-setting revisions. Original token logs are never rewritten.
- A browser offline fallback labels itself “Local summaries · bundled prices”.

## 4. Accounts and credentials

Account queries run only in the host. The references below are variable names, never secret values
to paste into a README or chat.

| Account | Official endpoint | Default credential reference |
| --- | --- | --- |
| DeepSeek balance | `/user/balance` | `DEEPSEEK_API_KEY` |
| OpenRouter credits | `/api/v1/credits` | `OPENROUTER_MANAGEMENT_KEY` (Management Key required) |
| Moonshot balance | `/v1/users/me/balance` | `MOONSHOT_API_KEY` |
| Z.ai balance | `/api/paas/v4/balance` | `ZAI_API_KEY` |
| Kimi For Coding | `/coding/v1/usages` | `KIMI_API_KEY` |
| Z.ai Coding Plan | `/api/monitor/usage/quota/limit` | `ZAI_API_KEY` |
| MiniMax Coding Plan | [`/v1/token_plan/remains`](https://platform.minimaxi.com/subscribe/token-plan?tab=api-enterprise) plus official compatibility paths | `MINIMAX_API_KEY` |

- `accountApiKeyEnv` in a provider config (also `accountApiKeyRef` and similar spellings) overrides
  the default reference.
- Results are cached for five minutes and concurrent requests are deduplicated; Refresh explicitly
  bypasses that cache.
- A transient network, rate-limit or response error keeps that account's last successful snapshot and
  marks it stale.
- If the whole query fails, the header turns stale and a banner offers retry while existing rows stay
  visible.
- The DeepSeek account sign-in provider added in Harness 0.1.7 (`deepseek-account`) has no API key
  for the official balance endpoint, so the account page does not list it; the API-key provider is
  queried as before.
- MiniMax configurations without an account type keep the historical Coding Plan default; an explicit
  `accountType: api` is not queried as a subscription.
- Providers without a public balance endpoint still contribute token usage and are listed in the
  “not connected” group with a reason; an account with an endpoint but no credential shows the
  missing variable name.

## 5. Data sources, exports and input

### 5.1 Data-source status

The status next to the panel title names the current data source, using the UI wording:

| Label | Meaning |
| --- | --- |
| Synced | The host RPC reads durable session logs and projections; the timeline slices event timestamps into 30-minute slots. |
| Incomplete data | A log is missing, being written or failed validation; known values stay visible with a warning. |
| Refresh failed; last snapshot | This read failed and the panel keeps the last valid result. |
| Local summaries · bundled prices | An older host has no RPC, so the browser estimates from visible projection values with bundled prices. |
| Data diagnostics | Expands to the concrete fallback reason and error. |

“Synced” describes the **data source**, not price certainty: a synced panel can still show `estimated`
or `partial` amounts. Conversely, an `exact` price does not prove the log is complete.

### 5.2 Time zone

Timeline slots, peak/off-peak windows, date ranges and pricing rule times all use explicit Beijing
time (UTC+8), independent of the host machine's time zone.

### 5.3 Exports

- Overview, Timeline and Usage Trends support CSV and JSON.
- CSV is the project table and includes hidden projects; JSON includes sessions and pricing details.
- Exported fields include `costStatus`, `ruleId`, `pricingSource`, provider, model identity and the
  exclusion reason, so amounts can be audited.
- Account Balance has no export: balances are a live snapshot, not historical statistics.
- Credentials never appear in CSV/JSON exports.

### 5.4 Keyboard

- `Tab` cycles inside the panel.
- `Esc` closes the filter, menu or pricing drawer one layer at a time and finally closes the panel.
- `Enter` sorts from a header button and expands or collapses a row.

## 6. Known limitations

- The session projection cache can lag by a few seconds; the panel refreshes every 60 seconds.
- Ordinary archived sessions are marked “archived”; archived, logless forks backed only by inherited
  cache are excluded from statistics and reported in warnings.
- OpenRouter uses a dated model-catalog snapshot, so those amounts are `estimated`.
- An unknown API provider only receives an `estimated` amount when the model uniquely matches, or
  uniquely matches by longest known name, an official rule.
- Overlapping sessions in one project merge into wall-clock timeline intervals; project LLM/tool
  durations remain cumulative work metrics.
- The UI ships Chinese and English.

## 7. Related documents

- [README](../README.en.md) · [中文 README](../README.md)
- [Pricing updates and maintenance](pricing-updates.md)
- [Compatibility matrix](compatibility.md)
- [Architecture and data contracts](../DESIGN.md)
- [0.5.0 release notes](release-0.5.0.md)
