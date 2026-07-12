---
description: "REQ-2049 审校上下文增强 — 任务拆解"
---

# REQ-2049 审校上下文增强 — 任务总表

> status: requirements_ready
> updated: 2026-07-11

## 阶段零：前置确认

- [x] 编号分配：REQ-2049，2xxx simple/P2
- [x] 任务包骨架已建
- [ ] 全部 6 个任务完成

## 任务列表

### T1.1: audit.prompts.ts — light prompt 增加 book_contract、story_macro context requirements

- 依赖：无
- 目标文件：`server/src/prompting/prompts/audit/audit.prompts.ts`
- DoD：
  - `auditChapterLightPrompt.contextRequirements` 包含 `{ group: "book_contract", priority: 104 }` 和 `{ group: "story_macro", priority: 98 }`
  - `auditChapterLightPrompt.contextPolicy.preferredGroups` 包含 `"book_contract"` 和 `"story_macro"`（位于列表最前）
  - `auditChapterLightPrompt.contextPolicy.dropOrder` 不包含 `"book_contract"` 或 `"story_macro"`
- 估时：0.25h
- 状态：todo

### T1.2: audit.prompts.ts — full prompt 增加 book_contract、story_macro、timeline_context、character_dynamics、payoff_directives context requirements

- 依赖：无（与 T1.1 并行）
- 目标文件：`server/src/prompting/prompts/audit/audit.prompts.ts`
- DoD：
  - `auditChapterPrompt.contextRequirements` 包含以下新增：
    - `{ group: "book_contract", priority: 104 }`
    - `{ group: "story_macro", priority: 98 }`
    - `{ group: "timeline_context", priority: 100 }`
    - `{ group: "character_dynamics", priority: 91 }`
    - `{ group: "payoff_directives", priority: 98 }`
  - `auditChapterPrompt.contextPolicy.preferredGroups` 包含以上 5 个 group
  - `auditChapterPrompt.contextPolicy.dropOrder` 不包含以上 5 个 group
- 估时：0.25h
- 状态：todo

### T2.1: chapterLayeredContextBlocks.ts — review 模式下确保 timeline_context、character_dynamics、payoff_directives 注入

- 依赖：T1.1, T1.2（确认 contextRequirements 正确后修改 block builder）
- 目标文件：`server/src/prompting/prompts/novel/chapterLayeredContextBlocks.ts`
- DoD：
  - `buildChapterWriterContextBlocks` 中，review 模式下 `includeTimelineContext` 始终为 `true`（timeline 块已有 fallback 占位逻辑）
  - `buildChapterWriterContextBlocks` 中，review 模式下 `includeCharacterDynamics` 始终为 `true`
  - `buildChapterWriterContextBlocks` 中，review 模式下 `includePayoffDirectives` 始终为 `true`（即使无数据也输出占位）
  - 无空块或 undefined 注入（filter 逻辑不变）
- 估时：0.5h
- 状态：todo

### T2.2: chapterLayeredContextBlocks.ts — recent_chapters 扩展到当前卷全部

- 依赖：无（与 T2.1 同文件，可合并执行）
- 目标文件：`server/src/prompting/prompts/novel/chapterLayeredContextBlocks.ts`
- DoD：
  - `includeRecentChapters` 条件变更为 `(mode === "full" || mode === "review") && writeContext.recentChapterSummaries.length > 0`
  - `recent_chapters` 块优先级保持 `86`
- 估时：0.25h
- 状态：todo

### T3.1: 类型检查

- 依赖：T1.1, T1.2, T2.1, T2.2
- DoD：`pnpm typecheck` 通过，无新增类型错误
- 估时：0.25h
- 状态：todo

### T3.2: 验证 — 审校时能正确注入新 context

- 依赖：T3.1
- DoD：
  - `pnpm test` 通过（现有 audit 相关测试不回归）
  - `pnpm --filter @ai-novel/server test:routes` 通过（路由测试不回归）
  - 手动验证：启动 dev server → 触发轻审校/完整审校 → 确认日志中包含 `book_contract`、`story_macro`、`recent_chapters` context block
- 估时：0.5h
- 状态：todo

```
T1.1 ──→ T2.1 ──→ T3.1 ──→ T3.2
T1.2 ──↗   T2.2 ──↗
```
