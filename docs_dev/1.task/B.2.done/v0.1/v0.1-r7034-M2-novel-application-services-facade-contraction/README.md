---
description: "REQ-7034 Novel Application Services 门面收缩——README"
update_time: 2026-07-10
status: requirements_ready
---

# REQ-7034 Novel Application Services 门面收缩

## 概述

NovelApplicationServices.ts 694 行几乎全是纯委托（调用转发给子服务，无业务逻辑），130 方法接口中绝大部分是"删除测试"透明层——删除门面后调用者直接持有子服务引用，复杂性没有集中，仅移动。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7034-novel-application-services-facade-contraction.md](./REQ-7034-novel-application-services-facade-contraction.md) | 需求文档 |
| [REQ-7034-novel-application-services-facade-contraction-original.md](./REQ-7034-novel-application-services-facade-contraction-original.md) | 冻结副本 |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：需求就绪
- 复杂度：M2（中等复杂度接口重构）
- 预估影响文件：10-20 个
