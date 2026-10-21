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

The `desktop` profile is managed by the desktop app itself, so use the CLI bundled with the app.
A `dsh` installed separately from npm refuses to operate on this profile:

```text
error: profile "desktop" is managed exclusively by the Electron application
```

On macOS the bundled CLI and command are:

```bash
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin \
  --profile desktop add -w @rongyi7/dsh-stats
```

Then **quit DSH completely** (Cmd+Q on macOS, not just closing the window) and open it again.
The “Usage” entry sits at the bottom of the sidebar.

Don't edit files under `~/.dsh/profiles/desktop` by hand: the app maintains that profile's
dependencies, bundle registration and patch layer.

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

Install a tarball built locally with `npm pack`. The desktop app uses its bundled CLI here too:

```bash
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin \
  --profile desktop add -w ./rongyi7-dsh-stats-0.5.0.tgz
```

The file name follows the version. For the desktop app, use the §1.1 command with the tarball path
instead of the package name. `0.5.0` is not on npm yet, so `@0.5.0` is not a downloadable example;
local tarballs are only for your own builds and verification.

### 1.5 Verify registration

For Web:

```bash
dsh --profile web --dump-config
```

The output should contain `stats` and `@rongyi7/dsh-stats`. The command regenerates that profile's
`cordis.yml`.

The desktop app does not support `--dump-config`: the command is always refused for the `desktop`
profile, even with the bundled CLI. Instead, open `~/.dsh/profiles/desktop/package.json` and check
that `@rongyi7/dsh-stats` appears in both `dependencies` and `dsh.profile.bundles`, or simply look
for the “Usage” entry at the bottom of the sidebar.

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
| Pricing settings say “Pricing settings are unavailable” | The host did not load the current plugin version. Restart the host. If it persists on Web, check `dsh --profile web --dump-config`; on the desktop app check the sidebar entry or the profile file from §1.5. |

### 1.8 Versions and compatibility

| Item | Status (checked 2026-10-21) |
| --- | --- |
| npm stable | `0.4.3`, published 2026-10-15 |
| This repository (`main`) | `0.5.0`, not published yet |
| Harness bundled in the desktop app | `0.2.1-rc.2` |
| Plugin `0.5.0` declaration | `engines.dsh: >=0.1.0-rc.6 <0.3.0`, plus peer ranges |
| Plugin `0.4.3` declaration | No `engines.dsh`; peer ranges up to `^0.2.0-rc.2` |

Before loading a plugin, the host checks compatibility: an own `engines.dsh` range decides alone, and
only without one does it check every `@deepseek-ai/dsh*` peer range. Both checks let prereleases
participate (`includePrerelease`). So:

- `0.5.0` declares an `engines.dsh` range that covers `0.2.1-rc.2`, so it loads.
- `0.4.3` has no `engines.dsh`, and although its peers stop at `^0.2.0-rc.2`, prereleases participate
  in the comparison, so `0.2.1-rc.2` still falls inside the range and it is **allowed to load**.

Loading is not acceptance. `0.4.3` was verified through `0.2.0-rc.2` by module contracts and browser
fixtures; the plugin version with a complete Web run on `0.2.1-rc.2` is `0.5.0`. Until `0.5.0` ships,
the npm stable release can load in the desktop app, but it is an unverified combination.

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
- A failed refresh only affects its own row and marks it stale.
- When the whole query fails and an earlier successful result exists, the header turns stale and a
  retryable banner appears while existing rows stay visible. With no earlier result, the header shows
  “Read failed” and the account area shows “Account data could not be read” with its own retry button;
  no banner is added in that case.
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
- Price-sensitive suffixes on a fallback match for an unknown provider: when the extra part of the
  model name hits `-mini`, `-pro`, `-vision`, `:batch`, `:free` and similar words, no shorter known
  model price is borrowed. This only limits the fallback; a model with its own rule in the catalog
  (for example `gpt-5.4-mini`) is priced normally.

Those sessions stay out of the primary spend total. The reason is in session details and in the RPC's
`meta.warnings`; exports keep `costStatus`, `ruleId` and `pricingSource` for tracing.

### 3.5 Provider matching

- Pricing is primarily **provider-scoped**: explicitly recognized first-party providers use their
  list prices and are `exact`.
- The DSH pass-through routes `nbdeepseek` and `deepseek-modlens` explicitly inherit DeepSeek's
  official API pricing.
- For an unknown or API-compatible provider, a model that uniquely matches one official rule, or
  uniquely matches at a token boundary by longest known name (for example a regional or deployment
  suffix), keeps its original provider and is marked `estimated`.
- The fallback only applies to models without their own rule: if the extra suffix hits a
  price-sensitive word, no shorter known model price is borrowed. Models with their own rule use
  normal matching and are unaffected.
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
- If the whole query fails while an earlier successful result exists, the header turns stale and a
  retryable banner appears while existing rows stay visible. On a first failure with no data, the
  header shows “Read failed” and the retry lives in the account area instead.
- The DeepSeek account sign-in provider added in Harness 0.1.7 (`deepseek-account`) has no API key
  for the official balance endpoint, so the account page does not list it; the API-key provider is
  queried as before.
- MiniMax configurations without an account type keep the historical Coding Plan default; an explicit
  `accountType: api` is not queried as a subscription.
- Providers without a public balance endpoint still contribute token usage and are listed in the
  “not connected” group with a reason; an account with an endpoint but no credential shows the
  missing variable name.

## 5. Data sources, exports and input

### 5.1 Data sources and status

Three related notices exist in the panel, and they have different triggers.

**The status next to the title** follows the current tab:

| Tab | Label | When it appears |
| --- | --- | --- |
| Statistics | Synced | The host RPC returned statistics without degradation; the timeline slices event timestamps into 30-minute slots. |
| Statistics | Incomplete data | The host flagged degradation (missing or partially written log, failed validation); known values stay visible. |
| Statistics | Refresh failed; last snapshot | This read failed but an earlier successful result exists. |
| Statistics | Local summaries · bundled prices | The browser has no statistics RPC (older host, or the plugin did not load), or the first read failed; it estimates from visible projection values with bundled prices. |
| Balance | Synced | This account query succeeded. |
| Balance | Snapshot expired | An earlier successful result exists but this query failed. |
| Balance | Read failed | The first query failed and there is no usable result yet. |
| Balance | Account service unavailable | The host exposes no account RPC. |

**The failure banner** sits above the content, uses different wording, and adds data diagnostics and
a retry only under the conditions below:

| Title status | Banner text | Data diagnostics | Retry button |
| --- | --- | --- | --- |
| Snapshot expired | Refresh failed; last snapshot | Shown when an error is available | Shown when the matching statistics or account RPC exists |
| Local summaries · bundled prices | Fallback data; may be incomplete | Shown when an error is available | Only when the host still provides the statistics RPC |
| Incomplete data | Incomplete data | Shown when warnings or an error exist | Not shown |
| Synced with warnings | Synced (information style) | Shown | Not shown |

On the balance tab only “Snapshot expired” produces a banner; a first failure (“Read failed”) and
“Account service unavailable” do not, and the first failure offers retry inside the account area.
When the statistics RPC is missing entirely, the banner uses the information style and has no retry.

**Local summaries · bundled prices** belongs to the statistics tabs only: it means the browser is
estimating, and a failed account query never triggers it.

“Synced” describes the **data source**, not price certainty: a synced panel can still show `estimated`
or `partial` amounts. Conversely, an `exact` price does not prove the log is complete.

### 5.2 Time zone

Timeline slots, peak/off-peak windows, date ranges and pricing rule times all use explicit Beijing
time (UTC+8), independent of the host machine's time zone.

### 5.3 Exports

- Overview, Timeline and Usage Trends support CSV and JSON.
- Exports contain the projects **selected by the current scope**: the current date on Overview and
  Timeline (all projects when “All” is selected), and the current range on Usage Trends. Hidden
  projects are included.
- JSON is an array of those projects, not the complete RPC response, so `meta` and `meta.warnings`
  are not part of it. Each project's session usage rows keep the `cost` object returned by the host.
- The UI and summaries use RMB only. USD list prices are converted with the fixed FX snapshot, and the
  converted amount lands in `estimated`; it is never described as a settled provider bill.
- In JSON each usage row has `cost.status`, `cost.ruleId` and `cost.sourceUrl`; USD-priced rows also
  keep `cost.pricing.nativeAmount`, `nativeCurrency`, `fxRate`, `fxDate` and `fxSource`, so the
  original amount and the rate used can be audited.
- CSV is a flat project table with one row per usage. `costStatus` is that row's `cost.status` and
  `pricingSource` is the rule's source URL (the JSON `cost.sourceUrl`). CSV has columns such as
  `currency`, `costAmount`, `exactAmount` and `estimatedAmount`, and no original-currency column.
- Neither export contains the exclusion-reason text; the reason is in the panel's session details.
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
  uniquely matches by longest known name, an official rule; on that fallback, a price-sensitive
  suffix stops the match from borrowing a shorter model's price.
- Overlapping sessions in one project merge into wall-clock timeline intervals; project LLM/tool
  durations remain cumulative work metrics.
- The UI ships Chinese and English.

## 7. Related documents

- [README](../README.en.md) · [中文 README](../README.md)
- [Pricing updates and maintenance](pricing-updates.md)
- [Compatibility matrix](compatibility.md)
- [Architecture and data contracts](../DESIGN.md)
- [0.5.0 release notes](release-0.5.0.md)
