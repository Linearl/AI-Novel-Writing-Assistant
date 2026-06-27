---
description: "REQ-2005 任务拆解"
---

# REQ-2005 任务拆解

> 状态：⏳ 进行中（完成后改为 ✅ 全部完成）

## 任务概述

### 1. 来源

用户反馈 — 步骤6新建章节后无法删除，误操作后无法恢复。

### 2. 需求

- 后端：软删除/恢复 API + Prisma schema 变更
- 前端：删除按钮 + 确认对话框 + undo toast

### 3. 验收标准

> 见 [REQ-2005.md](./REQ-2005.md) 第 4 节。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | Prisma schema 新增 Chapter.deletedAt 字段 + migration | P0 | 0.5h | ⬜ 待开始 |
| T2 | 后端：novelCoreCrudService 新增 softDeleteChapter / restoreChapter | P0 | 1h | ⬜ 待开始 |
| T3 | 后端：novelChapterRoutes 新增 DELETE 和 POST restore 路由 | P0 | 0.5h | ⬜ 待开始 |
| T4 | 后端：现有章节查询默认过滤 deletedAt | P0 | 0.5h | ⬜ 待开始 |
| T5 | 后端：volumePlanChangeDetection 排除已删除章节 | P1 | 0.5h | ⬜ 待开始 |
| T6 | 前端：API 层新增删除/恢复函数 | P0 | 0.25h | ⬜ 待开始 |
| T7 | 前端：useNovelEditMutations 新增删除/恢复 mutation | P0 | 0.5h | ⬜ 待开始 |
| T8 | 前端：ChapterExecutionActionPanel 新增删除按钮 + 确认对话框 | P0 | 1h | ⬜ 待开始 |
| T9 | 前端：undo toast 组件集成 | P0 | 1h | ⬜ 待开始 |
| T10 | 前端：删除后自动选中相邻章节逻辑 | P1 | 0.5h | ⬜ 待开始 |
| T11 | 单元测试 | P1 | 1.5h | ⬜ 待开始 |
| T12 | 端到端验证 | P1 | 0.5h | ⬜ 待开始 |

---

## 逐项展开

### T1: Prisma Schema 变更

**目标**: Chapter 模型新增 `deletedAt` 字段。

**改动点**:
- `server/src/prisma/schema.prisma` — Chapter 模型
- `server/src/prisma/migrations/` — 新增 migration

**DoD**:
- `deletedAt DateTime?` 字段存在
- `prisma migrate dev` 成功
- `prisma generate` 成功

---

### T2: 后端软删除/恢复服务

**目标**: 在 `novelCoreCrudService` 中新增两个方法。

**改动点**:
- `server/src/services/novel/novelCoreCrudService.ts`

**DoD**:
- `softDeleteChapter(novelId, chapterId)` 设置 `deletedAt`
- `restoreChapter(novelId, chapterId)` 清除 `deletedAt`
- 章节不存在时抛出 404

---

### T3: 后端路由

**目标**: 新增删除和恢复 API 端点。

**改动点**:
- `server/src/modules/novel/production/http/novelChapterRoutes.ts`

**DoD**:
- `DELETE /novels/:novelId/chapters/:chapterId` 返回 `{ success, deletedAt }`
- `POST /novels/:novelId/chapters/:chapterId/restore` 返回恢复后的章节

---

### T4: 查询过滤

**目标**: 现有章节列表查询默认排除已删除章节。

**改动点**:
- 章节列表查询相关 service

**DoD**:
- 默认查询添加 `deletedAt: null` 条件
- 提供 `includeDeleted` 参数可选包含

---

### T5: 卷规划同步兼容

**目标**: 同步逻辑排除已删除章节。

**改动点**:
- `server/src/services/novel/volume/volumePlanChangeDetection.ts`

**DoD**:
- `buildVolumeSyncPlan` 查询排除 `deletedAt IS NOT NULL`

---

### T6-T7: 前端 API + Mutation

**目标**: 前端调用层支持删除/恢复。

**改动点**:
- `client/src/api/novel/chapters.ts`
- `client/src/pages/novels/hooks/useNovelEditMutations.ts`

**DoD**:
- `deleteNovelChapter(novelId, chapterId)` API 函数
- `restoreNovelChapter(novelId, chapterId)` API 函数
- 对应 mutation hooks

---

### T8: 删除按钮 + 确认对话框

**目标**: 在 AI 执行台区域显示删除按钮和确认对话框。

**改动点**:
- `client/src/pages/novels/components/ChapterExecutionActionPanel.tsx`

**DoD**:
- 选中章节后显示"删除章节"按钮
- 空章节：简单确认
- 有内容章节：字数警告确认

---

### T9: Undo Toast

**目标**: 删除后显示可撤销的 toast 通知。

**改动点**:
- 删除 mutation 的 onSuccess 回调

**DoD**:
- toast 显示"已删除「{title}」[撤销]"
- 点击撤销调用恢复 API
- 10 秒后 toast 消失

---

### T10: 删除后选中逻辑

**目标**: 删除后自动选中相邻章节。

**改动点**:
- 删除 mutation 的 onSuccess 回调

**DoD**:
- 优先选中下一个章节
- 无下一个则选上一个
- 无章节则清空选中

---

### T11-T12: 测试与验证

**目标**: 覆盖核心场景。

**DoD**:
- 软删除 + 恢复 API 测试通过
- 章节列表过滤已删除章节
- 前端删除 → undo → 恢复流程通过
