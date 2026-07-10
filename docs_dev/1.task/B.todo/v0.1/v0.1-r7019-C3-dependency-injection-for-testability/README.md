---
description: "REQ-7019 依赖注入提升可测试性——README"
update_time: 2026-07-10
status: requirements_ready
---

# REQ-7019 依赖注入提升可测试性

## 概述

全项目无 DI 容器。测试通过 `prismaMock.js` 直接 monkey-patch Prisma 方法，脆弱、非线程安全、无法 mock Prisma 以外的依赖。本任务引入轻量 DI 方案（tsyringe 或工厂函数手动注入），从 director 核心模块开始改造 3-5 个核心 service，改写 10-15 个相关测试使用注入 mock 替代 monkey-patch。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7019-dependency-injection-for-testability.md](./REQ-7019-dependency-injection-for-testability.md) | 需求文档 |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：需求就绪
- 复杂度：C3（高复杂度，高优先级）
- 预估影响文件：15-25 个
