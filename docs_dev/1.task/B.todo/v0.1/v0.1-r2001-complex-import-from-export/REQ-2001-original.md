---
description: "REQ-2001 从导出文件导入创建新书"
---

# REQ-2001 从导出文件导入创建新书

> 状态：⏳ 进行中（完成后改为 ✅ 完成）

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2001 |
| 优先级 | P1 |
| 来源 | 用户反馈 — 导出后无法重新导入 |
| 关联需求 | 无 |
| 分类 | 2xxx 核心功能开发 |
| 复杂度 | complex |

---

## 1. 背景与问题

当前系统支持将小说数据导出为 TXT / Markdown / JSON 三种格式，覆盖 8 种 scope（full / basic / story_macro / character / outline / structured / chapter / pipeline）。但**没有对应的导入功能**。

用户在以下场景会遇到阻碍：

- 导出全书 JSON 备份后，想在另一个实例或清库后恢复数据
- 导出某个步骤（如角色设定 scope）后，想在新书中复用
- 想基于已有作品的设定快速创建一本新书

目前的替代方案只有：手动逐字段填写、或直接复制 SQLite 数据库文件（仅桌面端支持），前者效率极低，后者粒度过粗。

---

## 2. 目标与范围

### 2.1 目标

1. 创建新书时支持上传此前导出的 JSON 文件，自动解析并回填对应字段
2. 用户可自由选择要导入的 scope，默认为全量导入（所有可用 scope）
3. 新书创建后，支持通过导入 API 回填角色、大纲、章节等深层数据

### 2.2 In Scope

**前端**：
- 创建新书页面（`NovelCreate`）增加"从导出文件导入"入口
- 上传 JSON 文件后的解析预览 UI（展示可导入的 scope 和数据概要）
- `basic` scope 数据自动回填到 `NovelBasicFormState` 表单字段
- 导入确认后跳转到编辑页，后续 scope 数据通过 API 批量写入

**后端**：
- 新增 `POST /api/novels/import` 端点（先创建新书再回填）
- 新增 `POST /api/novels/:id/import` 端点（向已有新书追加导入 scope 数据）
- JSON 文件解析、校验、数据映射逻辑
- 导入结果返回（成功/失败/跳过的 scope 和字段明细）

**共享**：
- 新增导入相关类型定义（`shared/types/novelImport.ts`）
- 复用 `NovelExportBundle` 作为导入源格式

### 2.3 Out of Scope

- TXT 和 Markdown 格式的导入（这两种格式丢失了结构化数据，无法精确回填）
- 增量合并（已有数据的新书覆盖导入、冲突检测）— 首版仅支持"新建 + 导入"
- 跨版本 schema 兼容（首版假设导出和导入使用同一版本的 `NovelExportBundle` 结构）
- 自动触发 auto-director 或其他 workflow（导入后由用户手动决定下一步）

---

## 3. 需求详情

### 3.1 导入入口

WHEN 用户进入创建新书页面（`/novels/create`）
THE SYSTEM SHALL 在表单区域顶部提供"从导出文件导入"按钮/卡片，与现有的"AI 导演""标题助手"等入口同级。

### 3.2 文件上传与解析

WHEN 用户选择 JSON 导出文件并上传
THE SYSTEM SHALL：
1. 在客户端读取文件内容（`FileReader`），解析为 JSON
2. 校验是否符合 `NovelExportBundle` 结构（至少包含 `metadata` 和 `sections` 字段）
3. 校验 `metadata.exportedAt` 和 `metadata.novelTitle` 是否存在
4. 若校验失败，显示具体错误信息（格式不正确 / 缺少必要字段）

### 3.3 导入预览

WHEN 文件解析成功
THE SYSTEM SHALL 展示导入预览面板：
- 原始书名（`metadata.novelTitle`）
- 导出时间（`metadata.exportedAt`）
- 可导入的 scope 列表（标记哪些 section 有数据）
- 每个 scope 的数据摘要（如"3 个角色""12 章""1 个大纲"）

### 3.4 Scope 选择

WHEN 用户查看导入预览
THE SYSTEM SHALL 显示 scope 选择面板，列出所有有数据的 scope，默认全部勾选（即全量导入）。
THE SYSTEM SHALL 允许用户取消勾选不需要的 scope，实现选择性导入。
THE SYSTEM SHALL 提供快捷操作：

- "全选"：勾选所有可用 scope（恢复默认）
- "仅项目设定"：仅勾选 basic scope
- "仅角色"：仅勾选 character scope
- "仅章节"：仅勾选 chapter scope

THE SYSTEM SHALL 至少要有一个 scope 被选中才能确认导入。

### 3.5 Basic Scope 回填

WHEN 用户确认导入且选中了 `basic` scope
THE SYSTEM SHALL 将 `sections.basic.novel` 中的字段映射到 `NovelBasicFormState` 对应字段：
- `title` → `title`
- `description` → `description`
- `targetAudience` → `targetAudience`
- `bookSellingPoint` → `bookSellingPoint`
- `competingFeel` → `competingFeel`
- `first30ChapterPromise` → `first30ChapterPromise`
- `commercialTags` → `commercialTagsText`（需序列化为逗号分隔文本）
- `genreId` → `genreId`
- `primaryStoryModeId` → `primaryStoryModeId`
- `secondaryStoryModeId` → `secondaryStoryModeId`
- `worldId` → 置空（世界绑定不能跨书复用，需用户手动选择）
- `writingMode` → `writingMode`
- `projectMode` → `projectMode`
- `narrativePov` → `narrativePov`
- `pacePreference` → `pacePreference`
- `styleTone` → `styleTone`
- `emotionIntensity` → `emotionIntensity`
- `aiFreedom` → `aiFreedom`
- `defaultChapterLength` → `defaultChapterLength`
- `estimatedChapterCount` → `estimatedChapterCount`

### 3.6 非 Basic Scope 导入

WHEN 新书创建成功且用户选中了非 basic 的 scope
THE SYSTEM SHALL 调用 `POST /api/novels/:id/import` 按 scope 逐批写入：
- `story_macro` → 写入 `StoryMacroPlan` 和 `BookContract`
- `character` → 写入 `Character`、`CharacterRelation`（ID 需重新生成）
- `outline` / `structured` → 写入 `VolumePlanDocument`
- `chapter` → 写入 `Chapter` 和 `ChapterPlan`
- `pipeline` → 写入 `NovelBible`、`PlotBeat`（其余 pipeline 数据跳过，与运行时强绑定）

### 3.7 ID 处理

WHEN 导入涉及实体 ID（character.id、chapter.id 等）
THE SYSTEM SHALL 为所有导入实体生成新 ID，不复用原始 ID。
THE SYSTEM SHALL 在导入过程中维护新旧 ID 映射，确保关系引用（如 `CharacterRelation.characterId`）指向正确的新 ID。

### 3.8 错误处理

WHEN 某个 scope 导入失败
THE SYSTEM SHALL 不阻断其他 scope 的导入。
THE SYSTEM SHALL 在导入结果中报告每个 scope 的状态（success / skipped / failed）及失败原因。

---

## 4. 验收标准

- [ ] 创建新书页面显示"从导出文件导入"入口
- [ ] 上传非 JSON 文件或格式不正确的 JSON 时，显示清晰的错误提示
- [ ] 上传合法 JSON 导出文件后，展示导入预览（原书名、scope 列表、数据摘要）
- [ ] 选择"全量导入"后，basic scope 数据正确回填到创建表单
- [ ] 创建新书后，非 basic scope 数据通过 API 正确写入新书
- [ ] 导入的角色、章节等实体拥有全新 ID，不与原始书冲突
- [ ] 某个 scope 导入失败不影响其他 scope
- [ ] 导入结果面板展示每个 scope 的成功/跳过/失败状态

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| `NovelExportBundle` 结构随版本演进可能变化 | 首版不做跨版本兼容；在导入时校验结构版本字段，不匹配时提示用户 |
| `worldId` 等外键 ID 不能跨书复用 | basic scope 回填时跳过 `worldId`，提示用户手动选择 |
| 大文件导入（含大量章节）可能导致内存压力 | 后端分 scope 处理，不在内存中同时展开全部章节内容 |
| `pipeline` scope 含运行时状态（PipelineJob 等），无法直接移植 | 仅导入 bible、plotBeats 等静态资产，跳过 PipelineJob 和 StateSnapshot |

---

## 6. 关联与边界

- 与导出模块（`server/src/modules/export/`）的关系：导入是导出的逆过程，复用 `NovelExportBundle` 类型定义，但不修改导出模块
- 与创建新书（`POST /api/novels`）的关系：basic scope 回填在客户端完成（填表单），非 basic scope 在新书创建后通过独立 API 写入
- 与 desktop 数据导入（`desktop/src/runtime/dataImport.ts`）的关系：无关联，后者是 SQLite 整库迁移

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-06-26 | 创建 | 初始版本 — req 路由生成 |
