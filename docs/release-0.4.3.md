# 0.4.3 release

Compatibility release for DeepSeek Harness 0.2.0 series (`@deepseek-ai/dsh@0.2.0-rc.2`).

- **Peer dependencies**: expanded peer declarations across 14 active Harness packages to include `|| ^0.2.0-rc.2`, extending verified coverage from `0.1.2-rc.1` through `0.2.0-rc.2`.
- **Per-record storage layout**: implemented dual reading for `dsh-storage-json` per-record layout (`storages/session_projcache/sessions/<sessionId>.json`), seamlessly falling back to legacy single-file `storages/session_projcache.json`.
- **Projection domain versions**: updated projection cache domain version checks to accept versions 3 through 7 (`dsh-session-projection-cache` 0.2.0 bumped domain version to 7).
- **Token meter row state**: updated `tokenUsage` row checks to accept state versions 1 and 2 (`dsh-token-meter` 0.2.0 bumped stateVersion to 2 for `llm/retry-started` transaction rollback).
- **Verification**:
  - Full test suite: 260 tests passing in local timezone and `TZ=UTC`.
  - Upstream contract smoke: verified against isolated `@deepseek-ai/dsh@0.2.0-rc.2` installation passing all 6 integration checks.
  - Browser UI smoke: verified in headless Chrome across 3 viewports, light/dark themes, English/Chinese locales (27 screenshots, 0 errors).
