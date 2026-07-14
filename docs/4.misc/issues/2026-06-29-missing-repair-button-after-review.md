# Issue: 审校完成后 AI 执行台缺少修复按钮

## 问题描述

章节完成审校后（`generationState === "reviewed"`），正文窗口正确显示"查看建议"和"一键修复"按钮，但右侧 AI 执行台没有显示修复按钮，用户无法从 AI 执行台触发修复操作。

## 复现步骤

1. 生成一章正文
2. 运行完整审校
3. 观察 UI 状态：
   - 左侧章节队列：显示"已审校"
   - 中间正文窗口：显示"查看建议" + "一键修复" ✅
   - 右侧 AI 执行台：**无修复按钮** ❌

## 根因分析

### 直接原因

`ChapterExecutionActionPanel.tsx` 中 `showQuickRepairAction` 的条件：

```typescript
const showQuickRepairAction = Boolean(
  selectedChapter
    && displayedStatus === "needs_repair"  // ← 只在 "needs_repair" 时显示
    && primaryAction.label !== "自动修复问题"
    && primaryAction.label !== "正在自动修复...",
);
```

当章节审校完成（`generationState === "reviewed"`）且有质量循环数据（`chapterHasContinuableQualityLoop === true`）时，`displayedStatus` 是 `"pending_review"` 而非 `"needs_repair"`，导致条件不满足。

### 根本原因

`chapterExecution.shared.tsx` 中 `resolveDisplayedChapterStatus` 函数的逻辑：

```typescript
// 当 generationState === "reviewed" 且 chapterHasContinuableQualityLoop === true 时
if (
  chapterHasContinuableQualityLoop(chapter)
  && (chapter.generationState === "reviewed" || chapter.generationState === "repaired")
) {
  return "pending_review";  // ← 永远不会返回 "needs_repair"
}
```

该函数在 `generationState === "reviewed"` 时只会返回 `"pending_review"` 或 `"completed"`，永远不会返回 `"needs_repair"`，导致 ActionPanel 的 `showQuickRepairAction` 条件永远不满足。

### 对比：正文窗口为何正常

`ChapterExecutionResultPanel.tsx` 使用了不同的逻辑：

```typescript
const needsConfirmationPrompt = displayedStatus === "pending_review"
  && (selectedChapter.generationState === "reviewed" || selectedChapter.generationState === "approved");

// 当 needsConfirmationPrompt === true 时显示修复按钮
{(needsConfirmationPrompt || needsRepairPrompt) ? (
  <Button ...>一键修复</Button>
) : null}
```

这里通过 `needsConfirmationPrompt` 覆盖了 `pending_review` + `reviewed` 的场景，所以正文窗口能正确显示修复按钮。

## 影响范围

- 影响所有已完成审校的章节
- 用户只能从正文窗口触发修复，无法从 AI 执行台触发
- 降低操作便利性，特别是当用户习惯使用右侧 AI 执行台时

## 修复方案

扩展 `ChapterExecutionActionPanel.tsx` 中 `showQuickRepairAction` 的条件：

```typescript
const showQuickRepairAction = Boolean(
  selectedChapter
    && (displayedStatus === "needs_repair"
      || (displayedStatus === "pending_review" && chapterAuditReports.length > 0))
    && primaryAction.label !== "自动修复问题"
    && primaryAction.label !== "正在自动修复...",
);
```

当 `displayedStatus === "pending_review"` 且存在审计报告时，也显示修复按钮。

## 受影响文件

| 文件 | 问题 |
|------|------|
| `client/src/pages/novels/components/ChapterExecutionActionPanel.tsx` | `showQuickRepairAction` 条件过窄 |
| `client/src/pages/novels/components/chapterExecution.shared.tsx` | `resolveDisplayedChapterStatus` 永不返回 `"needs_repair"`（根源） |

## 状态

- [x] 问题已确认
- [x] 修复已应用（本项目）
- [ ] 待提交上游
