---
description: "REQ-2015 用户指导式章节修复任务拆解"
---

# REQ-2015 任务拆解

> 状态：⏳ 进行中

## 任务概述

### 1. 来源

用户反馈 — 章节审计后修复选项不足，希望提出修改方向让 AI 执行。

### 2. 问题

当前只有三种修复方案（一键补丁、重写整章、手动编辑器），缺少"用户指方向、AI 执行"的中间选项。

### 3. 需求

- 后端：扩展修复 schema + 修复运行时支持 `userInstruction`
- 前端：审计面板新增"按指导修复"输入区域
- 需求文档：[REQ-2015.md](./REQ-2015.md)
- 方案设计：[design.md](./design.md)

### 4. 验收标准

> 见 [REQ-2015.md](./REQ-2015.md) 第 4 节。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 后端：修复 schema 扩展 `userInstruction` | P0 | 15min | ⬜ 待开始 |
| T2 | 后端：修复运行时识别 `userInstruction` 并强制 heavy_repair | P0 | 30min | ⬜ 待开始 |
| T3 | 后端：修复 prompt 注入用户指导 | P1 | 20min | ⬜ 待开始 |
| T4 | 前端：审计面板"按指导修复"UI 组件 | P0 | 30min | ⬜ 待开始 |
| T5 | 前端：Hook 和 SSE 请求扩展 | P0 | 15min | ⬜ 待开始 |
| T6 | 类型检查与回归验证 | P1 | 15min | ⬜ 待开始 |

---

## 逐项展开

### T1: 后端 — 修复 schema 扩展 `userInstruction`

**目标**: 在修复端点的 Zod schema 中新增 `userInstruction` 可选字段。

**改动点**:
- `server/src/modules/novel/production/http/novelReviewRoutes.ts` — `repairSchema` 新增字段

### T2: 后端 — 修复运行时识别 `userInstruction`

**目标**: 当请求携带 `userInstruction` 时，构造合成 ReviewIssue 并强制 heavy_repair 模式。

**改动点**:
- `server/src/services/novel/runtime/repair/ChapterRepairStreamRuntime.ts` — `createRepairStream()` 识别 userInstruction 并构造合成 issue
- `server/src/services/novel/runtime/repair/chapterRepairRuntime.ts` — `prepareChapterRepairExecution()` 入口增加 userInstruction 判断，跳过 patch

### T3: 后端 — 修复 prompt 注入用户指导

**目标**: 在 heavy_repair prompt 上下文中，将用户指导作为最高优先级指令注入。

**改动点**:
- `server/src/prompting/prompts/novel/chapterRepair.prompts.ts`（或等效 prompt） — 上下文组装中注入 userInstruction

### T4: 前端 — 审计面板"按指导修复"UI

**目标**: 在 `ChapterExecutionActionPanel` 中新增折叠输入面板。

**改动点**:
- `client/src/pages/novels/components/ChapterExecutionActionPanel.tsx` — 新增 `userDirected` 折叠面板（textarea + 快捷标签 + 提交按钮）

### T5: 前端 — Hook 和 SSE 请求扩展

**目标**: 新增 `userDirectedRepair()` 方法并透传 `userInstruction` 到修复请求。

**改动点**:
- `client/src/pages/novels/hooks/useChapterExecutionActions.ts` — 新增 `userDirectedRepair` 方法
- `client/src/pages/novels/hooks/useNovelEditChapterRuntime.ts` — `startChapterRepair()` 透传 userInstruction

### T6: 类型检查与回归验证

**目标**: 确保类型检查通过，现有修复方案不受影响。

**改动点**:
- 运行 `pnpm typecheck`
- 运行 `pnpm test`
- 手动验证现有修复方案行为不变

---

## DoD（Definition of Done）

- 用户可在审计面板输入修改方向并提交
- AI 按用户方向执行定向修复（非随机重写）
- 现有三种修复方案行为不变
- 类型检查和测试全部通过

---

## 依赖

- 无外部依赖

---

## 验证步骤

1. 创建测试章节，触发审计使状态变为 `needs_repair`
2. 在审计面板展开"按指导修复"，输入修改方向（如"加快节奏"）
3. 确认 SSE 修复流正常启动并输出
4. 确认修复结果反映了用户方向
5. 确认现有"一键修复"、"重写整章"仍然正常工作

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-06-26 | 需求分析与方案设计 | ✅ 完成 |

---

## 完成判定

- T1~T6 全部完成且 DoD 全部满足后，REQ-2015 达到"已完成"状态。
