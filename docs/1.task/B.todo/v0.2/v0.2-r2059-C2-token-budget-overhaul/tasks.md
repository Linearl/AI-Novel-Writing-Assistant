---
description: "REQ-2059 任务拆解"
update_time: 2026-07-18
---
# REQ-2059 任务拆解

## 任务清单

| # | 任务 | 优先级 | 涉及文件 | 状态 |
| - | ---- | ------ | -------- | ---- |
| T1 | 创建 token-budgets.yaml 配置文件 | P1 | `server/configs/token-budgets.yaml`（新建） | 📋 |
| T2 | promptBudgetProfiles.ts 改为从 YAML 加载 | P1 | `server/src/prompting/prompts/novel/promptBudgetProfiles.ts` | 📋 |
| T3 | 估算函数统一：去掉除法 | P1 | `server/src/prompting/core/contextBudget.ts` | 📋 |
| T4 | 删除 ContextBroker 重复估算函数 | P1 | `server/src/prompting/context/ContextBroker.ts` | 📋 |
| T5 | 修复孤儿键引用（4 处） | P1 | 4 个 prompt 文件 | 📋 |
| T6 | 修复硬编码预算（5 处） | P1 | 5 个文件 | 📋 |
| T7 | 类型检查 + 测试验证 | P1 | — | 📋 |

---

## T1. 创建 token-budgets.yaml 配置文件

**目标**：将所有 token 预算收拢到 `server/configs/token-budgets.yaml`。

**操作**：
1. 创建 `server/configs/` 目录（如不存在）
2. 创建 `token-budgets.yaml`，包含：
   - `context_budgets`：所有命名预算常量（原 `NOVEL_PROMPT_BUDGETS` 的 4 倍值）
   - `runtime_profiles`：运行时上下文选择策略（原 `RUNTIME_PROMPT_BUDGET_PROFILES`）
   - 新增收拢的硬编码键：`themeAnalysis`、`characterConsistency`、`feedbackIssueGeneration`
3. 预算紧张步骤额外放大：
   - `audit.chapter.light`：900 → 14400（×16，原 ×4 补偿 + ×4 放大）
   - `volume.chapter_list`：1600 → 25600（×16）
   - `volume.chapter_detail`：1600 → 25600（×16）
   - `chapter.acceptance`：1200 → 19200（×16）
   - `volume.beat_sheet`：1600 → 25600（×16）

---

## T2. promptBudgetProfiles.ts 改为从 YAML 加载

**目标**：`NOVEL_PROMPT_BUDGETS` 和 `RUNTIME_PROMPT_BUDGET_PROFILES` 从 YAML 读取。

**操作**：
1. 添加 YAML 解析依赖（`yaml` 或 `js-yaml`，检查项目是否已有）
2. 启动时读取 `server/configs/token-budgets.yaml`
3. 导出 `NOVEL_PROMPT_BUDGETS` 和 `RUNTIME_PROMPT_BUDGET_PROFILES`
4. 保留 TypeScript 默认值作为 fallback（YAML 加载失败时降级）
5. 确保所有现有 `import { NOVEL_PROMPT_BUDGETS } from "..."` 路径不变

---

## T3. 估算函数统一：去掉除法

**目标**：`estimateTextTokens` 直接返回 `text.length`，不再除以 4。

**操作**：
1. 打开 `server/src/prompting/core/contextBudget.ts`
2. 修改 `estimateTextTokens`：
   ```typescript
   export function estimateTextTokens(text: string): number {
     const normalized = text.replace(/\s+/g, " ").trim();
     if (!normalized) return 0;
     return Math.max(1, normalized.length);
   }
   ```
3. 同步修改 `summarizeContextBlock` 中的 token 计算逻辑（确认无硬编码除法）

---

## T4. 删除 ContextBroker 重复估算函数

**目标**：消除 `/3` vs `/4` 分歧。

**操作**：
1. 打开 `server/src/prompting/context/ContextBroker.ts`
2. 删除本地的 `estimateContextTokens` 函数（L6-8）
3. 改为从 `contextBudget.ts` 导入 `estimateTextTokens`
4. 更新 `normalizeBlock` 中的调用（L62）：`estimateContextTokens(content)` → `estimateTextTokens(content)`

---

## T5. 修复孤儿键引用（4 处）

**目标**：让每个 prompt 使用正确的命名预算键。

**操作**：

| 文件 | 修改 |
| --- | --- |
| `server/src/prompting/prompts/novel/compressChapter.prompts.ts` | `NOVEL_PROMPT_BUDGETS.chapterWriter` → `NOVEL_PROMPT_BUDGETS.chapterCompress` |
| `server/src/prompting/prompts/novel/expandChapter.prompts.ts` | `NOVEL_PROMPT_BUDGETS.chapterWriter` → `NOVEL_PROMPT_BUDGETS.chapterExpand` |
| `server/src/prompting/prompts/novel/waterContentDetection.prompts.ts` | `NOVEL_PROMPT_BUDGETS.chapterReview` → `NOVEL_PROMPT_BUDGETS.waterContentDetection` |
| `server/src/prompting/prompts/audit/audit.global.prompts.ts` | 硬编码 `30000` → `NOVEL_PROMPT_BUDGETS.globalReview` |

---

## T6. 修复硬编码预算（5 处）

**目标**：所有预算值从统一配置读取。

**操作**：

| 文件 | 修改 |
| --- | --- |
| `server/src/orchestration/runtime/GenerationContextAssembler.ts:542` | 硬编码 `2600` → `NOVEL_PROMPT_BUDGETS.chapterWriter`（需导入） |
| `server/src/prompting/prompts/novel/themeAnalysis.prompt.ts:59` | 硬编码 `2000` → `NOVEL_PROMPT_BUDGETS.themeAnalysis` |
| `server/src/prompting/prompts/character/characterConsistency.prompts.ts:39,91` | 硬编码 `8000` → `NOVEL_PROMPT_BUDGETS.characterConsistency` |
| `server/src/prompting/prompts/feedback/issueGeneration.prompts.ts:77` | 硬编码 `8000` → `NOVEL_PROMPT_BUDGETS.feedbackIssueGeneration` |

---

## T7. 类型检查 + 测试验证

**目标**：确保改动不引入回归。

**操作**：
1. `pnpm typecheck` — 全量类型检查
2. `pnpm test` — server 单元测试
3. `pnpm --filter @ai-novel/server test:routes` — 路由测试
4. 验证 YAML 加载：启动服务，确认无 budget 相关错误

---

## DoD（Definition of Done）

- `estimateTextTokens` 直接返回 `text.length`，无除法
- `ContextBroker` 无本地 `estimateContextTokens`，统一用 `estimateTextTokens`
- `server/configs/token-budgets.yaml` 包含所有预算常量
- 4 个孤儿键引用已修复
- 5 处硬编码已修复
- 所有现有测试通过，无回归
