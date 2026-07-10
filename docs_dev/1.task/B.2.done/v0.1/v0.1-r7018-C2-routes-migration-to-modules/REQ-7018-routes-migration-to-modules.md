---
description: "REQ-7018 路由迁移至模块目录——需求文档"
update_time: 2026-07-10
---

# REQ-7018 路由迁移至模块目录

## 基本信息

| 字段 | 内容 |
|------|------|
| 需求编号 | REQ-7018 |
| 优先级 | P1 |
| 版本 | 0.1 |
| 状态 | 📋 待办 |
| 来源 | 架构诊断报告 2026-07-10 第1条发现 |

---

## 1. 背景与问题

`app.ts` 中同时从三种路径导入路由 —— `modules/`、`services/`、`routes/`。CLAUDE.md 声明了 `app/ → platform/ → modules/` 收敛方向，但 30 个 `routes/` 文件仍在使用。

**现状**：
- `routes/` 目录下有约 30 个路由文件，每文件定义一组 Express Router
- `modules/` 下已有部分模块自带 `http/` 入口（如 `novel/http/`、`export/http/`、`setup/http/`）
- `app.ts` 中路由注册混杂了三种导入来源，缺乏统一规范

**不改会怎样**：
- 路由分散在三处，新开发者不确定在哪里添加新路由
- 架构收敛目标（`modules/` 为唯一产品能力入口）永远无法达成
- `routes/` 和 `modules/` 可能重复注册同一路由，引发不可预期的行为

---

## 2. 目标与范围

### 2.1 目标

1. 清点所有 `routes/` 下文件和 `modules/` 现有覆盖，产出迁移清单
2. 将仍活跃的 `routes/` 文件逐模块迁移到 `modules/` 对应子目录
3. 统一 `app.ts` 的路由导入规范（仅从 `modules/` 导入路由注册函数）
4. 制定新路由落位规则文档

### 2.2 In Scope

**后端**：
- `server/src/routes/` — 约 30 个路由文件，逐一清点、分类
- `server/src/modules/` — 为缺失模块创建 `http/` 入口
- `server/src/app.ts` — 统一路由导入来源
- 新路由落位规则文档（更新 CLAUDE.md 或新增 `docs/architecture/routing.md`）

### 2.3 Out of Scope

- 不修改路由内部业务逻辑
- 不调整路由路径（对外 API 不变）
- 不修改 `services/` 中按旧模式导出的路由

---

## 3. 需求详情

### 3.1 清点阶段

WHEN 启动迁移任务，THE SYSTEM SHALL 逐文件审计 `routes/` 目录：
- 记录每个文件的路由前缀、HTTP 方法、是否在 `app.ts` 注册
- 检查 `modules/` 中是否已有对应模块可承载
- 标记已废弃（无注册引用）的文件

### 3.2 迁移阶段

WHEN 迁移清单确认后，THE SYSTEM SHALL 按模块逐个迁移：
- 在 `modules/<domain>/http/` 下创建路由文件
- 导出标准注册函数 `register<Domain>Routes(app: Express)`
- 在 `app.ts` 中将旧 import 替换为模块 import
- 每迁移一个模块后运行相关测试验证

### 3.3 规则文档

WHEN 迁移完成，THE SYSTEM SHALL 产出路由落位规则：
- 新路由必须放在 `modules/<domain>/http/` 下
- 路由注册函数命名规范：`register<Domain>Routes`
- 禁止在 `routes/` 或 `services/` 中新增路由文件

---

## 4. 验收标准

- [ ] `routes/` 目录审计清单产出（excel/markdown 表格）
- [ ] 所有活跃路由文件已迁移到 `modules/<domain>/http/`
- [ ] `app.ts` 中只剩 `modules/` 来源的路由导入
- [ ] `routes/` 目录可安全删除或仅保留历史引用
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] `pnpm --filter @ai-novel/server test:routes` 通过
- [ ] 路由落位规则文档已产出
