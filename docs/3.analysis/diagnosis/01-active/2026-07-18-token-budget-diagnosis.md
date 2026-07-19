---
description: "2026-07-18 Token 预算控制系统全面诊断"
update_time: 2026-07-18
---
# Token 预算控制系统诊断报告

> **诊断日期**：2026-07-18
> **诊断范围**：`server/src/prompting/` + `server/src/llm/` + `server/src/orchestration/`
> **严重程度**：HIGH（CJK 估算偏差影响全局生成质量）

---

## 1. 概述

项目有两套独立的 token 控制机制：

| 机制 | 控制什么 | 配置位置 |
| --- | --- | --- |
| **INPUT 上下文预算** | prompt 中能装多少 context block | `NOVEL_PROMPT_BUDGETS` → `ContextPolicy.maxTokensBudget` |
| **OUTPUT 输出上限** | LLM 最多生成多少 token | model route 配置 → `maxTokens` 参数 |

两者完全独立，无联动关系。

---

## 2. INPUT 上下文预算

### 2.1 全局预算值

`server/src/prompting/prompts/novel/promptBudgetProfiles.ts` 定义了 **27 个命名预算常量**：

| 预算键 | tokens | 使用者 |
| --- | --- | --- |
| `directorCandidates` | 1,200 | 导演候选方案 |
| `directorCandidatePatch` | 1,200 | 候选方案修补 |
| `directorBookContract` | 1,400 | 书级创作约定 |
| `directorBlueprint` | 2,400 | 蓝图 |
| `storyMacroDecomposition` | 1,800 | 故事宏观规划 |
| `storyMacroFieldRegeneration` | 1,600 | 宏观规划字段重生成 |
| `volumeStrategy` | 1,800 | 卷战略 |
| `volumeStrategyCritique` | 1,800 | 卷战略审校 |
| `volumeSkeleton` | 2,000 | 卷骨架 |
| `volumeBeatSheet` | 1,600 | 节拍表 |
| `volumeChapterList` | 1,600 | 章节列表 |
| `volumeChapterDetail` | 1,600 | 章节详写 |
| `volumeRebalance` | 1,600 | 再平衡 |
| `chapterWriter` | 2,600 | 章节写作 |
| `chapterAcceptance` | 1,200 | 章节验收 |
| `chapterArtifactDelta` | 1,400 | 产出物增量 |
| `chapterEditorWorkspaceDiagnosis` | 1,400 | 编辑器诊断 |
| `chapterEditorUserIntent` | 900 | 编辑器意图识别 |
| `chapterEditorRewrite` | 5,000 | 编辑器重写 |
| `chapterLightAudit` | 900 | 轻量审计 |
| `chapterReview` | 2,600 | 章节审校 |
| `chapterRepair` | 2,200 | 章节修复 |
| `chapterSummary` | 1,000 | 章节摘要 |
| `chapterCompress` | 2,600 | 章节压缩（**孤儿键**） |
| `chapterExpand` | 2,600 | 章节扩展（**孤儿键**） |
| `waterContentDetection` | 2,600 | 注水检测（**孤儿键**） |
| `globalReview` | 30,000 | 全局审校（**孤儿键**） |

### 2.2 运行时预算配置

`RUNTIME_PROMPT_BUDGET_PROFILES` 为 6 个 prompt 定义了运行时上下文选择策略：

| promptId | 预算 | preferredGroups 数量 |
| --- | --- | --- |
| `novel.chapter.writer` | 2,600 | 13 |
| `novel.chapter.acceptance_assessment` | 1,200 | 6 |
| `novel.chapter.artifact_delta.extract` | 1,400 | 5 |
| `audit.chapter.light` | 900 | 4 |
| `audit.chapter.full` | 2,600 | 5 |
| `novel.review.repair` | 2,200 | 7 |

### 2.3 预算利用率估算

基于典型中文小说内容的 context block 大小：

| prompt | 预算 | 估算实际 tokens | 利用率 | 状态 |
| --- | --- | --- | --- | --- |
| `volume.chapter_list` | 1,600 | ~1,500 | 94% | ⚠️ 紧张 |
| `volume.chapter_detail` | 1,600 | ~1,700 | 106% | 🔴 溢出 |
| `audit.chapter.light` | 900 | ~1,450 | 161% | 🔴 严重溢出 |
| `chapter.acceptance` | 1,200 | ~1,100 | 92% | ⚠️ 紧张 |
| `chapter.writer` | 2,600 | ~2,700 | 104% | 🔴 溢出 |
| `volume.strategy` | 1,800 | ~1,100 | 61% | ✅ |
| `volume.beat_sheet` | 1,600 | ~1,300 | 81% | ✅ |
| `audit.global.review` | 30,000 | ~4,000+ | 13% | ✅ 过于宽裕 |
| `chapter_editor.rewrite` | 5,000 | ~1,000 | 20% | ✅ 过于宽裕 |

---

## 3. OUTPUT 输出上限

### 3.1 解析链路

```
caller.maxTokens
  → modelRouter.resolveModel(): DB ModelRouteConfig 或 DEFAULT_ROUTES
  → normalizeMaxTokens(provider, maxTokens):
      undefined/NaN/<=0 → undefined（使用 provider 默认值）
      4096 → undefined（历史占位符，被静默忽略）
  → LLM client: 由 provider API 决定
```

### 3.2 各 Provider 默认值

| Provider | 硬编码 maxTokens | 说明 |
| --- | --- | --- |
| DeepSeek | 8,192 | `providers.ts` 中定义 |
| Anthropic | 4,096（fallback） | `anthropicClient.ts:157`，仅直连路径 |
| OpenAI | 无（API 默认） | |
| 其他 | 无（API 默认） | |

### 3.3 关键发现

**整个小说生产管线（story_macro → book_contract → volume_strategy → chapter_writer → chapter_review → chapter_repair）没有定义显式 output maxTokens。** 所有步骤都依赖 provider 默认值。

只有 **Style Engine** 和 **主题一致性工具** 有硬编码的 output maxTokens：

| 步骤 | maxTokens | 位置 |
| --- | --- | --- |
| 风格提取 | 4,096 | `StyleProfileLlmService.ts` 常量 |
| 风格元数据 | 600 | 同上 |
| 反 AI 选择 | 500 | 同上 |
| 章节编辑 diff | 2,000 | `ChapterEditDiffService.ts` 硬编码 |
| 反 AI 规则生成 | 900 | `AntiAiRuleService.ts` 硬编码 |
| 主题分析 | 1,500 | `themeConsistencyTools.ts` 常量 |
| issue 生成 | 4,096 | `issueGenerator.ts` 硬编码 |

---

## 4. 关键问题

### 🔴 P1：CJK token 估算系统性偏低

**根因**：`contextBudget.ts` 的估算公式 `Math.ceil(text.length / 4)` 基于英文（1 token ≈ 4 字符），中文实际是 1 token ≈ 1-2 字符。

**影响**：

- 预算 2600 tokens 用 `/4` 公式认为能装 10400 字符，实际只能装 2600-5200 字符的中文内容
- 系统认为 context block 在预算内，实际已超出 LLM 输入窗口
- required 块强制加入时无溢出告警，导致静默超限

**项目已有正确实现**：`server/src/llm/repetition/tokenizer.ts` 中的 CJK-aware tokenizer 将每个中文字符计为 1 token，但预算系统未使用。

### 🔴 P2：两套 token 估算函数不一致

| 函数 | 位置 | 除数 | 使用者 |
| --- | --- | --- | --- |
| `estimateTextTokens` | contextBudget.ts | `/4` | 所有 prompt asset、context block、压缩 |
| `estimateContextTokens` | ContextBroker.ts | `/3` | ContextBroker normalizeBlock、MaterialExporter |

同一文本经不同路径处理会得到不同估算值。

### 🟡 P3：4 个孤儿预算键

`NOVEL_PROMPT_BUDGETS` 中的 `chapterCompress`、`chapterExpand`、`waterContentDetection`、`globalReview` 存在但未被对应 prompt 引用：

| 孤儿键 | 实际使用者 | 使用的预算 |
| --- | --- | --- |
| `chapterCompress` (2600) | `compressChapter.prompts.ts` | `chapterWriter` (2600) |
| `chapterExpand` (2600) | `expandChapter.prompts.ts` | `chapterWriter` (2600) |
| `waterContentDetection` (2600) | `waterContentDetection.prompts.ts` | `chapterReview` (2600) |
| `globalReview` (30000) | `audit.global.prompts.ts` | 硬编码 30000 |

值相同但引用错误，修改预算时会静默失效。

### 🟡 P4：5+ 个 prompt 硬编码预算未纳入管理

| prompt | 硬编码值 | 位置 |
| --- | --- | --- |
| `themeAnalysis` | 2,000 | `themeAnalysis.prompt.ts:59` |
| `audit.global.review` | 30,000 | `audit.global.prompts.ts:99` |
| `character.consistency.*` (2 个) | 8,000 | `characterConsistency.prompts.ts:39,91` |
| `feedback.issue.generation` | 8,000 | `issueGeneration.prompts.ts:77` |

### 🟡 P5：50+ 个 prompt 的预算为 0（无上下文过滤）

`maxTokensBudget: 0` 意味着所有 context block 直接通过，无压缩或丢弃。包括：character、style、world、writingFormula、bookAnalysis、agent runtime 等模块的全部 prompt。

### 🟡 P6：GenerationContextAssembler 硬编码 2600

`GenerationContextAssembler.ts:542` 硬编码 `2600` 而非引用 `NOVEL_PROMPT_BUDGETS.chapterWriter`，预算修改时会静默失效。

### 🔵 P7：无运行时预算溢出告警

- `selectContextBlocks` 强制加入 required 块后，`estimatedTokens` 超过 `maxTokensBudget` 时无日志、无告警
- telemetry 系统记录了 `estimatedInputTokens` 和 `tokenUsage.promptTokens`，但**从未比较两者**
- 唯一的日志是 `GenerationContextAssembler` 的 `logger.debug("[ctx-budget]", ...)`，生产环境不可见

### 🔵 P8：`normalizeMaxTokens` 静默吞掉 4096

`modelRouter.ts:178` 将 `maxTokens === 4096` 视为历史占位符，静默转为 `undefined`。这是隐式行为，容易误读。

---

## 5. 风险矩阵

| # | 风险 | 严重度 | 影响范围 | 紧迫度 |
| --- | --- | --- | --- | --- |
| P1 | CJK token 估算偏低 2-4x | 🔴 HIGH | 全局中文生成 | 高 |
| P2 | 两套估算函数不一致 | 🔴 HIGH | 所有 context block | 高 |
| P3 | 孤儿预算键 | 🟡 MEDIUM | 4 个 prompt | 中 |
| P4 | 硬编码预算 | 🟡 MEDIUM | 5 个 prompt | 中 |
| P5 | 零预算 prompt 无过滤 | 🟡 MEDIUM | 50+ prompt | 低（多数是轻量 prompt） |
| P6 | 硬编码 2600 | 🟡 MEDIUM | 1 处 | 中 |
| P7 | 无溢出告警 | 🔵 LOW | 运维可见性 | 低 |
| P8 | 4096 静默吞掉 | 🔵 LOW | maxTokens 解析 | 低 |

---

## 6. 建议

### 短期（可纳入现有任务包）

1. **修复 CJK 估算**：将 `estimateTextTokens` 改为 CJK-aware，检测中文字符比例，>50% CJK 时用 `/2` 替代 `/4`
2. **统一估算函数**：将 `estimateContextTokens`（ContextBroker）合并到 `estimateTextTokens`，消除 `/3` vs `/4` 分歧
3. **修复孤儿键引用**：4 个文件的预算引用改为对应命名键
4. **修复硬编码**：`GenerationContextAssembler.ts:542` 改为引用 `NOVEL_PROMPT_BUDGETS.chapterWriter`

### 中期

5. **添加预算溢出日志**：`selectContextBlocks` 返回时检查 `estimatedTokens > maxTokensBudget`，输出 info 级日志
6. **添加估算-实际对比**：LLM 调用后比较 `estimatedInputTokens` 和 `tokenUsage.promptTokens`，积累校准数据
7. **将硬编码预算纳入管理**：`themeAnalysis`、`characterConsistency`、`feedbackIssueGeneration` 等添加命名键

### 长期

8. **output maxTokens 治理**：小说管线各步骤应显式定义 output maxTokens，而非依赖 provider 默认值
9. **总 token 预算验证**：对传递 chapter 内容的 prompt（chapterWriter、chapterReview 等），验证 system prompt + context blocks + chapter 内容的总 token 不超过 LLM 上下文窗口
10. **CJK 估算校准**：利用 telemetry 积累的数据，定期校准估算公式的除数

---

## 7. 受影响文件清单

| 文件 | 问题 | 修复难度 |
| --- | --- | --- |
| `server/src/prompting/core/contextBudget.ts` | CJK 估算公式 | 简单 |
| `server/src/prompting/context/ContextBroker.ts` | 重复估算函数 | 简单 |
| `server/src/prompting/core/contextSelection.ts` | 无溢出告警 | 简单 |
| `server/src/prompting/prompts/novel/promptBudgetProfiles.ts` | 孤儿键 | 简单 |
| `server/src/orchestration/runtime/GenerationContextAssembler.ts` | 硬编码 2600 | 简单 |
| `server/src/prompting/prompts/novel/volume/*.prompts.ts` | 预算值待调整 | 简单 |
| `server/src/prompting/prompts/audit/audit.global.prompts.ts` | 硬编码 30000 | 简单 |
| `server/src/prompting/prompts/character/characterConsistency.prompts.ts` | 硬编码 8000 | 简单 |
| `server/src/prompting/prompts/feedback/issueGeneration.prompts.ts` | 硬编码 8000 | 简单 |
| `server/src/llm/modelRouter.ts` | 4096 静默吞掉 | 需评估 |
