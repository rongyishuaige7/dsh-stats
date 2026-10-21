# 切片 5（趋势）：用量趋势页重做实施文档

- 状态：已完成。5f–5j 已实现并合并（`7501102`…`45157ca`），随 0.5.0 交付。
- 日期：2026-10-20
- 基线：`3ea8d78`（`package.json` 仍是 0.5.0，尚未打 tag）
- 设计参考：[`docs/prototypes/trends-0.5.x.html`](prototypes/trends-0.5.x.html)。这是一个自包含的静态原型，可以切换：
  - 宽度：1180/760/390；
  - 场景：正常、新用户只有 7 天、空范围、部分待计价；
  - 主题；
  - 改动标注的开关。

  原型数据是虚构样例。
- 上位文档：[`docs/ui-overhaul-0.5.0.md`](ui-overhaul-0.5.0.md)。其中 §3 兼容约束、§10 门禁、对话框与焦点约定（§7.2）继续适用。本文对它有三处覆盖：
  - 替代 §8"切片 5"中趋势的三条；
  - 修改 `:117`"趋势视图维持现状，不受隐藏影响"：趋势页改为受"筛选项目"影响（U2）；
  - 修改 `:494`"趋势视图只显示日期部分"：趋势页不再显示 `OverviewTools`（U1）。
- 范围：只改"用量趋势"标签页，以及它和"筛选项目"、导出、总览日期之间的接线。另外有一处共用样式会顺带改动：总览 Token 构成条的颜色（U14），因为两页共用这条构成条。

本文写明每个子切片改哪些文件、加哪些函数和组件、怎样测试、怎样验收。实现和原型冲突时以本文为准；本文没写到的视觉细节以原型为准。

## 0. 实施约定

1. 按 §8 的顺序做 5f → 5g → 5h → 5i → 5j：每片一个聚焦提交，推送后 CI 全绿，并且审核通过，才开始下一片。审核意见在下一片开工前修完，修正单独提交。
2. 开工前确认工作区干净。本文和原型如果还没提交，由维护者先提交，不要并进 5f。基线之后工作区里如果有维护者未提交的改动，它们不属于本文：
   - 不要提交、不要还原、不要顺手修改；
   - 用 `git add <具体文件>` 只提交本片文件。
3. 以下文件不要碰：
   - `lib/*` 只能由 `npm run build` 生成，并和对应源码在同一个提交里，不要手改；
   - 不要改 `data/pricing/`、宿主代码（`src/index.js`、`src/host-*.js`、`src/accounts.js`）、`src/rpc-schemas.cjs`、RPC 描述符和原型文件。
4. 原型用字符串拼 HTML 只是演示。插件里一律用 `createElement`，模型名、项目名这些外部数据不能进入 `innerHTML`。tooltip 继续走 `tipRows()`，它内部已经用 `esc()` 转义。
5. 以下情况先停下来，找维护者确认后再继续：
   - 需要偏离 §4 的 U1–U14；
   - 需要新增依赖，或改动宿主、RPC schema 或描述符；
   - 本文与代码对不上；
   - 打 tag 或发布 npm。

   5g–5i 期间页面上新旧两部分会同时存在（见 §8）。维护者如果要在这期间发版，先停在一个完整的切片边界上再说。
6. 每片完成后汇报以下内容：
   - 提交哈希和 CI 运行链接；
   - 测试数量；
   - 浏览器 smoke 的 `report.checks` 在改造前后的对比（检查组数量不得减少），以及截图数量；
   - 检查过哪些截图，发现了什么问题；
   - 本片没有做或推迟的事项。
7. 提交信息沿用仓库格式：`feat(trends): ...`、`test(smoke): ...`、`docs(trends): ...`。

## 1. 现状问题

以下问题来自基线代码和 CI 截图（run 39367366033 的 `desktop-trends`、`mobile-trends-bottom`、`narrow-trends`）：

| # | 问题 | 位置 |
| --- | --- | --- |
| a | 范围混在一起：hero 大卡和模型分布跟随隐形的总览日期（`dateGlobals`，即某一天或全部）；热力图、7 天柱图和四张指标卡又是全量历史（`globals`）。同一屏的数字范围不同，页面上也没有标出来 | `TrendsView` `src/client.cjs:619-686`，`globals` `:339`，`dateGlobals` `:345` |
| b | 不受筛选影响：工具栏传了 `showFilter: false`，总览里隐藏的项目在趋势页照样计入 | `:531-532` |
| c | 隐形的日期依赖：`showMode: false` 隐藏了"按日/全部"，日期导航却还在，并且决定 hero 和模型分布显示哪一天。用户在趋势页切不到"全部"，只能沿用总览留下的模式 | `:529-537` |
| d | 只能看 Token，而且只有 7 天：全页只有 hero 一格显示费用，柱图固定为最近 7 天 | `DailyTrendChart` `:803-873` |
| e | 热力图只有当月：月初只有几格（9 月 8 日只有 8 格）。活跃日少于 4 天时按 10 万 / 30 万 / 60 万 Token 的固定阈值分级。点格子只改隐形的日期，页面停在趋势页，只有 hero 和模型分布跟着变 | `CalendarHeatmap` `:701-791` |
| f | 模型分布： | `ModelRing` `:875-916`、`ModelList` `:930-969`、`modelColor` `:971-994` |
| | ・列表超过 3 行就变成内部滚动框（`MAX_VISIBLE_MODELS = 3`，`.dss-model-list-viewport.scrollable`），违反"只有 `.dss-body` 一个滚动容器" | |
| | ・占比只按 Token 算 | |
| | ・颜色来自写死的映射表，加上一个随渲染顺序递增的计数器（`_modelFallbackIdx`），同一个模型换个时候打开可能换颜色 | |
| g | 和另外三页不一致：渐变 hero 卡、四张带说明的指标卡、带底色的分区卡片，用的是 `.dss-hero*`、`.dss-metric*`、`.dss-section` 和 `--dss-hero-*` token，与总览的摘要条和表格不是一套 | `src/client-styles.cjs:145`（单行）、`:71-73` |
| h | tooltip 只响应鼠标：热力格、柱子、环图图例、模型列表都用 `onMouseEnter`，键盘用户看不到 | `:763`、`:842`、`:906`、`:946` |
| i | "当前连续"不连到今天：`streakAndActive` 从最近一个活动日往前数，一个月前断掉的连续天数也显示为"当前连续"，说明写的是"截至最近活动日" | `src/client-data.cjs:729-747` |
| j | 深色主题下 Token 构成条有两段同色：`--dss-accent` 和 `--dss-chart-input` 都是 `#4f8cff`，总览构成条的"缓存命中"和"未命中"两段，以及图例圆点，颜色完全一样。趋势页要复用这条构成条，所以一并修正 | `src/client-styles.cjs:23`、`:59`、`:250-251` |

## 2. 目标与非目标

### 目标

1. 每一块都标明自己的范围：
   - 摘要条、每日柱图、模型区跟随所选范围（近 7 / 30 / 90 天，到今天为止）；
   - 热力图固定为近 26 周；
   - 不再读总览的日期。
2. 默认看费用，可以切到 Token。切换会影响每日柱图、热力图、模型占比和环图。
3. 受"筛选项目"影响，与总览、时间线共用同一份隐藏设置。
4. 和另外三页一致：
   - 摘要条、表格、分区标题、token 与六档字号保持同一套；
   - 只有 `.dss-body` 一个滚动容器；
   - 键盘可达；
   - tooltip 同时响应鼠标和焦点。
5. 点某一天（柱子或热力格），跳到那一天的总览。

### 非目标

- 不改宿主、RPC schema、描述符和 Harness 契约。本页需要的数据都已在客户端（见 §3）。
- 不做"全部"范围，不做自定义起止日期，不在柱图里叠画上一周期（上一周期只用于摘要条的涨跌）。
- 不做按周、按月汇总的视图。`monthlyFromDays`、`weeklyFromDays` 保留导出和单测，本文不删。
- 不做按项目堆叠的趋势线。
- 不新增依赖，不引入图表库；图形用 `div` 和 CSS（`conic-gradient` 现在已经在用）。
- 导出格式不变。
- 除 U14 的构成条颜色外，不改总览、时间线、余额页。

## 3. 数据与兼容约束

### 3.1 数据来源（全部现成）

| 用途 | 来源 | 说明 |
| --- | --- | --- |
| 每日 Token | `sessionDayTokens(sessions)`（`src/client-data.cjs:547`） | 返回 `Map<日期, bucket>`。bucket 里有 `uncached`、`cacheRead`、`cacheWrite`、`output`、`reasoning`，以及 `input`（`input = uncached + cacheRead + cacheWrite`）。优先按 `slotUsage` 落到真实日期 |
| 每日费用 | `dayCostSummaries(projects, hidden)`（`src/client-timeline-model.cjs:544`） | 返回 `Map<日期, 成本摘要>`，已经换算成人民币（`summarizeCostsCny`），按槽落日，与时间线一致 |
| 模型 | `modelAgg(sessions)`（`src/client-data.cjs:659`） | 按 provider + model + accountType 分组，每行带 `costSummary`、`sessions`、`input`、`output`、`cacheRead`、`reasoning` 和 `llmMs`（按 Token 占比分摊）。结果已按 Token 降序 |
| 范围裁剪 | `applyRange(projects, endKey, days)`（`:105`） | 按北京时间把会话、`slotUsage`、统计和费用裁到窗口内 |
| 活动日 | `activityDates(data.timeline)` | 只用来判断跳转目标是否存在（U6） |
| 今天 | `localDayKey(Date.now())` | 北京时间 |
| 待计价焦点 | `pendingFocus(projects)`（`src/client-overview-model.cjs:163`） | 返回 `{provider, model, tokens}` |
| 日期工具 | `addDays`、`weekOf`（`src/client-timeline-model.cjs:33-43`） | `weekOf` 以周一为一周的开始 |

费用全部是人民币：`fmtCostSummary` 显示前会再调一次 `convertCostSummaryToCny`，这一步是幂等的（`src/client-format.cjs:64`）。所以同一根柱子里不会混入多种币种。

### 3.2 兼容

| 约束 | 要求 |
| --- | --- |
| Harness / React | 同上位文档 §3：用宿主注入的 React 18 和 `createElement`，不引入 JSX |
| 浏览器 | 不抬高上位文档 §3 的最低版本（容器查询需要 Chrome 105+、Safari 16+）。新用到的 `aspect-ratio`、`conic-gradient` 都在这个基线以内。不用 `color-mix()` |
| 时区 | 日期一律用北京时间的日期键（`localDayKey`、`addDays`）。不用 `Date#getDay()` 这类本地时区方法；星期几用 `new Date(date + "T00:00:00Z").getUTCDay()`。§9.3 第 11 条会在上海和洛杉矶两个时区比较趋势页的 `innerText` |
| RPC | 趋势页不发起任何 RPC，与现在相同 |
| 偏好 | 新增 `dsh-stats.trends`（U3），旧版本没有这个键时取默认值。趋势页不再读写 `dsh-stats.nav`，只有跳转（U6）会写它。`dsh-stats.hidden` 从此也作用于趋势页 |
| 本地回退 | 宿主数据不可用、回退到客户端聚合时，会话可能没有 `slotUsage`。这时 `sessionDayTokens` 和 `dayCostSummaries` 都退化为按 `updatedAt` 落在一天。页面照常渲染，不另外提示 |
| 主题 | 深色是 CSS 回退值；浅色写在 `body:not([data-ds-dark-theme])` 下的 token 重定义里 |

## 4. 已锁定的设计决策

**U1 范围与"今天"。**
- "今天"取 `localDayKey(Date.now())`，在 `StatsPanel` 渲染时取一次，不开定时器。重新打开面板或数据刷新后会重新计算，所以跨过零点后会自然前移。
- 范围 `N ∈ {7, 30, 90}`，到今天为止（含今天）：起点是 `addDays(today, -(N - 1))`。上一周期是紧挨着它的前 `N` 天：`addDays(today, -(2N - 1))` 至 `addDays(today, -N)`。
- 摘要条、每日柱图、模型区跟随范围；热力图固定为近 26 周（U7）。每块的标题行都写出自己的范围："近 30 天"或"近 26 周"。
- 趋势页不再渲染 `OverviewTools`（没有"按日/全部"，也没有日期导航），只渲染 U2 的工具栏。切换标签页不改 `nav`。
- 夹具的今天是 2026-09-08（周二）：
  - 30 天：08-10 至 09-08，上一周期 07-11 至 08-09；
  - 7 天：09-02 至 09-08；
  - 90 天：06-11 至 09-08。

**U2 工具栏。** `div.dss-tools.dss-tr-tools`，沿用 `.dss-tools` 的布局。从左到右：
1. 范围：`div.dss-seg[role=group][aria-label=范围]`，三个按钮"7 天 / 30 天 / 90 天"，带 `aria-pressed`，`data-action` 是 `tr-range-7`、`tr-range-30`、`tr-range-90`。
2. 范围文字：`span.dss-range-label.dss-tr-range[aria-live=polite]`，写"08-10 至 09-08"（`tl.rangeValue`）。起止日期和今天在同一年时写 `MM-DD`，否则两端都写 `YYYY-MM-DD`。
3. 指标：`span.dss-tr-ctl-k` 写"指标"，后面是 `div.dss-seg[role=group][aria-label=指标]`，两个按钮"费用 / Token"（复用 `tl.metricCost`、`tl.metricToken`），`data-action` 是 `tr-metric-cost`、`tr-metric-token`。
4. `ProjectFilterMenu`：
   - `projects`：范围内有 Token 的项目，即 `applyRange(data.projects, today, N).filter(hasTokenUsage)`；
   - 不传 `valueOf`，默认显示的 `projectCostSummary(project)` 已经是裁剪后的范围费用；
   - `filterKey`：`"trends:" + N`，切换范围时分页回到第一页；
   - 靠右，沿用现有的 `.dss-tools>.dss-popover-wrap{margin-left:auto}`。

- 隐藏设置和总览、时间线共用 `hidden`：在趋势页隐藏一个项目，总览里它也会隐藏。这是有意的，"筛选项目"在三页里是同一个开关。
- 窄屏自然换行：第一行是范围和范围文字，第二行是指标和筛选。

**U3 偏好。**
- 读写：`usePref("trends", TRENDS_PREF_DEFAULTS)`，即 `localStorage["dsh-stats.trends"]`，默认 `{range: 30, metric: "cost"}`。
- 读出后一律经过 `normalizeTrendsPrefs`：`range` 不是 7 / 30 / 90 时取 30，`metric` 不是 `cost` / `token` 时取 `cost`。
- 写入方式同时间线的 `setTimelinePrefs`：合并补丁后再规范化。
- 和时间线的 `metric` 互不影响。
- 切换范围或指标不改 `hidden` 和 `nav`。

**U4 摘要条。** `section.dss-tr-kpis[aria-label=趋势摘要]` 有四格，子元素复用总览的 `.dss-kpi`、`.dss-kpi-k`、`.dss-kpi-v`、`.dss-kpi-s`、`.dss-kpi-delta`、`.dss-tokbar`、`.dss-tok-legend`。外层不复用 `.dss-kpis`（U14）。数据来自范围内每天的合计（U5 的 `rangeTotals`），所以摘要条的合计和柱子的总和一致。四格的规则：

1. **预估费用**（`.dss-kpi.cost`）：
   - 标签后跟 `InfoTip`，`id="dss-tr-cost-tip"`，文字是 `w.estimatedHint`；
   - 大字是 `fmtCostSummary(range.cost)`，部分计价时带"*"；
   - 副行依次为：
     - 涨跌：`costDelta(range.cost, previous.cost)` 不为空时写"较前 30 天 ↑12%"（`tr.kpi.vs`）。百分比四舍五入为 0 时写 `kpi.flat`。上一周期为 0、任一方不是确定的人民币金额（含部分计价）时不写，不和不完整的数字比；
     - 待计价：`range.cost.unpricedTokens > 0` 时放 `PendingChip`，`label` 是 `kpi.pending`，`focus` 是 `pendingFocus(范围内可见项目)`，`onOpen` 是 `openPricing`。
2. **Token**：
   - 大字是 `fmtTokens(input + output)`；
   - 构成条和图例与总览完全相同：缓存命中 / 未命中 / 输出，图例写"命中 78% · 未命中 · 输出 1.2M"。
3. **日均费用**：
   - 大字是 `amountOf(range.cost) / activeDays`，格式化时保留原摘要的 `status`，所以部分计价也带"*"；
   - `activeDays` 为 0，或者范围内完全没有计价金额时，大字写"—"；
   - 副行"活跃 20 / 30 天"（`tr.kpi.active`）。活跃日是 Token > 0 的日子，与指标无关。
4. **最常用模型**：
   - 按当前指标取第一名：费用看 `amountOf(costSummary)`，Token 看 `input + output`。并列时先比 Token，再比名字；
   - 指标是费用、但范围内计价金额为 0 时，改按 Token 取，副行也写 Token 占比；
   - 大字是 `modelNameOnly(row)`，类名加 `.is-model`：字号 `fs-lg`，单行省略，`title` 是 `displayName`；
   - 副行是"费用占比 62.4% · deepseek"：占比在前，格子窄到放不下时省略号先截掉 Provider；Provider 是 `unknown` 时省略 Provider 一段；占比用 `tr.kpi.shareCost` 或 `tr.kpi.shareToken`，数字用 `fmtSharePct`。

前三格不随指标变化，第四格随指标变化。

**U5 每日柱图。** `section.dss-tr-sec.dss-tr-daily`：

- 标题行 `div.dss-tr-sec-head`：
  - `h3` 写"每日费用"或"每日 Token"；
  - 后面是 `span.dss-tr-sec-note`："近 30 天 · 峰值 08-16 ¥12.30 · 日均 ¥2.71"。各段分别用 `tr.recent`、`tl.peak`、`kpi.perDay`。峰值相同时取较晚的一天。没有活跃日时只写"近 30 天"。
- 图 `div.dss-tr-chart`：
  - 左边是 y 轴 `div.dss-tr-y`，三个刻度：0、½、顶；
  - 右边是 `div.dss-tr-plot`，里面依次是：
    - 网格线 `div.dss-tr-grid`（三条，0 是实线）；
    - 均线 `div.dss-tr-avg`；
    - 柱区 `div.dss-tr-bars[role=group][style=--n:N]`；
    - x 轴 `div.dss-tr-x`。
- 柱区：
  - 布局：`grid-template-columns: repeat(var(--n), minmax(0,1fr))`，列距 2px，90 天时 1px。每天一列 `div.dss-tr-col`。
  - 哪些天有柱：Token 为 0 的日子只有空列，没有按钮。活跃日是 `button.dss-tr-bar[data-date][data-action=tr-day]`。柱宽 `min(40px, 100%)`、居中，高度是 `value / 顶 × 100%`，最低 2px。
  - 费用模式：柱子是 `--dss-tl-bar-cost`。部分计价的日子加 `.is-partial`，用现有的斜纹。完全待计价的日子（费用为 0、Token > 0）是 2px 的斜纹短柱，可以点。
  - Token 模式：柱子加 `.is-token`，里面从下到上三段 `i.cache`、`i.unc`、`i.out`，按 `flexGrow` 分配，颜色依次是 `--dss-chart-cache`（新增，U14）、`--dss-chart-input`、`--dss-chart-output`。Token 没有"部分"的说法，这个模式下不画斜纹。
- 纵轴：
  - 顶是 `niceMax(峰值)`：取 `{1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10} × 10^k` 中不小于峰值的最小值。现有 `niceCeil` 只有 1/2/5 三档，峰值 12.3 会得到 20，柱子只有六成高，所以不复用它；
  - 刻度文字：费用用 `fmtAxisCost`（§7.1），Token 用 `fmtTokens`；
  - 没有活跃日时不画图（U13）。
- 均线：
  - 只在活跃日 ≥ 2 时画；
  - 值是范围合计 ÷ 活跃日；
  - 画法：一条 1px 虚线，`aria-hidden`，不加文字标签。标签贴在线上会压住附近的柱子；日均已经写在标题行，图例说明虚线的含义。
- x 轴：和柱区同一套列，每个标签放在自己那一列，居中，不换行。
  - 7 天：每天都写 `MM-DD`；
  - 30 天：每个周一写 `MM-DD`；
  - 90 天：每月 1 日写月份（`tr.months`，中文"7月"，英文"Jul"）；
  - 今天：最后一列总是写"今天"（`nav.today`），并且加粗；
  - 避让：其他标签离今天不到 `ceil(N / 12)` 列时不写，以免和"今天"挤在一起。
  - 夹具上的结果：30 天是 08-10、08-17、08-24、08-31、今天（09-07 因避让不写）；90 天是 7月、8月、今天（9月 因避让不写）；7 天是 09-02 至 09-07 加今天。
- tooltip：用 `tipProps(() => tipRows(title, rows))`，鼠标和焦点都会触发。
  - 标题是"08-16 周日"，格式同 `OverviewTools` 的日期标签：`date + " " + w.dayPrefix + 星期`；
  - 行依次是：预估费用（部分计价时带"*"）、Token、输入、输出、思考（> 0 时）、缓存命中；
  - 部分计价时再加一行"部分待计价"（`tl.partial`），值是未计价的 Token 数。
- 读屏：
  - 柱区的 `aria-label` 是"每日费用，近 30 天"（`tr.groupAria`）；
  - 每根柱的 `aria-label` 是"08-16 周日 ¥12.30，打开当天总览"（`tr.openDay`）。跳不过去时（U6）带 `aria-disabled="true"`，标签里去掉"，打开当天总览"。
- 图例 `div.dss-tr-legend`：
  - 费用模式：虚线样本加"虚线 = 活跃日的日均"；范围内有部分计价的柱子时，再加斜纹样本和"部分待计价"；
  - Token 模式：三个色块，缓存命中 / 未命中 / 输出；
  - 最右是"点柱子查看当天总览"。

**U6 跳到当天总览。** 柱子和热力格共用 `StatsPanel` 的 `openDay(date)`：
1. `dates.indexOf(date) < 0` 时什么也不做。这种柱子按 U5 带 `aria-disabled`。宿主数据里有 Token 的日子都在 `activityDates` 里，这一条只为回退数据兜底。
2. 否则依次执行：
   - `hideTip()`；
   - `setNav({ mode: "day", date })`；
   - `setTab("overview")`、`setFocusedTab("overview")`；
   - 把 `pendingTabFocusRef.current` 设为 `"overview"`。
3. 新增一个依赖 `[tab]` 的 effect：`pendingTabFocusRef.current === tab` 时，把焦点交给 `document.getElementById("dss-tab-" + tab)`，然后清空 ref。趋势页卸载后焦点不能掉到 `body`。
4. 点击、Enter、Space 都触发。

键盘（柱区和热力图各一个 Tab 停靠点，写法沿用时间线 `src/client-timeline.cjs:181-203`）：
- 只有当前那根柱或那一格 `tabIndex=0`，其余都是 `-1`。
- 柱区默认停在峰值那天；热力图默认停在今天，今天不活跃时停在最近的活跃日。
- ArrowLeft / ArrowRight 移到上一个 / 下一个活跃日，跳过空列。热力图里 ArrowUp 同 ArrowLeft，ArrowDown 同 ArrowRight，即都按时间顺序走。Home / End 移到第一个 / 最后一个活跃日。
- 焦点移动时 tooltip 跟着显示。
- 切换范围或指标后，当前日期仍然活跃就保留，否则回到默认位置。

**U7 热力图。** `section.dss-tr-sec.dss-tr-heat`：

- 窗口：起点是"今天所在那周的周一"往前 25 周，共 26 周。夹具上是 2026-03-16 至 09-08，共 177 天。今天之后的格子不渲染。热力图跟随筛选和指标，不跟随范围。
- 标题行：`h3` 写"活动热力图"，说明写"近 26 周 · 按费用"或"按 Token"（`tr.heatNote` 配合 `tr.byCost` / `tr.byToken`）。
- 主体 `div.dss-tr-heat-body`，左边是地图 `div.dss-tr-heat-map`，右边是统计 `dl.dss-tr-heat-stats`（U8）。面板 ≤860px 时统计移到地图下方，三项排成一行。
- 地图：
  - 月份行 `div.dss-tr-heat-months`，和网格同为 26 列。哪一周里有某月 1 日，就在那一列写月份（`tr.months`）。第一列总是写它所在的月份，但下一个月份标签离它不到 3 列时，第一列不写。夹具上第一列是 3 月，4 月 1 日在第 3 列，所以第一个标签是 4 月；某月 1 日晚于今天时不写，因为那一天的格子还没画出来；
  - 星期列 `div.dss-tr-heat-dow`：第 1、3、5 行写"一 / 三 / 五"，英文写"Mon / Wed / Fri"，取自 `w.weekdays` 的第 1、3、5 项，其余行留空；
  - 网格 `div.dss-tr-heat-grid[role=group]`：`aria-label` 由 `tr.groupAria` 拼 `tr.heat` 和 `tr.heatNote`，例如"活动热力图，近 26 周 · 按费用"；`grid-template-columns: repeat(26, minmax(0,1fr))`，7 行。每格用行内 `gridColumn`、`gridRow` 显式定位，不靠自动流动，所以最后一周缺格时不会错位。格子 `aspect-ratio: 1`，地图最大宽 640px。
- 格子：
  - 活跃日是 `button.dss-tr-cell[data-date][data-level][data-action=tr-heat-day]`，带 `tipProps`，键盘规则见 U6；
  - 不活跃的过去日是 `i.dss-tr-cell[data-date][data-level=0][aria-hidden]`，没有 tooltip；
  - 今天加 `.is-today`。
- 分级：
  - 取窗口内所有活跃日在当前指标下的值，排序后取 25 / 50 / 75 分位，规则同现有 `CalendarHeatmap`：`v[floor(f × n)]`。大于第 75 分位是 4 级，大于第 50 分位是 3 级，大于第 25 分位是 2 级，其余是 1 级；
  - 活跃日少于 4 天，或第 25 与第 75 分位相等时，退回 `max(1, ceil(4 × v / 最大值))`；
  - 活跃日在当前指标下为 0（费用模式下完全待计价）时是 1 级。
- 样式复用时间线矩阵的叠色：
  - 底色 `--dss-tl-cell`；
  - `::after` 用强调色，按级别取透明度 .26 / .48 / .72 / 1；
  - 今天用 `::before` 画 1.5px 内描边。

  CSS 合并 `.dss-mx-cells i` 的选择器，不另写一套。两种指标都用强调色，因为热力图表示的是活跃强度。
- tooltip：标题是完整的"2026-08-16 周日"（窗口可能跨年），行依次是预估费用、Token、缓存命中；部分计价时加"部分待计价"那一行。
- 读屏：每格 `aria-label` 是"2026-08-16 周日 ¥12.30，打开当天总览"，Token 模式下金额换成 Token。
- 图例 `div.dss-tr-legend`：
  - 左边是"少"、五个 `i.dss-mx-lg[data-level=0..4]`、"多"，复用 `trends.less`、`trends.more`；
  - 中间是"每格 = 1 天，颜色按活跃日的分位数分级"；
  - 右边是"点格子查看当天总览"。

**U8 活跃与连续。** `dl.dss-tr-heat-stats`，三项，每项是 `div.dss-tr-stat > dt + dd`，统计范围是热力图窗口：
1. 活跃天数：`dd` 写"86 / 177 天"（`tl.activeValue`）。
2. 当前连续：从今天往前数连续的活跃日；今天不活跃时从昨天开始数；昨天也不活跃时为 0。
   - `dd` 写"5 天"（`tl.days`）；
   - 副行 `span.dss-tr-stat-sub` 写"截至今天"或"截至昨天"，为 0 时不写。
3. 最长连续：窗口内最长的一段。
   - `dd` 写"12 天"；
   - 副行写起止日期"07-20 至 07-31"（`tl.rangeValue`）。并列时取较晚的一段。

活跃日只看 Token > 0，与指标无关，受筛选影响。这和旧的指标卡不同：
- 旧的"活跃天数"统计全部历史，现在只统计近 26 周；
- 旧的"当前连续"从最近活动日往前数，问题 i。

**U9 模型颜色。** `modelColorIndexes(models)`：
- 输入是 `modelAgg(全部项目的全部会话)`，即全部历史，不看筛选和范围。按 Token 降序排，并列时比 `key`；
- 前 8 个依次得到 0–7，渲染为 `data-color="0".."7"`，即 `--dss-p0..p7`。其余没有颜色，加 `.is-other`，颜色是 `--dss-text-3`；
- 所以同一个模型在切换范围、指标、筛选时颜色不变；
- 模型圆点复用通用的 `.dss-pdot[data-color]`，新增 `.dss-pdot.is-other{--c:var(--dss-text-3)}`；
- 删除 `modelColor`、`MODEL_COLOR_MAP`、`MODEL_PALETTE`、`_modelColorCache`、`_modelFallbackIdx`。

**U10 模型环。** `div.dss-tr-ring[role=img]`：
- 尺寸：直径 132px，环宽 18px（≤640px 时直径 112px、环宽 16px）。
- 背景：`conic-gradient(var(--dss-p0) 0deg 224.6deg, …)`，写在行内 `style`。
  - 有颜色的模型各占一段，按占比从大到小；
  - `.is-other` 的模型合成一段灰色"其他"，放在最后；
  - 中间是 `div.dss-tr-ring-hole`，底色同面板。
- 中心：
  - 第一行是当前指标下的范围合计（"¥82.40"或"3.2M"），`fs-lg` 650。费用模式下范围内有待计价时带"*"，与摘要条一致；
  - 第二行是"近 30 天"，`fs-xs`；
  - 合计为 0 时整环是 `--dss-track`，中心写"—"。
- `aria-label`："模型费用占比：deepseek-v4-flash 62.4%，deepseek-v4-pro 25.1%，其他 12.5%"（`tr.ringAria`，各项之间用 `tr.listSep`）。
- 不再单独画图例，下面的表格就是图例。有"其他"时，环下方加一行说明"灰色 = 其他 3 个模型"（`tr.ringOther`）。

**U11 模型表。** `section.dss-tr-sec.dss-tr-models`：

- 标题行：`h3` 写"模型"，说明写"近 30 天 · 4 个模型 · 按费用占比"（或"按 Token 占比"）。
- 主体 `div.dss-tr-models-body`：左边是环（U10），右边是 `table.dss-tr-mtable`，带仅读屏可见的 `caption`"模型明细，近 30 天"。
- 表格外观和总览 `.dss-ptable` 同一套，在 CSS 里合并选择器。

列定义：

| 列 | `th` / 排序键 | 内容 |
| --- | --- | --- |
| 模型 | `c-model` / `name` | `i.dss-pdot` + `span.dss-tr-mname`（`modelNameOnly`，单行省略，`title` 是 `displayName`）；副行 `div.dss-cell-sub` 是 `providerId`，`unknown` 时写"未知 Provider"；`accountType` 不是 `api` 时追加" · <accountType>" |
| 会话 | `c-sessions` / `sessions` | `fmtN(sessions)`。主会话和子对话都算，一个会话用了两个模型时两行各算一次 |
| Token | `c-tokens` / `tokens` | `fmtTokens(input + output)`；副行"输入 1.1M · 输出 82K" |
| 缓存命中 | `c-hit` / `hit` | `cacheRead / input`，取整到百分比；`input` 为 0 时写"—" |
| LLM | `c-llm` / `llm` | `fmtDuration(llmMs)`。表格下方加脚注"LLM 时长按 Token 占比从会话分摊，是近似值。"（`p.dss-tr-foot`） |
| 预估费用 | `c-cost` / `cost` | `div.dss-cost-line` 里是 `fmtCostSummary(costSummary)`，部分计价时带"*"。`costSummary.unpricedTokens > 0` 时前面放一个紧凑的 `PendingChip`，和总览表格一致：`compact: true`，`label` 是 `tr.pendingShort`"待计价"，`focus` 是 `{provider: providerId, model: modelRaw, tokens: unpricedTokens}`。没有任何已计价金额时只显示 chip，不重复写"待计价" |
| 占比 | `c-share` / 不可排序 | `.dss-share`：`span.dss-share-bar.dss-tr-share[data-color] > i`，条用模型颜色（`.is-other` 时用灰色），后面是 `.dss-share-pct`。占比按当前指标计算；占比为 0 时条宽为 0 |

其余规则：
- 行是 `tr.dss-tr-mrow[data-model-key]`，`data-model-key` 是 `key` 里的 `\u0000` 换成 `|` 之后的字符串。
- 排序：
  - 表头按钮是 `.dss-sort-btn[data-action=tr-sort][data-key]`，`th` 上带 `aria-sort`，箭头是 `.dss-sort-arr`，写法同 `ProjectTable`；
  - 默认按当前指标降序（`cost` 或 `tokens`）。点同一列切换方向，点新列时方向取 `defaultSortDir`：`name` 升序，其余降序；
  - 切换指标后回到新指标的默认排序；
  - 并列时先比 Token 降序，再比名字升序；
  - 排序状态存在组件里，不写偏好。
- 窄屏：
  - ≤860px 隐藏 LLM 列；
  - ≤640px 每行改成两行网格，隐藏表头，改用 `select.dss-sort-narrow[data-action=tr-sort-narrow]` 选择排序键，写法同总览：
    - 第一行是圆点、名字、费用；
    - 第二行是 Provider · 会话 · Token · 命中，以及占比条。
- 不分页。模型数通常很少；即使很多，也只是表格变长，仍然只有 `.dss-body` 滚动。
- 不逐模型显示思考 Token。旧列表的副行有它，现在改到柱子的 tooltip 里按天显示（§9.1）。

**U12 部分计价与待计价。**
- 判定：一天或一个模型的摘要 `status === "partial"` 或者 `unpricedTokens > 0`，就算部分计价（`isPartial`）。
- 柱子：只在费用模式下加 `.is-partial` 斜纹。tooltip 加一行"部分待计价"（`tl.partial`），值是未计价的 Token 数，`aria-label` 里的金额带"*"。
- 热力格不画斜纹（格子太小），tooltip 同柱子。
- 摘要条：大字带"*"，副行有 `PendingChip`；日均和标题行里的"日均"也带"*"。
- 模型表：费用带"*"，并有紧凑的"待计价"。点它和点摘要条的 chip 一样，用 `openPricing` 打开价格抽屉并定位到这个模型。

**U13 空状态。** 按顺序取第一个成立的：
1. 全部历史都没有 Token：正文只有 `p.dss-empty`（`t("empty")`），不渲染工具栏。
2. 范围内有 Token 的项目全部被隐藏：渲染工具栏，下面是 `div.dss-tr-empty[role=status]`，写"所有项目都已隐藏"（`filter.allHidden`），加一个"全部显示"按钮（`data-action=tr-show-all`，调用 `onShowAll`）。其余各块都不渲染。
3. 范围内可见项目没有 Token：渲染工具栏，摘要条、每日柱图、模型区换成一个 `div.dss-tr-empty[role=status]`，写"近 7 天没有 Token 消耗"（`tr.emptyRange`）。
   - 存在比 N 更大、并且有 Token 的范围时，加一个按钮"看近 30 天"（`tr.viewRange`，`data-action=tr-empty-range`），目标是其中最小的那个；
   - 热力图窗口内有数据时照常渲染。

**U14 命名、导出与样式约定。**
- 命名：
  - 类名一律以 `dss-tr-` 开头；状态修饰符用 `is-*`，并且只能和带前缀的类复合书写，沿用 `tests/styles.test.js:117` 的检查；
  - 不复用总览的 `.dss-kpis`：smoke 用 `until(".dss-kpis")` 判断总览已渲染，复用会误判（同余额页的 B14）；
  - 摘要条子元素可以复用 `.dss-kpi*`，因为同一时间只渲染一个标签页；
  - 视觉需要一致的地方，在 CSS 里合并选择器。
- 导出：趋势页的 `ExportMenu` 导出 `applyRange(data.projects, today, N)`，不看隐藏，和其他标签页导出 `dateProjects` 的做法一致。
- 新 token `--dss-chart-cache`：缓存命中段的颜色。总览构成条的 `.cache` 段和图例圆点也改用它，这样修掉问题 j。
- tooltip 一律用 `tipProps`。字号只用六档 token，正文直接文本 ≥11px。
- 趋势页内部不出现 `overflow: auto/scroll`。

## 5. 结构

### 5.1 正常状态

```text
div.dss-tr
  div.dss-tools.dss-tr-tools                                U2
    div.dss-seg[role=group] > button[data-action=tr-range-7|30|90][aria-pressed] × 3
    span.dss-range-label.dss-tr-range[aria-live=polite]     08-10 至 09-08
    span.dss-tr-ctl-k 指标
    div.dss-seg[role=group] > button[data-action=tr-metric-cost|token][aria-pressed] × 2
    div.dss-popover-wrap > ProjectFilterMenu
  section.dss-tr-kpis[aria-label=趋势摘要]                   U4
    div.dss-kpi.cost       .dss-kpi-k(+ InfoTip) · .dss-kpi-v.dss-cost · .dss-kpi-s(.dss-kpi-delta · PendingChip)
    div.dss-kpi            Token · .dss-tokbar(i.cache i.unc i.out) · .dss-tok-legend
    div.dss-kpi            日均费用 · .dss-kpi-s 活跃 20 / 30 天
    div.dss-kpi            最常用模型 · .dss-kpi-v.is-model · .dss-kpi-s
  section.dss-tr-sec.dss-tr-daily                           U5
    div.dss-tr-sec-head > h3 · span.dss-tr-sec-note
    div.dss-tr-chart
      div.dss-tr-y[aria-hidden] > span × 3
      div.dss-tr-plot
        div.dss-tr-grid[aria-hidden] > i × 3
        div.dss-tr-avg[aria-hidden][style=bottom:%]            活跃日 ≥ 2
        div.dss-tr-bars[role=group][style=--n:N]
          div.dss-tr-col × N
            button.dss-tr-bar[data-date][data-action=tr-day](.is-token .is-partial)[style=height:%]
              i.cache · i.unc · i.out                          仅 Token 模式
        div.dss-tr-x[aria-hidden] > span(.is-today)[style=grid-column] × K
    div.dss-tr-legend
  section.dss-tr-sec.dss-tr-heat                            U7
    div.dss-tr-sec-head
    div.dss-tr-heat-body
      div.dss-tr-heat-map
        div.dss-tr-heat-months[aria-hidden] > span[style=grid-column] × K
        div.dss-tr-heat-dow[aria-hidden] > span × 7
        div.dss-tr-heat-grid[role=group]
          button.dss-tr-cell[data-date][data-level][data-action=tr-heat-day](.is-today)   活跃日
          i.dss-tr-cell[data-date][data-level=0][aria-hidden](.is-today)                   其余过去日
      dl.dss-tr-heat-stats > div.dss-tr-stat × 3 > dt · dd(span.dss-tr-stat-sub)    U8
    div.dss-tr-legend
  section.dss-tr-sec.dss-tr-models                          U10、U11
    div.dss-tr-sec-head
    div.dss-tr-models-body
      div.dss-tr-ring-wrap
        div.dss-tr-ring[role=img][style=background] > div.dss-tr-ring-hole > b · span
        p.dss-tr-ring-note                                   有"其他"时
      div.dss-tr-mtable-wrap
        select.dss-sort-narrow[data-action=tr-sort-narrow]  仅 ≤640px 可见
        table.dss-tr-mtable
          caption.dss-sr
          thead > tr > th(.c-model …)[aria-sort] > button.dss-sort-btn[data-action=tr-sort][data-key]
          tbody > tr.dss-tr-mrow[data-model-key] × M
        p.dss-tr-foot                                        LLM 脚注
```

### 5.2 其他状态

```text
全部历史没有 Token（U13-1）
div.dss-tr > p.dss-empty

范围内项目全部隐藏（U13-2）
div.dss-tr > div.dss-tools.dss-tr-tools · div.dss-tr-empty[role=status] > p · button[data-action=tr-show-all]

范围内没有 Token（U13-3）
div.dss-tr
  div.dss-tools.dss-tr-tools
  div.dss-tr-empty[role=status] > p · button[data-action=tr-empty-range]（有更大的可用范围时）
  section.dss-tr-sec.dss-tr-heat                            窗口内有数据时
```

### 5.3 `data-action` 一览

`tr-range-7`、`tr-range-30`、`tr-range-90`、`tr-metric-cost`、`tr-metric-token`、`tr-day`（柱子）、`tr-heat-day`（热力格）、`tr-sort`、`tr-sort-narrow`、`tr-show-all`、`tr-empty-range`。复用 `filter`、`filter-show-all`（筛选弹层内部）和 `pricing-pending`。

## 6. 样式

### 6.1 token

新增，在 `:where(.dss-overlay, .dss-trigger, .dss-tt)` 中定义深色值，在 `body:not([data-ds-dark-theme]) :is(...)` 中覆盖浅色值：

| token | 深色 | 浅色 | 用途 |
| --- | --- | --- | --- |
| `--dss-chart-cache` | `#2e4a7e` | `#bfd1f8` | 缓存命中段。取未命中色的浅/深一档，用实色而不是半透明，因为柱子后面有网格线，半透明会透出来 |

修改：`.dss-tokbar .cache, .dss-tok-legend .dot.cache` 的背景由 `--dss-accent` 改为 `--dss-chart-cache`（`src/client-styles.cjs:250`）。

其余颜色复用现有 token：
- 图表：`--dss-tl-bar-cost`、`--dss-chart-input`、`--dss-chart-output`、`--dss-tl-cell`、`--dss-accent`；
- 底色与线：`--dss-track`、`--dss-line`、`--dss-line-soft`、`--dss-layer`、`--dss-panel`；
- 文字：`--dss-text`、`--dss-text-2`、`--dss-text-3`；
- 模型色：`--dss-p0..p7`。

字号只用 `--dss-fs-xs/sm/md/lg/xl/2xl`。

### 6.2 尺寸（取自原型）

| 部位 | 宽屏 | ≤860px | ≤640px |
| --- | --- | --- | --- |
| 摘要条 | 与 `.dss-kpis` 合并选择器：`1.45fr repeat(3,minmax(0,1fr))`；`.is-model` 大字 `fs-lg` 650、`line-height: 24px`（与 `fs-xl` 的行高对齐） | 同 | 同 `.dss-kpis` 的两列规则（`:339-345`） |
| 分区 | `.dss-tr-sec` 上边距 22px，上边框 `--dss-line-soft`，上内边距 14px；`h3` `fs-lg` 650；说明 `fs-sm` `--dss-text-3` | 同 | 上边距 18px |
| 柱图 | y 轴列宽 44px，`fs-xs` `--dss-text-3`，右对齐；绘图区高 168px；列距 2px（90 天 1px）；柱宽上限 40px，圆角 `2px 2px 0 0`；x 轴行高 18px，`fs-xs` | 同 | 绘图区高 132px；y 轴列宽 38px |
| 均线 | 1px dashed `--dss-text-3`，没有文字标签 | 同 | 同 |
| 热力图 | 主体 `grid-template-columns: minmax(0,640px) minmax(180px,1fr)`，列距 28px；网格间距 3px，格子圆角 3px；星期列 `2.4em`；月份行高 16px | 单列；统计排成三列一行 | 网格间距 2px，格子圆角 2px |
| 统计 | `dt` `fs-sm` `--dss-text-2`；`dd` `fs-xl` 650；副行 `fs-xs` `--dss-text-3`；各项之间 14px | 三列，各项左边框 `--dss-line-soft` | 同 ≤860，`dd` 改 `fs-lg`（"125 / 177 天"在三分之一宽里不换行） |
| 模型区 | `grid-template-columns: 160px minmax(0,1fr)`，列距 24px，顶端对齐 | 同 | 单列，环居中在表格上方 |
| 环 | 直径 132px，环宽 18px | 同 | 直径 112px，环宽 16px |
| 模型表 | 与 `.dss-ptable` 合并选择器；列宽：会话 64px、Token 128px、命中 72px、LLM 76px、费用 116px、占比 120px，模型列取剩余 | 隐藏 `.c-llm` | 两行网格，隐藏 `thead`，显示 `.dss-sort-narrow` |
| 图例 | `fs-xs` `--dss-text-3`，色块 10×10px，圆角 2px，各段间距 14px，可换行 | 同 | 同 |

- 断点一律用 `@container dss-panel (max-width: …)`。
- 柱子和热力格的悬停、聚焦样式沿用 `.dss-tl-bar:hover,.dss-tl-bar:focus-visible` 的写法：`filter: brightness(1.12)`，加 2px `--dss-text` 描边。
- 斜纹和 `.dss-tl-bar.is-partial` 合并选择器。
- 热力格和 `.dss-mx-cells i`、图例和 `.dss-mx-lg` 合并选择器。

### 6.3 删除

- `src/client-styles.cjs:145` 这一长行中的趋势规则：
  - `.dss-trends`；
  - `.dss-hero*`、`.dss-metric*`；
  - `.dss-section`、`.dss-sec-*`；
  - `.dss-trend-duo`、`.dss-duo-*`；
  - `.dss-cal*`、`.dss-hm-lg*`；
  - `.dss-mchart*`；
  - `.dss-model-split`、`.dss-ring*`、`.dss-model-*`（含 `.dss-model-list-viewport*`）；
  - 这一行里 `@media (max-width:860px)`、`@media (max-width:640px)` 中的趋势部分。

  删除前逐个 `grep src/`，确认只有趋势页在用。
- `:147` 的 `.dss-ml-row .dss-ml-reasoning`：`src/` 里已经没有 `dss-ml-` 的使用，是死规则。它是 `--dss-chart-reasoning` 唯一的使用者，一起删。
- token：
  - `--dss-chart-reasoning`（`:61`）；
  - `--dss-heat-1/2/3`、`--dss-heat-ring`，深色（`:67-70`）和浅色（`:134-137`）各一份；
  - `--dss-hero-bg`、`--dss-hero-border`、`--dss-hero-chip-bg`（`:71-73`）。
- 删完后，`tests/styles.test.js:86`"every referenced --dss-* token is defined"会兜底检查有没有漏删的引用。

## 7. 模块、函数与文案

### 7.1 新增纯模块 `src/client-trends-model.cjs`

不含 React、DOM、存储和文案，不在内部调用 `Date.now()`，需要"今天"的函数都接收 `today`。依赖：`client-format.cjs` 的 `mergeCostSummaries`，`client-timeline-model.cjs` 的 `addDays`、`weekOf`，`client-data.cjs` 的 `modelNameOnly`。

| 导出 | 输入 → 输出 | 规则 |
| --- | --- | --- |
| `RANGES = [7, 30, 90]`、`HEAT_WEEKS = 26`、`MODEL_COLORS = 8` | 常量 | |
| `TRENDS_PREF_DEFAULTS` | `{range: 30, metric: "cost"}` | 冻结对象 |
| `normalizeTrendsPrefs(value)` | 任意值 → `{range, metric}` | U3 |
| `amountOf(summary)` | → 数字 | `totals` 中 CNY 那一项的 `amount`，任何 `status` 都取（含 `partial`）。没有时为 0；`free` 为 0 |
| `isPartial(summary)` | → 布尔 | U12 |
| `rangeDates(today, n)` | → 升序的 `n` 个日期 | U1 |
| `previousDates(today, n)` | → 升序的 `n` 个日期 | U1 的上一周期 |
| `dayPoints(dates, byDay, dayCosts)` | → `[{date, input, output, cacheRead, uncached, reasoning, tokens, cost, amount, partial, active}]` | `tokens = input + output`；`uncached = max(0, input − cacheRead)`；`cost` 是当天的摘要，没有时是 `summarizeCosts([])`；`active = tokens > 0` |
| `metricValue(point, metric)` | → 数字 | `cost` 取 `amount`，`token` 取 `tokens` |
| `rangeTotals(points)` | → `{input, output, cacheRead, uncached, reasoning, tokens, cost, activeDays, days}` | `cost = mergeCostSummaries(points.map(p => p.cost))`。U4 和 U5 都用它，保证摘要条合计等于柱子之和 |
| `niceMax(peak)` | → 数字 | U5；`peak <= 0` 或非有限数时返回 1 |
| `fmtAxisCost(value)` | → 字符串 | 0 → `"¥0"`；<1 → 最多两位小数并去掉末尾的 0（`"¥0.25"`、`"¥0.5"`）；<100 → 最多一位小数（`"¥7.5"`、`"¥15"`）；<1000 → 整数；≥1000 → `"¥1.5k"` |
| `xLabels(dates, today)` | → `[{index, kind: "today" \| "date" \| "month", date}]` | U5 的取标签和避让规则；文字由组件拼 |
| `heatWindow(today)` | → `{start, dates[]}` | U7；`start` 是周一 |
| `heatCells(window, values, today)` | `values: Map<日期, {value, active}>` → `[{date, column, row, level, active, today}]` | `column` 是 1–26，`row` 是 1–7（周一为 1）；不含未来日期 |
| `heatLevel(value, sortedActiveValues)` | → 0–4 | U7 的分级 |
| `heatMonths(window)` | → `[{column, month}]` | U7 的月份规则；只看 `window.dates`（不晚于今天）里的 1 日；`month` 是 1–12，文字由组件用 `tr.months` 拼 |
| `streaks(activeSet, window, today)` | → `{active, total, current, currentEnd, longest, longestStart, longestEnd}` | U8；`currentEnd` 是 `"today" \| "yesterday" \| null` |
| `modelColorIndexes(models)` | → `Map<key, 0..7>` | U9 |
| `modelValue(row, metric)` | → 数字 | `cost` 取 `amountOf(row.costSummary)`，`token` 取 `input + output` |
| `modelShares(rows, metric)` | → `Map<key, 0..1>` | 合计为 0 时全部为 0 |
| `topModel(rows, metric)` | → `{row, metric}` 或 `null` | U4 第四格，含"费用为 0 时改用 Token"的规则 |
| `ringStops(rows, shares, colorIndexes)` | → `[{colorIndex \| null, from, to, share, keys[]}]` | U10；角度保留一位小数，最后一段的 `to` 固定为 360；占比为 0 的模型不进环，仍留在表里 |
| `defaultModelSort(metric)` | → `{key, dir}` | U11 |
| `sortModels(rows, key, dir, metric)` | → 新数组 | U11 的排序和并列规则；不修改输入 |

单测要验证的不变量：
- `rangeTotals(points).cost` 的金额等于 `points` 各天金额之和；
- 把同一组会话交给 `modelAgg`，各行金额之和等于 `rangeTotals` 的金额（误差 < 1e-6）。

### 7.2 新增组件文件 `src/client-trends.cjs`

| 组件 | 职责 |
| --- | --- |
| `TrendsView(props)` | 入口，按 §5 选择正常、空、全部隐藏状态，持有柱区和热力图的当前日期以及模型表的排序状态。props 见下 |
| `TrendsTools` | U2 |
| `TrendsKpis` | U4 |
| `DailyChart` | U5、U6 的柱区键盘 |
| `Heatmap` | U7、U8、U6 的热力图键盘 |
| `ModelSection` | U10、U11 |

`TrendsView` 的 props：
- 数据：`projects`（`data.projects`）、`rangeProjects`、`hidden`、`hiddenKey`、`dates`、`today`；
- 偏好：`prefs`、`setPrefs`；
- 筛选：`colorIndexes`（项目颜色，给筛选菜单用）、`onToggle`、`onShowAll`；
- 跳转与价格：`onOpenDay`、`onOpenPricing`；
- 文案：`t`。

计算都放在 `TrendsView` 自己的 `useMemo` 里。它只在趋势页挂载，切到别的标签页时不会计算。

| memo | 依赖 | 内容 |
| --- | --- | --- |
| `days` | `projects`、`hiddenKey` | 可见项目的全部会话做 `sessionDayTokens`，再加 `dayCostSummaries(projects, hidden)` |
| `allModels` | `projects` | `modelAgg(全部会话)` → `modelColorIndexes` |
| `points` / `previousPoints` | `days`、`today`、`range` | `dayPoints(rangeDates(...))` / `dayPoints(previousDates(...))` |
| `heat` | `days`、`today`、`metric` | `heatWindow` → `heatCells` 和 `streaks` |
| `models` | `rangeProjects`、`hiddenKey` | `modelAgg(可见范围项目的会话)` |

从 `src/client-overview.cjs` 导出 `PendingChip`、`InfoTip`，不改它们的行为。

### 7.3 `src/client.cjs` 的改动

1. 删除以下旧代码：
   - `TrendsView`、`Section`、`CalendarHeatmap`、`niceCeil`、`DailyTrendChart`、`ModelRing`、`showModelTip`、`modelListNeedsScroll`、`ModelList`（`:619-969`）；
   - `modelColor` 一组（`:971-994`）；
   - 上方的趋势注释（`:616-618`）。

   改为 `require("./client-trends.cjs")`。分片删除，见 §8。`__test` 里的 `CalendarHeatmap`、`modelListNeedsScroll` 随之去掉，`modelAgg`、`streakAndActive`、`monthlyFromDays`、`weeklyFromDays` 保留。导入里不再用到的 `MAX_VISIBLE_MODELS`、`buildGlobals`、`pad` 等，逐个 `grep` 后去掉。`MAX_VISIBLE_MODELS` 如果没有别的使用者，也从 `client-format.cjs` 的定义和导出里删掉。
2. `StatsPanel` 在早退之前加入：
   ```js
   var trendsPair = usePref("trends", TRENDS_PREF_DEFAULTS);
   var trendsPrefs = normalizeTrendsPrefs(trendsPair[0]);
   var setTrendsPrefs = useCallback(function(patch) {
   	trendsPair[1](function(current) {
   		return normalizeTrendsPrefs(Object.assign({}, normalizeTrendsPrefs(current), patch));
   	});
   }, [trendsPair[1]]);
   var todayKey = localDayKey(Date.now());
   var trendsRangeProjects = useMemo(function() {
   	return tab === "trends" ? applyRange(data.projects, todayKey, trendsPrefs.range) : null;
   }, [tab, data.projects, todayKey, trendsPrefs.range]);
   var pendingTabFocusRef = useRef(null);
   ```
   再加 U6 的 effect 和 `openDay`。
3. 删除 `globals`（`:339`）和 `dateGlobals`（`:345`），前提是 `grep` 确认没有别的使用者。
4. `OverviewTools`（`:529-537`）只在 `tab !== "trends"` 时渲染，`showMode`、`showFilter` 两个参数不再需要按标签页判断：总览和时间线一律传 `true`。
5. `ExportMenu`（`:482-487`）：`tab === "trends"` 时 `projects` 和两个导出回调都用 `trendsRangeProjects`。
6. 正文的 `TrendsView`（`:590-596`）改为：
   ```js
   e(TrendsView, { projects: data.projects, rangeProjects: trendsRangeProjects, hidden, hiddenKey, dates, today: todayKey,
   	prefs: trendsPrefs, setPrefs: setTrendsPrefs, colorIndexes, onToggle: toggle, onShowAll: showAll,
   	onOpenDay: openDay, onOpenPricing: openPricing, t })
   ```

### 7.4 文案（`src/client-locale.cjs`，中英同时加）

`%s`、`%d` 按出现顺序依次 `replace`，沿用现有写法。

| 键 | 中文 | English |
| --- | --- | --- |
| `tr.range` / `tr.rangeDays` | 范围 / %d 天 | Range / %d days |
| `tr.metric` | 指标 | Metric |
| `tr.kpiLabel` | 趋势摘要 | Trend summary |
| `tr.kpi.vs` | 较前 %d 天 | vs previous %d days |
| `tr.kpi.perDay` | 日均费用 | Daily average |
| `tr.kpi.active` | 活跃 %d / %d 天 | Active %d of %d days |
| `tr.kpi.topModel` | 最常用模型 | Top model |
| `tr.kpi.shareCost` / `tr.kpi.shareToken` | 费用占比 %s / Token 占比 %s | %s of cost / %s of tokens |
| `tr.daily.cost` / `tr.daily.token` | 每日费用 / 每日 Token | Daily cost / Daily tokens |
| `tr.recent` | 近 %d 天 | Last %d days |
| `tr.groupAria` | %s，%s | %s, %s |
| `tr.openDay` | %s，打开当天总览 | %s, open in Overview |
| `tr.avgLine` | 虚线 = 活跃日的日均 | Dashed line = average per active day |
| `tr.clickBar` / `tr.clickCell` | 点柱子查看当天总览 / 点格子查看当天总览 | Click a bar to open that day in Overview / Click a cell to open that day in Overview |
| `tr.months` | 1月,2月,3月,4月,5月,6月,7月,8月,9月,10月,11月,12月 | Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec |
| `tr.heat` | 活动热力图 | Activity heatmap |
| `tr.heatNote` | 近 26 周 · %s | Last 26 weeks · %s |
| `tr.byCost` / `tr.byToken` | 按费用 / 按 Token | by cost / by tokens |
| `tr.heatUnit` | 每格 = 1 天，颜色按活跃日的分位数分级 | One cell per day; shades follow quartiles of active days |
| `tr.stat.active` / `.current` / `.longest` | 活跃天数 / 当前连续 / 最长连续 | Active days / Current streak / Longest streak |
| `tr.stat.today` / `tr.stat.yesterday` | 截至今天 / 截至昨天 | Through today / Through yesterday |
| `tr.models` | 模型 | Models |
| `tr.modelCount` | %d 个模型 | %d models |
| `tr.shareByCost` / `tr.shareByToken` | 按费用占比 / 按 Token 占比 | share by cost / share by tokens |
| `tr.col.model` / `tr.col.share` | 模型 / 占比 | Model / Share |
| `tr.tableLabel` | 模型明细，%s | Model details, %s |
| `tr.ringAria` | 模型%s占比：%s | Model share of %s: %s |
| `tr.ringCost` / `tr.ringToken` | 费用 / Token | cost / tokens |
| `tr.listSep` | ， | `, `（逗号后有一个空格） |
| `tr.other` | 其他 | Other |
| `tr.ringOther` | 灰色 = 其他 %d 个模型 | Grey = %d other models |
| `tr.llmNote` | LLM 时长按 Token 占比从会话分摊，是近似值。 | LLM time is split from sessions by token share and is approximate. |
| `tr.pendingShort` | 待计价 | Unpriced |
| `tr.providerUnknown` | 未知 Provider | Unknown provider |
| `tr.reasoning` | 思考 | Reasoning |
| `tr.emptyRange` | 近 %d 天没有 Token 消耗 | No token usage in the last %d days |
| `tr.viewRange` | 看近 %d 天 | Show last %d days |

- 复用以下键：
  - `tl.metricCost`、`tl.metricToken`、`tl.rangeValue`、`tl.activeValue`、`tl.days`、`tl.peak`、`tl.partial`；
  - `kpi.perDay`、`kpi.vs`、`kpi.flat`、`kpi.pending`、`kpi.tokens`、`kpi.hit`、`kpi.uncached`、`kpi.tokAria`；
  - `card.cost`、`th.sessions`、`th.cacheHit`、`th.llm`、`th.cost`、`w.input`、`w.output`、`w.cacheHit`；
  - `w.weekdays`、`w.dayPrefix`、`w.estimatedHint`、`nav.today`、`filter.allHidden`、`filter.showAll`、`empty`；
  - 热力图图例的 `trends.less`、`trends.more`（时间线也在用，`src/client-timeline.cjs:921`、`:923`）。
- 删除除 `trends.less`、`trends.more` 以外的全部 `trends.*`，中英各 30 个左右，以 `grep '"trends\.' src/client-locale.cjs` 为准，每个先 `grep` 确认没有其他引用。
- `nav.days7/30/90` 是更早的遗留键，本文不动。

## 8. 切片计划

### 切片 5f：趋势视图模型

1. 新建 `src/client-trends-model.cjs`（§7.1）。
2. 新建 `tests/trends-model.test.js`，至少覆盖：
   - `normalizeTrendsPrefs`：`null`、数组、`{range: 14}`、`{range: "30"}`、`{metric: "x"}` 都回到默认；合法值保留；
   - `amountOf`：`exact`、`estimated`、`partial` 都取金额；`free` 和空摘要为 0；
   - `isPartial`：`partial`，以及 `exact` 但带 `unpricedTokens` 的情况；
   - `rangeDates` / `previousDates`：今天 2026-09-08，30 天的起点是 08-10，上一周期是 07-11 至 08-09；跨年；
   - `dayPoints` / `rangeTotals`：缺天补零；`uncached` 不为负；`activeDays`；摘要条金额等于各天之和；
   - `niceMax`：0、0.004、0.8、1、1.01、12.3 → 15、99 → 100、2400 → 2500；
   - `fmtAxisCost`：0、0.25、0.5、7.5、15、150、1500；
   - `xLabels`：§9.3 第 5 条三种范围的期望结果；
   - `heatWindow`：今天 09-08 时起点是 03-16，共 177 天；今天是周一、周日时都对；
   - `heatCells`：最后一列只有周一、周二两格；`column` 和 `row` 正确；没有未来日期；
   - `heatLevel`：≥4 天时的分位数；<4 天时的比例；分位数相等时退回比例；活跃日值为 0 时为 1 级；
   - `heatMonths`：03-16 起，第一个标签是 4 月，在第 3 列；
   - `streaks`：今天活跃、今天不活跃但昨天活跃、两天都不活跃三种；最长段并列时取较晚的一段；
   - `modelColorIndexes`：前 8 个稳定，第 9 个没有颜色；`key` 并列时的顺序稳定；
   - `modelShares` / `topModel`：两种指标；费用为 0 时改用 Token；
   - `ringStops`：`.is-other` 的模型合成一段；角度连续，最后一段到 360；
   - `sortModels`：每个排序键、两种方向、并列规则，不修改输入；
   - 不变量：用一个两模型、两天、一天部分计价的会话夹具，验证 `modelAgg` 各行金额之和等于 `rangeTotals` 的金额。
3. 需要"今天"的用例一律传固定日期，`TZ=UTC npm test` 必须和默认时区结果一致。
4. 本片不改任何 UI。新模块还没被 `client.cjs` 引用，`npm run build` 后 `lib/` 应该没有变化；如果有变化，说明误改了别的文件。

验收：§10 门禁通过。

### 切片 5g：工具栏、摘要条、每日柱图和接线

1. 新建 `src/client-trends.cjs`，实现 `TrendsView`、`TrendsTools`、`TrendsKpis`、`DailyChart`（U1–U6、U12、U13、U14）。
2. 热力图和模型区暂时沿用旧组件：`TrendsView` 在柱图下面渲染旧的 `Section` + `CalendarHeatmap` + `ModelRing` + `ModelList`，传的数据和现在完全一样（`buildGlobals` 的结果）。5h、5i 再逐个替换。为此本片先把这几个旧组件和 `modelColor` 一起搬进 `src/client-trends.cjs`，原样搬，不改行为。
3. 删除 hero 和四张指标卡的代码，以及 `.dss-hero*`、`.dss-metric*`、`--dss-hero-*` 三个 token。
4. 按 §7.3 第 2–6 条改 `client.cjs`。旧热力图过渡期内仍然要用 `globals`，所以第 3 条（删除 `globals`、`dateGlobals`）留到 5i 再做。
5. 加 `--dss-chart-cache`，并把总览构成条改用它（U14）。
6. 按 §7.4 加本片用到的 `tr.*` 文案，删除 hero 和指标卡专用的 `trends.*` 文案。
7. 夹具加 `?shiftDays=`（§9.4）。
8. 按 §9.2 迁移 smoke，加入 §9.3 的第 1–12 条；按 §9.5 新建 `tests/trends-view.test.js`。

验收：
- 1440px 默认夹具下，30 天、费用模式，摘要条的费用和总览"全部"模式的费用一致（§9.3 第 3 条）。
- 趋势页没有 `.dss-date-nav` 和 `[data-action=mode-day]`。
- 深色、浅色、390px、320px 截图中，总览构成条的三段颜色都能分清。

### 切片 5h：热力图

1. 实现 `Heatmap`（U7、U8 和 U6 的热力图键盘），替换旧的 `CalendarHeatmap`。
2. 删除 `CalendarHeatmap`，以及 `.dss-cal*`、`.dss-hm-lg*`、`.dss-trend-duo`、`.dss-duo-*`、`--dss-heat-*`。
3. 加热力图用到的文案，删除对应的旧文案。
4. `tests/pure.test.js:125` 的 `CalendarHeatmap` 用例删除，由 5f 的 `heatCells` / `heatLevel` 用例取代；`:12` 的导入随之去掉。
5. 加入 §9.3 的第 13–17 条。

验收：26 列、177 格，最后一列只有两格；今天有描边；键盘从今天出发能走到最早的活跃日，并跳到那天的总览。

### 切片 5i：模型区

1. 实现 `ModelSection`（U9–U11），替换旧的环图和列表。
2. 删除 `ModelRing`、`ModelList`、`showModelTip`、`modelListNeedsScroll`、`modelColor` 一组和 `Section`；按 §7.3 第 3 条删除 `globals`、`dateGlobals`；删除 `.dss-section`、`.dss-sec-*`、`.dss-model-*`、`.dss-ring*`、`.dss-mchart*`、`.dss-trends`、`.dss-ml-*`、`--dss-chart-reasoning`，以及剩下的 `trends.*` 文案。
3. `tests/pure.test.js:44-48` 的 `modelListNeedsScroll` 用例删除，`:11` 的导入随之去掉。
4. 按 §9.5 补 `tests/styles.test.js` 的禁用列表。
5. 加入 §9.3 的第 18–22 条。

验收：
- 页面上没有内部滚动框；
- 切换范围、指标、筛选后，同一模型的颜色不变；
- 部分计价夹具下，点模型行的"待计价"打开价格抽屉，并定位到这个模型。

### 切片 5j：夹具、截图与文档

1. 按 §9.4 扩充展示夹具：模型多样化，历史补到 26 周。
2. 加入 §9.3 的第 23、24 条；截 `readme-trends`，替换 `docs/images/trends.png`。夹具变了，时间线的 README 截图 `docs/images/timeline.png`、`timeline-all.png` 也要从同一次 CI 重新取。总览截图如果是深色的，因为 U14 改了构成条颜色，也重新取。
3. 三份 README 的趋势说明改为新的读法：
   - 近 7 / 30 / 90 天；
   - 费用 / Token 切换；
   - 26 周热力图；
   - 点某一天跳到总览；
   - 受"筛选项目"影响。
4. 更新 `DESIGN.md` 的"当前实现"一节：趋势页的结构，以及 CI 数字（单测数、检查组数、截图数，以 5i 的 CI 为准）。
5. 发布说明：默认写进 `docs/release-0.5.0.md`，因为 0.5.0 尚未打 tag。维护者如果决定先发 0.5.0，就改写到下一版的发布说明。
6. 在 `docs/ui-overhaul-0.5.0.md` 切片 5 的趋势三条下注明"已完成"，附上提交哈希并链接本文；改掉 `:117` 和 `:494` 两处说法。
7. 维护者部署到 DSH 桌面端后，在真机上验证，深浅两种主题都要看：
   - 三种范围、两种指标；
   - 筛选与总览联动；
   - 柱子和热力格的跳转与焦点；
   - 窄窗口。

## 9. 对照与迁移

### 9.1 信息对照（不丢信息）

| 现有 | 新位置 |
| --- | --- |
| hero"总 Token 消耗"及输入、输出 chip | 摘要条 Token 格；输入、输出在模型表副行和柱子 tooltip 里 |
| hero"思考 token" chip | 柱子 tooltip 按天显示（U5）；不再逐模型显示（U11） |
| hero"缓存命中" chip | 摘要条 Token 格的图例"命中 X%"；模型表"缓存命中"列 |
| hero"预估费用" | 摘要条首格，加上一周期涨跌和待计价 |
| hero"最常用模型" | 摘要条第四格，按当前指标取，副行写占比 |
| 指标卡"活跃天数" | 摘要条日均格副行（范围内）；热力图统计（近 26 周） |
| 指标卡"当前连续"、"最长连续" | 热力图统计，"当前"改为连到今天或昨天（U8） |
| 指标卡"总会话" | 模型表"会话"列；全部历史的会话总数在总览"全部"模式 |
| 当月日历热力图 | 26 周热力图（U7） |
| 近 7 天 Token 柱图 | 7 / 30 / 90 天，费用或 Token（U5） |
| 环图和图例 | 环图（U10），图例由模型表代替 |
| 模型列表（可滚动）及副行：输入、输出、思考、会话、LLM、工具 | 模型表（U11）；工具时长不再逐模型显示，因为它和 LLM 一样只是按 Token 分摊的近似值，没有独立意义 |
| 模型 tooltip（费用、输入、输出） | 模型表的列 |
| 点热力格改总览日期，停在趋势页 | 点柱子或热力格，跳到那天的总览（U6） |

### 9.2 smoke 选择器迁移

`scripts/browser-fixture-smoke.mjs`：

| 现有 | 新 |
| --- | --- |
| `:159` 布局检查列表中的 `.dss-hero` | `.dss-tr-tools`、`.dss-tr-kpis`、`.dss-tr-chart`、`.dss-tr-heat`、`.dss-tr-mtable`（5h、5i 起分别加入后两项） |
| `:356` 循环中趋势页只做布局检查和截图 | 不变；另外把 `:359-376` 余额页的"只有 `.dss-body` 滚动"和"≥11px"两段检查抽成函数，趋势页也调用（§9.3 第 10 条） |
| `:385` 390px 以下的趋势页底部截图 | 不变 |
| `:330` 时区循环 `[1, 2, 3, 4]` | 不变；它已经覆盖趋势页（`index === 3`）。5g 起趋势页正文不含随浏览器时区变化的文字，这一条必须继续通过 |

截图名 `desktop-trends`、`mobile-trends`、`mobile-trends-bottom`、`narrow-trends`、`narrow-trends-bottom` 保留。

### 9.3 新增 smoke 断言

默认夹具的"今天"是 2026-09-08（北京时间 10:00，周二），数据有 09-02 至 09-08 共 7 天，两个项目、两个模型。除非另有说明，以下断言都在 1440px 中文下执行，开始前清掉 `dsh-stats.trends`、`dsh-stats.hidden`。

工具栏、摘要条、柱图（5g）：

1. **默认**：
   - `[data-action=tr-range-30]`、`[data-action=tr-metric-cost]` 都是 `aria-pressed="true"`；
   - 范围文字是"08-10 至 09-08"；
   - `.dss-body` 内没有 `.dss-date-nav`、`[data-action=mode-day]` 和 `.dss-kpis`；
   - `.dss-tr-kpis` 里有 4 个 `.dss-kpi`。
2. **柱数**：`.dss-tr-col` 有 30 个；`button.dss-tr-bar` 有 7 个，最后一个的 `data-date` 是 2026-09-08。
3. **一致**：趋势页 30 天、7 天两种范围下，`.dss-tr-kpis .dss-kpi.cost .dss-kpi-v` 的文字都等于总览"全部"模式下 `.dss-kpis .dss-kpi.cost .dss-kpi-v` 的文字。断言后把 `nav` 恢复为按日。
4. **切换与持久化**：
   - 点 `tr-range-7`：`.dss-tr-col` 有 7 个，范围文字是"09-02 至 09-08"；
   - 点 `tr-metric-token`：`h3` 是"每日 Token"，每个 `.dss-tr-bar` 都有 `.is-token` 和 3 个 `i`；
   - `localStorage["dsh-stats.trends"]` 解析后等于 `{"range":7,"metric":"token"}`；
   - 关闭面板再打开，仍然是 7 天、Token；
   - 写入 `{"range":14,"metric":"x"}` 后重新打开，回到 30 天、费用。
5. **x 轴**（`.dss-tr-x span` 的文字）：
   - 30 天：`["08-10","08-17","08-24","08-31","今天"]`；
   - 7 天：`["09-02","09-03","09-04","09-05","09-06","09-07","今天"]`；
   - 90 天：`["7月","8月","今天"]`，并且 `.dss-tr-col` 有 90 个。
6. **键盘与跳转**：
   - 柱区只有一个 `tabIndex=0` 的柱子，它是峰值那天；
   - 按 Home，焦点到 09-02，`#dss-tooltip` 含"09-02"。无头 Chrome 聚焦需要 `Emulation.setFocusEmulationEnabled`：只在这条断言前打开，断言后立刻关闭，同余额页 §9.3 第 5 条；
   - 按 ArrowRight，焦点到 09-03；按 End，焦点到 09-08；
   - 按 Enter：总览标签页 `aria-selected="true"`，`document.activeElement.id === "dss-tab-overview"`，`.dss-date-label` 含"2026-09-08"，`localStorage["dsh-stats.nav"]` 是 `{"mode":"day","date":"2026-09-08"}`。
7. **筛选联动**：
   - 在趋势页打开筛选，取消 `client-dashboard`：摘要条费用变化，`.dss-filter-badge` 是"已隐藏 1"；
   - 切到总览：没有 `.dss-prow[data-project-id="client-dashboard"]`；
   - 回到趋势页点"全部显示"，费用恢复。
8. **全部隐藏**：两个项目都取消后出现 `.dss-tr-empty`，文字含"所有项目都已隐藏"；点 `[data-action=tr-show-all]` 后恢复。
9. **部分计价**：`?stats=partial&lang=zh`：
   - 至少一个 `.dss-tr-bar.is-partial`；
   - 摘要条费用以"*"结尾；
   - `.dss-tr-kpis [data-action=pricing-pending]` 存在，点它打开价格抽屉，断言方式沿用总览待计价的 smoke。
10. **单一滚动与字号**：三种宽度的趋势页都执行 §9.2 抽出的检查。390px 和 320px 下结果必须是 `['dss-body']`。
11. **空范围**：`?shiftDays=20&lang=zh`（今天变成 09-28）：
    - 点 `tr-range-7`：出现 `.dss-tr-empty`，文字含"近 7 天没有 Token 消耗"，按钮是"看近 30 天"；
    - 点按钮：30 天，`button.dss-tr-bar` 有 7 个。
12. **截图**：
    - 1440px Token 模式截 `desktop-trends-token`，90 天截 `desktop-trends-90`；
    - 在 `:909-911` 的 1440px 深色段切到趋势页，截 `dark-trends`；
    - 部分计价截 `desktop-trends-partial`。

热力图（5h）：

13. **格子**：
    - `.dss-tr-cell` 有 177 个；第一个的 `data-date` 是 2026-03-16；
    - 第 26 列（`style.gridColumnStart === "26"`）只有 2 格；
    - `button.dss-tr-cell` 有 7 个；
    - 2026-09-08 那格带 `.is-today`。
14. **标签**：月份标签依次是 4月 至 9月；星期列只有"一、三、五"三个非空标签。
15. **统计**：活跃"7 / 177 天"，当前连续"7 天"、副行"截至今天"，最长连续"7 天"、副行"09-02 至 09-08"。
16. **键盘与跳转**：
    - 热力图唯一 `tabIndex=0` 的格子是 09-08；
    - ArrowLeft 到 09-07，Home 到 09-02；
    - Enter 跳到 2026-09-02 的总览，焦点在 `#dss-tab-overview`。
17. **空范围下仍有热力图**：接第 11 条，7 天空范围时 `.dss-tr-heat` 存在，`button.dss-tr-cell` 有 7 个。

模型区（5i）：

18. **行与排序**：
    - `.dss-tr-mrow` 有 2 行；
    - 费用列 `th` 是 `aria-sort="descending"`，各行费用按降序排；
    - 切到 Token 后，Token 列 `th` 是 `descending`；
    - 点"模型"表头后变为 `ascending`，并按名字升序。
19. **占比**：`.dss-tr-mrow .dss-share-pct` 的数字之和在 99.8–100.2 之间，两种指标都是。
20. **环**：`.dss-tr-ring[role=img]` 的 `aria-label` 含两个模型名；页面上没有 `.dss-model-list-viewport`。
21. **颜色稳定**：`deepseek-v4-flash` 那一行圆点的 `data-color`，在 7 天、90 天、Token 模式、隐藏 `client-dashboard` 之后都相同。
22. **模型待计价**：`?stats=partial`：`fixture-unpriced` 那一行有 `[data-action=pricing-pending]`，点它打开价格抽屉，并定位到 `fixture-unpriced`。

展示夹具（5j）：

23. **展示数据**：`?stats=showcase&lang=zh`，30 天、费用模式：
    - 非零柱 ≥ 20 根；
    - `.dss-tr-mrow` ≥ 4 行；
    - `button.dss-tr-cell` ≥ 100 个；
    - `.dss-tr-kpis` 的文字不含"*"，页面上没有 `.is-partial`。

    截 `readme-trends`。
24. **时间线展示**：`:1577-1612` 的断言（≥4 条泳道、≥15 个活跃日、子对话标签不换行）在新夹具下全部通过。

每片在 `report.checks` 末尾加一条概括本片断言的文字。`report.checks` 的组数不得减少；新增截图在汇报时写明。

### 9.4 夹具

`scripts/fixtures/browser-entry.js`（5g）：

- `?shiftDays=N`：`Date.now = () => data.estimated.meta.generatedAt + N * 864e5`，默认 0。只给 §9.3 第 11、17 条用。

`scripts/fixtures/browser-data.mjs` 的展示夹具（5j）：

1. 模型按项目分配。`addShowcaseBlock` 不再写死 `deepseek-v4-flash`，改为查表：

   | 项目 | provider / model |
   | --- | --- |
   | `api-service`、`data-pipeline` | `deepseek` / `deepseek-v4-pro` |
   | `client-dashboard`、`docs-site` | `deepseek` / `deepseek-v4-flash` |
   | `mobile-app` | `minimax` / `MiniMax-M3` |
   | `infra` | `moonshot` / `kimi-k2.7-code` |
   | 子对话（`parentId` 不为空） | `deepseek` / `deepseek-v4-flash` |

   基线上已经核对过，这四个模型在客户端计价里都是 `exact`。如果宿主聚合后出现 `partial` 或 `estimated`，先停下来汇报，不要改价格数据。
2. 历史补到 26 周：在原来 35 天的循环**之后**另起一段循环，开头重新设种子，这样原有 35 天的随机序列完全不变：
   ```js
   // 趋势页 26 周热力图的历史数据；放在原循环之后并重设种子，原有 35 天不受影响。
   showcaseSeed = 0x7e4d5eed;
   const offDays = new Set(['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', '2026-06-19',
     '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17']);
   for (let time = Date.parse('2026-03-16T00:00:00Z'); time < Date.parse('2026-08-05T00:00:00Z'); time += 864e5) {
     const date = new Date(time).toISOString().slice(0, 10);
     const weekday = new Date(time).getUTCDay();
     if (offDays.has(date) || weekday === 0) continue;
     if (weekday === 6) {
       if (Math.floor((time / 864e5 + 3) / 7) % 3 === 0) addShowcaseBlock('docs-site', date, 600, 60);
       continue;
     }
     const blocks = date < '2026-05-01' ? 2 : date < '2026-07-01' ? 3 : 4;
     const order = shuffled(showcaseProjects.map(project => project.id));
     const starts = [540, 600, 810, 900];
     for (let index = 0; index < blocks; index++) addShowcaseBlock(order[index], date, starts[index] + pick([0, 15, 30]), pick([45, 60, 75, 90, 105]));
   }
   ```
   节假日（五一、端午、7 月中旬一周）不活跃；每三周有一个周六活跃；每天的块数逐月增加，柱图和热力图会有明显起伏。
3. 改完后先在本地跑一次展示截图，检查时间线 README 截图的构图（泳道数、首页活跃日）是否仍然合适。有变化如实汇报，不要为了截图去改原有 35 天的数据。

### 9.5 新增与迁移的单测

- `tests/trends-model.test.js`：见 5f。
- 新建 `tests/trends-view.test.js`，按 `tests/balance-view.test.js` 的方式，用 `renderToStaticMarkup` 和真实的中英文案渲染：
  - 默认数据：有 `dss-tr-kpis`，没有 `dss-kpis`；`button` 里 `data-action="tr-day"` 的个数等于活跃日数；
  - 全部历史没有 Token：只有 `dss-empty`；
  - 全部隐藏：有 `filter.allHidden` 的文字和 `tr-show-all`；
  - 范围内没有 Token：有 `tr-empty-range`，按钮文字指向最小的可用范围；
  - 部分计价：摘要条费用带"*"，有 `pricing-pending`；
  - 中英两套文案渲染后都不含字面量 `tr.`、`trends.`（没有漏键），并且两套的 `tr.*` 键集合相同。

  静态渲染不会执行 effect；"今天"由 props 传入，测试里固定为 2026-09-08。
- `tests/pure.test.js`：5h 删除 `CalendarHeatmap` 用例（`:125`），5i 删除 `modelListNeedsScroll` 用例（`:44-48`），并去掉对应的导入（`:11-12`）。`modelAgg`、`streakAndActive`、`monthlyFromDays`、`weeklyFromDays` 的用例保留。
- `tests/reliability-ui.test.js:142`：继续从 `__test` 取 `modelAgg`，不变。
- `tests/styles.test.js:152`：5i 在禁用列表中加入 `dss-hero`、`dss-metric`、`dss-section`、`dss-sec-`、`dss-trend`、`dss-duo-`、`dss-cal`、`dss-hm-`、`dss-mchart`、`dss-ring`、`dss-model-`、`dss-ml-`、`--dss-heat-`、`--dss-chart-reasoning`、`--dss-hero-`（`--dss-hero-card` 已在列表里，可以合并成 `--dss-hero-`）。再加一条：`.dss-tr-` 规则里没有 `overflow` 为 `auto` 或 `scroll` 的声明。

## 10. 门禁

沿用上位文档 §10：

```bash
npm test
TZ=UTC npm test
npm run build && git diff --exit-code -- lib   # 构建产物与提交一致
node --check lib/*.js
npm pack --dry-run
```

- 浏览器 smoke 以 CI 为准。用 `gh run download <run-id> -n browser-results` 下载截图，逐张检查趋势页的深色、浅色和窄屏截图，至少看：
  - `desktop-trends`、`mobile-trends`、`mobile-trends-bottom`、`narrow-trends`、`narrow-trends-bottom`；
  - `desktop-trends-token`、`desktop-trends-90`、`desktop-trends-partial`、`dark-trends`；
  - 5g 起还要看 `desktop-overview`、`dark-overview` 一类的总览截图，确认构成条三段可分；
  - 5j 加 `readme-trends`，以及重新取的时间线 README 截图。
- 价格机器人会推送 main：推送前先 `git pull --rebase origin main`。`lib/` 冲突时不要手工合并：重新 `npm run build`，`git add lib` 后继续 rebase，然后重跑门禁。
- 已知环境问题：`tests/pricing-delivery.test.js:52` 在慢沙箱里可能超时，以 CI 为准，不要在本切片里修改它。

## 11. 风险与对策

| # | 风险 | 对策 |
| --- | --- | --- |
| R1 | 迁移 smoke 时顺手删掉了断言 | §9.2 逐行对照；原有断言只换选择器，不删除；汇报里写 `report.checks` 改造前后的组数 |
| R2 | 全量历史的 `sessionDayTokens` 和 `modelAgg` 每次渲染都重算，大数据下卡顿 | 计算放在 `TrendsView` 的 `useMemo` 里，只在趋势页挂载；依赖是 `projects` 和 `hiddenKey`，切范围和指标时不重算全量部分；`large` 夹具的趋势页截图正常即可 |
| R3 | 摘要条、柱子、模型表三处合计对不上 | 摘要条和柱子都来自 `rangeTotals(points)`；模型表和它的一致性由 5f 的不变量单测保证 |
| R4 | 趋势页文字随浏览器时区变化 | 只用北京时间日期键；§9.2 的时区循环覆盖趋势页 |
| R5 | 摘要条容器复用 `.dss-kpis`，smoke 误判总览已渲染 | U14：外层用 `.dss-tr-kpis` |
| R6 | 用户不习惯趋势页也受隐藏影响 | 这是有意统一的行为（U2），工具栏里的筛选按钮有"已隐藏 N"角标；README 写明 |
| R7 | 构成条改色影响总览截图和 README | U14 只换一个 token；5j 重新取受影响的截图 |
| R8 | 展示夹具改动影响时间线 README 截图和断言 | 新数据放在原循环之后并重设种子；§9.3 第 24 条；改完先在本地看截图 |
| R9 | 跳转后焦点掉到 `body` | U6 的 `pendingTabFocusRef` + effect；§9.3 第 6、16 条断言 `activeElement` |
| R10 | 90 天在 390px 下柱子只有两三像素宽，难以点中 | 可以接受：键盘可以逐日移动，热力图也提供同样的跳转；最低柱高 2px，保证看得见 |
| R11 | 行内 `style` 里的 `conic-gradient(var(--dss-pN) …)` 在某些宿主下不生效 | 5i 在深浅两种截图里核对；不生效时改为在组件里读取 `getComputedStyle` 的颜色值，先找维护者确认 |
| R12 | "当前连续"的含义变了，老用户以为数据少了 | 副行写"截至今天 / 截至昨天"；发布说明写明 |
| R13 | 热力图最多 177 个按钮，Tab 键要走很久 | 用 roving tabindex，整个热力图只有一个停靠点（U6） |
| R14 | 5g–5i 期间新旧部分混在同一页 | 旧部分原样保留，数据不变；§0 第 5 条：维护者要在这期间发版时，停在完整的切片边界上 |

## 12. 待定事项与默认值

以下各项先按默认值实施，评审时可以再调整，都不阻塞开工：

| 事项 | 默认 |
| --- | --- |
| 默认指标 | 费用 |
| 范围 | 7 / 30 / 90 天，默认 30，不做"全部" |
| 偏好 | 趋势和时间线的指标各存各的 |
| 筛选 | 与总览、时间线共用 |
| 点某一天 | 跳到那天的总览 |
| 热力图 | 固定 26 周，两种指标都用强调色，分位数分级 |
| 环图分段 | 前 8 个模型各一段，其余合成"其他" |
| 模型表 | 不分页；不逐模型显示思考 Token 和工具时长 |
| 上一周期涨跌 | 只在双方都是确定的人民币金额时显示 |
| 发布归属 | 并入 0.5.0 发布说明（尚未打 tag），由维护者在发布前确认 |
