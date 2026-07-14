---
description: "REQ-2001 任务拆解"
---

# REQ-2001 任务拆解

> 状态：⏳ 进行中（完成后改为 ✅ 全部完成）

## 任务概述

### 1. 来源

用户反馈 — 导出功能已有但无法导入，需要从导出文件反向恢复数据。

### 2. 问题

导出数据后无法重新导入，只能手动逐字段填写。系统缺少导入 API 和导入 UI。

### 3. 需求

- 前端：创建新书页面增加导入入口、文件上传解析、预览 UI、表单回填
- 后端：新增导入模块（service + route + mapper）
- 共享：新增导入类型定义和校验工具

### 4. 验收标准

> 见 [REQ-2001.md](./REQ-2001.md) 第 4 节。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 共享层：新增 novelImport 类型定义与校验工具 | P0 | 0.5h | ⬜ 待开始 |
| T2 | 后端：新增 import 模块（service + mapper + route） | P0 | 3h | ⬜ 待开始 |
| T3 | 前端：ImportFromFileDialog 组件（上传/解析/预览/scope选择） | P0 | 3h | ⬜ 待开始 |
| T4 | 前端：basicScopeToFormPatch 映射工具 + NovelCreate 集成 | P0 | 2h | ⬜ 待开始 |
| T5 | 前端：ImportResultPanel 导入结果展示 | P1 | 1h | ⬜ 待开始 |
| T6 | 集成测试：端到端导入流程验证 | P1 | 2h | ⬜ 待开始 |

---

## 逐项展开

### T1: 共享层 — novelImport 类型定义与校验工具

**目标**: 定义导入请求/响应类型，提供 JSON 结构校验和摘要提取工具函数。

**改动点**:
- `shared/types/novelImport.ts` — 新建文件，定义 `NovelImportRequest`、`NovelImportScopeResult`、`NovelImportResponse`、`isValidExportBundle()`、`summarizeExportBundle()`
- `shared/types/index.ts`（或对应 barrel export） — 导出新增类型

**DoD**:
- [ ] 类型定义与 `NovelExportBundle` 对齐
- [ ] `isValidExportBundle` 能正确识别合法/非法 JSON
- [ ] `summarizeExportBundle` 返回每个 scope 的数据计数

---

### T2: 后端 — import 模块

**目标**: 实现 `POST /api/novels/:id/import` 端点，支持按 scope 批量写入数据。

**改动点**:
- `server/src/modules/import/index.ts` — 模块 facade
- `server/src/modules/import/novelImport.types.ts` — 服务端类型
- `server/src/modules/import/novelImport.service.ts` — 核心服务（逐 scope 处理 + ID 映射 + 事务写入）
- `server/src/modules/import/novelImport.mappers.ts` — ExportDTO → Prisma CreateInput 映射
- `server/src/modules/import/http/novelImport.ts` — Express 路由
- `server/src/app.ts` — 注册新路由

**DoD**:
- [ ] 5 个 scope（story_macro / character / outline|structured / chapter / pipeline）的导入逻辑
- [ ] 所有导入实体生成新 ID + 维护新旧映射
- [ ] 单 scope 失败不阻断其他 scope
- [ ] 返回每个 scope 的 success/skipped/failed 结果

---

### T3: 前端 — ImportFromFileDialog 组件

**目标**: 实现文件上传、JSON 解析校验、导入预览和 scope 选择的完整对话框组件。

**改动点**:
- `client/src/pages/novels/components/import/ImportFromFileDialog.tsx` — 新建
- `client/src/pages/novels/components/import/useExportBundleParser.ts` — 新建，文件解析 hook
- `client/src/pages/novels/components/import/ScopePreviewCard.tsx` — 新建，scope 数据摘要卡片

**DoD**:
- [ ] 支持 `.json` 文件选择
- [ ] 非法文件显示错误提示
- [ ] 预览面板展示原书名、导出时间、scope 列表
- [ ] scope 勾选（默认全选有数据的）
- [ ] 确认后回调 basic patch + scopes + rawBundle

---

### T4: 前端 — basicScopeToFormPatch + NovelCreate 集成

**目标**: 将 basic scope 数据映射到表单状态，并在 NovelCreate 页面完整接入导入流程。

**改动点**:
- `client/src/pages/novels/import/basicScopeToFormPatch.ts` — 新建，映射工具
- `client/src/pages/novels/NovelCreate.tsx` — 增加导入入口 + 导入状态管理 + 创建成功后调用导入 API
- `client/src/api/novel/core.ts` — 新增 `importNovelScopes()` API 函数

**DoD**:
- [ ] basic scope 字段正确回填到表单
- [ ] `worldId` 不回填（置空）
- [ ] `commercialTags` 数组正确转为逗号分隔文本
- [ ] 创建成功后自动调用非 basic scope 的导入 API

---

### T5: 前端 — ImportResultPanel 导入结果展示

**目标**: 在新书创建并完成导入后，展示每个 scope 的导入结果。

**改动点**:
- `client/src/pages/novels/components/import/ImportResultPanel.tsx` — 新建
- `NovelCreate.tsx` 或成功跳转后的页面 — 集成结果展示

**DoD**:
- [ ] 展示每个 scope 的 success/skipped/failed 状态
- [ ] 失败的 scope 显示具体原因
- [ ] 提供"进入项目"按钮跳转到编辑页

---

### T6: 集成测试 — 端到端导入流程

**目标**: 验证从文件上传到数据写入的完整链路。

**改动点**:
- `server/tests/import/` — 新建测试目录
- `server/tests/import/novelImport.service.test.ts` — 后端 service 测试

**DoD**:
- [ ] 用 full scope 导出文件作为测试 fixture
- [ ] 验证 basic 回填字段正确
- [ ] 验证非 basic scope 数据写入数据库
- [ ] 验证新 ID 生成和关系映射正确
- [ ] 验证单 scope 失败不影响其他 scope

---

## DoD（Definition of Done）

- 创建新书页面有"从导出文件导入"入口
- 上传 JSON 导出文件可预览并选择 scope
- basic scope 数据正确回填表单
- 非 basic scope 通过 API 写入新书
- 所有导入实体使用新 ID
- 导入结果清晰展示

---

## 依赖

- 前置依赖：无（导出模块已稳定）
- 关联依赖：无
- 后继依赖：无

---

## 验证步骤

1. 用现有项目导出 full scope JSON 文件
2. 创建新书 → 点击"从导出文件导入" → 上传文件
3. 验证预览面板显示正确的原书名和 scope 列表
4. 确认导入 → 验证表单字段正确回填
5. 提交创建 → 验证角色、大纲、章节等数据已写入新书
6. 对比原书和新书数据一致性

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-06-26 | req 路由生成任务包 | 完成 |

---

## 完成判定

- T1~T6 全部完成且 DoD 全部满足后，REQ-2001 达到"已完成"状态。
