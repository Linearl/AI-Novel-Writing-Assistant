---
description: "REQ-2060 全局审校问题驱动章节修复闭环 — 技术设计"
---

# design.md — REQ-2060

## 核心思路

在章节修复 runtime 的准备阶段增加 `GlobalReviewIssue` 查询，将全局问题合并到章节修复上下文中；修复成功后自动检查并回写全局问题状态。两个问题维度保持独立，通过章节状态间接关联。

## 架构图

```text
┌─────────────────────────────────────────────────────────┐
│                    GlobalReviewPage                      │
│  IssueCard: [确认] [调整方案] [修复] [忽略] [标记已修复]  │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   批量修复        单个修复      调整方案
   (章节分组)    (单问题触发)   (AI重新生成)
        │              │
        ▼              ▼
┌───────────────────────────────────────────┐
│     POST /:id/chapters/:chapterId/repair  │
│     + globalReviewIssueIds: string[]      │
└──────────────────────┬────────────────────┘
                       ▼
┌───────────────────────────────────────────┐
│     ChapterRepairStreamRuntime            │
│  1. 查 open AuditIssue (existing)        │
│  2. 查 confirmed GlobalReviewIssue (new)  │
│  3. 合并为统一问题清单                     │
│  4. 构造修复 prompt + issuesJson           │
└──────────────────────┬────────────────────┘
                       ▼
┌───────────────────────────────────────────┐
│     finalizeRepairResult                  │
│  1. 保存修复版本                           │
│  2. 定向验证（仅检查目标全局问题）           │
│  3. 若通过: resolveIssues + 回写 fixed     │
│  4. 检查 affectedChapters 是否全部 approved │
└───────────────────────────────────────────┘
```

## 改动点

### 1. 数据层：Schema 扩展

**`novelHttpSchemas.ts` — repairSchema**

```typescript
// 现有
repairSchema = llmGenerateSchema.extend({
  reviewIssues: z.array(reviewIssueSchemaStrict).optional(),
  auditIssueIds: z.array(z.string().trim().min(1)).optional(),
  userInstruction: z.string().trim().max(4000).optional(),
});

// 新增
repairSchema = llmGenerateSchema.extend({
  reviewIssues: z.array(reviewIssueSchemaStrict).optional(),
  auditIssueIds: z.array(z.string().trim().min(1)).optional(),
  globalReviewIssueIds: z.array(z.string().trim().min(1)).optional(),  // ← 新增
  userInstruction: z.string().trim().max(4000).optional(),
});
```

**`novelCoreSharedTypes.ts` — RepairOptions**

```typescript
// 现有
interface RepairOptions {
  reviewIssues?: ReviewIssue[];
  auditIssueIds?: string[];
  userInstruction?: string;
}

// 新增
interface RepairOptions {
  reviewIssues?: ReviewIssue[];
  auditIssueIds?: string[];
  globalReviewIssueIds?: string[];  // ← 新增
  userInstruction?: string;
}
```

### 2. 运行时：修复准备阶段注入全局问题

**`ChapterRepairStreamRuntime.ts` — resolveRepairIssues**

在现有 `resolveRepairIssues` 方法末尾（现有 AuditIssue 查询之后），增加全局问题查询：

```typescript
// 新增：查询 GlobalReviewIssue 并转换为 ReviewIssue
if (options.globalReviewIssueIds?.length) {
  const globalIssues = await prisma.globalReviewIssue.findMany({
    where: {
      id: { in: options.globalReviewIssueIds },
      status: { in: ['pending', 'confirmed'] },
    },
  });

  for (const gi of globalIssues) {
    reviewIssues.push({
      code: `GLOBAL_${gi.id.slice(0, 8)}`,
      severity: mapGlobalSeverity(gi.severity),  // critical→critical, major→high, minor→medium
      category: mapGlobalCategory(gi.category),  // character_consistency→logic, ...
      description: gi.description,
      evidence: `[全局问题 ${gi.id.slice(0, 8)}] ${gi.description}`,
      fixSuggestion: gi.fixDirection,
      sourceType: 'global_review',
      sourceIssueId: gi.id,
    });
  }
}
```

**辅助函数映射**：

```typescript
function mapGlobalSeverity(severity: string): string {
  const map: Record<string, string> = { critical: 'critical', major: 'high', minor: 'medium' };
  return map[severity] ?? 'medium';
}

function mapGlobalCategory(category: string): string {
  const map: Record<string, string> = {
    character_consistency: 'logic',
    plot_continuity: 'coherence',
    foreshadowing: 'coherence',
    pacing: 'pacing',
    worldbuilding: 'logic',
  };
  return map[category] ?? 'coherence';
}
```

### 3. Prompt 层：修复 prompt 注入全局问题上下文

**`review.prompts.ts` — chapterRepairPrompt**

```typescript
// 现有 preferredGroups
preferredGroups: ['repair_issues', 'chapter_boundary', 'chapter_mission', 'repair_boundaries', 'world_rules']

// 新增
preferredGroups: ['repair_issues', 'chapter_boundary', 'chapter_mission', 'repair_boundaries', 'world_rules', 'global_review_feedback']
```

**`chapterAuditContext.ts` — assembleChapterAuditContextPackage**

修复上下文装配时调用 `fetchGlobalReviewFeedbackForChapter`，注入跨章上下文：

```typescript
// 在修复上下文装配中新增
const globalReviewFeedback = await fetchGlobalReviewFeedbackForChapter(
  chapterId, novelId, prisma
);
if (globalReviewFeedback) {
  contextBlocks.push(globalReviewFeedback);
}
```

### 4. 运行时：修复后状态回写

**`ChapterRepairStreamRuntime.ts` — finalizeRepairResult**

在 `isPass` 分支中，现有 `auditService.resolveIssues` 之后：

```typescript
// 新增：回写 GlobalReviewIssue 状态
if (options.globalReviewIssueIds?.length && isPass(review.score)) {
  // 1. 标记传入的全局问题为 fixed
  for (const issueId of options.globalReviewIssueIds) {
    await globalReviewService.updateIssueStatus(novelId, issueId, 'fixed');
  }

  // 2. 检查其他关联的全局问题
  await checkGlobalReviewIssuesAfterChapterRepair(novelId, chapterId, prisma, globalReviewService);
}
```

### 5. 状态检查：自动标记 fixed

**新增函数 `checkGlobalReviewIssuesAfterChapterRepair`**

```typescript
async function checkGlobalReviewIssuesAfterChapterRepair(
  novelId: string,
  chapterId: string,
  prisma: PrismaClient,
  globalReviewService: GlobalReviewService,
) {
  // 查询受影响的 confirmed/pending 全局问题
  const affectedIssues = await prisma.globalReviewIssue.findMany({
    where: {
      novelId,
      status: 'confirmed',
    },
  });

  for (const issue of affectedIssues) {
    const affectedChapters: string[] = JSON.parse(issue.affectedChapters || '[]');
    if (!affectedChapters.includes(chapterId)) continue;

    // 检查所有受影响章节是否全部 approved + completed
    const chapters = await prisma.chapter.findMany({
      where: { id: { in: affectedChapters } },
      select: { id: true, chapterStatus: true, generationState: true },
    });

    const allFixed = chapters.every(
      ch => ch.chapterStatus === 'completed' && ch.generationState === 'approved'
    );

    if (allFixed) {
      await globalReviewService.updateIssueStatus(novelId, issue.id, 'fixed');
    }
  }
}
```

**挂载时机**：
1. `ChapterRepairStreamRuntime.finalizeRepairResult` — 修复通过后
2. `AuditService.auditChapter` — 章节审校通过后（`chapterStatus='completed'`）

### 6. UI 层：全局审校页面

**`GlobalReviewPage.tsx` — IssueCard 扩展**

```typescript
// 新增按钮（status === 'confirmed' 时显示）
- "执行修复" → 触发单个问题修复
- "调整方案" → 打开调整方案弹窗

// 受影响章节 Badge 改为可点击
- 点击跳转到 /novels/:id/chapters/:chapterId?globalReviewIssueIds=:issueId

// "标记已修复"保留作为兜底
```

**新增 `FixPlanAdjustDialog` 组件**

```typescript
// 弹窗内容：
// - 当前 FixPlan.summary（只读）
// - 当前 FixPlan.approach（可编辑 textarea）
// - 当前 FixPlan.risks（可编辑）
// - 用户修改意见（textarea）
// - "重新生成方案"按钮 → 调用 AI 生成新 FixPlan
// - "确认方案"按钮 → 更新 GlobalReviewIssue.fixDirection
```

### 7. 章节编辑页：读取 URL 参数

**`useNovelEditChapterRuntime.ts`**

```typescript
// 读取 URL 中的 globalReviewIssueIds 参数
const searchParams = new URLSearchParams(window.location.search);
const globalReviewIssueIds = searchParams.get('globalReviewIssueIds')?.split(',') ?? [];

// 传入 startChapterRepair
startChapterRepair({
  globalReviewIssueIds,
  userInstruction: issue?.fixDirection, // 自动填充
});
```

## 不改动

- `fetchGlobalReviewFeedbackForChapter` 的查询逻辑（保持只查 pending）
- `auditService.resolveIssues` 的实现（保持按 issueId 精确匹配）
- `ChapterRepairVersion` schema（不新增 globalReviewIssueIds 字段，通过修复版本的 issuesJson 追溯）
- 自动导演流水线
