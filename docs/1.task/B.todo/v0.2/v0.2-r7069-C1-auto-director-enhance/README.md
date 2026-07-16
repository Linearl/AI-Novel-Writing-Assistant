---
reqId: 7069
title: "Auto-Director 增强"
status: requirements_ready
priority: P1
complexity: C1
estimatedEffort: "3.5天（仅 FR-1）"
version: v0.2
created: 2026-07-14
updated: 2026-07-16
---

# REQ-7069: Auto-Director 增强

## 概述

Auto-Director 全链路体验增强，涵盖 5 步创建向导（FR-1）、桌面通知系统（FR-2）、待审自动提升（FR-3）、散文质量检测器（FR-4）、冲突等级曲线（FR-5）、待审上下文注入（FR-6）、资源上下文重构（FR-7）7 个子功能。

**本次仅实现 FR-1（5 步创建向导）**，FR-2~FR-7 在后续任务包处理。

## FR-1 整合方案：Modal 内嵌可跳过引导式步骤

### 与现有功能的冲突识别

现有 `NovelCreate.tsx` 已实现三路径创建，路径 A "我有初步想法" 通过 `NovelAutoDirectorDialog`（模态对话框）完成所有设置。上游 7069 的 `AutoDirectorCreatePage` 是独立全页面 5 步顺序导航。两者核心控制器逻辑 90% 相同，差异仅在 UI 组织方式。

### 方案 C（选定）：提取共享 controller，Wizard 作为 Modal 的展开形态

- **保留现有 Modal** 作为唯一入口，不新增独立路由页面
- **新增步骤引导栏**：5 步摘要卡片（idea → basic → world_style → model_run → candidates），显示在 Modal 顶部
- **步骤为可跳过辅助引导**：用户可直接点"用默认设置直接生成方向"一键到 candidates
- **两种模式共用同一 controller**：重构现有 3 个 hook（useDirectorTaskQuery + useDirectorWorkflowMutations + useNovelAutoDirectorCandidateMutations）为统一 `useAutoDirectorCreateController`
- **路径 B/C 零改动**：素材导入和手动填写路径完全不变

### 关键决策

| # | 决策 | 选择 |
|---|------|------|
| D6 | 步骤栏定位 | 建议式引导，非强制流程 |
| D7 | Controller 策略 | 重构现有 3 个 hook 为统一 controller，不复用上游代码 |
| D8 | Stage 组件来源 | 参考上游 UI 结构，适配本项目设计系统 |
| D9 | 步骤持久化 | 内存即可，Modal 关闭时步骤进度丢失 |
| D10 | FR-2~FR-7 处理 | 本任务包只做 FR-1，其余子功能拆到后续任务包 |

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7069-auto-director-enhance.md](./REQ-7069-auto-director-enhance.md) | 需求文档（工作副本） |
| [REQ-7069-auto-director-enhance-original.md](./REQ-7069-auto-director-enhance-original.md) | 冻结副本 |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：requirements_ready
- 复杂度：C1
- 优先级：P1
- 预估工时：3.5 天（仅 FR-1）
- 依赖：无
- 预估影响文件：8-10 个（重构 + 新增）

## 不涉及的内容

- **服务端**：零改动
- **共享类型**：零改动
- **路由**：零改动（Modal 入口保持现有）
- **FR-2~FR-7**：拆到后续任务包
- **QuickPreview → Modal 回填路径**：保持现有行为不变
