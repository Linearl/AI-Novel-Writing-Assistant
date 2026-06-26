---
description: "REQ-2012 用户指导式章节修复方案设计"
---

# REQ-2012 方案设计

## 1. 方案概述

在现有修复 SSE 管线上做最小扩展：请求体新增 `userInstruction` 可选字段，服务端识别后构造合成 `ReviewIssue` 并强制 `heavy_repair` 模式。前端在审计面板新增折叠输入区域。不新增端点，不修改现有修复行为。

### 1.1 设计目标

1. 最小侵入：复用现有修复管线，仅扩展请求 schema 和修复模式判断
2. 用户体验一致：修复过程使用同一条 SSE 流，流式输出与现有修复一致
3. 优先级明确：用户指导 > 审计 issues，确保 AI 按用户方向修改

### 1.2 关键决策

1. **复用现有端点**：不新增 API，扩展 `POST /:id/chapters/:chapterId/repair` 的请求体 — 降低实现成本，保持接口收敛
2. **强制 heavy_repair**：用户指导是宏观方向（"加快节奏"），不适合 patch 文本替换 — 直接走全文重修
3. **构造合成 ReviewIssue**：将 `userInstruction` 包装为 `category: "user_directed"` 的 ReviewIssue — 无缝融入现有修复逻辑

### 1.3 不在范围

- 不新增端点
- 不修改 auto-director 自动链路
- 不修改现有修复方案

## 2. 实现细节

### 2.1 后端

#### 2.1.1 Schema 扩展

**文件**: `server/src/modules/novel/production/http/novelReviewRoutes.ts`

在 `repairSchema` 中新增可选字段：

```typescript
const repairSchema = z.object({
  provider: llmProviderSchema.optional(),
  model: z.string().trim().optional(),
  reviewIssues: z.array(reviewIssueSchema).optional(),
  auditIssueIds: z.array(z.string().trim().min(1)).optional(),
  // 新增：用户修改方向
  userInstruction: z.string().trim().min(1).max(2000).optional(),
});
```

#### 2.1.2 修复运行时扩展

**文件**: `server/src/services/novel/runtime/repair/ChapterRepairStreamRuntime.ts`

在 `createRepairStream()` 中，当 `options.userInstruction` 存在时：

1. 构造合成 ReviewIssue：
```typescript
const userDirectedIssue: ReviewIssue = {
  severity: "high",
  category: "user_directed",
  evidence: options.userInstruction,
  fixSuggestion: options.userInstruction,
};
```

2. 将合成 issue 与审计 issues 合并（用户 issue 排首位）
3. 在调用 `prepareChapterRepairExecution()` 时传入 `mode: "heavy_repair"` 强制跳过 patch

#### 2.1.3 修复模式判断

**文件**: `server/src/services/novel/runtime/repair/chapterRepairRuntime.ts`

在 `prepareChapterRepairExecution()` 入口处增加判断：

```typescript
// 用户指导式修复强制走 heavy_repair
if (options.userInstruction) {
  return prepareHeavyRepairExecution(context);
}
```

#### 2.1.4 Prompt 注入

**文件**: `server/src/prompting/prompts/novel/chapterRepair.prompts.ts`（或等效 prompt 文件）

在 heavy_repair prompt 的上下文组装中，当存在 `userInstruction` 时，将其作为**最高优先级修改指令**注入：

```
## 用户修改指导（最高优先级）
用户明确要求以下修改方向，必须严格遵循：
{userInstruction}
```

### 2.2 前端

#### 2.2.1 审计面板新增入口

**文件**: `client/src/pages/novels/components/ChapterExecutionActionPanel.tsx`

在 `repairActionKind` 类型中新增 `"userDirected"` 值。

在 UI 中，当 `displayedStatus === "needs_repair"` 时，在现有修复按钮下方新增折叠面板：

```
┌─────────────────────────────────────┐
│ ▶ 按指导修复                         │
│ ┌─────────────────────────────────┐ │
│ │ 描述你希望怎么修改...             │ │
│ │                                  │ │
│ │                                  │ │
│ └─────────────────────────────────┘ │
│ [节奏加快] [补充动机] [口语化对话]    │
│ [加强冲突] [丰富心理描写]            │
│                      0/2000  [修复] │
└─────────────────────────────────────┘
```

#### 2.2.2 Hook 扩展

**文件**: `client/src/pages/novels/hooks/useChapterExecutionActions.ts`

新增 `userDirectedRepair(instruction: string)` 方法：

```typescript
function userDirectedRepair(instruction: string) {
  const issue = buildRepairIssue("user_directed", instruction, instruction);
  setRepairActionKind("userDirected");
  onStartRepair([issue], { userInstruction: instruction });
}
```

#### 2.2.3 SSE 请求扩展

**文件**: `client/src/pages/novels/hooks/useNovelEditChapterRuntime.ts`

在 `startChapterRepair()` 的请求体中透传 `userInstruction`：

```typescript
repairSSE.start(`/novels/${novelId}/chapters/${selectedChapterId}/repair`, {
  provider: llm.provider,
  model: llm.model,
  reviewIssues: issues,
  auditIssueIds: openAuditIssueIds,
  userInstruction: options?.userInstruction,  // 新增
});
```

### 2.3 Shared 类型

**文件**: `shared/types/chapterRuntime.ts`

在 `repairActionKind` 相关类型中新增 `"userDirected"` 值（如有需要）。

## 3. 接口定义

### 3.1 修改接口

| 方法 | 路径 | 变更 | 说明 |
| ---- | ---- | ---- | ---- |
| POST | /novels/:id/chapters/:chapterId/repair | 请求体新增 `userInstruction` | 用户修改方向文本 |

### 3.2 请求示例

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "reviewIssues": [],
  "userInstruction": "这段节奏太慢了，请加快节奏，删掉冗余的环境描写，保留对话推进"
}
```

## 4. 数据模型

无数据库变更。`userInstruction` 仅作为请求参数传递，不持久化。

## 5. 异常处理

| 错误码 | 场景 | 处理方式 |
| ---- | ---- | ---- |
| 400 | `userInstruction` 为空字符串 | 返回验证错误"请输入修改方向" |
| 400 | `userInstruction` 超过 2000 字 | 返回验证错误"修改方向不超过 2000 字" |
| 500 | heavy_repair LLM 调用失败 | SSE 输出错误帧，客户端显示错误提示 |

## 6. 验证策略

1. 类型检查：`pnpm typecheck` 通过
2. 单元测试：验证 `userInstruction` 存在时跳过 patch 直接走 heavy_repair
3. 手动验证：在章节审计面板输入修改方向，确认 SSE 修复流正常运行
4. 回归验证：现有三种修复方案行为不变
