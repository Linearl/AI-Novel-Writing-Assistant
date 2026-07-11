---
description: "REQ-2049 审校上下文增强 — 方案设计"
---

# REQ-2049 方案设计

## 1. 方案概述

通过两层修改实现审校上下文增强：

1. **Prompt 层**（`audit.prompts.ts`）：在 light/full 审校 prompt 的 `contextRequirements` 中声明新增 context group，使 context resolution 系统知道这些块应该被注入
2. **Block Builder 层**（`chapterLayeredContextBlocks.ts`）：解除 review 模式下的条件限制，确保 `timeline_context`、`character_dynamics`、`recent_chapters` 在审校时被实际注入

`book_contract` 和 `story_macro` 的 block 构建逻辑已有（在 `getAllContextBlocks` 中），但未被审校路径使用。需要在 `auditPromptContext.ts` 或直接在 `buildChapterReviewContextBlocks` 中补充这两个块的构建。

### 1.1 设计目标

1. 最小改动量：不引入新文件，仅修改已有文件的 context 配置
2. priority 对齐：审校 context priority 与写作时一致或略高
3. 向后兼容：不破坏现有写作 prompt 的 context 结构
4. token budget 安全：新增 block 不超出 light audit (900) 和 full review (2600) 的 budget

### 1.2 关键决策

| # | 决策 | 理由 |
|---|------|------|
| D-01 | `book_contract` 和 `story_macro` 在 `buildChapterReviewContextBlocks` 中直接构建（从 `reviewContext.bookContract` 和 `reviewContext.macroConstraints` 读取） | 审校路径独立于写作路径的 `getAllContextBlocks`，不能依赖后者 |
| D-02 | `timeline_context` 和 `character_dynamics` 通过修改 block builder 的 mode 条件解除 review 模式限制 | 已有 fallback 占位逻辑，无需额外处理 |
| D-03 | `recent_chapters` 通过解除 `mode === "full"` 限制扩展到 review 模式 | 数据源 `recentChapterSummaries` 在 review 时已包含卷内全部摘要 |
| D-04 | light prompt 不注入 `timeline_context` 和 `character_dynamics` | 轻审校 token budget 有限（900），聚焦于最核心的 book_contract 和 story_macro |
| D-05 | `book_contract` priority 设为 104（略高于 `chapter_mission` 的 100） | 审校必须先知道书的定位才能判断章节质量 |

---

## 2. 现状分析：写作 vs 审校 Context 对比

### 2.1 `getAllContextBlocks`（写作路径）包含的块

| # | Block ID | Group | Priority | 写作时 | 审校时 |
|---|----------|-------|----------|--------|--------|
| 1 | `book_contract` | `book_contract` | 100 | YES | **NO** |
| 2 | `chapter_mission` | `chapter_mission` | 100 | YES | YES |
| 3 | `previous_chapter_tail` | `previous_chapter_tail` | 100 | YES | YES |
| 4 | `timeline_context` | `timeline_context` | 100 | YES（条件） | 条件（可能空） |
| 5 | `previous_chapter_hook` | `previous_chapter_hook` | 100 | YES | YES |
| 6 | `story_macro` | `story_macro` | 98 | YES | **NO** |
| 7 | `obligation_contract` | `obligation_contract` | 99 | YES | YES |
| 8 | `character_hard_facts` | `character_hard_facts` | 99 | YES | YES |
| 9 | `state_goal` | `state_goal` | 97 | YES | YES |
| 10 | `volume_window` | `volume_window` | 96 | YES（review） | YES（review） |
| 11 | `payoff_ledger` | `payoff_ledger` | 95 | YES（条件） | 条件 |
| 12 | `structure_obligations` | `structure_obligations` | 94 | N/A | YES |
| 13 | `participant_subset` | `participant_subset` | 92 | YES | YES |
| 14 | `character_dynamics` | `character_dynamics` | 91 | YES（条件） | 条件（可能跳过） |
| 15 | `local_state` | `local_state` | 89 | YES | YES |
| 16 | `recent_chapters` | `recent_chapters` | 86 | YES（full） | **NO**（review） |
| 17 | `style_contract` | `style_contract` | 74 | YES | YES |
| 18 | `world_rules` | `world_rules` | 84 | YES | YES |
| 19 | `historical_issues` | `historical_issues` | 82 | YES | YES |

### 2.2 本次变更目标

变更后，审校路径将包含：

| 变更项 | 变更前 | 变更后 |
|--------|--------|--------|
| `book_contract` | 缺失 | 注入（priority 104） |
| `story_macro` | 缺失 | 注入（priority 98） |
| `timeline_context` | 条件注入（可能为空） | review 模式下始终注入 |
| `character_dynamics` | 条件注入（可能跳过） | review 模式下始终注入 |
| `recent_chapters` | 不注入（`mode !== "full"`） | review 模式下注入（全卷摘要） |

---

## 3. 变更清单

### 3.1 `server/src/prompting/prompts/audit/audit.prompts.ts`

**auditChapterLightPrompt**：
- `contextPolicy.preferredGroups`：新增 `"book_contract"`、`"story_macro"` 到列表最前
- `contextRequirements`：新增 `{ group: "book_contract", priority: 104 }`、`{ group: "story_macro", priority: 98 }`
- `contextPolicy.dropOrder`：确保不包含新增 group

**auditChapterPrompt**：
- `contextPolicy.preferredGroups`：新增 `"book_contract"`、`"story_macro"`、`"timeline_context"`、`"character_dynamics"` 到列表
- `contextRequirements`：新增 `{ group: "book_contract", priority: 104 }`、`{ group: "story_macro", priority: 98 }`、`{ group: "timeline_context", priority: 100 }`、`{ group: "character_dynamics", priority: 91 }`
- `contextPolicy.dropOrder`：确保不包含新增 group

### 3.2 `server/src/prompting/prompts/novel/chapterLayeredContextBlocks.ts`

**`buildChapterWriterContextBlocks` 函数**：

1. `includeTimelineContext` 条件修改：
   - 当前：`const includeTimelineContext = Boolean(writeContext.timelineContext);`
   - 变更：`const includeTimelineContext = mode === "review" || Boolean(writeContext.timelineContext);`

2. `includeCharacterDynamics` 条件修改：
   - 当前：`const includeCharacterDynamics = shouldIncludeCharacterDynamics(writeContext, mode);`
   - 变更：`const includeCharacterDynamics = mode === "review" || shouldIncludeCharacterDynamics(writeContext, mode);`

3. `includeRecentChapters` 条件修改：
   - 当前：`const includeRecentChapters = mode === "full" && writeContext.recentChapterSummaries.length > 0;`
   - 变更：`const includeRecentChapters = (mode === "full" || mode === "review") && writeContext.recentChapterSummaries.length > 0;`

### 3.3 `server/src/prompting/prompts/novel/chapterLayeredContext.ts`

**`buildChapterReviewContextBlocks` 函数**：
新增 `book_contract` 和 `story_macro` 块构建（从 `reviewContext` 的 `bookContract` 和 `macroConstraints` 字段读取）。

```typescript
export function buildChapterReviewContextBlocks(
  reviewContext: ChapterReviewContext,
): PromptContextBlock[] {
  return [
    // 新增 book_contract
    createContextBlock({
      id: "book_contract",
      group: "book_contract",
      priority: 104,
      required: true,
      content: [
        `Title: ${reviewContext.bookContract.title}`,
        `Genre: ${reviewContext.bookContract.genre}`,
        `Target audience: ${reviewContext.bookContract.targetAudience}`,
        `Selling point: ${reviewContext.bookContract.sellingPoint}`,
        `First 30 chapter promise: ${reviewContext.bookContract.first30ChapterPromise}`,
        `Narrative POV: ${reviewContext.bookContract.narrativePov}`,
        `Pace preference: ${reviewContext.bookContract.pacePreference}`,
        `Emotion intensity: ${reviewContext.bookContract.emotionIntensity}`,
        reviewContext.bookContract.toneGuardrails.length > 0
          ? `Tone guardrails: ${reviewContext.bookContract.toneGuardrails.join(" | ")}`
          : "",
        reviewContext.bookContract.hardConstraints.length > 0
          ? `Hard constraints: ${reviewContext.bookContract.hardConstraints.join(" | ")}`
          : "",
      ].filter(Boolean).join("\n"),
    }),
    // 新增 story_macro
    ...(reviewContext.macroConstraints
      ? [createContextBlock({
          id: "story_macro",
          group: "story_macro",
          priority: 98,
          content: [
            `Selling point: ${reviewContext.macroConstraints.sellingPoint}`,
            `Core conflict: ${reviewContext.macroConstraints.coreConflict}`,
            `Main hook: ${reviewContext.macroConstraints.mainHook}`,
            `Progression loop: ${reviewContext.macroConstraints.progressionLoop}`,
            `Growth path: ${reviewContext.macroConstraints.growthPath}`,
            `Ending flavor: ${reviewContext.macroConstraints.endingFlavor}`,
            reviewContext.macroConstraints.hardConstraints.length > 0
              ? `Hard constraints: ${reviewContext.macroConstraints.hardConstraints.join(" | ")}`
              : "",
          ].filter(Boolean).join("\n"),
        })]
      : []),
    // 原有 blocks
    ...buildChapterWriterContextBlocksForReexport(reviewContext, { mode: "review" }),
    createContextBlock({ ... structure_obligations ... }),
    createContextBlock({ ... world_rules ... }),
    createContextBlock({ ... historical_issues ... }),
  ].filter(block => block.content.trim().length > 0);
}
```

### 3.4 `server/src/services/audit/auditPromptContext.ts`

**当前逻辑**：
```typescript
const fallbackContextBlocks = buildChapterReviewContextBlocks(reviewContext);
const resolvedContext = await resolvePromptContextBlocksForAsset({
  asset: input.asset,
  executionContext: { ... },
  fallbackBlocks: fallbackContextBlocks,
});
return resolvedContext.blocks;
```

**变更**：无需修改此文件。`buildChapterReviewContextBlocks` 的修改会自动使新增 block 通过 fallback 传递给 context resolution 系统。context resolution 会根据 prompt 的 `contextRequirements` 和 `contextPolicy` 选择注入哪些块。

---

## 4. Token Budget 分析

| Prompt | Budget | 当前估算 | 新增块估算 | 新增后估算 |
|--------|--------|----------|-----------|-----------|
| `chapterLightAudit` | 900 | ~600 | book_contract ~100, story_macro ~80 | ~780（安全） |
| `chapterReview` | 2600 | ~1800 | book_contract ~100, story_macro ~80, timeline ~80, character_dynamics ~120, recent_chapters ~200 | ~2380（安全） |

`recent_chapters` 扩展到全卷时，每章摘要约 10-20 token，10-20 章 = 100-400 token，在 full review budget 内。

---

## 5. 验证策略

1. **单元测试**：
   - 运行 `pnpm --filter @ai-novel/server test:routes` — 确认路由测试不回归
   - 运行 `pnpm --filter @ai-novel/server test:planner` — 确认 planner 不受影响
   - 运行 `pnpm test` — 全量测试通过

2. **类型检查**：
   - `pnpm typecheck` — 确认无新增类型错误

3. **手动验证**：
   - 启动 `pnpm dev`
   - 触发轻审校 → 检查日志中包含 `book_contract`、`story_macro` context block
   - 触发完整审校 → 检查日志中包含 `book_contract`、`story_macro`、`timeline_context`、`character_dynamics`、`recent_chapters` context block

4. **回归检查**：
   - 确认写作 prompt（`novel.chapter.writer`）的 context 注入不受影响
   - 确认修复 prompt（`novel.review.repair`）的 context 注入不受影响
