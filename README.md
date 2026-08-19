# @rongyi7/dsh-stats

[English](README.en.md) | 简体中文

[![npm version](https://img.shields.io/npm/v/@rongyi7/dsh-stats?color=1677ff&label=npm)](https://www.npmjs.com/package/@rongyi7/dsh-stats)
[![npm downloads](https://img.shields.io/npm/dm/@rongyi7/dsh-stats?color=22c55e&label=downloads)](https://www.npmjs.com/package/@rongyi7/dsh-stats)
[![node](https://img.shields.io/node/v/@rongyi7/dsh-stats?color=339933)](https://nodejs.org)
[![CI](https://github.com/rongyishuaige7/dsh-stats/actions/workflows/ci.yml/badge.svg)](https://github.com/rongyishuaige7/dsh-stats/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@rongyi7/dsh-stats?color=8b5cf6)](https://github.com/rongyishuaige7/dsh-stats/blob/main/LICENSE)

> 把 DSH 里分散的会话记录，整理成一眼就能读懂的项目仪表盘：Token、开发时间线、模型分布、消费金额和账户余额，全部在侧边栏里完成。 `(｡•̀ᴗ-)✧`

`@rongyi7/dsh-stats` 是一个面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web 端的插件。它同时支持纯客户端回退和宿主侧精确聚合，适合日常复盘，也适合核对账单。

<p align="center">
  <img src="docs/images/overview.png" alt="浅色模式项目总览：项目名已打码，展示全部时间汇总" width="920" />
</p>

> **隐私说明**：项目名统一显示为 `********`，路径显示为 `/workspace/********`，会话标识也会在截图前替换。余额金额使用演示值；日期、Token、时长和消费为截图时的“全部”汇总。图片中不包含 API Key、Cookie、管理令牌、原始会话内容或上游原始响应；插件也不会把这些凭证或原始响应发送到浏览器。

## ✨ 一眼看懂

| | 能力 | 你能得到什么 |
| --- | --- | --- |
| 📊 | 项目总览 | 按项目查看会话、轮次、Token、缓存命中率、速度和消费；今天没有活动的项目不会挤占列表。 |
| ⏱️ | 开发时间线 | 以 30 分钟为粒度还原每天的开发区间；同一时间并行开发多个项目时仍能分辨颜色和时长。 |
| 📈 | 用量趋势 | 近 7 天输入/输出 Token、活动热力图、模型分布，以及悬停时的模型消费金额。 |
| 💳 | Provider 级计价 | 根据真实 `Provider + 模型 + 账户类型 + 时间槽` 自动选价，不要求手动挑模型。 |
| 👤 | 账户余额与额度 | 查看 DeepSeek 等 API 余额，以及 Kimi、Z.ai、MiniMax Coding Plan 窗口额度。 |
| 🔒 | 宿主侧凭证安全 | 余额请求只在 DSH 宿主侧执行，浏览器只拿到脱敏后的余额和状态。 |

项目卡片最多完整展示 7 个项目，开发时间线最多完整展示最近 3 天；更多内容可在面板内部滚动查看，页面布局不会被撑开。 `(ง •̀_•́)ง`

## 🚀 30 秒安装

### 前置条件

- 已安装 DeepSeek Harness，并拥有 `web` profile。
- Node.js `>= 22`。

### 从 npm 安装

```bash
dsh plugin --profile web add @rongyi7/dsh-stats
```

然后重启正在运行的 DSH Web：

```bash
dsh web
```

重启后，侧边栏底部会出现「统计」入口。若希望固定版本，可使用：

```bash
dsh plugin --profile web add @rongyi7/dsh-stats@0.2.27
```

### 从本地 tarball 安装

```bash
dsh plugin --profile web add ./rongyi7-dsh-stats-0.2.27.tgz
```

验证插件是否被 profile 注册：

```bash
dsh --profile web --dump-config
```

输出中应能看到 `stats` 和 `@rongyi7/dsh-stats`。**不要**用 `npm install --prefix ~/.dsh/profiles/web ...` 直接改写 DSH profile；profile 由 pnpm 管理，官方 `dsh plugin` 命令会处理依赖和 bundle 注册。

## 🖼️ 界面导览

下面是真实运行面板的浅色模式截图。项目身份字段已打码，余额金额为演示值，项目总览和用量趋势展示截图时选中的“全部”汇总：

<table>
  <tr>
    <td align="center"><strong>项目总览</strong><br><img src="docs/images/overview.png" alt="项目名已打码的项目总览界面" width="480"></td>
    <td align="center"><strong>开发时间线</strong><br><img src="docs/images/timeline.png" alt="项目名已打码的开发时间线界面" width="480"></td>
  </tr>
  <tr>
    <td align="center"><strong>用量趋势</strong><br><img src="docs/images/trends.png" alt="用量趋势、热力图和模型分布界面" width="480"></td>
    <td align="center"><strong>账户余额</strong><br><img src="docs/images/balance.png" alt="DeepSeek 账户余额界面" width="480"></td>
  </tr>
</table>

### 你会看到什么？

1. **项目总览**：上方汇总卡展示项目数、会话数、Token、LLM/工具时长和消费；下方项目卡可排序、筛选并展开会话明细。
2. **开发时间线**：每行对应一天，颜色代表项目；条块会显示活跃区间，重叠项目仍保持各自颜色。
3. **用量趋势**：输入和输出使用不同颜色；输出量较小时柱子仍保留最小可见高度，鼠标悬停可以查看精确数值。
4. **模型分布**：圆环和右侧列表共享固定布局；悬停模型行即可查看该模型的 Token、占比和消费金额。
5. **账户余额**：DeepSeek 使用蓝色渐变卡片，同时展示可用余额、充值余额、赠送余额和官方充值入口。

统计页支持 CSV/JSON 导出；账户余额页只保留刷新和关闭操作，因为余额是实时快照，不属于历史统计导出数据。

## 💰 计价规则

所有价格按“每百万 Token”计算，币种分开汇总（例如 `¥... + $...`），不做隐式汇率换算。计价内核会同时考虑上下文长度、服务档、缓存类型和生效时间，并把规则来源写入导出字段，方便复核。

| Provider | 当前内置模型 | 计价特点 |
| --- | --- | --- |
| [DeepSeek](https://api-docs.deepseek.com/zh-cn/quick_start/pricing) | `deepseek-v4-pro`、`deepseek-v4-flash` | CNY；按北京时间 30 分钟槽区分历史价、峰时价和非峰时价。 |
| [MiniMax](https://platform.minimaxi.com/docs/guides/pricing-paygo) | `MiniMax-M3`、`MiniMax-M2.7`、`MiniMax-M2.7-highspeed` | CNY；M3 区分 standard/priority 与 `<=512K`/`>512K` 上下文。 |
| [OpenAI](https://developers.openai.com/api/docs/pricing) | `gpt-5.6-sol`、`gpt-5.6-terra`、`gpt-5.6-luna`、`gpt-5.6-cyber` | USD；支持 `272K` 上下文分档。 |
| [Anthropic](https://docs.anthropic.com/en/docs/about-claude/pricing) | Claude Opus 5、Sonnet 5、Sonnet 4.6、Haiku 4.5 | USD；缓存写入时长不可得时明确标记为估算。 |
| [Google](https://ai.google.dev/gemini-api/docs/pricing) | Gemini 3.7 Flash、3.1 Pro Preview、2.5 Pro/Flash | USD；支持 `200K` 上下文分档，缓存存储时长缺失时标记为估算。 |
| [Moonshot/Kimi](https://platform.kimi.com/docs/pricing/chat.md) | Kimi K3、K2.7 Code/Highspeed、K2.6 | CNY；按官方模型规则计价。 |
| [Z.ai](https://docs.z.ai/guides/overview/pricing) | GLM 5.2、5.1、5、5 Turbo、4.7、4.7 FlashX/Flash | USD；按官方模型规则计价。 |
| [OpenRouter](https://openrouter.ai/api/v1/models) | 主流 OpenAI、Anthropic、Google、Kimi、GLM 路由快照 | USD；目录价格是带日期的快照，因此状态为 estimated。 |

计价是 **Provider-scoped**：只有明确识别为官方 Provider 的请求才会套用对应官方价。DSH 透传渠道 `nbdeepseek` 与 `deepseek-modlens` 明确沿用 DeepSeek 官方 API 计价；其他中转、`local`、未知 Provider、仅模型名相似的请求，以及订阅/Token Plan 用量，都不会被伪装成 API 消费。

### 消费状态怎么读

| 状态 | 含义 |
| --- | --- |
| `exact` | 每一条有价用量都命中确定的内置规则。 |
| `estimated` | 有金额，但至少一条记录来自动态价格快照，或缺少会影响价格的元数据。 |
| `free` | 命中的用量全部免费；汇总会保留零金额，不会误显示为未知消费。 |
| `partial` | 一部分用量可计价，另一部分无法安全计价；已知金额保留，并显示 `+ ?`。 |
| `unsupported` | 没有足够可靠的规则，显示 `—`，不猜价格。 |

单条用量还可能标记为 `subscription`（订阅/Token Plan）或 `ambiguous`（规则冲突）。`coding-plan`、`coding_plan` 等订阅别名会在计价前统一归一化，绝不会伪装成 API 消费。

## 👤 账户余额与订阅额度

账户查询只在宿主侧执行。下表中的“凭证引用”是变量名，不是需要粘贴到 README 或聊天窗口的密钥值：

| 账户 | 官方接口 | 默认凭证引用 |
| --- | --- | --- |
| DeepSeek 余额 | `/user/balance` | `DEEPSEEK_API_KEY` |
| OpenRouter Credits | `/api/v1/credits` | `OPENROUTER_MANAGEMENT_KEY`（必须是 Management Key） |
| Moonshot 余额 | `/v1/users/me/balance` | `MOONSHOT_API_KEY` |
| Z.ai 余额 | `/api/paas/v4/balance` | `ZAI_API_KEY` |
| Kimi For Coding | `/coding/v1/usages` | `KIMI_API_KEY` |
| Z.ai Coding Plan | `/api/monitor/usage/quota/limit` | `ZAI_API_KEY` |
| MiniMax Coding Plan | [`/v1/token_plan/remains`](https://platform.minimaxi.com/subscribe/token-plan?tab=api-enterprise)（含官方兼容路径） | `MINIMAX_API_KEY` |

Provider 配置中的 `accountApiKeyEnv` 可以覆盖默认引用。查询结果缓存 5 分钟并合并并发请求，点击刷新会明确绕过这层缓存；遇到网络错误、限流或异常响应时，会保留同一配置的上一次成功快照并标记为“已过期”。未声明账户类型的 MiniMax 旧配置继续默认使用 Coding Plan；显式配置 `accountType: api` 时不会当作订阅额度查询。没有公开余额接口的 Provider 仍可正常统计 Token，只会在账户页显示“不支持”。

## 🔐 凭证与隐私边界

- 凭证只通过 DSH 宿主的 `credentials` service 解析，绝不进入前端 bundle、RPC 日志或 CSV/JSON 导出。
- 账户适配器只允许固定的官方 HTTPS 域名，只发 GET 请求，拒绝重定向，15 秒超时，响应体上限 1 MiB。
- 不要把真实 API Key、Cookie、Management Key、`auth.json` 或 `.credentials.yaml` 提交到 Git、公开 issue，或粘贴给 Agent。
- 本仓库的截图仅用于说明布局；项目名统一为 `********`，路径为 `/workspace/********`，会话标识已替换。余额金额为演示值，仅保留所选“全部”视图的汇总日期与用量指标。

## 🎯 数据准确性

面板标题会明确标注当前数据来源：

- **精确（宿主）**：宿主 RPC 读取持久化会话日志和投影数据，时间线按事件时间戳切成 30 分钟槽。
- **部分精确/已过期**：日志缺失、正在写入或账户接口暂时失败；界面会保留已知值并给出提示。
- **近似（客户端）**：旧版宿主不提供 RPC 时，使用浏览器可见的投影值估算；适合快速浏览，不应当作审计结果。

时间线、峰谷时段和日期范围都使用显式北京时间（UTC+8），不受宿主机系统时区影响。

## ❓ 常见问题

<details>
<summary><strong>为什么显示“近似（客户端）”？</strong></summary>

当前 DSH 宿主没有成功加载 Tier 2 RPC，或仍在使用旧版插件。重启 `dsh web` 并确认 `dsh --profile web --dump-config` 中存在 `stats`；如果仍回退，tooltip 会给出具体错误。
</details>

<details>
<summary><strong>为什么最常用模型显示 `(unknown)`？</strong></summary>

原始会话日志可能没有保存 Provider/模型字段，或者 Provider 尚未纳入安全计价目录。插件不会把相似模型名强行映射到官方模型；这样宁可显示未知，也不会制造虚假的消费金额。
</details>

<details>
<summary><strong>为什么总消费后面有 `+ ?`？</strong></summary>

这表示已知模型的金额已经算出，但仍有一部分 Token 无法安全计价（例如未知 Provider、中转或订阅用量）。导出的项目 CSV 会保留 `costStatus`、`ruleId`、`pricingSource`、Provider 和模型身份，便于逐条定位。
</details>

<details>
<summary><strong>为什么余额页没有 CSV/JSON 按钮？</strong></summary>

CSV/JSON 是历史统计导出功能，只出现在项目、时间线和用量趋势视图。余额页展示的是带缓存状态的实时快照，因此保留刷新和关闭按钮，避免把瞬时账户状态误当成历史账单。
</details>

<details>
<summary><strong>为什么输出柱子看起来比输入小很多？</strong></summary>

很多代码会话的输入上下文远大于输出 Token。图表仍会保留输出的最小可见高度，悬停柱子可以查看精确数值；图例中的“输出（含思考）”位于图表下方居中位置。
</details>

<details>
<summary><strong>安装后为什么侧边栏没有入口？</strong></summary>

DSH 会缓存客户端模块和 Typert 描述符。确认安装命令成功后，完整重启 `dsh web`，必要时对浏览器做一次硬刷新。
</details>

## 🧩 Tier 2 数据流（给贡献者）

<details>
<summary><strong>展开架构细节</strong></summary>

```text
浏览器 client.cjs
  apply()
    -> ctx.remote.$mount(内联 STATS_REMOTE_CONTRIBUTION)
    -> ctx.inject(["remote", "remote.stats"], childCtx)
    -> childCtx.remote.stats.aggregate()
    -> childCtx.remote.stats.account()

宿主 index.js
  StatsService
    aggregate(): workspace + projection + session.jsonl.zstd
               -> 项目汇总、30 分钟时间线、模型/计价明细
    account(): 余额与订阅额度适配器，统一状态并提供 stale fallback
    providers(): 只返回能力元数据，不返回凭证值
    current(): 旧版 DeepSeek 余额兼容 RPC
```

关键实现原因和完整数据契约见 [DESIGN.md](DESIGN.md)。`lib/` 是发布产物，请修改 `src/` 后再构建，不要手工编辑 `lib/`。
</details>

## 🛠️ 本地开发与验证

```bash
npm install
npm run build
npm test
npm pack --dry-run
```

源码结构：

```text
src/index.js              # 宿主 StatsService 与 aggregate/account RPC
src/client.cjs            # 客户端入口、React UI 与 fallback
src/pricing.cjs           # Provider 级、按生效时间的计价内核
src/accounts.js           # 官方余额/额度适配器（仅宿主使用凭证）
src/typert-host.js        # 宿主 Typert manifest 与 zod schema
src/typert-remote-client.js # 客户端 RPC 描述符
scripts/build.mjs         # esbuild 构建脚本
lib/                      # 构建产物（随包发布）
```

修改 `src/` 后，执行 `npm run build`；发布前 `prepublishOnly` 会自动重建。更多集成背景、性能权衡和已知踩坑见 [DESIGN.md](DESIGN.md)。

发布前检查：

```bash
npm run build
npm test
npm pack --dry-run
npm publish
```

## ⚠️ 已知限制

- 当前会话的 projection cache 可能滞后几秒，面板每 60 秒自动刷新。
- 首次读取大量会话时，宿主需要解码日志；随后会使用 mtime 缓存减少重复开销。
- 归档会话仍会保留在统计中，并标注“已归档”。
- OpenRouter 使用带日期的模型目录快照；这类金额会标记为 `estimated`。
- 不同币种不会自动换算；未知模型、relay、local 和订阅用量不会猜价。
- 同一项目的并发会话在时间线中合并为墙钟区间，项目 LLM/工具时长仍是累计工作量指标。

## 🙌 参与与许可

欢迎提交 Issue 和 Pull Request。项目采用 [MIT License](LICENSE)。

`╰(*°▽°*)╯` 祝你每次打开统计面板，都能更快看懂自己的开发节奏。
