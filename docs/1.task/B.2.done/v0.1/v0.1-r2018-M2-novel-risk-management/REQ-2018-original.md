---
description: "小说项目风险管理系统 — 原始需求冻结副本"
frozenAt: 2026-06-26
---

# REQ-2018 — 小说项目风险管理系统（原始需求）

> 本文件为原始需求冻结副本，由 `ll-workflow-core / req` 路由受理时自动生成。
> 工作副本见 [REQ-2018.md](./REQ-2018.md)。

## 用户原始输入

1. 小说项目需要维护风险列表（包含章节风险/流水线风险），已处理的风险也要记录而不是修复后就消失
2. 需要有一个专门的面板用于查看风险和处理情况，建议放在步骤7质量修复下面，风险需要记录对应的章节和影响评估等
3. 已经忽略/接受的风险未来需要仍然可以处理（比如未来某个时间点觉得影响太大需要处理了，可以回头来处理，这里还要评估改动影响，因为可能涉及后续多个章节的修改）
4. 需要有面板能系统评估未处理的风险对剧情的影响，并给出警示
5. 需要支持导出风险为 md/json 格式

## 环境上下文

- 项目: AI 小说创作工作台（pnpm monorepo）
- 已有风险相关代码: `server/src/services/novel/director/phases/novelDirectorQualityRepairRisk.ts` 中的 `DirectorQualityRepairRisk`（局部风险评级，仅用于质量修复阶段）
- 共享类型: `shared/types/novelDirector.ts` 中已有 `DirectorQualityRepairRisk` 接口（`riskLevel: "low" | "large_scope" | "replan"`）
- 前端: 有 `ResourceRiskPanel.tsx` 等零散风险展示组件
- 步骤 7: 质量修复阶段在 `DirectorWorkflowStepIds` 中定义
