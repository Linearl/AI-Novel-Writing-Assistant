---
description: 3个YAML prompt迁移到 prompting/ 体系 + 4处service内联prompt迁移，删除旧 prompts/ 和 data/prompts/ 加载系统
---

# REQ-7079 — Prompts YAML 清理与内联 Prompt 迁移

## 1. 背景

项目中存在两个 prompt 加载体系：
1. **新体系** `server/src/prompting/` — PromptAsset + registry 治理（符合 Prompt Governance 规范）
2. **旧体系** `server/src/prompts/` + `server/src/data/prompts/` — YAML 文件 + 旧加载器

此外，service 文件中仍有多处内联 prompt 直接在代码中定义 system/user prompt 字符串，违反 Prompt Governance 规范。

### 1.1 YAML Prompt（3 个）

- `prompts/character-refine.yaml` 对应到新命名 `character.refine`
- `prompts/llm-json-repair.yaml` 对应到新命名 `llm.json-repair`
- `prompts/novel-character-extraction.yaml` 对应到新命名 `novel.character-extraction`

### 1.2 内联 Prompt（4 处）

| 文件 | 位置 | 类型 | 复杂度 |
|------|------|------|--------|
| `agents/planner/intentPromptSupport.ts` | lines 280-309 | System prompt（23行指令） | 中 |
| `characterPrep/characterPreparationSupplemental.ts` | line 412 | System prompt（人名提取，1行） | 低 |
| `characterPrep/characterPreparationSupplemental.ts` | lines 435-448 | System prompt（人名修正，14行，含动态变量） | 中 |
| `characterPrep/characterPreparationSupplemental.ts` | lines 639-647 | User prompt（refine 角色，模板拼接） | 低 |

需要将这些 YAML prompt 迁移到 `prompting/` 体系后，删除旧的 `prompts/` 和 `data/prompts/` 加载系统。

## 2. 目标

完成旧 prompt 体系到新体系的迁移，消除两套系统并存状态，确保所有产品级 prompt 均通过 `prompting/` 治理。

## 3. 范围

### 包含

**Part A: YAML Prompt 迁移（原有）**
- 将 3 个 YAML prompt 转换为 PromptAsset 并注册到 `prompting/registry.ts`
- 更新引用旧加载器的代码改为调用新 PromptAsset
- 删除 `server/src/prompts/` 目录（3 个 YAML 文件）
- 删除 `server/src/data/prompts/` 旧加载器（如无其他用途）

**Part B: 内联 Prompt 迁移（新增）**
- 将 4 处 service 内联 prompt 迁移到 `prompting/` 体系
- 为每处 prompt 创建独立的 PromptAsset 文件
- 在 `prompting/registry.ts` 中注册新 prompt
- 更新 service 文件改为从 prompting/ 体系加载 prompt
- 删除 service 文件中的内联 prompt 代码

### 不包含

- 新增 prompt 功能
- 修改 prompt 内容逻辑
- 变更 PromptAsset 接口
- 非产品级 prompt（如测试用 prompt、临时 prompt）

## 4. 非目标

- 不改变现有的 prompting 架构
- 不迁移非产品级 prompt

## 5. EARS 验收条目

**Part A: YAML 迁移**

| ID | 验收条件 |
|----|----------|
| AC-1 | 3 个 YAML prompt 功能完整迁移到 `prompting/` 体系 |
| AC-2 | 所有引用旧加载器的代码已更新为 PromptAsset 调用 |
| AC-3 | `server/src/prompts/` 目录已删除 |
| AC-4 | `server/src/data/prompts/` 旧加载器已删除（如仅用于这 3 个 prompt） |

**Part B: 内联 Prompt 迁移**

| ID | 验收条件 |
|----|----------|
| AC-5 | `intentPromptSupport.ts` 的意图解析 prompt 迁移到 PromptAsset |
| AC-6 | `characterPreparationSupplemental.ts` 人名提取 prompt 迁移到 PromptAsset |
| AC-7 | `characterPreparationSupplemental.ts` 人名修正 prompt 迁移到 PromptAsset（处理动态变量 slots） |
| AC-8 | `characterPreparationSupplemental.ts` refine user prompt 迁移到 PromptAsset |
| AC-9 | 迁移后的 prompt 保留原有输入/输出 schema 和行为一致性 |

**通用验收**

| ID | 验收条件 |
|----|----------|
| AC-10 | `pnpm typecheck` 零错误 |
| AC-11 | `pnpm test` 全部通过 |

## 6. 风险与未决项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 旧加载器可能有其他隐式调用 | 中 | 先 grep 确认所有引用，再逐个迁移 |
| PromptAsset 格式可能与 YAML 内容不完全匹配 | 低 | 迁移时保持输出一致，通过测试验证 |
| 内联 prompt 有动态变量替换（人名修正） | 中 | 使用 PromptAsset slots 机制处理动态内容 |
| 意图解析 prompt 依赖运行时变量（INTENT_NAMES 等） | 中 | 通过 context 对象注入变量，不硬编码 |
| 迁移后 prompt 行为可能有细微差异 | 中 | 保留原有 input/output schema，对比测试验证 |

---

## 7. 附录：内联 Prompt 详细分析

### A. intentPromptSupport.ts（lines 280-309）

- **类型**：System prompt（23行指令）
- **内容**：意图解析器行为规则
- **动态变量**：`INTENT_NAMES`（编译时）、`input.goal` 等（运行时）
- **迁移方案**：创建 `intentParse.prompt.ts`，使用 PromptAsset context 注入变量

### B. characterPreparationSupplemental.ts（line 412）

- **类型**：System prompt（1行）
- **内容**：从角色候选文本提取人名
- **动态变量**：无
- **迁移方案**：创建 `characterPrepNameExtraction.prompt.ts`，直接迁移

### C. characterPreparationSupplemental.ts（lines 435-448）

- **类型**：System prompt（14行数组拼接）
- **内容**：修正角色候选中引用的非法人名
- **动态变量**：`${validNames.join("、")}`、`${allInvalid.join("、")}`
- **迁移方案**：创建 `characterPrepNameRepair.prompt.ts`，使用 slots 处理动态列表

### D. characterPreparationSupplemental.ts（lines 639-647）

- **类型**：User prompt（模板拼接）
- **内容**：角色调整请求的用户输入格式
- **动态变量**：`candidate`（JSON）、`adjustment`（字符串）
- **迁移方案**：合并到现有 `character.refine.prompt.ts` 或创建独立 user prompt
