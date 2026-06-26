---
description: "REQ-2007 任务拆解"
---

# REQ-2007 任务拆解

> 状态：⏳ 进行中

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 后端：contextBlocks.ts 新增 existing_beat_sheet 上下文块 | P0 | 1h | ⬜ 待开始 |
| T2 | 后端：contextBlocks.ts 新增 existing_chapter_details 上下文块 | P0 | 1h | ⬜ 待开始 |
| T3 | 后端：shared.ts 新增 buildBeatSheetSummary / buildChapterRefinementSummary | P0 | 1h | ⬜ 待开始 |
| T4 | 后端：beatSheet.prompts.ts 模板新增参考数据插槽 | P0 | 0.5h | ⬜ 待开始 |
| T5 | 后端：generateBeatSheet 新增 referenceExisting 选项 | P0 | 0.5h | ⬜ 待开始 |
| T6 | 后端：编排器读取并传递 referenceExisting | P0 | 0.5h | ⬜ 待开始 |
| T7 | 前端：确认对话框新增勾选项 | P0 | 1h | ⬜ 待开始 |
| T8 | 前端：Action 传递 referenceExisting | P0 | 0.5h | ⬜ 待开始 |
| T9 | 单元测试 | P1 | 1.5h | ⬜ 待开始 |
| T10 | 端到端验证 | P1 | 0.5h | ⬜ 待开始 |

---

### T1-T2: 上下文块

**改动点**: `server/src/prompting/prompts/novel/volume/contextBlocks.ts`
**DoD**: referenceExisting=true 时注入已有节奏板和章节细化摘要；false 时不注入

### T3: 辅助函数

**改动点**: `server/src/prompting/prompts/novel/volume/shared.ts`
**DoD**: buildBeatSheetSummary 渲染 beats 列表；buildChapterRefinementSummary 渲染章节摘要（截断保护）

### T4: Prompt 模板

**改动点**: `server/src/prompting/prompts/novel/volume/beatSheet.prompts.ts`
**DoD**: 模板中 `{existingBeatSheet}` 占位，为空时自动跳过

### T5-T6: 后端选项传递

**改动点**: `volumeBeatSheetGeneration.ts`、`volumeGenerationOrchestrator.ts`
**DoD**: referenceExisting 从请求 payload 传递到 context blocks 构建

### T7-T8: 前端 UI

**改动点**: `StructuredBeatSheetCard.tsx`、`useNovelVolumePlanning.actions.ts`
**DoD**: 重新生成对话框显示勾选项（默认勾选），首次生成隐藏

### T9-T10: 测试验证

**DoD**: 勾选时 prompt 包含参考数据，取消时不包含
