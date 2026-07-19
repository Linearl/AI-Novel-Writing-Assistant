---
description: "REQ-2060 全局审校问题驱动章节修复闭环 — 决策记录"
---

# decision_log.md — REQ-2060

## D1：全局问题与章节问题保持独立维度

**决策**：不创建衍生 AuditIssue，GlobalReviewIssue 和 AuditIssue 各自独立管理。

**理由**：
- 全局问题可能涉及多个章节，下沉为 AuditIssue 会污染章节级问题池
- AuditIssue 没有 sourceIssueId 字段，需要改 schema
- 通过章节状态间接关联（affectedChapters + 章节 approved 状态）足够支撑自动标记
- 减少侵入性改动，保持两套系统职责清晰

## D2：合并同章节多问题为一次修复

**决策**：同一 primaryFixChapter 的所有 confirmed GlobalReviewIssue 打包为一个问题清单，一次性传入修复 prompt。

**理由**：
- 避免同一章节被重写多次，后一次覆盖前一次的修改
- LLM 能全局考量同一章节的所有问题，给出协调的修改方案
- 不同章节之间串行处理，保持因果关系
- 批量修复和单个修复共享底层修复逻辑

## D3：修复后审校采用"先定向后完整"

**决策**：修复后先做定向验证（仅检查目标全局问题是否解决），完整审校由用户手动触发。

**理由**：
- 定向验证成本低、速度快，能快速确认修复是否有效
- 完整审校可能发现修复引入的新问题，但这类检查应由用户在全部修复完成后统一触发
- 避免每次修复都跑完整审校的高成本

## D4：自动标记 fixed 基于章节状态而非修复版本

**决策**：检查 affectedChapters 中每个章节的 chapterStatus='completed' + generationState='approved'，而非查 ChapterRepairVersion 记录。

**理由**：
- 覆盖所有修复路径（修复流程、手动审校、自动导演流水线）
- 不需要新增 schema 字段
- 逻辑简单：章节 approved = 该章节的问题已修复
- 修复版本记录只追踪"通过修复流程"的场景，覆盖面不足

## D5：调整方案后需用户再次确认

**决策**：AI 重新生成 FixPlan 后，状态保持 confirmed 但内容更新，用户需要再次确认新方案。

**理由**：
- AI 重新生成的方案可能与用户预期不符
- 二次确认防止误修复
- 确认动作本身是一个轻量级操作（点一下按钮）

## D6：修复失败保持 confirmed 状态

**决策**：修复失败时 GlobalReviewIssue.status 不变，显示失败标记，用户可重试。

**理由**：
- 失败不代表问题不需要修复，保持 confirmed 状态允许重试
- 用户可以调整方案后重试，或等待系统改进后重试
- 不引入 repairAttempts 字段（当前不需要），通过修复版本记录追溯

## D7：定向验证仅针对传入的 globalReviewIssueIds

**决策**：批量修复时，定向验证只检查本次传入的全局问题是否在受影响章节中被解决。

**理由**：
- 全局问题可能影响多个章节，但修复可能只处理了 primaryFixChapter
- 只有当所有 affectedChapters 都 approved 后才自动标记 fixed
- 定向验证不检查其他未传入的全局问题，避免误判
