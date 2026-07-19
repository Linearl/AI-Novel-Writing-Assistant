---
description: "REQ-2058 卷生成链路 outline + material_index 接线"
update_time: 2026-07-18
---
# REQ-2058 卷生成链路 outline + material_index 接线

## 概述

将用户素材（outline）和材料索引（material_index）接入卷生成管线，使卷战略、节奏段等步骤能看到用户提供的世界观、角色、大纲等原始素材。

## 六件套

| 文件 | 必填 | 用途 |
| --- | --- | --- |
| [README.md](README.md) | ✅ | 任务总线（本文件） |
| [REQ-2058-outline-material-wiring.md](REQ-2058-outline-material-wiring.md) | ✅ | 需求文档（工作副本） |
| [REQ-2058-outline-material-wiring-original.md](REQ-2058-outline-material-wiring-original.md) | ✅ | 原始需求冻结副本 |
| [tasks.md](tasks.md) | ✅ | 任务拆解 |
| [design.md](design.md) | ✅ | 方案设计（跨模块，需要设计文档） |
| [decision_log.md](decision_log.md) | 无决策可省 | 决策留痕 |
| [run_result.json](run_result.json) | ✅ | 执行快照（供 req-sync.js 同步） |

## 关联

- 来源：REQ-2054（material-import-system）T4.3/T4.4 未完成项
- 依赖：NovelMaterial 表、NovelPromptMaterialExporter、material_index 上下文组（均已实现）
- 上游：volumeGenerationOrchestrator.ts 已加载 outline 到 VolumeGenerationNovel
