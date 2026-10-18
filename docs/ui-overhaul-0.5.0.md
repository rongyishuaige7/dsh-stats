# 0.5.0 界面改版实施文档

- 状态：方向已确认，待实施
- 日期：2026-10-18
- 基线：`a833247`（`package.json` 已是 0.5.0，尚未打 tag，npm 仍是 0.4.3）
- 设计参考：[`docs/prototypes/overview-0.5.0.html`](prototypes/overview-0.5.0.html)。这是自包含的静态原型，打开后可以切换宽度、数据状态和改动标注。原型数据是虚构样例。
- 范围：0.5.0 包含切片 1a、1b、2、3 和收尾发布；切片 4（时间线）、切片 5（趋势与余额）放到 0.5.x。

本文写明每个切片改哪些文件、加哪些组件、怎样测试、怎样验收。实现时如果和原型冲突，以本文为准；本文没写到的视觉细节，以原型为准。

## 1. 现状问题

以下问题来自 `a833247` 的代码和 CI 浏览器截图（`browser-results`，33 张）：

| # | 问题 | 位置 |
| --- | --- | --- |
| P1 | 总览 9 张卡片等权排列，最受关注的预估费用和"轮/步""工具时长"一样大 | `SummaryCards`，`src/client.cjs:58` |
| P2 | 项目卡片是 11 项指标的网格，项目之间很难横向比较 | `ProjectsTable` → `pm()`，`src/client.cjs:171-330` |
| P3 | 图例 chip 最多 50 个一页，挤在 KPI 和项目列表之间；chip 是带 `onClick` 的 `span`，键盘无法操作 | `Legend`，`src/client.cjs:122` |
| P4 | 多层嵌套滚动：`.dss-overlay`、`.dss-body`、`.dss-overview.bounded` 计算出的高度、`.dss-pcards-viewport` 各自滚动。底边对齐靠 `timelineOverviewContentHeight() + TIMELINE_CONTROLS_HEIGHT(90)` 估算 | `src/client.cjs:410-427`、`975` |
| P5 | 头部 5 个文字按钮（价格设置、刷新、CSV、JSON、关闭）。价格面板直接插在 `.dss-body` 顶部，打开后正文被整体下推 | `src/client.cjs:958-971` |
| P6 | 数据状态条在 `exact` 时也占一整行；免责声明 `hint.cost` 长期占着日期导航行 | `StatsDataStatus` :758，`DateNavigator` :587 |
| P7 | 字号多达 19 种（9.5–34px），最小 9.5px | `client-styles.cjs` 和 `client.cjs` 中的内联 CSS |
| P8 | 没有 Esc 关闭，没有 `role=dialog`、`aria-modal` 和焦点管理；顶部 tabs 不是 tablist；`CostValue` 用 `span[role=button]` 模拟按钮 | 全仓库 |
| P9 | CSS 分散在三处：`client-styles.cjs`，以及 `apply()` 里的 `_phaseDCSS`（:1417）和 `pricingCSS`（:1465）。41 条浅色覆盖都在内联 CSS 中 | `src/client.cjs:1417-1558` |
| P10 | CI 浏览器没装 CJK 字体，中文截图不能用于视觉验收 | `.github/workflows/ci.yml` |

## 2. 目标与非目标

### 目标

1. 打开总览首屏就能回答两个问题："这段时间花了多少""钱主要花在哪些项目上"。
2. 面板只有一个滚动容器（`.dss-body`）。各标签页、按日和全部模式下，面板底边始终在同一条线上。
3. 全程可以用键盘操作：Esc 按层关闭，焦点限制在面板内，关闭后焦点回到原处，顶部是标准 tablist，表头排序带 `aria-sort`。
4. 颜色和字号统一走 `--dss-*` token。字号收敛到 6 档，最小 11px。
5. 统计口径、分页预算、偏好存储格式、导出内容和宿主兼容范围全部不变。

### 非目标

- 不改宿主 Service、RPC schema、聚合口径、定价逻辑和签名价格目录。
- 不新增依赖，不使用 primitives 的 Modal、Menu、Tooltip、Button 等组件（它们的 API 在各个 Harness 版本间是否稳定还没有验证）。
- 不改 CSV/JSON 字段和内容，只改导出的入口。
- 不改 `StatsTrigger` 的外观，只补可访问性属性。
- 时间线、趋势和余额的重做不进 0.5.0（见切片 4、5）。
- 不处理和 UI 无关的遗留问题（README:192 的 generic-usage 描述、`pricing-updates.md` 中 6 小时与 30 分钟的出入、本地 `tests/pricing-delivery.test.js:52` 超时）。这些另行处理。

## 3. 兼容约束

| 约束 | 要求 |
| --- | --- |
| Harness | 继续支持 `0.1.0-rc.6` 到 `0.2.1-rc.2`。CI 矩阵见 `scripts/harness-versions.json`（8 个版本） |
| React | 用宿主注入的 React 18，继续用 `createElement`（`e`），不引入 JSX |
| 图标 | 触发器和关闭按钮继续用 primitives 图标并保留回退（`IconDataOutline16 \|\| IconDataOutlineRegular`）。新图标（刷新、下载、齿轮、筛选、箭头、信息、警告）以内联 SVG 写在新文件 `src/client-icons.cjs`，统一 `stroke="currentColor"`、`aria-hidden="true"` |
| 偏好 | `dsh-stats.tab`、`dsh-stats.hidden`、`dsh-stats.nav` 的键名和值格式不变，旧值直接可用，不做迁移 |
| 主题 | 宿主用 `body[data-ds-dark-theme]` 表示深色。CSS 回退值是深色；浅色覆盖统一写成 `body:not([data-ds-dark-theme])` 下的 token 重定义 |
| 构建产物 | `lib/*` 由 `npm run build` 生成，提交时必须和新构建逐字节一致（CI 会执行 `git diff --exit-code -- lib`） |
| 浏览器 | 依赖容器查询（Chrome 105+、Safari 16+、Firefox 110+）和 `dvh`（Chrome 108+，用 `vh` 作回退）。这两项写进 `docs/compatibility.md` |

## 4. 已锁定的设计决策

**D1 总览 KPI。** 4 个主指标一行，费用格最宽、字号最大。

| 格 | 主值 | 副行 |
| --- | --- | --- |
| 预估费用 | `fmtCostSummary(mergeCostSummaries(visible.map(projectCostSummary)))` | 按日模式："较 MM-DD ↑12%"，比较对象是上一个活跃日（见 D9）；全部模式："N 个活跃日 · 日均 ¥X"。有未计价 Token 时追加"另有 X Token 待计价"chip，点击打开价格抽屉 |
| Token | 输入 + 输出 | 三段比例条：缓存命中 / 未命中输入（含 cacheWrite）/ 输出；图例："输入 X · 命中 Y% · 输出 Z" |
| 会话 | 主对话数 | "另有 N 个子对话"（N 为 0 时不显示） |
| LLM 时长 | `Σ llmMs` | "工具 X" |

费用格标题旁有一个 ⓘ 按钮，悬停或聚焦时显示说明："按公开模型价格估算，USD 按固定汇率换算为人民币，仅供参考，不等同于 Provider 账单"。汇率和日期从价格目录读取，不写死。`hint.cost` 不再出现在日期导航行。

**D2 次级指标条。** KPI 下方是一行纯文本，空值项直接省略：项目数 · 轮/步 · 首 token 均值（`Σ ttftMs / Σ ttftSteps`）· 输出速度（`Σ decodeTokens / Σ decodeMs`）。按日模式追加"活跃时段 HH:MM–HH:MM"，全部模式追加"活跃日 N"。这些都是精确的加和比值，不做近似加权。

**D3 项目表格。** 7 列：项目（色点、名称、路径）/ 会话（`主 +子`）/ Token（总量，副行"入 · 出"）/ 缓存命中 / LLM 时长 / 预估费用（金额加占比条）/ 最近活跃（按日模式改为"活跃时段"）。

- 点击表头排序，当前列 `aria-sort` 为 `ascending` 或 `descending`。默认按费用降序；排序状态和现在一样不持久化。
- 点击行或行首箭头展开详情：轮/步、工具、首 token、tok/s、完整路径，下面是会话子列表。会话子列表沿用现有渲染，每页 100 条，主对话和子对话分组，点击标题打开对话。
- 面板容器宽度小于 640px 时，每行变成两行卡片，表头隐藏，出现"排序"下拉框和升降序按钮。
- 当前 11 项卡片指标在新表格中都能找到，对照见 §9.1。

**D4 项目筛选。** 总览里不再显示图例，改为工具行右侧的"筛选项目"按钮。有隐藏项目时按钮上显示"已隐藏 N"。弹层内是搜索框和复选框列表（色点、名称、当前视图费用），每页 50 项，复用 `data-pages="legend"`；还有"全部显示"按钮，以及一行说明"隐藏的项目不计入指标和表格"。隐藏状态仍存在 `dsh-stats.hidden`。总览和时间线共用这个按钮；趋势视图维持现状，不受隐藏影响。

**D5 价格设置抽屉。** 价格设置从正文顶部移到面板右侧的抽屉里：宽 `min(460px, 100%)`，带遮罩，内容区自己滚动。头部齿轮按钮负责开关。任何"待计价"chip 都能打开抽屉，并直接定位到对应模型的新建规则表单（见 §7.3 `focusModel`）。

**D6 数据状态。** 头部状态点显示 `已同步 · HH:MM`、`正在刷新…`、`数据不完整 · HH:MM`、`本地摘要` 等。只有 `partial`、`stale`、`fallback`，或 `exact` 但带非空 `state.error` 时，才在头部下方显示横幅，诊断信息放在可折叠的 `<details>` 里。余额标签页隐藏状态点，`BalanceView` 自己显示状态。

**D7 头部。** 布局为：标题 | tablist | 状态点 | [刷新图标] [导出 ▾] [齿轮图标] | 关闭图标。导出菜单有两项："CSV 表格 · 当前视图 N 个项目"和"JSON 数据 · 含会话与计价明细"。余额页不显示导出。原型里的导出 toast 去掉，浏览器自带下载提示。

**D8 `*` 的含义不变。** 原型用 `*` 表示"含估算"，实现不采用这个含义。`fmtCostSummary` 现在只给 `partial`（含未计价 Token）的金额加 `*`，所有位置继续保持这一含义。`estimated` 和 `exact` 的区别由 ⓘ 说明和 `title` 承担，金额上不加标记。理由有两个：用户已经熟悉现有标记；`browser-fixture-smoke.mjs:255` 也依赖它。

**D9 日环比口径。** 比较对象是"上一个活跃日"，即 `dates` 中当前日期的前一项，不一定是昨天，所以文案里必须写明具体日期。满足任一条件时不显示环比：没有上一个活跃日；任一侧状态是 `partial` 或 `unsupported`；上一日金额为 0。百分比四舍五入取整，箭头表示方向。

**D10 单一滚动。** `.dss-overlay` 不再滚动。`.dss-panel` 是固定高度的 flex 纵向容器，只有 `.dss-body` 滚动，表头 `position: sticky; top: 0`。面板高度和内容无关，所以各标签页、按日和全部模式的底边天然对齐。这一点取代 `0c32a5c` 的高度估算。

## 5. 面板结构

```
.dss-overlay                         fixed，遮罩，不滚动；点击遮罩关闭
└─ .dss-panel                        role=dialog aria-modal=true aria-labelledby=dss-title
   │                                 固定高度，flex 纵向，container: dss-panel / inline-size
   ├─ .dss-head                      h2#dss-title | .dss-tabs[role=tablist] | .dss-data-status | 操作组 | 关闭
   ├─ .dss-status-banner             仅在 D6 条件下出现，role=status
   ├─ .dss-body                      role=tabpanel，唯一滚动容器
   │  ├─ .dss-tools                  按日/全部 · 日期导航 · 筛选项目（总览、时间线）
   │  ├─ .dss-kpis                   OverviewKpis
   │  ├─ .dss-strip                  OverviewStrip
   │  └─ .dss-projects               标题行 + .dss-ptable（thead sticky）+ 分页
   └─ .dss-drawer-scrim + .dss-drawer  价格抽屉，absolute，覆盖面板右侧
```

尺寸：

- 桌面：`.dss-overlay` 的 padding 保持 `6vh 3vw 4vh`。`.dss-panel` 为 `width: min(1180px, 100%)`、`height: min(1000px, calc(100vh - 10vh))`，后面再写一条用 `100dvh` 的同名声明作为渐进增强。
- 视口宽度不超过 600px：面板全屏，`height: 100vh; height: 100dvh`，无圆角。

菜单和抽屉都用 `position: absolute`，相对自己的包裹元素或面板定位，不用 fixed，所以不受容器查询的包含块影响。现有全局 tooltip（`showTip`）挂在 `body` 上，不受影响。

## 6. 样式基础

### 6.1 Token

Token 定义在两个根元素 `.dss-overlay, .dss-trigger` 上。浅色值写在 `body:not([data-ds-dark-theme]) :is(.dss-overlay, .dss-trigger)` 下，只重定义 token。组件样式只用 token，不再出现针对单个组件的浅色覆盖。

| Token | 默认值（深色回退） | 浅色覆盖 |
| --- | --- | --- |
| `--dss-text` | `var(--dsw-alias-label-primary, #e7eaf0)` | `var(--dsw-alias-label-primary, #111827)` |
| `--dss-text-2` | `var(--dsw-alias-label-secondary, #a6adbb)` | `…, #4b5563` |
| `--dss-text-3` | `var(--dsw-alias-label-tertiary, #6b7280)` | `…, #6b7280` |
| `--dss-line` | `var(--dsw-alias-border, #2a303c)` | `…, #e5e7eb` |
| `--dss-line-soft` | `color-mix(in srgb, var(--dss-line) 60%, transparent)` | 同左 |
| `--dss-panel` | `var(--dsw-alias-bg-layer-1, #161a21)` | `…, #ffffff` |
| `--dss-layer` | `var(--dsw-alias-bg-layer-2, #1d222c)` | `…, #f8f9fa` |
| `--dss-hover` / `--dss-active` | `var(--dsw-alias-interactive-bg-hover/active, …)` | 宿主值 |
| `--dss-accent` | `var(--dsw-alias-state-business-primary, #4f8cff)` | `…, #2563eb` |
| `--dss-cost` | `#ff922b` | `#c2510f`（保证浅色背景上的对比度） |
| `--dss-warn` / `--dss-warn-soft` / `--dss-warn-line` | 琥珀色系 | 加深后的琥珀色系 |
| `--dss-ok` / `--dss-danger` | `#34d399` / `#f87171` | `#047857` / `#dc2626` |
| `--dss-shadow` | `var(--dsw-shadow-lv3, 0 12px 40px rgba(0,0,0,.45))` | 宿主值 |
| `--dss-mask` | `var(--dsw-alias-bg-mask-1, rgba(0,0,0,.5))` | 宿主值 |
| `--dss-tip-bg` | `var(--dsw-alias-tooltip-bg, #0b0d12)` | 宿主值 |
| `--dss-p0` … `--dss-p15` | 16 色项目调色板（现有值） | 不变 |

`color-mix()` 要求 Chrome 111 以上。如果实现时发现目标宿主版本不支持，`--dss-line-soft` 改用固定的半透明值。

### 6.2 字号

`--dss-fs-xs: 11px; --dss-fs-sm: 12px; --dss-fs-md: 13px; --dss-fs-lg: 15px; --dss-fs-xl: 20px; --dss-fs-2xl: 28px`。

现有字号按下表映射（切片 1a 机械替换）：

| 现有 | 映射为 |
| --- | --- |
| 9.5 / 10 / 10.5 / 11 | `xs` 11 |
| 11.5 / 12 | `sm` 12 |
| 12.5 / 13 / 13.5 | `md` 13 |
| 14 | `md` 13；触发器 `.dss-trigger` 保持 14px，和宿主侧栏对齐，是唯一例外 |
| 15 / 16 | `lg` 15 |
| 17 / 18 / 21 / 22 | `xl` 20 |
| 24 / 30 / 34 | `2xl` 28 |

`em` 相对字号（如上标 `.55em`）和 `inherit` 不受限制。`CostValue` 里的内联 `fontSize: "12px"` 随组件一起在切片 3 删除。

### 6.3 其它

- 间距按 4px 栅格取值（4/6/8/10/12/14/16/20），这一条只作约定，不做 lint。
- 圆角：面板 14，卡片/表格容器 12，按钮 7，chip 5。
- 数字列统一 `font-variant-numeric: tabular-nums`。
- `@media (prefers-reduced-motion: reduce)` 下，关闭所有 `.dss-*` 的过渡和动画。
- 键盘焦点统一使用 `:focus-visible { outline: 2px solid var(--dss-accent); outline-offset: 2px }`。

## 7. 新增与改动的模块

### 7.1 文件

| 文件 | 内容 | 切片 |
| --- | --- | --- |
| `src/client-styles.cjs` | 唯一的 CSS 来源，并入 `_phaseDCSS` 和 `pricingCSS`；加入 token、字号和新组件样式 | 1a 起 |
| `src/client-icons.cjs`（新） | 内联 SVG 图标组件 | 2 |
| `src/client-dialog.cjs`（新） | `LayerContext`、`useLayer`、`useDialogFocus`、`trapTab`、`MenuButton`、`Popover`、`InfoTip` | 1b / 2 |
| `src/client-header.cjs`（新） | `StatusIndicator`、`StatusBanner`、`ExportMenu`、`PricingDrawer` | 2 |
| `src/client-overview-model.cjs`（新） | 总览纯函数，不依赖 React，见 §7.4 | 3 |
| `src/client-overview.cjs`（新） | `OverviewTools`、`ProjectFilterMenu`、`OverviewKpis`、`OverviewStrip`、`ProjectTable`、`ProjectSessions` | 3 |
| `src/client.cjs` | `StatsPanel` 改为组装上述组件；删除 `SummaryCards`、`CostValue`、`Legend`、`ProjectsTable`、`DateNavigator`、高度估算函数和内联 CSS | 1a–3 |
| `src/pricing-panel.cjs` | 新增可选属性 `focusModel` | 2 |
| `src/client-locale.cjs` | 新文案键（§7.5） | 2–3 |

新文件由 `scripts/build.mjs` 从入口打包进现有 4 个 bundle，不增加 bundle 数量，也不改变 `package.json` 的 `files`。

### 7.2 可访问性组件（`client-dialog.cjs`）

- **`LayerContext` / `useLayer(open, close)`**：菜单、弹层、抽屉打开时，把 `close` 压入面板持有的栈，关闭或卸载时出栈。
- **面板的 Esc 处理**：`onKeyDown` 绑在 `.dss-panel` 上，不注册 `document` 级监听。按 Esc 时，栈非空就弹出最上层并调用它，栈为空就调用 `onClose()`；两种情况都执行 `preventDefault()` 和 `stopPropagation()`，避免宿主同时响应。
- **`useDialogFocus(panelRef, open)`**：打开时记下 `document.activeElement`，再把焦点移到面板内第一个可聚焦元素（通常是当前 tab）。关闭时，如果记下的元素还在文档里就还焦点给它，否则聚焦 `.dss-trigger`。
- **`trapTab(ev, root)`**：Tab 和 Shift+Tab 在 `root` 内循环。可聚焦元素按 `button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])` 查询，排除 `disabled`、`hidden` 及不可见元素。抽屉打开时，`root` 换成抽屉。
- **tablist**：`.dss-tabs[role=tablist][aria-label]`。每个按钮带 `role=tab`、`id=dss-tab-<name>`、`aria-selected`、`aria-controls=dss-tabpanel`，用 roving `tabIndex`。←/→/Home/End 只移动焦点，Enter/Space 才切换（手动激活）。原因：自动激活时，方向键扫过余额页就会触发 `account` RPC，破坏 smoke 中"余额只在其标签页查询"的断言。`.dss-body` 带 `id=dss-tabpanel`、`role=tabpanel`、`aria-labelledby`。
- **`MenuButton`**：`button[aria-haspopup=menu][aria-expanded]`，弹出 `div[role=menu]`，菜单项是 `button[role=menuitem]`。↑/↓/Home/End 移动焦点；Esc 关闭并把焦点还给按钮；点击外部或 Tab 离开时关闭。
- **`Popover`**：给筛选弹层用，内含复选框和搜索框，所以用 `role=dialog` 加 `aria-label`，不用 `role=menu`。Esc 和外部点击的行为与 `MenuButton` 相同。
- **`InfoTip`**：一个 `button[aria-describedby]`，外加 `span[role=tooltip]`。纯 CSS 实现，`:hover` 和 `:focus-visible` 时显示，不用 JS 定位。

### 7.3 头部组件（`client-header.cjs`）与 `PricingPanel` 改动

- **`StatusIndicator({ state, remote, t })`**：根元素保留 `className="dss-data-status " + state.kind`，这样 `browser-fixture-smoke.mjs` 和 `rc2-browser-smoke.mjs` 现有的等待条件继续有效。文字：`exact` 显示 `t("status.synced") + " · " + fmtClock(state.at)`；`loading`/`refreshing` 显示正在刷新；`partial` 显示数据不完整加时间；`stale` 显示数据已过期加时间；`fallback` 显示 `t("source.local")`。
- **`StatusBanner({ state, remote, t, onRetry })`**：`section.dss-status-banner.<kind>[role=status]`，按 D6 的条件渲染。`state.error` 放在 `details.dss-data-diagnostics` 中，类名不变，因为 rc2 smoke 会读取 `.dss-data-diagnostics div`。`fallback` 和 `stale` 带"重试"按钮，调用 `refreshCurrent`。
- **`ExportMenu({ projects, t })`**：用 `MenuButton` 包装现有的 `exportCSV(dateProjects, t)` 和 `exportJSON(dateProjects)`，导出内容不变。
- **`PricingDrawer({ open, focusModel, onClose, ... })`**：`aside.dss-drawer[role=dialog][aria-labelledby]`，内部用 `PricingErrorBoundary` 包住 `PricingPanel`，内容根节点仍是 `.dss-pricing`。点击遮罩或关闭按钮关闭；抽屉通过 `useLayer` 入栈。抽屉设 `container: dss-drawer / inline-size`；原 `pricingCSS` 中按视口宽度写的媒体查询改成 `@container dss-drawer`，否则桌面上 460px 宽的抽屉会套用宽屏布局。
- **`PricingPanel` 的新属性 `focusModel?: { provider, model, nonce }`**：
  - 初始状态从属性派生：`useState(() => focusModel ? blankDraft(focusModel.provider, focusModel.model) : null)`，同时 `advanced` 初始为 `true`。这样 `renderToStaticMarkup` 测试也能看到预填结果。
  - `useEffect([focusModel?.nonce])` 处理抽屉已打开时的再次定位：设置 draft 和 `advanced`，表单 `scrollIntoView({ block: "nearest" })`，然后聚焦第一个输入框。
  - `nonce` 每次点击 chip 都递增，同一模型连续点击也能重新定位。
  - `missingModels(projects)` 已按 tokens 降序排列。chip 取 `missingModels(scopeProjects)[0]`，为空时（例如本地回退数据没有 `u.cost`）只打开抽屉，不做定位。

### 7.4 总览纯函数（`client-overview-model.cjs`）

全部是纯函数，在 `module.exports` 中导出，并加进 `client.cjs` 的 `__test`。

| 函数 | 说明 |
| --- | --- |
| `overviewTotals(projects)` | 返回 `{ projects, main, subagent, turns, steps, llmMs, toolMs, input, output, cacheRead, ttftMs, ttftSteps, decodeMs, decodeTokens, cost }`。`cost` 为 `mergeCostSummaries(projects.map(projectCostSummary))`，派生值有 `cacheHitPct`、`ttftAvgMs`、`tps`（分母为 0 时为 `null`） |
| `previousActiveDate(dates, date)` | 返回 `dates` 中 `date` 的前一项，没有时返回 `null` |
| `costDelta(current, previous)` | 输入两个 summary，返回 `{ ratio, direction }` 或 `null`，规则见 D9 |
| `costShares(projects)` | 返回 `Map(projectId → share)`。分母是可见项目 CNY 金额之和；无金额的项目映射为 `null` |
| `projectDaySpans(timelineDay)` | 返回 `Map(projectId → { startSlot, endSlot })`，来自 `slotBlocks`，`endSlot` 不含在区间内 |
| `activeDayCount(timeline, hidden)` | 统计含可见项目 `slotBlocks` 的日期数，和日期导航的"活跃日"定义一致 |
| `sortProjects(projects, key, dir, ctx)` | `key` 取 `name`/`sessions`/`tokens`/`hit`/`llm`/`cost`/`last`。`cost` 复用 `compareProjectCost`；按日模式下 `last` 用 `ctx.spans` 的 `endSlot`。相等时按名称排序，保证结果稳定 |
| `pendingFocus(projects)` | 返回 `missingModels(projects)[0]` 或 `null` |

`StatsPanel` 中新增的 `useMemo`（上一活跃日的 `applyDate`、上一日 summary、spans）必须放在 `if (!open \|\| !open.open) return null` 之前，保证 hooks 数量不变。依赖项是 `[data.projects, prevDate, hiddenKey]`，每个视图只计算一次。

### 7.5 文案键

zh/en 两份同时加。沿用现有的前缀/后缀拼接方式（参见 `w.dayPrefix`），不引入插值。

- 头部：`status.synced`、`status.refreshing`、`status.partial`、`status.stale`、`status.local`、`action.refresh`、`action.export`、`action.pricing`、`export.csv`、`export.csvHint`、`export.json`、`export.jsonHint`、`banner.retry`、`banner.details`
- 工具行：`nav.today`、`nav.rangeFrom`、`filter.title`、`filter.hidden`、`filter.showAll`、`filter.search`、`filter.note`
- KPI 与指标条：`kpi.cost`、`kpi.costInfo`、`kpi.vs`、`kpi.activeDays`、`kpi.perDay`、`kpi.pending`、`kpi.tokens`、`kpi.input`、`kpi.hit`、`kpi.output`、`kpi.sessions`、`kpi.subagents`、`kpi.llm`、`kpi.tool`、`strip.projects`、`strip.turnsSteps`、`strip.ttft`、`strip.tps`、`strip.span`、`strip.activeDays`
- 表格：`table.project`、`table.sessions`、`table.tokens`、`table.hit`、`table.llm`、`table.cost`、`table.last`、`table.span`、`table.expand`、`table.collapse`、`table.sort`、`table.asc`、`table.desc`、`table.share`

`card.*`、`hint.cost`、`nav.day`/`nav.all` 保留到切片 3 结束。确认没有引用后再删除，并在提交说明里列出删掉的键。

## 8. 切片计划

每个切片单独提交、单独推送，CI 全绿后才开始下一个（门禁见 §10）。

| 切片 | 内容 | 版本 | 依赖 |
| --- | --- | --- | --- |
| 1a | 样式基础：合并 CSS、token、字号、reduced-motion、CI CJK 字体、样式 lint | 0.5.0 | — |
| 1b | 对话框可访问性：dialog 语义、Esc 栈、焦点限制与恢复、tablist | 0.5.0 | 1a |
| 2 | 头部与价格抽屉：状态点和横幅、图标按钮、导出菜单、PricingDrawer、`data-action` | 0.5.0 | 1b |
| 3 | 总览重排：KPI、指标条、筛选弹层、项目表格、单一滚动、smoke 迁移 | 0.5.0 | 2 |
| R | 收尾发布：截图、README、发布说明、DESIGN.md、真实 Web 验证、tag | 0.5.0 | 3 |
| 4 | 时间线 | 0.5.x | R |
| 5 | 趋势与余额 | 0.5.x | R |

### 切片 1a：样式基础

1. **合并 CSS，纯移动**。把 `_phaseDCSS` 和 `pricingCSS` 原样移到 `client-styles.cjs`，导出的 `css` 等于原来的 `css + _phaseDCSS + pricingCSS`；`apply()` 只注入 `css`。逐字节校验步骤：
   - 在 scratchpad 写一次性脚本（不入库），从 `git show a833247:src/client.cjs` 中截取两个变量的初始化表达式（都是纯字符串拼接），用 `new Function("return " + expr)()` 求值。
   - 拼接后和新的 `require("./src/client-styles.cjs").css` 比较，必须完全相等。
   - 这一步通过后再继续，比较结果写进提交说明。
2. **加入 token 和字号**。按 §6.1 和 §6.2 改写选择器，删掉 41 条组件级浅色覆盖，改成 token 级浅色覆盖。
3. 加 `prefers-reduced-motion` 和统一的 `:focus-visible`。
4. **CI 字体**：`ci.yml` 在浏览器 smoke 之前执行 `sudo apt-get update && sudo apt-get install -y --no-install-recommends fonts-noto-cjk`。
5. **新测试 `tests/styles.test.js`**：
   - `css` 里每个 `font-size` 必须是 `var(--dss-fs-*)`、`em` 值或 `inherit`；唯一允许的 px 值是 `.dss-trigger` 的 `14px`。
   - 所有引用的 `var(--dss-*)` 都已定义。
   - `src/*.cjs` 中不得出现 `fontSize:` 小于 11 的内联样式。
   - `src/client.cjs` 中不得再有形如 `.dss-xxx{` 的 CSS 片段。

验收：

- 默认时区和 `TZ=UTC` 下 `npm test` 都通过。
- CI 浏览器 smoke 的 13 组检查和 33 张截图全部通过，0 个控制台错误。
- 截图中中文正常显示。
- 深色和浅色截图与基线对比，只有字号和间距的细微变化，没有颜色错误（重点看浅色主题下价格面板和余额状态色）。

### 切片 1b：对话框可访问性

1. 给 `.dss-panel` 加 `role=dialog`、`aria-modal=true`、`aria-labelledby=dss-title`、`tabIndex=-1`，并接入 `useDialogFocus` 和 `trapTab`。
2. 加 Esc 处理（此时栈为空，Esc 直接关闭面板）。
3. tabs 改为 tablist（§7.2），`.dss-tabs` 类名和按钮顺序不变，smoke 的 `tab(i)` 不用改。
4. 触发器补 `aria-haspopup=dialog` 和 `aria-expanded`。
5. smoke 增加 `press(key)` 辅助函数（CDP `Input.dispatchKeyEvent`），并新增以下断言：
   - 打开面板后焦点在当前 tab 上。
   - 从最后一个可聚焦元素按 Tab 回到第一个，Shift+Tab 反向。
   - ←/→ 只移动焦点，Enter 才切换标签页，并且没有额外的 `account` 调用。
   - 按 Esc 关闭面板后，焦点回到 `.dss-trigger`。

验收：上面的断言通过，原有断言不变。在 DSH 0.2.1-rc.2 Web 上手动确认：生成回复期间在面板内按 Esc，只关闭面板，不会中断宿主正在进行的生成（风险 R1）。

### 切片 2：头部与价格抽屉

1. 用 `client-icons.cjs` 改写头部：刷新、齿轮、关闭做成 `.dss-icon-btn`（带 `aria-label` 和 `title`），导出做成 `MenuButton`。
2. 用 `StatusIndicator` 和 `StatusBanner` 替换 `StatsDataStatus`。`__test` 中保留 `StatsDataStatus` 这个名字作为两者的组合导出，让 `tests/reliability-ui.test.js` 平滑迁移；切片 3 结束时删除这个别名。
3. 价格设置从 `.dss-body` 顶部移到 `PricingDrawer`。`showPrices` 状态改为 `drawer: { open, focusModel }`。暂时还没有"待计价"chip（切片 3 才加），这里先把 `focusModel` 实现好并写好单测。
4. 原 `pricingCSS` 中的视口媒体查询改为 `@container dss-drawer`。
5. 加稳定的测试钩子：`data-action` 取值为 `refresh`、`export`、`export-csv`、`export-json`、`pricing`、`close`、`retry`、`drawer-close`。
6. 同步更新 `scripts/rc2-browser-smoke.mjs`：价格设置按钮从按文本点击改为 `[data-action=pricing]`；诊断仍从 `.dss-data-diagnostics div` 读取。

smoke 改动：

- `refresh()` 改为点击 `[data-action=refresh]`。
- 价格面板相关检查改为先打开抽屉。catalog 的"320px 下检查全部规则"和"七个宽度下展开卡片"继续执行。桌面宽度下，抽屉内应使用窄布局。
- 新增断言：Esc 先关闭导出菜单，焦点回到导出按钮；再按 Esc 关闭抽屉，焦点回到齿轮；第三次 Esc 关闭面板。
- 641/700/768/1024/1100/1101px 英文头部的"不重叠、不裁切"检查保持不变。

验收：

- 价格预览、保存、编辑和离线刷新的 smoke 全部通过。
- `exact` 时没有横幅；`partial`、`stale`、`fallback` 时横幅可见，诊断信息可展开。
- 导出文件内容与改动前一致（`projectCsvTable` 等现有单测保持通过）。

### 切片 3：总览重排

1. 实现 §7.4 的纯函数和单测。
2. 实现 `OverviewTools`：
   - 按日/全部用 `aria-pressed` 分段按钮，`data-action=mode-day` / `mode-all`。
   - 日期导航：前一天、后一天、"YYYY-MM-DD 周X"，当天加"今天"标记，`aria-live=polite`。
   - 全部模式下显示"全部历史 · 首日起"。
   - `ProjectFilterMenu`。
   - 总览和时间线都用 `OverviewTools`，趋势视图只显示日期部分。
3. 实现 `OverviewKpis` 和 `OverviewStrip`（D1、D2）。待计价 chip 带 `data-action=pricing-pending`，打开抽屉并传入 `pendingFocus(visibleProjects)`。
4. 实现 `ProjectTable`（D3）：
   - 结构：`table.dss-ptable`，表头是 `th[data-sort-key] > button`；行是 `tr.dss-prow[data-project-id]`，内有 `button[data-action=expand][aria-expanded]`；详情行是 `tr.dss-pdetail > td[colSpan]`，内含 `ProjectSessions`。
   - 每页 50 个项目，复用 `pageRows` 和 `PageControls`，保留 `data-pages="projects"`。
   - 会话子列表保留 `.dss-sess[data-session-id]`、`.dss-group`、`.dss-sess-title` 和 `data-pages="sessions"`。
   - 行内"待计价"chip 的 `focusModel` 为 `pendingFocus([project])`。
   - 窄屏时显示 `select#dss-sort` 和 `[data-action=sort-dir]`。
   - 页码重置规则与现在相同：日期、隐藏集合或排序变化时回到第一页，同一视图的数据刷新时不重置。
5. 改为单一滚动（D10）：
   - 删除 `.dss-overview.bounded`、`--dss-overview-max-height`、`timelineOverviewContentHeight`、`TIMELINE_CONTROLS_HEIGHT`、`.dss-pcards-viewport`。
   - 时间线自己的 `timelineAllViewportHeight` 视口留到切片 4 再去掉。在此之前，时间线的"全部"模式会暂时保留一层内部滚动，这是已知的过渡状态。
6. 删除 `SummaryCards`、`CostValue`、`Legend`、`ProjectsTable`、`DateNavigator`、`StatsDataStatus` 别名，以及对应的 CSS（`.dss-cards`、`.dss-card`、`.dss-pcard*`、`.dss-sortbar*`、`.dss-chip`、`.dss-legend*`、`.dss-nav*`）。同时更新 `__test` 导出。
7. 按 §9.2 迁移 smoke，同步更新 `rc2-browser-smoke.mjs` 的 `summaryCards` 采集，改为读取 `.dss-kpi` 的 `.dss-kpi-k` 和 `.dss-kpi-v`。

验收：§9 的对照表全部满足，§10 门禁通过，下面这些规模不变式继续成立：

- 大数据集（120 个项目、205 个会话、75 天）中，每个项目、筛选项、会话、历史日期都能翻到，并且没有重复。
- 每页挂载的行数不超过 50、100、30。
- 翻页不改变 KPI 文本。
- 改变排序、日期或隐藏集合时回到第一页；最近日按钮回到最新一页。

### 切片 R：收尾发布

1. 用 CI 的 `browser-results`（已装 CJK 字体）重新生成 README 截图：`docs/images/hero-overview.png`、`overview.png`，以及价格抽屉截图。截图来自 fixture 数据，不含真实路径或账户信息。`timeline.png`、`trends.png`、`balance.png` 等切片 4、5 完成后再换。
2. 更新 `README.md`、`README.zh.md`、`README.en.md` 中的总览说明、价格设置入口和键盘操作说明。
3. 更新 `docs/release-0.5.0.md`：把"UI polish: project overview bottoms align…"一条替换为总览改版的要点（D1–D10 的用户可见部分），并刷新验证数字（测试数、截图数、检查组数）。
4. 更新 `DESIGN.md` 的"当前实现"一节到 0.5.0，删除已经过时的描述。
5. 在 DSH 0.2.1-rc.2 上做真实 Web 验证，深浅两种主题都要看。验证项：
   - 打开、关闭面板，Esc 不影响宿主。
   - 状态点、横幅和诊断信息。
   - 筛选项目，以及隐藏状态在重开面板后保留。
   - 表格排序、展开行、打开会话。
   - 从待计价 chip 进入抽屉，保存自定义价格后数字刷新。
   - 导出 CSV 和 JSON。
   - 390px 宽度下的布局。

   结果写进 `docs/compatibility.md`，并运行 `npm run smoke:web`。
6. 推送并确认 CI 全绿后打 `v0.5.0` tag，由 `publish.yml` 发布到 npm。打 tag 和发布是对外动作，执行前需要再次确认。

可选方案：如果需要尽快让用户用上 0.2.1 支持，可以在切片 1a 之前从 `a833247` 发布 `0.5.0-rc.1`，UI 改版随正式版发布。默认不这样做。

### 切片 4（0.5.x）：时间线

只做规划，实施前再出细化文档。

- 色块高度铺满整行，用透明度表示占用时长，保证最小可见尺寸，替代现在的 `max(2px)` 高度编码（`src/client.cjs:528`）。
- 轴和轨道共用 48 列网格，每 3 小时一个刻度标签，窄屏时每 6 小时一个。
- 取消时间线内部滚动，翻页仍为每页 30 天。
- 全部模式新增"日期 × 时段"热力矩阵。
- 时间线下方显示可见项目的颜色图例（只读）；切换显隐仍用"筛选项目"。
- tooltip 支持键盘聚焦，不再只响应鼠标；现有 `showTip` 继续用 `esc()` 转义。

### 切片 5（0.5.x）：趋势与余额

只做规划。

- 趋势图可在费用和 Token 之间切换，时间范围可选 7、30、90 天（目前固定为 7 天且只有 Token）。
- 热力图从当月扩展到 26 周。
- 模型占比可按费用或按 Token 计算。
- 余额页从单账户下拉框改为多账户网格，`.dss-provider-picker` 保留为窄屏回退。

## 9. 对照与迁移

### 9.1 指标对照（保证不丢信息）

| 现有位置 | 新位置 |
| --- | --- |
| 卡片：项目 | 指标条"项目" |
| 卡片：会话 | KPI"会话"及副行 |
| 卡片：轮/步 | 指标条"轮/步" |
| 卡片：LLM 时长 | KPI"LLM 时长" |
| 卡片：工具时长 | KPI"LLM 时长"副行 |
| 卡片：输入 tok / 输出 tok | KPI"Token"图例 |
| 卡片：平均缓存命中 | KPI"Token"图例 |
| 卡片：预估费用 | KPI"预估费用" |
| 项目卡：会话 | 表格"会话"列 |
| 项目卡：轮、步、工具、首 token、tok/s | 展开行详情 |
| 项目卡：缓存命中 | 表格"缓存命中"列 |
| 项目卡：输入、输出 | 表格"Token"列副行 |
| 项目卡：费用 | 表格"预估费用"列 |
| 项目卡：最近活跃 | 表格"最近活跃"列（按日模式为"活跃时段"） |
| 免责声明 `hint.cost` | KPI ⓘ 说明 |
| 图例 chip | 筛选弹层 |

### 9.2 smoke 选择器迁移

| 现有 | 新 |
| --- | --- |
| `.dss-head-actions .dss-export:nth-child(2)`（刷新） | `[data-action=refresh]` |
| 按文本点击"价格设置" / "Price settings" | `[data-action=pricing]` |
| CSV / JSON 按钮 | `[data-action=export]` → `[data-action=export-csv \| export-json]` |
| `.dss-tabs button:nth-child(i)` | 不变 |
| `.dss-nav .dss-tabs button:nth-child(1 \| 2)` | `[data-action=mode-day]` / `[data-action=mode-all]` |
| `.dss-data-status.<kind>` | 不变（头部状态点） |
| `.dss-data-diagnostics` | 不变，位置在 `.dss-status-banner` 内 |
| `.dss-cards` 文本 | `.dss-kpis` 文本 |
| `.dss-cards [role=button][aria-label*=unpriced]` | `[data-action=pricing-pending]`，点击后断言抽屉表单预填了 fixture 中的未计价模型 |
| `.dss-pcard[data-project-id]` | `tr.dss-prow[data-project-id]` |
| `[data-project-id=…] .dss-pcard-head` | `[data-project-id=…] [data-action=expand]` |
| `.dss-sortbar-dir` | 宽屏：`th[data-sort-key=cost] button`；窄屏：`[data-action=sort-dir]` |
| `[data-pages=projects \| sessions]` | 不变 |
| `[data-pages=legend]` + `.dss-chip` | 先点击 `[data-action=filter]`，再用弹层内的 `[data-pages=legend]` + `.dss-filter-item` |
| `.dss-pcards-wrap` 的 `scrollIntoView` | `.dss-ptable` |
| `.dss-overview.bounded` 与 `.dss-pcards-viewport` 的高度断言 | 保留"总览按日、总览全部、时间线三者面板高度相等"，删除列表视口高度断言 |
| 窄屏 `.dss-overlay.scrollTop` 截底部 | `.dss-body.scrollTop` |
| `.dss-pricing` | 不变，位置在 `.dss-drawer` 内 |
| rc2：`.dss-cards .dss-card .k/.v` | `.dss-kpi .dss-kpi-k/.dss-kpi-v` |

### 9.3 新增 smoke 断言（切片 3）

1. **单一滚动**：遍历 `.dss-panel` 内的元素，`overflow-y` 为 `auto` 或 `scroll` 且 `scrollHeight > clientHeight + 1` 的只能是 `.dss-body`。豁免已打开的抽屉内容区、已打开的弹层，以及切片 4 之前的时间线视口。
2. **表头吸顶**：把 `.dss-body.scrollTop` 设为 400 后，`thead th` 的顶部与 `.dss-body` 可视区顶部相差不超过 1px。
3. **字号**：`.dss-overlay` 内所有含直接文本节点的元素，计算后的 `font-size` 都不小于 11px。
4. **环比**：fixture 按日模式（第 2 个及以后的活跃日）显示"较 MM-DD"，日期等于上一个活跃日；第一个活跃日不显示。全部模式显示的活跃日数等于 fixture 的去重日期数。
5. **筛选**：隐藏一个项目后，KPI、指标条和表格同步变化，按钮显示"已隐藏 1"。重新打开面板后状态保留。点击"全部显示"后恢复。
6. **键盘**：表头按钮可用 Enter 排序，`aria-sort` 随之变化；展开按钮的 `aria-expanded` 正确切换。

切片 3 提交前，在 PR 说明或提交说明中贴出改造前后的 `report.checks` 列表，检查组数量不得减少。

## 10. 每个切片的门禁

```bash
npm test
TZ=UTC npm test
npm run build && git diff --exit-code -- lib   # 构建产物与提交一致（lib 和源码同一个提交）
node --check lib/*.js
npm pack --dry-run
```

- 浏览器 smoke（`npm run smoke:browser`）和 Harness 矩阵以 CI 为准。本地沙箱禁止启动 Chrome，所以需要用 `gh run download <run-id> -n browser-results` 下载截图，逐张检查深色、浅色和窄屏截图。
- `verify:pricing` 由 CI 执行。UI 切片不修改 `data/pricing/`。
- 本地 `tests/pricing-delivery.test.js:52` 可能因 git 子进程慢而超过 5s 超时（已知问题，CI 正常），以 CI 结果为准。
- 每个切片一个聚焦提交，推送后 CI 全绿才开始下一个切片。提交说明写明删除的组件、键、选择器和新增的检查。

## 11. 风险与对策

| # | 风险 | 对策 |
| --- | --- | --- |
| R1 | 宿主可能注册了全局 Esc（例如停止生成），和面板 Esc 冲突 | Esc 只在面板根节点处理并 `stopPropagation`，不注册 `document` 监听。切片 1b 在真实宿主上验证。如果宿主用捕获阶段监听、无法阻止，记录进兼容文档，不做绕过 |
| R2 | 移动端 `100vh` 包含浏览器地址栏，底部被遮住 | `100vh` 后面写一条 `100dvh` 声明；smoke 的 390px 和 320px 截图检查底部 |
| R3 | 嵌入环境不支持容器查询 | 目标浏览器都已支持。smoke 断言 `CSS.supports("container-type", "inline-size")`，兼容文档写明最低版本 |
| R4 | smoke 重写时丢失覆盖 | 按 §9.2 一对一迁移；比较改造前后的 `report.checks`；规模不变式原样保留 |
| R5 | 一个项目有多个未计价模型 | chip 定位到 tokens 最多的模型；抽屉中"缺失价格的模型"列表仍列出全部 |
| R6 | 上一个活跃日可能是多天前，环比被误读为"较昨天" | 文案写明日期；按 D9 规则不显示环比 |
| R7 | 取代 `0c32a5c` 后，底边对齐失效 | 用固定面板高度保证对齐，三处面板高度相等的 smoke 断言保留 |
| R8 | 抽屉变窄后价格面板布局受挤 | 媒体查询改为 `@container dss-drawer`；catalog 的 smoke 在抽屉宽度下检查重叠和裁切；视口不超过 600px 时抽屉全宽 |
| R9 | 筛选弹层在 `.dss-body` 内被滚动容器裁切 | 弹层 `max-height: min(360px, 可用高度)`，内部滚动；只在矮视口下出现 |
| R10 | 字号映射让趋势和余额页的大数字变小（34px → 28px） | 切片 1a 对比截图；如果主观上不能接受，可在切片 5 重做时再调整，不额外加字号档 |
| R11 | 表格在窄屏改为 `display:block` 后丢失表格语义 | 窄屏的汇总单元格自带文字标签，并提供排序下拉框；宽屏保持原生 table 语义 |
| R12 | 隐藏项目让总数看起来变小 | 筛选按钮显示"已隐藏 N"，表格标题旁显示"N 个 · 已隐藏 M"，弹层底部附说明 |

## 12. 待定事项与默认值

下面几项先按默认值实施，实施中或评审时可以调整，都不阻塞开工：

| 事项 | 默认 |
| --- | --- |
| 是否先发 `0.5.0-rc.1` | 不发 |
| 抽屉宽度 | `min(460px, 100%)` |
| 排序是否持久化 | 不持久化 |
| 环比基准 | 上一个活跃日，不用上周同日 |
| README 截图来源 | CI fixture 截图，不用真实数据 |
| 导出后的 toast | 不做 |
