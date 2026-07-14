---
description: "REQ-7034 Novel Application Services 门面收缩 — 任务拆解"
---

# REQ-7034 任务拆解

> 状态：✅ 已完成

## 任务概述

### 1. 来源

架构诊断报告 2026-07-10 第13条发现。NovelApplicationServices.ts 694 行 ~90% 纯委托，门面无杠杆。

### 2. 问题

130 方法接口中约 117 个是纯委托（1 行 `return this.subService.method(params)`），删除门面后调用者直接持有子服务引用不会增加复杂性。

### 3. 需求

方法分类 → 门面收缩 → 调用方更新 → 验证。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 130 方法全量审计分类 | P0 | 1.5h | ✅ 已完成 |
| T2 | 审计所有调用方引用 | P0 | 30min | ✅ 已完成 |
| T3 | 收缩接口定义（NovelApplicationContracts.ts） | P1 | 30min | ✅ 已完成 |
| T4 | 收缩门面实现（NovelApplicationServices.ts） | P1 | 30min | ✅ 已完成 |
| T5 | 更新路由注册调用方 | P1 | 1h | ✅ 已完成 |
| T6 | 更新其他调用方 | P1 | 1h | ✅ 已完成 |
| T7 | 全量验证 | P0 | 30min | ✅ 已完成 |

---

## 逐项展开

### T1: 130 方法全量审计分类

**完成**：逐方法检查，分类结果：
- **协调方法（保留，17个）**：getNovelById, createCharacter, updateCharacter, deleteCharacter, createNovelSnapshot, restoreFromSnapshot, createStructuredOutlineStream, createChapterStream, createRepairStream, startPipelineJob, listStorylineVersions, createStorylineDraft, activateStorylineVersion, freezeStorylineVersion, getStorylineDiff, applyCharacterVisibleProfile, applyBatchCharacterVisibleProfiles
- **纯委托（删除，~110个）**：所有单行 `return this.subService.method(params)` 方法

### T2: 审计所有调用方引用

**完成**：grep 全仓搜索，识别所有 import `NovelApplicationServices` 的调用方并建立调用关系矩阵。

### T3: 收缩接口定义

**完成**：`NovelApplicationContracts.ts` 接口从 120+ 方法缩减到 17 个协调方法。`novelApplicationServiceMethodNames` 同步更新。

### T4: 收缩门面实现

**完成**：`NovelApplicationServices.ts` 从 694 行缩减到 ~300 行（含注释），17 个协调方法。移除所有纯委托方法。

### T5: 更新路由注册调用方

**完成**：`novelRouteRegistration.ts` 更新为从 `DefaultNovelApplicationServices` 提取子服务并按需传给各路由。

### T6: 更新其他调用方

**完成**：更新以下调用方：
- `novelExport.service.ts` — 使用 NovelCoreService/NovelWorldSliceService/CharacterPreparationService/NovelVolumeService
- `agents/tools/shared.ts` + `writeTools.ts` — 使用 NovelCoreService
- `RecoveryTaskService.ts` — 使用 NovelCoreService
- `PipelineTaskAdapter.ts` — 使用 NovelCoreService
- `TaskCenterService.ts` — 使用 NovelCoreService
- `NovelProductionService.ts` — 使用 NovelCoreService
- `NovelDirectorService.ts` — 组合 NovelApplicationServices + NovelCoreService
- `DirectorCoreStepModuleRuntime.ts` — 组合 NovelApplicationServices + NovelCoreService
- 所有 12 个路由文件 — 使用对应子服务类型

### T7: 全量验证

**完成**：
- `pnpm typecheck` — 无新增错误（仅有预存的 Cannot find module / implicit any 错误）
- `pnpm test` — 测试结果与基线一致（7个预存失败，均在 tests/utils/ 中，与本次变更无关）

---

## DoD

- [x] 130 方法全量分类完成
- [x] 纯委托方法已从接口和实现中移除
- [x] 所有调用方已更新
- [x] NovelApplicationServices.ts 从 694 行缩减到 ~300 行
- [x] typecheck 通过（无新增错误）
- [x] test 通过（与基线一致）

---

## 验证步骤

1. `pnpm typecheck` — 零新增错误 ✓
2. `pnpm test` — 与基线一致（7个预存失败）✓
3. 门面方法数：17 个协调方法（原 120+）✓

---

## 完成判定

- T1~T7 全部完成且 DoD 全部满足，REQ-7034 达到"已完成"状态。
