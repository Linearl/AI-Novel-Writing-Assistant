---
description: "多素材导入与按需加载系统——NovelMaterial 表设计、接口解耦、material_index context group、B2 两轮材料加载机制"
---

# REQ-2054 多素材导入与按需加载系统

> 状态：🚧 待开发

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2054 |
| 优先级 | P1 |
| 来源 | 用户体验优化，[多素材导入架构设计](../../../2.tech/architecture/2026-07-15-multi-material-import-design.md) |
| 关联需求 | — |

---

## 1. 背景与问题

当前素材系统只支持单份文本粘贴（最大 50,000 字符），原文不持久化到数据库，解析后直接丢弃。用户无法导入多份参考材料（如角色设定、章节大纲、世界观手册等），后续写作步骤中的 AI 也无法按需查阅。

不改的后果：用户手上有 C版本 8 份规划文档无法批量导入系统，每次写章节都要手动粘贴对应材料，体验极差。

---

## 2. 目标与范围

### 2.1 目标

1. 用户可导入多份文档（文件/文件夹）作为小说参考材料
2. 每份材料独立存储，附带 AI 自动生成的描述元信息
3. 后续写作步骤中自动注入材料索引，AI 自主判断是否需要加载全文
4. `storyInput` 由 AI 汇总生成（概要 + 材料列表），而非原始全文拼接
5. 接口解耦：解析（parse）与导入（import）分离

### 2.2 In Scope

- **DB**：新增 `NovelMaterial` 表 + 迁移
- **后端 API**：
  - 改造 `POST /parse-material`：支持多份材料输入，输出新增 `storyInput`
  - 新增材料 CRUD：import、list、get、patch、delete、toggle
- **Prompt 注入**：新增 `material_index` context group + B2 两轮加载
- **前端**：
  - 导入 UI：支持文件夹选择 + 多文件管理
  - 材料管理：列表、启用/禁用、排序、删除

### 2.3 Out of Scope

- Function calling 改造 `invokeStructuredLlm`（留待后续独立任务）
- 材料版本管理/历史对比
- 材料全文搜索/RAG 索引集成
- 材料组/分类标签系统

---

## 3. 设计要点

详见 [架构设计文档](../../../2.tech/architecture/2026-07-15-multi-material-import-design.md)。核心摘要：

- `NovelMaterial` 表：id, novelId, title, description(AI生成), content, wordCount, sortOrder, enabled
- 接口 1：`POST /parse-material` → 纯解析，不写库
- 接口 2：`POST /materials/import` → 纯导入，入库 + AI 生成描述
- material_index context group：每条材料 title + description + wordCount，~200 token
- B2 两轮加载：Round 1 含 material_index → AI 输出 requestedMaterialIds → Round 2 注入材料全文

---

## 4. 验收标准

- [ ] 用户可在创建小说时导入文件夹（含多个 .txt/.md 文件）
- [ ] 每份材料入库后附带 AI 生成的描述
- [ ] 小说详情页可查看、启用/禁用、删除材料
- [ ] parse-material 返回的 storyInput 包含"概要 + 材料列表"
- [ ] 导演步骤（story.macro.plan / book.contract.create / chapter.draft.write）注入 material_index
- [ ] AI 声明 requestedMaterialIds 后材料全文自动注入 Round 2
- [ ] pnpm typecheck 通过，现有测试全部通过
- [ ] 新增 API 路由有对应的路由测试

---

## 5. 未决事项

无。方案已在对话中充分讨论并产出架构设计文档。

---

## 6. 假设

- 当前项目无 `NovelMaterial` 表，需要首次迁移
- 导演步骤运行时支持 step 内部做两次 `invokeStructuredLlm` 调用（不改造核心 LLM 模块）
- Anthropic prompt cache 在 5 分钟窗口内自动生效，无需显式配置 `cache_control`
- parse-material 的 Breaking Change 可以接受（仅前端 `MaterialParseDialog` 调用该接口，无外部消费者）
