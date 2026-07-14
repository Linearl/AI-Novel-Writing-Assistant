---
description: "REQ-7054: Book Analysis 拆书系统 — 任务清单"
update_time: "2026-07-14"
status: requirements_ready
---

# REQ-7054: Book Analysis 拆书系统 — 任务清单

## 阶段零：需求就绪

- [x] 需求文档完成
- [x] 技术设计完成
- [x] 任务清单完成
- [x] 决策日志完成

## 阶段一：Prisma Schema（0.5d）

- [ ] T1.1: 定义 7 个 Prisma 模型（BookAnalysis, Section, SectionDraft, Character, Appearance, AppearanceTerm, Media）`参考上游 schema.prisma`
- [ ] T1.2: 执行 prisma migrate dev，验证迁移成功
- [ ] T1.3: 创建索引验证查询性能

**验收点**: prisma generate 成功，7 个模型可用

## 阶段二：服务端基础框架（1.5d）`大量参考上游 services/bookAnalysis/`

- [ ] T2.1: 创建目录结构（modules/bookAnalysis/http/, services/bookAnalysis/ 全部子目录）`参考上游目录结构`
- [ ] T2.2: 实现 shared/ 层 — types.ts, constants.ts, config.ts, status.ts, utils.ts, Schemas.ts `参考上游 shared/ 7个文件`
- [ ] T2.3: 实现 BookAnalysisService.ts（facade 入口）`参考上游 BookAnalysisService.ts`
- [ ] T2.4: 实现 BookAnalysisCommandService.ts（创建、更新、删除、导入）`参考上游 application/BookAnalysisCommandService.ts`
- [ ] T2.5: 实现 BookAnalysisQueryService.ts（查询、列表、详情）`参考上游 application/BookAnalysisQueryService.ts`
- [ ] T2.6: 实现 infrastructure/ 层 — concurrent.ts, progress.ts, queue.ts, serialization.ts `参考上游 infrastructure/ 4个文件`
- [ ] T2.7: 创建 HTTP 路由（bookAnalysisRoutes.ts, sectionRoutes, characterRoutes）`参考上游 http/`
- [ ] T2.8: 注册路由到 app.ts

**验收点**: typecheck 通过，API 可调用 CRUD

## 阶段三：文档导入与分段（1d）

- [ ] T3.1: 实现文档解析服务（TXT/DOCX/PDF）`可参考上游 generation/documentChapters.ts`
- [ ] T3.2: 实现自动分段逻辑（章节边界识别）`参考上游 documentChapters.ts`
- [ ] T3.3: 实现 sourceScope.ts（源范围管理）`参考上游 generation/sourceScope.ts`
- [ ] T3.4: 实现 optimizeSectionPreview.ts（段落预览优化）`参考上游 generation/optimizeSectionPreview.ts`
- [ ] T3.5: 添加文档导入 API 端点

**验收点**: 可导入文档并自动分段，分段列表正确展示

## 阶段四：AI 分析管线（1.5d）

- [ ] T4.1: 注册 bookAnalysis.prompts.ts（核心分析 PromptAsset）`参考上游 bookAnalysis.prompts.ts`
- [ ] T4.2: 注册 bookAnalysisChapter.prompts.ts（章节分析 Prompt）`参考上游 bookAnalysisChapter.prompts.ts`
- [ ] T4.3: 注册 bookAnalysisCharacter.prompts.ts（角色分析 Prompt）`参考上游 bookAnalysisCharacter.prompts.ts`
- [ ] T4.4: 实现 lifecycle.ts（分析生命周期管理）`参考上游 generation/lifecycle.ts`
- [ ] T4.5: 实现 overviewContext.ts（全局分析上下文）`参考上游 generation/overviewContext.ts`
- [ ] T4.6: 实现分析进度追踪 API `参考上游 infrastructure/bookAnalysis.progress.ts`
- [ ] T4.7: 实现 BookAnalysisWatchdogService（并发控制）`参考上游 application/BookAnalysisWatchdogService.ts`
- [ ] T4.8: 实现缓存和预算管理 `参考上游 caching/`

**验收点**: 可触发分段分析，5 维度分析结果正确存储

## 阶段五：角色系统（1.5d）

- [ ] T5.1: 实现 BookAnalysisCharacterService（角色提取 + 12 维画像）`参考上游 bookAnalysisCharacter/BookAnalysisCharacterService.ts`
- [ ] T5.2: 实现 BookAnalysisCharacterAppearanceService（外貌追踪）`参考上游 bookAnalysisCharacter/BookAnalysisCharacterAppearanceService.ts`
- [ ] T5.3: 实现 BookAnalysisCharacterAppearanceTermService（术语标准化）`参考上游 bookAnalysisCharacter/BookAnalysisCharacterAppearanceTermService.ts`
- [ ] T5.4: 实现 BookAnalysisCharacterMediaService（肖像生成）`参考上游 bookAnalysisCharacter/BookAnalysisCharacterMediaService.ts`
- [ ] T5.5: 实现 BookAnalysisCharacterRagAdapter（RAG 适配）`参考上游 bookAnalysisCharacter/BookAnalysisCharacterRagAdapter.ts`
- [ ] T5.6: 实现 BookAnalysisCharacterSerializers（序列化）`参考上游 bookAnalysisCharacter/BookAnalysisCharacterSerializers.ts`
- [ ] T5.7: 添加角色相关 API 端点 `参考上游 http/bookAnalysisCharacterRoutes.ts`

**验收点**: 可提取角色画像、追踪外貌变化、生成肖像

## 阶段六：发布与导出（1d）

- [ ] T6.1: 实现 bookAnalysis.export.ts（导出功能）`参考上游 publish/bookAnalysis.export.ts`
- [ ] T6.2: 实现 bookAnalysis.publish.ts（发布到小说项目）`参考上游 publish/bookAnalysis.publish.ts`
- [ ] T6.3: 实现 bookAnalysis.publish.facets.ts（Facet 发布）`参考上游 publish/bookAnalysis.publish.facets.ts`
- [ ] T6.4: 实现 bookAnalysis.sectionWriter.ts（段落写作）`参考上游 writing/bookAnalysis.sectionWriter.ts`

**验收点**: 分析结果可导出，可发布到已有小说项目

## 阶段七：前端（2d）`大量参考上游 client/src/pages/bookAnalysis/`

- [ ] T7.1: 创建前端目录结构和类型定义 `参考上游 bookAnalysis.types.ts, bookAnalysis.utils.ts`
- [ ] T7.2: 实现 BookAnalysisPage.tsx（主页面）`参考上游 BookAnalysisPage.tsx`
- [ ] T7.3: 实现 BookAnalysisDualPaneLayout.tsx（双栏布局）`参考上游 components/`
- [ ] T7.4: 实现 BookAnalysisSidebar.tsx + ChapterNavigator.tsx（导航）
- [ ] T7.5: 实现 BookAnalysisChapterReader.tsx + DetailPanel.tsx（阅读）
- [ ] T7.6: 实现 BookAnalysisStructuredSummary.tsx + SectionCard.tsx（摘要）
- [ ] T7.7: 实现 BookAnalysisCharacterPanel.tsx + CandidateCard.tsx（角色）
- [ ] T7.8: 实现 BookAnalysisCharacterAppearancePanel.tsx + ImagePanel.tsx（外貌/肖像）
- [ ] T7.9: 实现 BookAnalysisCreateDialog.tsx + SourceRangePicker.tsx（创建/分段）
- [ ] T7.10: 实现 BookAnalysisBudgetAdjustDialog.tsx + WorkspaceToolbar.tsx（预算/工具栏）
- [ ] T7.11: 实现 DiagnosisTipBanner.tsx + WorkbenchViewTabs.tsx（诊断/Tab）
- [ ] T7.12: 实现 Hooks 层（9 个 hook）`参考上游 hooks/`
- [ ] T7.13: 注册前端路由

**验收点**: 工作台界面完整可用，双栏布局、导航、角色面板正常

## 阶段八：测试与验证（1.5d）

- [ ] T8.1: 单元测试 — 服务层（分段、分析、角色、外貌、发布）
- [ ] T8.2: 单元测试 — Prompt 编译和执行
- [ ] T8.3: 集成测试 — 完整流程（导入 → 分段 → 分析 → 角色提取 → 导出）
- [ ] T8.4: typecheck 全量验证
- [ ] T8.5: E2E 测试（核心场景手动验证）
- [ ] T8.6: 更新 requirements.md 和任务包状态

**验收点**: 所有测试通过，typecheck 通过

## 依赖关系

```text
T1.x ──→ T2.x ──→ T3.x ──→ T4.x ──→ T5.x ──→ T6.x
                         └────→ T7.x（可与 T5/T6 并行）
T4.x + T5.x + T6.x + T7.x ──→ T8.x
```

## 完成标准

- [ ] 所有任务完成
- [ ] typecheck 通过
- [ ] 测试覆盖率 > 80%
- [ ] 7 个 Prisma 模型正确创建
- [ ] 5 维度分析功能可用
- [ ] 角色 12 维画像提取可用
- [ ] 外貌追踪 + 肖像生成可用
- [ ] 工作台界面完整可用
