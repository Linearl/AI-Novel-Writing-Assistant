---
description: "REQ-7064 Service 层 DI 依赖注入迁移"
update_time: 2026-07-14
status: requirements_ready
---

> 创建日期：2026-07-14
> 目标版本：v0.2
> 状态：🚧 进行中

---

## 1. 任务概述

### 1.1 需求来源

- 技术债审计：`docs/2.tech/architecture/dependency-injection.md`（REQ-7019 产出物）
- 现状：接口层（`platform/di/interfaces.ts`）已创建，但 Phase 3 Service 改造零完成

### 1.2 核心内容

1. 将 5 个核心 Service 迁移到 DI 构造函数注入模式
2. 新测试一律使用 DI mock，旧 prismaMock 测试顺带迁移
3. 保持向后兼容：构造函数默认值确保生产代码零改动

### 1.3 前置条件

- `server/src/platform/di/interfaces.ts` 已定义 `IDatabase`、`ILlmClient`（✅ 已完成）

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-7064-original.md` | 需求原始冻结副本 | 否 |
| `REQ-7064.md` | 需求工作副本（持续更新） | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策日志 | 否 |
| `run_result.json` | 运行结果 | 否 |
