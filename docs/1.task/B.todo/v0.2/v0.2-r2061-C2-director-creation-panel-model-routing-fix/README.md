---
description: "REQ-2061 自动导演模型配置统一与运行时切换 — 任务包 README"
update_time: 2026-07-20
---

# REQ-2061: 自动导演模型配置统一与运行时切换

## 元信息

| 字段 | 内容 |
| ---- | ---- |
| 任务编号 | REQ-2061 |
| 版本 | v0.2 |
| 复杂度 | C2 |
| 优先级 | P2 |
| 状态 | requirements_ready |
| 创建日期 | 2026-07-20 |
| 更新日期 | 2026-07-20 |

## 问题概述

自动导演配置分散在 4 个位置，模型路由默认被绕过，运行中无法切换模型：

1. 创建面板强制指定 provider/model → 路由失效
2. temperature 缺失 → provider 和 temperature 来源不一致
3. modelTier/policy mode 只能在创建后设置
4. 运行中无法切换模型（架构已支持，缺 API + UI）

## 文件清单

| 文件 | 说明 |
| ---- | ---- |
| [README.md](README.md) | 本文件 |
| [REQ-2061-...-fix.md](REQ-2061-director-creation-panel-model-routing-fix.md) | 工作副本 |
| [REQ-2061-...-fix-original.md](REQ-2061-director-creation-panel-model-routing-fix-original.md) | 冻结副本 |
| [tasks.md](tasks.md) | 任务分解（4 阶段） |
| [design.md](design.md) | 技术设计 |
| [decision_log.md](decision_log.md) | 决策日志（4 条） |
| [run_result.json](run_result.json) | 执行状态 |

## 关键设计

- `LLMSelector` 增加 `allowRouteModel` + `showTemperature` prop
- 创建面板合并"模型与质量"区块 + "高级策略"折叠区
- 运行中切换模型：扩展 `policy_update` 命令，复用 `applyAutoDirectorLlmOverride`
- 后端每个步骤从 DB 重新读取 seed payload，更新后下一步骤自动生效
