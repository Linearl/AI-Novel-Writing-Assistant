# @ai-novel/server

AI 小说创作工作台后端服务。

## 技术栈

- Express 5 + TypeScript
- Prisma 7 ORM（SQLite 开发 / PostgreSQL 生产）
- LangChain + LangGraph 图编排
- 多 LLM Provider 支持（OpenAI、Anthropic、DeepSeek、SiliconFlow 等）

## 开发

```bash
# 安装依赖（在项目根目录执行）
pnpm install

# 启动开发服务器
pnpm --filter @ai-novel/server dev

# 构建
pnpm --filter @ai-novel/server build

# 类型检查
pnpm --filter @ai-novel/server typecheck

# 测试
pnpm --filter @ai-novel/server test
pnpm --filter @ai-novel/server test:routes    # 仅路由测试
pnpm --filter @ai-novel/server test:planner   # 仅 planner 测试
pnpm --filter @ai-novel/server test:tools     # 仅 tools 测试
pnpm --filter @ai-novel/server test:runtime   # 仅 runtime 测试

# 数据库
pnpm --filter @ai-novel/server db:migrate     # prisma migrate dev
pnpm --filter @ai-novel/server db:seed        # prisma db seed
pnpm --filter @ai-novel/server db:studio      # prisma studio
```

## 端口

默认监听 `http://localhost:13000`，API 前缀为 `/api`。

## 目录结构

```text
src/
├── app.ts              Express 入口，挂载所有路由
├── modules/            模块化产品能力（novel/export/setup）
├── services/           业务服务层（novel/director/ 是自动导演核心）
├── routes/             Express 路由
├── prompting/          Prompt Registry — 产品级 prompt 治理
├── llm/                LLM 客户端工厂、多 Provider、structured invoke
├── runtime/            Creative Hub runtime orchestrator、planner、tool registry
├── graphs/             LangGraph 图编排（auto-director 流水线）
├── prisma/             Schema 与迁移
├── agents/             Agent 目录
├── events/             事件总线与副作用处理
└── config/             环境配置、Provider 配置
```
