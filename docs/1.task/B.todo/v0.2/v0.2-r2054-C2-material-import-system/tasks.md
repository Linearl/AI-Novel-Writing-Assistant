---
description: "REQ-2054 任务拆解"
update_time: 2026-07-15
---

# 任务拆解 — 多素材导入与按需加载

## 阶段零：准备

- [x] **T0.1** 确认 Prisma schema 无现有 NovelMaterial 表，确认 migration 路径
  - 验证：`pnpm typecheck` 通过
  - 估时：0.25h

- [x] **T0.2** 审阅 [架构设计文档](../../../2.tech/architecture/2026-07-15-multi-material-import-design.md)，确认无障碍
  - 估时：0.25h

## 阶段一：数据库层

- [x] **T1.1** Prisma schema 新增 `NovelMaterial` 模型
  - 文件：`server/src/prisma/schema.prisma`
  - 估时：0.5h

- [x] **T1.2** 生成迁移并执行
  - 命令：`pnpm db push`
  - 估时：0.25h

- [ ] **T1.3** 提交：`feat: 新增 NovelMaterial 表`

## 阶段二：后端 API — 材料导入

- [x] **T2.1** 新建 `server/src/modules/novel/http/novelMaterialRoutes.ts`
  - 路由注册：POST import / GET list / GET byId / PATCH / DELETE / PATCH toggle
  - Zod 校验 schema
  - 估时：2h

- [x] **T2.2** 实现 `POST /materials/import`：逐条入库 + AI 生成 description
  - 调用 `invokeStructuredLlm`（轻量，temperature=0.1）生成每条材料的 description
  - description 格式：`[类型] {角色设定|章节大纲|...}\n[摘要] {2-3句}\n[字数] {约XX字}\n[适用范围] {全阶段|规划阶段|...}`
  - 估时：1.5h

- [x] **T2.3** 实现 `GET /materials`：列表查询
  - 返回：id, title, description, wordCount, enabled, sortOrder, createdAt
  - 按 sortOrder 排序，默认正序
  - 估时：0.5h

- [x] **T2.4** 实现 `GET /materials/:id`：单篇全文
  - 返回：id, title, description, content, wordCount
  - 估时：0.5h

- [x] **T2.5** 实现 `PATCH /materials/:id`：编辑（标题/描述/排序）
  - 估时：0.5h

- [x] **T2.6** 实现 `DELETE /materials/:id` + `PATCH /materials/:id/toggle`
  - 估时：0.5h

- [x] **T2.7** 注册路由到 `novelRouteRegistration.ts`
  - 估时：0.25h

- [ ] **T2.8** 提交：`feat: 新增材料 CRUD 路由`

## 阶段三：后端 API — parse-material 改造

- [x] **T3.1** 改造 `parseMaterialBodySchema`
  - `material: z.string()` → `materials: z.array(z.object({ title: z.string(), content: z.string() }))`
  - 移除单字段 50,000 字符限制
  - 估时：0.5h

- [x] **T3.2** 改造 prompt asset `novel.material.parse` → 支持多材料输入
  - 调整 system prompt：逐篇处理 → 汇总生成 storyInput
  - storyInput 格式："概要段落...\n\n参考材料列表：\n- [类型] 标题，约XX字\n- ..."
  - 估时：1h

- [x] **T3.3** 改造 `materialParse.promptSchemas.ts` output schema
  - 新增 `storyInput?: z.string()` 字段
  - 放宽各字段上限（worldSetting/characters/outline 从 2000 → 4000）
  - 估时：0.5h

- [ ] **T3.4** 提交：`feat: parse-material 支持多材料输入 + storyInput 输出`

## 阶段四：Prompt 注入 — material_index

- [x] **T4.1** `materialGroups.ts` 新增 `material_index` 组定义
  - required: true, importance: "must"
  - 估时：0.5h

- [x] **T4.2** `NovelPromptMaterialExporter.ts` 新增 `buildMaterialIndex()` 方法
  - 查询 `NovelMaterial.findMany({ where: { novelId, enabled: true }, orderBy: { sortOrder: 'asc' } })`
  - 每条输出：标题 + description + 字数
  - 估时：1h

- [ ] **T4.3** 导演步骤 runtime 实现 B2 两轮加载逻辑
  - 涉文件：`directorCandidateStepModules.ts` 或独立中间件
  - Round 1 output schema 扩展 `requestedMaterialIds: z.array(z.string()).optional()`
  - 如果 requestedMaterialIds 非空 → 加载全文 → 追加 user message → Round 2
  - 首期覆盖：story.macro.plan / book.contract.create / chapter.draft.write
  - 估时：2h

- [ ] **T4.4** 提交：`feat: material_index context group + B2 两轮材料加载`

## 阶段五：前端 — 导入 UI

- [x] **T5.1** 改造 `MaterialParseDialog.tsx`
  - 单文件选择 → 文件夹选择（`webkitdirectory` 属性）
  - 多文件展示列表：标题（可编辑）、内容预览（前 200 字）、字数
  - 支持删除/排序
  - 估时：2h

- [x] **T5.2** 适配前端 API client
  - `materialParse.ts`：`material: string` → `materials: Array<{title, content}>`
  - 估时：0.5h

- [ ] **T5.3** 提交：`feat: MaterialParseDialog 支持文件夹多文件导入`

## 阶段六：前端 — 材料管理页

- [x] **T6.1** 新建材料管理区域（小说详情页 Tab 或独立区域）
  - 材料列表：标题 + description + 字数 + 导入时间
  - 启用/禁用开关
  - 排序调整
  - 删除
  - 估时：2h

- [x] **T6.2** 新建前端 API client `api/novel/materials.ts`
  - list / get / import / patch / delete / toggle
  - 估时：0.5h

- [x] **T6.3** 集成到项目工具面板
  - 估时：0.5h

- [ ] **T6.4** 提交：`feat: 小说详情页新增参考材料管理`

## 阶段七：验证

- [ ] **T7.1** `pnpm typecheck` 全量通过
- [ ] **T7.2** `pnpm test` 现有测试全量通过
- [ ] **T7.3** 新增路由测试（materials CRUD + parse-material 改造）
- [ ] **T7.4** 提交：`test: 材料系统路由测试`
