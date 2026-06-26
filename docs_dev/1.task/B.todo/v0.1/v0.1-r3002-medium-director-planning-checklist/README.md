---
description: "REQ-3002 导演进度规划资源缺失 Checklist 可视化"
---

# REQ-3002 导演进度规划资源缺失 Checklist 可视化

## 概述

将 AI 自动导演进度中的"缺少规划资源"警告从单个 Badge 升级为可展开的 Checklist，让用户直观看到具体缺失哪些产物类型，并放在"后台继续"按钮右侧方便快速了解状态。

## 六件套

| 文件 | 必填 | 用途 |
| --- | --- | --- |
| [README.md](README.md) | ✅ | 任务总线（本文件） |
| [REQ-3002.md](REQ-3002.md) | ✅ | 需求文档（工作副本） |
| [REQ-3002-original.md](REQ-3002-original.md) | ✅ | 原始需求冻结副本 |
| [tasks.md](tasks.md) | ✅ | 任务拆解 |
| [design.md](design.md) | ✅ | 方案设计 |
| [decision_log.md](decision_log.md) | 无决策可省 | 决策留痕 |
| [run_result.json](run_result.json) | ✅ | 执行快照（供 req-sync.mjs 同步） |

## 关联

- 前序分析：对话中对 `DirectorEventProjectionService` 和 `DirectorArtifactLedger` 的代码走读
- 核心组件：`DirectorRuntimeProjectionCard.tsx`、`NovelAutoDirectorProgressPanel.tsx`
- 后端服务：`DirectorEventProjectionService.ts`、`DirectorWorkspaceArtifactInventory.ts`
