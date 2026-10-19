# 切片 5（余额）：账户余额页重做实施文档

- 状态：原型已确认，交接前已按代码逐条核对，可以开始实施
- 日期：2026-10-19
- 基线：`aa0d953`（`package.json` 仍是 0.5.0，尚未打 tag）
- 设计参考：[`docs/prototypes/balance-0.5.x.html`](prototypes/balance-0.5.x.html)。自包含静态原型，可切换宽度（1180/760/390）、场景（多账户、单账户、需要处理、刷新失败、首次加载）和主题，可打开改动标注。原型数据是虚构样例。
- 上位文档：[`docs/ui-overhaul-0.5.0.md`](ui-overhaul-0.5.0.md)。其中 §3 兼容约束、§10 门禁、对话框与焦点约定（§7.2）继续适用。本文替代那份文档 §8"切片 5"中余额那一条（"多账户网格，`.dss-provider-picker` 保留为窄屏回退"），也修改 D6 中"余额标签页隐藏状态点"的规定（见 B10）。
- 范围：只改"账户余额"标签页，以及它和头部状态点、横幅、刷新按钮之间的接线。切片 5 里趋势的三条不在本文范围，另起文档。

本文写明每个子切片改哪些文件、加哪些函数和组件、怎样测试、怎样验收。实现和原型冲突时以本文为准；本文没写到的视觉细节以原型为准。

## 0. 实施约定

1. 按 §8 的顺序做 5a → 5b → 5c → 5d → 5e：每片一个聚焦提交，推送后 CI 全绿，并且审核通过，才开始下一片。审核意见在下一片开工前修完，修正单独提交。
2. 开工前确认工作区干净。本文和原型如果还没提交，由维护者先提交，不要并进 5a。基线之后工作区里如果有维护者未提交的改动（例如宿主 `src/host-*.js`、`src/index.js`），它们不属于本文，不要提交、不要还原、不要顺手修改；用 `git add <具体文件>` 只提交本片文件。
3. `lib/*` 只能由 `npm run build` 生成，并和对应源码在同一个提交里。不要手改 `lib/`、`data/pricing/`、宿主代码（`src/index.js`、`src/host-*.js`、`src/accounts.js`）、`src/rpc-schemas.cjs` 和 RPC 描述符，也不要改原型文件。
4. 原型用字符串拼 HTML 只是演示。插件里一律用 `createElement`；账户名、套餐名、凭证键名、宿主错误信息这些外部数据不能进入 `innerHTML`。tooltip 继续走 `tipRows()`，它内部已经用 `esc()` 转义。
5. 以下情况先停下来，找维护者确认后再继续：
   - 需要偏离 §4 的 B1–B14；
   - 需要新增依赖，或改动宿主、RPC schema 或描述符；
   - 本文与代码对不上；
   - 打 tag 或发布 npm。
6. 每片完成后汇报以下内容：
   - 提交哈希和 CI 运行链接；
   - 测试数量；
   - 浏览器 smoke 的 `report.checks` 在改造前后的对比（检查组数量不得减少），以及截图数量；
   - 检查过哪些截图，发现了什么问题；
   - 本片没有做或推迟的事项。
7. 提交信息沿用仓库格式：`feat(balance): ...`、`test(smoke): ...`、`docs: ...`。

## 1. 现状问题

以下问题来自基线代码和 CI 截图（run 39249288862 的 `desktop-balance`、`desktop-subscription`、`narrow-dark-stale-balance`）：

| # | 问题 | 位置 |
| --- | --- | --- |
| a | 一次只能看一个账户：配了多个 Provider 时，要逐个切下拉框才知道哪个快用完了 | `BalanceView` `src/client.cjs:148-219`，`selectedId` `:153` |
| b | 下拉框标签会重名：优先显示 `providerFamily`，`moonshotai` 和 `kimi-coding` 都显示成 "moonshot"（`src/pricing.cjs` 的 family 映射） | `providerPickerLabel` `:139-146` |
| c | 页面状态只看第一个账户：`state.kind` 取 `accounts[0].status`，警告取 `warnings[0].message`，和当前选中的账户可能对不上；警告是宿主的英文原文 | `:351-353` |
| d | 两种卡片外观：DeepSeek 有专属渐变卡，用 12 个专用 token；其他 Provider 是普通卡片，切换账户时视觉重量跟着变 | `.dss-balance-account.provider-deepseek`（`src/client-styles.cjs:163`），token `:72-83`、`:151-157` |
| e | 空间利用差：1440px 下一张卡只占面板约 1/3；充值、赠送两个框各占半宽，里面只有一个数字 | `.dss-balance-list`、`.dss-balance-breakdown` |
| f | 订阅信息主次颠倒：套餐名出现三次，用的是全页最大字号（`--dss-fs-2xl`），额度数字反而是小字 | `:192`、`:204` |
| g | 额度条读反了：条宽是 `usedPercent`，旁边写"68% 剩余"；额度低时不变色；重置时间只有绝对时刻 | `:207-209` |
| h | 和另外三页不一致：正文标题重复 tab 名，头部不显示状态点，加载时只有一行文字 | `:175`、`:528`、`:157` |
| i | 整次查询失败时：首次失败把原始错误放进正文黄框，同时显示"暂无账户数据"，像是没有账户；没有重试按钮 | `:185-186`、`:356` |
| j | 宿主已提供但没用上：`balance.unlimited` 不显示；OpenRouter 的 `total/used` 只是两行文字；`stats/providers` 描述符已注册（`src/client-remote.cjs:82`），客户端从不调用 | |

## 2. 目标与非目标

### 目标

1. 一屏看完所有已接入账户：哪个用完了、哪个快用完了、哪个读不到，排在最前面。
2. 每个账户的状态只在它自己那一行；页面级状态（头部状态点、横幅）只反映整次查询。
3. 文案全部来自 locale，中英都有；宿主的英文 `warnings[].message` 不进入正文。
4. 和另外三页一致：头部状态点、token 与六档字号、只有 `.dss-body` 一个滚动容器、键盘可达、Esc 按层关闭。
5. 可以给每个余额账户设一条提醒线，低于它时这一行变成"余额偏低"并排到前面。

### 非目标

- 不改宿主（`src/index.js`、`src/accounts.js`、`src/host-*.js`）、RPC schema、描述符和 Harness 契约。本页需要的数据宿主都已提供（见 §3）。
- 不做"近 7 天消耗 · 可用天数"，余额页不读会话统计。
- 不做汇率换算。余额按币种分别合计。
- 不做卡片网格，也不保留下拉框作窄屏回退。
- 余额页不加导出（沿用上位文档 D7）。
- 提醒只在面板里显示，不做系统通知，不跨设备同步。
- 不新增依赖，不使用 primitives 的 Modal/Tooltip/Menu。
- 不改趋势页。

## 3. 数据与兼容约束

### 3.1 数据来源（全部现成）

| 用途 | 来源 | 说明 |
| --- | --- | --- |
| 账户列表 | `stats/account(force)` → `{generatedAt, accounts[], warnings[]}` | 字段见 `src/rpc-schemas.cjs:85-101`。`accounts` 的顺序就是宿主的 Provider 配置顺序（`collectAccounts`，`src/accounts.js`） |
| 余额 | `account.balance = {currency, remaining, used, total, toppedUp, granted, unlimited}` | `used/total/toppedUp/granted` 可为 `null`；失败且没有旧快照时整个 `balance` 是 `null` |
| 订阅额度 | `account.windows[{kind, usedPercent, remainingPercent, resetsAt}]` | 宿主产生的 `kind` 有 `session`、`weekly`、`billing`；`resetsAt` 可为 `null` |
| 自定义路由 | `account.adapter === "generic-usage"` | pi-ai 等自定义路由的 `providerFamily` 是 `unknown`，不能用来显示 |
| 未接入 | `status === "not-configured"`（`missingCredential` 是凭证键名）或 `status === "unsupported"` | 由 `emptyAccount` 生成，`balance` 为 `null`，`actionUrl` 可能有值 |
| 过期快照 | `stale === true` | 网络错误、限流、异常响应时宿主保留上一次成功快照，`status` 是这次的失败原因，`lastSuccessAt` 是那次成功的时间 |
| 首次加载骨架 | `stats/providers()` → `{generatedAt, providers[{id, displayName, accountMode, adapter, configured, status, …}]}` | 只读本地配置和缓存，不请求 Provider。描述符已注册（`src/client-remote.cjs:82`），本文第一次调用它 |
| 警告 | `warnings[{providerId, code, message}]` | 宿主为每个非 ok 账户生成一句英文。新界面只认 `code`，不显示 `message` |

### 3.2 降级情况

- **旧宿主没有 `stats/account`**：`readAccountRemote` 回退到 `stats/current`，只有 DeepSeek 一行，并追加 `code: "LEGACY_ACCOUNT_API"` 的警告（`src/client-remote.cjs:44-48`）。新界面显示一行本地化说明（B12），不显示这条警告的英文原文。
- **旧宿主没有 `stats/providers`，或调用失败**：骨架退回 3 行无名占位（B11），不报错。
- **remote 挂载失败**（`props.balance` 为空）：头部显示"账户服务不可用"，正文一行说明，没有重试（B10）。

### 3.3 兼容

| 约束 | 要求 |
| --- | --- |
| Harness / React | 同上位文档 §3：用宿主注入的 React 18 和 `createElement`，不引入 JSX |
| 浏览器 | 不抬高上位文档 §3 的最低版本。不用 `color-mix()` |
| 时区 | 绝对时刻一律用 `fmtClock`（北京时间 `YYYY-MM-DD HH:MM`）；相对时间只用时间戳差值。不用 `Date#getHours()` 这类本地时区方法。§9.3 第 13 条会在上海和洛杉矶两个时区比较余额页的 `innerText` |
| RPC 调用次数 | 保持现有 smoke 断言：余额只在它的标签页查询，键盘扫过标签页不查询，强制刷新只生效一次（`scripts/browser-fixture-smoke.mjs:224-232`、`:257-266`）。`stats/providers` 同样只在余额页调用，并且每次挂载最多一次 |
| 偏好 | `dsh-stats.tab`、`hidden`、`nav`、`timeline` 不变；新增 `dsh-stats.balanceAlerts`（B8），旧版本没有这个键时取 `{}` |
| 主题 | 深色是 CSS 回退值；浅色写在 `body:not([data-ds-dark-theme])` 下的 token 重定义里 |

## 4. 已锁定的设计决策

**B1 列表布局。** 删除 `.dss-provider-picker` 下拉框和"一次一张卡"。所有已接入账户放进一个列表，每行三列：账户 | 余额 / 剩余额度 | 操作。宽屏有列头；面板 ≤640px 时每行改为两行（账户与操作在上，余额在下），并隐藏列头。不做卡片网格。

**B2 紧急程度与排序。** 每个账户按 B7 的标签得到一个色调：`danger`、`warn` 或 `ok`（没有标签就是 `ok`）。列表按色调降序排列（danger → warn → ok），同一色调内保持宿主给出的顺序（稳定排序）。未接入的账户（`not-configured`、`unsupported`）不进列表，归入 B9 的折叠组。

**B3 摘要条。** 列表里的账户 ≥2 个时，在列表上方显示摘要条；只有 1 个时不显示。最多三格：
- **可用余额**（首格，大字）：只统计 `mode === "balance"`、`balance` 不为空且不是 `unlimited` 的账户，按币种分别合计，用整数"分"累加以避免浮点误差。有 CNY 时 CNY 是大字，否则取第一个出现的币种。副行依次为：其他币种合计（用" · "连接）、"N 个余额账户"、"N 个为过期快照"（`stale` 账户数，为 0 时省略）、"N 个未读到"（`balance` 为空的余额账户数，为 0 时省略）。没有任何可合计金额时大字显示"—"。
- **最紧的额度**：所有订阅账户所有窗口中 `remainingPercent` 最小的那个，相同时取先出现的。大字是"剩余 X%"，按 B6 的阈值着色；副行是"<账户名> <窗口名> · <相对重置时间>"。没有任何订阅窗口时这一格不渲染，网格改为两列。
- **需要关注**：列表中色调不是 `ok` 的账户数，按其中最严重的色调着色。副行按 B2 的顺序列出账户名（每个名字不换行），用"、"连接；为 0 时大字是"0"，副行是"全部正常"，不着色。

**B4 账户行。** 左列依次是状态点（色调颜色，`aria-hidden`）、账户名（单行省略）、副行和标签（只在异常时出现，见 B7）。正常的行没有可见标签，只在名字后放一个仅读屏可见的"状态正常"。
- 副行取第一个成立的规则：
  1. `plan` 非空且不等于 `displayName`：`订阅 · <plan>`（余额账户写 `余额 · <plan>`）；
  2. `adapter === "generic-usage"`：`余额 · 自定义路由`；
  3. 否则：`<类型> · <id>`，类型是"订阅"或"余额"。

  同一 family 的账户因此不会重名，这一行也取代了旧的 `providerPickerLabel`。
- 右列依次是余额提醒铃铛（B8）和外链。外链只在 `actionUrl` 是 `https:` 时渲染：余额账户写"充值"，订阅账户写"管理"；`target="_blank" rel="noreferrer"`，链接内带仅读屏可见的"（新标签页打开）"。

**B5 余额列。**
- 余额账户、`balance` 不为空：
  - 大字是 `remaining`（B13）。`stale` 时用次要文字色；为 0 时用 danger 色。
  - 大字右侧的副行依次为：`充值 X`、`赠送 X`、`已用 X / Y`（`used` 与 `total` 都不为空时）、`提醒线 X`（B8，余额低于它时这一段用 warn 色）。值为 `null` 或 0 的项省略，用" · "连接。
  - `unlimited` 时大字是"不限额"（次要文字色），不画额度条。
  - `total > 0` 时，下面再画一条"可用"额度条，比例是 `remaining / total`，夹在 0–100。这条始终用强调色，不套 B6 的阈值：余额是否偏低只由提醒线决定，避免条变黄了却没有标签。
- 余额账户、`balance` 为空（失败且没有旧快照）：大字位置显示"—"，下面是原因（B7）。
- 订阅账户：每个窗口一条 B6 额度条，顺序同 `windows`。`windows` 为空时显示"—"和原因。

**B6 额度条。** 一条额度条有四段：窗口名 | 条 | 百分比 | 相对重置时间。
- 条宽是 `remainingPercent`，不是 `usedPercent`。`remainingPercent < 20` 用 warn 色，`< 5` 用 danger 色；`<= 0` 时整条轨道换成 danger 的浅底和描边。
- 百分比向下取整：≥10 取整数；<10 保留一位小数并去掉末尾的".0"（4.0 → "4%"，4.56 → "4.5%"）。一律向下取，是为了让数字和颜色阈值不打架，例如 4.96 显示"4.9%"并且是红色，不会显示"5%"却是红色。
- 相对重置时间按分钟向下取整：`<1` 分钟或已过去是"即将重置"；`<60` 分钟是"N 分钟后重置"；`<24` 小时是"N 小时 M 分后重置"；其余是"N 天 M 小时后重置"。为 0 的末项省略（"2 小时后重置"、"1 天后重置"）。`resetsAt` 为 `null` 时这一段为空。
- 重置时间可聚焦，悬停或聚焦时用 tooltip 显示"北京时间 <fmtClock> 重置"。
- 条本身是 `role="meter"`，带 `aria-valuemin="0"`、`aria-valuemax="100"`、`aria-valuenow`（向下取整后的数值）和完整的 `aria-label`："<窗口名>剩余 X%，北京时间 YYYY-MM-DD HH:MM 重置"（没有重置时间时去掉逗号后半句）。
- 窗口名来自 `balance.window.<kind>`；locale 里没有这个键时直接显示 `kind`。
- "现在"在渲染时取一次 `Date.now()`，不开定时器；60 秒自动刷新会重新渲染。

**B7 标签与原因。** 每行最多一个标签，取下表第一个成立的条件：

| 条件 | 色调 | 标签 |
| --- | --- | --- |
| `stale` | warn | 已过期 |
| `status === "unauthorized"` | danger | 凭证无效 |
| `status === "blocked"` | danger | 已拦截 |
| `status === "rate-limited"` | warn | 请求受限 |
| `status === "unavailable"` | warn | 暂不可用 |
| `status === "invalid-response"` | warn | 响应异常 |
| 订阅：最小 `remainingPercent <= 0` | danger | 额度已用完 |
| 订阅：最小 `remainingPercent < 5` | danger | 额度将用完 |
| 订阅：最小 `remainingPercent < 20` | warn | 额度紧张 |
| 余额：`remaining === 0` 且不是 `unlimited` | danger | 余额已用完 |
| 余额：低于提醒线（B8） | warn | 余额偏低 |
| 其他 | ok | 无标签 |

金额下方的原因行只在以下情况出现，取第一个成立的：
1. `stale`：有 `lastSuccessAt` 时写"刷新失败，显示的是 <fmtClock(lastSuccessAt)> 的结果"，否则用 `balance.staleHint`。原型写的是"最近几次刷新失败"，但宿主一次失败就会标记 `stale`，所以改为"刷新失败"。
2. `status` 不是 `ok`：用 `balance.message.<status>`。原型里 `unauthorized` 的原因带了凭证键名，客户端拿不到失败账户的凭证键名，所以不带。
3. 余额为 0：写"余额为 0，充值后才能继续调用"。

额度紧张和余额偏低不加原因行，颜色和提醒线已经说明了。宿主的 `warnings[].message` 和 `errorCode` 都不进入行内文字。

**B8 余额提醒。**
- 存储：`usePref("balanceAlerts", {})`，即 `localStorage["dsh-stats.balanceAlerts"]`，形如 `{"deepseek-official": {"amount": 20, "currency": "CNY"}}`。读出后一律经过 `normalizeBalanceAlerts`，丢弃不合法的条目。列表里暂时没有的账户条目保留，不清理，因为账户可能只是暂时从配置里移除。
- 生效条件：账户是余额账户，`balance` 不为空、不是 `unlimited`，并且 `balance.currency === alert.currency`。币种变了，提醒就自动失效，不做换算。生效后 `0 < remaining < amount` 时是"余额偏低"（warn）。`remaining === 0` 时始终是 B7 的"余额已用完"，与是否设了提醒无关。
- 铃铛：只出现在余额账户、并且 `balance` 不为空（知道币种）的行。失败且没有旧快照的行暂时没有铃铛，已保存的提醒不受影响。有生效的提醒时铃铛加 `.is-on`，用强调色并填充图标。
  - `aria-label`："<账户名> 余额提醒：低于 X"或"<账户名> 余额提醒：未设置"。
  - `title`："余额提醒"。
  - 带 `aria-haspopup="dialog"` 和 `aria-expanded`。
- 弹层：用 `Popover`（§7.4 的扩展）。内容是一个 `form`：
  - 标题"<账户名> 余额提醒"；
  - 输入框：前缀"低于 ¥/$/<币种>"，`inputmode="decimal"`、`autocomplete="off"`、占位"例如 20"、`aria-label="提醒金额（<币种>）"`，带 `data-popover-autofocus`。已设置时预填当前金额。
  - 错误文字：出错时显示，输入框带 `aria-invalid="true"` 和指向它的 `aria-describedby`；
  - 说明："余额低于这个金额时，这一行显示"余额偏低"并排到前面。按 <币种> 比较，不换算汇率；只保存在当前浏览器。"；
  - 按钮：已设置时才有的"清除提醒"（靠左）、"取消"、"保存"（`type="submit"`）。
- 校验：`validateAlertAmount(raw)` 先去掉空白、半角和全角逗号，然后必须匹配 `^\d+(\.\d{1,2})?$`，并满足 `0 < n <= 1e9`。提交时：
  - 合法：保存并关闭；
  - 为空且已设置：清除并关闭；
  - 为空且未设置：提示"请输入金额"；
  - 其他：提示"请输入大于 0 的金额，最多两位小数"。

  出错时焦点留在输入框。
- 关闭与焦点：
  - 保存、清除、取消、Esc 都会关闭弹层，并把焦点还给铃铛；
  - 在弹层外的面板内按下指针时关闭，不还原焦点，和现有 `Popover` 的做法相同；
  - 同一时间只开一个弹层：打开另一个铃铛时，按下指针会先关掉前一个。
- 排序变化：保存后这一行可能移到别的位置。行以 `account.id` 为 key，React 只移动节点，焦点仍在铃铛上（§9.3 第 16 条断言）。
- 翻转：弹层默认在铃铛下方。如果会越过 `.dss-body` 可视区底部，并且上方放得下，就翻到上方（`.is-up`）。
- 自动刷新：60 秒刷新不关闭弹层，也不清空输入。如果刷新后这个账户不在列表里了，弹层随行卸载；这时焦点如果还在弹层里，交给 `.dss-panel`（它已经是 `tabIndex=-1`），不能掉到 `body`。
- 不做原型里的 toast。保存的结果直接体现在这一行：铃铛变蓝，副行出现"提醒线"。

**B9 未接入。**
- `not-configured` 和 `unsupported` 的账户收进列表下方一个 `<details>`，默认收起。摘要写"未接入 N 个：A · B"。
- 展开后每个账户一行：名字、原因，有 `https:` 的 `actionUrl` 时再加一个"控制台"外链。原因是：
  - `not-configured`："未配置凭证 `<missingCredential>`"，键名放在 `<code>` 里；`missingCredential` 为空时用 `balance.notConfigured`；
  - `unsupported`："没有可用的官方账户查询接口，不影响 Token 统计"。
- 展开状态存在组件内，60 秒刷新不会收起它。
- 所有账户都未接入时，列表位置写"还没有可查询的账户"，并默认展开这个 `<details>`。`accounts` 为空时只写 `balance.empty`。

**B10 头部状态点与横幅。** 修改上位文档 D6：余额标签页也显示状态点，`BalanceView` 不再自己显示整页状态。`balanceHeaderState(state, data, hasRemote)` 把余额状态映射成 `StatusIndicator` 用的 `{kind, at, error}`：

| 情况 | kind | 文字 | 点 |
| --- | --- | --- | --- |
| 没有 remote | `unavailable` | 账户服务不可用 | 灰 |
| 首次读取，没有数据 | `loading` | 正在读取 | 强调色闪烁 |
| 有数据，正在刷新 | `refreshing` | 正在刷新 | 强调色闪烁 |
| 成功 | `exact` | 已同步 · <fmtClock(generatedAt)> | 绿 |
| 失败，但有上次数据 | `stale` | 快照已过期 · <fmtClock(上次 generatedAt)> | 黄 |
| 失败，没有数据 | `error` | 读取失败 | 红 |

- 单个账户失败只影响它自己那一行，不改变状态点。
- 状态点的 `title` 是"官方账户接口 · <文字>"。
- 横幅只在 `stale` 时出现：复用 `StatusBanner`，即 `.dss-status-banner.stale`，写"刷新失败，显示上次快照"，`<details>` 里是这次 RPC 的原始错误，带"重试"按钮（`data-action=retry`）。
- `error` 不出横幅，正文写"没有读到账户数据"，`<details>` 里是原始错误，带"重试"按钮（`data-action=balance-retry`）。
- `unavailable` 正文只写一行 `balance.unavailable`，没有重试。
- 删除正文里的"更新时间"和每张卡的"上次成功"。
- 刷新按钮的禁用条件不变（`loading` 或 `refreshing`）。点刷新、点重试都绕过宿主缓存一次（`force: true`）。

**B11 首次加载骨架。**
- 余额页第一次读取、还没有任何账户数据时，并行调用一次 `stats/providers`（每次挂载最多一次）。`stats/account` 先回来时，`providers` 的结果不再使用。
- `providers` 中 `status === "unsupported"` 或 `configured === false` 的账户，进入 B9 的折叠组，原因同 B9（键名未知时用 `balance.notConfigured`）。其余每个一行骨架：
  - 名字、副行"<类型> · <id>"、灰色状态点；
  - 余额列两条占位条：订阅为 60% 宽，余额为 110px 宽，下面一条 36% 宽。
- 骨架行 ≥2 个时，上方加摘要条骨架。底部写"正在读取 N 个账户…"。
- `providers` 还没回来、不可用或为空时，显示 3 行无名占位，没有摘要条骨架，底部写 `balance.loading`。
- 骨架区域带 `aria-busy="true"`，占位条 `aria-hidden`。`prefers-reduced-motion` 时占位条不闪烁。
- 之后的刷新不再显示骨架，只在头部显示"正在刷新"。

**B12 旧宿主提示。** `warnings` 中有 `code === "LEGACY_ACCOUNT_API"` 时，在列表上方写一行中性提示："当前宿主版本只能查询 DeepSeek 余额。"它不显示这条警告的 `message`。其他警告不在正文显示。

**B13 金额格式。** `fmtBalanceAmount(value, currency)`：
- 固定两位小数，≥1000 时加千分位，例如 `1,234.50`。现在 ≥1000 时用的是 `maximumFractionDigits: 2`，会得到 `1,234.5`；改为最少、最多都是两位。
- CNY 写成 `¥1,234.50`，USD 写成 `$15.50`，其他币种写成 `15.50 EUR`。

这个函数只有余额页在用（`src/client.cjs:164-198`）。

**B14 命名规则。**
- 余额页的类名一律以 `dss-bal-` 开头。状态修饰符用 `is-*`，并且只能和带前缀的类复合书写（`.dss-bal-row.is-danger`），沿用切片 4 的 T14 和 `tests/styles.test.js:117` 的检查。
- 不复用总览的 `.dss-kpis` / `.dss-kpi`。smoke 用 `until('document.querySelector(".dss-kpis")')` 判断总览已渲染（`scripts/browser-fixture-smoke.mjs:270`、`:302`），复用会让它在余额页误判。视觉需要一致时，在 CSS 里合并选择器，不共享类名。
- 新增通用的仅读屏可见类 `.dss-sr`。

## 5. 结构

### 5.1 正常状态

```text
section.dss-bal                                       外层 .dss-body 已经是 tabpanel，这里不再加 aria-labelledby
  p.dss-bal-note[data-code=LEGACY_ACCOUNT_API]        仅 B12
  section.dss-bal-kpis[aria-label=账户摘要](.is-two)   仅当列表 ≥2 个账户（B3）；没有"最紧的额度"时加 .is-two
    div.dss-bal-kpi.is-lead      div.dss-bal-kpi-k 可用余额 · div.dss-bal-kpi-v · div.dss-bal-kpi-s
    div.dss-bal-kpi              最紧的额度；.dss-bal-kpi-v 带 .is-warn / .is-danger
    div.dss-bal-kpi              需要关注；副行 span.dss-bal-nw × N
  section.dss-bal-list
    div.dss-bal-cols[aria-hidden]                     账户 | 余额 / 剩余额度 | 空
    ul.dss-bal-rows[aria-label=账户列表]
      li.dss-bal-row[data-account-id][data-tone=ok|warn|danger](.is-warn .is-danger)
        div.dss-bal-id
          i.dss-bal-dot[aria-hidden]
          div.dss-bal-nm
            b.dss-bal-name · span.dss-bal-meta
            span.dss-bal-chip.is-warn|.is-danger      异常时；正常时为 span.dss-sr 状态正常
        div.dss-bal-main
          div.dss-bal-amt-line                        余额账户
            span.dss-bal-amt(.is-stale .is-zero .is-none .is-unlimited)
            span.dss-bal-amt-sub                      充值 · 赠送 · 已用 · span.dss-bal-alert-line(.is-warn)
          div.dss-bal-meter[data-kind]                订阅窗口，或余额账户的"可用"
            span.dss-bal-meter-k
            span.dss-bal-bar[role=meter](.is-warn .is-danger .is-empty) > i(style width)
            span.dss-bal-meter-v(.is-warn .is-danger)
            span.dss-bal-reset[tabIndex=0]            有 resetsAt 时
          div.dss-bal-reason                          B7
        div.dss-bal-act
          div.dss-popover-wrap > button.dss-bal-bell[data-action=balance-alert](.is-on)
            div.dss-popover.dss-bal-alert(.is-up)[role=dialog] > form   打开时
          a.dss-bal-link[data-action=balance-link]    外链
  details.dss-bal-idle(open)                          B9
    summary.dss-bal-idle-sum                          未接入 N 个：…
    div.dss-bal-idle-row[data-account-id] × N         b · span.dss-bal-reason · a.dss-bal-link
  p.dss-bal-foot                                      数据来自各 Provider 的官方账户接口……
```

### 5.2 其他状态

```text
首次加载（B11）
section.dss-bal[aria-busy=true]
  section.dss-bal-kpis.is-skeleton[aria-hidden]       仅当骨架行 ≥2
  section.dss-bal-list > ul.dss-bal-rows > li.dss-bal-row.is-skeleton × N
    i.dss-bal-dot.is-idle · b.dss-bal-name · span.dss-bal-meta   无名占位时这两项也是占位条
    span.dss-bal-sk(.is-lg) × 2
  details.dss-bal-idle                                来自 providers
  p.dss-bal-foot                                      正在读取 N 个账户…

失败且没有数据（B10 error）
section.dss-bal > div.dss-bal-failed[role=status]
  p 没有读到账户数据 · details.dss-data-diagnostics · button[data-action=balance-retry]

账户服务不可用（B10 unavailable）
section.dss-bal > div.dss-bal-failed > p 账户服务不可用

没有账户 / 全部未接入（B9）
section.dss-bal > p.dss-empty（balance.empty 或 还没有可查询的账户）· details.dss-bal-idle[open]
```

### 5.3 `data-action` 一览

`balance-alert`（铃铛）、`balance-alert-save`、`balance-alert-cancel`、`balance-alert-clear`、`balance-link`（行内与未接入组的外链）、`balance-retry`（失败且没有数据时）。头部和横幅沿用 `refresh`、`retry`。

## 6. 样式

### 6.1 新 token

在 `:where(.dss-overlay, .dss-trigger, .dss-tt)` 中定义（深色值），在 `body:not([data-ds-dark-theme]) :is(...)` 中覆盖（浅色值）：

| token | 深色 | 浅色 | 用途 |
| --- | --- | --- | --- |
| `--dss-warn-fill` | `#f59e0b` | `#d97706` | 额度条、状态点的琥珀色填充。`--dss-warn` 是文字色，浅色下是 `#92400e`，做填充太暗 |
| `--dss-skel` | `#232933` | `#eceff3` | 骨架占位条 |

其余颜色复用现有 token：`--dss-ok`、`--dss-warn`/`-soft`/`-line`、`--dss-danger`/`-soft`/`-line`、`--dss-accent`、`--dss-track`、`--dss-line`、`--dss-line-soft`、`--dss-layer`、`--dss-panel`、`--dss-hover`、`--dss-hover-row`、`--dss-text`/`-2`/`-3`、`--dss-shadow-pop`。字号只用 `--dss-fs-xs/sm/md/xl/2xl`。

### 6.2 尺寸（取自原型）

| 部位 | 宽屏 | ≤860px | ≤640px |
| --- | --- | --- | --- |
| 列表三列 `--cols` | `minmax(170px,1.15fr) minmax(0,3.4fr) 92px`，列距 20px | `minmax(140px,1fr) minmax(0,3.2fr) 84px` | `minmax(0,1fr) auto`，`grid-template-areas: "id act" "main main"`，行距 10px；隐藏 `.dss-bal-cols` |
| 行 | 内边距 12px 4px，底边 `--dss-line-soft`，悬停 `--dss-hover-row` | 同 | 内边距 12px 2px |
| 状态点 / 标签 | 8px 圆点，`margin-top: 6px` 与名字首行对齐；标签 `fs-xs` 600，行高 18px，内边距 0 6px，圆角 5px | 同 | 同 |
| 金额 / 副行 | `fs-xl` 650 / `fs-sm` `--dss-text-3` | 同 | 同 |
| 额度条一行 | `grid-template-columns: 3.6em minmax(80px,300px) 4.2em minmax(9.5em,auto)`，列距 10px，`fs-sm` | `3.6em minmax(0,1fr) 4.2em`，重置时间换到第二行（`grid-column: 2 / -1`，`fs-xs`） | 同 ≤860 |
| 条 | 高 6px，圆角 3px，轨道 `--dss-track` | 同 | 同 |
| 铃铛 | 26×26px，圆角 7px | 同 | 同 |
| 提醒弹层 | 宽 270px（`panelClassName` 覆盖 `.dss-popover` 的 290px），内边距 12px，间距 9px；输入框高 32px | 同 | 同 |
| 摘要条 | `grid-template-columns: 1.45fr repeat(2,minmax(0,1fr))`，`.is-two` 为 `1.45fr minmax(0,1fr)`；首格大字 `fs-2xl`，其余 `fs-xl`，副行 `fs-xs` | 两列：首格占满一行，另两格共用下一行；`.is-two` 时第二格也占满一行；副行允许换行 | 内边距 10px 12px；首格大字 `fs-xl` |
| 未接入 | 外框 `--dss-line-soft`，圆角 10px；摘要行内边距 9px 12px，`fs-sm`；每行左缩进 34px | 同 | 名字和原因上下排，左缩进 30px |
| 骨架 | 占位条高 10px，`.is-lg` 20px，`.is-xl` 26px（摘要条大字），圆角 4px | 同 | 同 |

- 断点一律用 `@container dss-panel (max-width: …)`，和现有样式一致。
- 头部状态文字的隐藏规则不变：面板 <420px 时隐藏（smoke `:345` 断言了这一点）。原型在 640px 隐藏，不照搬。
- 余额页内部不出现 `overflow: auto/scroll`，只有 `.dss-body` 一个滚动容器。提醒弹层沿用 `.dss-popover` 的最大高度，内容很短，不会出现滚动。
- `.dss-popover.is-up{top:auto;bottom:calc(100% + 6px)}` 写成通用规则，不绑定余额页。
- `.dss-sr` 用 `position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap`。它不进入滚动检查，因为高度只有 1px。
- 骨架闪烁复用 `@keyframes dss-pulse`；`@media (prefers-reduced-motion: reduce)` 时 `.dss-bal-sk` 不加动画。

### 6.3 删除

- `src/client-styles.cjs:163` 整行的余额规则：`.dss-balance*`、`.dss-provider-picker*`、`.dss-quota*`、`.dss-section-title`、`.dss-balance-state*`、`.dss-balance-warning`，以及这一行末尾 `@media (max-width:640px)` 里的余额部分。删除前 `grep` 确认 `.dss-section-title` 只有 `src/client.cjs:175` 在用。`.dss-sec-hint` 趋势页还在用（`src/client.cjs:738`），保留。
- token：
  - `--dss-balance-text`、`-muted`、`-metric-bg`、`-metric-border`、`-rule`（`:79-83`）；
  - `--dss-hero-card-bg`、`-border`、`-text`、`-muted`、`--dss-hero-metric-bg`、`-border`、`--dss-hero-card-shadow`，深色（`:72-78`）和浅色（`:151-157`）各一份。
- 保留 `--dss-hero-bg`、`--dss-hero-border`、`--dss-hero-chip-bg`，趋势页的 `.dss-hero` 还在用。
- 删完后 `tests/styles.test.js:86`"every referenced --dss-* token is defined"会兜底检查有没有漏删的引用。

## 7. 模块、函数与文案

### 7.1 新增纯模块 `src/client-balance-model.cjs`

不含 React、DOM、存储和文案。不在内部调用 `Date.now()`：需要"现在"的函数都接收 `now` 参数。没有外部依赖。

| 导出 | 输入 → 输出 | 规则 |
| --- | --- | --- |
| `QUOTA_WARN = 20`、`QUOTA_DANGER = 5`、`ALERT_MAX = 1e9` | 常量 | |
| `quotaLevel(remainingPercent)` | → `"ok" \| "warn" \| "danger"` | B6 |
| `fmtQuotaPercent(remainingPercent)` | → `{value, text}` | B6 的向下取整；`value` 用于 `aria-valuenow`，`text` 不带 `%` |
| `splitAccounts(accounts)` | → `{active[], idle[]}` | B9；两组都保持输入顺序 |
| `normalizeBalanceAlerts(value)` | 任意值 → `{[id]: {amount, currency}}` | 非对象或数组返回 `{}`；逐条要求 `id` 非空，`amount` 是有限数且 `0 < amount <= ALERT_MAX`，`currency` 是非空字符串，否则丢弃 |
| `alertFor(account, alerts)` | → `{amount, currency} \| null` | B8 的生效条件 |
| `validateAlertAmount(raw)` | 字符串 → `{kind: "ok", amount} \| {kind: "empty"} \| {kind: "invalid"}` | B8 的校验 |
| `accountChip(account, alerts)` | → `{tone, key} \| null` | B7 的表。`key` 是 locale 键的后缀，例如 `"chip.stale"`；`null` 表示 ok |
| `accountTone(account, alerts)` | → `"ok" \| "warn" \| "danger"` | `accountChip(...)?.tone ?? "ok"` |
| `sortAccounts(active, alerts)` | → 新数组 | B2；不修改输入 |
| `accountMeta(account)` | → `{type: "subscription" \| "balance", detail: {kind: "plan" \| "route" \| "id", value}}` | B4 的副行规则；文案由组件拼 |
| `accountReason(account)` | → `{key, at?} \| null` | B7 的原因行；`at` 是 `stale` 时的 `lastSuccessAt` |
| `balanceParts(account, alert)` | → `{amount, currency, zero, unlimited, parts[{key, value}], alertLine: {amount, below} \| null, meter: {remaining} \| null}` | B5；`parts` 已省略 `null` 和 0，`key` ∈ `toppedUp`、`granted`、`used`（`value` 为 `[used, total]`） |
| `resetParts(resetsAt, now)` | → `null \| {soon: true} \| {days, hours, minutes}` | B6；`days > 0` 时不再返回 `minutes` |
| `balanceTotals(active)` | → `{lead: {currency, amount} \| null, others[{currency, amount}], balanceCount, staleCount, unreadCount}` | B3 首格；按"分"累加，输出时除以 100 |
| `tightestWindow(active)` | → `{account, window} \| null` | B3 第二格 |
| `attentionList(active, alerts)` | → `{tone, accounts[]}` | B3 第三格；`accounts` 按 B2 排序 |
| `balanceHeaderState(state, data, hasRemote)` | → `{kind, at, error}` | B10 的表；`stale` 的 `at` 取上次 `data.generatedAt`，`error` 保留原文 |
| `legacyNotice(data)` | → 布尔 | B12 |
| `skeletonModel(providers)` | `providers[] \| null` → `{rows[{id, name, type}], idle[{id, name, reason}], named}` | B11；`null` 或空数组返回 3 行 `{id: null}`，`named: false` |
| `safeActionUrl(url)` | → 字符串或 `null` | 能被 `new URL()` 解析且 `protocol === "https:"` 时原样返回 |

### 7.2 新增组件文件 `src/client-balance.cjs`

| 组件 | 职责 |
| --- | --- |
| `BalanceView(props)` | 入口。props 为 `data`、`state`、`remote`（布尔）、`providers`、`alerts`、`onAlertChange(id, value \| null)`、`onRetry`、`t`。渲染时取一次 `Date.now()`。按 §5 选择渲染骨架、失败、不可用、空或正常状态；持有未接入组的展开状态 |
| `BalanceKpis` | B3。列表 <2 个账户时返回 `null` |
| `AccountRow` | B4、B5、B7。以 `account.id` 为 key。5c 起渲染铃铛 |
| `QuotaMeter` | B6。重置时间的 tooltip 用 `tipProps(() => tipRows(...))` |
| `BalanceAlert` | 5c，B8。弹层里的 `form`，持有输入值和错误状态。卸载时如果焦点还在自己内部，交给 `.dss-panel`（B8"自动刷新"） |
| `IdleAccounts` | B9 |
| `BalanceSkeleton` | 5d，B11 |

`tipProps` 目前在 `src/client-timeline.cjs:49`。把它移到 `src/client-tip.cjs` 一起导出，`client-timeline.cjs` 改为从那里导入，行为不变。

可访问性：

- 列表 `aria-label="账户列表"`，摘要条 `aria-label="账户摘要"`。
- 外链的读屏文字是"充值（新标签页打开）"；状态点和骨架条都设 `aria-hidden`。
- 重置时间可聚焦，tooltip 跟随焦点出现。条的 `aria-label` 已经包含绝对时刻，读屏用户不依赖 tooltip。
- 提醒弹层打开时焦点进入输入框（`data-popover-autofocus`），弹层的 `aria-label` 是"<账户名> 余额提醒"。

### 7.3 `src/client.cjs` 的改动

1. 删除 `providerPickerLabel`（`:139-146`）和 `BalanceView`（`:148-219`），改为 `require("./client-balance.cjs")`。`__test` 导出里的 `BalanceView` 改为来自新文件，删掉 `providerPickerLabel`。`fmtBalanceAmount` 如果不再被 `client.cjs` 使用，从它的导入里去掉。
2. 5c：在 `StatsPanel` 的早退之前加入：
   ```js
   var alertsPair = usePref("balanceAlerts", {});
   var balanceAlerts = normalizeBalanceAlerts(alertsPair[0]);
   var setBalanceAlert = useCallback(function(id, value) {
   	alertsPair[1](function(current) {
   		var next = Object.assign({}, normalizeBalanceAlerts(current));
   		if (value) next[id] = value; else delete next[id];
   		return next;
   	});
   }, [alertsPair[1]]);
   ```
3. 余额 effect（`:340-359`）：成功时写 `setBalanceState({ kind: "exact", error: null })`，删除 `first` 和 `warning` 两行（问题 c）。失败分支不变（有数据时 `stale`，没有时 `error`）。
4. 5d：`stats/providers`。
   - 新增 `var providersRemote = props.providers;`、`var [balanceProviders, setBalanceProviders] = useState(null);`、`var providersAskedRef = useRef(false);`。
   - 新增 effect：`balanceActive && providersRemote && !balanceData && !providersAskedRef.current` 时，把 ref 置为 `true`，调用一次 `providersRemote()`；成功时 `setBalanceProviders(result.providers)`，失败时什么也不做（骨架是装饰，真实状态以 `stats/account` 为准）。
5. 头部（`:528`、`:567`）：
   - 早退之后算 `var balanceHeader = balanceHeaderState(balanceState, balanceData, !!balanceRemote);`。
   - `StatusIndicator` 不再按标签页隐藏。余额页传 `{ state: balanceHeader, remote: !!balanceRemote, source: t("balance.source"), t }`。
   - `StatusBanner` 在余额页传 `{ state: balanceHeader, remote: !!balanceRemote, t, onRetry: refreshCurrent }`。`bannerKind` 只对 `stale`（以及 `exact` 带 `error`）返回值，而 `balanceHeader` 的 `exact` 永远不带 `error`，所以余额页只有 B10 的那一种横幅。
   - `ExportMenu` 在余额页仍然隐藏。
6. 正文（`:574`）：`e(BalanceView, { data: balanceData, state: balanceState, remote: !!balanceRemote, providers: balanceProviders, alerts: balanceAlerts, onAlertChange: setBalanceAlert, onRetry: refreshCurrent, t })`。5b 时 `providers` 传 `null`、`alerts` 传 `{}`，`onAlertChange` 不传。
7. 5d：`apply()`（`:1073-1106`）在注入回调里加 `providersRemote = () => readProvidersRemote(childCtx.remote.stats);`，并在 overlay 的 `inject` 中传 `providers: providersRemote`。

### 7.4 其他文件

- **`src/client-remote.cjs`**（5d）：
  ```js
  async function readProvidersRemote(stats) {
  	if (typeof stats.providers !== "function") return null;
  	const answered = await stats.providers();
  	if (!answered.ok) throw answered.error || new Error("stats/providers failed");
  	return parseProvidersResult(answered.value);
  }
  ```
  导出它。调用方吞掉错误（§7.3 第 4 条）。
- **`src/client-format.cjs`**（5b）：按 B13 改 `fmtBalanceAmount`。
- **`src/client-header.cjs`**（5b）：
  - `StatusIndicator` 增加可选参数 `source`。`title` 改为 `(source || t(remote ? "source.host" : "source.local")) + " · " + text`，不传时与现在完全相同。
  - `statusText` 已经对未知的 `kind` 回退到 `t("source." + kind)`，因此只需加 `source.error`、`source.unavailable` 两个文案。
  - `client-styles.cjs` 补上 `.dss-data-status.error .dss-status-dot{background:var(--dss-danger)}` 和 `.dss-data-status.unavailable .dss-status-dot{background:var(--dss-text-3)}`。
- **`src/client-dialog.cjs` 的 `Popover`**（5c）：新增三个可选参数，不传时行为不变（`ProjectFilterMenu` 不受影响）：
  - `children` 可以是函数 `({ close }) => node`。`close(restoreFocus)` 就是现有的 `closePopover`；
  - `title`、`panelLabel`：分别覆盖按钮的 `title` 和面板的 `aria-label`，默认都等于 `label`；
  - `flip`：为真时按 B8 的规则决定是否给面板加 `.is-up`。测量放在一个只在打开后才挂载的内部组件里，用 `useLayoutEffect`，测量范围取 `closest(".dss-body")`。这样静态渲染时不会碰到 `useLayoutEffect`。
- **`src/client-tip.cjs`**（5b）：接收 `tipProps`（§7.2）。

### 7.5 文案（`src/client-locale.cjs`，中英同时加）

`%s`、`%d` 按出现顺序依次 `replace`，沿用现有写法。

| 键 | 中文 | English |
| --- | --- | --- |
| `balance.source` | 官方账户接口 | Official account APIs |
| `balance.listLabel` / `balance.kpiLabel` | 账户列表 / 账户摘要 | Accounts / Account summary |
| `balance.col.account` | 账户 | Account |
| `balance.col.value` | 余额 / 剩余额度 | Balance / quota left |
| `balance.type.balance` / `balance.type.subscription` | 余额 / 订阅 | Balance / Subscription |
| `balance.route` | 自定义路由 | Custom route |
| `balance.statusOk` | 状态正常 | Status OK |
| `balance.chip.stale` / `.unauthorized` / `.blocked` | 已过期 / 凭证无效 / 已拦截 | Stale / Invalid credential / Blocked |
| `balance.chip.rateLimited` / `.unavailable` / `.invalidResponse` | 请求受限 / 暂不可用 / 响应异常 | Rate limited / Unavailable / Invalid response |
| `balance.chip.quotaOut` / `.quotaDanger` / `.quotaWarn` | 额度已用完 / 额度将用完 / 额度紧张 | Quota used up / Quota almost out / Quota low |
| `balance.chip.balanceOut` / `.balanceLow` | 余额已用完 / 余额偏低 | Balance used up / Balance low |
| `balance.reason.stale` | 刷新失败，显示的是 %s 的结果 | Refresh failed; showing the result from %s |
| `balance.reason.balanceOut` | 余额为 0，充值后才能继续调用 | Balance is 0; top up to keep calling |
| `balance.part.toppedUp` / `.granted` / `.used` | 充值 %s / 赠送 %s / 已用 %s / %s | Top-up %s / Granted %s / Used %s of %s |
| `balance.unlimited` | 不限额 | Unlimited |
| `balance.meter.credit` | 可用 | Available |
| `balance.meterLabel` / `balance.meterLabelReset` | %s剩余 %s% / %s剩余 %s%，北京时间 %s 重置 | %s: %s% left / %s: %s% left, resets %s Beijing time |
| `balance.resetAt` | 北京时间 %s 重置 | Resets %s Beijing time |
| `balance.resetSoon` | 即将重置 | Resets soon |
| `balance.resetMin` / `.resetHour` / `.resetHourMin` | %d 分钟后重置 / %d 小时后重置 / %d 小时 %d 分后重置 | Resets in %dm / Resets in %dh / Resets in %dh %dm |
| `balance.resetDay` / `.resetDayHour` | %d 天后重置 / %d 天 %d 小时后重置 | Resets in %dd / Resets in %dd %dh |
| `balance.kpi.available` | 可用余额 | Available balance |
| `balance.kpi.accounts` / `.staleCount` / `.unreadCount` | %d 个余额账户 / %d 个为过期快照 / %d 个未读到 | %d balance accounts / %d stale / %d unread |
| `balance.kpi.tightest` / `.tightestValue` | 最紧的额度 / 剩余 %s% | Tightest quota / %s% left |
| `balance.kpi.attention` / `.allClear` | 需要关注 / 全部正常 | Needs attention / All clear |
| `balance.alert.title` / `balance.alert.button` | %s 余额提醒 / 余额提醒 | %s balance alert / Balance alert |
| `balance.alert.aria` / `.below` / `.unset` | %s 余额提醒：%s / 低于 %s / 未设置 | %s balance alert: %s / below %s / not set |
| `balance.alert.field` / `.placeholder` / `.inputLabel` | 低于 / 例如 20 / 提醒金额（%s） | Below / e.g. 20 / Alert amount (%s) |
| `balance.alert.hint` | 余额低于这个金额时，这一行显示"余额偏低"并排到前面。按 %s 比较，不换算汇率；只保存在当前浏览器。 | Below this amount the row shows "Balance low" and moves up. Compared in %s without conversion; saved in this browser only. |
| `balance.alert.line` | 提醒线 %s | Alert at %s |
| `balance.alert.save` / `.cancel` / `.clear` | 保存 / 取消 / 清除提醒 | Save / Cancel / Clear alert |
| `balance.alert.required` / `.invalid` | 请输入金额 / 请输入大于 0 的金额，最多两位小数 | Enter an amount / Enter an amount above 0 with at most two decimals |
| `balance.idle.summary` | 未接入 %d 个：%s | %d not connected: %s |
| `balance.idle.missing` | 未配置凭证 %s | Credential not configured: %s |
| `balance.idle.unsupported` | 没有可用的官方账户查询接口，不影响 Token 统计 | No official account API; token statistics are unaffected |
| `balance.console` / `balance.newTab` | 控制台 / （新标签页打开） | Console / (opens in a new tab) |
| `balance.noActive` | 还没有可查询的账户 | No accounts to query yet |
| `balance.failed` | 没有读到账户数据 | Account data could not be read |
| `balance.legacy` | 当前宿主版本只能查询 DeepSeek 余额。 | This host version can only read DeepSeek balances. |
| `balance.foot` | 数据来自各 Provider 的官方账户接口，凭证只在宿主侧使用。结果缓存 5 分钟，点刷新会绕过缓存。 | Data comes from each provider's official account API; credentials stay on the host. Results are cached for 5 minutes; Refresh bypasses the cache. |
| `balance.loadingCount` | 正在读取 %d 个账户… | Reading %d accounts… |
| `source.error` / `source.unavailable` | 读取失败 / 账户服务不可用 | Read failed / Account service unavailable |

- `balance.idle.missing` 的 `%s` 位置要放一个 `<code>` 元素：按 `%s` 切成两段，中间插入 `e("code", null, key)`，不拼 HTML。
- 改写：`balance.topUp` 从"前往充值"改为"充值"，`balance.manage` 从"管理账户 / Manage account"改为"管理 / Manage"，右列只有 92px。
- 复用：`balance.empty`、`balance.unavailable`、`balance.loading`、`balance.notConfigured`、`balance.staleHint`、`balance.message.unauthorized/rate-limited/unavailable/invalid-response/blocked`、`balance.window.*`、`source.exact/loading/refreshing/stale/details`、`status.stale`、`refresh`、`price.retry`。
- 删除（每个都先 `grep` 确认没有其他引用）：`balance.title`、`balance.hint`、`balance.provider`、`balance.total`、`balance.toppedUp`、`balance.granted`、`balance.used`、`balance.limit`、`balance.plan`、`balance.subscription`、`balance.remaining`、`balance.reset`、`balance.status.*`（9 个）、`balance.message.unsupported`（由 `balance.idle.unsupported` 取代）、`balance.lastSuccess`、`source.updated`。

## 8. 切片计划

### 切片 5a：余额视图模型

1. 新建 `src/client-balance-model.cjs`（§7.1）。
2. 新建 `tests/balance-model.test.js`，至少覆盖：
   - `quotaLevel`：19.99 / 20 / 4.99 / 5 / 0；
   - `fmtQuotaPercent`：68 → "68"，67.6 → "67"，9.99 → "9.9"，4.0 → "4"，4.96 → "4.9"，0 → "0"，100 → "100"；
   - `splitAccounts`：`not-configured`、`unsupported` 进入 idle，两组保持输入顺序；
   - `normalizeBalanceAlerts`：`null`、数组、字符串、缺字段、`amount` 为 0 / 负数 / `NaN` / 字符串 / 超过 1e9、`currency` 为空，都被丢弃；合法条目保留；
   - `alertFor`：币种不同、订阅账户、`balance` 为空、`unlimited`，都返回 `null`；
   - `validateAlertAmount`："20"、"20.5"、"1,000"、"1，000"（全角逗号）、" 20 " 合法；""、"   " 为 empty；"0"、"-1"、"1.234"、"abc"、"1e3"、"1000000001"、"２０"（全角数字）为 invalid；
   - `accountChip`：B7 表的每一行各一个用例；另加：
     - `stale` 且 `unauthorized` 时取"已过期"；
     - 余额为 0 且设了提醒时取"余额已用完"；
     - 余额为 0 但 `unlimited` 时没有标签；
     - 订阅账户取所有窗口中的最小值；
   - `sortAccounts`：danger > warn > ok；同一色调保持输入顺序；不修改输入数组；
   - `accountMeta`：`plan` 等于名字时不写 `plan`；`generic-usage` 写自定义路由；family 都是 `moonshot` 的 `moonshotai` 和 `kimi-coding` 副行不同；
   - `accountReason`：`stale` 有 / 没有 `lastSuccessAt`；各失败状态；余额为 0；`ok` 时为 `null`；
   - `balanceParts`：省略 `null` 和 0；`total` 为 0 时没有额度条；`remaining > total` 时夹到 100；`remaining < alert` 时 `alertLine.below === true`；`unlimited`；
   - `resetParts`：59 秒 → soon；已过去 → soon；60 分钟 → 1 小时；23:59 → 23 小时 59 分；24 小时 → 1 天；2 天 14 小时 5 分 → 只有天和小时；`null`；
   - `balanceTotals`：0.1 + 0.2 合计为 0.30；有 CNY 时它是首格；没有 CNY 时取第一个出现的币种；排除 `unlimited`；`staleCount` 和 `unreadCount`；
   - `tightestWindow`：跨账户取最小，相同时取先出现的；没有订阅时为 `null`；
   - `attentionList`：数量、顺序、最严重色调；
   - `balanceHeaderState`：B10 表的 6 种情况；`stale` 的 `at` 取上次 `generatedAt`，`error` 保留原文；
   - `skeletonModel`：`null` 和 `[]` 都返回 3 个无名行；未接入的进 idle；保持顺序；
   - `safeActionUrl`：`https:` 通过；`http:`、`javascript:`、相对路径、不能解析的字符串都返回 `null`。
3. 需要"现在"的用例一律传固定的 `now`，`TZ=UTC npm test` 必须和默认时区结果一致。
4. 本片不改任何 UI。新模块还没被 `client.cjs` 引用，`npm run build` 后 `lib/` 应该没有变化；如果有变化，说明误改了别的文件。

验收：§10 门禁通过。

### 切片 5b：账户列表

1. 新建 `src/client-balance.cjs`：`BalanceView`、`BalanceKpis`、`AccountRow`（先不渲染铃铛）、`QuotaMeter`、`IdleAccounts`，以及失败、不可用、空状态（§5.2）。首次加载暂时只显示一行 `balance.loading`，骨架在 5d 做。
2. 实现 B1–B7、B9、B10、B12–B14。B8 只在模型层存在，本片 `alerts` 传 `{}`。
3. 按 §7.3 第 1、3、5、6 条改 `client.cjs`；按 §7.4 改 `client-format.cjs`、`client-header.cjs`、`client-tip.cjs`。
4. 按 §6 加样式、删旧规则和旧 token（`.dss-popover.is-up` 和提醒弹层的样式留到 5c）。
5. 按 §7.5 加文案，`balance.alert.*` 和 `balance.loadingCount` 除外；删除旧文案。
6. 按 §9.4 扩充夹具，按 §9.2 迁移 smoke，加入 §9.3 的第 1–14 条；按 §9.5 加单测、迁移旧测试。
7. 按 §9.2 最后一张表改 `scripts/rc2-browser-smoke.mjs`。

验收：
- 1440px 默认夹具下，6 个账户一屏列出，顺序符合 B2，页面没有 `select`。
- 中文界面的 `innerText` 不含夹具里的英文 `warnings[].message`。
- 深色、浅色、390px、320px 截图中没有渐变卡、横向溢出和被截断的数字。
- 余额页只有 `.dss-body` 一个滚动容器。
- 在一个真实 DSH Web 上跑一次 `npm run smoke:web`（不在 CI 里），跑不了就在汇报里说明。

### 切片 5c：余额提醒

1. 按 §7.4 扩展 `Popover`，在 `tests/client-dialog.test.js` 加静态渲染用例（§9.5）。
2. 实现 `BalanceAlert`，给 `AccountRow` 接上铃铛和"提醒线"（B8）。
3. 按 §7.3 第 2 条接偏好，第 6 条传 `alerts` 和 `onAlertChange`。
4. 加 `balance.alert.*` 文案和 §6 中提醒弹层、`.is-up` 的样式。
5. 加入 §9.3 的第 15–23 条。

验收：
- 给 DeepSeek 设一条高于余额的提醒后，这一行立刻变成"余额偏低"并上移，焦点仍在它的铃铛上。
- 关闭面板再打开，提醒仍在。
- Esc 先关弹层，再关面板。
- 总览的"筛选项目"弹层行为不变：现有 smoke 全部通过。

### 切片 5d：首次加载骨架

1. 按 §7.4 加 `readProvidersRemote`，按 §7.3 第 4、7 条接线。
2. 实现 `BalanceSkeleton`（B11），加 `balance.loadingCount` 文案。
3. 夹具加 `providers` 方法、`holdAccount` 和 `noProviders` 参数（§9.4）。
4. 加入 §9.3 的第 24–27 条。

验收：骨架行的名字和顺序与 `stats/providers` 一致；旧宿主下是 3 行无名占位，没有报错；`stats/providers` 每次挂载最多调用一次，并且只在余额页调用。

### 切片 5e：文档与截图

1. 从 CI 的 `browser-results` 取 1440px 中文的余额截图，更新 `docs/images/balance.png`。截图来自夹具数据，不含真实账户。`docs/images/balance-minimax.png` 不再需要：多账户已在同一张图里。默认删除这张图，并改掉 README 中引用它的表格；维护者想保留两张图时，第二张换成 `desktop-balance-attention`。
2. 三份 README 的余额说明（`README.md:122-131`、`README.en.md:120-129` 及其中提到的截图）改为新的读法：一屏列出全部账户、按紧急程度排序、额度条表示剩余、可以按账户设提醒线（只保存在当前浏览器）。顺带核对 `README.md:196`、`:327` 及英文对应段落里关于缓存和"已过期"的说法是否仍然准确。
3. 更新 `DESIGN.md` 的"当前实现"一节：余额页的结构，以及 CI 数字（单测数、检查组数、截图数，以 5d 的 CI 为准）。
4. 发布说明：默认写进 `docs/release-0.5.0.md`，因为 0.5.0 尚未打 tag。维护者如果决定先发 0.5.0，就改写到下一版的发布说明。
5. 在 `docs/ui-overhaul-0.5.0.md` 切片 5 的余额那一条下注明"已完成"，附上提交哈希，并链接本文。
6. 在 DSH 桌面端由维护者部署后做真实验证，深浅两种主题都要看：多账户排序、过期账户、设置和清除提醒、Esc 顺序、窄窗口，并再跑一次 `npm run smoke:web`。

## 9. 对照与迁移

### 9.1 信息对照（不丢信息）

| 现有 | 新位置 |
| --- | --- |
| Provider 下拉框 | 删除；全部账户一屏列出（B1） |
| 卡片标题（账户名）和副标题（币种或套餐） | 行内账户名和副行（B4）；币种体现在金额符号上 |
| 状态标签（正常、已过期、未授权……） | 状态点；只有异常时显示标签（B7） |
| "可用总余额"大字 | 行内金额；多账户时摘要条按币种合计（B3） |
| 充值、赠送、已用、总额度四个框 | 金额右侧副行；OpenRouter 另有"可用"额度条（B5） |
| "当前套餐"大字 | 副行"订阅 · <plan>" |
| 额度条与"68.0% 剩余" | 条宽改为剩余，加阈值颜色，数字向下取整（B6） |
| "重置时间 <绝对时刻>" | 相对重置时间；绝对时刻在 tooltip 和 `aria-label` 里（B6） |
| `balance.staleHint`、"上次成功 <时刻>" | 原因行"刷新失败，显示的是 <时刻> 的结果"（B7） |
| 正文"更新时间 <时刻>" | 头部状态点"已同步 · <时刻>"（B10） |
| 正文黄框（警告或错误原文） | 整次失败时为头部状态点 + 横幅，诊断信息可展开；单个账户的失败在它自己那一行（B7、B10） |
| 未配置提示（带凭证键名） | 未接入组，键名放在 `<code>` 里（B9） |
| 充值 / 管理账户按钮 | 行内外链"充值" / "管理"（B4） |

### 9.2 smoke 选择器迁移

`scripts/browser-fixture-smoke.mjs`：

| 现有 | 新 |
| --- | --- |
| `:159` 布局检查列表中的 `.dss-balance-head`、`.dss-balance-account` | `.dss-bal-kpis`、`.dss-bal-row`、`.dss-bal-meter`、`.dss-bal-idle` |
| `:226`、`:229` `until('document.querySelector(".dss-balance-name")')` | `until('document.querySelector(".dss-bal-row")')`；`:227`、`:230` 的调用序列断言不变 |
| `:232` `report.checks` 文字 | 不变 |
| `:257-266` 键盘扫过标签页不查询 `account` | 不变；5d 起再断言 `providers` 也没有被调用（§9.3 第 24 条） |
| `:351` 只对总览、趋势做 390px 底部截图 | 视图列表加入 `'balance'` |
| `:357-358` 下拉框切到 `minimax-coding`，等 `.dss-balance-plan` | 删除。改为断言 `.dss-bal-row` 的 `data-account-id` 顺序（§9.3 第 1 条），不再截 `<name>-subscription` |
| `:360` `report.checks` "all four tabs, provider selection and layout" | 改为 "all four tabs, account list order and layout" |
| `:382` `until('.dss-balance-status.stale')`（整次 RPC 失败） | `until` 头部 `.dss-data-status.stale`；断言 `.dss-status-banner.stale [data-action=retry]` 存在，`.dss-bal-row` 仍在 |
| `:386` `.dss-balance-warning` 含 "Legacy account service" | `.dss-bal-note[data-code=LEGACY_ACCOUNT_API]` 存在，`.dss-panel` 的 `innerText` 不含 "Legacy account service" |
| `:387` 没有 `.dss-provider-picker select`，`.dss-balance-name` 是 "DeepSeek" | 没有 `select`；`.dss-bal-row` 只有 1 行，`data-account-id="deepseek-official"`，`.dss-bal-name` 是 "DeepSeek" |
| `:389`、`:564` `until('.dss-balance-status.stale')`（`accountMode=stale`，单个账户过期） | `until('[data-account-id="deepseek-official"] .dss-bal-chip.is-warn')`，文字是 "Stale"（这两段在 `lang=en` 下）；头部是 `.dss-data-status.exact`。夹具里 `moonshotai-cn` 默认就是过期的，所以选择器必须带账户 id |
| `:390` `.dss-balance-total` 含 "123.45" | `[data-account-id="deepseek-official"] .dss-bal-amt` 是 "¥123.45"，带 `.is-stale` |
| `:392`、`:566` `report.checks` 文字 | 不变 |

`scripts/rc2-browser-smoke.mjs:295-325`（真实宿主，`npm run smoke:web`，不在 CI 里）：

| 现有 | 新 |
| --- | --- |
| `:297` 等 `.dss-balance, .dss-balance-state.error` | 等 `.dss-bal-row, .dss-bal-failed, .dss-bal .dss-empty` |
| `:300` 读 `.dss-provider-picker option` | 读 `.dss-bal-row .dss-bal-name` 和 `.dss-bal-idle-row b` 的文字 |
| `:303-313` 在下拉框里选 yi-api，等 `.dss-balance-name` | 不再选择。按 `.dss-bal-row[data-account-id="yi-api"]` 定位，找不到时按名字找 |
| `:314-321` 在整个面板文字里找"正常"、"usd" | 只看这一行：名字是 yi-api、不含 "unknown"、`data-tone="ok"`、`.dss-bal-amt` 以 `$` 开头并含数字（B13 之后不再有 "USD" 字样） |

### 9.3 新增 smoke 断言

默认夹具（§9.4）的"现在"是 `2026-09-08T02:00:00Z`，即北京时间 10:00。除非另有说明，第 1–10 条在 `:335` 循环的 `desktop`（1440px，中文）余额页执行。

账户列表（5b）：

1. **顺序**：`.dss-bal-row` 的 `data-account-id` 依次是 `kimi-coding`、`minimax-coding`、`moonshotai-cn`、`deepseek-official`、`openrouter`、`yi-api`；面板内没有 `select`。
2. **标签**：前三行的 `.dss-bal-chip` 依次是"额度将用完"（`.is-danger`）、"额度紧张"（`.is-warn`）、"已过期"（`.is-warn`）。后三行没有 `.dss-bal-chip`，各有一个文字为"状态正常"的 `.dss-sr`。
3. **副行**：`kimi-coding` 是"订阅 · kimi-coding"，`minimax-coding` 是"订阅 · Professional Coding Plan"，`yi-api` 是"余额 · 自定义路由"。
4. **额度条**：`kimi-coding` 的条 `role=meter`、`aria-valuenow="4"`，带 `.is-danger`；`minimax-coding` 本时段的条 `aria-valuenow="18"`，带 `.is-warn`。条内 `i` 的 `style.width` 等于 `aria-valuenow + "%"`，即画的是剩余。
5. **重置时间**：`minimax-coding` 本时段写"2 小时 10 分后重置"，聚焦它后 `#dss-tooltip` 含"北京时间 2026-09-08 12:10 重置"；`kimi-coding` 写"2 天 14 小时后重置"。
6. **摘要条**：首格大字"¥159.65"，副行含"$58.30"、"4 个余额账户"和"1 个为过期快照"；第二格"剩余 4%"，带 `.is-danger`，副行含"Kimi For Coding 本周"；第三格大字"3"，副行依次是 Kimi For Coding、MiniMax Coding Plan、Moonshot。
7. **余额构成**：`deepseek-official` 副行是"充值 ¥100.00 · 赠送 ¥23.45"；`openrouter` 金额"$15.50"，副行"已用 $4.50 / $20.00"，有一条 `data-kind="credit"` 的条，`aria-valuenow="77"`，不带 `.is-warn` / `.is-danger`；`moonshotai-cn` 的原因行是"刷新失败，显示的是 2026-09-08 09:34 的结果"，金额带 `.is-stale`。
8. **未接入**：`details.dss-bal-idle` 默认没有 `open`，摘要是"未接入 2 个：Z.ai Coding Plan · Anthropic"。展开后 `zai-coding-cn` 行有 `code` 文字 `ZAI_API_KEY` 和一个"控制台"外链，`anthropic` 行没有外链。点一次刷新后仍然展开。
9. **外链**：所有 `.dss-bal-link` 的 `href` 以 `https:` 开头，`target="_blank"`，`rel` 含 `noreferrer`。`yi-api` 行没有外链。
10. **不透传英文**：中文界面下 `.dss-panel` 的 `innerText` 不含夹具 `warnings[].message` 的原文。
11. **单一滚动与字号**：三种宽度的余额页都执行。沿用 `:670-677` 的扫描，结果只能是 `['dss-body']`；`.dss-overlay` 内所有直接文本 ≥11px。
12. **单账户与需要处理**：
    - `accountSet=single`：只有 1 行，没有 `.dss-bal-kpis`。
    - `accountSet=attention`：前三行依次是 `deepseek-official`（"余额已用完"，金额"¥0.00"带 `.is-zero`，原因"余额为 0，充值后才能继续调用"）、`openrouter`（"凭证无效"，金额"—"，原因是 `balance.message.unauthorized`）、`kimi-coding`。截图 `desktop-balance-attention`。
13. **时区**：`:325` 的 `for (const index of [1, 2, 3])` 改为 `[1, 2, 3, 4]`，`index === 4` 时先 `until` 出现 `.dss-bal-row` 再读 `innerText`。余额页在两个时区下必须一致。
14. **首次失败与重试**：新开页面，先设 `accountMode = "error"` 再进余额页：头部是 `.dss-data-status.error`，正文有 `.dss-bal-failed` 和 `[data-action=balance-retry]`，没有 `.dss-status-banner`，截图 `balance-failed`。改回 `ok` 后点重试，出现 6 行，最后一次 `account` 调用的参数是 `true`。

余额提醒（5c），除第 22 条外都在 1440px 中文下：

15. **铃铛**：`[data-action=balance-alert]` 只出现在 `deepseek-official`、`openrouter`、`moonshotai-cn`、`yi-api` 四行；都没有 `.is-on`；`deepseek-official` 的 `aria-label` 是"DeepSeek 余额提醒：未设置"，`aria-expanded="false"`。
16. **打开、校验、保存**：
    - 点 `deepseek-official` 的铃铛，出现 `.dss-bal-alert[role=dialog]`，`aria-expanded="true"`，焦点在输入框。
    - 输入框用 `HTMLInputElement.prototype` 的 `value` setter 加 `input` 事件写值（沿用 `:478` 的写法）。
    - 写"abc"后点 `[data-action=balance-alert-save]`：出现"请输入大于 0 的金额，最多两位小数"，输入框 `aria-invalid="true"`，弹层仍在，焦点仍在输入框。
    - 写""后保存：出现"请输入金额"。
    - 写"200"后保存：弹层关闭，铃铛带 `.is-on`，`document.activeElement` 就是这个铃铛；这一行的标签是"余额偏低"，`.dss-bal-alert-line.is-warn` 是"提醒线 ¥200.00"。
    - 顺序变为 `kimi-coding`、`deepseek-official`、`minimax-coding`、`moonshotai-cn`、`openrouter`、`yi-api`。
    - `localStorage["dsh-stats.balanceAlerts"]` 解析后等于 `{"deepseek-official": {"amount": 200, "currency": "CNY"}}`；摘要条第三格是"4"。
17. **持久化**：关闭面板再打开，第 16 条的铃铛和标签仍在。
18. **Esc 顺序**：聚焦并打开 `deepseek-official` 的铃铛；按 Esc，弹层消失，面板仍在，焦点回到铃铛；再按 Esc，面板关闭。
19. **外部点击与单开**：`click()` 不派发 `pointerdown`，这两步要手动派发 `new PointerEvent('pointerdown', { bubbles: true })`。
    - 打开弹层后在 `.dss-bal-foot` 上派发：弹层关闭，焦点不回到铃铛。
    - 打开 `deepseek-official` 的弹层，在 `openrouter` 的铃铛上派发后再点它：面板内只有一个 `.dss-bal-alert`，它在 `openrouter` 那一行。
20. **清除**：打开 `deepseek-official` 的弹层，点 `[data-action=balance-alert-clear]`：铃铛没有 `.is-on`，标签消失，顺序回到第 1 条，`localStorage` 中没有这个键。再设一次 200，然后提交空值，结果相同。
21. **币种不符**：`localStorage` 写入 `{"openrouter": {"amount": 999, "currency": "CNY"}}` 后重新打开：`openrouter` 的铃铛没有 `.is-on`，`aria-label` 是"OpenRouter 余额提醒：未设置"，`data-tone="ok"`。
22. **翻转**：390px 中文，`.dss-body` 滚到底，打开最后一个铃铛：`.dss-bal-alert` 的矩形在 `.dss-body` 的可视矩形内（±1px）。截图 `mobile-balance-alert`。
23. **账户消失**：
    - 打开 `yi-api` 的弹层，设 `window.__fixture.omit = ['yi-api']`；
    - 用 `document.querySelector('[data-action=refresh]').click()` 刷新，不派发 `pointerdown`；
    - `yi-api` 行和弹层都消失后，`document.activeElement` 不是 `body`，并且在 `.dss-panel` 内；
    - 最后清掉 `omit`。

首次加载（5d）：

24. **只在余额页调用**：`:225` 处 `providers` 调用数为 0；`:226` 第一次进余额页后为 1；`:229` 重新进入后仍为 1；`:266` 键盘扫过标签页后不变。
25. **骨架**：打开 `?lang=zh&holdAccount=1`，进余额页：
    - 有 6 个 `.dss-bal-row.is-skeleton`，名字依次是 DeepSeek、MiniMax Coding Plan、OpenRouter、Kimi For Coding、Moonshot、yi-api；
    - 有 `.dss-bal-kpis.is-skeleton` 和 `.dss-bal[aria-busy="true"]`；
    - 未接入摘要是"未接入 2 个：Z.ai Coding Plan · Anthropic"；头部是 `.dss-data-status.loading`；底部是"正在读取 6 个账户…"；
    - 截图 `desktop-balance-skeleton`；
    - `window.__fixture.releaseAccount()` 之后出现 6 个非骨架行，`aria-busy` 消失。
26. **只调一次**：接第 25 条，切到总览再切回余额，并点一次刷新：`providers` 调用数仍为 1。
27. **旧宿主**：打开 `?lang=zh&holdAccount=1&noProviders=1`，进余额页：3 个 `.dss-bal-row.is-skeleton`，没有名字文字，没有 `.dss-bal-kpis`，底部是"正在读取账户数据…"。`report.errors` 为空。

每片在 `report.checks` 末尾加一条概括本片断言的文字。截图变化：
- 5b：去掉 `desktop/mobile/narrow-subscription` 三张，加 `mobile-balance-bottom`、`desktop-balance-attention`、`balance-failed`，并在 `:567-570` 的 1440px 深色段切到余额页加一张 `dark-balance`；
- 5c：加 `mobile-balance-alert`；
- 5d：加 `desktop-balance-skeleton`。

`report.checks` 的组数不得减少；截图数量可以因为去掉 `*-subscription` 而变化，汇报时写明增减。

### 9.4 夹具

`scripts/fixtures/browser-data.mjs:177-184` 的 `accounts` 扩充为 8 个，按下面的顺序（即宿主顺序）。金额是演示值，`now = 2026-09-08T02:00:00Z`，其余字段沿用现有的 `base`：

| id | displayName | 要点 |
| --- | --- | --- |
| `deepseek-official` | DeepSeek | 不变：CNY 123.45，充值 100，赠送 23.45 |
| `minimax-coding` | MiniMax Coding Plan | `plan: "Professional Coding Plan"`；`windows`：`session` 剩余 18、`resetsAt: now + 7800000`（2 小时 10 分），`weekly` 剩余 68、`resetsAt: now + 86400000`；`usedPercent = 100 − remainingPercent` |
| `openrouter` | OpenRouter | `providerFamily: "openrouter"`、`adapter: "openrouter-balance"`；USD，`remaining: 15.5`、`used: 4.5`、`total: 20`；`actionUrl: "https://openrouter.ai/credits"` |
| `kimi-coding` | Kimi For Coding | `providerFamily: "moonshot"`、`mode: "subscription"`、`adapter: "kimi-token-plan"`、`plan: null`；`weekly` 剩余 4、`resetsAt: now + 223200000`（2 天 14 小时）；`actionUrl: "https://www.kimi.com/code/console"` |
| `moonshotai-cn` | Moonshot | `providerFamily: "moonshot"`、`adapter: "moonshot-balance"`；`status: "unavailable"`、`stale: true`、`errorCode: "http-5xx"`、`lastSuccessAt: now − 1560000`（北京时间 09:34）；CNY 36.2，充值 30，赠送 6.2；`actionUrl: "https://platform.moonshot.cn/console/account"` |
| `yi-api` | yi-api | `providerFamily: "unknown"`、`adapter: "generic-usage"`；USD 42.8，其余为 `null`；`actionUrl: null` |
| `zai-coding-cn` | Z.ai Coding Plan | `providerFamily: "zai"`、`mode: "subscription"`、`adapter: "zai-token-plan"`；`status: "not-configured"`、`errorCode: "not-configured"`、`missingCredential: "ZAI_API_KEY"`、`lastSuccessAt: null`、`balance: null`；`actionUrl: "https://z.ai/manage-apikey/apikey-list"` |
| `anthropic` | Anthropic | `providerFamily: "anthropic"`、`mode: "unsupported"`、`adapter: null`；`status: "unsupported"`、`errorCode: "unsupported"`、`lastSuccessAt: null`、`balance: null`、`actionUrl: null` |

`warnings` 加一条 `{providerId: "moonshotai-cn", code: "HTTP_5XX", message: "provider account service is unavailable"}`，供 §9.3 第 10 条使用。

`scripts/fixtures/browser-entry.js` 的 `stats`：

- `account()`：`clone` 之后、现有 `accountMode` 处理之前，依次应用：
  - `fixture.accountSet`（初值来自 `?accountSet=`，默认 `default`）：
    - `single`：只留 `deepseek-official`；
    - `attention`：`deepseek-official` 的 `remaining`、`toppedUp`、`granted` 都设为 0；`openrouter` 改为 `status: "unauthorized"`、`errorCode: "unauthorized"`、`lastSuccessAt: null`、`balance: null`；
  - `fixture.omit`（默认 `[]`）：去掉其中的 id。

  `deepseek-official` 在每个集合里都排第一，所以 `stale` 模式改 `accounts[0]` 的做法不变。
- 新增 `providers()`：记录 `['providers']`，返回上面同一集合映射出的 `{generatedAt, providers}`：
  - `accountMode` 取 `mode`；
  - `configured` 为 `status !== "not-configured" && adapter !== null`；
  - `status` 为 `adapter ? "pending" : "unsupported"`；
  - `fetchedAt` 为 `null`。
- `?holdAccount=1`：第一次 `account()` 等到 `fixture.releaseAccount()` 被调用后才返回，写法同现有的 `hold` / `releaseStats`（`:31`）。
- `?noProviders=1`：`stats` 上不定义 `providers`，模拟旧宿主。
- `current()`（旧宿主回退）不变。

### 9.5 新增与迁移的单测

- `tests/balance-model.test.js`：见 5a。
- 新建 `tests/balance-view.test.js`，按 `tests/timeline-view.test.js` 的方式，用 `renderToStaticMarkup` 和真实的中英文案渲染：
  - 默认账户集：标记里 `data-account-id` 的顺序同 §9.3 第 1 条；
  - 单账户：没有 `dss-bal-kpis`；
  - 全部未接入：有 `balance.noActive` 的文字，`details` 带 `open`；
  - `remote: false`：有 `balance.unavailable` 的文字，没有 `balance-retry`；
  - `state: {kind: "error"}` 且没有数据：有 `balance-retry`；
  - 带 `LEGACY_ACCOUNT_API` 警告：有 `dss-bal-note`，不含警告的 `message`；
  - `actionUrl` 是 `http:`：没有 `dss-bal-link`；
  - 中英两套文案渲染后都不含字面量 `balance.`（没有漏键），并且两套的 `balance.*` 键集合相同；
  - 5d：`providers: null` 时有 3 个骨架行；传入 providers 时骨架行带名字。

  静态渲染不会执行 effect，组件在渲染路径上不能调用 `useLayoutEffect`（§7.4 已把 `Popover` 的翻转测量放进打开后才挂载的内部组件）。
- `tests/reliability-ui.test.js:90-96`：改为断言 `BalanceView` 在 `{kind: "stale", error: "Connection lost"}` 下仍渲染 `data-account-id="deepseek-official"` 和"¥12.30"，并且不含 `balance.status.`。另加一条：`balanceHeaderState({kind: "stale", error: "Connection lost"}, result, true)` 等于 `{kind: "stale", at: 1000, error: "Connection lost"}`，用它渲染的 `StatusBanner` 含 `source.stale` 和 `Connection lost`。
- `tests/pure.test.js`：删除 `:44-49` 的 `providerPickerLabel` 用例和 `:11` 的导入。重名问题由 `accountMeta` 的用例覆盖。
- `tests/styles.test.js`：新增一条：CSS 不含 `dss-balance`、`dss-provider-picker`、`dss-quota`、`--dss-hero-card`、`--dss-hero-metric`、`--dss-balance-`；`.dss-bal-` 规则里没有 `overflow` 为 `auto` 或 `scroll` 的声明。
- `tests/client-dialog.test.js`（5c）：静态渲染 `Popover`，按钮的 `title` 和 `aria-label` 默认等于 `label`；传 `title` 只改 `title`；函数形式的 `children` 在关闭时不会被调用。

## 10. 门禁

沿用上位文档 §10：

```bash
npm test
TZ=UTC npm test
npm run build && git diff --exit-code -- lib   # 构建产物与提交一致
node --check lib/*.js
npm pack --dry-run
```

- 浏览器 smoke 以 CI 为准。用 `gh run download <run-id> -n browser-results` 下载截图，逐张检查余额页的深色、浅色和窄屏截图，至少看：
  - `desktop-balance`、`mobile-balance`、`mobile-balance-bottom`、`narrow-balance`；
  - `desktop-balance-attention`、`balance-failed`、`dark-balance`、`narrow-stale-balance`、`narrow-dark-stale-balance`；
  - 5c 起加 `mobile-balance-alert`，5d 起加 `desktop-balance-skeleton`。
- 价格机器人会推送 main：推送前先 `git pull --rebase origin main`；`lib/` 冲突时不要手工合并，重新 `npm run build` 后 `git add lib` 再继续 rebase，然后重跑门禁。
- 已知环境问题：`tests/pricing-delivery.test.js:52` 在慢沙箱里可能超时，以 CI 为准，不要在本切片里修改它。
- `npm run smoke:web` 需要一个真实的 DSH Web，不在 CI 里。5b 和 5e 各跑一次；用哪个实例由维护者决定，跑不了就在汇报里写明。

## 11. 风险与对策

| # | 风险 | 对策 |
| --- | --- | --- |
| R1 | 迁移 smoke 时顺手删掉了断言 | §9.2 逐行对照；原有断言只换选择器，不删除；汇报里写 `report.checks` 改造前后的组数 |
| R2 | 多币种合计的浮点误差（0.1 + 0.2） | 按"分"累加（B3），5a 单测覆盖 |
| R3 | 百分比四舍五入后和颜色阈值打架（显示"5%"却是红色） | 一律向下取整（B6），5a 单测覆盖 4.96 |
| R4 | 保存提醒后这一行重排，焦点丢失 | 行以 `account.id` 为 key，React 只移动节点；§9.3 第 16 条断言 `activeElement` 是同一个铃铛 |
| R5 | 60 秒自动刷新打断正在填写的弹层 | 弹层状态在 `BalanceAlert` 内，行的 key 稳定，刷新只更新 props；账户被移出时把焦点交给 `.dss-panel`（§9.3 第 23 条） |
| R6 | 提醒只存在当前浏览器，换设备或清缓存后丢失 | 弹层说明里写明"只保存在当前浏览器"；不做跨设备同步（非目标） |
| R7 | 账户币种变化后提醒误报 | 只在币种一致时生效，不换算（B8）；§9.3 第 21 条 |
| R8 | 旧宿主没有 `stats/providers` | `readProvidersRemote` 返回 `null`，调用方吞掉错误，退回 3 行无名占位；§9.3 第 27 条断言没有报错 |
| R9 | `stats/providers` 在其他标签页被调用，或被重复调用 | 只在余额 effect 里调用，用 ref 保证每次挂载最多一次；§9.3 第 24、26 条 |
| R10 | 余额页的摘要条类名和总览的 `.dss-kpis` 撞车，smoke 误判总览已渲染 | B14：不复用类名 |
| R11 | 扩展 `Popover` 影响总览的"筛选项目" | 新参数都是可选的，默认行为不变；翻转测量只在打开后挂载；现有筛选 smoke 必须全部通过 |
| R12 | 夹具扩充后，其他依赖"只有两个账户"的断言失败 | 先 `grep` `__fixture.data.accounts` 和 `minimax-coding` 的所有用法；`deepseek-official` 在每个集合中都排第一，`stale` 模式不受影响 |
| R13 | 骨架换成真实数据时闪烁或跳动 | 骨架行和真实行用同一套列宽；数据到达后整体替换，不做逐行动画 |
| R14 | 宿主英文警告漏进中文界面 | B7、B12：正文只认 `code`；§9.3 第 10 条和 §9.5 的"不含字面量"单测 |

## 12. 待定事项与默认值

以下各项先按默认值实施，评审时可以再调整，都不阻塞开工：

| 事项 | 默认 |
| --- | --- |
| 订阅额度阈值 | 剩余 <20% 为 warn，<5% 为 danger，全局固定，不按账户配置 |
| 余额提醒 | 默认不设；余额为 0 始终是 danger；金额上限 1e9，最多两位小数 |
| 摘要条显示条件 | 列表里 ≥2 个账户，与宽度无关 |
| 未接入组 | 默认收起；全部未接入时默认展开 |
| OpenRouter"可用"额度条 | 始终用强调色，不套额度阈值 |
| 外链文字 | 余额"充值"，订阅"管理"，未接入组"控制台" |
| 重置时间 | 相对时间 + 北京时间 tooltip；渲染时取一次"现在"，随 60 秒刷新更新 |
| 原型里的 toast | 不做 |
| `docs/images/balance-minimax.png` | 删除，README 改为一张多账户截图（5e） |
| 发布归属 | 并入 0.5.0 发布说明（尚未打 tag）；由维护者在发布前确认 |

