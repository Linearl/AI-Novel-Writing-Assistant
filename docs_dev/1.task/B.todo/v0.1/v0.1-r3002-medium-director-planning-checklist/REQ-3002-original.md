---
description: "REQ-3002 导演进度规划资源缺失 Checklist 可视化"
---

# REQ-3002 导演进度规划资源缺失 Checklist 可视化

> 状态：⏳ 进行中（完成后改为 ✅ 完成）

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-3002 |
| 优先级 | P2 |
| 来源 | 用户体验 — 导演进度"缺少规划资源"警告信息不足 |
| 关联需求 | 无 |
| 分类 | 3xxx 用户界面和体验 |
| 复杂度 | medium |

---

## 1. 背景与问题

AI 自动导演运行时，导演进度面板（`NovelAutoDirectorProgressPanel`）会展示风险 Badge。当工作区缺少规划资源时，只显示一个笼统的 **"缺少规划资源"** Badge，用户无法得知具体缺少哪些产物类型（如 `book_contract`、`story_macro`、`character_cast` 等），也无法判断严重程度和下一步操作。

当前信息流：
1. 后端 `DirectorEventProjectionService` 计算 `inventory.missingArtifactTypes`
2. 仅将 `missingArtifactTypes.length > 0` 映射为一个 `visibleRiskBadge`（label="缺少规划资源"）
3. 前端 `DirectorRuntimeProjectionCard` 原样渲染 Badge，无展开详情

**痛点**：用户看到"缺少规划资源"但不知道缺什么、怎么补。

---

## 2. 目标与范围

### 2.1 目标

1. 将"缺少规划资源"从单个 Badge 升级为**可展开的 Checklist**
2. Checklist 展示具体缺失的产物类型及其用户友好的中文名称
3. 放置在导演进度面板的**"后台继续"按钮右侧**，方便用户快速了解当前状态
4. 后端透传 `missingArtifactTypes` 到 `DirectorRuntimeProjection`

### 2.2 In Scope

**后端**：
- `DirectorRuntimeProjection` 类型新增 `missingArtifactTypes?: DirectorArtifactType[]` 字段
- `DirectorEventProjectionService` 在构建 projection 时将 `inventory.missingArtifactTypes` 透传

**前端**：
- `DirectorRuntimeProjectionCard` 新增 `ArtifactChecklist` 内联组件
- 当 `visibleRiskBadges` 中存在 `source === "artifact"` 且 `label === "缺少规划资源"` 的 Badge 时，替换为可展开的 Checklist
- Checklist 展示缺失产物的中文名称 + 状态图标
- 新增 `DIRECTOR_ARTIFACT_DISPLAY_LABELS` 映射表（artifactType → 中文名）

**位置**：
- 在 `NovelAutoDirectorProgressPanel` 中，当有缺失产物时，在 `AITakeoverContainer` 的 actions 区域附近展示 Checklist 概览

### 2.3 Out of Scope

- 产物缺失的自动修复建议（后续迭代）
- 产物缺失的深度分析（如为什么缺失、历史变更）
- 产物详情面板（点击查看具体内容）
- 其他 Risk Badge 的展开能力（仅针对"缺少规划资源"）

---

## 3. 需求详情

### 3.1 后端透传 missingArtifactTypes

WHEN 导演进度 projection 被构建
THE SYSTEM SHALL 在 `DirectorRuntimeProjection` 中新增 `missingArtifactTypes` 字段
THE SYSTEM SHALL 该字段类型为 `DirectorArtifactType[]`，可选
THE SYSTEM SHALL 从 `DirectorEventProjectionService` 的 `inventory.missingArtifactTypes` 直接赋值

### 3.2 Artifact Checklist 组件

WHEN `DirectorRuntimeProjectionCard` 收到 projection 且 `missingArtifactTypes` 非空
THE SYSTEM SHALL 在原有"缺少规划资源"Badge 位置替换为一个可展开的 Checklist 区域
THE SYSTEM SHALL Checklist 默认**折叠**，仅显示摘要行："缺少 N 项规划资源 ▸"
THE SYSTEM SHALL 用户点击摘要行可展开/折叠

WHEN Checklist 展开
THE SYSTEM SHALL 显示每个缺失产物类型为一行，包含：
- 状态图标（○ 表示缺失）
- 中文名称（如"书级合约"、"故事宏观规划"、"角色阵容"等）
- artifactType 原文（小字灰色，辅助调试）

### 3.3 产物类型中文映射

THE SYSTEM SHALL 提供以下映射：

| artifactType | 中文名称 |
| --- | --- |
| book_contract | 书级合约 |
| story_macro | 故事宏观规划 |
| character_cast | 角色阵容 |
| volume_strategy | 卷战略 |
| chapter_task_sheet | 章节任务单 |
| chapter_draft | 章节草稿 |
| audit_report | 审计报告 |
| repair_ticket | 修复工单 |
| reader_promise | 读者承诺 |
| character_governance_state | 角色治理状态 |
| world_skeleton | 世界骨架 |
| source_knowledge_pack | 源知识包 |
| chapter_retention_contract | 章节留存合约 |
| continuity_state | 连续性状态 |
| rolling_window_review | 滚动窗口审阅 |

### 3.4 位置要求

WHEN 导演进度面板渲染且存在缺失产物
THE SYSTEM SHALL 在 `AITakeoverContainer` 的 actions 按钮区域**右侧或下方**展示 Checklist 概览
THE SYSTEM SHALL 不遮挡"后台继续"等操作按钮
THE SYSTEM SHALL Checklist 区域有明确的视觉边界（圆角卡片 + 边框）

### 3.5 降级处理

WHEN `missingArtifactTypes` 字段不存在（旧版后端）
THE SYSTEM SHALL 退化为原有的单个 Badge 显示行为
THE SYSTEM SHALL 不报错、不崩溃

---

## 4. 验收标准

- [ ] 后端 `DirectorRuntimeProjection` 包含 `missingArtifactTypes` 字段
- [ ] 后端 projection 数据中 `missingArtifactTypes` 正确反映当前缺失的产物类型
- [ ] 前端"缺少规划资源"Badge 替换为可展开 Checklist
- [ ] Checklist 折叠态显示"缺少 N 项规划资源 ▸"
- [ ] Checklist 展开态显示每个缺失产物的中文名称 + 状态图标
- [ ] Checklist 位置在"后台继续"按钮附近，不遮挡操作按钮
- [ ] 无缺失产物时不显示 Checklist 区域
- [ ] `missingArtifactTypes` 缺失时退化为原有 Badge 行为
- [ ] 类型检查通过（`pnpm typecheck`）
- [ ] 相关测试通过

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| 后端新增字段影响 projection 体积 | `missingArtifactTypes` 是字符串数组，通常 ≤5 项，体积忽略不计 |
| 产物类型中文名与实际语义不符 | 对照 `buildExpectedArtifactTypes` 的逻辑逐一确认 |
| 旧版后端无此字段 | 前端做可选链降级处理 |

---

## 6. 关联与边界

- 与 `DirectorRuntimeProjectionCard` 的关系：主要改动点，Badge → Checklist 替换
- 与 `NovelAutoDirectorProgressPanel` 的关系：Checklist 位置锚定在此组件的 actions 区域
- 与 `DirectorEventProjectionService` 的关系：数据源，需透传 `missingArtifactTypes`
- 与 `DirectorRuntimeProjection` 类型的关系：新增可选字段
- 与 `DirectorArtifactLedger` 的关系：上游计算逻辑不变

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-06-26 | 创建 | 初始版本 — req 路由生成 |
