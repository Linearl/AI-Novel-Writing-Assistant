---
reqId: 7060
title: "Auto-Director 增强 — 任务清单"
status: requirements_ready
priority: P1
complexity: C1
estimatedEffort: "5-6天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7060: Auto-Director 增强 — 任务清单

## 阶段零：需求就绪

- [x] 需求文档完成
- [x] 技术设计完成
- [x] 任务清单完成
- [x] 决策日志完成

## 阶段一：FR-1 创建向导（2 天）

> 参照上游 `client/src/pages/novels/autoDirector/` 目录下 9 个文件

- [ ] T1: 分析上游 `directorCreateStages.ts` 状态机逻辑，适配本项目路由结构（0.2 天）
- [ ] T2: 实现 `useAutoDirectorCreateController.ts` 控制器 Hook（0.2 天）
- [ ] T3: 实现 `StageBasicSetup.tsx` 基础设置步骤（0.2 天）
- [ ] T4: 实现 `StageIdea.tsx` 创意想法步骤（0.2 天）
- [ ] T5: 实现 `StageWorldStyle.tsx` 世界观与风格步骤（0.2 天）
- [ ] T6: 实现 `StageCandidates.tsx` 候选方案步骤（含 LLM 生成）（0.3 天）
- [ ] T7: 实现 `StageModelRun.tsx` 模型运行步骤 + `StageSummaryCard.tsx`（0.2 天）
- [ ] T8: 实现 `AutoDirectorCreatePage.tsx` 主容器 + 步骤导航（0.2 天）
- [ ] T9: 中间状态 localStorage 持久化（0.1 天）
- [ ] T10: 验收：创建向导端到端流程可走通（0.2 天）

## 阶段二：FR-2 桌面通知系统（0.7 天）

> 参照上游 `client/src/lib/autoDirectorPauseNotifications.ts`（114 行）

- [ ] T11: 分析上游通知管理器实现（0.1 天）
- [ ] T12: 实现通知权限请求和管理（0.1 天）
- [ ] T13: 实现 15 秒轮询 + 状态变化检测（0.2 天）
- [ ] T14: 实现 visibilitychange 频率调整（0.1 天）
- [ ] T15: 验收：模拟暂停/恢复/完成场景验证通知（0.2 天）

## 阶段三：FR-3 待审自动提升（0.7 天）

> 参照上游 `server/src/services/novel/state/PendingReviewAutoPromotionService.ts`（594 行）

- [ ] T16: 分析上游自动提升服务逻辑（0.1 天）
- [ ] T17: 实现 14 天超时检测逻辑（0.1 天）
- [ ] T18: 实现系统校验（前置条件检查）（0.1 天）
- [ ] T19: 实现用户确认机制（EventBus 事件 + 超时处理）（0.2 天）
- [ ] T20: 集成到定时任务（0.1 天）
- [ ] T21: 验收：模拟超时场景验证完整流程（0.1 天）

## 阶段四：FR-4 散文质量检测器（0.7 天）

> 参照上游 `server/src/services/novel/runtime/proseQuality/ProseQualityDetector.ts`（450 行）

- [ ] T22: 分析上游检测器的 regex 规则（0.1 天）
- [ ] T23: 实现 `ProseQualityDetector` 类（0.1 天）
- [ ] T24: 实现 9 种问题码的 regex 模式（0.2 天）
- [ ] T25: 实现检测结果结构化输出（0.1 天）
- [ ] T26: 验收：用样本文本验证 9 种问题码检测（0.2 天）

## 阶段五：FR-5 冲突等级曲线（0.7 天）

> 参照上游 `client/src/components/tensionCurve/`（10 文件）
> 注意：与 REQ-7063 共享上游参考代码

- [ ] T27: 定义冲突等级曲线数据模型（0.1 天）
- [ ] T28: 实现曲线可视化组件（参考 recharts 或上游 React Flow）（0.2 天）
- [ ] T29: 实现拖拽编辑交互（0.2 天）
- [ ] T30: 冲突等级作为硬约束注入生成上下文（0.1 天）
- [ ] T31: 验收：可编辑曲线并在审校中体现（0.1 天）

## 阶段六：FR-6 待审上下文注入 + FR-7 资源上下文重构（0.8 天）

- [ ] T32: 实现待审上下文组装（前文摘要 + 角色状态 + 世界变更）（0.2 天）
- [ ] T33: 集成到章节审核 prompt 构建流程（0.1 天）
- [ ] T34: 设计统一的资源上下文组装接口（0.1 天）
- [ ] T35: 迁移现有散落的上下文组装调用（0.2 天）
- [ ] T36: 验收：上下文注入前后审校质量对比（0.2 天）

## 阶段七：测试与验证（1 天）

- [ ] T37: FR-1 单元测试（状态机、步骤验证、持久化）（0.2 天）
- [ ] T38: FR-2 单元测试（通知管理器、轮询逻辑）（0.1 天）
- [ ] T39: FR-3 单元测试（超时检测、确认机制）（0.1 天）
- [ ] T40: FR-4 单元测试（9 种 regex 规则验证）（0.1 天）
- [ ] T41: 集成测试（创建向导完整流程）（0.2 天）
- [ ] T42: typecheck 全量验证（0.1 天）
- [ ] T43: pnpm test 通过（0.1 天）

## 阶段八：收尾

- [ ] T44: 更新 requirements.md
- [ ] T45: 更新任务包 README 状态
- [ ] T46: 更新 run_result.json 状态
- [ ] T47: 提交变更

## 完成标准

- [ ] 所有任务完成
- [ ] typecheck 通过
- [ ] 测试覆盖率 > 80%
- [ ] 创建向导端到端可走通
- [ ] 通知、自动提升、散文检测功能验证通过
