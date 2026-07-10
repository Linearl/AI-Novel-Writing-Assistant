---
description: "REQ-7018 路由迁移至模块目录——任务清单"
update_time: 2026-07-10
---

# REQ-7018 任务清单

## Phase 1: 清点审计

- [x] 1.1 列出 `routes/` 下所有路由文件，逐文件记录：文件路径、路由前缀、HTTP 方法、是否在 app.ts 注册
- [x] 1.2 列出 `modules/` 下已有 `http/` 入口，记录已覆盖的路由前缀
- [x] 1.3 交叉对比，产出迁移清单：哪些迁移到已有模块、哪些需要新建模块 http 入口、哪些可废弃
- [x] 1.4 与用户确认迁移清单

## Phase 2: 逐模块迁移

- [x] 2.1 迁移第一批（低风险、独立路由）：将 5-8 个独立路由文件迁移到对应模块
- [x] 2.2 迁移第二批（中风险、有依赖路由）：将 5-8 个路由文件迁移
- [x] 2.3 迁移第三批（剩余路由文件）
- [x] 2.4 每批迁移后：运行 `pnpm --filter @ai-novel/server test:routes` 验证
- [x] 2.5 为缺少 `http/` 入口的模块创建路由注册文件

## Phase 3: 统一 app.ts 导入

- [x] 3.1 移除 `app.ts` 中所有 `routes/` 和 `services/` 来源的路由导入
- [x] 3.2 统一为 `modules/` 导入
- [x] 3.3 运行 `pnpm typecheck` 确保无类型错误

## Phase 4: 清理与文档

- [x] 4.1 评估是否可安全删除 `routes/` 目录（或归档到 `_legacy/`）
- [x] 4.2 编写新路由落位规则文档（`docs/architecture/routing.md` 或更新 CLAUDE.md）
- [x] 4.3 全量验证：`pnpm typecheck` + `pnpm test` + `pnpm --filter @ai-novel/server test:routes`
- [x] 4.4 手动验证：启动 `pnpm dev`，确认所有 API 端点正常响应

---

## DoD

- `app.ts` 中所有路由导入来源统一为 `modules/`
- 迁移清单中所有活跃路由文件已迁移完成
- `routes/` 目录已清理
- typecheck + 路由测试 + 全量测试通过
- 新路由落位规则文档已产出
