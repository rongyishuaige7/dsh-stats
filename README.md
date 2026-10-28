<h1 align="center">DSH Usage</h1>

<p align="center">DeepSeek Harness 的用量面板：按项目看 Token、开发时间和预估费用，也能查已配置账户的余额与订阅额度。</p>

<p align="center">
  <strong>简体中文</strong> · <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/README.en.md">English</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@rongyi7/dsh-stats"><img src="https://img.shields.io/npm/v/@rongyi7/dsh-stats?color=1677ff&amp;label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@rongyi7/dsh-stats"><img src="https://img.shields.io/npm/dm/%40rongyi7%2Fdsh-stats?label=downloads" alt="npm monthly downloads"></a>
  <a href="https://github.com/rongyishuaige7/dsh-stats/actions/workflows/ci.yml"><img src="https://github.com/rongyishuaige7/dsh-stats/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@rongyi7/dsh-stats?color=8b5cf6" alt="license"></a>
</p>

DSH Usage 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的用量统计插件，支持桌面端和 Web。它读取 DSH 的会话记录，按项目、日期和模型整理 Token、开发时间和预估费用；无法确认价格的部分会标出来，不会硬猜。`(｡•̀ᴗ-)✧`

界面品牌叫 **DSH Usage**，安装包名仍是 **`@rongyi7/dsh-stats`**（沿用已安装 profile 的依赖名），两者是同一个插件。

> **和其它用量插件的关系**：本项目只在侧边栏底部加一个「用量」入口，面板是独立浮层，不占用会话输入区、不改动会话界面。已经装了会话级费用挂件的用户可以直接叠加：它们回答「这一轮花了多少」，这里回答「这个月在各项目上花了多少」。

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/overview.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/hero-overview.png" alt="浅色模式的项目总览：预估费用、Token 构成与项目表" width="100%"></a>
  <br>
  <sub>浅色模式 · 桌面端真实数据，敏感信息已打码 · 点击查看完整总览</sub>
</p>

> 除账户余额页外，截图来自桌面端实拍；项目名、路径、会话标题、账户名和金额已打码为 xxxx。余额页仍使用隔离夹具的演示数据。截图不包含 API Key、Cookie、管理令牌或会话内容。费用按公开价格推算，最终以 Provider 账单为准。

## 📦 安装

插件装进 DSH 的 profile。桌面端和 Web 是两个 profile（`desktop`、`web`），装到其中一个不会同时装到另一个。

### 推荐：插件市场（DSH 0.2.1 及以上）

在「设置 → 插件市场」搜索 **`dsh-stats`**，一键安装。

市场列表来自 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)，本插件已收录，[条目页在此](https://awesome-dsh-plugin.com/p/rongyishuaige7/dsh-stats/)。如果市场里一时搜不到，通常是本地还没同步到最新索引（索引每天更新一次），用下面的命令行方式安装即可。

### 命令行安装

两条命令里的 `-w` 是 pnpm 的 workspace 安装选项，不是文件路径。

#### 桌面端

用桌面应用自带的 CLI 安装（macOS 路径如下，其他系统用应用目录里对应的 `dsh`）：

```bash
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin \
  --profile desktop add -w @rongyi7/dsh-stats
```

装完完整退出 DSH（macOS 用 Cmd+Q，不是只关窗口），再重新打开。侧边栏底部的「用量」就是入口。

桌面 profile 由应用自己管理：用 npm 单独安装的 `dsh` 会直接拒绝操作 `desktop` profile。更多细节见[使用指南](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/usage-guide.md#11-桌面端)。

#### Web

```bash
dsh plugin --profile web add -w @rongyi7/dsh-stats
```

然后重启 Web 宿主（`dsh web`），刷新页面。只刷新浏览器不会重新加载宿主侧插件。

自定义 profile 把 `desktop` / `web` 换成实际名称即可。

### 版本与要求

插件要求 Node.js 22 或更高；桌面端自带运行时，不需要另外安装 Node。

npm 上的稳定版是 `0.5.1`（2026-10-23 发布），桌面端和 Web 都可以直接安装，下面的界面说明按这个版本写。`0.5.1` 是 `0.5.0` 的修正版本：界面和价格目录不变，peer 范围不变，RPC 只新增一个可选字段（旧数据仍然合法），主要修的是统计、计价和状态判断里的边界错误。`0.4.3` 声明的 Harness peer 范围虽然也覆盖 `0.2.1-rc.2`（宿主检查允许预发布版本参与，因此会被加载），但验证只做到 `0.2.0-rc.2`；升级到 `0.5.1` 才是已验证的组合。

主分支已准备好 `0.5.2`（价格目录更新韧性补丁），在它发布之前 npm 上仍是 `0.5.1`；差异见下方的 0.5.2 发布说明。

固定版本、本地 tarball、注册验证、升级卸载和 pnpm 排错，见[使用指南的安装部分](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/usage-guide.md#1-安装)。

## 🖼️ 界面

面板有四个标签页，头部固定显示数据来源状态、刷新、导出、计价设置和关闭。面板标题「DSH 用量」本身是项目仓库入口，点击会在新窗口打开 GitHub。

键盘：`Tab` 在面板内循环，`Esc` 逐层关闭筛选、菜单和价格抽屉、最后关闭面板，表头按钮按 `Enter` 排序，展开按钮按 `Enter` 展开或收起。

### 项目总览

按项目看用量和预估费用：表格可按任意列排序，展开项目查看轮/步、工具时长、首 token、tok/s 和会话明细；右上角可以搜索并隐藏项目，隐藏的项目不计入指标和趋势。项目每页 50 个、会话每页 100 条，翻页不改变顶部汇总。

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/overview.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/overview.png" alt="项目总览：汇总指标与项目表（真实数据，敏感信息已打码）" width="100%"></a>
</p>

### 开发时间线

按日视图把项目排成泳道，上方每根柱子是半小时的费用或 Token，点色条或柱子看这半小时的明细，展开泳道打开会话。全部模式是日历矩阵，每页 30 天，点格子进入当天。

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/timeline.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/timeline.png?v=2" alt="开发时间线按日视图（真实数据，敏感信息已打码）" width="100%"></a>
</p>
<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/timeline-all.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/timeline-all.png?v=3" alt="开发时间线全部模式日历矩阵（真实数据，敏感信息已打码）" width="100%"></a>
</p>

### 用量趋势

范围可选近 7 / 30 / 90 天，指标可在费用和 Token 之间切换。上方摘要给出区间合计、日均和最常用模型，中间是每日柱图，下面是固定 26 周的活动热力图，末尾按当前指标列出模型占比。点柱子或热力格会跳到那天的总览。

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/trends.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/trends.png" alt="用量趋势、活动热力图和模型占比（真实数据，敏感信息已打码）" width="100%"></a>
</p>

### 账户余额

一屏列出所有已接入账户，按紧急程度排序：额度或余额快用完、凭证失效、快照过期的账户排在最前面。多账户时顶部按币种合计可用余额，并给出最紧的额度和需要关注的账户数。每个余额账户可以设一条提醒线，只保存在当前浏览器。

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/balance.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/balance.png" alt="多账户余额列表、摘要条和未接入组（演示数据）" width="100%"></a>
</p>

### 计价设置

头部的齿轮图标打开计价设置抽屉，固定三个分区：模型价格、自定义规则、更新与版本。模型价格里可以搜索模型、查看当前规则和历史规则；自定义规则填好后先「预览影响」再保存；更新与版本管理自动更新开关、固定版本和历史目录快照。

<p align="center">
  <a href="https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/images/prices-drawer.png"><img src="https://raw.githubusercontent.com/rongyishuaige7/dsh-stats/main/docs/images/prices-drawer.png" alt="计价设置抽屉：模型价格、自定义规则、更新与版本（真实数据，敏感信息已打码）" width="100%"></a>
</p>

## 💰 数据与费用

- **费用是估算**。价格按每百万 Token 计算，界面和汇总统一用人民币；USD 原价按固定汇率快照 `1 USD = 6.7205 CNY`（`2026-08-26`，[Frankfurter](https://api.frankfurter.app/2026-08-26?from=USD&to=CNY)）换算，换算后的金额算作估算，不随实时汇率浮动。JSON 导出保留每条用量的原币金额和所用汇率，方便审计。
- **三种金额**：`¥12.34` 是已计价，`¥12.34*` 是部分用量未计价，没有可用规则时显示「待计价」。点费用旁的 ⓘ 看说明。
- **订阅不折算**。订阅和 Token Plan 用量不会变成 API 费用；未知模型、显式 relay/local 且没配费率、规则冲突的会话也不猜价，不计入主汇总。原因在会话详情里，导出保留 `costStatus`、`ruleId`、`pricingSource` 供定位。
- **标题状态点**跟着当前标签页：统计页描述统计数据从哪来（「已同步」「数据不完整」「快照已过期」「本地摘要 · 内置价格」），账户页描述这次账户查询的结果。
- **内容上方的横幅**用另一套文案：「快照已过期」对应「刷新失败，显示上次快照」，「本地摘要 · 内置价格」对应「回退数据，可能不完整」。有错误信息时才展开「数据诊断」；只有状态为过期或回退、且宿主仍提供对应 RPC 时才出现重试。
- **数据来源和单价是两件事**。状态点描述的是数据从哪来，金额本身另有一套 `exact` / `estimated` / `free` / `partial` / `unsupported` 状态。
- **凭证只在宿主侧使用**。账户查询由 DSH 宿主读取凭证并请求各 Provider 的官方接口，凭证不进入前端 bundle、RPC 日志或 CSV/JSON 导出。
- **导出范围**。项目总览、开发时间线和用量趋势支持 CSV/JSON，导出的是当前日期或区间选中的项目；账户余额是实时快照，不提供导出。
- **时区**。时间线、峰谷时段和计价规则的生效时间都用北京时间（UTC+8），不受宿主机时区影响。

计价状态、Provider 匹配规则、自定义规则与目录更新的完整说明见[使用指南的计价部分](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/usage-guide.md#3-计价与费用)；价格目录的采集和签名见[动态价格设计](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/pricing-updates.md)。

## ❓ 常见问题

<details>
<summary><strong>装完为什么侧边栏没有「用量」？</strong></summary>

先确认安装命令成功，再完整重启宿主（桌面端退出应用，Web 重启 `dsh web`），浏览器必要时硬刷新。DSH 会缓存客户端模块和 Typert 描述符。确认装的是目标 profile：装到 `web` 不会同时出现在 `desktop`。
</details>

<details>
<summary><strong>为什么费用看起来不全？</strong></summary>

主费用汇总只包含能确认并换算成人民币的金额。订阅用量、未知模型、显式 relay/local、归档且无日志的 fork 都不猜价，因此被排除；原因在会话详情里，导出保留 `costStatus`、`ruleId` 和 `pricingSource`，可以逐条定位。
</details>

<details>
<summary><strong>为什么账户页查不到某个账户？</strong></summary>

账户查询走各 Provider 的官方余额接口。没有公开接口的 Provider 会列在账户页的「未接入」组并说明原因，Token 统计不受影响；已配置接口但缺少凭证的账户会单独标出缺少的变量名。DeepSeek 的 `deepseek-account` 登录方式没有 API Key，查不到余额。凭证变量和覆盖方式见[使用指南的账户部分](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/usage-guide.md#4-账户与凭证)。
</details>

<details>
<summary><strong>怎么更新？</strong></summary>

重新执行对应 profile 的安装命令并指定目标版本，然后按安装时的方式重启。价格目录是独立更新的：宿主启动时和之后每小时检查签名目录，不需要为调价重装插件。
</details>

## ⚠️ 已知限制

- 当前会话的 projection cache 可能滞后几秒，面板每 60 秒自动刷新。
- 普通归档会话会标注「已归档」；归档、无日志且只有继承 cache 的 fork 会从统计中排除。
- OpenRouter 使用带日期的模型目录快照，这类金额会标记为 `estimated`。
- 同一项目的并发会话在时间线中合并为墙钟区间，项目 LLM/工具时长仍是累计工作量指标。

## 🛠️ 开发与文档

```bash
npm ci
npm run build
npm test
```

`lib/` 是发布产物，请修改 `src/` 后重新构建，不要手工编辑。`npm run verify:lib` 会重建并检查产物是否已提交；执行一次 `git config core.hooksPath .githooks` 后，`pre-push` 会在推送前跑同一项检查。架构、数据契约和性能权衡见 [DESIGN.md](https://github.com/rongyishuaige7/dsh-stats/blob/main/DESIGN.md)，逐版本的模块契约、完整 Web 与浏览器夹具结果见[兼容性矩阵](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/compatibility.md)，`npm run smoke:browser` 使用隔离夹具检查桌面和手机界面。

文档索引：

- [使用指南](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/usage-guide.md)（中文）· [Usage guide](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/usage-guide.en.md)（English）
- [动态价格设计与维护](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/pricing-updates.md)
- [兼容性矩阵](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/compatibility.md)
- [0.5.2 发布说明](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/release-0.5.2.md) · [0.5.1 发布说明](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/release-0.5.1.md) · [0.5.0 发布说明](https://github.com/rongyishuaige7/dsh-stats/blob/main/docs/release-0.5.0.md)

## 🙌 参与与许可

欢迎在 [Issues](https://github.com/rongyishuaige7/dsh-stats/issues) 反馈问题，或提交 Pull Request。项目采用 [MIT License](https://github.com/rongyishuaige7/dsh-stats/blob/main/LICENSE)。

`╰(*°▽°*)╯`
