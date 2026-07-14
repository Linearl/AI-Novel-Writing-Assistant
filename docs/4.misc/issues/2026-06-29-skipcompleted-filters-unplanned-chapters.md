---
description: skipCompleted 过滤器与自动导演"待处理"定义冲突，导致无内容章节触发 pipeline 报错
---

# skipCompleted 误过滤未生成章节导致自动导演失败

**状态**: 待提交上游
**严重程度**: 高 — 自动导演遇到未规划章节时整个批次中断

## 问题描述

自动导演执行全书自动写作时，当处理到大纲中已创建但尚未生成正文的章节（`generationState = "planned"`, `content = ""`），pipeline 抛出 `"任务执行失败：小说或章节不存在"` 导致整个自动执行任务暂停。

## 复现步骤

1. 创建小说并完成拆章同步，生成 20 章大纲
2. 通过自动导演执行前 16 章（全部生成、审校、修复完成）
3. 自动导演继续处理第 17-20 章
4. 第 17-18 章正常完成
5. 第 19 章（`generationState = "planned"`, `content = ""`）触发报错
6. 整个自动导演任务暂停，提示"小说或章节不存在"

## 根因分析

### 三层定义冲突

| 层 | 函数 | 对无内容章节的判断 | 结果 |
|---|------|-------------------|------|
| 自动导演 | `isDirectorAutoExecutionChapterProcessed` | `hasDirectorAutoExecutionChapterContent = false` → 未处理 | 纳入 remaining |
| Pipeline 创建 | `startPipelineJob` | `buildSkipCompletedChapterWhere` 过滤无内容章节 | 排除 |
| Pipeline 执行 | `executePipeline` | `chapters.length === 0` → throw | 报错 |

### 详细链条

**Step 1：自动导演计算 remaining**

`novelDirectorAutoExecution.ts:249`:
```typescript
export function isDirectorAutoExecutionChapterProcessed(chapter): boolean {
  if (!hasDirectorAutoExecutionChapterContent(chapter)) {
    return false;  // 无内容 → 未处理 → 加入 remaining
  }
  // ...
}
```

第 19 章无内容 → `isDirectorAutoExecutionChapterProcessed = false` → `remaining = [19, 20]`

**Step 2：创建 pipeline job**

`novelCorePipelineService.ts:353`:
```typescript
const chapters = await prisma.chapter.findMany({
  where: {
    novelId,
    order: { gte: options.startOrder, lte: options.endOrder },
    ...(options.skipCompleted
      ? buildSkipCompletedChapterWhere()  // ← 过滤掉无内容章节
      : {}),
  },
});
```

`buildSkipCompletedChapterWhere` 的逻辑（`novelCorePipelineService.ts:39`）：
```typescript
function buildSkipCompletedChapterWhere(): Prisma.ChapterWhereInput {
  return {
    NOT: {
      AND: [
        { content: { not: null } },
        { content: { not: "" } },       // ← content 为空 → 被排除
        { /* generationState/chapterStatus 条件 */ },
      ],
    },
  };
}
```

第 19 章 `content = ""` → 被过滤 → `chapters = []`

**Step 3：pipeline 执行报错**

`novelCorePipelineService.ts:651`:
```typescript
if (!novel || chapters.length === 0) {
  throw new Error("任务执行失败：小说或章节不存在");
  // ← 不区分"真的不存在"和"被 skipCompleted 过滤"
}
```

### 根本原因

`buildSkipCompletedChapterWhere` 使用 `content 非空` 作为"已完成"的必要条件，但 `content 为空` 不等于"已完成"——它也可能是"尚未生成"（`generationState = "planned"`）。

自动导演和 pipeline 对"待处理"的定义不一致：
- 自动导演：无内容 = 未处理 = 需要生成 ✅
- Pipeline skipCompleted：无内容 = 已完成 = 跳过 ❌

## 影响范围

- 全书自动执行模式（`runMode = "full_book_autopilot"`）在跑到大纲有但未生成正文的章节时必现
- 按卷执行模式同样受影响
- 手动启动 pipeline 且 `skipCompleted = true` 时也可能触发

## 建议修复方案

### 方案 A：executePipeline 回退查询（防御层）

当 `skipCompleted` 导致 0 章时，去掉过滤重新查询：

```typescript
if (chapters.length === 0 && runtimePayload.skipCompleted) {
  chapters = await prisma.chapter.findMany({
    where: { novelId, order: { gte: options.startOrder, lte: options.endOrder } },
    orderBy: { order: "asc" },
  });
}
if (chapters.length === 0) {
  throw new Error("任务执行失败：指定区间内没有可处理的章节");
}
```

### 方案 B：修正 buildSkipCompletedChapterWhere（根因层）

将 `content 为空` 从"已完成"条件中移除，改为只跳过 `generationState in ["approved", "published"]` 或 `chapterStatus = "completed"` 的章节：

```typescript
function buildSkipCompletedChapterWhere(): Prisma.ChapterWhereInput {
  return {
    NOT: {
      OR: [
        { generationState: { in: ["approved", "published"] } },
        { chapterStatus: "completed" },
      ],
    },
  };
}
```

### 建议

两个方案都实施。方案 A 作为防御层防止未来类似问题，方案 B 修正根本逻辑错误。

## 相关文件

| 文件 | 行号 | 问题 |
|------|------|------|
| `server/src/services/novel/novelCorePipelineService.ts` | 39-59 | `buildSkipCompletedChapterWhere` 过滤条件过严 |
| `server/src/services/novel/novelCorePipelineService.ts` | 651-652 | `chapters.length === 0` 不区分 skipCompleted 和真正不存在 |
| `server/src/services/novel/director/automation/novelDirectorAutoExecution.ts` | 249 | `isDirectorAutoExecutionChapterProcessed` 与 skipCompleted 定义不一致 |
