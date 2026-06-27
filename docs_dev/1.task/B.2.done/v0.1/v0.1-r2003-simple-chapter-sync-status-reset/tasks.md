---
description: "REQ-2003 任务拆解"
---

# REQ-2003 任务拆解

> 状态：⏳ 进行中（完成后改为 ✅ 全部完成）

## 任务概述

### 1. 来源

实际使用 — 步骤5章节细化完成后自动同步到步骤6时，已细化但无正文的章节被重置为 `unplanned`，导致"待写作"队列为空。

### 2. 问题

`VolumeChapterSyncService` 中 `preserveWorkflowState` 仅在 `hasContent = true` 时为 `true`，忽略了"有执行合同但无内容"的中间状态。

### 3. 需求

- 服务端：修正同步逻辑中的章节状态判定
- 验证：步骤6队列过滤器兼容性

### 4. 验收标准

> 见 [REQ-2003.md](./REQ-2003.md) 第 4 节。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 提取 `hasExecutionContract` 辅助函数 | P0 | 0.25h | ⬜ 待开始 |
| T2 | 修正更新已有章节的状态判定逻辑 | P0 | 0.5h | ⬜ 待开始 |
| T3 | 修正新建章节的初始状态设置 | P0 | 0.25h | ⬜ 待开始 |
| T4 | 编写/更新单元测试 | P1 | 1h | ⬜ 待开始 |
| T5 | 端到端验证：步骤5细化 → 步骤6待写作队列 | P1 | 0.5h | ⬜ 待开始 |

---

## 逐项展开

### T1: 提取 `hasExecutionContract` 辅助函数

**目标**: 在 `VolumeChapterSyncService.ts` 中新增辅助函数，判定章节是否具备执行合同。

**改动点**:
- `server/src/services/novel/volume/VolumeChapterSyncService.ts` — 新增 `hasExecutionContract(chapter)` 函数

**DoD**:
- 函数检查 `taskSheet` 和 `sceneCards` 是否非空
- 函数对 `null`/`undefined`/空字符串正确处理

---

### T2: 修正更新已有章节的状态判定逻辑

**目标**: 修改 `plan.updates` 循环中的 `chapterStatus` 赋值逻辑。

**改动点**:
- `server/src/services/novel/volume/VolumeChapterSyncService.ts`（lines 141-146）

**DoD**:
- `preserveWorkflowState = true` 时行为不变
- `preserveWorkflowState = false` 且有执行合同 → `pending_generation`
- `preserveWorkflowState = false` 且无执行合同 → `unplanned`

---

### T3: 修正新建章节的初始状态设置

**目标**: 修改 `plan.creates` 循环中的 `chapter.create` 调用。

**改动点**:
- `server/src/services/novel/volume/VolumeChapterSyncService.ts`（lines 108-126）

**DoD**:
- 新建章节有执行合同 → `chapterStatus: "pending_generation"`
- 新建章节无执行合同 → `chapterStatus: "unplanned"`

---

### T4: 编写/更新单元测试

**目标**: 覆盖新增的状态判定逻辑。

**改动点**:
- `server/tests/` — 新增或更新同步相关测试

**DoD**:
- 有执行合同无内容 → `pending_generation`
- 无执行合同无内容 → `unplanned`
- 有内容 → 状态保留
- 新建章节有执行合同 → `pending_generation`

---

### T5: 端到端验证

**目标**: 在真实环境中验证步骤5→步骤6的完整流程。

**验证步骤**:
1. 创建新书，完成步骤1-4
2. 在步骤5完成章节细化（确保 taskSheet 已生成）
3. 切换到步骤6
4. 确认"待写作"队列中显示已细化章节

**DoD**:
- 步骤6"待写作"队列非空
- 章节状态为 `pending_generation`
