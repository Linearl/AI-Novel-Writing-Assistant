---
description: "REQ-2029 方案设计"
---

# REQ-2029 方案设计 — Creative Hub 叙事讨论通道

## 1. 方案概述

在现有 Creative Hub 意图分类 + workflow + answer composer 架构内扩展，新增 `narrative_advisor` 意图。该意图识别用户的宏观创作讨论意图，组合调用只读分析工具，将工具结果与创作上下文一起送入叙事分析 prompt，生成有数据支撑的创作建议。

核心原则：**复用现有链路，最小侵入，只读安全**。

### 1.1 设计目标

1. 在 `coordinator_plan → tool_execute → answer_finalize` 全链路内完成，不引入新的执行路径
2. `narrative_advisor` 意图下仅允许 `read`/`inspect` 类别工具，从架构层面保证不触发写入
3. 创作上下文注入控制在合理 token 预算内（摘要级，非全文）

### 1.2 关键决策

1. **新增意图而非扩展现有 `general_chat`**：`general_chat` 已被广泛使用，改变其行为影响面大；新增独立意图，通过 `normalizeIntentPayload()` 的 reclassification 逻辑从 `general_chat` 重定向
2. **workflow 动态选择工具**：不为每种话题硬编码工具组合，而是在 workflow resolve 中根据意图携带的话题特征动态选择，保持扩展性
3. **answer composer 新增分支而非复用 fallback**：fallback 是通用 LLM 调用，缺少上下文注入能力；专用分支可精确组装分析 prompt

### 1.3 不在范围

- 不新增高级分析工具（节奏曲线、角色弧光、主题一致性），后续迭代
- 不改变 `general_chat` 行为
- 不新增前端 UI

## 2. 实现细节

### 2.1 后端 — 意图定义层

**文件：`server/src/agents/planner/intentPromptSupport.ts`**

1. `INTENT_NAMES` 枚举新增 `narrative_advisor`
2. `intentSchema` 的 `intent` 字段自动包含新值（Zod enum 从 `INTENT_NAMES` 推导）
3. `buildPlannerIntentPromptParts()` 的 system prompt 新增识别规则：
   ```
   当用户在讨论小说的叙事要素（节奏、角色弧光、主题、伏笔、卷间关系、
   整体结构）并寻求分析或建议时，使用 narrative_advisor。
   narrative_advisor 适用于"帮我分析..."、"节奏太慢"、"角色不自然"等
   宏观创作讨论场景，区别于 general_chat（闲聊、无关话题）。
   ```
4. 系统 prompt 新增强制规则：`narrative_advisor` 的 `interactionMode` 必须为 `"review"`，`assistantResponse` 必须为 `"explain"`

**文件：`server/src/agents/planner/utils.ts`**

5. `INTENT_ALIAS_MAP` 新增别名映射：
   - `narrative_analysis` → `narrative_advisor`
   - `creative_analysis` → `narrative_advisor`
   - `story_analysis` → `narrative_advisor`
   - `叙事分析` → `narrative_advisor`
   - `创作分析` → `narrative_advisor`
   - `节奏分析` → `narrative_advisor`

6. `normalizeIntentPayload()` 新增 reclassification 逻辑：当意图被分类为 `general_chat` 但 goal 包含叙事讨论特征词（节奏、弧光、伏笔、主题、动机、高潮、结构分析等），重定向为 `narrative_advisor`

### 2.2 后端 — Workflow 层

**新文件：`server/src/prompting/workflows/narrativeAdvisorWorkflowDefinition.ts`**

```typescript
// 伪代码结构
export const narrativeAdvisorWorkflowDefinition: WorkflowDefinition = {
  id: "narrative_advisor",
  intent: "narrative_advisor",
  kind: "single",
  resolve: (intent, context) => {
    const actions: PlannedToolCall[] = [];
    
    // 1. 始终加载小说全貌
    actions.push({ tool: "get_novel_context", input: { novelId: context.novelId } });
    
    // 2. 根据话题特征动态选择工具
    if (matchesTopic(intent.goal, ["节奏", "结构", "章节", "卷"])) {
      actions.push({ tool: "summarize_chapter_range", input: { novelId, range: "recent_10" } });
    }
    if (matchesTopic(intent.goal, ["角色", "人物", "动机", "弧光"])) {
      actions.push({ tool: "get_character_states", input: { novelId } });
    }
    if (matchesTopic(intent.goal, ["世界", "设定", "规则"])) {
      actions.push({ tool: "get_world_constraints", input: { novelId } });
    }
    if (matchesTopic(intent.goal, ["伏笔", "时间", "一致性"])) {
      actions.push({ tool: "get_timeline_facts", input: { novelId } });
    }
    if (matchesTopic(intent.goal, ["主题", "风格"])) {
      actions.push({ tool: "get_story_bible", input: { novelId } });
    }
    
    // 3. 通用兜底：如果没匹配到特定话题，至少加载小说上下文 + RAG 搜索
    if (actions.length === 1) {
      actions.push({ tool: "search_knowledge", input: { novelId, query: intent.goal } });
    }
    
    return actions;
  },
};
```

**文件：`server/src/prompting/workflows/workflowRegistry.ts`**

7. 在 workflow 注册表中导入并注册 `narrativeAdvisorWorkflowDefinition`

### 2.3 后端 — Prompt 层

**新文件：`server/src/prompting/prompts/narrative/narrativeAdvisorAnalysisPrompt.ts`**

8. 新建 `PromptAsset`，包含 system prompt 和 user prompt 模板：

**System Prompt 核心指令**：
- 角色：你是一位资深小说叙事顾问
- 任务：基于提供的创作数据和用户问题，给出专业的叙事分析
- 输出结构：问题诊断 → 数据依据（引用具体章节/角色）→ 修改建议 → 注意事项
- 约束：所有分析必须基于提供的工具返回数据，不得臆造情节；建议应具体可操作

**User Prompt 模板**：
```
## 创作上下文
{创作上下文摘要}

## 工具查询结果
{各工具返回结果}

## 用户问题
{用户原始问题}

## 分析要求
基于以上数据，给出专业的叙事分析。引用具体章节和角色，给出可操作的修改建议。
```

**文件：`server/src/prompting/core/registry.ts`**

9. 在 PromptAsset 注册表中注册新 prompt

### 2.4 后端 — Answer Composer

**文件：`server/src/creativeHub/answerComposer.ts`**

10. `composeAssistantMessage()` 中新增 `narrative_advisor` 分支：

```typescript
if (intent.intent === "narrative_advisor") {
  return composeNarrativeAdvisorAnswer(intent, toolResults, context);
}
```

11. `composeNarrativeAdvisorAnswer()` 函数：
- 从 `DirectorWorkspaceInventory` 提取创作上下文摘要
- 将工具返回结果格式化
- 调用 `narrativeAdvisorAnalysisPrompt` 生成分析
- 返回结构化分析结果

### 2.5 后端 — 权限与安全

**文件：`server/src/agents/approvalPolicy.ts`**

12. 在 Planner agent 的工具权限矩阵中，`narrative_advisor` 意图仅允许：
   - `read` 类别工具：`get_novel_context`, `list_chapters`, `get_chapter_by_order`, `get_chapter_content`, `get_chapter_content_by_order`, `get_story_bible`, `get_character_states`, `list_worlds`, `get_world_detail`, `list_base_characters`, `get_base_character_detail`, `list_knowledge_documents`, `get_knowledge_document_detail`
   - `inspect` 类别工具：`summarize_chapter_range`, `get_timeline_facts`, `get_world_constraints`, `search_knowledge`, `audit_chapter_continuity`, `analyze_quality_debt_attribution`
   - 禁止所有 `mutate` 和 `run` 类别工具

**硬性安全约束**：在 `compileIntentToPlan()` 或 `toPlannedActions()` 中，当 intent 为 `narrative_advisor` 时，过滤掉所有非 `read`/`inspect` 工具，即使 LLM 误生成了写入工具调用。

## 3. 接口定义

不涉及。无新增 API 接口。

## 4. 数据模型

不涉及。无数据库 schema 变更。

## 5. 异常处理

| 错误码 | 场景 | 处理方式 |
| ---- | ---- | ---- |
| 无小说绑定 | `narrative_advisor` 但用户未绑定小说 | 提示用户先选择小说工作区，走协作回答 |
| 工具调用失败 | 某个只读工具执行失败 | 跳过该工具结果，用其他工具结果继续分析 |
| LLM 分析生成失败 | 叙事分析 prompt 调用失败 | 降级为 `composeFallbackAnswer()`，给出通用回复 |

## 6. 验证策略

1. `pnpm typecheck` — 类型检查通过
2. `pnpm --filter @ai-novel/server test:planner` — 意图分类测试通过
3. 手动验证：启动 `pnpm dev`，在 Creative Hub 中发送以下测试消息：
   - "第三幕节奏太慢了，要不要把冲突提前？" → 应被分类为 `narrative_advisor`
   - "这个角色的动机转变不够自然" → 应被分类为 `narrative_advisor`
   - "你好" → 应仍被分类为 `social_opening`
   - "创建一本新小说" → 应仍被分类为 `create_novel`
4. 回复质量检查：确认分析回复引用了实际的小说数据，非 LLM 臆造
