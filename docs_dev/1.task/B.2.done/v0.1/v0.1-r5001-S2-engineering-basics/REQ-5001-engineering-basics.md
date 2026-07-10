---
description: "补齐工程化基础配置 — REQ-5001 需求文档，添加 .env.example/.editorconfig/子包README/semver CHANGELOG/Prisma回滚SOP"
---

# REQ-5001：补齐工程化基础配置

## 背景

审计复核确认项目缺少 5 项基础工程配置。全量审计已解决一轮其他问题，这些是被遗漏条目。所有条目方案明确。

## 范围

### 1. .env.example（MAINT-002，P2）

当前项目无 `.env.example`，CLAUDE.md 提到但文件不存在。

**修复**：在项目根目录创建 `.env.example`，列出所有可选环境变量及默认值：

```bash
# Server
PORT=13000
DATABASE_URL="file:./dev.db"
# RAG — 留空禁用
RAG_ENABLED=false
QDRANT_URL=http://localhost:6333
# LLM Providers (可选)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
# 桌面端
ELECTRON_DEV=1
```

### 2. .editorconfig（MAINT-005，P3）

创建根目录 `.editorconfig`：

```ini
root = true
[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
[Makefile]
indent_style = tab
```

### 3. 子包 README（MAINT-006，P4）

为 4 个子包各创建简要 README.md：

| 子包 | 内容 |
|------|------|
| `client/` | React 19 + Vite 前端，端口 5173 |
| `server/` | Express 5 + Prisma 7 后端，端口 13000 |
| `shared/` | 前后端共享 TypeScript 类型 + Zod schema |
| `desktop/` | Electron 壳，依赖 server 包 |

### 4. CHANGELOG 补充 semver（MAINT-008，P3）

在 `docs/releases/release-notes.md` 头部添加版本→日期映射表，日期标题下补 semver 版本号：

```markdown
## 版本映射
| 版本 | 日期 |
|------|------|
| v0.3.21 | 2026-07-01 |
...
```

### 5. Prisma 迁移回滚 SOP（MAINT-007，P4）

在 `docs/2.tech/guide/` 下创建 `prisma-migration-rollback.md`，编写手动回滚 SOP：

- 步骤 1：确认目标回滚到的 migration 名称
- 步骤 2：手动编写 down SQL
- 步骤 3：`prisma migrate resolve` 标记回滚
- 步骤 4：验证数据完整性

## 验收标准

- [ ] 项目根目录 `.env.example` 存在且列出所有环境变量
- [ ] 项目根目录 `.editorconfig` 存在
- [ ] `client/README.md`、`server/README.md`、`shared/README.md`、`desktop/README.md` 均存在
- [ ] `docs/releases/release-notes.md` 头部有版本映射表
- [ ] `docs/2.tech/guide/prisma-migration-rollback.md` 存在
- [ ] 不影响任何现有功能（纯文档/配置文件变更）
