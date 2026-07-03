---
description: "REQ-7007 World.structureJson 关系提取为独立表 — 决策日志"
---

# REQ-7007 Decision Log

## D1：拆分为独立任务包

- **决策**：从 REQ-7004 P1 拆分为独立任务包 REQ-7007
- **理由**：P1 复杂度（medium）显著高于 P2（simple），涉及 10+ 文件，需独立规划和验证
- **日期**：2026-06-30

## D2：forceId/locationId 不建 FK

- **决策**：WorldForceRelation.sourceForceId 等字段使用 plain String，不建 Prisma @relation
- **理由**：代码库中 Force 和 Location 不是独立 Prisma 模型，它们是 World.structureJson 内嵌的 JSON 对象
- **日期**：2026-06-30

## D3：facade 层统一拦截

- **决策**：优先在 WorldService 层统一加双写，不在 10+ 写入方分别加
- **理由**：减少改动面，避免遗漏；WorldService 是所有写入的最终汇聚点
- **日期**：2026-06-30
