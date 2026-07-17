# 设计文档 — REQ-7079 Prompts YAML 清理与内联 Prompt 迁移

## 1. 现状分析

### 旧体系结构

```
server/src/
├── prompts/                              ← 待删除
│   ├── character-refine.yaml             ← 3 个 YAML prompt 文件
│   ├── llm-json-repair.yaml
│   └── novel-character-extraction.yaml
├── data/prompts/                         ← 待删除（旧加载器）
│   └── ... (YAML 加载逻辑)
├── agents/planner/intentPromptSupport.ts ← 内联 prompt（23行）
└── services/novel/characterPrep/
    └── characterPreparationSupplemental.ts ← 内联 prompt（3处）
```

### 新体系结构

```
server/src/prompting/
├── registry.ts                           ← PromptAsset 注册中心
├── novel/                                ← novel.* prompt
├── character/                            ← character.* prompt
├── llm/                                  ← llm.* prompt
└── agent/                                ← agent.* prompt（新增）
```

## 2. 迁移映射

### Part A: YAML Prompt 迁移

| 旧 YAML 文件 | 新 PromptAsset 命名 | 目标目录 |
|-------------|---------------------|---------|
| `prompts/character-refine.yaml` | `character.refine` | `prompting/character/characterRefine.ts` |
| `prompts/llm-json-repair.yaml` | `llm.json-repair` | `prompting/llm/llmJsonRepair.ts` |
| `prompts/novel-character-extraction.yaml` | `novel.character-extraction` | `prompting/novel/novelCharacterExtraction.ts` |

### Part B: 内联 Prompt 迁移

| 源文件 | 内联 Prompt | 新 PromptAsset | 复杂度 |
|--------|-----------|----------------|--------|
| `intentPromptSupport.ts:280-309` | 意图解析器 system prompt | `agent.intentParse` → `prompting/agent/intentParse.ts` | 中 |
| `characterPreparationSupplemental.ts:412` | 人名提取 system prompt | `character.prepNameExtraction` → `prompting/character/characterPrepNameExtraction.ts` | 低 |
| `characterPreparationSupplemental.ts:435-448` | 人名修正 system prompt | `character.prepNameRepair` → `prompting/character/characterPrepNameRepair.ts` | 中 |
| `characterPreparationSupplemental.ts:639-647` | refine user prompt | `character.refineUser` → 合并到 `character.refine` 或独立 | 低 |

## 3. 迁移步骤

### Step 1: 创建 PromptAsset 文件（YAML 迁移）

对每个 YAML prompt：
1. 读取 YAML 内容
2. 创建对应的 PromptAsset TypeScript 文件
3. 在 `registry.ts` 中注册

### Step 2: 创建 PromptAsset 文件（内联迁移）

**意图解析 prompt（T4）**：
```typescript
// prompting/agent/intentParse.ts
export const intentParsePrompt = createPromptAsset({
  name: "agent.intentParse",
  system: `你是小说创作 Agent 的意图解析器...`, // 23行指令
  user: "{{userPrompt}}", // 模板变量
  context: { INTENT_NAMES: string[] }, // 运行时注入
});
```

**人名提取/修正 prompt（T5-T6）**：
```typescript
// prompting/character/characterPrepNameExtraction.ts
export const characterPrepNameExtractionPrompt = createPromptAsset({
  name: "character.prepNameExtraction",
  system: "从以下角色候选文本中提取所有人名...",
  user: "{{candidatesText}}",
  schema: nameExtractionSchema,
});
```

**refine user prompt（T7）**：
- 合并到现有 `character.refine.prompt.ts`，将 user prompt 从内联改为 PromptAsset 模板

### Step 3: 更新引用方

将内联 prompt 代码改为：
```typescript
// 修改前（内联）
const systemPrompt = "从以下角色候选文本中提取...";
const result = await invokeStructuredLlm({ systemPrompt, ... });

// 修改后（PromptAsset）
const prompt = getPromptAsset('character.prepNameExtraction');
const result = await invokeStructuredLlm({
  systemPrompt: prompt.system,
  userPrompt: prompt.render({ candidatesText }),
  ...
});
```

### Step 4: 清理旧文件

1. 删除 `server/src/prompts/` 目录
2. 删除 `server/src/data/prompts/` 旧加载器
3. 删除 service 文件中的内联 prompt 代码

## 4. 测试策略

### YAML 迁移验证

- 每个 PromptAsset 创建后验证输出与旧 YAML 一致
- `pnpm typecheck` 验证类型完整性
- `pnpm test` 验证功能无回归

### 内联 Prompt 迁移验证

- 对比迁移前后 prompt 的输入/输出 schema 是否一致
- 验证动态变量替换（人名修正的 slots）正确工作
- 确认意图解析器的功能行为保持不变
- 对关键路径进行手动端到端测试

## 5. 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 动态变量替换出错 | 使用 PromptAsset slots 机制，编写单元测试验证变量注入 |
| PromptAsset 行为与内联有细微差异 | 保留原有 schema，对比迁移前后的输出结果 |
| 意图解析器的复杂逻辑影响 | 在测试环境中逐步验证，先迁移再清理旧代码 |
