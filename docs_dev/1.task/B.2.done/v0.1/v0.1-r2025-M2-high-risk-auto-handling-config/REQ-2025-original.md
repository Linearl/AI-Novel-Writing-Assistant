---
description: "自动导演高风险自动处理策略配置 - 允许用户选择高风险章节是人工审核还是自动消除"
id: REQ-2025
title: 自动导演高风险自动处理策略配置
version: 0.1
status: requirements_ready
priority: p2
complexity: medium
created: 2026-06-29
updated: 2026-06-29
tags:
  - auto-director
  - risk-control
  - quality-loop
  - user-config
related_requirements:
  - REQ-2018  # 小说项目风险管理系统
  - REQ-2020  # Chapter Pipeline Execution Mode
---

# REQ-2025: 自动导演高风险自动处理策略配置

## 1. 问题背景

当前自动导演模式下，章节质量循环（qualityLoop）评估为高风险（`overallStatus: "invalid"`）时，处理策略是硬编码的：

- **patch_repair 路径**：自动修复 → 重写 → 重规划 → 跳过（budget 链），全程静默不通知用户
- **replan 路径**：自动重规划 → replan_loop → 断路器打开 → 阻断等人工

用户反馈：某些高风险问题可以通过重写来消除，不一定需要人工介入。当前系统没有给用户选择权——高风险一律走自动修复链，修复失败就阻断或跳过，用户无法配置"遇到高风险时自动重写消除"的策略。

此外，当前高风险的修复预算（budget）与中风险共用同一套阈值（patchRepair: 2, chapterRewrite: 1, windowReplan: 1），对于高风险场景偏保守。

## 2. 目标

在创建自动导演任务的高级配置中，新增"风险控制"子卡片面板，允许用户：

1. 为高风险章节选择自动处理策略：**人工审核**（当前默认行为）或**自动消除风险**
2. 设置高风险自动消除的重试阈值（建议默认 3）
3. 高风险场景的修复预算自动放宽为正常预算的 2 倍

## 3. 范围

### 包含
- UI 层：在自动导演任务创建对话框的高级配置区域新增"风险控制"卡片
- 数据层：在 `DirectorAutoExecutionPlan` 中新增高风险策略配置字段
- 业务层：qualityLoop budget 逻辑读取高风险策略配置，调整 budget 上限和行为
- 业务层：当策略为"自动消除"且重试阈值耗尽时，回退到人工审核（阻断）

### 不包含
- 中风险/低风险的策略配置（保持现有行为不变）
- "忽略"策略（高风险不允许忽略）
- 单章节级别的策略覆盖

## 4. 非目标

- 不修改低风险和中风险的现有处理逻辑
- 不改变断路器（circuit breaker）的核心判定逻辑
- 不影响手动审校流程

## 5. EARS 验收条目

| ID | 验收条件 | 优先级 |
|----|----------|--------|
| AC-1 | 自动导演高级配置中显示"风险控制"卡片，位于所有子卡片最下方 | Must |
| AC-2 | 风险控制卡片中可选择高风险策略：人工审核（默认）或自动消除 | Must |
| AC-3 | 选择"自动消除"时，显示重试阈值配置项，默认值为 3 | Must |
| AC-4 | 高风险自动消除时，修复 budget 上限自动设为正常值的 2 倍（patchRepair: 4, chapterRewrite: 2, windowReplan: 2） | Must |
| AC-5 | 高风险策略配置持久化到 `DirectorAutoExecutionPlan` 中，随 seedPayload 保存 | Must |
| AC-6 | 后端 qualityLoop budget 逻辑读取高风险策略配置，当策略为"自动消除"时，允许高风险章节继续走修复链 | Must |
| AC-7 | 当"自动消除"策略下重试阈值耗尽（同一 issue signature 达到阈值），回退为阻断等人工处理 | Must |
| AC-8 | 当策略为"人工审核"时，行为与当前完全一致（向后兼容） | Must |
| AC-9 | 风险控制卡片在非 full_book_autopilot 模式下隐藏或禁用 | Should |

## 6. 风险与未决项

| 类型 | 描述 | 状态 |
|------|------|------|
| 风险 | 自动消除可能消耗大量 token（高风险重写） | 需 budget 限制 |
| 风险 | 用户配置不当（阈值过高）可能导致长时间无反馈 | UI 提示 + 合理默认值 |
| 未决 | 高风险自动消除是否需要通知用户（当前静默） | 需设计确认 |
| 未决 | 阈值是按 issue signature 还是全局计数 | 需设计确认 |

## 7. 关联任务包

- REQ-2018: 小说项目风险管理系统（基础）
- REQ-2020: Chapter Pipeline Execution Mode（autoReview/autoRepair 配置基础）
