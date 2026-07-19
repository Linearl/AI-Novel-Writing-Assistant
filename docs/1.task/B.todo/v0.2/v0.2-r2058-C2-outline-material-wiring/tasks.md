---
description: "REQ-2058 任务拆解"
update_time: 2026-07-18
---
# REQ-2058 任务拆解

## 任务清单

| # | 任务 | 优先级 | 涉及文件 | 状态 |
| - | ---- | ------ | -------- | ---- |
| T0 | 卷生成步骤 INPUT 上下文预算放宽至 3000 | P1 | `server/src/prompting/prompts/novel/promptBudgetProfiles.ts` | 📋 |
| T1 | buildCommonNovelContext 注入 outline | P1 | `server/src/prompting/prompts/novel/volume/shared.ts` | 📋 |
| T2 | 新增 material_index 上下文块 builder | P1 | `server/src/prompting/prompts/novel/volume/contextBlocks.ts` | 📋 |
| T3 | 卷生成 prompt contextPolicy 添加 material_index | P1 | `server/src/prompting/prompts/novel/volume/strategy.prompts.ts` 等 4 个文件 | 📋 |
| T4 | B2 两轮加载机制实现 | P1 | `server/src/services/novel/volume/volumeGenerationOrchestrator.ts` | 📋 |
| T5 | 卷生成步骤接入 B2 两轮加载 | P1 | `server/src/services/novel/volume/volumeGenerationOrchestrator.ts` | 📋 |
| T6 | 类型检查 + 测试验证 | P1 | — | 📋 |

---

## T0. 卷生成步骤 INPUT 上下文预算放宽至 3000

**目标**：将卷生成相关步骤的 `maxTokensBudget` 从 1600-1800 统一上调至 3000，为 outline + material_index 腾出空间。

**操作**：
1. 打开 `server/src/prompting/prompts/novel/promptBudgetProfiles.ts`
2. 修改以下常量值：
   - `volumeStrategy`: 1800 → 3000
   - `volumeStrategyCritique`: 1800 → 3000
   - `volumeSkeleton`: 2000 → 3000
   - `volumeBeatSheet`: 1600 → 3000
   - `volumeChapterList`: 1600 → 3000
   - `volumeChapterDetail`: 1600 → 3000
   - `volumeRebalance`: 1600 → 3000
3. `directorBlueprint` 已是 2400，无需调整

---

## T1. buildCommonNovelContext 注入 outline

**目标**：使 `buildCommonNovelContext` 输出包含 `novel.outline` 全文。

**操作**：
1. 打开 `server/src/prompting/prompts/novel/volume/shared.ts`
2. 在 `buildCommonNovelContext` 函数（L122-138）的 return 数组末尾追加：
   ```typescript
   novel.outline?.trim()
     ? `用户提供的完整素材（世界观、角色、大纲、章节梗概等）：\n${novel.outline.trim()}`
     : "",
   ```
3. 一处改动，所有使用 `book_contract` context block 的卷生成步骤自动受益

---

## T2. 新增 material_index 上下文块 builder

**目标**：在 `contextBlocks.ts` 中提供 `material_index` 上下文块的构建函数。

**操作**：
1. 打开 `server/src/prompting/prompts/novel/volume/contextBlocks.ts`
2. 新增 `buildMaterialIndexBlock(novelId: string)` 函数
3. 调用 `NovelPromptMaterialExporter.buildMaterialIndex(novelId)` 获取材料索引文本
4. 返回 `createContextBlock({ id: "material_index", group: "material_index", priority: 70, content })`
5. 注意：需要将 `novelId` 传入各 `build*ContextBlocks` 函数的 input 类型中（或从已有 `novel` 字段提取）

---

## T3. 卷生成 prompt contextPolicy 添加 material_index

**目标**：让 prompt 系统知道 material_index 是这些步骤的 preferred 上下文组。

**操作**：
1. `strategy.prompts.ts`：`contextPolicy.preferredGroups` 添加 `"material_index"`
2. `beatSheet.prompts.ts`：同上
3. `chapterList.prompts.ts`：同上
4. `chapterDetail.prompts.ts`：同上
5. 在各 `build*ContextBlocks` 函数中追加 material_index 块

---

## T4. B2 两轮加载机制实现

**目标**：在 orchestrator 中实现通用的两轮加载封装函数。

**操作**：
1. 打开 `server/src/services/novel/volume/volumeGenerationOrchestrator.ts`
2. 新增 `runWithMaterialLoading` 函数（见 design.md §4.2）
3. 输入：messages、originalSchema、novelId、invokeOptions
4. 逻辑：扩展 schema → 第一轮调用 → 有 requestedMaterialIds 则查库取全文追加 → 第二轮调用 → 返回结果
5. 使用 `prisma.novelMaterial.findMany` 查询材料，确保 `enabled=true` 且 `novelId` 匹配

---

## T5. 卷生成步骤接入 B2 两轮加载

**目标**：将 orchestrator 中 4 个关键生成步骤改用 `runWithMaterialLoading`。

**操作**：
1. `generateStrategy`（卷战略）：改用 `runWithMaterialLoading`
2. `generateBeatSheet`（节拍表）：改用 `runWithMaterialLoading`
3. `generateBeatChunkedChapterList`（章节列表）：改用 `runWithMaterialLoading`（注意：该函数内部有分块逻辑，需确认在哪一层接入）
4. `generateChapterTaskSheetDetail`（章节详写）：改用 `runWithMaterialLoading`

---

## T6. 类型检查 + 测试验证

**目标**：确保改动不引入回归。

**操作**：
1. `pnpm typecheck` — 全量类型检查
2. `pnpm test` — server 单元测试
3. `pnpm --filter @ai-novel/server test:routes` — 路由测试
4. 手动验证：创建一个有 outline 的小说，执行卷生成，检查 LLM 输入是否包含 outline

---

## DoD（Definition of Done）

- 卷战略/节拍表/章节列表/章节详写的 LLM 输入包含 outline 全文
- 上述步骤的上下文包含 material_index 块
- AI 输出 requestedMaterialIds 时能触发第二轮加载
- 所有现有测试通过，无回归
