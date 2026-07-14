---
description: "REQ-3007 方案设计"
---

# REQ-3007 方案设计

## 1. 方案概述

将骨架生成从"单次 LLM 调用"改造为"多阶段串行 LLM 调用 + SSE 进度推送"。后端每完成一个阶段，通过 SSE 向前端发送进度事件；前端 `useSSE` hook 消费进度事件，动态更新按钮文案。

### 1.1 设计目标

1. 用户在骨架生成过程中能感知当前阶段和整体进度
2. 改造后生成结果质量不低于当前单次调用方案
3. 前端复用已有 SSE 基础设施（`useSSE` hook + `writeSSEFrame`）

### 1.2 关键决策

1. **多阶段拆分策略**：基于原 `worldSkeletonGenerationPrompt` 的输出结构拆分为 7 个阶段，每个阶段生成结构化数据的一个子集，最终合并
2. **SSE 协议复用**：复用步骤 1 的 SSE 帧格式（`progress`/`done`/`error` 事件类型），保持一致性
3. **新端点而非改造**：新增 `POST /worlds/skeleton/generate/stream` 而非修改现有端点，避免破坏旧版兼容性

### 1.3 不在范围

- 不改造旧版 `worldBuildingGraph`
- 不修改通用 `runStructuredPrompt` 基础设施
- 不引入 WebSocket 或其他推送机制

## 2. 实现细节

### 2.1 后端

#### 阶段定义（shared 类型）

在 `shared/types/worldWizard.ts` 中新增：

```typescript
// 世界生成阶段枚举
export const WORLD_GEN_STAGES = [
  { id: "concept",    label: "正在构思世界概念" },
  { id: "rules",      label: "正在生成核心规则" },
  { id: "factions",   label: "正在构建势力阵营" },
  { id: "geography",  label: "正在绘制地理版图" },
  { id: "conflicts",  label: "正在编织冲突脉络" },
  { id: "entries",    label: "正在规划故事入口" },
  { id: "assessment", label: "正在校验完整度" },
] as const;

export type WorldGenStageId = typeof WORLD_GEN_STAGES[number]["id"];

// SSE 进度事件
export interface WorldGenProgressEvent {
  stage: WorldGenStageId;
  stageIndex: number;    // 1-based
  totalStages: number;   // 7
  label: string;         // 用户可见标签
}
```

#### 多阶段执行器

在 `server/src/services/world/worldSkeletonGeneration.ts` 中新增 `generateWorldSkeletonStreaming`：

```typescript
export async function generateWorldSkeletonStreaming(
  input: WorldSkeletonGenerateInput,
  onProgress: (event: WorldGenProgressEvent) => void,
): Promise<WorldSkeletonGenerationPayload> {
  // 阶段 1: concept — 构思世界概念
  onProgress({ stage: "concept", stageIndex: 1, totalStages: 7, label: "正在构思世界概念" });
  const concept = await generateConceptStage(input);

  // 阶段 2: rules — 核心规则
  onProgress({ stage: "rules", stageIndex: 2, totalStages: 7, label: "正在生成核心规则" });
  const rules = await generateRulesStage(input, concept);

  // ... 依次执行 7 个阶段

  // 最终组装
  return assembleSkeletonResult(concept, rules, factions, geography, conflicts, entries, assessment);
}
```

每个阶段使用独立的 prompt，聚焦生成该阶段的数据子集。阶段间有依赖关系时，将前序结果注入后续 prompt 的上下文。

#### SSE 路由

在 `worldGenerationRoutes.ts` 新增：

```typescript
router.post("/skeleton/generate/stream", async (req, res) => {
  // SSE 头部设置
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const result = await generateWorldSkeletonStreaming(
      input,
      (progress) => writeSSEFrame(res, "progress", progress),
    );
    writeSSEFrame(res, "done", result);
  } catch (error) {
    writeSSEFrame(res, "error", { message: error.message });
  }
  res.end();
});
```

### 2.2 前端

#### API 层

在 `client/src/api/world.ts` 新增：

```typescript
export const WORLD_SKELETON_GENERATE_STREAM_PATH = "/worlds/skeleton/generate/stream";
```

#### WorldGenerator.tsx

将步骤 2 的 `generateSkeletonMutation` 替换为 SSE 调用模式：

```typescript
const skeletonStream = useSSE({
  url: WORLD_SKELETON_GENERATE_STREAM_PATH,
  onDone: async (fullContent) => {
    const result = JSON.parse(fullContent);
    // 设置骨架结果，进入步骤 3
  },
});

// 传递给 StepTwo
<WorldGeneratorStepTwo
  generating={skeletonStream.isStreaming}
  progressMessage={skeletonStream.latestRun?.message}
  // ...
/>
```

#### WorldGeneratorStepTwo.tsx

按钮文案根据进度状态动态切换：

```tsx
<Button disabled={generating}>
  {generating
    ? progressMessage ?? "正在生成..."
    : "生成骨架"
  }
</Button>
```

`progressMessage` 的值来自 SSE `progress` 事件的 `label + stageIndex + totalStages`，格式化为 "正在构思世界概念... 1/7"。

## 3. 接口定义

### 3.1 新增接口

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| POST | `/worlds/skeleton/generate/stream` | SSE 流式骨架生成 |

### 3.2 请求示例

```json
{
  "idea": "一个蒸汽朋克与魔法共存的世界",
  "worldType": "fantasy",
  "blueprint": { "rules": 5, "factions": 4, "locations": 6 },
  "options": { "preset": "standard" }
}
```

### 3.3 SSE 响应帧

```
event: progress
data: {"stage":"concept","stageIndex":1,"totalStages":7,"label":"正在构思世界概念"}

event: progress
data: {"stage":"rules","stageIndex":2,"totalStages":7,"label":"正在生成核心规则"}

...

event: done
data: {"concept":{...},"structuredData":{...},"bindingSupport":{...},"assessment":{...}}

```

## 4. 数据模型

无数据库变更。生成结果结构不变，仅执行方式从单次变为多阶段。

## 5. 异常处理

| 错误码 | 场景 | 处理方式 |
| ---- | ---- | -------- |
| SSE error | 某阶段 LLM 调用失败 | 发送 `error` 帧，前端显示错误，按钮恢复 |
| SSE timeout | 某阶段超时（>60s） | 发送 `error` 帧，建议重试 |
| 部分成功 | 前 N 阶段成功，后续失败 | 可选：返回已生成的部分数据供参考 |

## 6. 验证策略

1. `pnpm --filter @ai-novel/shared build` — shared 类型构建
2. `pnpm typecheck` — 全量类型检查
3. 手动 E2E：进入世界生成向导 → 步骤 2 → 观察按钮进度 → 确认 7 个阶段均显示
4. 回归：对比改造前后生成结果的 JSON 结构一致性
