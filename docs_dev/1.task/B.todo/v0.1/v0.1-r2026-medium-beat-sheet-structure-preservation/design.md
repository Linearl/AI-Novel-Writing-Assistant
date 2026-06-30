---
description: "REQ-2026 方案设计"
---

# REQ-2026 方案设计

## 1. 方案概述

采用 **Prompt 约束 + 后处理验证 + 重试** 的双层保障策略（方案 B）。在 prompt 层注入结构保持硬性指令，同时在 LLM 输出后进行结构一致性验证，验证失败时注入失败原因重试。

### 1.1 关键决策

1. **双层保障**：prompt 软约束覆盖大部分场景，验证函数兜底异常
2. **Context block 提升**：`existing_beat_sheet` 和 `existing_chapter_details` 从 `reference`（priority 55-60）提升到 `preferred` group，确保不被裁剪
3. **重试策略**：最多重试 1 次，利用现有 `repairPolicy.maxAttempts` 机制
4. **降级策略**：重试仍失败时使用最佳输出继续，记录 warning 而非阻断流程

## 2. 实现细节

### 2.1 Prompt 结构保持约束

`server/src/prompting/prompts/novel/volume/beatSheet.prompts.ts`

在 system prompt 的"【硬性要求】"段之后，新增可选的结构保持约束段。该段落通过 `referenceExisting` 标志条件渲染：

```
{referenceExisting ? `
【结构保持要求 — 当存在已有节奏板时】
当上下文中包含 "Previous beat sheet" 时，你必须遵守以下硬性要求：
1. beats 数量必须与已有结构一致，不得增减
2. 每个 beat 的 key 必须沿用已有结构的 key，不得重命名
3. 每个 beat 的 chapterSpanHint 必须覆盖与已有结构相同数量的章节
4. 你只能调整 summary 和 mustDeliver 的内容，不能改动结构骨架
` : ''}
```

**触发条件**：仅当 `referenceExisting=true` 且上下文中实际存在 `existing_beat_sheet` block 时生效。

**实现方式**：`beatSheet.prompts.ts` 的 `render` 函数中，根据 `input` 中是否有已有 beat sheet 数据来决定是否追加该段落。需要将 `referenceExisting` 标志传入 prompt input。

### 2.2 Context Block 优先级提升

`server/src/prompting/prompts/novel/volume/contextBlocks.ts`

将 `existing_beat_sheet` 和 `existing_chapter_details` 的 `group` 从 `"reference"` 改为 `"preferred"`：

```typescript
// 改动前
blocks.push(createContextBlock({
  id: "existing_beat_sheet",
  group: "reference",     // 低优先级，可能被裁剪
  priority: 60,
  ...
}));

// 改动后
blocks.push(createContextBlock({
  id: "existing_beat_sheet",
  group: "preferred",     // 优先保留
  priority: 86,           // 略低于 volume_window(88)
  ...
}));
```

同步调整 `existing_chapter_details` 的 group 和 priority。

### 2.3 后处理验证函数

`server/src/services/novel/volume/volumeBeatSheetGeneration.ts`

新增 `validateBeatStructurePreservation()` 函数：

```typescript
interface BeatStructureValidationResult {
  accepted: boolean;
  reason?: string;
}

function validateBeatStructurePreservation(
  newBeats: VolumeBeatSheetBeat[],
  existingBeatSheet: VolumeBeatSheet | null,
  existingChapters: VolumeChapterPlan[],
): BeatStructureValidationResult {
  // 无已有数据 → 无需验证
  if (!existingBeatSheet || existingChapters.length === 0) {
    return { accepted: true };
  }

  // 检查是否有已关联到 beat 的章节
  const existingBeatsWithChapters = existingBeatSheet.beats.filter(beat =>
    existingChapters.some(ch =>
      resolveVolumeChapterBeatKey({ chapter: ch, volume: ..., beatSheet: existingBeatSheet }) === beat.key
    )
  );
  if (existingBeatsWithChapters.length === 0) {
    return { accepted: true };
  }

  // 检查 1: beat 数量一致
  if (newBeats.length !== existingBeatSheet.beats.length) {
    return {
      accepted: false,
      reason: `beat 数量不一致: 旧 ${existingBeatSheet.beats.length}, 新 ${newBeats.length}`
    };
  }

  // 检查 2: key 保持 + 章节数一致
  for (const oldBeat of existingBeatsWithChapters) {
    const newBeat = newBeats.find(b => b.key === oldBeat.key);
    if (!newBeat) {
      return {
        accepted: false,
        reason: `已有关联章节的 beat "${oldBeat.key}" 在新结构中缺失`
      };
    }

    const oldSpan = parseBeatChapterSpan(oldBeat.chapterSpanHint);
    const newSpan = parseBeatChapterSpan(newBeat.chapterSpanHint);
    if (oldSpan && newSpan) {
      const oldCount = oldSpan.end - oldSpan.start + 1;
      const newCount = newSpan.end - newSpan.start + 1;
      if (oldCount !== newCount) {
        return {
          accepted: false,
          reason: `beat "${oldBeat.key}" 章节数不一致: 旧 ${oldCount}, 新 ${newCount}`
        };
      }
    }
  }

  return { accepted: true };
}
```

### 2.4 重试机制

在 `generateBeatSheet()` 函数中，LLM 返回 beats 后调用验证函数：

```typescript
export async function generateBeatSheet(params): Promise<VolumePlanDocument> {
  const { document, novel, workspace, options } = params;
  const targetVolume = getTargetVolume(document, options.targetVolumeId);
  const existingBeatSheet = workspace.beatSheets?.find(
    bs => bs.volumeId === targetVolume.id
  ) ?? null;

  // 第 1 次生成
  const generated = await runStructuredPrompt({ ... });
  let outputBeats = generated.output.beats;

  // 验证结构保持
  if (options.referenceExisting && existingBeatSheet) {
    const validation = validateBeatStructurePreservation(
      outputBeats,
      existingBeatSheet,
      targetVolume.chapters,
    );

    if (!validation.accepted) {
      // 重试：注入失败原因到 guidance
      const retryGuidance = [
        options.guidance,
        `结构保持约束未满足: ${validation.reason}。请严格保持已有 beat 结构，只修改 summary 和 mustDeliver。`,
      ].filter(Boolean).join("\n");

      try {
        const retried = await runStructuredPrompt({
          ...相同参数,
          guidanceOverride: retryGuidance,
        });
        const retryValidation = validateBeatStructurePreservation(
          retried.output.beats,
          existingBeatSheet,
          targetVolume.chapters,
        );
        if (retryValidation.accepted) {
          outputBeats = retried.output.beats;
        } else {
          // 重试仍失败，降级使用首次输出
          console.warn(`[BeatSheet] 结构保持验证重试失败: ${retryValidation.reason}，使用首次输出继续`);
        }
      } catch {
        // 重试出错，降级使用首次输出
        console.warn("[BeatSheet] 结构保持验证重试出错，使用首次输出继续");
      }
    }
  }

  return mergeBeatSheet(document, targetVolume, outputBeats);
}
```

### 2.5 promptInput 扩展

`server/src/prompting/prompts/novel/volume/shared.ts`

`VolumeBeatSheetPromptInput` 需要扩展，传入 `referenceExisting` 标志和已有 beat sheet 数据，以便 prompt render 函数有条件地追加结构保持约束段。

## 3. 涉及文件

| 文件 | 改动类型 | 说明 |
| ---- | ---- | ---- |
| `server/src/prompting/prompts/novel/volume/beatSheet.prompts.ts` | 修改 | system prompt 新增结构保持约束段 |
| `server/src/prompting/prompts/novel/volume/contextBlocks.ts` | 修改 | reference group → preferred group |
| `server/src/prompting/prompts/novel/volume/shared.ts` | 修改 | promptInput 扩展 |
| `server/src/services/novel/volume/volumeBeatSheetGeneration.ts` | 修改 | 新增验证函数 + 重试逻辑 |

## 4. 与现有机制的关系

```
层 1（本需求）: Prompt 结构约束 + 后处理验证 + 重试
  ↓ 保证新 beat sheet 结构与旧的一致
层 2（已有）: resolveFullVolumeResumeState()
  ↓ 逐 beat 比对章节数，一致的跳过
层 3（已有）: mergeChapterList() 中已有字段保留
  ↓ purpose/taskSheet/sceneCards 等字段通过 existingChapter?.field ?? null 保留
```

三层保护协同工作，确保已有章节的细化字段在节奏板重生成后不丢失。
