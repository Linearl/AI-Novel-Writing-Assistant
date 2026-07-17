---
description: "子报告6：Prompt Governance违规诊断——5个service文件23处内联prompt的清查与迁移方案"
date: 2026-07-17
parent: "2026-07-17-代码屎山诊断报告"
severity: P1
---

# 子报告6：Prompt Governance 违规

> 严重度：P1（治理违反）
> 违规文件：5 个 | 内联 prompt 数：23 处
> 项目规范：所有产品级 prompt 必须在 `server/src/prompting/` 注册

---

## 一、违规清单

### 1.1 按严重度排序

| # | 文件 | 内联数 | 严重度 | 说明 |
|---|------|--------|--------|------|
| 1 | `characterPreparationSupplemental.ts` | **13** | 严重 | 663行超大文件，prompt占大量篇幅 |
| 2 | `novelCoreCharacterService.ts` | **6** | 高 | 核心角色服务 |
| 3 | `characterConsistency/detector.ts` | **2** | 中 | 一致性检测 |
| 4 | `characterConsistency/extractor.ts` | **2** | 中 | 信息提取 |
| 5 | `worldReferenceInspiration.ts` | **1** | 低 | 世界参考灵感 |

### 1.2 违规类型分析

这 23 处内联 prompt 可分为以下类型：

| 类型 | 数量 | 示例 |
|------|------|------|
| system prompt 内联 | ~10 | `const systemPrompt = "你是一个..."` |
| user prompt 模板内联 | ~8 | `` const userPrompt = `请根据...` `` |
| prompt 构建逻辑内联 | ~5 | 动态拼接 prompt 的函数 |

---

## 二、重点违规文件分析

### 2.1 characterPreparationSupplemental.ts（13处，663行）

**角色**：角色阵容准备的补充逻辑

**问题**：
- 该文件本身 663 行，接近 700 行红线
- 13 处内联 prompt 占文件约 40% 的篇幅
- prompt 内容涉及角色阵容的多个维度（外貌、性格、关系、背景等）

**典型内联模式**：
```typescript
// 文件中第 N 处
const systemPrompt = `你是一位专业的小说角色设计师。
请根据以下信息为角色生成详细的设计方案...`;

const userPrompt = `
角色名称：${character.name}
角色类型：${character.type}
世界观背景：${worldContext}
...`;

const result = await invokeStructuredLlm({ systemPrompt, userPrompt, ... });
```

**影响**：
- prompt 修改需要改 TypeScript 代码
- 无法通过 prompting/ 体系进行版本管理和审计
- 无法使用 Prompt Workbench 进行测试

### 2.2 novelCoreCharacterService.ts（6处）

**角色**：核心角色 CRUD 服务

**问题**：
- 6 处内联 prompt 分散在不同方法中
- 涉及角色生成、角色更新、角色验证等操作
- 与 `prompting/prompts/character/character.prompts.ts` 功能重叠

### 2.3 characterConsistency/detector.ts + extractor.ts（各2处）

**角色**：角色一致性检测

**问题**：
- 4 处内联 prompt 用于检测角色设定的一致性
- 检测逻辑本身适合用 AI 实现，但 prompt 应注册到 prompting/ 体系

### 2.4 worldReferenceInspiration.ts（1处）

**角色**：世界参考灵感生成

**问题**：
- 仅 1 处内联 prompt，但违反了统一治理原则

---

## 三、与 prompting/ 体系的对比

### 3.1 正确的 Prompt 管理模式

`prompting/` 体系已建立完整的 prompt 治理：

```
prompting/
├── registry.ts              (704行) Prompt 注册表
├── prompts/
│   ├── character/
│   │   ├── character.prompts.ts        ← 正确：角色 prompt 在此注册
│   │   └── character.promptSchemas.ts
│   ├── novel/
│   │   ├── characterPreparation.prompts.ts  ← 已有角色准备 prompt
│   │   └── ...
│   └── ...
├── context/                 上下文管理
├── materials/               Prompt 材料
├── slots/                   Slot 覆盖
└── workflows/               工作流定义
```

**已注册的角色相关 prompt**：
- `character.prompts.ts` — 角色设计
- `characterPreparation.prompts.ts`（662行）— 角色准备（大部分）
- `characterSync.prompts.ts` — 角色同步

### 3.2 违规 vs 正确

| 维度 | 内联 prompt | prompting/ 注册 |
|------|------------|----------------|
| 版本管理 | 无 | Git 历史追踪 |
| 审计能力 | 无法审计 | Prompt Workbench 测试 |
| 复用性 | 难以复用 | 跨服务复用 |
| 修改成本 | 改 TS 代码 | 改 prompt 文件 |
| 治理可见性 | 不可见 | 注册表可见 |

---

## 四、迁移方案

### 4.1 迁移优先级

| 优先级 | 文件 | 内联数 | 理由 |
|--------|------|--------|------|
| P0 | characterPreparationSupplemental.ts | 13 | 数量最多，且文件本身超大需拆分 |
| P1 | novelCoreCharacterService.ts | 6 | 核心服务 |
| P2 | characterConsistency/detector.ts | 2 | 功能独立 |
| P2 | characterConsistency/extractor.ts | 2 | 功能独立 |
| P3 | worldReferenceInspiration.ts | 1 | 数量少 |

### 4.2 迁移步骤（以 characterPreparationSupplemental.ts 为例）

**Step 1**：分析 13 处内联 prompt，归类为独立的 prompt 资产
```
→ characterPrep外貌设计.prompt.ts
→ characterPrep性格定义.prompt.ts
→ characterPrep关系构建.prompt.ts
→ ...
```

**Step 2**：在 `prompting/prompts/character/` 下创建对应的 PromptAsset 文件

**Step 3**：在 `prompting/registry.ts` 中注册新 prompt

**Step 4**：修改 `characterPreparationSupplemental.ts`，从 prompting/ 体系获取 prompt

**Step 5**：删除内联 prompt 代码

### 4.3 附带收益

迁移完成后，`characterPreparationSupplemental.ts` 可能从 663 行降至 ~400 行（prompt 内容占约 40%），脱离超大文件行列。

---

## 五、预防措施

### 5.1 代码审查拦截

在 CI/代码审查中增加检查：
- 扫描 `services/` 下的 `.ts` 文件
- 检测 `systemPrompt`、`userPrompt` 变量定义
- 检测 `` invokeStructuredLlm({ systemPrompt: ` `` 模式
- 发现内联 prompt 时发出警告

### 5.2 定期审计

利用现有的 `ll-workflow-core aud` 工作流，将 Prompt Governance 合规性纳入审计维度。
