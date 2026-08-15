# @rongyi7/dsh-stats — DSH 项目统计插件

把「项目级 Token 消耗统计 + 每日开发时间线 + 消费金额」集成进 DeepSeek Harness（DSH）Web 侧边栏。

> Tier 2 架构：宿主侧 Typert RPC 聚合持久化会话日志，客户端 React UI 渲染面板；RPC 不可用时自动降级为纯客户端近似。

## 结构

```
src/                       # 源文件
  index.js                 #   宿主半体：StatsService（stats/aggregate Typert RPC）
  client.cjs               #   客户端半体：$mount + ctx.inject + React UI
  typert-host.js           #   宿主 Typert manifest（strict 描述符 + zod schema）
  typert-remote-client.js  #   客户端描述符（参考；运行时由 client.cjs 内联并 $mount）
scripts/build.mjs          # esbuild 构建脚本（node scripts/build.mjs）
lib/                       # 构建产物（随包发布，勿手改）
  index.js / client.js / typert.host.js / typert.remote-client.js
reference/server.mjs       # 第一版独立面板后端（活跃区间切槽算法参考）
DESIGN.md                  # 完整集成设计（Tier 1 + Tier 2）
```

## 构建与发布

```bash
npm run build              # esbuild 产出 lib/（client 打成 __ModuleLoader__ 包装产物）
npm publish                # prepublishOnly 自动重新构建（需先 npm login）
```

`npm pack --dry-run` 可预览发布内容（只有 LICENSE/README/lib/*/package.json，~21KB）。

## 安装到 DSH profile

```bash
# 方式 A（从 npm registry）
dsh plugin --profile web add @rongyi7/dsh-stats
# 方式 B（从本地 tarball）
dsh plugin --profile web add ./rongyi7-dsh-stats-1.0.0.tgz
```

然后在 `~/.dsh/profiles/web/cordis.patch.yml` 插入一行（本包不声明 `dsh.bundle`，
`dsh plugin` 只装依赖、不加入 bundle 列表，这行需手动加）：

```yaml
- insert:
    - id: stats
      name: '@rongyi7/dsh-stats'
```

验证：`dsh --profile web --dump-config`（应看到 `- id: stats`）。

## 激活

`dsh-client-modules` / `dsh-typert-loader` 的扫描按包缓存、**重启才生效**：

```bash
dsh web
```

重启后侧边栏底栏出现「统计」按钮。面板标题右侧显示「精确（宿主）」即 Tier 2 生效；
显示「近似（客户端）」表示回退（tooltip 里有具体错误）。

## 功能

- **项目总览**：汇总卡（含消费金额）+ 每项目统计行 + 会话明细（含每会话模型/消费/归档标记）。
- **开发时间线**：30 分钟槽精确时间线（宿主读事件时间戳切活跃区间）+ 每日总量热力条。
- **成本计算**：按每会话实际模型 + 逐槽实际价格（8.17 前平价；8.17 后峰谷，
  高峰 9:00–12:00 / 14:00–18:00 北京时间）自动计价，无需手动选择。
- **日期范围**：近 7/30/90 天/全部，同时作用于总览（重建聚合）与时间线。
- **打磨**：选项持久化（localStorage）、列排序、CSV/JSON 导出、图例过滤、60s 自动刷新 + 手动刷新。

## 数据流（Tier 2）

```
浏览器 client.cjs:
  apply() → ctx.remote.$mount(内联 STATS_REMOTE_CONTRIBUTION)
         → ctx.inject(["remote","remote.stats"], childCtx)
           （不能直接 ctx.remote.stats：本 fiber 未注入会报 without inject，
             而注入又死锁——提供者正是本次 $mount；子 ctx 注入绕过）
         → aggregateRemote = () => childCtx.remote.stats.aggregate()
宿主 index.js:
  StatsService extends TypertRemoteService（@Remote("aggregate")）
    constructor: __runInitializers 触发 @Remote 标记注册（漏掉会导致 SRC 派发失效）
    aggregate(): 读 workspace.json + session_projcache.json（tokenUsage/sessionStats 聚合）
               + 解码 session.jsonl.zstd（时间戳/模型/usage 按 turn:step 去重）
               → { projects, timeline }（会话带 model / slots / slotUsage）
```

要点（踩过的坑）：

1. **DSH 不自动挂载第三方 `./remote`** —— 客户端必须内联描述符并手动 `$mount`。
2. **`ctx.remote.stats` 不能直接访问** —— traceable 代理会转发成 `ctx["remote.stats"]` 解析，
   本 fiber 未注入就报 `without inject`；注入又死锁。用 `ctx.inject` 子 ctx 解决。
3. **`@Remote` 装饰器的 initializer 要手动触发** —— 手写 ESM 没有实例字段的
   `__runInitializers(this, _instanceExtraInitializers)`，要在 constructor 里调用。
4. **客户端 `$mount` 的 result schema 只需 `.parse`** —— 客户端解码只调 `schema.parse(value)`，
   可用 `{ parse: v => v }` 透传；但宿主 `typert.host.js` 的 schema 必须是真 zod（`_zod`）。

## 修改迭代（本地开发）

```bash
# 改 src/ 后重新构建 + 重新打包 + 重装进 profile，再重启
npm run build && npm pack
dsh plugin --profile web add ./rongyi7-dsh-stats-1.0.0.tgz   # pnpm 重装
# 重启 dsh web
```

## 成熟度评估（v1.0.0）

**可作为正式 npm 包发布**（`npm publish` 流程见上文）。已完成：

- 可复现构建（esbuild + `__ModuleLoader__` 包装 + 依赖外部化）；
- `npm pack` 产物干净（仅 LICENSE/README/lib/*/package.json，~21KB）；
- 依赖声明按官方惯例（`zod` dependency；`cordis`/`dsh-typert-protocol`/`react`/`dsh-client-*` peer）；
- `prepublishOnly` 自动构建。

**已知限制（非阻塞，不影响发布）：**

| 项 | 说明 |
|---|---|
| 安装步骤 | `dsh plugin add` 后仍需手动加一行 `cordis.patch.yml`（本包不声明 `dsh.bundle`） |
| i18n | 按钮/标签走 locale，表头与提示为硬编码中文 |
| 日期切分时区 | 按宿主机本地时区切「天」（峰谷判定已显式 UTC+8）；跨时区部署需再改 |
| 归档会话 | 统计中保留但打「（已归档）」标记，未排除 |
| 实时性 | 当前会话投影缓存秒级滞后，60s 自动刷新兜底 |

## 已知限制

- 会话很多时宿主每次 RPC 全量解码（已加 mtime 缓存，跨请求不重复解码；首次仍慢）。
- 8.17 调价后，历史会话按「发生时的价格」计价（正是预期行为），无历史价格回填。
- 日期范围过滤概览时按会话 `updatedAt` 判定归属；跨 8.17 的会话由逐槽价格自动处理。

## 待办（可选）

- 时间线日期切分改为显式 UTC+8（当前按宿主机本地时区）。
- 表头/提示文案接入 i18n dict。
