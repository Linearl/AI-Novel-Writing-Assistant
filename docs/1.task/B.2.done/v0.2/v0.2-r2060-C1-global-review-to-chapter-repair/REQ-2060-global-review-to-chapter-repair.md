---
description: "REQ-2060 全局审校问题驱动章节修复闭环 — 需求规格"
req_id: "2060"
title: "全局审校问题驱动章节修复闭环"
version: "0.2"
status: "draft"
created: "2026-07-18"
---

# REQ-2060 全局审校问题驱动章节修复闭环

## 1. 目标

打通全局审校（GlobalReviewIssue）与章节修复（ChapterRepair）之间的完整闭环：全局审校发现问题 → 用户确认/调整修复方案 → 批量或单个触发章节修复 → 自动审校验证 → 标记已修复。

## 2. 背景与动机

当前全局审校与章节修复是两套完全独立的系统：

1. **全局审校**产生 `GlobalReviewIssue`（novel 级），记录跨章节问题，有 `affectedChapters` 和 `primaryFixChapter` 字段，但修复后只能人工翻转 `status`。
2. **章节修复**消费 `AuditIssue`（chapter 级），通过 `auditIssueIds` 传入修复 prompt，完全不知道全局问题的存在。
3. 唯一的间接关联是 `fetchGlobalReviewFeedbackForChapter`，在章节审校时把 `pending` 状态的全局问题注入 audit prompt，但问题一旦被 `acknowledged` 就不再注入。
4. UI 只有"确认/标记已修复/忽略"三个按钮，没有"执行修复"入口。

**影响**：用户必须手动复制问题描述、手动定位章节、手动触发修复、手动标记已修复，整个流程完全依赖人工串联。

## 3. 用户决策摘要

| # | 决策点 | 用户选择 |
|---|--------|----------|
| D1 | 修复方案粒度 | 采用建议，每个全局问题包含 summary + targetChapters + approach（详细）+ risks + estimatedScope |
| D2 | 同章节多问题合并 | 合并为一次修复（按 primaryFixChapter 分组，同一章节的所有确认问题打包） |
| D3 | 修复后审校策略 | C：先定向验证（仅检查目标问题是否解决），完整审校由用户手动触发 |
| D4 | 批量修复 vs 单个修复 | 理解正确：批量 = 所有 confirmed 问题按章节分组串行；单个 = 只处理该问题 |
| D5 | 调整方案后是否需确认 | 是，AI 重新生成方案后需要用户再次确认 |
| D6 | 修复失败处理 | 保持 confirmed 状态，显示失败标记，用户可重试或调整方案 |
| D7 | 全局问题与章节问题关系 | 两个独立维度，不创建衍生 AuditIssue |
| D8 | 自动标记 fixed 触发 | 章节修复通过 / 章节审校通过后，检查该章节关联的所有 confirmed GlobalReviewIssue 的 affectedChapters 是否全部 approved |

## 4. 修复方案数据结构

```typescript
interface FixPlan {
  summary: string;           // 修复方案摘要（用户可读）
  targetChapters: string[];  // 需要修改的章节 ID
  approach: string;          // 具体修复策略（详细）
  risks: string[];           // 可能影响的其他内容
  estimatedScope: 'light' | 'moderate' | 'heavy'; // 修复力度
}
```

用户调整方案时修改 `approach` 和 `risks`，系统据此重新生成。

## 5. 修复流程

### 5.1 批量修复（3.1）

```text
用户点击"批量修复"
  ↓
按 primaryFixChapter 分组：chapter_A: [issue_1, issue_3], chapter_B: [issue_2]
  ↓
按章节顺序串行修复：
  每章：查 open AuditIssue + confirmed GlobalReviewIssue → 合并问题清单 → 修复
  每章修复后：定向验证（仅检查该章的全局问题是否解决）
  ↓
全部章节完成后：
  用户可手动触发完整审校（验证无回归）
  ↓
定向验证通过的 GlobalReviewIssue → 自动标记 fixed
```

### 5.2 单个修复（3.2）

```text
用户点击问题卡片上的"修复"
  ↓
查 primaryFixChapter + affectedChapters
  ↓
查该章节的 open AuditIssue + 当前 GlobalReviewIssue → 合并修复
  ↓
定向验证 → 通过标记 fixed / 失败保持 confirmed
```

## 6. 自动标记 fixed 逻辑

章节变为"已修复"（通过修复流程或手动审校）时触发检查：

```text
章节修复成功（isPass）/ 章节审校通过（chapterStatus='completed'）
  ↓
查询：GlobalReviewIssue WHERE
  novelId = ? AND
  status IN ('pending', 'confirmed') AND
  affectedChapters CONTAINS chapterId
  ↓
对每条匹配的 GlobalReviewIssue：
  → 取出 affectedChapters 数组
  → 逐个检查该章节是否 approved + completed
  → 若全部 approved → updateIssueStatus('fixed')
  → 若仍有未修复 → 保持当前状态
```

**边界情况**：
- 章节被修复后又回退 → 全局问题保持 confirmed
- 用户点"忽略" → status=dismissed，不参与检查
- affectedChapters 中某章节被删除 → 从数组中移除，剩余满足即可
- 用户手动修了章节但没跑审校 → 章节 status 不是 completed，不自动标记（需要至少一次审校验证）
- 用户可手动点"标记已修复"作为兜底

## 7. 修复方案重新生成

```text
用户点"调整方案"
  ↓
弹窗显示当前 FixPlan
  ↓
用户输入修改意见
  ↓
AI 重新生成修复方案（仅该问题）：
  输入：原始问题描述 + 当前 FixPlan + 用户修改意见 + 相关章节上下文
  输出：新的 FixPlan
  ↓
更新 GlobalReviewIssue.fixDirection
  ↓
用户再次确认
```

## 8. 不在范围内

- 跨章节协同修复（affectedChapters > 1 时的多章串行联动上下文）
- 批量修复的 SSE 进度推送
- 修复版本回滚与 GlobalReviewIssue 状态联动
- 自动导演流水线中的全局问题检查挂载

## 9. 验收标准

- **EARS-1**：全局审校确认问题后，批量修复能按章节分组串行执行全部 confirmed 问题的修复
- **EARS-2**：单个问题修复能正确传递该问题的 description + fixDirection 到修复 prompt
- **EARS-3**：章节修复 prompt 中合并了 open AuditIssue 和 confirmed GlobalReviewIssue
- **EARS-4**：修复通过后定向验证仅检查目标全局问题是否解决
- **EARS-5**：受影响章节全部 approved 后，对应 GlobalReviewIssue 自动标记 fixed
- **EARS-6**：调整方案后 AI 重新生成 FixPlan，用户确认后更新
- **EARS-7**：修复失败保持 confirmed 状态，用户可重试
- **EARS-8**：现有章节修复流程（不涉及全局问题时）不受影响

## 10. 关键代码位置

| 文件 | 作用 |
|------|------|
| `GlobalReviewService.ts` | 全局审校服务，问题生成与状态管理 |
| `novelReviewRoutes.ts` | repair 与 global-review 路由 |
| `novelHttpSchemas.ts` | repairSchema（需扩展） |
| `novelCoreSharedTypes.ts` | RepairOptions 类型（需扩展） |
| `ChapterRepairStreamRuntime.ts` | 修复流主入口 |
| `chapterRepairRuntime.ts` | 修复执行准备 |
| `chapterAuditContext.ts` | 修复上下文装配 |
| `review.prompts.ts` | 修复 prompt（需扩展 preferredGroups） |
| `auditContextBuilder.ts` | 全局问题回灌入口 |
| `GlobalReviewPage.tsx` | 全局审校 UI |
| `useNovelEditChapterRuntime.ts` | 章节修复触发 |
