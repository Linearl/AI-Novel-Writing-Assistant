---
reqId: 7071
title: "待审自动提升 — 技术设计"
status: requirements_ready
priority: P2
complexity: M2
estimatedEffort: "0.7天"
version: v0.2
created: 2026-07-16
---

# REQ-7071: 待审自动提升 — 技术设计

## 1. 核心类

```typescript
class PendingReviewAutoPromotionService {
  async preview(novelId, options): Promise<PendingReviewAutoPromotionResult>
  async apply(novelId, options): Promise<PendingReviewAutoPromotionResult>
  private async buildPreview(novelId, options): Promise<PendingReviewAutoPromotionResult>
}
```

## 2. buildPreview 流程

```
1. 查 DB: prisma.stateChangeProposal.findMany({ status: "pending_review", createdAt: { gt: since, lte: eligibleBefore } })
2. 查冲突: prisma.openConflict.findMany({ novelId, status: "open" })
3. 按 subjectKey 分组 → 每组保留最新一条
4. 冲突检测三规则（对最新一条执行）:
   a. same_chapter: proposal.chapterId === conflict.chapterId
   b. affected_character: proposal 涉及的角色与冲突的 affectedCharacterIds 重叠
   c. matched_fact: proposal fact 文本与冲突 searchText 匹配
5. 分类:
   - 有冲突 → conflictSkipped
   - 无冲突 → promotable（计入 writeBudget）
   - 同组旧版本 → superseded
   - writeBudget 超 runLimit → deferredByRunLimit
```

## 3. apply 流程

```
1. preview() 获取分类结果
2. dryRun → 直接返回 preview
3. superseded → prisma.stateChangeProposal.update({ status: "rejected" })
4. promotable → stateCommitService.commitExistingProposals({ proposalIds })
5. 记录审计日志 → directorAutomationLedgerEventService.recordEvent()
```

## 4. 依赖

即开即用：
- `prisma.stateChangeProposal` — 已存在（schema.prisma:2677）
- `prisma.openConflict` — 已存在（schema.prisma:2508）
- `stateCommitService` — 已存在（StateCommitService.ts:360）
- `directorAutomationLedgerEventService` — 已存在

## 5. 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/src/services/novel/state/PendingReviewAutoPromotionService.ts` | **新建** | 主服务实现 |
| `server/src/services/novel/state/pendingReviewAutoPromotionPolicy.ts` | **新建** | 策略常量 |
| `server/tests/pendingReviewAutoPromotion.test.ts` | **新建** | 单元测试 |
