---
description: "REQ-2029 任务拆解（复杂版）"
---

# REQ-2029 任务拆解

> 状态：✅ 全部完成
> 模板类型：**复杂版** — 跨模块、多文件任务

## 任务概述

### 1. 来源

上游 issue — Creative Hub 缺少宏观创作讨论能力。现有 30 个意图均为操作型，缺少分析型意图，导致叙事讨论被吞进 `general_chat`，无法携带创作上下文和调用只读工具。

### 2. 问题

`general_chat` 的 workflow 返回零工具动作，LLM 没有素材做叙事分析。用户讨论节奏、角色弧光、主题等宏观创作问题时，只能得到通用协作反问。

### 3. 需求

- 新增 `narrative_advisor` 意图 + workflow + prompt + answer composer 分支
- 复用现有只读分析工具，不新增高级分析工具
- 从架构层面保证只读安全

### 4. 验收标准

> 见 [REQ-2029.md](./REQ-2029.md) 第 4 节。

## 里程碑

- **M1**：意图定义 + workflow + 权限（T1-T3）— 数据通路打通
- **M2**：Prompt + Answer Composer（T4-T5）— 分析能力闭环
- **M3**：集成验证（T6）— 端到端可用

---

## 任务清单

| # | 任务 | 优先级 | 预估 | 依赖 | 产物 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | 意图定义 — 新增 `narrative_advisor` 枚举 + prompt + 别名 | P0 | 30min | — | intentPromptSupport.ts, utils.ts 修改 | ✅ 已完成 |
| T2 | Workflow — 新建 narrativeAdvisorWorkflowDefinition | P0 | 30min | T1 | narrativeAdvisorWorkflowDefinition.ts + registry 注册 | ✅ 已完成 |
| T3 | 权限 — approvalPolicy.ts 只读安全约束 | P0 | 15min | T1 | approvalPolicy.ts + RunExecutionService.ts 修改 | ✅ 已完成 |
| T4 | Prompt — 新建叙事分析 PromptAsset | P1 | 30min | — | narrativeAdvisorAnalysisPrompt.ts + registry 注册 | ✅ 已完成 |
| T5 | Answer Composer — 新增 advisor 分支 | P1 | 30min | T2, T4 | answerComposer.ts 修改 | ✅ 已完成 |
| T6 | 集成验证 — 类型检查 + 测试 + 手动 E2E | P1 | 30min | T1-T5 | 类型检查 + 1110 测试通过 | ✅ 已完成 |

---

## 逐项展开

### T1: 意图定义层

**目标**: 在意图分类系统中注册 `narrative_advisor`，使 LLM 能正确识别叙事讨论类消息。

**改动点**:
- `server/src/agents/planner/intentPromptSupport.ts`:
  - `INTENT_NAMES` 枚举新增 `narrative_advisor`
  - `buildPlannerIntentPromptParts()` system prompt 新增识别规则段落
  - system prompt 新增 `narrative_advisor` 的 interactionMode 强制规则
- `server/src/agents/planner/utils.ts`:
  - `INTENT_ALIAS_MAP` 新增 6 个别名映射
  - `normalizeIntentPayload()` 新增 reclassification 逻辑（general_chat → narrative_advisor）

### T2: Workflow 定义

**目标**: 定义 `narrative_advisor` 的工具调用策略，动态组合只读分析工具。

**改动点**:
- 新建 `server/src/prompting/workflows/narrativeAdvisorWorkflowDefinition.ts`
- `server/src/prompting/workflows/workflowRegistry.ts`: 导入并注册新 workflow

**关键设计**:
- `resolve()` 函数根据 intent.goal 的话题特征动态选择工具
- 始终包含 `get_novel_context` 作为基础上下文
- 话题匹配使用简单的关键词覆盖（节奏/结构/卷 → summarize_chapter_range；角色/人物/动机 → get_character_states 等）

### T3: 权限安全

**目标**: 从架构层面保证 `narrative_advisor` 只能调用只读工具。

**改动点**:
- `server/src/agents/approvalPolicy.ts`: Planner agent 的 `narrative_advisor` 意图工具白名单
- `server/src/agents/orchestrator.ts` 或 `server/src/agents/tools/toolTypes.ts`: 在 `compileIntentToPlan()` 或 `toPlannedActions()` 中增加意图级工具过滤

### T4: 叙事分析 Prompt

**目标**: 创建专业的叙事分析 prompt，指导 LLM 基于真实数据生成分析建议。

**改动点**:
- 新建 `server/src/prompting/prompts/narrative/narrativeAdvisorAnalysisPrompt.ts`
- `server/src/prompting/core/registry.ts`: 注册新 PromptAsset

**Prompt 核心结构**:
- System: 资深小说叙事顾问角色 + 输出结构（诊断→依据→建议→注意事项）+ 约束（基于数据不臆造）
- User: 创作上下文 + 工具结果 + 用户问题

### T5: Answer Composer 分支

**目标**: 将工具执行结果与创作上下文组装为叙事分析 prompt，调用 LLM 生成回复。

**改动点**:
- `server/src/creativeHub/answerComposer.ts`:
  - `composeAssistantMessage()` 新增 `narrative_advisor` 条件分支
  - 新增 `composeNarrativeAdvisorAnswer()` 函数

### T6: 集成验证

**目标**: 端到端验证全链路可用。

**验证步骤**:
1. `pnpm typecheck` — 无新增类型错误
2. `pnpm --filter @ai-novel/server test:planner` — 意图分类测试通过
3. `pnpm test` — 全量 server 测试通过
4. 手动 E2E（`pnpm dev`）：
   - 发送"第三幕节奏太慢了" → 确认分类为 `narrative_advisor`
   - 发送"这个角色的动机不自然" → 确认分类为 `narrative_advisor`
   - 发送"你好" → 确认仍为 `social_opening`
   - 发送"创建一本新书" → 确认仍为 `create_novel`
   - 检查 narrative_advisor 回复是否引用了实际小说数据

---

## 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
| --- | --- | --- | --- |
| 意图分类准确度不足 | 叙事讨论被误分为 general_chat | 中 | normalizeIntentPayload reclassification + prompt 强化 |
| 工具结果 token 超限 | 上下文注入量过大导致 LLM 截断 | 低 | summarize_chapter_range 限制范围，卷结构只注入摘要 |
| fallback 降级影响体验 | 分析 prompt 调用失败时回复质量差 | 低 | 降级为 composeFallbackAnswer，保证有回复 |

---

## DoD（Definition of Done）

- `narrative_advisor` 意图可被正确识别
- 分析回复引用实际小说数据
- 只读安全保证：不调用任何写入工具
- `general_chat` 行为不受影响
- 类型检查 + 全量测试通过

---

## 依赖

- 前置依赖：无
- 关联依赖：无
- 后继依赖：高级叙事分析工具（节奏曲线、角色弧光等）可作为后续迭代

---

## 验证步骤

1. `pnpm typecheck` 通过
2. `pnpm --filter @ai-novel/server test:planner` 通过
3. `pnpm test` 全量通过
4. 手动 E2E：`pnpm dev` → Creative Hub → 发送叙事讨论消息 → 确认分类和回复质量

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |

---

## 当前门禁

- [ ] 待激活
- [ ] 待创建双副本
- [ ] 待启动 M1

---

## 完成判定

- 所有里程碑达成、DoD 全部满足后，REQ-2029 达到"已完成"状态。
