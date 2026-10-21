<h1 align="center">DSH Usage</h1>

<p align="center">A usage dashboard for DeepSeek Harness: tokens, development time and estimated cost by project, plus balances and quotas for configured accounts.</p>

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/README.md">简体中文</a> · <strong>English</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@rongyi7/dsh-stats"><img src="https://img.shields.io/npm/v/@rongyi7/dsh-stats?color=1677ff&amp;label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@rongyi7/dsh-stats"><img src="https://img.shields.io/npm/dm/%40rongyi7%2Fdsh-stats?label=downloads" alt="npm monthly downloads"></a>
  <a href="https://github.com/rongyishuaige7/dsh-stats/actions/workflows/ci.yml"><img src="https://github.com/rongyishuaige7/dsh-stats/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@rongyi7/dsh-stats?color=8b5cf6" alt="license"></a>
</p>

DSH Usage is a usage dashboard for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), available in the desktop app and on the web. It reads DSH session records and organizes tokens, development time and estimated cost by project, date and model. When a price cannot be confirmed it says so instead of guessing. `(｡•̀ᴗ-)✧`

The UI brand is **DSH Usage**; the install package is still **`@rongyi7/dsh-stats`**, the dependency name existing profiles already use. Both refer to this plugin.

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/overview.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/hero-overview.png" alt="Light-mode overview with estimated cost, token composition and the project table" width="100%"></a>
  <br>
  <sub>Light mode · real desktop data with sensitive values masked · click for the full overview</sub>
</p>

> Except for the account balance page, screenshots come from the desktop app; project names, paths, session titles, account names and amounts are masked as xxxx. The balance page still uses isolated fixture demo data. They contain no API keys, cookies, management tokens or session content. Costs are derived from public prices; the provider's bill remains authoritative.

## 📦 Installation

The plugin installs into a DSH profile. The desktop app and Web are separate profiles (`desktop` and `web`); installing into one does not install into the other. The `-w` flag is pnpm's workspace install option, not a file path.

### Desktop app

Install with the CLI bundled with the desktop app (macOS path below; on other systems use the matching `dsh` inside the app directory):

```bash
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin \
  --profile desktop add -w @rongyi7/dsh-stats
```

Then quit DSH completely (Cmd+Q on macOS, not just closing the window) and open it again. The “Usage” entry sits at the bottom of the sidebar.

The desktop profile is managed by the app itself: a `dsh` installed separately from npm refuses to operate on the `desktop` profile. See the [installation section of the guide](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/usage-guide.en.md#11-desktop-app) for details.

### Web

```bash
dsh plugin --profile web add -w @rongyi7/dsh-stats
```

Restart the Web host (`dsh web`), then reload the page. Reloading the browser alone does not reload host-side plugins.

For a custom profile, replace `desktop` / `web` with the real profile name.

### Versions and requirements

The plugin requires Node.js 22 or newer. The desktop app ships its own runtime, so no separate Node install is needed there.

The npm stable release is `0.5.0` (published 2026-10-21); both the desktop app and Web can install it, and the interface notes below follow this release. `0.5.0` was verified on DSH `0.2.1-rc.2` by module contracts, browser fixtures and a real Web run. `0.4.3` declares Harness peers up to `0.2.0-rc.2`; the host's compatibility check lets prereleases participate, so `0.2.1-rc.2` still allows it to load, but it was only verified through `0.2.0-rc.2` — upgrading to `0.5.0` is the verified path.

Pinned versions, local tarballs, registration checks, upgrades and pnpm troubleshooting are in the [installation section of the guide](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/usage-guide.en.md#1-installation).

## 🖼️ Interface

The panel has four tabs. The header always shows the data-source status, refresh, export, pricing settings and close. The panel title “DSH Usage” is itself a link to the project repository and opens GitHub in a new window.

Keyboard: `Tab` cycles inside the panel; `Esc` closes the filter, menu and pricing drawer one layer at a time and finally the panel; `Enter` sorts from a header button and expands or collapses a row.

### Overview

Usage and estimated cost by project: sort by any column, expand a project for turns/steps, tool time, first token, tok/s and session details, and search or hide projects in the top-right. Hidden projects are excluded from metrics and trends. Projects page 50 at a time and sessions 100 at a time; paging never changes the top summary.

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/overview.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/overview.png" alt="Overview with summary metrics and the project table (real data, sensitive values masked)" width="100%"></a>
</p>

### Timeline

The day view arranges projects as lanes above half-hour cost or token bars; click a segment or bar for that half hour, or expand a lane to open its sessions. The all view is a calendar matrix, 30 days per page; click a cell to open that day.

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/timeline.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/timeline.png" alt="Timeline day view (real data, sensitive values masked)" width="100%"></a>
</p>
<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/timeline-all.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/timeline-all.png" alt="Timeline all view as a calendar matrix (real data, sensitive values masked)" width="100%"></a>
</p>

### Usage trends

Ranges are the last 7, 30 or 90 days, and the metric switches between cost and tokens. The summary strip gives the range total, daily average and top model; daily bars follow, then a fixed 26-week activity heatmap, and a model share table for the current metric. Clicking a bar or heat cell opens that day in the overview.

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/trends.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/trends.png" alt="Usage trends, activity heatmap and model shares (real data, sensitive values masked)" width="100%"></a>
</p>

### Account balance

Every connected account appears in one list, ordered by urgency: exhausted or nearly exhausted quotas, invalid credentials and stale snapshots come first. With multiple accounts, the strip totals available balance per currency and shows the tightest quota and how many accounts need attention. Each balance account can have an alert line, saved in this browser only.

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/balance.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/balance.png" alt="Multi-account balance list, summary strip and not-connected group (demo data)" width="100%"></a>
</p>

### Pricing settings

The gear icon opens the pricing settings drawer with three fixed sections: models, custom rules, and updates & versions. Search models and inspect current and historical rules; fill in a custom rule, preview its impact, then save; manage automatic updates, pinned versions and catalog snapshots.

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/prices-drawer.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/prices-drawer.png" alt="Pricing settings drawer with models, custom rules and updates (real data, sensitive values masked)" width="100%"></a>
</p>

## 💰 Data and cost

- **Costs are estimates.** Rates are per million tokens and the UI and summaries use RMB only. USD list prices are converted with the fixed FX snapshot `1 USD = 6.7205 CNY` (`2026-08-26`, [Frankfurter](https://api.frankfurter.app/2026-08-26?from=USD&to=CNY)), and the converted amount counts as an estimate; live rates are never applied. JSON exports keep each usage row's original-currency amount and the rate used, so amounts stay auditable.
- **Three amounts.** `¥12.34` is priced, `¥12.34*` means some usage is unpriced, and “Awaiting price” means no safe rule applies. The ⓘ next to the cost explains it.
- **Subscriptions are not converted.** Subscription and token-plan usage never becomes API spend; unknown models, explicit relay/local routes without a custom rate, and conflicting rules are not guessed either. They stay out of the primary total; the reason is in session details, and exports keep `costStatus`, `ruleId` and `pricingSource` for tracing.
- **The title status** follows the current tab: on the statistics tabs it describes where the data came from (“Synced”, “Incomplete data”, “Snapshot expired”, “Local summaries · bundled prices”), and on the balance tab it describes the latest account query.
- **The banner above the content** uses different wording: “Snapshot expired” pairs with “Refresh failed; last snapshot”, and “Local summaries · bundled prices” pairs with “Fallback data; may be incomplete”. Data diagnostics appear only when an error is available, and retry appears only for expired or fallback states while the matching RPC still exists.
- **Data source and price certainty are different things.** The status describes where the data came from; amounts carry their own `exact` / `estimated` / `free` / `partial` / `unsupported` status.
- **Credentials stay on the host.** Account queries resolve credentials in the DSH host and call each provider's official endpoint; credentials never enter the client bundle, RPC logs or CSV/JSON exports.
- **Export scope.** Overview, Timeline and Usage Trends support CSV/JSON and export the projects selected by the current date or range; Account Balance is a live snapshot and has no export.
- **Time zone.** Timeline slots, peak/off-peak windows and pricing rule times use Beijing time (UTC+8), independent of the host machine.

Full pricing statuses, provider matching, custom rules and catalog updates are in the [pricing section of the guide](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/usage-guide.en.md#3-pricing); catalog collection and signing are described in the [pricing design](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/pricing-updates.md).

## ❓ FAQ

<details>
<summary><strong>Why is the “Usage” entry missing after installing?</strong></summary>

Confirm the install command succeeded, then fully restart the host (quit the desktop app, or restart `dsh web`) and hard-refresh the browser if needed. DSH caches client modules and Typert descriptors. Also confirm you installed into the profile you are running: installing into `web` does not add the entry to `desktop`.
</details>

<details>
<summary><strong>Why does the cost look incomplete?</strong></summary>

The primary total only includes amounts that can be confirmed and converted to RMB. Subscription usage, unknown models, explicit relay/local routes and archived logless forks are not guessed and are therefore excluded; the reason is in session details, and exports keep `costStatus`, `ruleId` and `pricingSource` so each case can be traced.
</details>

<details>
<summary><strong>Why is an account missing from the balance tab?</strong></summary>

Account queries use each provider's official balance endpoint. Providers without a public endpoint appear in the “not connected” group with a reason, and token statistics are unaffected; an account with an endpoint but no credential shows the missing variable name. DeepSeek's `deepseek-account` sign-in has no API key to query. Credential variables and overrides are in the [accounts section of the guide](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/usage-guide.en.md#4-accounts-and-credentials).
</details>

<details>
<summary><strong>How do I update?</strong></summary>

Run the install command for that profile again with the target version, then restart the same way you installed. The price catalog updates independently: the host checks the signed catalog at startup and hourly, so a price change needs no reinstall.
</details>

## ⚠️ Known limitations

- The session projection cache can lag by a few seconds; the panel refreshes every 60 seconds.
- Ordinary archived sessions are marked “archived”; archived, logless forks backed only by inherited cache are excluded from statistics.
- OpenRouter uses a dated model-catalog snapshot, so those amounts are `estimated`.
- Overlapping sessions in one project merge into wall-clock timeline intervals; project LLM/tool durations remain cumulative work metrics.

## 🛠️ Development and docs

```bash
npm ci
npm run build
npm test
```

`lib/` is generated output: edit `src/`, then rebuild. Architecture, data contracts and performance trade-offs are in [DESIGN.md](https://github.com/rongyishuaige7/dsh-stats/blob/main/DESIGN.md); per-release module contracts, complete Web runs and browser-fixture results are in the [compatibility matrix](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/compatibility.md). `npm run smoke:browser` checks the desktop and mobile UI with isolated fixtures.

Documentation index:

- [Usage guide](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/usage-guide.en.md) (English) · [使用指南](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/usage-guide.md) (中文)
- [Pricing updates and maintenance](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/pricing-updates.md)
- [Compatibility matrix](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/compatibility.md)
- [0.5.0 release notes](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/release-0.5.0.md)

## 🙌 Contributing and license

Open an [issue](https://github.com/rongyishuaige7/dsh-stats/issues) or send a pull request. Licensed under the [MIT License](https://github.com/rongyishuaige7/dsh-stats/blob/main/LICENSE).

`╰(*°▽°*)╯`
