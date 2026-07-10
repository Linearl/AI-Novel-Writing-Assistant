---
description: "QUA-039: CharacterPreparationService persistCharacterCastOptions() 嵌套 8 层 → ≤4 层（提取辅助函数）"
---

# REQ-7038：降嵌套 — CharacterPreparationService

## 背景

`persistCharacterCastOptions()` 在 [CharacterPreparationService.ts:215-271](server/src/services/novel/characterPrep/CharacterPreparationService.ts#L215-L271) 中嵌套深度 8-9 层。项目约束：>4 层必须拆分。

## 决策

**方案 A：提取辅助函数**。不改接口、不改调用方。

## 实施

将最内层 `map` 回调提取为独立文件级函数：
- `buildMemberCreateData(castOption: CastOption): Prisma.CharacterCastMemberCreateInput` — 约 20 行
- `buildRelationCreateData(relation: Relation): Prisma.CharacterRelationCreateInput` — 约 10 行

提取后嵌套最大深度 ≤4 层。

## 验收标准

- [ ] 两个辅助函数独立且可被类型检查
- [ ] `persistCharacterCastOptions` 嵌套深度 ≤4 层
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
