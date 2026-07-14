# AI 小说创作工作台 / AI Novel Production Engine
一个面向长篇小说创作的 AI Native 开源项目。

当前开发主线：
`Creative Hub + 自动导演开书 + 本书世界上下文 + 整本生产主链 + 写法引擎`

![Monorepo](https://img.shields.io/badge/Monorepo-pnpm%20workspace-3C873A)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB)
![Backend](https://img.shields.io/badge/Backend-Express%20%2B%20Prisma-111827)
![LangChain](https://img.shields.io/badge/AI-LangChain-0EA5E9)
![LangGraph](https://img.shields.io/badge/Agent-LangGraph-7C3AED)
![Editor](https://img.shields.io/badge/Editor-Plate-7C3AED)
![Database](https://img.shields.io/badge/Database-SQLite%20%2B%20Prisma-111827)
![Vector DB](https://img.shields.io/badge/RAG-Qdrant-E63946)

## ✨ 项目简介

这是一个**面向长篇小说的 AI 生产系统**——专注于小说创作，不涉及漫剧、短剧、漫画等其他内容方向。

它不再是”你写一句，AI补一句”的聊天模式，而是：

- 👉 从一个想法出发（也可以直接带着完整大纲来）
- 👉 自动构建世界观、人物、剧情结构
- 👉 管理知识与设定（RAG）
- 👉 控制写作风格与叙事一致性
- 👉 最终生成完整章节甚至整本小说

## 项目定位

很多 AI 写作工具的使用方式其实差不多：
- 你输入一句 Prompt
- 它回你一段正文
- 不满意就重试
- 写短篇还行，写长篇容易越写越散

这个仓库是”AI 导演式长篇小说生产系统”，而不是传统的写作聊天壳子。

它最核心的产品判断是：

- **不限于新手**：即使你带着完整大纲、详细人设甚至已有章节进来，系统也能承接并帮你推进。
- **只做小说**：专注长篇小说创作，不分散精力做漫剧、短剧、漫画等其他内容方向。
- 优先解决”如何把整本书写完”，再逐步优化”写得多精巧”。
- AI 不只是一个补全文本的模型，而是参与规划、判断、调度、执行和追踪的系统角色。

如果你正在找的是下面这种项目，这个仓库会更值得关注：

- 想验证 AI 是否真的能参与整本小说生产，而不是只写单段文案。
- 想研究 AI Native Product、Agent Workflow、LangGraph 编排怎样落到真实创作业务。
- 想把世界观、角色、拆书、知识库、写法控制和章节生成串成一套稳定工作流。

## 现在已经能做什么

### 1. AI 自动导演开书

- 可以从一句模糊灵感直接进入自动导演，不必先自己把世界观、主线、角色和卷纲全想完；系统会先整理项目设定、对齐书级 framing，再生成多套整本方向和对应标题组。
- 方案选择不再只是“满意就确认、不满意就整批重来”。如果第一轮方向不够准，可以继续生成下一轮；如果已经偏向某一套，也可以只让 AI 修这套方案，或者只重做这套的标题组。
- 自动导演创建时已经支持三种推进方式：`按重要阶段审核`、`自动推进到可开写`、`继续自动执行前 10 章`。对应链路会把书级方向、故事宏观规划、本书世界准备、角色准备、卷战略、节奏拆章和章节执行接成一条连续流程。
- 这条链路已经支持检查点恢复、现有项目接管、页内继续推进和换模型重试。到 `chapter_batch_ready` 之后，不仅能直接进入章节执行，也可以继续让 AI 自动执行前 10 章的写作、审校和修复。
- 自动导演里的角色阶段也不再无条件把第一套阵容直接落库。现在会优先生成可直接进入正文的人物资产；如果角色名仍像功能位、缺少身份锚点或质量不够稳定，系统会停在角色审核点，而不是继续把坏阵容带进后续卷规划和拆章。

### 2. Creative Hub 与 Agent Runtime

- `Creative Hub` 现在已经不只是一个聊天页，而是在往统一创作中枢收：对话、追问、规划、工具调用、执行状态和回合总结都在往这里并。
- 系统里已经有了比较明确的 Planner、Tool Registry、Runtime、审批节点、状态卡片和中断恢复链路，说明这个项目现在关注的已经不是“AI 会不会写字”，而是“AI 能不能组织一条真实的创作工作流”。
- 如果你关心的是 AI Native Product 怎么落地，这一块已经不是零散按钮拼盘了，而是开始长出一套值得继续往下做的骨架。

### 3. 整本生产主链

- 单章运行时、章节执行和整本批量 pipeline 现在都在往同一条主链上收，不再是“这里一个试写入口，那里一个批量按钮”的割裂状态。
- 已经可以从结构化规划、章节目录和资产准备状态出发，启动整本写作任务，并持续查看当前阶段、失败原因和下一步建议。
- 它当然还不是那种完全不用管的一键出书机，但也已经不是“只能演示几张截图”的阶段了，至少主链是真的能往前推。

### 4. 写法引擎

- 写法现在不再只是提示词里的一段长说明，而是可以保存、编辑、绑定、试写和复用的长期资产。
- 可以从现有文本里提取写法特征，并把原文样本一起保存下来，后面不是只能靠记忆去猜“当时那个味道到底怎么来的”。
- 提取出来的特征会沉淀成可见特征池，进入编辑页以后可以逐项启用、停用和组合，写法规则也会跟着同步重编译，便于后续试写、修正和整本绑定。
- 这意味着写法引擎现在已经开始真的参与生成、检测和修正链路，而不是一个摆在侧边栏里的概念功能。

### 5. 本书世界、角色、拆书、知识库联动

- 世界观已经不只是大段设定文本，而是可以从世界意图生成世界骨架，再沉淀成世界手册、规则、势力、地点、关系和冲突入口。
- 每本小说可以拥有自己的本书世界：从世界库导入、按本书主题生成、手动同步差异，或保存回世界库复用。
- 世界地图和势力图谱会进入章节上下文，角色准备也能结合势力倾向、世界规则和身份边界生成更贴合舞台的人物。
- 拆书结果和知识库文档可以继续回灌到规划、续写和正文生成；系统会按当前章节任务、角色和冲突检索相关上下文，而不是只靠一次性提示词。

### 6. 模型路由与本地运行

- 已经支持 OpenAI、DeepSeek、SiliconFlow、xAI 等多提供商配置，规划、正文、审阅这些链路可以按路由拆开配。
- 前后端已经完成 Monorepo 拆分，适合本地持续开发，也比较适合继续往 Prompt Registry、Workflow Registry 和 Runtime 这条路上扩。
- 默认使用 SQLite 就能把主链先跑起来；如果你要完整体验知识库 / RAG，再按需接 Qdrant 就行，不需要一上来就把所有基础设施堆满。

## 典型使用路径

1. 在小说创建页输入一句灵感，先让 AI 自动导演给出整本方向候选。
2. 进入 `项目设定`，先把题材、卖点、目标读者感受和前 30 章承诺定下来。
3. 用 `故事宏观规划`、`本书世界` 和 `角色准备`，把整本主线、舞台边界和角色网补到能写。
4. 进入 `卷战略 / 卷骨架` 决定怎么分卷，再到 `节奏 / 拆章` 把当前卷落到章节列表和单章细化。
5. 按需绑定拆书结果、知识库文档和写法资产，让后续正文不只是靠一次性提示词。
6. 进入 `章节执行` 逐章写作、审计、修复，必要时回到卷工作台做再平衡和重规划。
7. 想加速推进时，再启动整本生产任务，持续查看状态、失败原因和回灌结果。

## 长篇生成能力架构

- 开书定盘负责先把这本书”要写成什么样”说清楚，避免后面越写越散。
- 整本控制层和卷级规划层负责把长篇拆成可推进、可回看、可调整的结构，而不是一次性写死。
- 角色、世界观、写法、知识库和质量控制一起托住单章生成，让每一章都尽量还在同一本书里。
- 每写完一章，系统都会把新状态回灌回去，继续影响后续章节、卷级节奏和必要时的重规划。

## 最新更新

完整历史更新见 [docs/releases/release-notes.md](./docs/releases/release-notes.md)。

### v0.1.00（2026-07-14 定稿）

- 审校上下文增强：补齐 book_contract、story_macro、timeline 等全局字段
- 全局审校 + 跨章节回灌：从全书视角检测角色一致性、伏笔呼应等问题
- 角色重要度分级：lead/major/named/extratier 贯穿数据层到前端
- 批量润色：多章节风格检测与修复，支持进度追踪和取消
- 反馈 → GitHub Issue：FAB 按钮 + 上下文收集 + AI Issue 生成
- 角色资源系统、世界同步对比、日志中心、任务批量操作等 13 项功能

## 功能预览

> 截图待补充。带 * 标记的功能为本 fork 新增，上游 v0.32.0 不具备。

### 核心创作链路

| 功能 | 路由 | 说明 |
|------|------|------|
| Creative Hub | `/creative-hub` | 统一创作中枢，承载对话、规划、工具执行和创作推进 |
| 自动导演 | `/auto-director/follow-ups` | 从一句灵感出发，自动构建世界观、人物、剧情结构，支持检查点恢复和全书自动执行 |
| 项目设定 | `/novels/:id/setup` | 书级 framing、题材绑定、写法确认 |
| 故事宏观规划 | `/novels/:id/planning` | 故事引擎、推进摘要、长期对立、前 30 章承诺 |
| 角色准备 | `/novels/:id/characters` | AI 阵容方案、关系网、动态系统 |
| *角色重要度分级 | — | lead/major/named/extratier 贯穿数据层到前端，影响上下文详略 |
| 卷战略 / 卷骨架 | `/novels/:id/volumes` | 卷骨架、节奏板、版本控制与影响分析 |
| 节奏 / 拆章 | `/novels/:id/pace` | 节奏段列表、批量细化、单章任务单 |
| 章节执行 | `/novels/:id/production` | 正文写作、审核、修复、状态同步、伏笔回填 |
| *审校上下文增强 | — | 补齐 book_contract、story_macro、timeline 等全局字段到审校 prompt |
| *全局审校 | — | 从全书视角检测角色一致性、伏笔呼应、情节连贯性等跨章节问题，回灌逐章审校 |
| 小说预览 | `/novels/:id/preview` | 章节翻页预览，支持键盘快捷键 |

### 创作辅助

| 功能 | 路由 | 说明 |
|------|------|------|
| 写法引擎 | `/style-engine` | 写法资产保存、编辑、绑定、试写和复用；支持从文本提取写法特征 |
| 反 AI 规则 | `/anti-ai-rules` | 管理反 AI 检测规则，让正文更像人写 |
| 文笔资料库 | `/writing-techniques` | 收集、分类、检索写作技巧和范例 |
| 氛围写作参考卡 | `/atmosphere-cards` | 氛围卡辅助氛围创作 |
| 标题工坊 | `/titles` | 批量生成、筛选和微调书名与标题方向 |
| *批量润色 | — | 多章节风格检测与修复，支持进度追踪和取消 |

### 世界观与知识

| 功能 | 路由 | 说明 |
|------|------|------|
| 世界观 | `/worlds` | 世界骨架生成、世界手册、规则、势力、地点管理 |
| *世界同步对比 | — | 每本小说绑定自己的世界上下文，支持自动/手动对比同步差异 |
| 知识库 / RAG | `/knowledge` | 文档管理、向量索引、语义检索 |
| 拆书分析 | `/book-analysis` | 把参考作品拆成结构化知识，回灌创作链路 |

### 管理与配置

| 功能 | 路由 | 说明 |
|------|------|------|
| 角色库 | `/base-characters` | 维护角色基础档案（BaseCharacter） |
| 类型管理 | `/genres` | 题材与类型资产 |
| 流派管理 | `/story-modes` | 推进模式、兑现方式和冲突边界 |
| Prompt 工作台 | `/prompt-workbench` | 查看和调试系统 prompt |
| 模型配置 | `/settings` | 供应商 API Key、模型路由、连通性测试 |
| *反馈中心 | `/feedback` | 用户反馈收集 + AI 生成 GitHub Issue |

### 运维

| 功能 | 路由 | 说明 |
|------|------|------|
| 任务中心 | `/tasks` | 后台任务排队、执行、批量操作 |
| *日志中心 | `/logs` | 服务端日志查询 |

## 快速开始

### 环境要求

- Node.js `^20.19.0 || ^22.12.0 || >=24.0.0`
  推荐直接使用 `20.19.x LTS`
- pnpm `>= 10.6`
  推荐直接使用仓库声明的 `pnpm@10.6.0`
- 至少一组可用的 LLM API Key
  也可以先把项目跑起来，再在页面里配置
- 如果你要完整体验知识库 / RAG，再额外准备可用的 Qdrant

### 1. 安装依赖

```bash
pnpm install
```

默认的 `pnpm install` 现在只准备 Web / Server 开发所需依赖，不会在首次安装时强制下载 Electron 桌面运行时。

- 如果你只是运行现有 Web / Server 开发流，到这里就够了
- 如果你要启动桌面端开发壳，首次运行 `pnpm dev:desktop` 时会自动补拉 Electron 运行时
- 如果你想提前完成这一步，也可以手动执行：

```bash
pnpm run prepare:desktop-runtime
```

桌面端运行时首次下载需要可访问 Electron 分发源的网络环境；如果你所在网络无法访问 GitHub Releases，建议先配置代理或镜像后再执行桌面端命令。

如果你在 Windows 上执行 `pnpm install` 时卡在 `prisma preinstall`，通常先检查这两类问题：

1. Node 版本过低
   Prisma 7 目前要求 Node `^20.19.0 || ^22.12.0 || >=24.0.0`。如果你还在 `20.0 ~ 20.18`，建议先升级到 `20.19.x LTS` 再安装。
2. `script-shell` 被配置成了交互式 shell
   如果全局 `npm/pnpm script-shell` 被设成了 `cmd.exe /k` 之类会保留提示符的形式，Prisma 的 lifecycle script 可能不会自动退出，看起来就像安装“卡死”在：
   `node_modules/.../prisma>`

可以先运行下面几条命令自查：

```bash
node -v
pnpm config get script-shell
npm config get script-shell
```

如果 `script-shell` 返回的是带 `/k` 的 `cmd.exe`，建议删除这项配置后重新打开终端：

```bash
npm config delete script-shell
pnpm config delete script-shell
```

然后重新执行：

```bash
pnpm install
```

### 2. 配置环境变量

这个仓库通过 pnpm workspace 分别启动前后端，所以环境变量也是按子包读取的：

- 服务端运行在 `server/` 工作目录，默认读取 `server/.env`
- 前端运行在 `client/` 工作目录，默认读取 `client/.env` / `client/.env.local`
- 根目录 `.env.example` 目前更适合当“总览参考”，不是 `pnpm dev` 默认读取的主入口

#### 2.1 服务端环境变量

先复制服务端示例文件：

```bash
# macOS / Linux
cp server/.env.example server/.env

# Windows PowerShell
Copy-Item server/.env.example server/.env
```

最少建议先确认这些项目：

- `DATABASE_URL`
  默认就是本地 SQLite，可直接使用
- `RAG_ENABLED`
  如果你暂时不接知识库，建议先设为 `false`
- `QDRANT_URL`、`QDRANT_API_KEY`
  只有要启用 Qdrant / RAG 时才需要

注意：

- `OPENAI_API_KEY`、`DEEPSEEK_API_KEY`、`SILICONFLOW_API_KEY` 这类变量可以先留空
- 项目启动后，也可以在页面中配置模型供应商和默认模型

#### 2.2 前端环境变量

大多数本地开发场景，其实不需要单独创建前端 env。

因为前端开发模式下默认会把 API 指到：

```text
http(s)://当前页面 hostname:3000/api
```

这也包括“同一台机器启动服务，然后用局域网 IP 在别的设备上访问”的场景。
例如页面开在 `http://192.168.0.37:5173`，前端默认会自动把 API 指到：

```text
http://192.168.0.37:3000/api
```

只有在这些场景下，才建议创建 `client/.env`：

- 前端和后端不在同一台机器
- 你想把前端显式指向别的 API 地址
- 你需要固定 `VITE_API_BASE_URL`

如果你已经复制了 `client/.env.example`，又发现浏览器请求都跑到了 `http://localhost:13000/api`，通常就是因为你把 API 显式固定死了。对同机 / 局域网访问，建议直接删除或注释掉 `VITE_API_BASE_URL`。

示例：

```bash
# macOS / Linux
cp client/.env.example client/.env

# Windows PowerShell
Copy-Item client/.env.example client/.env
```

内容通常只需要：

```env
# 同机 / 局域网访问时，通常不需要这一行
# VITE_API_BASE_URL=http://localhost:13000/api
```

#### 2.3 模型供应商并不一定要写死在 env

当前项目已经支持在页面里配置模型相关设置：

- `/settings`
  配置供应商 API Key、默认模型、连通性测试
- `/settings/model-routes`
  给不同任务分配不同 provider / model
- `/knowledge?tab=settings`
  配置 Embedding provider、Embedding model、集合命名和自动重建策略

所以环境变量里的 `OPENAI_MODEL`、`DEEPSEEK_MODEL`、`EMBEDDING_MODEL` 等，更适合当作：

- 启动默认值
- 数据库里还没保存设置时的回退值

### 3. 启动开发环境

```bash
pnpm dev
```

如果你已经复制好了 `server/.env` 和 `client/.env`，默认就是直接运行这一条。
不需要在首次启动前手动再执行 `prisma generate`、`prisma db push` 或 `pnpm db:migrate`。

默认情况下：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:13000`
- API：`http://localhost:13000/api`

首次启动服务端时，会自动执行 Prisma generate 和 `db push`。
只有在你自己修改了 Prisma schema，或者要处理正式迁移流程时，才需要手动使用 Prisma / 数据库相关命令。

建议第一次启动后先做这几步：

1. 打开 `http://localhost:5173/settings`，至少配置一组可用的模型供应商 API Key
2. 打开 `http://localhost:5173/settings/model-routes`，检查各任务实际使用的模型路由
3. 如果要启用知识库，打开 `http://localhost:5173/knowledge?tab=settings`，保存 Embedding / Collection 设置

### 4. 如果你使用 Qdrant Cloud

如果你只是先体验主流程，其实可以先跳过 Qdrant，直接在 `server/.env` 里设：

```env
RAG_ENABLED=false
```

如果你要启用 Qdrant Cloud，可以按下面的最小流程来：

1. 到 [Qdrant Cloud](https://cloud.qdrant.io/) 注册账号。
2. 在 `Clusters` 页面创建一个集群。
   测试阶段用 Free cluster 就够了。
3. 集群创建完成后，到集群详情页复制 Cluster URL。
4. 在集群详情页的 `API Keys` 中创建并复制一个 Database API Key。
   这个 key 创建后通常只展示一次，建议立即保存。
5. 把它们写入 `server/.env`：

```env
QDRANT_URL=https://your-cluster.region.cloud.qdrant.io:6333
QDRANT_API_KEY=your_database_api_key
```

6. 启动项目后，再去 `知识库 -> 向量设置` 页面选择 Embedding provider / model，并保存集合设置。

对这个项目来说，`QDRANT_URL` 建议直接填 REST 地址，也就是带 `:6333` 的地址。

如果你想手动验证连通性，可以用：

```bash
curl -X GET "https://your-cluster.region.cloud.qdrant.io:6333" \
  --header "api-key: your_database_api_key"
```

你也可以把集群地址后面拼上 `:6333/dashboard` 打开 Qdrant Web UI。

Qdrant 官方文档：

- [Create a Cluster](https://qdrant.tech/documentation/cloud/create-cluster/)
- [Database Authentication in Qdrant Managed Cloud](https://qdrant.tech/documentation/cloud/authentication/)
- [Cloud Quickstart](https://qdrant.tech/documentation/cloud/quickstart-cloud/)

### 5. 可选初始化

下面这些都不是首次启动 `pnpm dev` 的前置步骤：

```bash
pnpm db:seed
pnpm db:studio
```

## 常用命令

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
# 仅在你开发/调整 Prisma schema 时再手动使用
pnpm db:migrate
pnpm db:seed
pnpm db:studio
pnpm --filter @ai-novel/server test
pnpm --filter @ai-novel/server test:routes
pnpm --filter @ai-novel/server test:book-analysis
```

## API 端点概览

所有 API 统一挂载在 `/api` 前缀下。端点按模块分组，路由定义在 `server/src/modules/` 各子目录的 `http/` 入口中。

| 模块组 | 前缀 | 说明 |
|--------|------|------|
| 小说 CRUD | `/api/novels` | 小说创建、列表、详情、更新、删除 |
| 项目设定 | `/api/novels/:id/setup` | 书级 framing、题材绑定、写法确认 |
| 故事规划 | `/api/novels/:id/planning` | 宏观规划、故事线、卷战略 |
| 卷管理 | `/api/novels/:id/volumes` | 卷骨架、节奏板、拆章 |
| 章节执行 | `/api/novels/:id/production` | 章节写作、审核、修复、正文编辑 |
| 角色管理 | `/api/novels/:id/characters` | 角色准备、动态、资源、弧光、同步 |
| 世界观 | `/api/worlds`、`/api/novels/:id/world` | 世界骨架、规则、势力、可视化 |
| 拆书分析 | `/api/novels/:id/book-analysis` | 拆书生成、发布、状态查询 |
| 知识库 | `/api/knowledge` | 文档管理、向量索引、检索 |
| 写法引擎 | `/api/style-engine` | 风格配置、特征提取、反 AI 规则 |
| 模型设置 | `/api/settings` | 供应商配置、模型路由、连通性测试 |
| Creative Hub | `/api/creative-hub` | 统一创作中枢、对话、工具调用 |
| 导演出口 | `/api/novels/:id/director` | 自动导演启动、恢复、状态查询 |
| 导出 | `/api/novels/:id/export` | 小说导出为不同格式 |
| 世界库 | `/api/setup/world` | 世界模板、结构管理 |
| 任务中心 | `/api/tasks` | 后台任务排队、执行、失败状态 |
| 健康检查 | `/api/health` | 服务存活检测 |

详细的请求 / 响应格式请参考各路由文件中的 Zod schema 定义，以及客户端 API 层 (`client/src/api/`) 的调用实现。

## 环境变量参考

环境变量按子包分别加载：

- **服务端**：读取 `server/.env`（首次复制 `cp server/.env.example server/.env`）
- **前端**：读取 `client/.env`（大多数场景无需单独配置）
- 根目录 `.env.example` 仅为总览参考，非默认加载入口

主要环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | `file:../data/dev.db` | 数据库连接串，开发默认 SQLite |
| `RAG_ENABLED` | `false` | 是否启用 Qdrant 知识库 |
| `QDRANT_URL` | — | Qdrant REST 地址（含 `:6333`） |
| `QDRANT_API_KEY` | — | Qdrant 数据库 API Key |
| `OPENAI_API_KEY` | — | OpenAI 供应商密钥 |
| `DEEPSEEK_API_KEY` | — | DeepSeek 供应商密钥 |
| `ANTHROPIC_API_KEY` | — | Anthropic 供应商密钥 |
| `SILICONFLOW_API_KEY` | — | SiliconFlow 供应商密钥 |

模型密钥建议在启动后通过 `/settings` 页面配置，环境变量主要作为启动默认值或数据库未保存时的回退。完整变量列表参见 `server/.env.example`。

## 技术栈与架构

### 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 19、Vite、React Router、TanStack Query、Plate |
| 后端 | Express 5、Prisma、Zod |
| AI 编排 | LangChain、LangGraph |
| 数据库 | SQLite |
| RAG | Qdrant |
| 工程形态 | pnpm workspace Monorepo |

### Monorepo 结构

```text
client/   React + Vite 前端
server/   Express + Prisma + Agent Runtime + Creative Hub
shared/   前后端共享类型与协议
desktop/  Electron 桌面壳（当前暂不发布）
scripts/  启动和辅助脚本
docs/     设计文档、阶段检查点、模块计划与历史归档
```

更细的文档分区说明可以看 [docs/README.md](./docs/README.md)。

### 当前系统关注点

- `Creative Hub` 负责统一创作中枢与 Agent 运行时体验
- `Novel Setup / Director` 负责从一句灵感走到整本可写
- `Novel Production` 负责整本生成主链
- `Style Engine` 负责写法资产、特征提取、绑定和反 AI 协同
- `Knowledge / Book Analysis / World` 负责长期上下文沉淀与回灌

## 当前路线图

当前最重要的不是继续堆零散功能，而是提高“小白把整本书写完”的成功率。

### P0

- 稳定自动导演连续执行，减少误停链、重复审校和异常 Token 消耗
- 让本书世界、角色、伏笔、时间线和章节任务稳定进入后续写作上下文
- 降低新手从一句灵感到可连续写章之间的判断成本和修复成本

### P1

- 提高整本一致性、节奏稳定性、人物成长质量和世界状态继承质量
- 让写法资产、世界约束、章节重规划、审阅反馈和质量债形成闭环
- 让系统更擅长“持续掌控整本书”，而不只是“生成某一章”

### P2

- 继续强化多阶段 Agent 协同和运行时可观察性
- 完善更自动化的生产调度、恢复策略、回合记忆和整本质量控制

## 交流反馈

如果你想反馈问题、交流使用体验，或者讨论自动导演、整本生产主链、写法引擎等方向，欢迎提 Issue。

## 贡献方式

如果你想参与这个项目，最有价值的贡献方向包括：

- 提升整本生产稳定性
- 改善新手开书体验和自动导演成功率
- 强化写法引擎、知识库回灌和世界观一致性链路
- 补充测试、错误回放和运行时可观察性

欢迎直接提 Issue 或 Pull Request。
提交 Pull Request 即表示你确认自己有权提交该内容，并已阅读且同意 [CLA.md](./CLA.md)；如果包含第三方代码、素材、AI 生成内容或其他受许可证约束的内容，请在 PR 中明确说明来源和许可证。详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 致谢

本项目基于 [ExplosiveCoderflome/AI-Novel-Writing-Assistant](https://github.com/ExplosiveCoderflome/AI-Novel-Writing-Assistant) 深度二次开发。感谢上游原作者 [@ExplosiveCoderflome](https://github.com/ExplosiveCoderflome) 的开创性工作，为本项目提供了坚实的基础架构和初始功能集。

感谢提交修复 Pull Request 的贡献者 [@ystyleb](https://github.com/ystyleb)。

## 当前状态与使用方式

**项目处于早期开发阶段**，目前只提供网页版，短期内不会发布桌面版安装包。

### 启动方式

```bash
# 安装依赖
pnpm install

# 启动开发环境（前端 + 后端同时启动）
pnpm dev
```

启动后访问：

- 前端：<http://localhost:5173>
- 后端 API：<http://localhost:13000/api>

首次启动会自动完成数据库初始化，无需手动执行 Prisma 命令。启动后建议先到 `/settings` 页面配置模型供应商 API Key。

详细配置说明见下方「快速开始」章节。

## 说明

- 这是一个持续快速迭代中的 AI Native 创作系统，功能边界仍在演化。
- README 优先描述当前最值得体验、最能代表方向的能力，而不是列出全部历史实现细节。
- 版本计划与任务详情见 [docs_dev/](./docs_dev/) 目录。

## License

本项目采用双许可证授权模式：

- 默认情况下，本项目基于 GNU Affero General Public License v3.0 (AGPLv3) 授权，详见 [LICENSE](./LICENSE)；归属与附加说明见 [NOTICE](./NOTICE)。
- 服务型商用：将本项目（或其修改版本）作为后端以 SaaS、托管或其他形式向第三方提供服务，须通过作者获取商业授权许可。
- 请遵守开源协议条款，并在适用场景下取得相应授权。

贡献说明：新贡献默认按 [CLA.md](./CLA.md) 提交，可随项目按 AGPL-3.0-only 分发，并可纳入项目维护者另行提供的商业授权；详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

