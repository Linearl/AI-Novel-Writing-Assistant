---
description: "REQ-2006 任务拆解"
---

# REQ-2006 任务拆解

> 状态：⏳ 进行中

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 共享类型：VolumePlan 新增 targetChapterCount 字段 | P0 | 0.25h | ⬜ 待开始 |
| T2 | 后端：allocateChapterBudgets 尊重手动覆盖 | P0 | 1h | ⬜ 待开始 |
| T3 | 后端：resolveBeatSheetTargetChapterCount 优先手动值 | P0 | 0.5h | ⬜ 待开始 |
| T4 | 前端：卷卡片新增章节数输入控件 | P0 | 1h | ⬜ 待开始 |
| T5 | 前端：变更后保存到 VolumePlan | P0 | 0.5h | ⬜ 待开始 |
| T6 | 单元测试 | P1 | 1h | ⬜ 待开始 |
| T7 | 端到端验证 | P1 | 0.5h | ⬜ 待开始 |

---

### T1: 共享类型变更

**改动点**: `shared/types/novel.ts`
**DoD**: `targetChapterCount?: number | null` 字段存在，shared build 通过

### T2: 分配逻辑

**改动点**: `server/src/services/novel/volume/volumeChapterBudgetAllocation.ts`
**DoD**: 有手动值的卷使用手动值，其余从剩余预算分配

### T3: 节奏板章节数

**改动点**: `server/src/services/novel/volume/volumeBeatSheetGeneration.ts`
**DoD**: 优先使用 `volume.targetChapterCount`

### T4-T5: 前端 UI

**改动点**: `client/src/pages/novels/components/OutlineTab.tsx`
**DoD**: 卷卡片中显示数字输入框，清除按钮恢复自动分配

### T6-T7: 测试验证

**DoD**: 手动设置后节奏板使用手动值，清除后恢复自动分配
