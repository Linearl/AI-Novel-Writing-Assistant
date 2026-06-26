---
description: "REQ-2001 决策留痕"
---

# REQ-2001 决策日志

## D1: 导入格式限定为 JSON

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-06-26 |
| 决策人 | 用户 + AI |
| 决策 | 首版仅支持 JSON 格式导入 |
| 原因 | TXT 格式只含纯文本，无结构化数据；Markdown 格式虽含 JSON 块但解析不稳定。JSON 格式与 `NovelExportBundle` 完全对齐，解析确定性最高。 |
| 影响 | 用户只能导入 JSON 导出文件。Markdown 导出的用户需要重新导出为 JSON。 |
| 备选方案 | 同时支持 Markdown 导入（解析嵌入的 JSON 块）— 复杂度高、边界多，留作后续迭代 |

## D2: basic scope 在客户端回填

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-06-26 |
| 决策人 | AI |
| 决策 | basic scope 数据在客户端直接映射到表单状态，不经过服务端 |
| 原因 | basic scope 只涉及表单字段填充，用户需要在提交前看到和编辑这些值。如果走服务端，需要两步（先导入再获取），且无法利用现有的表单校验和联动逻辑。 |
| 影响 | 客户端需要了解 `NovelBasicFormState` 与 `ExportNovelDetail` 的字段映射关系。 |
| 备选方案 | 服务端先创建新书再 PATCH 回填 — 增加不必要的 API 调用和状态管理 |

## D3: 非 basic scope 通过独立 API 端点导入

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-06-26 |
| 决策人 | AI |
| 决策 | 新增 `POST /api/novels/:id/import` 端点，接收 scope 数组和对应数据 |
| 原因 | 非 basic scope 涉及多表事务写入、ID 重映射，需要服务端统一处理。单一端点 + scope 参数的设计比每个 scope 一个端点更简洁。 |
| 影响 | 新增 `server/src/modules/import/` 模块 |
| 备选方案 | 每个 scope 一个独立端点 — 过度拆分，增加路由和客户端调用复杂度 |

## D4: 所有导入实体生成新 ID

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-06-26 |
| 决策人 | AI |
| 决策 | 导入时为所有实体生成新 UUID，维护 oldId → newId 映射表 |
| 原因 | 复用原 ID 可能导致跨书 ID 冲突（尤其在同一实例中）。新 ID 保证每个实体全局唯一。 |
| 影响 | mapper 层需要维护 Map<string, string> 映射，在写入关系表时替换引用。 |
| 备选方案 | 复用原 ID — 简单但有冲突风险，且违反数据库最佳实践 |

## D5: worldId 不跨书复用

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-06-26 |
| 决策人 | AI |
| 决策 | basic scope 回填时跳过 worldId，提示用户手动选择 |
| 原因 | 世界观是书级资源，跨书绑定 worldId 会导致两个书共享同一个世界设定，修改一处影响另一处。 |
| 影响 | 用户导入后需要手动选择或创建世界。 |
| 备选方案 | 复制一份世界设定到新书 — 可行但增加了数据复制逻辑，留作后续迭代 |

## D6: pipeline scope 仅导入静态资产

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-06-26 |
| 决策人 | AI |
| 决策 | pipeline scope 只导入 NovelBible 和 PlotBeat，跳过 PipelineJob、StateSnapshot、QualityReport |
| 原因 | PipelineJob 和 StateSnapshot 与运行时状态强绑定，包含对原书 ID 的硬引用，直接移植没有意义。Bible 和 PlotBeat 是静态资产，可独立复用。 |
| 影响 | 导入 pipeline scope 不会恢复质量报告和流水线执行历史。 |
| 备选方案 | 全量导入 pipeline — 需要深度改造引用链，复杂度远超收益 |
