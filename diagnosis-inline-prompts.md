# 内联 Prompt 诊断报告

> 诊断日期：2026-07-09
> 扫描范围：`server/src/` 和 `client/src/` 全部 `.ts`/`.tsx` 文件
> 目的：找出代码中直接嵌入大段 AI/LLM prompt 文本的情况，为后续提取为独立文件做准备

---

## 1. 统计总览

| 分类 | 数量 | 说明 |
|------|------|------|
| **已管理**（通过 Prompt Registry） | ~90+ | `server/src/prompting/prompts/` 目录下的 prompt，已实现为 PromptAsset |
| **待提取**（直接内联在 service/graph/agent 文件中） | **14 处**（涉及 8 个文件） | 需要迁移至 Prompt Registry |
| **忽略**（短指令/探测/错误消息） | ~15 处 | 连接探测、错误回退、短 probe 消息等 |

### 客户端情况

`client/src/` 中 **未发现** 内联 AI prompt。客户端仅通过 `systemPrompt` 状态变量将用户输入的 prompt 透传到 API 调用，本身不内嵌 prompt 文本。

---

## 2. 待提取 Prompt 详细清单

### 2.1 `server/src/graphs/novelOutlineGraph.ts` — 小说大纲图（4 组 prompt）

| 行号 | 变量/位置 | 大约行数 | 用途 | 是否含变量 |
|------|-----------|----------|------|-----------|
| 32-39 | `analyzeTheme()` 内联 | ~8 行 | system + user：主题分析 | 是（novelTitle, novelDescription, genre, characters） |
| 51-56 | `designConflicts()` 内联 | ~6 行 | system + user：冲突设计 | 是（themeAnalysis） |
| 68-77 | `generateOutline()` 内联 | ~10 行 | system + user：发展走向生成 | 是（themeAnalysis, conflictDesign） |
| 89-94 | `structureOutline()` 内联 | ~6 行 | system + user：大纲结构化 | 是（outline） |

- **所属模块**：`graphs`（LangGraph 图编排）
- **合计**：~30 行 prompt 文本
- **管理状态**：**未通过 Prompt Registry 管理**，直接 `new SystemMessage()` / `new HumanMessage()`

### 2.2 `server/src/graphs/writingFormulaGraph.ts` — 写作公式图（3 组 prompt）

| 行号 | 变量/位置 | 大约行数 | 用途 | 是否含变量 |
|------|-----------|----------|------|-----------|
| 29 | `analyzeStyle()` 内联 | ~1 行 | system：风格分析 | 否 |
| 42-46 | `extractTechniques()` 内联 | ~5 行 | system + user：技巧提取 | 是（styleAnalysis, focusAreas） |
| 59-71 | `buildFormula()` 内联 | ~13 行 | system + user：公式文档构建 | 是（styleAnalysis, techniqueExtraction） |

- **所属模块**：`graphs`（LangGraph 图编排）
- **合计**：~19 行 prompt 文本

### 2.3 `server/src/graphs/worldBuildingGraph.ts` — 世界构建图（10 组 prompt）

| 行号 | 节点函数 | 大约行数 | 用途 |
|------|----------|----------|------|
| 45 | `seedNode()` | ~1 行 | 种子转描述（英文） |
| 61-66 | `axiomNode()` | ~6 行 | 公理生成（含真实世界规则约束） |
| 82 | `foundationNode()` | ~1 行 | 背景/地理 |
| 102-104 | `powerNode()` | ~3 行 | 魔法/科技 |
| 126 | `societyNode()` | ~1 行 | 种族/政治 |
| 147 | `cultureNode()` | ~1 行 | 文化/宗教 |
| 167 | `historyNode()` | ~1 行 | 历史时间线 |
| 184 | `conflictNode()` | ~1 行 | 冲突/张力 |
| 201 | `consistencyNode()` | ~1 行 | 一致性审计 |
| 220 | `summaryNode()` | ~1 行 | 世界总结 |

- **所属模块**：`graphs`（LangGraph 图编排）
- **合计**：~17 行 prompt 文本（多数较短）

### 2.4 `server/src/agents/planner/intentPromptSupport.ts` — 意图解析器（2 个大 prompt）

| 行号 | 变量名 | 大约行数 | 用途 | 是否含变量 |
|------|--------|----------|------|-----------|
| 279-309 | `systemPrompt` | **~30 行** | 意图解析系统指令（含 30+ 条行为规则） | 否（纯指令） |
| 310-323 | `userPrompt` | ~13 行 | 意图解析用户上下文 | 是（goal, contextMode, novelId, recentMessages, semanticCatalog 等） |

- **所属模块**：`agents`（Agent 目录）
- **合计**：~43 行 prompt 文本
- **注意**：这是目前最大的单体内联 prompt，systemPrompt 约 1500 字符，包含大量业务规则

### 2.5 `server/src/llm/structuredInvokeRepair.ts` — JSON 修复器（1 组 prompt）

| 行号 | 变量名 | 大约行数 | 用途 | 是否含变量 |
|------|--------|----------|------|-----------|
| 162-175 | `repairSystem` | ~13 行 | JSON 修复系统指令 | 否（纯指令） |
| 180-199 | `repairHuman` | ~19 行 | 修复上下文 | 是（validationError, rawContent, repairAttempt） |

- **所属模块**：`llm`（LLM 基础设施层）
- **合计**：~32 行 prompt 文本

### 2.6 `server/src/routes/chat.ts` — 聊天路由默认 prompt（1 组 prompt）

| 行号 | 变量名 | 大约行数 | 用途 | 是否含变量 |
|------|--------|----------|------|-----------|
| 168-184 | `systemPrompt` + `finalSystemPrompt` | ~17 行 | 聊天默认系统提示 + agent 模式扩展 | 部分（body.systemPrompt 覆盖） |

- **所属模块**：`routes`（HTTP 路由）
- **合计**：~17 行 prompt 文本

### 2.7 `server/src/services/novel/novelCoreCharacterService.ts` — 角色信息提取（1 组大 prompt）

| 行号 | 变量名 | 大约行数 | 用途 | 是否含变量 |
|------|--------|----------|------|-----------|
| 385-412 | `systemPrompt` | **~27 行** | 从大纲提取角色与关系 | 否（纯指令 + 字段说明） |
| 414 | `userPrompt` | ~3 行 | 素材文本注入 | 是（outlineText） |

- **所属模块**：`services/novel`
- **合计**：~30 行 prompt 文本
- **注意**：直接调用 `invokeStructuredLlm`，违反 Prompt Governance 规则

### 2.8 `server/src/services/novel/characterPrep/characterPreparationSupplemental.ts` — 补充角色校验/修正/微调（3 组 prompt）

| 行号 | 变量名 | 大约行数 | 用途 | 是否含变量 |
|------|--------|----------|------|-----------|
| 409 | `systemPrompt`（名字提取） | ~1 行 | 从候选文本提取人名 | 否 |
| 410-416 | `userPrompt`（名字提取） | ~6 行 | 候选角色文本 | 是（normalizedCandidates） |
| 432-444 | `systemPrompt`（人名修正） | ~13 行 | 修正幻觉人名 | 是（validNames, allInvalid） |
| 632-641 | `systemPrompt`（角色微调） | ~10 行 | 角色微调编辑 | 否（纯指令） |
| 643-651 | `userPrompt`（角色微调） | ~9 行 | 微调上下文 | 是（candidate, adjustment） |

- **所属模块**：`services/novel/characterPrep`
- **合计**：~39 行 prompt 文本
- **注意**：直接调用 `invokeStructuredLlm`，违反 Prompt Governance 规则

### 2.9 `server/src/services/novel/volume/volumeBeatSheetGeneration.ts` — 节奏板重试指引

| 行号 | 变量名 | 大约行数 | 用途 | 是否含变量 |
|------|--------|----------|------|-----------|
| 241-247 | `retryGuidance` | ~6 行 | 节奏板结构保持约束追加 | 是（validation.violations） |

- **所属模块**：`services/novel/volume`
- **合计**：~6 行 prompt 文本
- **注意**：动态追加到已有 prompt 的 guidance 参数中，非完全独立 prompt

### 2.10 `server/src/services/world/worldReferenceInspiration.ts` — 参考灵感重试提示

| 行号 | 变量名 | 大约行数 | 用途 | 是否含变量 |
|------|--------|----------|------|-----------|
| 197-202 | `retryPrompt` | ~6 行 | 参考作品灵感重试区分指引 | 是（追加到 buildPrompt 结果） |

- **所属模块**：`services/world`
- **合计**：~6 行 prompt 文本
- **注意**：动态追加到已有 prompt 的 userPrompt 参数中

---

## 3. 按模块分组汇总

| 模块 | 文件数 | prompt 组数 | 总行数 | 优先级 |
|------|--------|-------------|--------|--------|
| `graphs/`（LangGraph 图编排） | 3 | 17 | ~66 行 | **高** |
| `agents/planner/`（Agent 目录） | 1 | 2 | ~43 行 | **高** |
| `llm/`（LLM 基础设施） | 1 | 1 | ~32 行 | **中** |
| `routes/`（HTTP 路由） | 1 | 1 | ~17 行 | **中** |
| `services/novel/`（业务服务） | 2 | 4 | ~69 行 | **高** |
| `services/world/`（世界观服务） | 1 | 1 | ~6 行 | **低** |
| **合计** | **9 个文件** | **~26 组** | **~233 行** | — |

---

## 4. 忽略项（不需提取）

| 文件 | 行号 | 内容 | 原因 |
|------|------|------|------|
| `llm/connectivity.ts:127` | 127 | `new HumanMessage("请只回复 ok")` | 连通性探测，1 行 |
| `llm/connectivity.ts:197` | 197 | `new SystemMessage("你正在执行结构化输出兼容性探针...")` | 结构化输出探测，1 行 |
| `llm/connectivity.ts:198` | 198 | `new HumanMessage("请输出一个 JSON 对象...")` | 结构化输出探测，1 行 |
| `routes/chat.ts:132` | 132 | `"请根据当前上下文给出写作建议。"` | agent 启动默认 goal，1 行 |
| `routes/chat.ts:188` | 188 | `"\n提示：联网检索能力当前为预留状态..."` | 搜索提示，1 行 |
| `novelCoreGenerationService.ts:83` | 83 | `"本书世界上下文：暂无。请根据小说基础信息推进..."` | 上下文缺失回退，1 行 |
| `AuditService.ts:205` | 205 | `"请根据上下文修复该问题。"` | 审计修复默认建议，1 行 |
| `client/src/` 所有文件 | — | — | 无内联 prompt |

---

## 5. 提取为 YAML 的建议格式

建议采用与现有 `server/src/prompting/prompts/` 一致的 PromptAsset 模式：

```yaml
# 示例：novelOutlineGraph.themeAnalysis.yaml
id: graph.novelOutline.themeAnalysis
version: "1"
type: structured
system: |
  你是一位小说主题分析专家，请提炼主题和立意。
user: |
  标题：{{novelTitle}}
  简介：{{novelDescription}}
  类型：{{genre}}
  角色：{{characters}}
  请输出主题分析。
variables:
  - novelTitle
  - novelDescription
  - genre
  - characters
taskType: planner
temperature: 0.4
```

对于含复杂逻辑的 prompt（如意图解析器），可采用多段式结构：

```yaml
# 示例：plannerIntent.yaml
id: agent.planner.intent
version: "1"
type: structured
systemLines:
  - "创作中枢默认是协作式创作搭档，不是命令路由器。"
  - "你必须在 JSON 中显式返回 interactionMode..."
  # ... 其余规则
userTemplate: |
  当前目标: {{goal}}
  上下文模式: {{contextMode}}
  # ...
variables:
  - goal
  - contextMode
  - novelId
  - recentMessages
  - semanticCatalog
  - workflowRecipes
  - toolCatalog
  - permissionSummary
taskType: planner
temperature: 0.2
```

对于 LangGraph 图中短 prompt（<3 行），可考虑统一注册为轻量 PromptAsset，也可以保持 inline 但添加注释标注。

---

## 6. 预估工作量

| 工作项 | 预估耗时 | 说明 |
|--------|----------|------|
| **A. 大 prompt 提取**（6 组核心 prompt） | 3-4 小时 | intentPromptSupport (2), novelCoreCharacterService (1), characterPreparationSupplemental (3) |
| **B. Graph prompt 提取**（3 个图文件） | 2-3 小时 | novelOutlineGraph (4组), writingFormulaGraph (3组), worldBuildingGraph (10组) |
| **C. LLM/Route 层 prompt 提取** | 1-2 小时 | structuredInvokeRepair (1组), chat.ts (1组) |
| **D. 测试与验证** | 1-2 小时 | 确保提取后行为一致，运行相关测试 |
| **E. 小 prompt 收敛**（volumeBeatSheet, worldReferenceInspiration 等） | 0.5-1 小时 | 动态追加型 prompt，需设计追加机制 |
| **总计** | **8-12 小时** | 约 1.5-2 个工作日 |

### 建议分批执行顺序

1. **第一批**（高价值 + 高违规）：`agents/planner/intentPromptSupport.ts` 和 `services/novel/novelCoreCharacterService.ts` — 这两处直接违反 Prompt Governance 规则，且 prompt 体量大
2. **第二批**（graph 模块统一迁移）：`graphs/` 下 3 个文件的全部 prompt
3. **第三批**（剩余 service 层）：`characterPreparationSupplemental.ts`、`structuredInvokeRepair.ts`、`routes/chat.ts`
4. **第四批**（追加型 prompt 收敛）：动态拼接的短指令

---

## 7. 关键发现

1. **Prompt Governance 违规**：`novelCoreCharacterService.ts` 和 `characterPreparationSupplemental.ts` 直接调用 `invokeStructuredLlm` 并内联 systemPrompt/userPrompt，明确违反项目约定（`prompting/AGENTS.md` 和 `prompting/README.md` 均有禁止条款）
2. **Graph 模块完全未纳入 Prompt Registry**：`graphs/` 目录下 3 个 LangGraph 图文件包含 17 组 prompt，全部使用 `new SystemMessage()` / `new HumanMessage()` 直接构建
3. **意图解析器 prompt 最大最复杂**：`intentPromptSupport.ts` 的 systemPrompt 约 1500 字符、30 行规则，是整个项目中最大的单体内联 prompt
4. **JSON 修复器 prompt 是基础设施级**：`structuredInvokeRepair.ts` 的修复 prompt 被所有结构化 LLM 调用共享，提取后收益最大
5. **客户端完全干净**：`client/src/` 无任何内联 prompt，所有 prompt 逻辑集中在服务端
