<h1 align="center">DSH Usage</h1>

<p align="center"><strong>一眼看懂 DSH 的用量、时间和花费。</strong></p>
<p align="center">按项目整理会话，查看 Token、开发时长、模型费用和账户余额。</p>

<p align="center">
  <strong>简体中文</strong> · <a href="README.en.md">English</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@rongyi7/dsh-stats"><img src="https://img.shields.io/npm/v/@rongyi7/dsh-stats?color=1677ff&amp;label=npm" alt="npm version"></a>
  <a href="https://github.com/rongyishuaige7/dsh-stats/actions/workflows/ci.yml"><img src="https://github.com/rongyishuaige7/dsh-stats/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@rongyi7/dsh-stats?color=8b5cf6" alt="license"></a>
</p>

> **DSH 记录每次对话，DSH Usage 帮你看清每个项目用了多少。** `(｡•̀ᴗ-)✧`

`DSH Usage` 是面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web 端的本地用量面板。它会按项目、日期和模型整理 DSH 会话；无法确认价格时会明确标记，不会硬猜。

<p align="center"><strong>按项目看用量</strong> · <strong>按模型算费用</strong> · <strong>密钥留在本机</strong> · <strong>数据一键导出</strong></p>

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/overview.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/hero-overview.png" alt="浅色模式项目总览：汇总指标与项目身份均已脱敏" width="100%"></a>
  <br>
  <sub>浅色模式 · 项目身份已打码 · 点击查看完整项目总览</sub>
</p>

> 截图不包含 API Key、Cookie、管理令牌或会话内容；项目身份已打码，余额与额度使用演示值。费用依据公开 API 计价规则推算，最终以 Provider 账单为准。

## 🚀 快速开始

需要已安装的 DeepSeek Harness `web` profile，以及 Node.js `>= 22`。

兼容 Harness `0.1.3-alpha.2` 至 `0.2.1-rc.2`。`0.1.5-rc.3` 和 `0.1.7-rc.2` 已在完整 Web 宿主中验证，`0.2.1-rc.2` 已通过真实模块契约检查，其余版本通过真实模块接口检查，详见 [兼容性矩阵](docs/compatibility.md)。Harness 0.1.7+ 需要插件 0.4.1 及以上，0.4.0 在 0.1.7+ 上无法加载。

```bash
dsh plugin --profile web add @rongyi7/dsh-stats
```

安装后完整重启正在运行的 DSH Web：

```bash
dsh web
```

重新打开页面，侧边栏底部会出现「用量」入口。

> **名称说明**：界面品牌现在叫 **DSH Usage**。为避免已安装用户的 profile 和远程接口失效，当前安装包仍使用 `@rongyi7/dsh-stats`；安装命令暂时不变。

<details>
<summary><strong>固定版本、本地 tarball 与注册验证</strong></summary>

固定版本：

```bash
dsh plugin --profile web add @rongyi7/dsh-stats@0.5.0
```

安装本地 tarball：

```bash
dsh plugin --profile web add ./rongyi7-dsh-stats-0.5.0.tgz
```

验证插件是否已注册：

```bash
dsh --profile web --dump-config
```

输出中应能看到 `stats` 和 `@rongyi7/dsh-stats`。**不要**用 `npm install --prefix ~/.dsh/profiles/web ...` 直接改写 DSH profile；profile 由 pnpm 管理，官方 `dsh plugin` 命令会处理依赖和 bundle 注册。

若新版 pnpm 提示 `ERR_PNPM_ADDING_TO_ROOT`，使用 `dsh plugin --profile web add -w @rongyi7/dsh-stats`。这里的 workspace root 是该 Web profile 的目录。
</details>

## ✨ 核心能力

| 能力 | 你能看到什么 |
| --- | --- |
| 📊 项目用量 | 每个项目用了多少 Token、花了多少时间和费用。 |
| ⏱️ 开发时间 | 按日查看项目泳道、费用/Token 柱和半小时明细；全部模式用日历矩阵按 30 天分页。 |
| 📈 趋势与模型 | 查看近 7 / 30 / 90 天变化，找出最常用的模型和项目。 |
| 💳 费用估算 | 按公开模型价格换算成人民币；无法确认的部分不会乱算。 |
| 👤 余额与额度 | 查看已配置平台的余额和套餐额度。 |
| 🔒 安全与导出 | 密钥只在本机使用，统计数据可导出为 CSV/JSON。 |

项目总览使用固定高度的面板和单一正文滚动区，KPI、指标条、筛选、项目表和展开的会话明细都在这里滚动；项目每页 50 个、会话每页 100 条，翻页不会改变顶部汇总。模型分布最多同时展示 3 个模型。 `(ง •̀_•́)ง`

## 🖼️ 界面导览

以下均为真实运行界面的浅色模式截图。复杂视图改为全宽展示，点击图片可以查看原始尺寸。

### 项目总览

费用优先的 KPI 区、Token 结构与活跃时段指标条、7 列项目表和筛选弹层；项目可按任意列排序，表头吸顶，行内展开后还有项目级轮/步、工具、首 token、tok/s 和会话明细。

键盘操作：`Tab` 在面板内循环；`Esc` 依次关闭筛选、菜单和价格抽屉，最后关闭面板；表头按钮按 `Enter` 排序，展开按钮按 `Enter` 展开/收起。

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/overview.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/overview.png" alt="项目身份已打码的完整项目总览界面" width="100%"></a>
</p>

### 开发时间线

按日视图把项目排成泳道，上方是每半小时的费用或 Token 柱；点色条或柱子查看这半小时的明细，展开泳道可以打开会话。全部模式改为日历矩阵，每页 30 天，点格子进入当天。

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/timeline.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/timeline.png" alt="开发时间线按日视图（夹具数据）" width="100%"></a>
</p>
<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/timeline-all.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/timeline-all.png" alt="开发时间线全部模式日历矩阵（夹具数据）" width="100%"></a>
</p>

### 用量趋势

范围可选近 7 / 30 / 90 天，指标可在费用和 Token 之间切换。上方摘要条给出区间合计、日均和最常用模型，中间是每日柱图，下面是固定 26 周的活动热力图，末尾按当前指标列出模型占比。点柱子或热力格会跳到那天的总览。趋势页和总览、时间线共用"筛选项目"，隐藏的项目不计入；热力图的"当前连续"指一直连到今天或昨天的连续天数。

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/trends.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/trends.png" alt="用量趋势、活动热力图和模型分布界面" width="100%"></a>
</p>

### 账户余额与额度

一屏列出所有已接入账户，按紧急程度排序：额度或余额快用完、凭证失效、快照过期的账户排在最前面。多账户时顶部摘要条按币种合计可用余额，并给出最紧的额度和需要关注的账户数；每行显示余额构成，或每个订阅窗口的剩余额度条。可以给每个余额账户设一条提醒线，只保存在当前浏览器。单个账户刷新失败只影响它自己那一行；整次查询失败时，头部状态点变黄并出现带重试的横幅，已有账户行保持可见。账户页不提供导出，因为余额属于实时快照，不属于历史统计。

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/balance.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/balance.png" alt="多账户余额列表、摘要条和未接入组" width="100%"></a>
</p>

项目总览、开发时间线和用量趋势支持 CSV/JSON 导出。

## 💰 计价规则

所有价格按“每百万 Token”计算。Provider 的原始规则可能使用 USD，但消费汇总会统一换算为人民币（CNY），界面和消费导出只显示人民币。当前使用固定汇率快照：`1 USD = 6.7205 CNY`，日期为 `2026-08-26`，来源为 [Frankfurter](https://api.frankfurter.app/2026-08-26?from=USD&to=CNY)。计价内核会同时考虑上下文长度、服务档、缓存类型和生效时间，并把规则来源与估算状态写入导出字段，方便复核；账户余额页面仍保留 Provider 原生币种。

| Provider | 当前内置模型 | 计价特点 |
| --- | --- | --- |
| [DeepSeek](https://api-docs.deepseek.com/zh-cn/quick_start/pricing) | `deepseek-v4-pro`、`deepseek-v4-flash` | CNY；按北京时间 30 分钟槽区分历史价、峰时价和非峰时价。 |
| [MiniMax](https://platform.minimaxi.com/docs/guides/pricing-paygo) | `MiniMax-M3`、`MiniMax-M2.7`、`MiniMax-M2.7-highspeed` | CNY；M3 区分 standard/priority 与 `<=512K`/`>512K` 上下文。 |
| [OpenAI](https://developers.openai.com/api/docs/pricing) | `gpt-6-astra`、`gpt-5.6-sol`、`gpt-5.6-terra`、`gpt-5.6-luna`、`gpt-5.6-cyber`、`gpt-5.4`、`gpt-5.4-mini` | 原始价为 USD；Astra 按 2026-09-17 核验价，支持 `272K` 上下文分档及 Batch/Flex/Priority；其他模型保留各自核验日期；`gpt-5.4` 系列缓存写入价缺失时按输入价保守估算。 |
| [Anthropic](https://docs.anthropic.com/en/docs/about-claude/pricing) | Claude Opus 5、Sonnet 5、Sonnet 4.6、Haiku 4.5 | USD；缓存写入时长不可得时明确标记为估算。 |
| [Google](https://ai.google.dev/gemini-api/docs/pricing) | Gemini 3.7 Flash、3.1 Pro Preview、2.5 Pro/Flash | USD；支持 `200K` 上下文分档，缓存存储时长缺失时标记为估算。 |
| [Moonshot/Kimi](https://platform.kimi.com/docs/pricing/chat.md) | Kimi K3、K2.7 Code/Highspeed、K2.6 | CNY；按官方模型规则计价。 |
| [Z.ai](https://docs.z.ai/guides/overview/pricing) | GLM 5.2、5.1、5、5 Turbo、4.7、4.7 FlashX/Flash | USD；按官方模型规则计价。 |
| [OpenRouter](https://openrouter.ai/api/v1/models) | 主流 OpenAI、Anthropic、Google、Kimi、GLM 路由快照 | USD；目录价格是带日期的快照，因此状态为 estimated。 |

计价优先按 **Provider-scoped** 规则处理：明确识别为官方 Provider 的请求命中官方价并标记为 `exact`；DSH 透传渠道 `nbdeepseek` 与 `deepseek-modlens` 明确沿用 DeepSeek 官方 API 计价。对于未知或 API-compatible Provider，如果模型名唯一匹配一条官方模型规则，或在 token 边界上以**最长已知全称**唯一匹配一条官方模型规则（例如区域/部署后缀），会保留原始 Provider 并标记为 `estimated`，再按上述汇率换算为人民币；这是按公开价推算，不代表中转服务的实际账单。`-mini`、`-pro`、`-vision`、`:batch`、`:free` 等价格敏感后缀不会被猜测。`estimated` 状态继续写入 CSV/JSON 供审计，但界面不再显示约等于符号。显式 `relay`、`local` 未配置自定义费率时，以及订阅/Token Plan、未知模型或多条规则冲突时不会猜价，这些会话不进入主费用汇总，并在会话详情与 `meta.warnings` 中标注原因。

### 价格设置与自动更新

主界面统一显示“预估费用”：有价格显示 `¥12.34`，部分用量缺价显示 `¥12.34*`，没有可用价格显示“待计价”。点击费用旁的 ⓘ 查看说明。

头部的齿轮图标会从右侧打开“计价设置”抽屉，桌面宽 560px，窄屏使用面板全宽。抽屉固定三个分区：

- **模型价格**：默认优先展示已用模型，可切换全部、搜索或按模型组分页（每页 25 个模型组）。点开模型可查看完整 Provider/模型、当前规则、来源与折叠的“其他时期价格”；简单价显示输入/输出摘要，复杂价显示“分档价格 · N 条当前规则”。待计价模型可直接“设置价格”。
- **自定义规则**：规则列表与添加/编辑页分开。填写供应商 ID、模型 ID 和每百万 token 单价；留空表示缺价，填 `0` 才表示免费。更多条件支持有效期、账户类型、上下文阈值和服务档倍率。未指定生效时间时，历史用量按该费率估算；指定时间后，规则只在对应时间范围内生效。生效和失效时间与面板其余部分一样按北京时间（UTC+8）填写和显示。加入/更新草稿、待移除与撤销都在本地规则集合中完成；表单还有未加入的修改时不能预览或保存。底栏统一提供“预览影响 / 保存 / 取消修改”。
- **更新与版本**：展示当前目录的完整版本号、真实发布时间、上次检查/成功同步时间、自动更新草稿和历史目录快照。自动更新开关修改后需要预览并保存才生效。历史目录快照初始显示最近 5 个，每次“查看更多”追加 5 个；恢复会替换整个目录并暂停自动更新，已保存的自定义规则保留。固定版本时两个“检查更新”入口都禁用；重新开启自动更新并保存只解除固定，不会自动下载，之后可手动检查。未固定且自动更新关闭时仍允许手动检查。更新失败继续使用上次有效版本。

模型详情里的“其他时期价格”只是该模型的历史规则；更新与版本里的“历史目录快照”是整个签名目录的版本，两者不是同一层数据。供应商自定义价格优先于公共目录。订阅用量仍不折算成 API 费用。

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/prices-drawer.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/prices-drawer.png" alt="计价设置抽屉：模型价格、自定义规则、更新与版本" width="100%"></a>
</p>

宿主启动及每小时检查经过签名的价格目录，遇到缺价模型会触发有冷却时间的检查；也可立即更新、关闭自动更新或恢复历史版本。自动更新只下载公共目录，不上传会话或凭证。

维护端每 30 分钟采集：OpenRouter 文本模型的简单结构化费率通过验证后自动发布；OpenAI、Anthropic、Google 官方页面上的**新模型标准价**会自动写入为 provisional 并签名发布，界面标记“自动接入，待复核”。已有模型的调价、退役/受限模型、缺失字段、歧义别名仍进入复核报告，不自动改写。Meta 的开放权重模型没有统一官方 token 价，按实际托管商/OpenRouter 路由处理。未确认的模型继续显示“待计价”。费率保留历史时间区间；USD 按用量日期选择目录中的汇率快照，缺少更早汇率时使用最早快照并保留估算依据。汇率快照由维护端复核更新，不随实时汇率浮动。

本地目录位于 `$DSH_HOME/plugins/dsh-stats/pricing/`（默认 `~/.dsh/plugins/dsh-stats/pricing/`），包含有效价格、历史目录与自定义设置修订。原始 token 日志不会被改写。浏览器离线降级会标明“本地摘要 · 内置价格”。维护和签名说明见 [动态价格设计](docs/pricing-updates.md)。

### 消费状态怎么读

| 状态 | 含义 |
| --- | --- |
| `exact` | 每一条有价用量都命中确定的内置规则。 |
| `estimated` | 有金额，但至少一条记录来自动态价格快照、缺少会影响价格的元数据，或未知 API Provider 借用了唯一匹配或最长已知全称前缀匹配的官方模型价；界面显示计算后的人民币金额，估算状态仅在数据与导出字段中保留。 |
| `free` | 命中的用量全部免费；汇总会保留零金额，不会误显示为未知消费。 |
| `partial` | 一部分用量可计价，另一部分无法安全计价；主汇总显示已计价 CNY 并加 `*`，点击可查看说明。 |
| `unsupported` | 没有足够可靠的规则；该会话不计入费用合计，界面显示“待计价”。 |

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

Harness 0.1.7 新增的 DeepSeek 账户登录方式（`deepseek-account`）不使用 API Key，官方余额接口无法查询，账户页不会列出它；API Key 方式照常查询。

Provider 配置中的 `accountApiKeyEnv` 可以覆盖默认引用。查询结果缓存 5 分钟并合并并发请求，点击刷新会明确绕过这层缓存。单个账户遇到网络错误、限流或异常响应时，会保留该账户上一次成功快照并标为“已过期”；整次查询失败时，头部状态点变黄并出现带重试的横幅，已有账户行保持可见。未声明账户类型的 MiniMax 旧配置继续默认使用 Coding Plan；显式配置 `accountType: api` 时不会当作订阅额度查询。没有公开余额接口的 Provider 仍可正常统计 Token，只会在账户页显示“不支持”。

## 🔐 凭证与隐私边界

- 凭证只通过 DSH 宿主的 `credentials` service 解析，绝不进入前端 bundle、RPC 日志或 CSV/JSON 导出。
- 账户适配器只允许固定的官方 HTTPS 域名，只发 GET 请求，拒绝重定向，15 秒超时，响应体上限 1 MiB。
- 不要把真实 API Key、Cookie、Management Key、`auth.json` 或 `.credentials.yaml` 提交到 Git、公开 issue，或粘贴给 Agent。
- 本仓库的截图仅用于说明布局；项目名统一为 `********`，路径为 `/workspace/********`，会话标识已替换。余额金额和 MiniMax 额度为演示值，仅保留所选“全部”视图的汇总日期与用量指标。

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

原始会话日志可能没有保存 Provider/模型字段。尤其是模型字段缺失时，无法知道该用哪一条官方规则，因此显示 `(unknown)`；如果模型名存在但 Provider 未知且能唯一匹配官方规则，或能按最长已知全称前缀唯一匹配，面板会显示模型和按公开价计算的人民币金额，同时在数据中保留 `estimated` 状态；价格敏感后缀（如 `-mini`、`:batch`）不会被猜测。无法唯一匹配时仍显示未知，不会制造虚假的消费金额。
</details>

<details>
<summary><strong>为什么某些会话没有费用？</strong></summary>

主费用汇总只展示能够确认并换算为人民币的金额。归档且无日志的 fork、未知模型、显式 relay/local 或订阅用量不会猜价，因此从主汇总排除；会话详情、告警和导出字段会保留 `costStatus`、`ruleId`、`pricingSource`、Provider、模型身份及排除原因，便于逐条定位。
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
src/host-sessions.js      # 会话日志发现、zstd 解码、投影状态与会话信息
src/host-usage.js         # 时间槽时长与计价后的用量分段
src/host-balance.js       # 旧版 DeepSeek 余额 RPC
src/host-util.js          # 宿主常量与日期、身份、文件辅助函数
src/client.cjs            # 客户端入口、React 视图与 apply()
src/client-format.cjs     # 格式化与人民币费用计算
src/client-data.cjs       # 日期窗口、投影聚合、时间线与趋势数据
src/client-remote.cjs     # Typert 远程描述符、账户 RPC 与会话跳转
src/client-locale.cjs     # 中英文界面文案
src/client-styles.cjs     # 面板样式
src/pricing.cjs           # Provider 级、按生效时间的计价内核
src/route-data.cjs        # 保留单请求上下文与调用次数的不可变用量索引
src/accounts.js           # 官方余额/额度适配器（仅宿主使用凭证）
src/rpc-schemas.cjs       # 宿主与浏览器共用 RPC schema
src/typert-host.js        # 宿主 Typert manifest
src/typert-remote-client.js # 客户端 RPC 描述符
scripts/build.mjs         # esbuild 构建脚本
lib/                      # 构建产物（随包发布）
```

修改 `src/` 后，执行 `npm run build`；发布前 `prepublishOnly` 会自动重建。更多集成背景、性能权衡和已知踩坑见 [DESIGN.md](DESIGN.md)。

`npm run smoke:browser` 使用独立测试数据检查桌面和手机界面，不查询真实账户。新版 Harness 的接口检查命令见 [兼容性矩阵](docs/compatibility.md)，本轮修复及性能验证见 [维护记录](docs/reliability-2026-09.md)。

发布前检查：

```bash
npm run build
npm test
npm pack --dry-run
npm publish
```

## ⚠️ 已知限制

- 当前会话的 projection cache 可能滞后几秒，面板每 60 秒自动刷新。
- 头部状态点和横幅显示数据来源、刷新失败和未完整计价状态。账户刷新失败会保留该账户上次成功的快照并标注已过期；整次查询失败时头部显示“快照已过期”并提供重试。普通 RPC 错误不会触发仅支持 DeepSeek 的旧版账户回退。
- 首次读取大量会话时，宿主优先使用官方 projection cache 的 watermark 增量读取；旧宿主才回退解码日志，并使用 mtime 缓存减少重复开销。
- 普通归档会话会标注“已归档”；归档、无日志且只有继承 cache 的 fork 会从统计中排除，并在告警中说明原因。
- OpenRouter 使用带日期的模型目录快照；这类金额会标记为 `estimated`。
- 消费统计固定统一为人民币，USD 使用文档记录的汇率快照换算；汇率会随日期变化，旧统计不会在每次打开面板时重新联网改写。未知 API Provider 仅在模型唯一匹配、或按最长已知全称前缀唯一匹配官方规则时给出 `estimated`，显式 relay/local、未知模型、价格敏感后缀、歧义规则和订阅用量不会猜价。
- 同一项目的并发会话在时间线中合并为墙钟区间，项目 LLM/工具时长仍是累计工作量指标。

## 🙌 参与与许可

欢迎提交 Issue 和 Pull Request。项目采用 [MIT License](LICENSE)。

`╰(*°▽°*)╯` 祝你每次打开用量面板，都能更快看懂自己的开发节奏。
