# DSH 项目统计插件 — 集成设计文档

> 目标：把独立面板（`~/Desktop/dsh-stats-dashboard`）的「项目级 Token 统计 + 每日开发时间线」
> 集成进 DSH Web 侧边栏，作为官方风格插件。
>
> 状态：**✅ 已实施（Tier 1 + Tier 2 + 成本计算 + 打磨）**，运行中面板显示「精确（宿主）」。
> 实施中踩坑与修正见 README.md「数据流（Tier 2）」；本节保留原始设计。

---

## 实施结果摘要（2026-08）

- **Tier 1（纯客户端）**：`sidebar.footer.action` + `shell.overlay` 挂载，读 `useSessions`/`useWorkspaces` 投影值聚合。
- **Tier 2（宿主 RPC）**：`StatsService`（`@Remote("aggregate")` + `./typert` manifest）读 `~/.dsh` 落盘数据，
  客户端内联描述符 + `ctx.remote.$mount` + `ctx.inject` 子 ctx 访问 `remote.stats`。
- **成本**：DeepSeek 官方定价（8.17 前 / 8.17 后峰谷），按会话模型自动计价，峰谷按 30 分钟槽实际时段。
- **打磨**：localStorage 持久化、列排序、CSV/JSON 导出、图例过滤。

---

## 1. 结论（已确认的架构事实）

| 事实 | 出处 |
|---|---|
| 客户端三栏 shell：`sidebar` / `conversation` / `details` + `shell.overlay`(list) | `dsh-client-ui-layout/lib/client.js` L405 |
| 侧边栏子槽：`sidebar.workspaces`(single) / `sidebar.settings`(single) / `sidebar.footer.action`(**list**) | `dsh-client-ui-sidebar/lib/client.js` L265 |
| 客户端已能拿到每会话投影：`tokenUsage` + `sessionStats` + `title` + `sessionListMetadata` | `dsh-client-connection/lib/client.js` `projectionValuesOf()` L7610 |
| 客户端读数据/投影：`ctx.sessions`、`ctx.workspaces`、`binding(id).session.projections.faceOf("tokenUsage")` | `dsh-client-ui-goal/lib/client.js` L392 |
| 客户端注册 slot：`ctx.slots.inject("父槽", () => ctx.slots.register({name,id,locale,inject}, Comp))` | 同上 L387 / L410 |
| 客户端调用自定义 RPC：注入 `"remote"` + `"remote.<ns>"`，`ctx.remote.<ns>.<method>()` | 同上 L369 / L419 |
| 宿主自定义 RPC（Typert）：Service 方法标 `@typert` → 生成 `typert.host.js`(TYPERT) + `typert.remote-client.js`(TYPERT_REMOTE) | `dsh-commands/lib/typert.host.js` |
| 根作用域 remote（无 agent wire）：`invocation:{kind:'direct'}`、无 `scope` | `dsh-host-plugin-inventory/lib/typert.host.js` |
| 宿主数据服务：`ctx.sessions` / `ctx.workspaceRegistry` / `ctx.sessionPersistence` / `ctx.sessionProjections` / `ctx.tokenMeter` | `dsh-workspace` / `dsh-session-query` / `dsh-token-meter` |
| 出站插件安装：profile 的 `dsh.profile.bundles` + `cordis.patch.yml`；`dsh plugin --profile web <pnpm args>` | `@deepseek-ai/dsh/README.md` |

**核心判断**：
- 「项目总览」= **纯客户端**即可（`session.list` 的 `projectionValues` 已含全部聚合值）。
- 「30 分钟粒度时间线」= 需要**宿主 RPC**（客户端拿不到逐事件时间戳）。
- 因此分两档（Tier 1 / Tier 2），UI 组件完全复用。

---

## 2. 总体架构

```
┌─ 客户端插件 (client.js) ────────────────────────────────┐
│  sidebar.footer.action  →  StatsTrigger（统计按钮）        │
│  shell.overlay          →  StatsPanel（全屏浮层）          │
│     ├─ OverviewTab（项目总览表 + 汇总卡 + 会话明细）        │
│     └─ TimelineTab（每日热力条 + 30min 槽块时间线）         │
│  数据获取：                                              │
│     Tier1: ctx.workspaces + ctx.sessions(projectionValues) │
│     Tier2: ctx.remote.stats.aggregate(range)              │
└──────────────────────────────────────────────────────────┘
                        │ Tier2: Typert RPC `/api/stats/aggregate`
┌─ 宿主插件 (index.js) ────────────────────────────────────┐
│  StatsService (Cordis Service)                           │
│     inject: workspaces / sessions / sessionProjections   │
│              / sessionPersistence(可选) / tokenMeter(可选) │
│     @typert.remote aggregate(range) → StatsAggregate      │
│        · 读每会话 tokenUsage + sessionStats（投影）        │
│        · 读 durable log 时间戳 → 活跃区间 → 30min 槽       │
└──────────────────────────────────────────────────────────┘
```

一个包 `@deepseek-ai/dsh-stats` 同时承载宿主端与客户端（参考 `dsh-goal` 单包双端结构）。

---

## 3. 数据契约（宿主与客户端共享，zod + TS）

放在 `lib/types/contract.js`（zod schema）+ `lib/types/contract.d.ts`。与独立面板 `/api/stats` 同构，前端聚合/格式化逻辑可复用。

```ts
interface TokenBuckets {
  uncachedInputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}
interface SessionStats {
  turns: number; steps: number;
  llmMs: number; toolMs: number;
  ttftMs: number; ttftSteps: number;
  decodeMs: number; decodeTokens: number;
}
interface SessionAgg {
  id: string;
  title: string | null;
  createdAt: number | null;      // identity.createdAt
  lastPromptAt: number | null;   // sessionListMetadata.lastPromptAt
  buckets: TokenBuckets;
  stats: SessionStats;
}
interface ProjectAgg {
  id: string;                    // workspaceId
  name: string;                  // title
  path: string;
  sessionCount: number;
  firstActiveAt: number | null;
  lastActiveAt: number | null;
  buckets: TokenBuckets;         // 求和
  stats: SessionStats;           // 求和（ttft/decode 用于加权均值）
  sessions: SessionAgg[];        // 明细，按 lastPromptAt 倒序
}
interface TimelineBlock {
  slot: number;                  // 0..47（半小时槽）
  projectId: string;
  name: string;
  colorIndex: number;            // 与 projects[] 顺序一致
  ms: number;                    // 该槽内开发时长
}
interface TimelineDay {
  date: string;                  // YYYY-MM-DD（本地时区）
  dayTotalMs: number;
  slotBlocks: TimelineBlock[];
}
interface StatsAggregateRequest { range: "7" | "30" | "90" | "all"; }
interface StatsAggregateResponse {
  generatedAt: number;
  slotMinutes: 30;
  projects: ProjectAgg[];
  timeline: { days: TimelineDay[] };
}
```

派生值（在客户端统一计算，避免宿主/客户端口径漂移）：
`inputTokens = uncached + cacheRead + cacheWrite`；`cacheHitPct = round(cacheRead/input*100)`；
`tps = decodeTokens/(decodeMs/1000)`；`ttftAvgMs = ttftMs/ttftSteps`（均为 0 除保护）。

---

## 4. Tier 1 — 纯客户端插件（零宿主改动）

### 4.1 数据获取

```ts
// 项目清单
const workspaces = ctx.workspaces;            // object layer（含 path/title/sessionIds）
// 每会话聚合
const sessions = ctx.sessions;                // session store
for (const s of list) {
  const binding = sessions.binding(s.id);
  const tokenUsage = binding?.session.projections.faceOf("tokenUsage")?.getSnapshot();
  const sessionStats = binding?.session.projections.faceOf("sessionStats")?.getSnapshot();
  const meta = binding?.session.projections.faceOf("sessionListMetadata")?.getSnapshot();
  // 汇总到对应 workspace
}
```

> 若 `faceOf` 不可用（取决于 `dsh-session-projection` 的投影 face 命名），退回直接读
> `session.list` summary 里的 `projectionValues`（字段名 `tokenUsage`/`sessionStats`/`sessionListMetadata`，已确认存在）。

### 4.2 时间线（会话粒度降级）

无逐事件时间戳，退化为：每个会话一个活跃区间 `[createdAt, lastPromptAt]`，按 30 分钟槽
切分（假设连续）。**局限**：长会话内部的空闲/断续被当成连续，块偏「实」。

### 4.3 Slot 挂载

- `sidebar.footer.action`（list）注册 `StatsTrigger`：
  - `inject: (wide) => ({ onOpen })`，折叠态只渲染图标。
- `shell.overlay`（list）注册 `StatsPanel`：
  - 受控 open/close，`closed` 返回 `null`；打开时渲染全屏浮层。
- locale：`ctx.locale.register("stats", { zh, en })`。

### 4.4 依赖（package.json `dsh.client.inject` + module `inject`）

```
module inject = ["slots", "workspaces", "sessions", "locale"]
dsh.client = { inject: [
  "@deepseek-ai/dsh-client-runtime",
  "@deepseek-ai/dsh-client-ui-layout",
  "@deepseek-ai/dsh-client-ui-sidebar",
  "@deepseek-ai/dsh-client-ui-primitives",
  "@deepseek-ai/dsh-client-locale"
], platform: "web" }
```

---

## 5. Tier 2 — 宿主插件（补齐 30 分钟精度）

### 5.1 宿主 Service

```ts
class StatsService extends Service {
  static inject = [
    "workspaces",            // workspaceRegistry（项目→会话）
    "sessions",              // 会话注册表（live 或从 persistence 恢复）
    "sessionProjections",    // 可选：tokenUsage/sessionStats 投影值
    "sessionPersistence",    // 可选：durable log（逐事件时间戳）
    "tokenMeter"             // 可选：兜底 measure()
  ];
}
```

### 5.2 Remote 方法 `stats/aggregate`

- Typert：`service:'stats'`，`namespace:'stats'`，`method:'aggregate'`，
  `invocation:{kind:'direct'}`（**根作用域，无 agent wire**）。
- 入参：`{ range }`（json wire）；出参：`StatsAggregateResponse`（zod schema）。

### 5.3 聚合算法（复刻独立面板 `server.mjs`）

1. 列项目：`workspaceRegistry`（或按 `sessions` 的 cwd 分组）。
2. 每会话：
   - `tokenUsage`/`sessionStats` 取 `sessionProjections`（命中即用，否则 `tokenMeter.measure()` + 重放 `sessionStats` 逻辑）。
   - 时间戳：读 durable log（`sessionPersistence` 或 `sessions.get(id).events`），抽取 `time`/`time0`。
3. 活跃区间：相邻事件间隔 ≤ `GAP_MS`(10min) 归一段；孤立事件按 `MIN_INTERVAL_MS`(1min) 计。
4. 区间按 30 分钟**绝对槽**切分累计；槽 → 本地日期 + 日内槽位 0..47。
5. 输出 `projects[]`（含明细）+ `timeline.days[]`（含 `slotBlocks`）。

### 5.4 性能

- 会话很多时：`range` 过滤只解码**范围内**的会话；投影值 O(1) 读。
- 缓存：按「会话文件 mtime + 投影 seq」缓存解码结果（同独立面板的 mtime 缓存思路）。
- 首次冷启动可能较慢（多会话解码），提供 `generatedAt`，客户端可轮询/懒加载。

### 5.5 客户端接入

注入 `"remote"` + `"remote.stats"`，调用 `ctx.remote.stats.aggregate({ range })`，
响应直接灌入与 Tier 1 共享的 UI store。

---

## 6. UI 组件（Tier 1/2 共用）

复用独立面板的视觉与格式化逻辑，React 化；原语用 `@deepseek-ai/dsh-client-ui-primitives`（Tooltip 等）。

| 组件 | 职责 |
|---|---|
| `StatsTrigger` | 侧边栏底栏「统计」按钮（图标 + 折叠态自适应） |
| `StatsPanel` | `shell.overlay` 全屏浮层，顶部 Tab（总览/时间线）+ 范围切换(7/30/90/全部) |
| `SummaryCards` | 项目数/会话数/总轮步/LLM时长/工具时长/输入/输出/平均缓存命中 |
| `ProjectsTable` | 每项目一行聚合统计（与官方 `StatsLine` 同口径）；点击展开会话明细 |
| `LegendChips` | 项目颜色图例，可点击过滤 |
| `TimelineHeatmap` | 每日总量热力条（一格一天，色深=当天开发总时长；点击定位+闪烁） |
| `TimelineGrid` | 按天一行、48 槽；槽内按项目堆叠矩形块，块高=该 30min 开发时长占比 |
| `Tooltip` | 块悬停：项目/日期/时段/时长/占比 |

状态：本地 zustand store（`dsh-client-runtime` 已带 zustand）——`range` / `hiddenProjects` / `selectedProject` / `tab` / `data`。

配色：固定调色板，`colorIndex = projects[]` 顺序，宿主与客户端一致（由响应顺序保证）。

---

## 7. 工程结构与构建部署

```
dsh-stats-plugin/
  package.json            # name: @deepseek-ai/dsh-stats（或私有 scope）
                          # dsh.client.inject + platform:web
                          # peerDeps: @deepseek-ai/cordis ^4, react ^18.2.0,
                          #   dsh-client-* / dsh-session-projection / dsh-token-meter ... (0.1.0-rc.6)
  lib/
    index.js              # 宿主：StatsService + typert remote（Cordis Service）
    client.js             # 客户端：slot 注册 + UI（React）
    invariant.js          # （可选）共享不变量
    typert.host.js        # 生成：TYPERT（宿主 remote 描述符 + zod schema）
    typert.remote-client.js # 生成：TYPERT_REMOTE（客户端描述符）
    types/                # contract.js( zod ) + contract.d.ts
  src/                    # TS 源（@typert 装饰器写在 index.ts / stats-service.ts）
  tsdown.config.ts        # 打包：client 单独打包（同 dsh-client-ui-* 用 tsdown）
```

构建：`pnpm run build`（tsdown 产 client；typert-generator 产 host/remote 描述符）。
安装：`dsh plugin --profile web add <本包>`（或 `cd ~/.dsh/profiles/web && pnpm add <本包>`），
并加入 `cordis.patch.yml` / `dsh.profile.bundles`；重建前端产物后**重启 `dsh web`**。
热更：开发期 `pnpm run dev:web`（同 checkout）跑 client bundle HMR。

---

## 8. 性能与边界

- 大工作区：聚合放宿主端一次性完成，客户端只收响应；会话明细按需懒加载（可选折叠）。
- 时间线跨时区：统一用**本地时区**切日期（与独立面板一致）。
- 并发开发同一时段多项目：块纵向堆叠、行自适应增高（如实反映并行）。
- `session.list` 投影依赖 composition 挂了 `dsh-token-meter` + `dsh-session-stats`（web profile 已挂；自建 profile 需确认）。

---

## 9. 风险与待确认项

1. **Tier1 的投影读取**：`faceOf("tokenUsage")` 的 face 名与 `projectionValues` 字段是否完全一致——实现时以 `session.list` 实际返回为准，二者取其一。
2. **根作用域 remote**：`stats/aggregate` 无 agent wire，需在 typert FaceModel 里用 `invocation:{kind:'direct'}` 无 `scope`（`dsh-host-plugin-inventory` 已验证该形状）；实现时按 typert-generator 的具体语法微调。
3. **版本耦合**：peerDependencies 对齐 `0.1.0-rc.6`；`@deepseek-ai/cordis` `^4`。
4. **`shell.overlay` 多插件共存**：list slot 需正确渲染空态；Z 序/焦点与现有 overlay（如命令面板）共存。
5. **Tier1 时间线精度**：会话粒度会高估长会话占用；这是明确取舍，Tier2 补齐。
6. **性能冷启动**：多会话首次解码较慢，需缓存 + 懒加载兜底。

---

## 10. 建议实施顺序

1. 建仓 + 数据契约（zod/TS）+ 共享聚合纯函数（可单测）。
2. **Tier 1 客户端插件**：slot 挂载 → 数据读取 → 总览表 → 时间线（会话粒度）→ 热力条。
3. 验证：装进 web profile，重启，侧边栏出「统计」入口。
4. **Tier 2 宿主插件**：`stats/aggregate` remote → 替换客户端数据源（UI 零改动）→ 30 分钟精度。
5. 收尾：i18n、边界、性能、README。
