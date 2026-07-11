---
description: "REQ-2049 审校上下文增强 — 补齐审校缺失的全局字段 — 任务总线"
---

# REQ-2049 审校上下文增强 — 补齐审校缺失的全局字段

> 创建日期：2026-07-11
> 目标版本：0.1
> 状态：📋 需求就绪

---

## 1. 任务概述

### 1.1 需求来源

审校质量分析发现，当前轻审校（`audit.chapter.light`）和完整审校（`audit.chapter.full`）在 context 组装时缺失多个全局上下文块，导致审校 AI 无法感知书的核心定位和故事宏观结构。写作 prompt（`buildAllContextBlocks`）已包含这些块，但审校路径（`buildChapterReviewContextBlocks`）没有对齐。

### 1.2 缺失字段

| 上下文块 | 写作时 priority | 审校时现状 | 影响 |
| -------- | --------------- | ---------- | ---- |
| `book_contract` | 100 | 完全缺失 | 审校不知道书名、类型、读者定位、卖点、POV、节奏、情绪强度、语气护栏、硬约束 |
| `story_macro` | 98 | 完全缺失 | 审校不知道核心冲突、主钩子、推进循环、成长路径、结局调性 |
| `timeline_context` | 100 | 有条件注入（`Boolean(writeContext.timelineContext)`），审校时可能为空 | 审校无法判断时间线一致性 |
| `character_dynamics` | 91 | 有条件注入（review 模式下可能跳过） | 审校不知道角色关系阶段和行为约束 |
| `recent_chapters` | 86 | 仅 3 章（写作时 `mode === "full"` 才注入） | 审校缺乏连贯性判断依据，卷内全局上下文不足 |

### 1.3 核心目标

1. `audit.prompts.ts` 的 light prompt 增加 `book_contract`、`story_macro` context requirements
2. `audit.prompts.ts` 的 full prompt 增加 `book_contract`、`story_macro`、`timeline_context`、`character_dynamics` context requirements
3. `auditPromptContext.ts` 增加这些 context block 的解析逻辑
4. `recent_chapters` 从 3 章扩展到当前卷全部（用摘要）

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2049-review-context-enhance.md` | 需求工作副本 | 否 |
| `REQ-2049-review-context-enhance-original.md` | 冻结副本 | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-07-11 | 🆕 需求就绪 | 创建任务包 |

---

## 4. 关联文件

| 文件 | 关系 |
| ---- | ---- |
| `server/src/prompting/prompts/audit/audit.prompts.ts` | 主要修改目标 — light/full prompt 的 contextRequirements |
| `server/src/services/audit/auditPromptContext.ts` | 主要修改目标 — context block 解析逻辑 |
| `server/src/prompting/prompts/novel/chapterLayeredContext.ts` | 参考 — `buildChapterReviewContextBlocks` 当前实现 |
| `server/src/prompting/prompts/novel/chapterLayeredContextBlocks.ts` | 参考 — 写作 context blocks 构建逻辑 |
| `server/src/prompting/prompts/novel/promptBudgetProfiles.ts` | 参考 — budget profile 定义 |
| `server/src/prompting/prompts/novel/chapterLayeredContextHelpers.ts` | 参考 — `buildChapterReviewContext` 函数 |

---

## 5. 执行清单

- [ ] T1.1: audit.prompts.ts light prompt 增加 book_contract、story_macro context requirements
- [ ] T1.2: audit.prompts.ts full prompt 增加 book_contract、story_macro、timeline_context、character_dynamics context requirements
- [ ] T2.1: auditPromptContext.ts 增加新 context block 的解析
- [ ] T2.2: recent_chapters 扩展到当前卷全部章节摘要
- [ ] T3.1: pnpm typecheck 通过
- [ ] T3.2: 验证：审校时能正确注入新 context
