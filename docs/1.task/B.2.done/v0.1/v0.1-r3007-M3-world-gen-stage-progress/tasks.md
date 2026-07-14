---
description: "REQ-3007 任务拆解（标准版）"
---

# REQ-3007 任务拆解

> 状态：✅ 全部完成

## 任务概述

### 1. 来源

用户使用体验反馈：世界生成向导步骤 2（骨架生成）按钮在生成过程中仅显示"生成中"，无阶段进度。

### 2. 问题

用户点击"生成骨架"后面对无反馈等待，不知道系统当前在做什么、还要等多久。对比步骤 1 已有 SSE 流式进度，步骤 2 体验明显落后。

### 3. 需求

- 后端将骨架生成拆分为多阶段，每阶段发送 SSE 进度事件
- 前端按钮动态显示"正在XX... N/M"格式的阶段进度
- 涉及文件：`worldSkeletonGeneration.ts`、`worldGenerationRoutes.ts`、`WorldGenerator.tsx`、`WorldGeneratorStepTwo.tsx` 等

### 4. 验收标准

> 见 [REQ-3007.md](./REQ-3007.md) 第 4 节。

- [x] 按钮文案格式为"正在XX... N/7"，阶段实时更新
- [x] 无回归：生成结果质量与改造前一致

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 后端：定义阶段枚举与 SSE 进度事件协议（shared 类型） | P0 | 0.5h | ✅ 已完成 |
| T2 | 后端：拆分骨架生成为多阶段流式执行器 | P0 | 2h | ✅ 已完成 |
| T3 | 后端：新增 SSE 流式骨架生成路由 | P0 | 1h | ✅ 已完成 |
| T4 | 前端：消费 SSE 进度事件并更新按钮文案 | P1 | 1.5h | ✅ 已完成 |
| T5 | 端到端验证与回归测试 | P1 | 0.5h | ✅ 已完成 |

---

## 逐项展开

### T1: 后端：定义阶段枚举与 SSE 进度事件协议

**目标**: 在 shared 包中定义世界生成阶段枚举、进度事件类型，供前后端共用。

**改动点**:
- `shared/types/worldWizard.ts` — 新增 `WorldGenStage` 枚举、`WorldGenProgressEvent` 类型
- 包含阶段 ID、中文标签、序号、总数等字段

### T2: 后端：拆分骨架生成为多阶段流式执行器

**目标**: 将 `generateWorldSkeleton` 的单次 `runStructuredPrompt` 拆分为多阶段执行，每阶段独立 LLM 调用，阶段完成后通过回调发送进度。

**改动点**:
- `server/src/services/world/worldSkeletonGeneration.ts` — 新增 `generateWorldSkeletonStreaming` 函数
- 每阶段使用独立 prompt（或从原 prompt 拆分），支持进度回调
- 最终结果组装逻辑与原 `generateWorldSkeleton` 保持一致
- 参考 `worldBuildingGraph.ts` 的节点定义作为阶段划分依据

### T3: 后端：新增 SSE 流式骨架生成路由

**目标**: 新增 `POST /worlds/skeleton/generate/stream` SSE 端点，调用流式执行器并推送进度事件。

**改动点**:
- `server/src/modules/setup/world/http/worldGenerationRoutes.ts` — 新增 SSE 路由
- 参考现有 `/worlds/inspiration/analyze/stream` 的 SSE 实现模式
- 使用 `writeSSEFrame` 推送 `progress` 和 `done` 事件

### T4: 前端：消费 SSE 进度事件并更新按钮文案

**目标**: `WorldGeneratorStepTwo` 的生成按钮在骨架生成过程中显示阶段进度。

**改动点**:
- `client/src/api/world.ts` — 新增 `generateWorldSkeletonStream` API 函数
- `client/src/pages/worlds/WorldGenerator.tsx` — 将步骤 2 的 mutation 替换为 SSE hook
- `client/src/pages/worlds/components/generator/WorldGeneratorStepTwo.tsx` — 按钮接收进度状态，显示"正在XX... N/M"

### T5: 端到端验证与回归测试

**目标**: 确认改造后生成结果质量无退化，进度显示正确。

**改动点**:
- 手动测试：启动 dev → 进入世界生成向导 → 步骤 2 观察按钮进度
- 类型检查：`pnpm typecheck`
- 回归验证：对比改造前后生成结果的结构和质量

---

## DoD（Definition of Done）

- 按钮文案实时显示 7 个阶段的中文名称和序号
- 生成结果的 JSON 结构与改造前一致（无 schema 变更）
- `pnpm typecheck` 通过

---

## 依赖

- 前置依赖：无
- 关联依赖：无
- 后继依赖：无

---

## 验证步骤

1. `pnpm --filter @ai-novel/shared build` 确认 shared 类型构建通过
2. `pnpm typecheck` 确认全量类型检查通过
3. 启动 `pnpm dev`，进入世界生成向导
4. 在步骤 1 填写灵感后进入步骤 2
5. 点击"生成骨架"，观察按钮文案依次显示：
   - "正在构思世界概念... 1/7"
   - "正在生成核心规则... 2/7"
   - "正在构建势力阵营... 3/7"
   - ...
   - "正在校验完整度... 7/7"
6. 生成完成后按钮恢复，自动进入步骤 3 预览

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-06-29 | 需求创建 | 完成 |

---

## 完成判定

- T1~T5 全部完成且 DoD 全部满足后，REQ-3007 达到"已完成"状态。
