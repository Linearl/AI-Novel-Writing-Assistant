---
description: "REQ-2055 导演步骤间推理链路传递（冻结副本）"
---

# REQ-2055 导演步骤间推理链路传递（冻结副本）

> 本文件为原始需求冻结副本，创建于 2026-07-15。
> 原始需求来自 REQ-2054 多素材导入讨论的延伸——缓解无状态架构"无法渐进理解"的缺点。

## 核心设计

1. 5 个关键导演步骤的 output schema 新增 `reasoningTrace` 字段
2. `NovelPromptMaterialExporter` 新增 `reasoning_trace` context group
3. 后续步骤注入前序推理摘要

## 依赖

REQ-2054（material_index 注入管道就绪）——`reasoning_trace` 本质上是一个新增的 context group，复用相同的注入管道。
