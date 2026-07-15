# REQ-2055 导演步骤间推理链路传递

> 状态：已完成 | 更新时间：2026-07-15

## 概述

在当前无状态导演管道中新增步骤间推理摘要传递，缓解"无法渐进理解"的缺点。5 个关键步骤在 output 中产出 reasoningTrace，后续步骤通过新增的 reasoning_trace context group 获得前序推理上下文。

## 结构

| 文件 | 说明 |
|------|------|
| `REQ-2055-director-reasoning-trace.md` | 需求工作副本 |
| `REQ-2055-director-reasoning-trace-original.md` | 需求冻结副本 |
| `tasks.md` | 任务拆解（3 阶段，约 6.5h） |

## 依赖

依赖 REQ-2054（material_index 注入管道就绪）。

## 关键里程碑

- [x] 任务包六件套创建（simple 任务，省 design.md + decision_log.md）
- [x] Schema 扩展（5 个步骤）
- [x] Context Group + Exporter
- [x] 验证
