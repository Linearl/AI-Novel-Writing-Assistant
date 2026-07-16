---
description: "REQ-7071 待审自动提升——需求文档"
---

# REQ-7071 待审自动提升

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 需求编号 | REQ-7071 |
| 优先级 | P2 |
| 版本 | v0.2 |
| 状态 | requirements_ready |
| 来源 | 上游仓库 `AI-Novel-Writing-Assistant-main` 参考实现 `server/src/services/novel/state/PendingReviewAutoPromotionService.ts`（594 行） |

---

## 1. 背景与问题

自动导演在运行中产生大量状态变更提案（StateChangeProposal），进入 `pending_review` 状态等待人类确认。用户长时间不处理会导致提案积压、导演流水线卡住——后续章节依赖前文资源状态确定后方可继续。

## 2. 目标与范围

### 2.1 目标

1. 自动检测超过 14 天未处理的待审提案并放行
2. 确保有未解决冲突的提案不被自动放行

### 2.2 In Scope

- 扫描该小说下 status="pending_review" 且超过阈值的提案
- 冲突检测：提案与 OpenConflict 按章节/角色/fact 文本三重匹配
- 同 subjectKey 的多条提案去重（只保留最新）
- 单次执行数量上限（runLimit）防止批量事故
- dryRun 预览模式
- 审计日志记录

### 2.3 Out of Scope

- 用户确认 UI（后续任务包处理）
- 通知用户有提案被自动放行（FR-2 桌面通知可覆盖）

---

## 3. 需求详情

参考上游 `PendingReviewAutoPromotionService.ts`（594 行）。

核心逻辑（`buildPreview`）：
1. 查 DB：status="pending_review" + createdAt > 14 天前的 StateChangeProposal
2. 查冲突：同小说 status="open" 的 OpenConflict
3. 按 subjectKey 分组，同 topic 只保留最新一条
4. 冲突检测三规则：同一章节 / 受影响角色重叠 / fact 文本匹配
5. 分类输出：promotable（无冲突放行）/ conflictSkipped（有冲突跳过）/ superseded（老旧版本 reject）/ deferredByRunLimit（超限下次处理）

前置依赖已有：`StateChangeProposal` 模型、`OpenConflict` 模型、`StateCommitService`（含 `commitExistingProposals`）。

---

## 4. 验收标准

- [ ] preview 模式正确扫描超期待审提案
- [ ] 冲突检测三规则均有效过滤
- [ ] superseded 提案被正确 reject
- [ ] promotable 提案通过 StateCommitService 成功提交
- [ ] runLimit 和 scanLimit 生效
- [ ] 审计日志写入 DirectorAutomationLedgerEvent
- [ ] typecheck 通过
- [ ] 单元测试覆盖核心分类逻辑

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| 误放行有争议提案 | 14 天阈值 + 三重冲突检测 |
| 批量事故 | runLimit 上限 + dryRun 先行 |

---

## 6. 关联与边界

- 前置依赖已就绪：StateChangeProposal（schema.prisma:2677）、OpenConflict（schema.prisma:2508）、StateCommitService
- 与 REQ-7075（FR-6 待审上下文）的关系：本包处理提案的自动放行，7075 处理放行后的上下文注入
- 与 REQ-7070（FR-2 桌面通知）的关系：独立，无共享代码

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-16 | 创建 | 从 REQ-7069 拆分 |
