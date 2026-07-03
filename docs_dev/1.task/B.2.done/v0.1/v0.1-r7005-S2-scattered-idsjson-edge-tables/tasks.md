---
description: "REQ-7005 P2 零散 IdsJson 字段迁移为边表 — 任务拆解"
---

# REQ-7005 Tasks

## T1 新增 4 个 Prisma 边表模型

- 新增 `OpenConflictCharacter`（conflictId → characterId, FK Cascade）
- 新增 `CharacterResourceKnownBy`（resourceId → characterId, FK Cascade）
- 新增 `StoryPlanIssue`（planId → issueId, FK SetNull）
- 新增 `StateVersionProposal`（versionId → proposalId, FK Cascade）
- 每个表：@@unique + @@index(novelId) + @@index(targetId)
- 在源模型和 Character/ConsistencyFact/StateChangeProposal 上加 reverse relation
- **DoD**：prisma validate 通过
- **验证**：`pnpm typecheck`

## T2 写入点双写

- OpenConflictService.ts（2 处）：upsert 的 create/update 分支加边表写入
- PayoffLedgerSyncService.ts（1 处）：空数组写入可跳过（无实际数据）
- CharacterResourceLedgerService.ts（1 处）：stringifyJson 后加边表写入
- plannerPersistence.ts（2 处）：create/update 分支加边表写入
- plannerPlanMetadata.ts（1 处）：enrichStoryPlan 加边表写入
- StateVersionLog.ts（1 处）：createVersion 事务内加边表写入
- **DoD**：`pnpm typecheck` 通过

## T3 读取点适配

- chapterRuntimePackageBuilders.ts：从边表查询 + JSON fallback
- characterResourceShared.ts：从边表查询 + JSON fallback
- plannerPlanMetadata.ts：从边表查询 + JSON fallback
- GenerationContextAssembler.ts：从边表查询 + JSON fallback
- StateVersionLog.ts：从边表查询 + JSON fallback
- **DoD**：`pnpm typecheck` 通过

## T4 数据迁移脚本

- 合并迁移脚本覆盖全部 4 个字段
- 校验：JSON 元素总数 == 边表行数
- **DoD**：脚本可执行，校验通过
- **验证**：手动运行 + 校验输出

## T5 全量验证

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- **DoD**：三项全绿

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-06-30 | v0.1 第四轮开发完成 | ✅ |

---

## 完成判定

- 全部任务完成且 DoD 满足。
