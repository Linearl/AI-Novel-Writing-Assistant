<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server

## Purpose
`@ai-novel/server` 包:Express + Prisma 后端,承载整本长篇小说 AI 生产系统的所有业务逻辑。包含 LLM 编排、auto-director、章节生产、Creative Hub、Prompt Registry、RAG、任务中心等核心能力。

## Key Files
| File | Description |
|------|-------------|
| `package.json` | 包定义、scripts、Prisma 配置 |
| `tsconfig.json` | TS 配置(继承根 `tsconfig.base.json`) |
| `scripts/` | 构建/测试/迁移/快照/恢复辅助脚本(CJS) |
| `tests/` | 服务端 Node 测试(planner/tools/runtime/routes/book-analysis) |
| `tmp/` | 临时数据(数据库备份、迁移历史)— **不进 git**(见根 `.gitignore`) |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `src/` | TypeScript 源码根目录(see `src/AGENTS.md`) |
| `scripts/` | Node CJS 工具脚本 |
| `tests/` | Node test runner 测试 |
| `tmp/` | 临时数据目录(已 gitignore) |

## For AI Agents

### Working In This Directory
- 包名 `@ai-novel/server`,workspace 内部用 `workspace:*`
- Node ≥20.19 / ≥22.12 / ≥24,pnpm ≥10.6
- 主要 DB:SQLite(dev) / PostgreSQL(prod),Prisma 7
- 测试:`pnpm test`(fast) / `pnpm test:integration` / `pnpm test:planner` / `pnpm test:tools` / `pnpm test:runtime` / `pnpm test:routes` / `pnpm test:book-analysis`
- typecheck:`pnpm typecheck`(会先 `prisma:generate`)
- lint:`pnpm lint`(目前用 `tsc --noEmit`)
- **绝对不要**直接执行 `prisma migrate reset` / `db reset` 等破坏性操作——见根 AGENTS.md "Safety Rules → Data Protection"

### Architecture Direction (来自根 AGENTS.md)
- 服务端在保持 `server/src` 可运行的同时,逐步向 `app/`、`platform/`、`modules/` 收敛
- 业务模块围绕"完成整本小说"工作流组织:`setup` / `planning` / `production` / `director` / `characters` / `state` / `export`
- `routes/` 应收敛到各模块自有 `http/` 入口
- `services/novel/director/` 应收敛到 `commands`、`runtime`、`state`、`automation`、`projections`、`recovery`、`phases`

### Branch Workflow (来自根 AGENTS.md "Development Branch Workflow")
- 跨阶段工作流 / 共享契约 / 自动导演链 → 先开 feature 分支 → `beta` 集成 → `main` 稳定
- `desktop-dev` 是完成态,新桌面工作需走 feature 分支
- 阶段提交是强制性的:每个开发阶段完成后必须提交

## Dependencies

### Internal
- `@ai-novel/shared` (workspace) — 共享类型
- 根 `AGENTS.md` 中 "Architecture Rules" / "Prompt Governance" / "Safety Rules" 是最高优先级

### External
- Express 5,Prisma 7 (sqlite/pg),LangChain 1.x,LangGraph 1.x
- better-sqlite3 12,sharp,helmet,cors,morgan,dotenv
- zod 4,@aws-sdk/client-s3(可能用于资产)