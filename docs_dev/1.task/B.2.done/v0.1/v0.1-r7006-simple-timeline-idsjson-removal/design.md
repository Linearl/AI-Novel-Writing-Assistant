---
description: "REQ-7006 移除时间线旧 JSON 字段 — 方案设计"
---

# REQ-7006 Design

## 1. 策略

纯删除操作：确认安全后直接移除字段和相关代码。

## 2. 移除顺序

1. Prisma schema 字段（触发 migration）
2. 写入端 stringifyJson 调用
3. 读取端 parseJsonArray + edgeOrJson fallback
4. 辅助函数（parseJsonArray、edgeOrJson、stringifyJson 如无其他使用者）

## 3. 回滚策略

如需回滚，重新添加字段 + 恢复 JSON 写入代码即可。边表数据不丢失。

## 4. 不做的事

- 不迁移导出模块的 JSON 透传
- 不清理其他模块的 parseJsonArray 函数（各模块有独立副本）
