---
description: "REQ-2007 方案设计"
---

# REQ-2007 方案设计

## 1. 方案概述

在 `buildVolumeBeatSheetContextBlocks()` 中新增两个可选上下文块（`existing_beat_sheet` 和 `existing_chapter_details`），通过前端勾选项控制是否注入。数据已在函数作用域内可用（`workspace.beatSheets` 和 `targetVolume.chapters[]`），只需渲染为上下文块。

### 1.1 关键决策

1. **数据已在作用域内**：`promptInput.workspace` 已包含 `beatSheets`，`promptInput.targetVolume` 已包含 `chapters[]`，不需要新增数据获取
2. **通过 options 参数控制**：`generateBeatSheet()` 新增 `options.referenceExisting` 布尔参数
3. **截断保护**：节奏板摘要和章节细化摘要分别限制 token 预算

## 2. 实现细节

### 2.1 后端：上下文块新增

`server/src/prompting/prompts/novel/volume/contextBlocks.ts`

在 `buildVolumeBeatSheetContextBlocks()` 中新增：

```typescript
// 仅在 referenceExisting=true 且存在已有数据时添加
if (options.referenceExisting) {
  const existingBeatSheet = workspace.beatSheets?.find(
    bs => bs.volumeId === targetVolume.id
  );
  
  if (existingBeatSheet) {
    blocks.push({
      id: "existing_beat_sheet",
      group: "reference",
      content: buildBeatSheetSummary(existingBeatSheet),
      required: false,
    });
  }
  
  const refinedChapters = targetVolume.chapters?.filter(
    ch => ch.taskSheet || ch.purpose
  );
  
  if (refinedChapters?.length) {
    blocks.push({
      id: "existing_chapter_details",
      group: "reference",
      content: buildChapterRefinementSummary(refinedChapters),
      required: false,
    });
  }
}
```

辅助函数：
- `buildBeatSheetSummary(beatSheet)` — 渲染 beats 列表（标题、章节范围、摘要）
- `buildChapterRefinementSummary(chapters)` — 渲染每个章节的 purpose + taskSheet 前 100 字

### 2.2 后端：Prompt 模板

`server/src/prompting/prompts/novel/volume/beatSheet.prompts.ts`

在 human message 模板中新增可选段落（使用 `{existingBeatSheet}` 占位）：

```
{existingBeatSheet}
```

模板引擎在该变量为空时自动跳过对应段落。

### 2.3 后端：生成函数

`server/src/services/novel/volume/volumeBeatSheetGeneration.ts`

`generateBeatSheet()` 签名新增 `options.referenceExisting?: boolean`，传递给 context blocks 构建函数。

### 2.4 后端：编排器

`server/src/services/novel/volume/volumeGenerationOrchestrator.ts`

在 beat sheet 分支中从请求 payload 读取 `referenceExisting` 参数。

### 2.5 前端：确认对话框

`client/src/pages/novels/components/StructuredBeatSheetCard.tsx`

重新生成确认对话框中新增勾选项：

```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogTitle>重新生成节奏板</AlertDialogTitle>
    <AlertDialogDescription>
      将覆盖当前卷现有节奏段与交付项。已有章节列表和章节细化资产不会被直接删除。
    </AlertDialogDescription>
    <label>
      <input type="checkbox" checked={referenceExisting} onChange={...} />
      参考此前节奏板和章节细化结果（推荐）
    </label>
    <AlertDialogAction onClick={() => onConfirm({ referenceExisting })}>
      确认重新生成
    </AlertDialogAction>
  </AlertDialogContent>
</AlertDialog>
```

首次生成时隐藏勾选项。

### 2.6 前端：Action 传递

`client/src/pages/novels/hooks/useNovelVolumePlanning.actions.ts`

`startBeatSheetGenerationAction` 新增 `referenceExisting` 参数，包含在 payload 中。

## 3. 涉及文件

| 文件 | 改动类型 | 说明 |
| ---- | ---- | ---- |
| `server/src/prompting/prompts/novel/volume/contextBlocks.ts` | 修改 | 新增 existing_beat_sheet 和 existing_chapter_details 上下文块 |
| `server/src/prompting/prompts/novel/volume/beatSheet.prompts.ts` | 修改 | Prompt 模板新增参考数据插槽 |
| `server/src/prompting/prompts/novel/volume/shared.ts` | 修改 | 新增辅助函数 buildBeatSheetSummary、buildChapterRefinementSummary |
| `server/src/services/novel/volume/volumeBeatSheetGeneration.ts` | 修改 | generateBeatSheet 新增 referenceExisting 选项 |
| `server/src/services/novel/volume/volumeGenerationOrchestrator.ts` | 修改 | 读取并传递 referenceExisting |
| `client/src/pages/novels/components/StructuredBeatSheetCard.tsx` | 修改 | 确认对话框新增勾选项 |
| `client/src/pages/novels/hooks/useNovelVolumePlanning.actions.ts` | 修改 | 传递 referenceExisting 参数 |
