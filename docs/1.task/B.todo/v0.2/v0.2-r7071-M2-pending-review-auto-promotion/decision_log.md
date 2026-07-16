---
reqId: 7071
title: "待审自动提升 — 决策日志"
status: in_progress
priority: P2
complexity: M2
estimatedEffort: "0.7天"
version: v0.2
created: 2026-07-16
---

# REQ-7071: 待审自动提升 — 决策日志

## 决策1: 实现方式

**决策日期**：2026-07-16

**选项**：
- 方案A: 直接移植上游实现，适配本项目依赖注入模式
- 方案B: 参考上游思路重新实现

**决策**：✅ 方案A

**理由**：
1. 上游实现完整（594 行），已验证可用
2. 所有前置依赖（StateChangeProposal、OpenConflict、StateCommitService）本项目已就绪
3. 上游的 conflict detection 三规则逻辑成熟，不需要重新设计

## 决策2: 从 REQ-7069 拆分为独立包

**理由**：FR-3（本包）与 FR-1（创建向导）零代码耦合，纯服务端 vs 纯客户端，独立开发、独立 review、独立回滚更安全。

## 决策3: 与 FR-2 不打包

FR-2（桌面通知）和 FR-3（本包）零共享代码、零共享数据模型、不同运行层、不同领域（通知 vs 叙事引擎）。打包在一起无技术收益，只会增加回滚粒度。
