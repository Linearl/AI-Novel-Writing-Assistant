# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

AI 小说创作工作台 — 面向写作新手的 AI 导演式长篇小说生产系统。pnpm workspace monorepo，4 个子包：`client`、`server`、`shared`、`desktop`。

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发（同时启动 shared watch + server + client）
pnpm dev

# 启动桌面端开发壳（含 Electron）
pnpm dev:desktop

# 构建（shared → server → client）
pnpm build

# 类型检查（含 prisma generate）
pnpm typecheck

# Lint（等价于各包的 tsc --noEmit）
pnpm lint

# 测试
pnpm test                                    # server 单元测试（先 build shared + server）
pnpm test:client                             # client 测试
pnpm test:all                                # 全部测试
pnpm --filter @ai-novel/server test:routes   # 仅路由测试
pnpm --filter @ai-novel/server test:planner  # 仅 planner 测试
pnpm --filter @ai-novel/server test:tools    # 仅 tools 测试
pnpm --filter @ai-novel/server test:runtime  # 仅 runtime 测试

# 数据库
pnpm db:migrate    # prisma migrate dev
pnpm db:seed       # prisma db seed
pnpm db:studio     # prisma studio

# 桌面打包
pnpm build:desktop:all      # 完整构建链（shared → prisma generate → server → client:desktop → desktop）
pnpm dist:desktop:nsis      # NSIS 安装包
pnpm dist:desktop:portable  # 便携版
```

## 端口

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3000`
- API：`http://localhost:3000/api`

## Monorepo 结构

```text
client/          React 19 + Vite + TanStack Query + Plate + Zustand
server/          Express 5 + Prisma 7 + LangChain/LangGraph
shared/          前后端共享类型与 Zod schema（@ai-novel/shared）
desktop/         Electron 壳（依赖 server）
scripts/         启动和辅助脚本
docs/            架构决策、Wiki、Release Notes、Checkpoints
infra/           Docker Compose（Qdrant 等）
```

## 服务端核心目录 (`server/src/`)

| 目录 | 职责 |
|------|------|
| `app.ts` | Express 入口，挂载所有路由 |
| `modules/` | 模块化产品能力（novel/comic/drama/export/setup），各模块自带 `http/` 入口 |
| `services/` | 业务服务层（`novel/director/` 是自动导演核心） |
| `routes/` | Express 路由（正逐步收敛到模块 `http/` 入口） |
| `prompting/` | **Prompt Registry** — 所有产品级 prompt 必须在此注册 |
| `llm/` | LLM 客户端工厂、多 Provider、structured invoke、JSON repair |
| `runtime/` | Creative Hub runtime orchestrator、planner、tool registry |
| `graphs/` | LangGraph 图编排（auto-director 流水线） |
| `prisma/` | Schema（SQLite dev / PostgreSQL prod）与迁移 |
| `agents/` | Agent 目录（chat/character/genre/rag/knowledge/styleEngine 等） |
| `events/` | 事件总线与副作用处理 |
| `config/` | 环境配置、Provider 配置 |

## 客户端核心目录 (`client/src/`)

| 目录 | 职责 |
|------|------|
| `pages/` | 路由页面（vite-plugin-pages 文件路由） |
| `components/` | UI 组件 |
| `api/` | API 请求层 |
| `store/` | Zustand store |
| `hooks/` | 自定义 hooks |
| `router/` | 路由配置 |

## 共享类型 (`shared/`)

`shared/types/` 包含前后端共用的 TypeScript 类型定义，涵盖 novel、director、character、world、knowledge、creativeHub、styleEngine 等所有核心领域。`shared` 包必须先 build 才能被 server/client 使用。

## 环境变量

- Server 读取 `server/.env`，Client 读取 `client/.env`
- 根目录 `.env.example` 是聚合参考，不是默认加载入口
- 模型配置可在运行后通过 `/settings`、`/settings/model-routes` 页面设置
- 默认使用 SQLite，不需要手动执行 `prisma generate` 或 `db push`，首次启动自动完成
- RAG 需要 Qdrant，不启用时设 `RAG_ENABLED=false`

## 关键架构约束

### AI-First 原则

这是 AI-native 项目。意图识别、任务分类、规划、路由、工具选择等决策路径**必须以 AI 结构化理解为主**。不要用关键词匹配、硬编码 regex、手写分支表实现产品核心行为。AI 失败时视为 AI 能力问题修复，不要加 fallback 匹配隐藏。

### Prompt Governance

- `server/src/prompting/` 是唯一允许添加产品级 prompt 的入口
- 新 prompt 必须实现为 `PromptAsset` 并在 `registry.ts` 注册
- 禁止在 service 文件中内联 `systemPrompt`/`userPrompt` 然后调用 `invokeStructuredLlm`

### 文件大小与模块化

- 单文件目标 ~600 行，500-700 可接受，>700 必须重构
- 目录 `.ts` 文件 >12 个时必须建下级模块目录
- 同前缀文件 >4 个时收敛到 feature 目录
- 拆分后通过 facade / `index.ts` 消费，不深导入内部文件
- 架构收敛方向：`app/`（启动+路由）→ `platform/`（基础设施）→ `modules/`（产品能力）

### 自动生成文件

`docs_dev/1.task/requirements.md` 和 `docs_dev/INDEX.md` 由 git 提交 hooks 自动更新，**禁止手动编辑**。新增任务包或文档后，直接提交即可触发同步。

### Auto-Director 质量门

章节审核、验收和质量循环结果**不能自动阻断**全局 auto-director 或全书执行链。只有明确的 `stop_for_replan`、`replan_required`、不可恢复的生成失败或运行时安全/数据完整性失败才能停止全局链。本地质量问题是可见警告和后续跟进项，不是工作流失败。

### 数据保护

执行任何破坏性数据操作（删除数据库、`prisma migrate reset`、truncation 等）前，必须：获取用户明确批准 → 完成备份并确认路径 → 验证备份可恢复。

### 开发分支工作流

- 影响端到端产品流的功能开发不要在 `main` 直接进行
- 流程：feature branch → 自测 → 合并到 `beta` → 集成验证 → 合并到 `main` → 发布
- 每个完成的开发阶段必须提交，提交前检查 Release Notes 是否需要更新

### UI 文案规则

所有面向用户的 UI 文案必须从用户视角说明功能，禁止使用"现在已经""不再""迁回"等实现叙述式文案。

### Issue 文档

当用户说"提 issue"时，针对当前问题编写分析文档，放到 `docs_dev/4.misc/issues/` 目录下。文档应包含：问题描述、根因分析、复现步骤、修复方案、变更文件。面向上游作者，简洁明了。

## 测试

- Server 使用 Node.js 内置 test runner，测试文件在 `server/tests/`
- Client 测试命令：`pnpm --filter @ai-novel/client test`
- 运行 server 测试前需要先 build shared 和 server

## 技术栈版本

- Node.js `^20.19.0 || ^22.12.0 || >=24.0.0`，pnpm `>= 10.6`
- TypeScript `^5.9.3`，Zod `^4.3.6`
- Prisma `^7.4.2`，Express `^5.2.1`
- React `^19.2.4`，Vite `^7.3.1`
- LangChain `^1.2.28`，LangGraph `^1.2.0`
- Electron `^35.7.5`（desktop 包）

## 安全与协作规则

- 完整安全规则、数据保护、AI-First 约束、架构规则、分支工作流等见 [`AGENTS.md`](AGENTS.md)

## 详细文档

- 架构决策与 Wiki：`docs/wiki/`
- Release Notes：`docs/releases/release-notes.md`
- 任务与路线图：`TASK.md`
- 本地开发指南：`LOCAL_DEV.md`
- 贡献指南：`CONTRIBUTING.md`
- License：AGPL-3.0-only（商用需授权）
