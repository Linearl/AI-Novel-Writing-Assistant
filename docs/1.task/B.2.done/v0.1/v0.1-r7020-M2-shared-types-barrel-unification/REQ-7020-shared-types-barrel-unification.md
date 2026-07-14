---
description: "REQ-7020 共享类型 Barrel 统一导出——需求文档"
update_time: 2026-07-10
---

# REQ-7020 共享类型 Barrel 统一导出

## 基本信息

| 字段 | 内容 |
|------|------|
| 需求编号 | REQ-7020 |
| 优先级 | P0 |
| 版本 | 0.1 |
| 状态 | 📋 待办 |
| 来源 | 架构诊断报告 2026-07-10 第3条发现 |

---

## 1. 背景与问题

`shared/index.ts` 仅导出 32 个类型模块，`shared/types/index.ts` 导出 55 个。23 个类型模块（`creativeHub`、`payoffLedger`、`chapterPatchRepair` 等）仅在内层 barrel 可访问。

**当前状态**：
- `shared/index.ts` ≈ 32 个模块导出
- `shared/types/index.ts` ≈ 55 个模块导出
- 差异 23 个模块仅在内层 barrel 可访问
- 使用者被迫用 `@ai-novel/shared/types/creativeHub` 深层导入
- `chapterRuntime.ts` 1,044 行，远超 700 行规范

**不改会怎样**：
- 深层导入路径散落全项目，重构时需大量查找替换
- 新增类型模块时不确定应加到哪个 barrel
- 超长文件 `chapterRuntime.ts` 持续膨胀，维护困难
- 外部使用者（desktop 包）无法统一从 `@ai-novel/shared` 导入

---

## 2. 目标与范围

### 2.1 目标

1. 统一两个 barrel 文件，`shared/index.ts` 包含所有 `shared/types/index.ts` 中的模块
2. 拆分 `chapterRuntime.ts` (1,044行) 为按子域文件
3. 审计全项目 import 语句，将 `@ai-novel/shared/types/X` 深层导入替换为 `@ai-novel/shared`
4. 为 shared 包添加基础 zod schema 验证测试

### 2.2 In Scope

**shared 包**：
- `shared/index.ts` — 扩展导出，覆盖 `shared/types/index.ts` 所有模块
- `shared/types/index.ts` — 保持同步或考虑废弃（仅作为内部索引）
- `shared/types/chapterRuntime.ts` — 拆分为 3-5 个子文件
- `shared/types/` — 新增子域名文件（`chapterDraft.ts`、`chapterReview.ts`、`chapterGeneration.ts` 等）

**全项目 import 审计**：
- `server/src/` — 替换深层导入
- `client/src/` — 替换深层导入
- `desktop/` — 替换深层导入

**测试**：
- `shared/tests/` — 新增 zod schema 验证测试

### 2.3 Out of Scope

- 不修改类型定义本身（不重构接口字段）
- 不修改 `@ai-novel/shared` 包名或发布方式
- 不调整 `shared/` 目录结构（除 `chapterRuntime.ts` 拆分）

---

## 3. 需求详情

### 3.1 Barrel 统一

WHEN shared 包构建后，THE SYSTEM SHALL 使得 `@ai-novel/shared` 可访问所有 shared/types 中的模块。

**当前差异模块（示例）**：
- `creativeHub`
- `payoffLedger`
- `chapterPatchRepair`
- `worldContext`
- `styleEngine`
- 等约 23 个

### 3.2 chapterRuntime.ts 拆分

WHEN 拆分 `chapterRuntime.ts`，THE SYSTEM SHALL 按子域拆分：
- `chapterDraft.ts` — 草稿相关类型
- `chapterReview.ts` — 审校相关类型
- `chapterGeneration.ts` — 生成相关类型
- `chapterRuntime.ts` — 保留为 facade，重新导出子模块

### 3.3 Import 审计替换

WHEN 审计全项目 import，THE SYSTEM SHALL：
- 查找所有 `@ai-novel/shared/types/<module>` 深层导入
- 替换为 `@ai-novel/shared`（从顶层 barrel 导入）
- 保持 import 语句格式一致

---

## 4. 验收标准

- [ ] `shared/index.ts` 导出模块数 >= `shared/types/index.ts` 导出模块数
- [ ] `chapterRuntime.ts` 已拆分为 <= 700 行子文件
- [ ] 全项目无 `@ai-novel/shared/types/<module>` 深层导入（或仅保留合理例外）
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过（含 shared 重新构建）
- [ ] `pnpm test` 通过
- [ ] shared 包新增 zod schema 验证测试 >= 10 个
