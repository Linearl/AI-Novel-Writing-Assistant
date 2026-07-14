---
description: "REQ-2026 任务拆解"
---

# REQ-2026 任务拆解

> 状态：📋 待办

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 后端：contextBlocks.ts 提升 existing_beat_sheet / existing_chapter_details 优先级 | P0 | 0.5h | ⬜ 待开始 |
| T2 | 后端：shared.ts 扩展 VolumeBeatSheetPromptInput（referenceExisting 标志） | P0 | 0.5h | ⬜ 待开始 |
| T3 | 后端：beatSheet.prompts.ts 新增结构保持约束段 | P0 | 1h | ⬜ 待开始 |
| T4 | 后端：volumeBeatSheetGeneration.ts 新增 validateBeatStructurePreservation() | P0 | 1.5h | ⬜ 待开始 |
| T5 | 后端：volumeBeatSheetGeneration.ts 集成重试逻辑 | P0 | 1h | ⬜ 待开始 |
| T6 | 单元测试：验证函数 | P1 | 1.5h | ⬜ 待开始 |
| T7 | 单元测试：重试流程 | P1 | 1h | ⬜ 待开始 |
| T8 | 集成验证：端到端流程 | P1 | 0.5h | ⬜ 待开始 |

---

### T1: Context Block 优先级提升

**改动点**: `server/src/prompting/prompts/novel/volume/contextBlocks.ts`
**DoD**: `existing_beat_sheet` 和 `existing_chapter_details` 的 group 从 `reference` 改为 `preferred`，priority 从 55-60 提升到 85-86

### T2: PromptInput 扩展

**改动点**: `server/src/prompting/prompts/novel/volume/shared.ts`
**DoD**: `VolumeBeatSheetPromptInput` 新增 `referenceExisting?: boolean` 字段，`volumeBeatSheetGeneration.ts` 传入该标志

### T3: Prompt 结构保持约束

**改动点**: `server/src/prompting/prompts/novel/volume/beatSheet.prompts.ts`
**DoD**: system prompt 中，当 `referenceExisting=true` 时追加结构保持约束段（beat 数量、key、章节数不变）

### T4: 验证函数

**改动点**: `server/src/services/novel/volume/volumeBeatSheetGeneration.ts`
**DoD**: `validateBeatStructurePreservation()` 函数正确检查 beat 数量、key 存在性、章节数一致性；无已有数据时返回 accepted=true

### T5: 重试逻辑

**改动点**: `server/src/services/novel/volume/volumeBeatSheetGeneration.ts`
**DoD**: `generateBeatSheet()` 中验证失败时注入 guidance 重试，重试仍失败时降级使用首次输出并记录 warning

### T6-T7: 单元测试

**DoD**:
- 验证函数：覆盖无已有数据 / 全部一致 / 数量不一致 / key 缺失 / 章节数不一致 五种场景
- 重试流程：覆盖验证通过 / 首次失败重试成功 / 重试仍失败 三种场景

### T8: 集成验证

**DoD**: 手动触发节奏板重生成，确认已有章节的 purpose/taskSheet/sceneCards 不丢失
