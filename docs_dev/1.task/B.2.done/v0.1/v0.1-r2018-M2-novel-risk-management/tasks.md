---
description: "小说项目风险管理系统 — 任务拆解"
reqId: REQ-2018
created: 2026-06-26
---

# REQ-2018 任务清单

## 阶段零：准备工作

- [x] T0.1 分析现有风险相关代码，确认复用与重构范围
- [x] T0.2 确认 Prisma schema 变更影响范围（现有 Novel/Chapter 关系、迁移策略）

## 阶段一：数据模型（shared + prisma）

- [x] T1.1 在 `shared/types/` 下新建 `novelRisk.ts`，定义所有风险相关类型和枚举
- [x] T1.2 在 Prisma schema 中添加 `NovelRisk` 和 `RiskAuditLog` 模型，生成迁移
- [x] T1.3 构建 shared 包，确保类型无编译错误

## 阶段二：后端服务层 + API

- [x] T2.1 实现 `NovelRiskService`：创建、状态变更、查询、风险评估核心逻辑
- [x] T2.2 实现风险创建钩子：在 `buildDirectorQualityRepairRisk` 调用侧接入风险自动创建
- [x] T2.3 实现 API 路由：`/api/novels/:novelId/risks/**`
- [x] T2.4 实现风险评估接口：综合未处理风险对剧情的影响分析
- [x] T2.5 实现回溯影响评估：重新打开风险时计算下游章节影响范围
- [x] T2.6 实现导出功能：md/json 格式的风险报告生成
- [x] T2.7 编写后端单元测试（service + routes）

## 阶段三：前端 — 风险面板

- [x] T3.1 创建 `RiskPanel` 可折叠面板组件（放在步骤 7 质量修复下方）
- [x] T3.2 创建 `RiskList` 和 `RiskItem` 列表组件（含过滤功能）
- [x] T3.3 创建 `RiskDetail` 详情展示组件（含审计时间线）
- [x] T3.4 创建 `RiskActions` 操作组件（状态变更、评论）
- [x] T3.5 创建 `RiskStatusBadge` / `RiskSeverityIcon` 等原子 UI 组件
- [x] T3.6 集成到步骤 7 对应的页面路由中

## 阶段四：前端 — 风险评估与回溯

- [x] T4.1 创建 `RiskAssessmentBanner` 警示横幅组件
- [x] T4.2 创建 `RiskAssessmentSummary` 综合评估面板
- [x] T4.3 创建 `RiskReopenImpactPanel` 回溯影响评估面板
- [x] T4.4 实现前端 API 请求层（risk 相关 hooks/actions）

## 阶段五：导出功能

- [x] T5.1 创建 `RiskExportButton` 导出按钮组件
- [x] T5.2 实现前端导出下载逻辑（md / json）

## 阶段六：验证

- [x] T6.1 类型检查全仓库通过
- [x] T6.2 单元测试通过（server）
- [x] T6.3 端到端验证：风险自动创建 → 面板查看 → 状态变更 → 回溯 → 导出

## 依赖关系

```
T0.1 ──→ T1.1, T1.2 ──→ T1.3 ──→ T2.1 ──→ T2.2..T2.7
                 │                        │
                 └──→ T3.1..T3.6 ←────────┘
                          │
                          └──→ T4.1..T4.4
                          │
                          └──→ T5.1..T5.2
                                    │
                                    └──→ T6.1..T6.3
```
