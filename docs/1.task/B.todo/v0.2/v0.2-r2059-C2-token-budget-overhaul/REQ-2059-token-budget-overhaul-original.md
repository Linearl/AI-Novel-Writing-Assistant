---
description: "REQ-2059 Token 预算控制系统重构——需求文档"
update_time: 2026-07-18
---
# REQ-2059 Token 预算控制系统重构

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 需求编号 | REQ-2059 |
| 优先级 | P0 |
| 版本 | v0.2 |
| 状态 | 📋 待办 |
| 来源 | 2026-07-18 Token 预算诊断报告 |

---

## 1. 背景与问题

诊断报告发现 8 个问题，其中 P1（CJK 估算偏差）和 P2（两套估算函数不一致）影响全局生成质量：

- 当前 `estimateTextTokens` 用 `Math.ceil(text.length / 4)` 估算，基于英文（1 token ≈ 4 字符）
- 中文实际是 1 token ≈ 1 字符，导致系统性**低估 4 倍**
- ContextBroker 用 `/3`，contextBudget 用 `/4`，同一文本不同路径不同结果
- 系统认为 context 在预算内，实际已超出 LLM 输入窗口

---

## 2. 目标与范围

### 2.1 目标

1. 修复 CJK token 估算偏差（P1）
2. 统一估算函数，消除 `/3` vs `/4` 分歧（P2）
3. 收拢所有 token 预算到单一 YAML 配置文件（P4）
4. 清理孤儿键和硬编码（P3、P6-P8）
5. 对预算紧张的步骤适当增加预算

### 2.2 In Scope

**后端**：
- `contextBudget.ts`：估算函数改为 `text.length`（不再除以数字）
- `ContextBroker.ts`：删除重复的 `estimateContextTokens`，统一使用 `estimateTextTokens`
- `promptBudgetProfiles.ts`：删除 `NOVEL_PROMPT_BUDGETS` 常量和 `RUNTIME_PROMPT_BUDGET_PROFILES`，改为从 YAML 加载
- 新建 `server/configs/token-budgets.yaml`：所有预算配置集中管理
- 修复 4 个孤儿键引用
- 修复 5 处硬编码预算
- 修复 `GenerationContextAssembler.ts` 硬编码 2600
- 预算紧张步骤增加预算

**前端**：无

### 2.3 Out of Scope

- P5（零预算 prompt）：不处理
- output maxTokens 治理：留待后续独立任务
- telemetry 估算-实际对比：留待后续

---

## 3. 需求详情

### 3.1 估算函数统一（P1 + P2）

**WHEN** 系统需要估算文本 token 数时
**THE SYSTEM SHALL** 使用 `text.length` 作为 token 数（1 字符 = 1 token），不再除以 3 或 4。

同时将所有预算值放大 4 倍，保持实际容量不变。

### 3.2 YAML 配置文件（P4）

所有 token 预算收拢到 `server/configs/token-budgets.yaml`，包含：
- `context_budgets`：命名预算常量（对应原 `NOVEL_PROMPT_BUDGETS`）
- `runtime_profiles`：运行时上下文选择策略（对应原 `RUNTIME_PROMPT_BUDGET_PROFILES`）

启动时由 `promptBudgetProfiles.ts` 加载 YAML 并导出，现有消费方无需修改导入路径。

### 3.3 孤儿键修复（P3）

| 文件 | 当前引用 | 应改为 |
| --- | --- | --- |
| `compressChapter.prompts.ts` | `NOVEL_PROMPT_BUDGETS.chapterWriter` | `budgets.chapterCompress` |
| `expandChapter.prompts.ts` | `NOVEL_PROMPT_BUDGETS.chapterWriter` | `budgets.chapterExpand` |
| `waterContentDetection.prompts.ts` | `NOVEL_PROMPT_BUDGETS.chapterReview` | `budgets.waterContentDetection` |
| `audit.global.prompts.ts` | 硬编码 30000 | `budgets.globalReview` |

### 3.4 硬编码修复（P6-P8）

| 文件 | 当前 | 应改为 |
| --- | --- | --- |
| `GenerationContextAssembler.ts:542` | 硬编码 2600 | `budgets.chapterWriter` |
| `themeAnalysis.prompt.ts:59` | 硬编码 2000 | 新增 `budgets.themeAnalysis` |
| `characterConsistency.prompts.ts:39,91` | 硬编码 8000 | 新增 `budgets.characterConsistency` |
| `issueGeneration.prompts.ts:77` | 硬编码 8000 | 新增 `budgets.feedbackIssueGeneration` |

### 3.5 预算紧张步骤增加预算

以下步骤在诊断中利用率 >90% 或溢出，需增加预算：

| 步骤 | 原预算 | 新预算 | 原因 |
| --- | --- | --- | --- |
| `audit.chapter.light` | 900 | 3,600 → 14,400 | 利用率 161%，严重溢出 |
| `volume.chapter_list` | 1,600 | 6,400 → 25,600 | 利用率 94%，接入 outline 后更紧张 |
| `volume.chapter_detail` | 1,600 | 6,400 → 25,600 | 利用率 106%，已溢出 |
| `chapter.acceptance` | 1,200 | 4,800 → 19,200 | 利用率 92%，紧张 |
| `volume.beat_sheet` | 1,600 | 6,400 → 25,600 | 接入 outline + material 后需要更多空间 |

注：新预算 = 原预算 × 4（估算函数变更补偿）× 额外放大系数。

---

## 4. 验收标准

- [ ] `estimateTextTokens` 不再使用除法，直接返回 `text.length`
- [ ] `ContextBroker` 中无 `estimateContextTokens` 函数，统一使用 `estimateTextTokens`
- [ ] `server/configs/token-budgets.yaml` 存在且包含所有预算常量和运行时配置
- [ ] `NOVEL_PROMPT_BUDGETS` 从 YAML 加载，而非硬编码 TypeScript 常量
- [ ] 4 个孤儿键引用已修复
- [ ] 5 处硬编码已修复
- [ ] `GenerationContextAssembler.ts` 无硬编码预算值
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过

---

## 5. 风险与约束

| 风险 | 缓解 |
| --- | --- |
| 预算值放大 4 倍后，required 块强制加入可能导致实际 token 超出 LLM 窗口 | 后续在 selectContextBlocks 中添加溢出告警（P7，本任务不处理） |
| YAML 加载失败导致服务启动异常 | 保留 TypeScript 默认值作为 fallback |
| 预算值调整影响生成质量 | 仅调整估算函数和预算标度，实际容量不变；紧张步骤单独增加预算 |

---

## 6. 关联与边界

- 来源：[2026-07-18-token-budget-diagnosis.md](../../3.analysis/diagnosis/01-active/2026-07-18-token-budget-diagnosis.md)
- 关联 REQ-2058：卷生成预算放宽（T0）依赖本任务的统一配置机制
- 不包含：P5（零预算 prompt）、P7（溢出告警）、P8（4096 静默吞掉）、output maxTokens 治理

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| --- | --- | --- |
| 2026-07-18 | 创建 | 基于诊断报告，修复 P1-P4/P6-P8 |
