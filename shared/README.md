# @ai-novel/shared

前后端共享的 TypeScript 类型定义与 Zod schema。

## 说明

本包是 monorepo 中的共享类型包，被 `server` 和 `client` 依赖。修改本包后需要先 build，server 和 client 才能使用最新类型。

## 开发

```bash
# 安装依赖（在项目根目录执行）
pnpm install

# 构建（必须先于 server/client 使用）
pnpm --filter @ai-novel/shared build

# 类型检查
pnpm --filter @ai-novel/shared typecheck
```

## 目录结构

```text
src/
├── types/         TypeScript 类型定义
│   ├── novel/     小说领域类型
│   ├── director/  导演系统类型
│   ├── character/ 角色类型
│   ├── world/     世界观类型
│   ├── knowledge/ 知识库类型
│   ├── llm/       LLM Provider 类型
│   └── ...        其他核心领域
└── schemas/       Zod 校验 schema
```

## 使用约定

- 所有前后端共用的类型必须定义在此包中
- Zod schema 用于运行时校验，同时导出 TypeScript 类型
- 新增类型时需同步更新对应的 Zod schema（如需要运行时校验）
