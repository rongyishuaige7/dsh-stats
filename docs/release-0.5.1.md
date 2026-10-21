# 0.5.1 release

Patch release, 2026-10-21. The pricing drawer now explains why saving needs a
preview.

## Highlights

- **Preview-before-save hint**: with a staged custom rule, or any other unsaved
  pricing change, the drawer footer shows “保存前请先预览影响” while “保存” is
  disabled. Clicking “预览影响” switches the line to “正在计算影响…” until the
  impact summary replaces it and unlocks “保存”. Previously the disabled button
  had no explanation.

Everything else is unchanged from 0.5.0: same pricing catalog, RPC contracts,
peer ranges and Harness compatibility.

## Verification

- Full test suite: **505 tests** pass in the default timezone and `TZ=UTC`.
- Browser fixture: **50 check groups / 80 screenshots**, 0 console errors,
  0 runtime exceptions, 0 failed requests. The custom-rule group asserts the hint
  before the preview, that the summary replaces it, and that “保存” unlocks only
  after the preview.
- Fresh build matches committed `lib/*`; `npm pack` preview contains the same ten
  files as 0.5.0.

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
