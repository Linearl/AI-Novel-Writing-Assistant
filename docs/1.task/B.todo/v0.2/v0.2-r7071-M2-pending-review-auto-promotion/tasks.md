---
reqId: 7071
title: "待审自动提升 — 任务清单"
status: requirements_ready
priority: P2
complexity: M2
estimatedEffort: "0.7天"
version: v0.2
created: 2026-07-16
---

# REQ-7071: 待审自动提升 — 任务清单

## 阶段零：需求就绪

- [x] 需求文档完成
- [x] 技术设计完成
- [x] 任务清单完成
- [x] 决策日志完成

## 阶段一：核心实现

- [ ] T1: 分析上游 `PendingReviewAutoPromotionService.ts` 逻辑（0.1 天）
- [ ] T2: 实现 `buildPreview` 核心方法 — 扫描 + 去重 + 冲突检测 + 分类（0.2 天）
- [ ] T3: 实现 `apply` 方法 — reject superseded + commit promotable + 审计日志（0.1 天）
- [ ] T4: 实现策略常量（14 天阈值、runLimit、scanLimit、proposalTypes）（0.05 天）

## 阶段二：集成与测试

- [ ] T5: 集成到定时任务/调度入口（或导出服务供手动/API 触发）（0.05 天）
- [ ] T6: 单元测试 — mock 提案数据验证分类逻辑（0.1 天）
- [ ] T7: 验证：模拟超时场景端到端走通（0.05 天）

## 阶段三：收尾

- [ ] T8: typecheck 通过
- [ ] T9: 更新 README + run_result 状态
- [ ] T10: 提交

## 完成标准

- [ ] preview 正确扫描超期待审提案
- [ ] 冲突检测三规则均有效
- [ ] promotable 通过 StateCommitService 提交
- [ ] runLimit/scanLimit 生效
- [ ] 审计日志写入
- [ ] typecheck + 单元测试通过
