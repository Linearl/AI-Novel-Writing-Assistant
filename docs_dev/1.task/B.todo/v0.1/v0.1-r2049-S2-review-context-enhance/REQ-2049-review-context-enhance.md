---
description: "REQ-2049 审校上下文增强 — 补齐审校缺失的全局字段"
---

# REQ-2049 审校上下文增强 — 补齐审校缺失的全局字段

> 状态：📋 需求就绪

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2049 |
| 优先级 | P2 |
| 复杂度 | simple |
| 来源 | 审校质量分析 |
| 关联需求 | 无 |
| 依赖系统 | `chapterLayeredContext` 体系、`auditPromptContext` |

---

## 1. 背景与问题

### 1.1 现状

当前审校流程（轻审校 + 完整审校）通过 `buildChapterReviewContextBlocks()` 组装上下文。该函数内部调用 `_buildChapterWriterContextBlocks(reviewContext, { mode: "review" })`，然后追加 `structure_obligations`、`world_rules`、`historical_issues` 三个额外块。

但 `buildChapterWriterContextBlocks` 中的以下块在 review 模式下**不会被注入**：

| 上下文块 | 写作时 priority | 原因 |
| -------- | --------------- | ---- |
| `book_contract` | 100 | 该块在 `getAllContextBlocks()` 中注入，不在 `buildChapterWriterContextBlocks()` 中 |
| `story_macro` | 98 | 同上，`getAllContextBlocks()` 才注入 |
| `timeline_context` | 100 | `includeTimelineContext = Boolean(writeContext.timelineContext)` — review 上下文可能为 null |
| `character_dynamics` | 91 | `shouldIncludeCharacterDynamics()` 在 review 模式下条件更严格 |
| `recent_chapters` | 86 | `includeRecentChapters = mode === "full"` — review 模式为 `"review"`，永远不注入 |

审校 AI 不知道书的核心定位（类型、读者、卖点、POV、节奏），不知道故事宏观结构（核心冲突、主钩子、成长路径），不知道时间线约束，不知道角色关系动态，最近章节也只有极有限的摘要。

### 1.2 不改的后果

1. 审校 AI 无法判断章节是否偏离书的核心定位（类型、读者群体、卖点承诺）
2. 审校 AI 无法验证章节是否符合故事宏观结构（核心冲突推进、主钩子设置）
3. 审校 AI 无法检测时间线矛盾（时间线资产缺失时没有 fallback 约束）
4. 审校 AI 无法验证角色关系阶段是否一致（角色动态块缺失）
5. 审校 AI 连贯性判断受限（最近章节太少，无法追溯卷内叙事脉络）

---

## 2. 目标与范围

### 2.1 目标

1. 轻审校 prompt 注入 `book_contract` 和 `story_macro` context
2. 完整审校 prompt 注入 `book_contract`、`story_macro`、`timeline_context` 和 `character_dynamics` context
3. `recent_chapters` 从固定 3 章扩展到当前卷全部章节摘要（使用 `writeContext.recentChapterSummaries`，该字段在 `buildChapterReviewContext` 时已包含卷内全部摘要）
4. 审校 context priority 与写作时对齐或接近

### 2.2 In Scope

**后端**：
- `server/src/prompting/prompts/audit/audit.prompts.ts` — 修改 light/full prompt 的 `contextRequirements`
- `server/src/services/audit/auditPromptContext.ts` — 增加新 context block 的解析逻辑
- `server/src/prompting/prompts/novel/promptBudgetProfiles.ts` — 可能需要调整 budget profile 以容纳新增 context
- `server/src/prompting/prompts/novel/chapterLayeredContext.ts` — review 模式下确保 `recent_chapters` 注入

### 2.3 Out of Scope

- 不修改写作 prompt 的 context 结构
- 不修改 `buildChapterWriterContextBlocks` 的 `book_contract`/`story_macro` 注入逻辑（写作时通过 `getAllContextBlocks` 注入，已正确工作）
- 不修改 `GenerationContextAssembler` 的上下文组装逻辑
- 不新增 Prisma 模型或 API 路由

---

## 3. 需求详情

### 3.1 功能 1：给 light + full 审校 prompt 注入 book_contract 和 story_macro

**目标文件**：`server/src/prompting/prompts/audit/audit.prompts.ts`

**Light prompt (`auditChapterLightPrompt`)**：
在 `contextRequirements` 中新增：
- `{ group: "book_contract", priority: 104 }` — 书的核心定位，比 chapter_mission（100）更高
- `{ group: "story_macro", priority: 98 }` — 故事宏观结构

在 `contextPolicy.preferredGroups` 中新增：
- `"book_contract"`（在列表最前）
- `"story_macro"`

在 `contextPolicy.dropOrder` 中确保不被优先丢弃。

**Full prompt (`auditChapterPrompt`)**：
同上，新增 `book_contract` 和 `story_macro`，并额外新增：
- `{ group: "timeline_context", priority: 100 }` — 时间线约束
- `{ group: "character_dynamics", priority: 91 }` — 角色动态

在 `contextPolicy.preferredGroups` 中新增：
- `"book_contract"`
- `"story_macro"`
- `"timeline_context"`
- `"character_dynamics"`

### 3.2 功能 2：给审校注入 timeline_context 和 character_dynamics

**目标文件**：`server/src/services/audit/auditPromptContext.ts`

当前 `resolveAuditChapterContextBlocks` 调用 `buildChapterReviewContextBlocks(reviewContext)` 来获取 fallback context blocks。该函数已包含 `timeline_context`（条件注入）和 `character_dynamics`（条件注入），但条件可能阻止注入。

需要确保：
- `timeline_context` 在 `buildChapterReviewContextBlocks` 中即使 `writeContext.timelineContext` 为空也注入占位块（与写作时行为一致：写作时也注入 fallback 占位块）
- `character_dynamics` 在 review 模式下不再被 `shouldIncludeCharacterDynamics()` 的严格条件跳过

**修改位置**：`chapterLayeredContextBlocks.ts` 中的 `buildChapterWriterContextBlocks` 函数

**当前条件**：
```typescript
const includeTimelineContext = Boolean(writeContext.timelineContext);
const includeCharacterDynamics = shouldIncludeCharacterDynamics(writeContext, mode);
```

**变更**：在 review 模式下：
- `includeTimelineContext` 始终为 `true`（timeline 块已有 fallback 占位逻辑）
- `includeCharacterDynamics` 始终为 `true`（即使无数据，也输出空状态提示）

### 3.3 功能 3：recent_chapters 从 3 章扩展到当前卷全部

**现状分析**：
`recent_chapters` 块在 `buildChapterWriterContextBlocks` 中的条件是：
```typescript
const includeRecentChapters = mode === "full" && writeContext.recentChapterSummaries.length > 0;
```

review 模式（`mode: "review"`）下，`mode === "full"` 为 `false`，因此 `recent_chapters` 永远不注入。

**变更**：
在 review 模式下，`recent_chapters` 也应注入：
```typescript
const includeRecentChapters = (mode === "full" || mode === "review")
  && writeContext.recentChapterSummaries.length > 0;
```

**数据源说明**：
`writeContext.recentChapterSummaries` 在 `buildChapterReviewContext` 时由 `GenerationContextAssembler` 填充，内容为当前卷全部章节摘要（不限 3 章），因此无需修改数据源，只需解除 mode 限制。

**优先级**：保持 `86`，与写作时一致。

### 3.4 context priority 对齐

| 上下文块 | 写作时 priority | 审校后 priority | 说明 |
| -------- | --------------- | --------------- | ---- |
| `book_contract` | 100 | 104（轻审校）/ 104（完整审校） | 审校时优先级略高于写作，因为审校必须首先知道书的定位 |
| `story_macro` | 98 | 98 | 保持一致 |
| `timeline_context` | 100 | 100 | 保持一致 |
| `character_dynamics` | 91 | 91 | 保持一致 |
| `recent_chapters` | 86 | 86 | 保持一致 |

---

## 4. 验收标准

- [ ] 轻审校 prompt 的 `contextRequirements` 包含 `book_contract`（priority 104）和 `story_macro`（priority 98）
- [ ] 完整审校 prompt 的 `contextRequirements` 包含 `book_contract`（priority 104）、`story_macro`（priority 98）、`timeline_context`（priority 100）和 `character_dynamics`（priority 91）
- [ ] light/full prompt 的 `contextPolicy.preferredGroups` 包含新增的 group
- [ ] `buildChapterReviewContextBlocks` 在 review 模式下注入 `timeline_context`（即使 `writeContext.timelineContext` 为空）
- [ ] `buildChapterReviewContextBlocks` 在 review 模式下注入 `character_dynamics`（即使无数据，也输出空状态提示）
- [ ] `recent_chapters` 在 review 模式下注入当前卷全部章节摘要
- [ ] 审校 prompt 能正确渲染新增 context block（无空块、无 undefined）
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过（现有 audit 测试不回归）
- [ ] `pnpm build` 通过

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| 新增 context block 增加 token 消耗 | `chapterLightAudit` budget = 900，`chapterReview` budget = 2600，需验证 token budget 仍够用；book_contract 和 story_macro 本身较短 |
| `recent_chapters` 扩展到全卷可能很长 | `recentChapterSummaries` 为摘要格式（每章一句），卷内一般 10-20 章，token 增量可控 |
| 审校 prompt 结构变更可能影响现有测试 | 在修改后跑 `pnpm --filter @ai-novel/server test:routes` + `pnpm test` 确认无回归 |
| `timeline_context` review 模式强制注入可能无数据 | `timelinePromptAdapter.toPromptBlock()` 已有 fallback 占位逻辑（输出"当前没有已登记的时间线资产"） |

---

## 6. 架构约束

- **AI-First**：context 变更纯粹是向 LLM 提供更多背景信息，不涉及硬编码逻辑
- **Prompt Governance**：不新增 prompt 文件，仅修改已有 `audit.prompts.ts` 的 context 配置
- **不可变数据**：`recentChapterSummaries` 数据源不变，仅解除注入条件限制
- **最小改动**：优先修改 `chapterLayeredContextBlocks.ts` 和 `audit.prompts.ts`，不引入新文件

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-11 | 创建 | 基于审校质量分析，识别 5 个缺失的全局上下文块 |
