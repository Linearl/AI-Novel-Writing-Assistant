---
description: 第二轮事实核查结果 - 上游仓库版本对比诊断报告
---

# 第二轮验证结果

> **验证对象**: `docs_dev/3.analysis/report/2026-07-14-上游仓库版本对比诊断报告.md`
> **验证日期**: 2026-07-14
> **验证方法**: 对照上游仓库实际文件逐项核查

---

## 1. 原 FAIL 项修正验证

### FAIL-1: 修改模型数 9→15/12
**判定: FIXED**
报告第19行: `15 个（含关系字段）/ 12 个（仅标量）`
通过 comm 对比两个版本 schema.prisma，确认128个共有模型中有15个被修改（含关系字段）。数字准确。

### FAIL-2: 新增 Prompt 数 12→9
**判定: NEW_ERROR（修正不完全正确）**
报告第21行概述表: `+9 个` — 总数正确（latest 144 - v0.32 135 = 9，经 diff 精确验证）。

但改进点1第31行称: `9 个新 Prompt` 归属 Book Analysis 系统 — **不正确**。
精确 diff 结果显示9个新 prompt 的归属：

| 新 Prompt | 所属模块 |
|-----------|---------|
| bookAnalysis.chapter.split@v1 | Book Analysis |
| bookAnalysis.character.appearance.consolidate@v1 | Book Analysis |
| bookAnalysis.character.appearance.merge@v1 | Book Analysis |
| bookAnalysis.character.appearance.snapshot@v1 | Book Analysis |
| bookAnalysis.character.generate@v1 | Book Analysis |
| bookAnalysis.character.identify@v1 | Book Analysis |
| bookAnalysis.character.profile@v1 | Book Analysis |
| rag.contextual_chunk.prefix@v1 | RAG |
| image.generation_prompt.assist@v1 | Image Generation |

Book Analysis 实际有 **7 个新 Prompt**（非9个），其余2个分别属于 RAG（已在改进点2正确提及）和 Image Generation（报告未提及）。

### FAIL-3: Facet 列表遗漏 sellingPointTags
**判定: FIXED**
报告第65行: `genreTags、sellingPointTags、targetReaders、strengths、weaknesses、characterRole、chapterAnchor`
经读取 chunkFacets.ts 源码确认，`RAG_CHUNK_FACET_KEYS` 数组精确包含上述7项，含 sellingPointTags。

---

## 2. 原 MISSING 项补充验证

### MISSING-1: BookAnalysis 服务层架构重构
**判定: FIXED**
报告第44行: `v0.32 中 12 个平铺文件重构为 7 个子目录...`
**但有小误**: 实际子目录为 **8 个**（非7个），遗漏了 `bookAnalysisCharacter/` 子目录。完整列表：application、bookAnalysisCharacter、caching、generation、infrastructure、publish、shared、writing。

### MISSING-2: NovelList 组件拆分
**判定: FIXED**
报告第175行: `小说列表组件从单文件拆分为 8 个提取组件`

### MISSING-3: Image Generation Runtime 子系统
**判定: FIXED**
报告第172行: `统一图片生成运行时子系统（5 文件），消除 7 个入口的重复逻辑`
经确认 `services/image/runtime/` 目录包含恰好5个文件（index.ts、references.ts、runner.ts、types.ts、utils.ts）。

### MISSING-4: Knowledge 服务扩展
**判定: FIXED**
报告第173行: `DocumentChapterService（文档章节分割）+ KnowledgePublishService（知识文档发布）`

### MISSING-5: Quality Debt Settings 服务
**判定: FIXED**
报告第174行: `低风险提案自动提升的设置管理服务`

---

## 3. 修正引入的新错误汇总

| 编号 | 位置 | 问题 | 严重度 |
|------|------|------|--------|
| NEW-ERR-1 | 改进点1第31行 | Book Analysis 系统标注 "9 个新 Prompt"，实际为 7 个 | MEDIUM |
| NEW-ERR-2 | 改进点1第44行 | 架构重构标注 "7 个子目录"，实际为 8 个（遗漏 bookAnalysisCharacter/） | LOW |
| NEW-ERR-3 | 全文 | `image.generation_prompt.assist@v1` 为新增 prompt 之一，但报告未提及 Image Generation 模块的 Prompt 新增 | LOW |

---

## 4. 随机抽查（5 项）

| # | 抽查点 | 验证方法 | 结果 |
|---|--------|---------|------|
| 1 | 概述表 +13 新模型 | diff 两个版本 schema.prisma 的 model 声明 | ✅ 13 个新模型精确匹配 |
| 2 | 概述表 +17 新迁移 | diff 两个版本 migrations 目录 | ✅ 64-47=17 精确匹配 |
| 3 | 改进点2 RAG "1 个新 Prompt" | diff registry.ts 的 key 列表 | ✅ rag.contextual_chunk.prefix@v1 为唯一新增 RAG prompt |
| 4 | 改进点2 "7 维 facet 系统" | 读取 chunkFacets.ts RAG_CHUNK_FACET_KEYS | ✅ 数组精确包含 7 项 |
| 5 | 改进点10 Image Runtime "5 文件" | ls services/image/runtime/ | ✅ 恰好 5 个文件 |

---

## 结论

**VERIFICATION NOT PASSED — 发现 2 处中低优先级新错误**

- 3 个原 FAIL 项中：2 个完全修正，1 个修正不完全（Prompt 数字正确但归属错误）
- 5 个原 MISSING 项全部补充到位（其中 BookAnalysis 架构重构的子目录数量有小误）
- 抽查 5 项全部通过
- 新引入错误均为数字/归属层面的小偏差，不影响报告核心结论和迁移建议的价值

**建议修复**:
1. 改进点1第31行: `9 个新 Prompt` → `7 个新 Prompt`（剩余2个分别归属 RAG 和 Image Generation）
2. 改进点1第44行: `7 个子目录` → `8 个子目录`（补上 bookAnalysisCharacter/）
3. 考虑在改进点6或改进点10中补充 `image.generation_prompt.assist@v1` Prompt 新增信息
