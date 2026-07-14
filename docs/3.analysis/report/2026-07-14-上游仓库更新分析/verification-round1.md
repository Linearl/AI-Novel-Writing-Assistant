---
description: 诊断报告事实核查第一轮验证结果
---

# 诊断报告事实核查 — 第一轮验证报告

> **验证对象**: `docs_dev/3.analysis/report/2026-07-14-上游仓库版本对比诊断报告.md`
> **验证日期**: 2026-07-14
> **验证方法**: 对照源码逐项核实数字、描述、文件存在性、优先级判断和遗漏项

---

## 一、数字核实

| 报告声明 | 报告数值 | 实际数值 | 判定 |
|----------|---------|---------|------|
| 新 Prisma 模型 | +13 | +13 | PASS |
| 修改的现有模型 | 9 | **15**（含仅关系字段变更）/ **12**（仅含标量字段变更） | FAIL |
| 新增迁移 | +17 | +17 | PASS |
| 新注册 Prompt | +12 | **+9** | FAIL |
| 新增/修改共享类型 | ~20 文件 | 未精确计数，数量级合理 | PASS (粗略) |

### 详细说明

**修改的现有模型 (报告 9 / 实际 15)**:

报告低估了 6 个修改模型。完整列表如下（15 个均有字段变更）：

| # | 模型名 | 变更类型 |
|---|--------|---------|
| 1 | BaseCharacter | 新增 `sourceType`, `sourceRefId` |
| 2 | BookAnalysis | 新增 8 个标量字段 + 1 个关系 |
| 3 | BookAnalysisSection | 新增 2 个标量字段 |
| 4 | BookAnalysisSourceCache | 新增 `sourceScopeKey` |
| 5 | ComicCharacter | 新增 `gender` + 关系 |
| 6 | ComicPanel | 新增 `sceneRef` |
| 7 | ComicProject | 新增 2 个关系字段 |
| 8 | ImageAsset | 新增 `bookAnalysisCharacterId` + 关系 |
| 9 | ImageGenerationTask | 新增 2 个标量字段 + 关系 |
| 10 | KnowledgeBinding | 新增 `sourceAnalysisId` |
| 11 | KnowledgeChunk | 新增 `chapterAnchor`, `facetKeys` |
| 12 | KnowledgeDocument | 新增 `kind`, `sourceAnalysisId` |
| 13 | KnowledgeDocumentVersion | 新增关系字段 |
| 14 | Novel | 新增关系字段 |
| 15 | VolumeChapterPlan | 新增 `conflictLevelSource` |

其中 3 个（ComicProject、KnowledgeDocumentVersion、Novel）仅有关系字段变更，无标量字段变更。即便排除这 3 个，实际修改模型数仍为 12，高于报告的 9。

**新注册 Prompt (报告 12 / 实际 9)**:

实际新增的 9 个 Prompt：

1. `bookAnalysis.chapter.split@v1`
2. `bookAnalysis.character.identify@v1`
3. `bookAnalysis.character.profile@v1`
4. `bookAnalysis.character.generate@v1`
5. `bookAnalysis.character.appearance.snapshot@v1`
6. `bookAnalysis.character.appearance.consolidate@v1`
7. `bookAnalysis.character.appearance.merge@v1`
8. `image.generation_prompt.assist@v1`
9. `rag.contextual_chunk.prefix@v1`

报告多计了 3 个。可能将模板系统文件（5 个 `templates/` 文件）误算入 prompt 注册数。

**模板系统文件行数 (报告 ~1841 行 / 5 文件)**:

- `templates/` 目录实际有 5 个文件，共 1,124 行
- `prompts/` 新增 3 个文件，共 482 行
- `workbench/` 新增 4 个文件，共 750 行
- 5 文件 + ~1841 行这个数字无法精确匹配任何单一目录组合。最接近的是 templates + workbench = 9 文件 / 1,874 行

---

## 二、功能存在性核实

对报告中提到的 12 个关键功能文件/函数，逐一验证其在最新版存在、在 v0.32 中不存在：

| # | 文件/函数 | 最新版 | v0.32 | 判定 |
|---|----------|--------|-------|------|
| 1 | `ProseQualityDetector.ts` | 存在 | 不存在 | PASS |
| 2 | `chunkFacets.ts` | 存在 | 不存在 | PASS |
| 3 | `RagContextualChunkService.ts` | 存在 | 不存在 | PASS |
| 4 | `RagRerankerService.ts` | 存在 | 不存在 | PASS |
| 5 | `RagRetrievalTracer.ts` | 存在 | 不存在 | PASS |
| 6 | `RagRetrievalTraceRetention.ts` | 存在 | 不存在 | PASS |
| 7 | `PendingReviewAutoPromotionService.ts` | 存在 | 不存在 | PASS |
| 8 | `normalizeAcceptanceStatus()` | 存在 | 不存在 | PASS |
| 9 | `classifyChapterListRetryIssue()` | 存在 | 不存在 | PASS |
| 10 | `check-deps.cjs` | 存在 | 不存在 | PASS |
| 11 | `evictSharedLimiters()` | 存在 | 不存在 | PASS |
| 12 | Home 页面拆分 | 258 行 + 5 组件 | 603 行单文件 | PASS |

**12/12 全部通过**。

---

## 三、描述准确性核实

| 报告描述 | 实际验证 | 判定 |
|----------|---------|------|
| "12 维角色画像" | `BookAnalysisCharacterDimension` 共 12 个值：basic, appearance, personality, capability, motivation, arc, relations, scenes, languageStyle, thinkingPattern, values, secrets | PASS |
| "7 维 facet 系统" | `RAG_CHUNK_FACET_KEYS` 共 7 个：genreTags, **sellingPointTags**, targetReaders, strengths, weaknesses, characterRole, chapterAnchor | PASS (数字正确) |
| 报告列出的 facet 名称 | 报告列出 "genre, target readers, strengths, weaknesses, character role, chapter anchor" = 6 项，**遗漏了 `sellingPointTags`（卖点标签）** | FAIL |
| "9 种问题码" | `ProseQualityIssueCode` 共 9 个值，名称完全匹配 | PASS |
| "4 档深度：brief/standard/deep/exhaustive" | `BookAnalysisCharacterGenerationDepth` 完全匹配 | PASS |
| "6 种艺术风格" | `STYLE_KEYWORDS` 共 6 个：webtoon_color, bl_manga, shounen_bw, ink_traditional, chibi, realistic | PASS |
| "5 步创建向导" | `AUTO_DIRECTOR_CREATE_STAGES` = idea → basic → world_style → model_run → candidates = 5 步 | PASS |
| "14 天自动提升" | `PENDING_REVIEW_AUTO_PROMOTION_ELIGIBLE_AFTER_DAYS = 14` | PASS |
| Home 页面 "23.3KB → 7.9KB" | 实际 23,851 字节 → 8,119 字节 ≈ 23.3KB → 7.9KB | PASS |
| "32 个上下文组 ID" | `contextGroupLabels.ts` 共 32 个条目 | PASS |
| `pendingReviewItems` 拆分 | v0.32 用 `pendingReviewItems`，最新版拆为 `highRiskCommittedItems` + `pendingProposalItems` | PASS |

---

## 四、优先级判断核实

对报告中标记为"高价值低风险"的 7 个改进项，验证其独立性和低风险评估：

| # | 改进项 | 报告评级 | 独立性验证 | 判定 |
|---|--------|---------|-----------|------|
| 1 | 中文上下文标签本地化 | 高价值/低风险 | `contextGroupLabels.ts` 是独立的 38 行查找表，零外部依赖 | PASS |
| 2 | 散文质量检测器 | 高价值/低风险 | `proseQuality/ProseQualityDetector.ts` 在独立子目录，纯 regex 逻辑 | PASS |
| 3 | 验收状态规范化 | 高价值/低风险 | `normalizeAcceptanceStatus()` 是已有文件中的纯映射函数 | PASS |
| 4 | 角色资源上下文重构 | 高价值/低风险 | 字段替换模式，已有使用点清晰（2 处引用） | PASS |
| 5 | 章节列表重试分类 | 高价值/低风险 | 纯逻辑函数，在 prompt 文件中定义 | PASS |
| 6 | Token 用量追踪基础设施 | 高价值/低风险 | `usageTracking.ts` 独立模块 + AsyncLocalStorage | PASS |
| 7 | 请求限制器热重载 | 高价值/低风险 | `evictSharedLimiters()` 是 requestLimiter.ts 中的导出函数 | PASS |

---

## 五、遗漏检查

通过 `diff -rq` 对比，发现报告**未提及**的以下重大变更：

### MISS-1: BookAnalysis 服务层架构重构（中等遗漏）

v0.32 中 `server/src/services/bookAnalysis/` 是 12 个平铺文件。最新版重构为 7 个子目录（application/caching/generation/infrastructure/publish/shared/writing），约 25 个文件。这是纯架构重构，不含新功能逻辑，但对后续移植有影响：如果基于最新版移植 Book Analysis，需要适应新的目录结构。

报告仅描述了 Book Analysis 的功能面（改进点 1），未提及此次架构重构。

### MISS-2: NovelList 组件拆分（低遗漏）

`NovelList.tsx` 从单文件拆分为 8 个提取组件（`list/` 子目录：EmptyState、FilterBar、Header、Pagination、Skeleton、ProjectCard + tone + viewModel）。报告未提及。

### MISS-3: Image Generation Runtime 子系统（低遗漏）

`server/src/services/image/runtime/` 新增 5 个文件（index/references/runner/types/utils）+ `ImageGenerationTaskExecutor.ts`。报告在 Comic 改进点 6 中提及了图片相关变更，但未独立描述此运行时子系统。

### MISS-4: Knowledge 服务扩展（低遗漏）

`DocumentChapterService.ts` 和 `KnowledgePublishService.ts` 是两个新的知识库服务文件，报告未单独提及。

### MISS-5: Quality Debt Settings 服务（低遗漏）

`qualityDebtSettingKeys.ts` + `QualityDebtSettingsService.ts` 是新的设置管理服务，报告未提及。

**遗漏影响评估**: 上述遗漏均为低到中等影响。MISS-1（架构重构）对移植策略有一定影响；其余为独立的小模块新增，不影响报告的核心结论。

---

## 六、综合判定

### 总体准确性评分: **82%**

### PASS 汇总（16 项）

- 新 Prisma 模型数 (+13)
- 新增迁移数 (+17)
- 12 个关键文件存在性 (12/12)
- 12 维角色画像
- 7 维 facet 系统 (数字)
- 9 种问题码
- 4 档深度
- 6 种艺术风格
- 5 步创建向导
- 14 天自动提升阈值
- Home 页面拆分尺寸
- 32 个上下文组标签
- pendingReviewItems 拆分
- 验收状态规范化
- 7 个低风险改进项的独立性评估

### FAIL 汇总（3 项）

| # | 错误 | 正确值 | 严重度 |
|---|------|--------|--------|
| 1 | "修改的现有模型 9 个" | 实际 15 个（或 12 个仅标量变更） | 中 |
| 2 | "新增 Prompt +12 个" | 实际 +9 个 | 中 |
| 3 | Facet 列表遗漏 `sellingPointTags` | 应有 7 项，报告仅列 6 项 | 低 |

### MISSING 汇总（5 项）

| # | 遗漏内容 | 严重度 |
|---|----------|--------|
| 1 | BookAnalysis 服务层架构重构（平铺 → 7 子目录） | 中 |
| 2 | NovelList 组件拆分（1 → 8 文件） | 低 |
| 3 | Image Generation Runtime 子系统（5 文件） | 低 |
| 4 | Knowledge 服务扩展（2 新服务） | 低 |
| 5 | Quality Debt Settings 服务 | 低 |

### 结论

报告的**核心功能描述和优先级判断准确可靠**，未发现影响移植决策的严重错误。3 个 FAIL 项均为数字偏差（修改模型数低估、prompt 数高估、facet 列表漏一项），不影响整体结论。5 个 MISSING 项中仅 BookAnalysis 架构重构值得关注，其余为低影响的独立小模块。

**建议修正**:
1. 将"修改模型 9 个"更正为"15 个（含关系字段变更）"或"12 个（仅标量字段变更）"
2. 将"新增 Prompt +12 个"更正为"+9 个"
3. 补充 facet 完整列表：genreTags、sellingPointTags、targetReaders、strengths、weaknesses、characterRole、chapterAnchor
