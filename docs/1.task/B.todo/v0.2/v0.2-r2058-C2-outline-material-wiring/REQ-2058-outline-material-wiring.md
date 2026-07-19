---
description: "REQ-2058 卷生成链路 outline + material_index 接线——需求文档"
update_time: 2026-07-18
---
# REQ-2058 卷生成链路 outline + material_index 接线

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 需求编号 | REQ-2058 |
| 优先级 | P0 |
| 版本 | v0.2 |
| 状态 | 📋 待办 |
| 来源 | REQ-2054 T4.3/T4.4 遗留 + 运行时诊断 |

---

## 1. 背景与问题

v2 卷生成管线（卷战略、节拍表、节奏段、章节详写等）在 v1→v2 重构过程中丢失了 `novel.outline`（用户粘贴的完整素材）的注入。同时，REQ-2054 实现的 `material_index` 上下文组和 B2 两轮加载机制未接入卷生成链路。

**现状**：卷生成的 LLM 只能看到标题、类型、简介、卖点等元数据，看不到用户提供的世界观、角色、大纲、章节梗概等原始素材。导致生成的卷战略和章节规划与用户意图偏离。

**不改会怎样**：用户精心准备的素材形同虚设，AI 规划完全基于压缩后的元数据，遵循性持续低下。

---

## 2. 目标与范围

### 2.1 目标

1. 卷生成管线所有步骤能看到 `novel.outline`（用户素材全文）
2. 卷生成管线关键步骤能看到 `material_index`（NovelMaterial 材料索引）
3. 关键步骤支持 B2 两轮加载：AI 看到索引后自主决定是否加载材料全文

### 2.2 In Scope

**后端**：
- `shared.ts` 的 `buildCommonNovelContext` 注入 `novel.outline`
- `contextBlocks.ts` 新增 `material_index` 上下文块 builder
- 卷生成 prompt 的 `contextPolicy` 添加 `material_index`
- `volumeGenerationOrchestrator` 实现 B2 两轮加载逻辑
- 输出 schema 扩展 `requestedMaterialIds`

**前端**：无

**基础设施**：无

### 2.3 Out of Scope

- 改造 `invokeStructuredLlm` 核心调用链（两轮逻辑在 orchestrator 层实现）
- 非卷生成步骤的 material_index 接线（如章执行步骤，留待后续）
- Function calling 改造（REQ-2054 已明确 out of scope）
- `storyInput` 存储改造（与 material_index 互补，不在本期）

---

## 3. 需求详情

### 3.1 outline 注入

**WHEN** 卷生成管线调用 `buildCommonNovelContext(novel)` 时
**THE SYSTEM SHALL** 在输出中包含 `novel.outline` 全文（如有），格式为：
```
用户提供的完整素材（世界观、角色、大纲、章节梗概等）：
{outline 全文}
```

### 3.2 material_index 上下文块

**WHEN** 卷生成步骤（volume_strategy / beat_sheet / chapter_list / chapter_detail）组装上下文时
**THE SYSTEM SHALL** 在 context blocks 中包含 `material_index` 块，列出用户材料的 ID、标题、摘要、字数。

### 3.3 B2 两轮加载

**WHEN** 卷生成步骤的 LLM 第一轮输出包含 `requestedMaterialIds` 且非空时
**THE SYSTEM SHALL**：
1. 从 NovelMaterial 表查询对应材料全文
2. 追加 user message 携带材料全文
3. 用原始 schema 发起第二轮调用
4. 返回第二轮结果

**WHEN** `requestedMaterialIds` 为空或缺失时
**THE SYSTEM SHALL** 直接返回第一轮结果。

### 3.4 目标步骤

首期覆盖：
- `volume_strategy`（卷战略）— 最需要 outline 定方向
- `beat_sheet`（节拍表）— 需要 outline 中的情节节点
- `chapter_list`（节奏段/章节列表）— 需要 outline 中的章节梗概
- `chapter_detail`（章节详写）— 需要 outline 中的角色弧线和场景细节

暂不覆盖（按需扩展）：
- `strategy_critique`、`skeleton`、`rebalance` — 可后续添加

---

## 4. 验收标准

- [ ] 卷战略生成时，LLM 输入包含 `novel.outline` 全文
- [ ] 节拍表/章节列表生成时，LLM 输入包含 `novel.outline` 全文
- [ ] 卷战略/节拍表/章节列表/章节详写的上下文包含 `material_index` 块
- [ ] 当 AI 输出 `requestedMaterialIds` 时，第二轮调用包含对应材料全文
- [ ] 当 AI 未请求材料时，流程与现有行为完全一致（无回归）
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] `pnpm --filter @ai-novel/server test:routes` 通过

---

## 5. 风险与约束

| 风险 | 缓解 |
| --- | --- |
| outline 过大超出 token 预算 | T0 将卷生成步骤预算统一上调至 3000 tokens；outline 在 book_contract 块中 priority=100+required，不会被误删 |
| B2 第二轮增加延迟和成本 | 仅在 AI 请求材料时触发；Anthropic prompt cache 在 5 分钟窗口内自动命中 system prompt |
| material_index 与 outline 内容重叠 | 设计上互补：outline 是静态全文，material_index 是动态索引；AI 自主判断是否需要额外材料 |
| 自动导演质量门：步骤输出不符预期 | 不自动阻断全局链（项目约束），仅作为可见警告 |

---

## 6. 关联与边界

- 与 REQ-2054（material-import-system）的边界：本任务包完成 REQ-2054 的 T4.3（material_index 接线）和 T4.4（B2 两轮加载），但仅限卷生成管线
- 依赖：NovelMaterial 表（已实现）、NovelPromptMaterialExporter.buildMaterialIndex()（已实现）、material_index 上下文组（已定义）
- 上游：volumeGenerationOrchestrator.loadGenerationContext() 已加载 outline 到 VolumeGenerationNovel（数据已到位，只差注入 prompt）

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-18 | 创建 | 初始版本，承接 REQ-2054 T4.3/T4.4 遗留 |
