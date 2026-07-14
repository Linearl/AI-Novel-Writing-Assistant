---
description: "REQ-2037 方案设计"
---

# REQ-2037 方案设计

## 1. 方案概述

为 Character 引入四态状态机（active / exited / dead / frozen），在数据库层增加 `exitStatus` 字段，在 auto-director 流程中集成 LLM 驱动的退场推断，在角色上下文构建时过滤 frozen 角色。客户端角色管理面板增加状态展示和手动标记能力。

### 1.1 设计目标

1. 用状态机精确管理角色生命周期，区分"退场"与"死亡"
2. auto-director 自动推断退场，减少人工维护负担
3. frozen 角色退出生成上下文，节省 token 并避免角色穿帮
4. 退场推断基于 LLM 语义理解，不做硬编码规则匹配

### 1.2 关键决策

1. **四态而非三态**：exited 和 dead 语义不同（死亡角色可能在回忆中出现），需要分开管理
2. **frozen 为终态且仅自动判定**：用户不直接操作 frozen，由 auto-director 根据提及频率自动冻结
3. **LLM 推断而非规则匹配**：退场判断需要理解剧情语义（如"张三完成使命离开"vs"张三暂时离开"），规则匹配无法覆盖
4. **冻结阈值可配置**：默认 5 章，不同小说节奏差异大，允许用户调整

### 1.3 不在范围

- 退场角色自动召回（伏笔回收场景）
- frozen 状态的用户手动操作
- 状态回退（exited/dead 不可回退到 active）

---

## 2. 数据模型

### 2.1 Prisma Schema 变更

```prisma
enum CharacterExitStatus {
  active   // 正常活跃
  exited   // 退场：完成使命不再出场
  dead     // 死亡：明确死亡，可能在回忆中出现
  frozen   // 冻结：auto-director 确认不再需要
}

model Character {
  // ... 现有字段 ...
  exitStatus  CharacterExitStatus  @default(active)
  exitNote    String?              // 退场/死亡的描述备注
  exitChapterId String?            // 退场发生的章节引用
}
```

新增字段说明：
- `exitStatus`：四态枚举，默认 `active`
- `exitNote`：可选文本，记录退场原因或证据摘要
- `exitChapterId`：可选外键，记录退场发生的章节

### 2.2 TypeScript 类型

```typescript
// shared/types/character.ts
enum CharacterExitStatus {
  Active = 'active',
  Exited = 'exited',
  Dead = 'dead',
  Frozen = 'frozen',
}
```

---

## 3. 状态转换

### 3.1 状态图

```
                    ┌──────────┐
                    │  active  │  (默认状态)
                    └────┬─────┘
                   ┌─────┴──────┐
                   ↓            ↓
             ┌──────────┐  ┌────────┐
             │  exited  │  │  dead  │
             └────┬─────┘  └───┬────┘
                  │             │
                  ↓             ↓
             ┌──────────────────────┐
             │       frozen         │  (终态)
             └──────────────────────┘
```

### 3.2 转换规则

| 从 | 到 | 触发方式 | 条件 |
| --- | --- | -------- | ---- |
| active | exited | 手动标记 / 自动推断 | 用户操作或 LLM 推断 confidence >= 0.7 |
| active | dead | 手动标记 / 自动推断 | 用户操作或 LLM 推断 confidence >= 0.7 |
| exited | frozen | 自动冻结 | 连续 N 章未被提及 |
| dead | frozen | 自动冻结 | 连续 N 章未被提及 |

### 3.3 约束

- 不可逆：exited / dead 不可回退到 active
- frozen 为终态：不可从 frozen 转换到任何其他状态
- 手动标记仅允许 active → exited / dead（不允许手动 frozen）

---

## 4. 退场推断 Prompt 设计

### 4.1 Prompt 注册

在 `server/src/prompting/` 注册为 PromptAsset：

```typescript
// server/src/prompting/prompts/novel/characterExitInference.prompt.ts
export const characterExitInferencePrompt: PromptAsset = {
  id: 'novel/character-exit-inference',
  name: '角色退场推断',
  version: '1.0.0',
  buildMessages: (input: CharacterExitInferenceInput) => ({
    system: `你是一位小说剧情分析师。分析给定章节正文，判断是否有角色在本章中退场或死亡。

判断标准：
- 退场（exited）：角色完成使命后明确离开、告别、不再参与主线。注意区分"暂时离开"和"永久退出"
- 死亡（dead）：角色在本章中明确死亡（被杀、牺牲、自然死亡等）

输出 JSON 格式的退场事件列表。如果没有角色退场/死亡，返回空数组。`,
    user: `## 当前活跃角色列表
${JSON.stringify(input.characters, null, 2)}

## 本章正文内容
${input.chapterContent}

## 本章大纲
${input.chapterOutline}

请分析本章中是否有角色退场或死亡，返回 JSON 格式的退场事件列表。`
  }),
  outputFormat: {
    type: 'json',
    schema: characterExitInferenceOutputSchema
  }
};
```

### 4.2 输出 Schema

```typescript
const characterExitInferenceOutputSchema = z.object({
  exitEvents: z.array(z.object({
    characterId: z.string(),
    characterName: z.string(),
    exitType: z.enum(['exited', 'dead']),
    confidence: z.number().min(0).max(1),
    evidence: z.string().describe('引用章内文本作为证据'),
  }))
});
```

---

## 5. 上下文过滤逻辑

### 5.1 过滤点

auto-director 构建章节生成上下文时，在角色列表查询处增加过滤：

```typescript
// 过滤前
const characters = await prisma.character.findMany({
  where: { novelId }
});

// 过滤后
const characters = await prisma.character.findMany({
  where: {
    novelId,
    exitStatus: { not: 'frozen' }  // 排除 frozen 角色
  }
});
```

### 5.2 过滤范围

需要排查所有角色列表查询点，确保以下场景过滤 frozen：
- 章节生成上下文构建（`chapterLayeredContextBlocks.ts`）
- 运行时上下文解析（`runtimeContextResolvers.ts`）
- 材料组构建（`materialGroups.ts`）
- 规划上下文（`plannerContextBlocks.ts`）

不需过滤的场景（保留全量）：
- 角色管理页面查询（客户端需要看到所有角色）
- 角色统计（需要计入总数）

---

## 6. 自动冻结逻辑

### 6.1 算法

```
对每个 exitStatus 为 exited 或 dead 的角色：
  1. 查询该角色最后被提及的章节序号（通过 CharacterTimeline 或章节正文搜索）
  2. 获取当前最新章节序号
  3. 如果 最新章节序号 - 最后提及章节序号 >= freezeThreshold（默认 5）
     → 更新 exitStatus 为 frozen
```

### 6.2 提及检测

通过 `CharacterTimeline` 表判断角色是否被提及：
- 章节确认后，auto-director 已在 CharacterTimeline 中记录角色出现
- 如果 CharacterTimeline 中该角色在最近 N 章没有新记录，视为未提及

### 6.3 触发时机

在 auto-director 章节确认流程的最后阶段，退场推断之后执行冻结检查。

---

## 7. 客户端交互设计

### 7.1 角色列表状态标签

```
┌─────────────────────────────────────────┐
│  角色名：张三          [已退场] 灰色标签  │
│  角色：配角                                │
│  ...                                      │
└─────────────────────────────────────────┘
```

### 7.2 筛选器

```
[ 全部(20) ] [ 活跃(12) ] [ 已退场(5) ] [ 已死亡(2) ] [ 已冻结(1) ]
```

### 7.3 手动标记流程

```
角色详情页 → 点击"标记退场" → 弹出确认框
  "确认将「张三」标记为已退场？退场后该角色不再参与后续章节生成上下文。"
  [取消]  [确认]
→ 调用 PATCH API → UI 更新状态标签
```
