# @rongyi7/dsh-stats — DSH 项目统计插件

[English](README.md) | 简体中文

[![npm version](https://img.shields.io/npm/v/@rongyi7/dsh-stats)](https://www.npmjs.com/package/@rongyi7/dsh-stats)
[![npm downloads](https://img.shields.io/npm/dm/@rongyi7/dsh-stats)](https://www.npmjs.com/package/@rongyi7/dsh-stats)
[![license](https://img.shields.io/npm/l/@rongyi7/dsh-stats)](https://github.com/rongyishuaige7/dsh-stats/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/@rongyi7/dsh-stats)](https://nodejs.org)
[![CI](https://github.com/rongyishuaige7/dsh-stats/actions/workflows/ci.yml/badge.svg)](https://github.com/rongyishuaige7/dsh-stats/actions/workflows/ci.yml)

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

`npm pack --dry-run` 可预览发布内容（LICENSE/README*/lib/*/cordis.patch.yml/package.json，~25KB）。

## 安装到 DSH profile

> ⚠️ **切勿用 `npm install --prefix ~/.dsh/profiles/web ...` 等方式直接操作 profile 目录**。
> DSH profile 由 **pnpm** 管理（workspace + 虚拟存储 + 供应链策略）。npm 会写入自己的
> `package-lock.json`、以扁平结构重写 `node_modules`，并自动安装本包的 peerDependencies，
> 导致 `@deepseek-ai/dsh-*` 内部包出现多份副本、cordis 上下文分裂，重启后会话恢复报
> `agent-presets: refusing to compose an unscoped context`。修复只能删掉
> `node_modules`/`package-lock.json` 后 `pnpm install`。
> 更新插件请一律走官方命令 `dsh plugin`（内部转发给 pnpm）。

```bash
# 方式 A（从 npm registry 安装/升级）
dsh plugin --profile web add @rongyi7/dsh-stats            # 最新版
dsh plugin --profile web add @rongyi7/dsh-stats@0.2.2     # 指定版本
# 方式 B（从本地 tarball）
dsh plugin --profile web add ./rongyi7-dsh-stats-0.2.2.tgz
```

即可，无需手动加 patch 行——本包已声明 `dsh.bundle`（带 `cordis.patch.yml`，其中 insert 了插件行），
`dsh plugin add` 会自动把它加入 `dsh.profile.bundles` 并加载。

验证：`dsh --profile web --dump-config`（应看到 `- id: stats` 与 bundle 列表中的 `@rongyi7/dsh-stats`）。

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
- **成本计算**：按实际模型与官方规则自动计价；DeepSeek 按逐槽生效价，MiniMax M3 按请求的
  服务档和输入上下文档计价，无需手动选择模型。
- **日期范围**：近 7/30/90 天/全部，同时作用于总览（重建聚合）与时间线。
- **数据质量**：面板明确显示「精确（宿主）」「部分精确」「已过期」或「近似（客户端）」；日志不完整或缺失时会在数据源提示中告警，不会伪装成精确结果。
- **打磨**：选项持久化（localStorage）、列排序、CSV/JSON 导出、图例过滤、60s 自动刷新 + 手动刷新。

当前支持的按量计费模型：

| 模型 | 规则 |
|---|---|
| `deepseek-v4-pro`、`deepseek-v4-flash` | 官方历史价与 2026-08-17 后峰谷价，按北京时间槽计费 |
| `MiniMax-M3` | 官方 standard/priority 与输入 `≤512K`/`>512K` 四档价格 |
| `MiniMax-M2.7`、`MiniMax-M2.7-highspeed` | 官方输入、输出、缓存读取、缓存写入价格 |

MiniMax 单价来自[官方按量计费页面](https://platform.minimaxi.com/docs/guides/pricing-paygo)。模型名匹配忽略大小写，但不会把带供应商前缀或未知模型静默映射到相近模型。

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
               → { projects, timeline, meta }（会话带 model / slots / slotStats / slotUsage / quality）
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
dsh plugin --profile web add ./rongyi7-dsh-stats-0.2.2.tgz   # pnpm 重装
# 重启 dsh web
```

## 已知限制

| 项 | 说明 |
|---|---|
| 归档会话 | 统计中保留但打「（已归档）」标记，未排除 |
| 实时性 | 当前会话投影缓存秒级滞后，60s 自动刷新兜底 |
| 解码开销 | 会话很多时宿主每次 RPC 全量解码（已加 mtime 缓存，跨请求不重复解码；首次仍慢） |
| 调价边界 | DeepSeek 在 8.17 调价后按会话「发生时的价格」计价（正是预期行为），无历史价格回填 |
| 未知模型 | 无法识别的模型成本显示「—」，不会猜测价格 |
| 时长口径 | 项目 LLM/工具时长是工作量累计；同一项目并发会话在时间线中合并为墙钟区间 |
| 存储不完整 | 日志缺失、损坏或正写入时会标记为「部分精确/已过期」，必要时使用 projection cache token 总量并提示告警 |

说明：时间线切天、峰谷时段、计价均已按显式北京时间（UTC+8）处理，与宿主机时区无关。
