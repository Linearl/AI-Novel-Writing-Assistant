---
description: "REQ-7007 World.structureJson 关系提取为独立表 — 任务拆解"
---

# REQ-7007 Tasks

## T1 新增 3 个 Prisma 边表模型

- 新增 `WorldForceRelation`（sourceForceId → targetForceId, tension, detail）
- 新增 `WorldLocationControl`（forceId → locationId, relation, detail）
- 新增 `WorldLocationConnection`（sourceLocationId → targetLocationId, connectionType, distanceHint, narrativeUse）
- forceId/locationId 用 plain String（无独立 Prisma 模型）
- novelId 通过 World 关联传递
- **DoD**：prisma validate 通过

## T2 worldStructure 写入 facade 双写

- 识别 structureJson 写入的统一入口点（worldStructure 或 WorldService）
- 在写入 structureJson 时同步解析 relations 并写入边表
- 锚点 upsert 策略：deleteMany + createMany
- **DoD**：`pnpm typecheck` 通过

## T3 worldVisualization 读取适配

- 第 233 行 forceRelations：改为从边表查询
- 第 266 行 locationConnections：改为从边表查询
- 第 276 行 locationControls 回退：改为从边表查询，无数据则 fallback JSON
- **DoD**：`pnpm typecheck` 通过

## T4 数据迁移脚本

- 解析所有 World.structureJson 中的 relations 对象
- 写入 3 个边表
- 校验：JSON 数组元素总数 == 边表行数
- **DoD**：脚本可执行，校验通过

## T5 全量验证

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- 前端世界可视化手动验证
- **DoD**：三项全绿 + 可视化正常

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-06-30 | v0.1 第四轮开发完成 | ✅ |

---

## 完成判定

- 全部任务完成且 DoD 满足。
