---
description: "REQ-7006 移除时间线旧 JSON 字段 — 任务拆解"
---

# REQ-7006 Tasks

## T1 前置确认

- 确认生产环境运行 `20260630_migrate_json_to_edges.ts` 且校验通过
- 确认边表读取路径正常（无 JSON fallback 命中日志）
- **DoD**：用户确认生产迁移已完成

## T2 移除 Prisma schema 字段

- 从 schema.prisma 移除 15 个 `*IdsJson` 字段
- 从 schema.sqlite.prisma 同步移除
- **DoD**：prisma validate 通过

## T3 移除 repository JSON 逻辑

- 移除 `parseJsonArray` 函数（如无其他使用方）
- 移除 `edgeOrJson` fallback 函数
- mapper 函数改为纯边表读取（删除 fallback 分支）
- 写入方法移除 `stringifyJson` 调用
- **DoD**：`pnpm typecheck` 通过

## T4 生成迁移 + 全量验证

- 运行 `prisma migrate dev` 生成 DROP COLUMN SQL
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- **DoD**：三项全绿

## T5 清理确认

- `grep -r "IdsJson" server/src/modules/timeline/` 确认无残留
- **DoD**：grep 无匹配
