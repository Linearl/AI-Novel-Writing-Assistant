---
description: "REQ-2055 导演步骤间推理链路传递——reasoningTrace字段与 reasoning_trace context group"
---

# REQ-2055 导演步骤间推理链路传递

> 状态：🚧 待开发

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2055 |
| 优先级 | P2 |
| 来源 | 无状态架构改进，[多素材导入架构设计](../../../2.tech/architecture/2026-07-15-multi-material-import-design.md) 讨论延伸 |
| 依赖 | REQ-2054（material_index 注入管道就绪） |

---

## 1. 背景与问题

当前导演管道步骤之间仅传导结构化输出（如 `character_cast` 产出角色列表），推理过程"为什么选了这个角色关系"在步骤间丢失。模型无法在后续步骤中引用前序的因果推理，每次都是冷启动。

不改的后果：步骤越靠后，越难以理解前序决策的上下文。比如第28章写作时不知道为什么第10章的角色弧线被设计为"先退后进"——结构数据告诉它"当前状态是退"，但不告诉它"为什么退"。

---

## 2. 目标与范围

### 2.1 目标

1. 关键导演步骤的 output schema 新增 `reasoningTrace` 字段，模型产出 2-3 句决策摘要
2. `NovelPromptMaterialExporter` 新增 `reasoning_trace` context group，自动汇集前序步骤的推理摘要
3. 后续步骤的 prompt 中注入"前序推理摘要"，实现渐进理解的近似等效

### 2.2 In Scope

- 改造 5 个关键步骤的 output schema：`story.macro.plan`、`book.contract.create`、`character.cast.prepare`、`volume.strategy.plan`、`chapter.draft.write`
- `materialGroups.ts` 新增 `reasoning_trace` 组
- `NovelPromptMaterialExporter` 新增 `buildReasoningTrace()` 方法
- 后续步骤的 `contextRequirements` 添加 `reasoning_trace` 组

### 2.3 Out of Scope

- 所有 23 个步骤的全面覆盖（首期先 5 个核心步骤验证效果）
- `reasoningTrace` 的校验/一致性检查（纯透传，不主动纠错）

---

## 3. 设计要点

### 3.1 reasoningTrace 格式

```json
{
  "step": "character.cast.prepare",
  "summary": "选择了师徒关系作为核心冲突轴，因为世界观设定中权力体系对个人的压制需要'传授与突破'的叙事结构来对抗",
  "rejectedAlternatives": "考虑过爱情主轴但会被世界观淡化张力",
  "keyAssumptions": ["主角的童年创伤将作为后续第8章的揭晓点", "反派不是单纯的恶而是系统的产物"]
}
```

### 3.2 注入格式

在 prompt 中作为独立 block：

```
【前序推理摘要】
- [story.macro.plan] 核心冲突选为'个人vs系统'而非'个人vs命运'，因为角色设定中所有冲突都是社会结构性的，命运感不够强
- [character.cast.prepare] 师徒关系为主线，被放弃的方案是爱情主轴（世界观会稀释）
- [volume.strategy.plan] 前三卷加速递进；留白式高潮会给第三章更大空间
```

### 3.3 存储位置

不单独建表，写入 `CanonicalStateVersion` 表或复用 `CreativeDecision` 表。首期方案：写入各步骤产出物的 JSON 字段中（如 `storyMacroPlan.reasoningTraceJson`、`characterCastBatch.reasoningTraceJson`），由 Exporter 汇合时查询。

---

## 4. 验收标准

- [ ] 5 个关键步骤的 structured output 包含 `reasoningTrace` 字段
- [ ] `reasoning_trace` context group 正确注入后续步骤
- [ ] 不影响无状态可恢复性（因 `reasoningTrace` 是持久化 snapshot）
- [ ] pnpm typecheck 通过
- [ ] 现有测试全部通过
