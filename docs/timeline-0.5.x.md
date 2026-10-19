# 切片 4：开发时间线重做实施文档

- 状态：原型 v4 已确认，交接前已按代码逐条核对，可以开始实施
- 日期：2026-10-18
- 基线：`8072550`（`package.json` 仍是 0.5.0，尚未打 tag）
- 设计参考：[`docs/prototypes/timeline-0.5.x.html`](prototypes/timeline-0.5.x.html)。自包含静态原型，可切换宽度（1180/760/390）和场景（忙碌日、只有 2 分钟的日子、全部历史），可打开改动标注。原型数据是虚构样例。
- 上位文档：[`docs/ui-overhaul-0.5.0.md`](ui-overhaul-0.5.0.md)。其中 §3 兼容约束、§10 门禁、对话框与焦点约定（§7.2）继续适用；本文替代那份文档 §8 中"切片 4"的规划条目。
- 范围：只改"开发时间线"标签页，以及它和筛选、按日导航之间的接线。趋势、余额（切片 5）不在本文范围。

本文写明每个子切片改哪些文件、加哪些函数和组件、怎样测试、怎样验收。实现和原型冲突时以本文为准；本文没写到的视觉细节以原型为准。

## 0. 实施约定

1. 按 §8 的顺序做 4a → 4b → 4c → 4d：每片一个聚焦提交，推送后 CI 全绿才开始下一片。
2. 开工前确认工作区干净。基线之后工作区里如果有维护者未提交的改动（例如宿主 `src/host-*.js`、`src/index.js`），它们不属于本文，不要提交、不要还原、不要顺手修改；用 `git add <具体文件>` 只提交本片文件。
3. `lib/*` 只能由 `npm run build` 生成，并和对应源码在同一个提交里。不要手改 `lib/`、`data/pricing/`、宿主和 RPC 代码，也不要改原型文件。
4. 原型用字符串拼 HTML 只是演示。插件里一律用 `createElement`；项目名、会话标题、模型名这些用户数据不能进入 `innerHTML`。tooltip 继续走 `tipRows()`，它内部已经用 `esc()` 转义。
5. 以下情况先停下来，找维护者确认后再继续：
   - 需要偏离 §4 的 T1–T14；
   - 需要新增依赖，或改动宿主或 RPC；
   - 本文与代码对不上；
   - 打 tag 或发布 npm。
6. 每片完成后汇报以下内容：
   - 提交哈希和 CI 运行链接；
   - 测试数量；
   - 浏览器 smoke 的 `report.checks` 在改造前后的对比（检查组数量不得减少）；
   - 检查过哪些截图，发现了什么问题；
   - 本片没有做或推迟的事项。
7. 提交信息沿用仓库格式：`feat(timeline): ...`、`test(smoke): ...`、`docs: ...`。

## 1. 现状问题

以下问题来自基线代码和 CI 截图：

| # | 问题 | 位置 |
| --- | --- | --- |
| a | 短活动看不见：块高等于"30 分钟内的活跃占比"，2 分钟的活动只有 2px | `src/client.cjs:259`、`:295` |
| b | 空间大量空着：日视图泳道被拉高去填视口；全部模式每天一行约 160–310px，`MAX_VISIBLE_TIMELINE_DAYS = 3`，面板里还有一层内部滚动 | `timelineLayout` `:101`，`:176-181`、`:228-229` |
| c | 网格比数据还显眼：48 列每列一条 `border-right`，和色块一样重 | `.dss-cell`、`.dss-day-lane-cell`（`client-styles.cjs`） |
| d | 刻度对不上时间：9 个刻度平分 9 列，轨道却是 48 列，"3h"落在 16.7% 而不是 12.5%；窄屏挤成一串 | `src/client.cjs:224` |
| e | 合并柱读不准：全部模式把同一时段的多个项目叠成一根，柱高取最长那个项目 | `:294-304` |
| f | 顶部热度方块没有日期和刻度，只能逐个悬停；它用的 `showTip` 还带一个 `--dsw-*` 内联颜色 | `:207-218`、`showTip` `:861` |
| g | 和会话、费用脱节：没有 Token 和费用，不能从时间线打开会话；提示只响应鼠标 | 整个 `TimelineView` |
| h | 全部模式左边最多列 5 个项目名，第 6 个起只剩"+N 项目"，颜色对不上项目 | `:284-288` |
| i | 时间线标签页的"筛选项目"拿到的是 `statProjects`（按日时只含有 Token 的项目），只有工具活动的项目无法隐藏 | `src/client.cjs:805` |
| j | 顶部常驻一行 `hint.timeline.day/all` 文字解释怎么读图 | `:184` |

## 2. 目标与非目标

### 目标

1. 按日：一眼看到当天几点在做什么、每个项目做了多久、每半小时花了多少钱，并能从任意时段直接打开会话。
2. 全部：一屏看完 30 天的作息分布，空日期也占位，能看出连续性和周节律。
3. 时间线没有内部滚动，面板只有 `.dss-body` 一个滚动容器（沿用切片 3 的单一滚动断言）。
4. 所有交互键盘可达：tooltip 跟随焦点出现，时段明细是可聚焦的 `role=dialog`，Esc 按层关闭。
5. 费用口径和总览一致：按日的"当天费用"文本必须和总览 KPI 一模一样。

### 非目标

- 不改宿主、RPC schema、聚合口径、定价逻辑和价格目录。时间线所需数据宿主已经提供（见 §3）。
- 不新增依赖，不使用 primitives 的 Modal/Tooltip/Menu。
- 不改总览、趋势、余额的布局；只改 `OverviewTools` 在时间线标签页传入的项目列表和筛选值。
- 不做实时走动的"现在"线（只在渲染时取一次 `Date.now()`；数据刷新会重新渲染）。
- 不改 CSV/JSON 导出。

## 3. 数据与兼容约束

### 3.1 数据来源（全部现成）

| 用途 | 字段 | 说明 |
| --- | --- | --- |
| 项目泳道、矩阵格子、开发时长 | `timeline.days[].slotBlocks[{slot, projectId, name, colorIndex, ms}]` | `slot` 是当天北京时间 0–47。宿主已把同一项目的并发会话（含子对话）区间合并后再切片（`src/index.js` 中 timeline 构建处） |
| 会话行 | `session.slots[{slot, ms}]` | `slot` 是绝对槽号（`epochMs / SLOT_MS`），当天槽号 = `slot − dayStartMs(date) / SLOT_MS`。`applyDate` 已裁剪到当天 |
| 每半小时费用、Token | `session.slotUsage[]` | 每行有 `slot`（绝对槽号）、`uncached`、`cacheRead`、`cacheWrite`、`output`，以及宿主计价的 `cost`。用 `usageCostDetail(u, s.modelRaw \|\| s.model, s.providerId, s.accountType)` 计价 |
| 会话标题、子对话关系 | `session.title`（可为空，用 `w.untitled`）、`session.subagent`、`session.parentSession` | |

Token 口径和总览一致：`uncached + cacheRead + cacheWrite + output`（`output` 已含思考，不另加 `reasoning`）。

### 3.2 两种降级情况

- **会话没有 `slotUsage`**（老宿主或降级会话）：与 `applyWindow` 相同，整段费用 `sessionCostSummary(s)` 和 Token 只归到 `updatedAt ?? createdAt` 所在的那一天、那一个半小时。
- **本地近似模式**（`data.remote === false`，`buildTimeline` 生成）：`slotBlocks` 可能对同一项目同一槽有多条，需要先合并；会话没有 `slots`，因此泳道不提供展开，时段明细只列项目不列会话。

### 3.3 兼容

| 约束 | 要求 |
| --- | --- |
| Harness / React | 同上位文档 §3：用宿主注入的 React 18 和 `createElement`，不引入 JSX |
| 浏览器 | 不抬高上位文档 §3 的最低版本。**不要用 `color-mix()`**（需要 Chrome 111、Firefox 113），矩阵深浅用叠加层的 `opacity` 实现（§6.3）。`ResizeObserver` 可用，缺失时退回 48 列 |
| 时区 | 所有日期和时刻按北京时间（`+08:00`）计算，不用 `Date#getHours()` 这类本地时区方法。smoke 会在上海和洛杉矶两个时区比较 `.dss-body` 的 `innerText`（`scripts/browser-fixture-smoke.mjs:318-334`），时间线包括在内 |
| 偏好 | `dsh-stats.tab`、`hidden`、`nav` 不变；新增 `dsh-stats.timeline`（§7.3），旧版本没有这个键时取默认值 |
| 主题 | 深色是 CSS 回退值；浅色写在 `body:not([data-ds-dark-theme])` 下的 token 重定义里 |

## 4. 已锁定的设计决策

**T1 时间轴范围。** 默认"活跃时段"：从当天第一个可见活跃槽所在整点到最后一个活跃槽结束后的整点；不足 6 小时则以中点为中心扩到 6 小时，再夹在 00:00–24:00 内。可切到"全天"。选择存入偏好，切换日期时保持。

**T2 刻度与网格。** 刻度按真实时间定位，跨度 ≤6h 每 1h 一个，≤12h 每 2h，其余每 3h；首尾刻度贴边对齐（不居中）。网格只在整点画 1px 细线，3 的倍数小时画主线，窗口两端不画。窄屏（面板 ≤640px）隐藏奇数序号的刻度。当天是今天且"现在"落在窗口内时，画一条带"现在 HH:MM"标签的竖线。

**T3 柱图（保留费用柱）。** 每半小时一根柱，和泳道共用时间轴；可切换"费用 / Token"，存入偏好。
- 左侧写"当天费用"（或"当天 Token"），下面是当天合计。费用合计直接用总览 KPI 的同一个对象（`overviewTotals(visibleProjects).cost`），文本必须完全相同。
- 右侧写"峰值 HH:MM"，下面是这根柱的值。
- 柱高按窗口内最高的那根缩放，最低 3%；顶部一条虚线就是最高柱的高度。
- 含待计价用量的柱画成斜纹，tooltip 注明"部分待计价"。
- 每根柱的单位"半小时"写在图例和 tooltip 里，不写在标签上。

**T4 项目泳道。** 来自 `slotBlocks`，同一项目同一槽先合并，并夹到 30 分钟以内。
- 排序：当天时长降序，相同时按第一个活跃槽升序，再按项目 id。
- 连续的活跃槽合成一根条（run），每槽一节，透明度 `0.3 + 0.7 × min(1, ms / SLOT_MS)`；条最窄 4px。
- 行尾是该项目当天时长；标签里有颜色点、项目名和"N 会话"（只数主会话，面板 ≤860px 时隐藏）。
- 每页最多 50 条泳道，超过时用现有 `PageControls`（`data-pages="lanes"`）翻页。

**T5 会话行。** 点泳道左侧的箭头展开该项目当天的会话，每个会话一行，色条来自 `session.slots`。
- 主会话按第一个活跃槽排序；子对话紧跟在它的 `parentSession` 后面，缩进并带 `w.subagentTag`（"子对话"，沿用总览术语，不用原型里的"子代理"）；找不到父会话的子对话排在最后。
- 点标题调用 `onOpenSession(session)`，规则和总览一致：面板关闭，焦点交给宿主。
- 切换日期后，默认只展开第一条泳道。隐藏一个项目时，同时收起它。
- 本地近似模式（会话没有 `slots`）不显示箭头。
- 单条泳道的会话超过 50 个时，用 `PageControls`（`data-pages="tl-sessions"`）。

**T6 时段明细。** 点色条（按点击位置算出是哪一个半小时，键盘回车取条内第一个可见槽）或柱子，弹出这半小时的明细：
- 标题是"HH:MM–HH:MM"和"MM-DD 周X"，右上角是关闭按钮。
- 按项目分组，按时长降序，每组显示时长和费用；组内每个会话一行，显示时长、Token、费用，点击即打开会话。
- 最多列 20 个项目，每个项目最多 10 个会话，多出的写"另有 N 个项目 / 会话"。合计行包含全部项目，并在并行时写"N 个项目并行"。
- 打开期间，时间轴上用一条高亮带标出这半小时。
- 弹层是 `role=dialog`，打开时自身获得焦点，注册 `useLayer`。Esc 或关闭按钮会关闭它，并把焦点还给触发元素；触发元素已不在文档中时，交给 `.dss-tl-day`（`tabIndex=-1`）。
- 在弹层外的面板内按下指针时关闭，不还原焦点，和 `Popover` 的做法相同。
- 弹层放在 `.dss-tl-day` 内绝对定位，随内容滚动，不在滚动时关闭。这一点与原型不同，原型在滚动时关闭弹层。

**T7 当天摘要。** 只留"开发时长"和"活跃时段"，和时间轴、柱图两个切换放在同一行（窄时换行）。
- 活跃时段按槽粒度计算：第一个可见槽的开始到最后一个可见槽的结束，和总览指标条的算法相同。时间线包含无 Token 的项目，所以这里可能比总览指标条更宽，这是预期行为。
- 去掉会话、子代理、费用三项，也去掉原来右侧"时长 / 区间 / 项目数"一列。

**T8 全部模式分页。** 按日历分页，每页 30 天，最新在上。
- 日期范围从 `timeline.days` 的最早日期到 `max(今天, 最晚日期)`，没活动的日期也占一行。范围取自未筛选的 timeline，隐藏项目不改变分页边界。
- "只看活跃日期"勾选框默认不勾。勾选后只列有可见活动的日期，每页 30 个，并回到第 1 页。
- 分页条显示"第 X/Y 页"和"更新 / 更早 / 回到最新"三个按钮。

**T9 矩阵。** 一天一行：行高 14px，格子高 12px，因此行距和格距都是 2px。
- 周一到周日为一组，组与组之间多留 8px。
- 没活动的行和有活动的行同高，只是格子全灰、日期按钮禁用、时长显示"—"。
- 默认按"强度"着色：单一强调色分 4 档，占比 <25%、<50%、<75%、≥75%；并行项目的时长相加，按满格封顶。
- 可切换为"项目"着色：每格涂这段时间占比最高的项目颜色，同样分 4 档深浅。着色方式存入偏好。
- 面板 ≤640px 时每行 24 格，每格 1 小时。
- 今天的日期用强调色；"现在"所在的格子加描边。

**T10 全部模式摘要与辅助图。**
- 摘要依次是：范围（MM-DD 至 MM-DD，跨年时用完整日期）、活跃（"N / M 天"，勾选"只看活跃日期"后改为"活跃日 N 天"）、开发时长、日均（总时长 ÷ 活跃天数）、费用、最长连续天数。
- 最长连续天数按日历相邻计算，只看活跃日期时被跳过的日子同样断开。
- 矩阵上方是"时段分布"：把本页每列的时长累加，最高的一列加深，右侧写"高峰 HH:MM"。
- 每行右侧是每日条：长度按本页最长的一天缩放，按项目颜色分段，后面是当天时长。

**T11 跳转。** 点日期按钮切到按日并选中该日。点有活动的格子，除了切到该日，还会展开第一条泳道，并打开这个半小时的明细；每格 1 小时时取两个半小时里活跃时长更长的那个，相同取前一个。

**T12 筛选接线。** 时间线标签页的"筛选项目"列出 `dateProjects`，即当天（或全部历史）有任何活动的项目，包括只有工具活动的项目。条目右侧的值在这里显示开发时长，不显示费用：按日为当天时长，全部模式为全部历史时长。总览标签页不变。

**T13 单一滚动与图例。** 时间线内部不再有任何 `overflow` 滚动容器。删除顶部 `hint.timeline.*` 说明行，图例常驻底部：
- 按日：活跃比例色阶、"每节色条、每根柱 = 半小时"、"点色条或柱子查看这半小时的明细"。
- 全部："少 → 多"色阶（或项目颜色列表）、"每格 = 半小时 / 1 小时内的活跃时长，并行项目按满格计"、"点日期或格子进入当天"。

**T14 命名规则。** 时间线的类名一律以 `dss-tl-` 或 `dss-mx-` 开头。状态修饰符用 `is-*`，并且在 CSS 里只能和带前缀的类复合书写（`.dss-mx-row.is-idle`），不能单独成为选择器。原型里 `.mx-row.empty` 撞上通用的 `.empty{padding:40px 0}`，空日期行被撑到 80px，规则就是为了避免这类问题。§9.4 的样式测试会检查这一条。

## 5. 结构

### 5.1 按日

```text
div.dss-tl[data-mode=day]
  div.dss-tl-top
    div.dss-tl-sum                     开发时长 · 活跃时段（T7）
    div.dss-tl-ctl                     时间轴 [活跃时段|全天] · 柱图 [费用|Token]
  div.dss-tl-day[tabIndex=-1]          position:relative；--lw / --tw 两列宽
    div.dss-tl-lines[aria-hidden]      i[data-hour](.is-major) · span.dss-tl-band · b.dss-tl-now
    div.dss-tl-row.dss-tl-axis[aria-hidden]   空 | div.dss-tl-track > span.dss-tl-tick[data-slot] | 空
    div.dss-tl-row.dss-tl-hist
      div.dss-tl-hist-lab              span 当天费用 + b.dss-tl-hist-total
      div.dss-tl-track[role=group]     i.dss-tl-ref + button.dss-tl-bar[data-slot](.is-token .is-partial)
      div.dss-tl-peak                  span 峰值 HH:MM + b 值
    PageControls[data-pages=lanes]     仅当泳道 > 50
    div.dss-tl-row.dss-tl-lane[data-project-id](.is-open)
      div.dss-tl-lab                   button.dss-tl-chev[aria-expanded] · i.dss-pdot[data-color] · span.dss-tl-name · span.dss-tl-count
      div.dss-tl-track                 button.dss-tl-run[data-color][data-from][data-to] > i(style --o)…
      div.dss-tl-tot
    div.dss-tl-row.dss-tl-sess[data-session-id](.is-sub .is-last)
      div.dss-tl-lab                   button.dss-tl-sess-link > span.dss-tag(子对话) + span.dss-tl-name
      div.dss-tl-track                 button.dss-tl-run.is-thin …
      div.dss-tl-tot
    div.dss-tl-pop[role=dialog]        打开时（T6）
  div.dss-tl-legend
```

没有可见泳道时（例如当天的项目都被隐藏），`.dss-tl-day` 换成 `.dss-empty`：先写"这一天没有可见项目的活动。"，有隐藏项目时再跟一个"全部显示"按钮（`data-action=tl-show-all`，调用 `onShowAll`）。

### 5.2 全部

```text
div.dss-tl[data-mode=all]
  div.dss-tl-sum                       范围 · 活跃 · 开发时长 · 日均 · 费用 · 最长连续（T10）
  div.dss-tl-ctl                       着色 [强度|项目] · label.dss-tl-check > input#dss-tl-active-only · div.dss-tl-pager
  div.dss-mx(style --n: 48|24)
    div.dss-mx-row.is-head             div.dss-mx-k 时段分布 | div.dss-mx-prof > i(.is-peak) | div.dss-mx-side 高峰 HH:MM
    div.dss-mx-row.is-axis[aria-hidden]  空 | div.dss-mx-axis > span.dss-tl-tick | div.dss-mx-side 当日时长
    div.dss-mx-row.is-day[data-date](.is-idle .is-week)
      button.dss-mx-date[data-action=tl-goto-day][data-date](.is-weekend .is-today)   空日期 disabled
      div.dss-mx-cells[aria-hidden]    i[data-level=0..4][data-col](data-color)
      div.dss-mx-tot                   span.dss-mx-bar > span > i[data-color]… · span.dss-mx-dur
  div.dss-tl-legend
```

格子不可聚焦，键盘用户通过日期按钮进入当天。

`.is-week` 的规则：
- 加在与上一行不属于同一周的那一行，由它带上 8px 的上间距。
- 日期是倒序排列的，按日历分页时，这一行就是周日。所以间隔出现在周一和它下面的周日之间。

### 5.3 `data-action` 一览

`tl-axis-focus`、`tl-axis-full`、`tl-metric-cost`、`tl-metric-token`、`tl-bar`、`tl-slot`（色条）、`tl-lane`（箭头）、`tl-open-session`（会话行标题）、`tl-pop-close`、`tl-pop-session`、`tl-show-all`、`tl-color-level`、`tl-color-project`、`tl-active-only`、`tl-newer`、`tl-older`、`tl-latest`、`tl-goto-day`。切换类按钮用 `aria-pressed`。

## 6. 样式

### 6.1 新 token

在 `:where(.dss-overlay, .dss-trigger, .dss-tt)` 中定义（深色值），在 `body:not([data-ds-dark-theme]) :is(...)` 中覆盖（浅色值）：

| token | 深色 | 浅色 | 用途 |
| --- | --- | --- | --- |
| `--dss-tl-grid` | `#1c212a` | `#f0f2f5` | 整点细线 |
| `--dss-tl-grid-major` | `#272d38` | `#dfe3e8` | 3 小时主线、柱图虚线 |
| `--dss-tl-cell` | `#232933` | `#e8ebf0` | 矩阵空格底色 |
| `--dss-tl-bar-cost` | `#f08a3c` | `#e07b39` | 费用柱 |
| `--dss-tl-bar-token` | `#4f8cff` | `#5b8def` | Token 柱 |

其余颜色复用现有 token：`--dss-accent`、`--dss-accent-soft`、`--dss-accent-line`、`--dss-line`、`--dss-line-soft`、`--dss-text`/`-2`/`-3`、`--dss-panel`、`--dss-hover`、`--dss-cost`、`--dss-shadow-pop`。项目颜色用现有的 `[data-color='N']{--c:var(--dss-pN)}`，组件里只读 `var(--c)`。字号只用 `--dss-fs-xs/sm/md/lg`。

### 6.2 尺寸（取自原型）

| 部位 | 宽屏 | ≤860px | ≤640px |
| --- | --- | --- | --- |
| 日视图标签列 `--lw` / 合计列 `--tw` | 212px / 72px | 172px / 60px | 改为两行：标签与合计在上，轨道在下（`grid-template-areas: "lab tot" "trk trk"`） |
| 刻度行 | 22px | 同 | 20px，隐藏奇数刻度 |
| 柱图行 | 70px（轨道上留 10px） | 同 | 轨道 48px，标签与峰值改为单行 |
| 泳道行 / 色条 | 最小 36px / 18px 高，圆角 4px | 同 | 轨道 24px |
| 会话行 / 色条 | 最小 26px / 8px 高 | 同 | 轨道 14px |
| 矩阵日期列 `--dw` / 右列 `--rw` | 78px / 176px | 78px / 120px | 40px / 44px，隐藏星期和每日条 |
| 矩阵行 / 格子 / 周间距 | 14px / 12px / 8px | 同 | 同 |
| 时段分布 | 48px 高 | 同 | 同 |
| 时段明细宽度 | `min(360px, 100% − 16px)` | 同 | 同 |

断点一律用 `@container dss-panel (max-width: …)`，和现有样式一致。

### 6.3 矩阵深浅（不用 `color-mix`）

```css
.dss-mx-cells i{position:relative;border-radius:2px;background:var(--dss-tl-cell)}
.dss-mx-cells i::after{content:"";position:absolute;inset:0;border-radius:inherit;background:var(--c,var(--dss-accent));opacity:0}
.dss-mx-cells i[data-level="1"]::after{opacity:.26}
.dss-mx-cells i[data-level="2"]::after{opacity:.48}
.dss-mx-cells i[data-level="3"]::after{opacity:.72}
.dss-mx-cells i[data-level="4"]::after{opacity:1}
```

"强度"模式下格子不带 `data-color`，叠加层取 `--dss-accent`；"项目"模式下格子带主导项目的 `data-color`。图例色块用同样的结构。

### 6.4 删除

删除下列规则；合并选择器只删时间线那一半，例如 `.dss-model-list-viewport` 属于趋势页，必须保留：

`.dss-timeline-viewport`（含 `.scrollable` 和 `:hover`）、`.dss-timeline-limit`、`.dss-heat`、`.dss-hm`（含 `.has`）、`.dss-axis`、`.dss-hours*`、`.dss-day`、`.dss-day-*`（`projs`、`date`、`proj`、`dot`、`pname`、`more`、`info`、`lanes`、`lane`、`lane-label`、`lane-track`、`lane-cell`）、`.dss-day.day-mode*`、`.dss-track`、`.dss-cell`、`.dss-blk`、`.dss-blk-composite`、`.dss-blk-segment`，以及 `:root` 中的 `--dss-timeline-max-height`。

保留 `.dss-hm-lg*`（趋势热力图图例）和 `.dss-cell-sub`（总览表格）。`.dss-hint` 只在时间线使用，删除前先 `grep` 确认没有其他引用。

## 7. 模块、函数与文案

### 7.1 新增纯模块 `src/client-timeline-model.cjs`

不含 React、DOM 和存储。依赖 `client-format.cjs`（`SLOT_MS`、`usageCostDetail`、`summarizeCosts`、`mergeCostSummaries`、`sessionCostSummary`、`sessionExportUsages`）和 `client-data.cjs`（`localDayKey`，以及本片补导出的 `dayStartMs`）。

| 导出 | 输入 → 输出 | 规则 |
| --- | --- | --- |
| `TIMELINE_PAGE_DAYS = 30`、`TIMELINE_LANE_PAGE = 50`、`TIMELINE_SESSION_PAGE = 50`、`POP_PROJECTS = 20`、`POP_SESSIONS = 10` | 常量 | |
| `TIMELINE_PREF_DEFAULTS`、`normalizeTimelinePrefs(value)` | 任意值 → `{axis, metric, color, activeOnly}` | 逐字段校验：`axis ∈ focus/full`，`metric ∈ cost/token`，`color ∈ level/project`，`activeOnly` 必须是布尔值；不合法的字段取默认值 `focus / cost / level / false` |
| `addDays(date, n)`、`weekOf(date)` | `YYYY-MM-DD` | `weekOf = floor((Date.parse(date + "T00:00:00Z") / 864e5 + 3) / 7)`，周一开始 |
| `calendarDates(days, today)` | timeline.days、今天 → 升序日期数组 | 从最早日期到 `max(today, 最晚日期)`，逐日补齐；没有数据时返回 `[]` |
| `projectSlotMs(day, hidden)` | 某天 → `Map<projectId, {projectId, name, colorIndex, ms[48]}>` | 合并同一项目同一槽，每槽夹到 `SLOT_MS`，并跳过隐藏项目和越界槽 |
| `projectDurations(days, hidden)` | 若干天 → `Map<projectId, ms>` | 供筛选条目显示时长（T12） |
| `timelineWindow(first, last, axis)` | 首末活跃槽 → `{start, end}`（槽） | 见 T1：`start = floor(first/2)*2`，`end = ceil((last+1)/2)*2`，不足 12 槽时居中扩到 12 槽并夹在 0–48；`full` 或无活动时返回 `{0, 48}` |
| `timelineTicks(win)`、`timelineGrid(win)` | 窗口 → 刻度 `{slot, label, edge, odd}[]`、网格 `{hour, major}[]` | 见 T2 |
| `timelineRuns(ms, win)` | 每槽毫秒数组 → `{from, to, total, segments[{slot, opacity}]}[]` | 连续非零槽合成一段，裁剪到窗口，完全在窗口外的丢弃；`opacity` 保留 2 位小数 |
| `runSlotAt(run, fraction)` | 点击位置比例 → 槽 | `from + floor(fraction × (to − from))`，并夹在 `[from, to − 1]` 内 |
| `sessionDaySlots(session, date)` | 会话 → `{ms[48], usage: Map<slot, {tokens, details[], summaries[]}>}` | `ms` 来自 `slots`；有 `slotUsage` 时逐行放入 `details`，没有时把 `sessionCostSummary(s)` 和会话 Token 放入 `updatedAt ?? createdAt` 所在的槽（不在当天则丢弃） |
| `timelineDayModel({day, projects, hidden, date, colorIndexes})` | 某天 → `{lanes, total, first, last, slotCost[48], slotTokens[48], slotPartial[48], hasSessions}` | 泳道见 T4，会话见 T5。`projects` 是 `applyDate` 后的 `dateProjects`，模型内部按 `hidden` 过滤。每槽费用是 `mergeCostSummaries([summarizeCosts(details), ...summaries])`；柱的数值取其中 CNY 合计，`status` 为 `partial`、或有 `unpricedTokens` 时记为 partial |
| `timelinePeak(values, win)` | → `{slot, value}` 或 `null` | 窗口内最大值，相同时取最早的槽 |
| `timelineSlotDetail(model, slot)` | → `{projects[], moreProjects, total: {ms, tokens, cost}, parallel}` | 见 T6；`cost` 是 summary，用 `fmtCostSummary` 显示 |
| `dayCostSummaries(projects, hidden)` | 全量项目 → `Map<date, summary>` | 对每个可见会话：有 `slotUsage` 时按 `localDayKey(u.slot * SLOT_MS)` 分天，每个"会话 × 天"先 `summarizeCosts`；没有时整段 `sessionCostSummary(s)` 归到 `updatedAt ?? createdAt` 那天。最后每天 `mergeCostSummaries`。只遍历一次，用 `useMemo` 缓存 |
| `timelineRangeModel({days, hidden, today, page, activeOnly, columns, dayCosts})` | → `{rows, pageCount, currentPage, profile, peak, maxDay, summary}` | 见 T8–T10。`rows` 最新在上；行字段为 `date`、`idle`、`newWeek`、`weekend`、`today`、`cells[{level, dominant, by, ms}]`、`total`、`projects[]`、`cost`。`dominant` 取 `ms` 最大的项目，相同时按项目 id 排序取第一个。`page` 越界时夹到最后一页 |
| `timelineJumpSlot(day, hidden, col, per)` | → 当天槽号 | 见 T11 |

### 7.2 新增组件文件 `src/client-timeline.cjs`

| 组件 | 职责 |
| --- | --- |
| `TimelineView(props)` | 入口。`date` 为 `null` 时渲染 `TimelineRange`，否则渲染 `TimelineDay`。持有跳转状态 `jump = {date, slot, nonce}`：矩阵格子点击时先 `setJump`，再调用 `props.onSelectDate(date)`；`TimelineDay` 在 `jump.date === date` 时消费并清空它 |
| `TimelineDay` | 用 `useMemo` 计算 `timelineDayModel`，持有展开集合、泳道页码和弹层状态。泳道页码在日期、隐藏集合变化时归零。柱图组用 roving tabindex：只有一根柱 `tabIndex=0`（默认峰值柱），←/→ 移动，Home/End 跳到两端，Enter/Space 打开明细 |
| `SlotPopover` | T6。定位：以触发元素（或高亮带）在 `.dss-tl-day` 中的位置为锚点，默认在下方 12px，越过 `.dss-body` 可视区底部且上方放得下时翻到上方；水平夹在 `.dss-tl-day` 内左右各留 8px。挂载后用 `useLayoutEffect` 测量自身尺寸再定位 |
| `TimelineRange` | 持有页码；`activeOnly` 改变或从按日切回全部时页码归零，隐藏集合变化时把页码夹到有效范围，数据刷新不重置。列数来自 `useTimelineColumns(ref)`：用 `ResizeObserver` 观察 `.dss-panel` 宽度，≤640px 为 24 列，其余为 48 列；不支持时固定 48 列 |
| `tipProps(getHtml)` | 返回 `onMouseEnter`、`onMouseMove`、`onMouseLeave`、`onFocus`、`onBlur`。鼠标事件用指针坐标，焦点事件用元素底边中点，调用现有的 `showTipRaw(tipRows(...), point)` 和 `hideTip()`。弹层打开时先 `hideTip()` |

可访问性：

- 色条和柱子的 `aria-label` 写全时间、项目（或数值），结尾是"，查看明细"。
- 日期按钮的 `aria-label` 是"YYYY-MM-DD 周X，开发 Xh Ym，查看当天"；空日期为"…，没有活动"，并且 `disabled`。
- 时段分布的 `aria-label` 写出高峰时段。
- 刻度行、网格和矩阵格子都设 `aria-hidden`。

### 7.3 `src/client.cjs` 的改动

1. `StatsPanel` 在早退之前加入：
   ```js
   var timelinePair = usePref("timeline", TIMELINE_PREF_DEFAULTS);
   var timelinePrefs = normalizeTimelinePrefs(timelinePair[0]);
   ```
   写入时总是保存完整对象。
2. `OverviewTools` 的参数：
   - `projects: tab === "timeline" ? dateProjects : statProjects`；
   - 时间线标签页额外传 `valueOf`：返回 `fmtDuration(durations.get(project.id) || 0)`，没有时长时返回"—"。`durations` 按日取 `projectDurations([当天])`，全部模式取 `projectDurations(data.timeline.days)`。
3. 替换 `TimelineView` 的调用，传入：
   - 数据：`timeline: data.timeline`、`date: effectiveDate`、`projects: dateProjects`、`allProjects: data.projects`；
   - 筛选与颜色：`hidden`、`hiddenKey`、`colorIndexes`；
   - 当天合计：`dayCost: totals.cost`、`dayTokens: totals.input + totals.output`；
   - 偏好：`prefs: timelinePrefs`、`setPrefs`；
   - 回调：`onSelectDate: function(date) { setNav({ mode: "day", date: date }); }`、`onOpenSession`、`onShowAll: showAll`；
   - 其他：`remote: data.remote`、`t`。
4. 删除旧实现：
   - `TimelineView`（:152–315）、`slotToClock`、`groupTimelineBlocks`、`timelineLayout`、`timelineDisplayDays`、`timelinePageDays`、`timelineTipRows`、`TIMELINE_PAGE_DAYS`、`showTimelineBlocksTip`；
   - `showTip`（:861，只被旧热度方块使用；`hideTip` 保留，趋势页还在用）；
   - `viewTimeline` 这个 memo；
   - `MAX_VISIBLE_TIMELINE_DAYS` 的导入，以及它在 `client-format.cjs` 的定义和导出；
   - `__test` 导出中的 4 个旧函数。

### 7.4 `ProjectFilterMenu` 的改动（`src/client-overview.cjs`）

新增可选参数 `valueOf(project)`。传入时，条目右侧显示它的返回值，类名为 `.dss-filter-val`（中性色）；不传时仍显示费用，类名为 `.dss-filter-cost`，和现在一样。`OverviewTools` 只负责透传这个参数。

### 7.5 文案（`src/client-locale.cjs`，中英同时加）

| 键 | 中文 | English |
| --- | --- | --- |
| `tl.axis` / `tl.axisFocus` / `tl.axisFull` | 时间轴 / 活跃时段 / 全天 | Axis / Active hours / Full day |
| `tl.metric` / `tl.metricCost` / `tl.metricToken` | 柱图 / 费用 / Token | Bars / Cost / Tokens |
| `tl.dayCost` / `tl.dayToken` | 当天费用 / 当天 Token | Day cost / Day tokens |
| `tl.peak` | 峰值 %s | Peak %s |
| `tl.now` | 现在 %s | Now %s |
| `tl.sessions` | %d 会话 | %d sessions |
| `tl.expand` / `tl.collapse` | 展开 %s 的会话 / 收起 %s 的会话 | Show sessions for %s / Hide sessions for %s |
| `tl.partial` | 部分待计价 | Partly unpriced |
| `tl.active` | 活跃 %s | Active %s |
| `tl.openDetail` | 查看明细 | Show details |
| `tl.legendShare` / `tl.legendFull` | 活跃比例 / 满 30 分钟 | Active share / Full 30 min |
| `tl.legendUnit` / `tl.legendClick` | 每节色条、每根柱 = 半小时 / 点色条或柱子查看这半小时的明细 | Each segment and bar = 30 min / Click a segment or bar for that half hour |
| `tl.emptyVisible` | 这一天没有可见项目的活动。 | No visible project activity on this day. |
| `tl.detail` / `tl.closeDetail` | %s 明细 / 关闭明细 | %s details / Close details |
| `tl.total` / `tl.parallel` | 合计 / %d 个项目并行 | Total / %d projects in parallel |
| `tl.moreProjects` / `tl.moreSessions` | 另有 %d 个项目 / 另有 %d 个会话 | %d more projects / %d more sessions |
| `tl.range` / `tl.rangeValue` | 范围 / %s 至 %s | Range / %s to %s |
| `tl.activeOf` / `tl.activeDays` / `tl.days` | 活跃 / 活跃日 / %d 天 | Active / Active days / %d days |
| `tl.avg` / `tl.cost` / `tl.streak` | 日均 / 费用 / 最长连续 | Daily avg / Cost / Longest streak |
| `tl.color` / `tl.colorLevel` / `tl.colorProject` | 着色 / 强度 / 项目 | Color / Intensity / Project |
| `tl.activeOnly` | 只看活跃日期 | Active dates only |
| `tl.profile` / `tl.profilePeak` / `tl.dayTotal` | 时段分布 / 高峰 %s / 当日时长 | Time of day / Peak %s / Day total |
| `tl.cellUnit` | 每格 = %s内的活跃时长，并行项目按满格计 | Each cell = active time in %s; parallel projects cap at full |
| `tl.halfHour` / `tl.hour` | 半小时 / 1 小时 | 30 min / 1 hour |
| `tl.cellDominant` | 每格取占比最高的项目 | Each cell shows the top project |
| `tl.clickDate` | 点日期或格子进入当天 | Click a date or cell to open that day |
| `tl.noActivity` / `tl.openDay` | 没有活动 / 开发 %s，查看当天 | No activity / %s of work, open day |

复用：`w.duration`（开发时长）、`strip.span`（活跃时段）、`w.subagentTag`（子对话）、`w.untitled`、`w.weekdays`、`w.dayPrefix`、`trends.less` / `trends.more`、`hint.timeline.page` / `newer` / `older` / `showRecent`（分页条）、`hint.rangeEmpty`（没有任何数据时）。

删除：`hint.timeline.day`、`hint.timeline.all`。

## 8. 切片计划

### 切片 4a：时间线视图模型

1. 新建 `src/client-timeline-model.cjs`（§7.1），并从 `client-data.cjs` 补导出 `dayStartMs`。
2. 新建 `tests/timeline-model.test.js`，至少覆盖：
   - `normalizeTimelinePrefs`：非法值逐字段回退；
   - `weekOf`：2026-10-12（周一）到 2026-10-18（周日）同组，10-19 进入下一组；
   - `calendarDates`：补齐空日期，延伸到今天，空输入；
   - `timelineWindow`：活跃 2 分钟时扩到 6 小时；贴近 0 点或 24 点时不越界；按整点对齐；`full`；
   - `timelineTicks`：三档步长和首尾标记；`timelineGrid` 不含两端、主线在 3 的倍数小时；
   - `timelineRuns`：合并连续槽、透明度公式、裁剪到窗口、丢弃窗口外；`runSlotAt` 的边界；
   - `projectSlotMs`：本地近似模式下的重复槽合并后封顶 30 分钟，跳过隐藏项目；
   - `timelineDayModel`：
     - 泳道排序（时长、首槽、id）；
     - 子对话排在父会话后；孤儿子对话排最后；
     - `mainCount` 只数主会话；
     - 没有 `slots` 时 `hasSessions === false`；
     - 每槽 Token 求和；partial 标记；
   - 每槽费用加总（CNY）与 `cnyAmount(overviewTotals(applyDate(...)).cost)` 的差小于 `1e-9`，用 estimated 夹具；
   - `dayCostSummaries`：对 estimated、partial、unsupported 三套夹具（可复用 `tests/` 里已有的会话构造方式）的每个日期，`fmtCostSummary(dayCosts.get(d))` 都等于 `fmtCostSummary(overviewTotals(applyDate(projects, d).filter(hasTokenUsage)).cost)`；隐藏一个项目后仍相等；
   - `timelineRangeModel`：
     - 4 档阈值；并行封顶；`dominant` 平局规则；
     - 24 列合并；
     - 时段分布峰值；
     - 最新在上的分页切片，页码越界时夹紧；
     - `idle` 行；
     - `newWeek`：按日历分页时只出现在周日行；只看活跃日期时出现在跨周后的第一行；
     - `activeOnly` 下跨过空日期时连续天数断开；
   - `timelineJumpSlot`：`per` 为 1 和 2；两个半小时相同时取前一个。
3. 本片不改任何 UI。`lib/` 只会因 `dayStartMs` 导出而变化，照常构建后提交。

验收：§10 门禁通过；`TZ=UTC npm test` 与默认时区结果一致。

### 切片 4b：按日视图

1. 新建 `src/client-timeline.cjs`，实现 `TimelineView` 入口、`TimelineDay`、`SlotPopover`、`tipProps`（§7.2）。
2. 实现 T1–T7、T12、T13（按日部分）和 T14 的样式（§6），加入 §7.5 中按日用到的文案。
3. 按 §7.3 改 `StatsPanel`，按 §7.4 改 `ProjectFilterMenu`。
4. 全部模式暂时保持旧实现：把旧 `TimelineView` 里全部模式的分支原样移到 `client.cjs` 的 `LegacyTimelineAll`，删除其中按日的分支和 `.dss-day.day-mode*`、`.dss-day-lane*`、`.dss-day-info` 的样式。新的 `TimelineView` 在 `date == null` 时渲染 `LegacyTimelineAll`。这是到 4c 为止的过渡状态。
5. 按 §9.2 迁移按日相关的 smoke，加入 §9.3 的第 1–9 条。

验收：
- 默认场景（estimated 夹具，今天）下，柱图标签的合计文本等于同一天总览 KPI 的文本；partial 夹具下两边都带 `*`。
- 当天只有 1 分钟活动的项目，色条宽度 ≥4px。
- 时段明细打开后可以打开会话，打开后面板关闭，焦点不回到触发器。
- 键盘：Tab 能到达柱图组和色条；Esc 先关时段明细，再按一次才关面板。

### 切片 4c：全部模式矩阵

1. 实现 `TimelineRange` 和 T8–T11、T13（全部部分）。
2. 删除 `LegacyTimelineAll`、§6.4 的其余样式、`hint.timeline.day/all`，并删除或改写 `tests/pure.test.js:631-667` 的旧时间线测试（逻辑已被 4a 的测试覆盖）。
3. 按 §9.2 迁移分页相关的 smoke，加入 §9.3 的第 10–17 条，更新 `report.checks` 的文字（§9.2 最后一行）。

验收：
- 大数据集的 75 个日历日都能翻到、不重复，每页最多 30 行。
- 隐藏 `large-0` 后出现空日期行，空行与有活动的行同高，周间距只出现在周一和它下面的周日之间。
- 点格子跳到当天并打开该时段明细。
- 时间线两种模式下，面板内都只有 `.dss-body` 一个滚动容器。

### 切片 4d：文档与截图

1. 从 CI 的 `browser-results` 取 1440px 中文的时间线截图（按日与全部各一张），更新 `docs/images/timeline.png`。如需两张，加 `docs/images/timeline-all.png`。三份 README 的时间线说明（`README.md:103-108` 及中英文对应段落）改为新的读法。截图来自夹具数据，不含真实路径。
2. 更新 `DESIGN.md` 中提到"时间线在 0.5.x 重做"的两处（:16、:256），改为描述现状。
3. 发布说明：默认写进 `docs/release-0.5.0.md`，因为 0.5.0 尚未打 tag。维护者如果决定先发 0.5.0，就改写到下一版的发布说明。
4. 在 `docs/ui-overhaul-0.5.0.md` 的切片 4 条目下注明"已完成"，并附上提交哈希。
5. 在 DSH 桌面端由维护者部署后做真实验证，深浅两种主题都要看：按日与全部切换、时段明细打开会话、Esc 顺序、窄窗口。

## 9. 对照与迁移

### 9.1 信息对照（不丢信息）

| 现有 | 新位置 |
| --- | --- |
| 顶部热度方块（每日时长） | 矩阵每行右侧的每日条和"当日时长" |
| `hint.timeline.day/all` | 底部图例 |
| 右侧信息列：总时长 | 按日：摘要"开发时长"；全部：每行"当日时长" |
| 右侧信息列：活动时段 | 按日：摘要"活跃时段" |
| 右侧信息列：项目数 | 按日：泳道行数；全部：每日条的分段与 tooltip |
| 全部模式左侧项目名列表（最多 5 个） | 每日条 tooltip 列出全部项目（最多 8 个，其余合并为"另有 N 个"） |
| 悬停块看各项目时长 | 色条和格子的 tooltip（键盘可达），以及时段明细 |
| 按日泳道 | 保留，并新增会话行、费用柱 |

### 9.2 smoke 选择器迁移（`scripts/browser-fixture-smoke.mjs`）

| 现有 | 新 |
| --- | --- |
| `:263` `until(".dss-timeline-viewport")` | `until(".dss-tl")` |
| `:823` `until(".dss-timeline-limit")` | `until(".dss-tl-pager")` |
| `:824`、`:827`、`:835` `.dss-day` 的 `id` | `.dss-mx-row.is-day` 的 `dataset.date` |
| `.dss-timeline-limit button:nth-of-type(2)`（更早） | `[data-action=tl-older]` |
| `.dss-timeline-limit button:nth-of-type(1)`（更新） | `[data-action=tl-newer]` |
| `.dss-timeline-limit button:last-child`（回到最新） | `[data-action=tl-latest]` |
| `:838` 切到按日后分页条消失 | 不变（按日没有 `.dss-tl-pager`） |
| `:841` 切回全部后回到第一页 | 不变，改用 `[data-action=tl-newer]` 的 `disabled` |
| `:885`、`:890` `.dss-timeline-viewport`、`.dss-day.day-mode` | `.dss-tl[data-mode=all]`、`.dss-tl[data-mode=day]` |
| `:888-892` 按日与全部视口同高 | 删除（不再有视口）；`:886-887` 面板同高的断言保留 |
| `:896` `report.checks` 中的 "day/all timeline viewports share height" | 改为 "timeline calendar pages, idle rows and week gaps, slot details" |

### 9.3 新增 smoke 断言

按日（4b）：

1. **单一滚动**：时间线按日时，沿用 `:668` 的扫描，结果只能是 `['dss-body']`（打开的时段明细和筛选弹层豁免）。
2. **字号**：时间线按日时，`.dss-overlay` 内所有直接文本 ≥11px。
3. **费用一致**：estimated 夹具当天，`.dss-tl-hist-total` 的文本等于总览 `.dss-kpi.cost .dss-kpi-v` 的文本；partial 夹具再比一次。
4. **刻度对齐**：每个非首尾的 `.dss-tl-tick`，中心 x 与同一小时的 `.dss-tl-lines i[data-hour]` 相差 ≤1px。
5. **最小宽度**：所有 `.dss-tl-run` 宽度 ≥3.5px。
6. **明细**：点击第一个 `.dss-tl-run` 后出现 `.dss-tl-pop[role=dialog]`，焦点在弹层内；按 Esc 后弹层消失、面板仍在，焦点回到该色条；再按 Esc 面板关闭。
7. **打开会话**：再次打开面板和明细，点 `[data-action=tl-pop-session]`，断言 `window.__fixture.openedSession` 是该会话，面板已关闭。
8. **筛选**：时间线按日时，筛选弹层里的 `.dss-filter-item` 集合，等于夹具当天 `slotBlocks` 中的项目 id 集合。隐藏一个项目后，对应泳道消失，柱图合计与总览 KPI 仍然相等。
9. **偏好**：切到"全天"和"Token"后重开面板，两个切换仍是 `aria-pressed=true`。
10. **泳道分页**：大数据集今天有 120 个项目，用 `collectPages('lanes', '.dss-tl-lane', 'node.dataset.projectId')` 收集到 120 个不重复的 id，每页 ≤50 条。

全部模式（4c）：

11. **单一滚动与字号**：全部模式下重复第 1、2 条。
12. **日历分页**：沿用 `:823-842` 的流程，75 个日期都能翻到、不重复，每页 ≤30 行。
13. **空行**：隐藏 `large-0` 后，第一页的 `.dss-mx-row.is-day.is-idle` 有 29 行，它们的 `getBoundingClientRect().height` 都等于今天那一行（相差 ≤0.5px），日期按钮全部 `disabled`。
14. **周间距**：相邻两行的顶部间距只有两种取值。日期 `weekOf` 不同的一对，比同周的一对多 8px（±1px）。
15. **只看活跃日期**：在第 14 条的状态下勾选 `#dss-tl-active-only`，只剩 1 行，页码回到"第 1/1 页"；取消勾选后恢复 75 天的分页。
16. **列数**：1440px 时每行 `.dss-mx-cells` 有 48 个子元素，390px 和 320px 时有 24 个。
17. **跳转**：点今天那一行第一个 `[data-level]:not([data-level="0"])` 格子，断言模式变为按日、日期标签是今天、`.dss-tl-pop` 已打开，并且第一条泳道 `aria-expanded=true`。

两个时区的 `innerText` 比较（`:318-334`）不用改，它会自动覆盖新时间线。如果比较失败，说明有代码用了本地时区。

### 9.4 新增单测（样式与接线）

- `tests/styles.test.js`：任何选择器都不能以单独的 `.is-` 类开头；`.is-*` 必须紧跟在一个 `.dss-` 类之后（T14）。CSS 中不得出现 `color-mix(`。
- 新建 `tests/timeline-view.test.js`，按 `tests/strip.test.js` 的方式用 `renderToStaticMarkup` 渲染静态结构：
  - `TimelineDay`：`.dss-tl-hist-total` 的文本等于 `fmtCostSummary(dayCost)`；没有 `slots` 时不渲染 `.dss-tl-chev`；所有项目都隐藏时渲染 `.dss-empty` 和 `[data-action=tl-show-all]`。
  - `TimelineRange`：空日期行带 `is-idle`，其日期按钮带 `disabled`；`is-week` 的位置与 `weekOf` 一致；中英文案都没有漏键。
  - 静态渲染不会执行 effect。因此 `useTimelineColumns` 用 `useEffect`，不用 `useLayoutEffect`（React 18 在服务端渲染时会对后者告警）。`useLayoutEffect` 只留在弹层打开后才挂载的 `SlotPopover` 里。
- `ProjectFilterMenu` 的 `valueOf` 由 smoke 第 8 条覆盖，因为弹层只有打开后才会渲染条目，静态渲染看不到。

## 10. 门禁

沿用上位文档 §10：

```bash
npm test
TZ=UTC npm test
npm run build && git diff --exit-code -- lib   # 构建产物与提交一致
node --check lib/*.js
npm pack --dry-run
```

- 浏览器 smoke 以 CI 为准。用 `gh run download <run-id> -n browser-results` 下载截图，逐张检查时间线的深色、浅色和窄屏截图，至少看 `desktop-*-timeline`、`mobile-*-timeline`、`narrow-*-timeline` 和 `large-pages-*`。
- 价格机器人会推送 main：推送前先 `git pull --rebase origin main`；`lib/` 冲突时不要手工合并，重新 `npm run build` 后 `git add lib` 再继续 rebase，然后重跑门禁。
- 已知环境问题：`tests/pricing-delivery.test.js:52` 在慢沙箱里可能超时，以 CI 为准，不要在本切片里修改它。

## 11. 风险与对策

| # | 风险 | 对策 |
| --- | --- | --- |
| R1 | 柱图合计与总览 KPI 因浮点或口径差异对不上 | 合计直接用总览 KPI 的同一个 summary 对象；每槽求和只用于柱高，单测用 `1e-9` 容差核对；smoke 第 3 条比对文本 |
| R2 | 大数据集挂载过多节点 | 泳道每页 50 条，会话每泳道 50 个，时段明细 20 个项目 × 10 个会话，矩阵每页 30 × 48 格；矩阵格子不挂事件监听，在 `.dss-mx-cells` 上委托处理点击 |
| R3 | 通用类名撞车，复现 80px 空行问题 | T14 命名规则加样式单测；smoke 第 13 条直接量行高 |
| R4 | `color-mix` 不被旧浏览器支持 | 用叠加层的 `opacity`（§6.3），样式单测禁止 `color-mix(` |
| R5 | `ResizeObserver` 缺失或初始宽度为 0 | 缺失时固定 48 列；宽度为 0 时保持上一次的列数 |
| R6 | 触屏没有悬停，tooltip 看不到 | 所有信息都能在时段明细里看到；点击总是打开明细 |
| R7 | 本地近似模式没有 `slots` 和逐槽用量 | 泳道不提供展开；费用归到 `updatedAt` 所在槽；两个时区的 smoke 用 `stats=error` 覆盖这种模式 |
| R8 | 跨午夜的会话被算两次 | 只用 `applyDate` 裁剪后的会话；`dayCostSummaries` 按用量行所在日期归属，单测比对 `applyDate` 的结果 |
| R9 | 时段明细在滚动容器内被裁切或遮挡 | 放在 `.dss-tl-day` 内随内容滚动；越过可视区底部时翻到上方；最大高度 `min(420px, .dss-body 高度 − 24px)`，内部滚动，单一滚动断言豁免它 |
| R10 | 时段明细和筛选弹层同时打开时 Esc 顺序混乱 | 两者都注册 `useLayer`，在面板内按下指针会关闭另一个；smoke 第 6 条验证顺序 |
| R11 | 柱图组的 roving tabindex 在切换指标或窗口后指向不存在的柱子 | 当前柱子不在窗口内或数值为 0 时，回到峰值柱；都没有时整组不可聚焦 |
| R12 | 页码在隐藏项目或勾选后越界 | 模型层夹紧页码（4a 单测），组件只保存原始页码 |

## 12. 待定事项与默认值

以下各项先按默认值实施，评审时可以再调整，都不阻塞开工：

| 事项 | 默认 |
| --- | --- |
| 活跃时段最小跨度 | 6 小时 |
| 每页天数 / 泳道 / 会话 | 30 / 50 / 50 |
| 时段明细上限 | 20 个项目，每个项目 10 个会话 |
| 偏好默认 | 活跃时段 · 费用 · 强度 · 不勾选"只看活跃日期" |
| 全部模式筛选条目的时长 | 全部历史时长（原型写的是"本页时长"；按页统计需要把页码提升到 `StatsPanel`，暂不做） |
| 默认展开 | 第一条泳道 |
| "现在"线 | 渲染时取一次，不开定时器 |
| 发布归属 | 并入 0.5.0 发布说明（尚未打 tag）；由维护者在发布前确认 |
