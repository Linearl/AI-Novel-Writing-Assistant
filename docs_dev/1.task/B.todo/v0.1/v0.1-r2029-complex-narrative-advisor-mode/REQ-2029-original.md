---
description: "REQ-2029 Creative Hub 叙事讨论通道（原始冻结副本）"
---

# REQ-2029 Creative Hub 叙事讨论通道 (narrative_advisor)

> 状态：⏳ 进行中（完成后改为 ✅ 完成）

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2029 |
| 优先级 | P2 |
| 来源 | 上游 issue — Creative Hub 缺少宏观创作讨论能力 |
| 关联需求 | 无 |

---

## 1. 背景与问题

当前 Creative Hub 的工作方式是：用户说任何话 → 意图分类器（30 个预定义意图）→ 匹配到意图后走对应工具链。

这导致一个关键缺失：**无法和 AI 进行宏观创作讨论**。具体场景：

- "我觉得第三幕的节奏太慢了，要不要把冲突提前？" → 被分类为 `general_chat`，不会分析卷结构
- "这个角色的动机转变不够自然" → 不会查角色库、对比前后章节
- "帮我看看整本书的节奏曲线" → 没有对应的意图和工具
- "第二卷和第三卷的主题重复了" → 无法跨卷分析

根因：`general_chat` 的 workflow 定义返回**零工具动作**（`resolve: () => []`），不会注入创作上下文，不会调用只读工具，LLM 没有素材做分析。回答只能是通用协作反问。

---

## 2. 目标与范围

### 2.1 目标

1. 用户进行叙事讨论时，系统能自动识别并进入 `narrative_advisor` 模式
2. 该模式下自动注入当前小说的创作上下文（卷结构、角色状态、世界观约束、关键事件时间线）
3. 能调用只读工具查询章节内容、角色库、世界观、时间线，但**不执行任何修改操作**
4. 基于工具返回结果 + 创作上下文，生成有深度的叙事分析和修改建议

### 2.2 In Scope

**后端**：
- 意图定义层：新增 `narrative_advisor` 枚举值、意图分类 prompt 规则、别名归一化
- Workflow 层：新建 workflow definition，组合只读分析工具调用
- Prompt 层：新建叙事分析 PromptAsset，组装创作上下文 + 工具结果
- Answer Composer：新增 advisor 分支，调用叙事分析 prompt 生成回复
- 权限矩阵：确保 `narrative_advisor` 只能调用 `read`/`inspect` 类别工具

**前端**：不涉及。对话界面无需改动，分析结果以普通消息返回。

**基础设施**：不涉及。无数据库迁移、无新 API。

### 2.3 Out of Scope

- 不新增节奏曲线可视化（`analyze_pace_curve` 等高级分析工具），后续迭代
- 不新增角色弧光检查工具（`analyze_character_arc`），后续迭代
- 不新增主题一致性检查工具（`analyze_theme_consistency`），后续迭代
- 不改变现有 `general_chat` 的行为，两者共存
- 不新增前端 UI 组件
- 不涉及数据库 schema 变更

---

## 3. 需求详情

### 3.1 意图识别

WHEN 用户消息包含以下特征之一，THE SYSTEM SHALL 将意图分类为 `narrative_advisor`：
- 讨论节奏（"节奏太慢"、"冲突提前"、"高潮位置"）
- 讨论角色弧光（"角色动机不自然"、"人物成长"、"配角存在感"）
- 讨论卷间关系（"主题重复"、"跨卷伏笔"、"前后呼应"）
- 讨论整体结构（"整本书节奏"、"大纲调整"、"章节安排"）
- 请求创作分析（"帮我分析"、"看看节奏"、"检查一下"）

### 3.2 上下文注入

WHEN 意图为 `narrative_advisor` 且用户已绑定小说，THE SYSTEM SHALL 自动加载：
- 小说标题、类型、世界观名称
- 卷结构摘要（每卷主线、章节数、状态）
- 故事圣经摘要（核心设定、主要承诺、角色弧光计划）
- 最近 5 章的摘要（如有）

### 3.3 工具调用

THE SYSTEM SHALL 根据用户话题动态选择只读工具：

| 用户话题 | 可选工具 |
| -------- | -------- |
| 节奏/结构讨论 | `summarize_chapter_range`, `get_novel_context` |
| 角色讨论 | `get_character_states`, `search_knowledge` |
| 世界观讨论 | `get_world_constraints`, `get_story_bible` |
| 时间线/一致性 | `get_timeline_facts`, `audit_chapter_continuity` |
| 通用分析 | `get_novel_context`, `search_knowledge` |

**安全约束**：`narrative_advisor` 意图下，THE SYSTEM SHALL 仅允许 `category: "read"` 和 `category: "inspect"` 的工具，禁止调用 `category: "mutate"` 或 `category: "run"` 的工具。

### 3.4 回复生成

THE SYSTEM SHALL 将以下内容组装为叙事分析 prompt：
1. 用户原始问题
2. 注入的创作上下文（3.2）
3. 工具返回的结果（3.3）
4. 指导 LLM 生成结构化分析：问题诊断 → 依据引用 → 修改建议 → 注意事项

### 3.5 交互模式

`narrative_advisor` 的 `interactionMode` 固定为 `"review"`，`assistantResponse` 为 `"explain"`，确保走协作模式，不触发任何写入操作。

---

## 4. 验收标准

- [ ] 用户发送"第三幕节奏太慢了"，意图被分类为 `narrative_advisor`（而非 `general_chat`）
- [ ] 回复中包含当前小说的卷结构信息和相关章节摘要
- [ ] 回复基于实际数据（非 LLM 臆造），引用具体章节和角色
- [ ] 用户发送"这个角色的动机转变不够自然"，系统能查询角色状态并给出分析
- [ ] `narrative_advisor` 模式下不会调用任何写入工具
- [ ] `general_chat` 的现有行为不受影响
- [ ] 类型检查通过（`pnpm typecheck`）
- [ ] 意图分类相关测试通过（`pnpm --filter @ai-novel/server test:planner`）

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| 意图分类准确度：叙事讨论表达多样，可能被误分为 `general_chat` | 在 `normalizeIntentPayload()` 增加 reclassification 逻辑 |
| 上下文注入 token 量过大 | 控制摘要粒度：卷结构只注入摘要不注入全文，章节只注入最近 5 章 |
| `interactionMode` 泄漏为 `execute` | Schema 级别强制 `"review"`，不依赖 LLM 输出 |

---

## 6. 关联与边界

- 与 `general_chat` 共存：`narrative_advisor` 处理明确的叙事讨论，`general_chat` 继续处理闲聊和无关话题
- 与现有只读工具复用：`get_novel_context`、`summarize_chapter_range`、`get_character_states` 等工具无需修改，直接复用

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | 创建 | 初始版本，基于上游 issue 分析 |
