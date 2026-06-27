---
description: "REQ-2005 方案设计"
---

# REQ-2005 方案设计

## 1. 方案概述

采用**软删除 + undo toast** 方案。Chapter 表新增 `deletedAt` 字段，后端提供删除/恢复 API，前端在章节选中后显示删除按钮，删除后通过 toast 提供 10 秒撤销窗口。

### 1.1 设计目标

1. 删除操作安全：确认对话框 + 区分空/有内容章节
2. 可恢复：软删除保留数据，undo toast 即时恢复
3. 最小侵入：不改变现有章节查询逻辑（默认过滤已删除）

### 1.2 关键决策

1. **软删除而非物理删除**：避免数据丢失，支持 undo 和后续恢复
2. **deletedAt 字段而非 isDeleted 布尔**：保留删除时间信息，便于后续清理策略
3. **undo toast 10 秒**：平衡误操作恢复和 UI 清洁
4. **默认过滤已删除章节**：在查询层统一过滤，不改变现有消费方逻辑

## 2. 实现细节

### 2.1 数据库：Prisma Schema 变更

`server/src/prisma/schema.prisma` — Chapter 模型新增字段：

```prisma
model Chapter {
  // ... existing fields
  deletedAt DateTime?  // 软删除时间戳
}
```

新增 migration。

### 2.2 后端：API 端点

#### 2.2.1 软删除

`DELETE /novels/:novelId/chapters/:chapterId`

- 路由：`server/src/modules/novel/production/http/novelChapterRoutes.ts`
- 服务：`novelCoreCrudService.ts` 新增 `softDeleteChapter()` 方法
- 逻辑：设置 `deletedAt = new Date()`，返回 `{ success: true, deletedAt }`
- 前置检查：是否有活跃的自动导演任务关联

#### 2.2.2 恢复

`POST /novels/:novelId/chapters/:chapterId/restore`

- 路由：同上
- 服务：新增 `restoreChapter()` 方法
- 逻辑：清除 `deletedAt = null`，返回恢复后的章节

#### 2.2.3 查询过滤

修改现有章节列表查询，默认添加 `WHERE deletedAt IS NULL`。

### 2.3 前端：UI 组件

#### 2.3.1 删除按钮

位置：`ChapterExecutionActionPanel.tsx` 的操作区域

- 位于主操作按钮下方，使用 `variant="ghost"` 或 `variant="outline"` + 红色文字
- 仅在选中章节时显示

#### 2.3.2 确认对话框

使用项目现有的 Dialog/AlertDialog 组件：

- 空章节：标题"删除章节"，内容"确定删除「{title}」？"，按钮 [取消] [删除]
- 有内容章节：标题"删除章节"，内容"确定删除「{title}」？此章节包含 {wordCount} 字正文。"，按钮 [取消] [删除]

#### 2.3.3 Undo Toast

使用项目现有的 Toast/Sonner 组件：

```
已删除「{title}」    [撤销]
```

- 持续时间：10 秒
- 点击"撤销"：调用 `POST .../restore`，刷新章节列表，选中恢复的章节

#### 2.3.4 删除后选中逻辑

删除成功后，自动选中：
1. 下一个章节（order > 当前）
2. 若无下一个，选上一个章节（order < 当前）
3. 若无任何章节，清空选中

### 2.4 卷规划同步兼容

`VolumeChapterSyncService` 和 `volumePlanChangeDetection.ts` 的查询应排除 `deletedAt IS NOT NULL` 的章节，避免已删除章节干扰同步逻辑。

## 3. 涉及文件

| 文件 | 改动类型 | 说明 |
| ---- | ---- | ---- |
| `server/src/prisma/schema.prisma` | 修改 | Chapter 模型新增 deletedAt |
| `server/src/prisma/migrations/` | 新增 | migration 文件 |
| `server/src/services/novel/novelCoreCrudService.ts` | 修改 | 新增 softDeleteChapter、restoreChapter |
| `server/src/modules/novel/production/http/novelChapterRoutes.ts` | 修改 | 新增删除/恢复路由 |
| `server/src/services/novel/volume/volumePlanChangeDetection.ts` | 修改 | 查询排除已删除章节 |
| `client/src/pages/novels/components/ChapterExecutionActionPanel.tsx` | 修改 | 新增删除按钮 |
| `client/src/pages/novels/hooks/useNovelEditMutations.ts` | 修改 | 新增删除/恢复 mutation |
| `client/src/api/novel/chapters.ts` | 修改 | 新增删除/恢复 API 函数 |
