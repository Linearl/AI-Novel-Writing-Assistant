---
description: "REQ-2058 方案设计"
update_time: 2026-07-18
---
# REQ-2058 方案设计

## 1. outline 注入：buildCommonNovelContext

**文件**：`server/src/prompting/prompts/novel/volume/shared.ts`

在 `buildCommonNovelContext` 函数末尾追加 outline 块：

```typescript
export function buildCommonNovelContext(novel: VolumeGenerationNovel): string {
  const commercialTags = parseCommercialTags(novel.commercialTagsJson);
  return [
    `title: ${novel.title}`,
    // ... 现有字段 ...
    `character context:\n${summarizeCharacters(novel)}`,
    // ↓ 新增
    novel.outline?.trim()
      ? `用户提供的完整素材（世界观、角色、大纲、章节梗概等）：\n${novel.outline.trim()}`
      : "",
  ].filter(Boolean).join("\n");
}
```

**影响范围**：所有使用 `buildCommonNovelContext` 的卷生成步骤（strategy / critique / skeleton / beatSheet / chapterList / chapterDetail / rebalance），一处改动全覆盖。

## 2. material_index 上下文块

**文件**：`server/src/prompting/prompts/novel/volume/contextBlocks.ts`

新增 builder 函数：

```typescript
export function buildMaterialIndexContextBlocks(params: {
  novelId: string;
}): PromptContextBlock[] {
  // 调用 NovelPromptMaterialExporter.buildMaterialIndex(novelId)
  // 返回 material_index 块（priority=70，非 required）
}
```

在以下函数中追加 material_index 块：

- `buildVolumeStrategyContextBlocks`
- `buildVolumeBeatSheetContextBlocks`
- `buildVolumeChapterListContextBlocks`
- `buildVolumeChapterDetailContextBlocks`

## 3. Prompt contextPolicy 更新

**文件**：各 prompt 文件（strategy.prompts.ts / beatSheet.prompts.ts / chapterList.prompts.ts / chapterDetail.prompts.ts）

在 `contextPolicy.preferredGroups` 中添加 `"material_index"`。

## 4. B2 两轮加载机制

**文件**：`server/src/services/novel/volume/volumeGenerationOrchestrator.ts`

### 4.1 输出 schema 扩展

在卷生成步骤的输出 schema 中扩展 `requestedMaterialIds`：

```typescript
const round1Schema = originalSchema.extend({
  requestedMaterialIds: z.array(z.string()).optional(),
});
```

### 4.2 两轮调用封装

```typescript
async function runWithMaterialLoading(params: {
  messages: Message[];
  originalSchema: ZodSchema;
  novelId: string;
  invokeOptions: InvokeOptions;
}): Promise<unknown> {
  const round1Schema = params.originalSchema.extend({
    requestedMaterialIds: z.array(z.string()).optional(),
  });

  const round1Result = await invokeStructuredLlm(params.messages, round1Schema, params.invokeOptions);

  if (round1Result.requestedMaterialIds?.length > 0) {
    const materials = await prisma.novelMaterial.findMany({
      where: {
        id: { in: round1Result.requestedMaterialIds },
        novelId: params.novelId,
        enabled: true,
      },
    });

    if (materials.length > 0) {
      const materialText = materials
        .map(m => `---\n## ${m.title}\n\n${m.content}`)
        .join('\n\n');

      params.messages.push({
        role: "user",
        content: `以下是您请求的参考材料全文：\n\n${materialText}`,
      });

      return invokeStructuredLlm(params.messages, params.originalSchema, params.invokeOptions);
    }
  }

  // 删除 requestedMaterialIds 字段后返回
  const { requestedMaterialIds: _, ...cleanResult } = round1Result as Record<string, unknown>;
  return cleanResult;
}
```

### 4.3 适用步骤

在 orchestrator 中以下步骤改用 `runWithMaterialLoading`：

- `generateStrategy`（卷战略）
- `generateBeatSheet`（节拍表）
- `generateBeatChunkedChapterList`（章节列表）
- `generateChapterTaskSheetDetail`（章节详写）

## 5. 预算调整

`NOVEL_PROMPT_BUDGETS` 控制 **INPUT 上下文预算**（`ContextPolicy.maxTokensBudget`），限制的是组装进 prompt 的 context block 总量，不含 system prompt 固定文本。

当前各卷生成步骤预算值（1600-1800）在无 outline 时设定，加入 outline + material_index 后需要放宽。

**调整方案**：卷生成相关步骤统一上调至 **3000** tokens（≈ 12000 字符）。

| 步骤 | 原预算 | 新预算 |
| --- | --- | --- |
| volumeStrategy | 1800 | 3000 |
| volumeStrategyCritique | 1800 | 3000 |
| volumeSkeleton | 2000 | 3000 |
| volumeBeatSheet | 1600 | 3000 |
| volumeChapterList | 1600 | 3000 |
| volumeChapterDetail | 1600 | 3000 |
| volumeRebalance | 1600 | 3000 |

## 6. outline 与 material_index 的关系

outline 由用户上传的 material 总结得到，二者是**同一来源的不同视图**：

- **outline**：AI 总结后的全文摘要，作为静态参考注入 prompt
- **material_index**：动态查询 NovelMaterial 表的索引列表，支持 B2 按需加载全文

不存在内容矛盾，是互补关系。outline 提供概览，material_index 提供按需深入的能力。

## 7. 数据流总览

```text
用户素材 (novel.outline)
  ↓ loadGenerationContext() 已加载
  ↓ buildCommonNovelContext() 注入 ← 本次新增
  ↓ 所有卷生成步骤可见

NovelMaterial 表
  ↓ NovelPromptMaterialExporter.buildMaterialIndex() ← 已实现
  ↓ material_index context block ← 本次新增接线
  ↓ 卷生成步骤第一轮可见

AI 输出 requestedMaterialIds
  ↓ runWithMaterialLoading() ← 本次新增
  ↓ 查库取全文 → 第二轮调用
  ↓ 最终结果
```
