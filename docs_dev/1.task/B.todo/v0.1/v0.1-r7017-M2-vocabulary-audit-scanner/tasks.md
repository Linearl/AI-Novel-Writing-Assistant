---
description: "REQ-7017 词汇库审校扫描器 — 任务拆解"
---

# REQ-7017 任务拆解

> 状态：⏳ 进行中（T1-T5 已完成，T6-T8 待完成）

## 任务概述

### 1. 来源

木棉写作小红书 OCR 素材 + 审校体系优化需求。现有审校完全依赖 LLM，token 消耗大且可能漏报。需增加确定性词库扫描层。

### 2. 问题

审校体系缺少零成本统计层，僵尸词/隔断词/高频替换词依赖 LLM 自由裁量，缺乏一致性。现有词库素材（木棉 OCR）未结构化入库。

### 3. 需求

词汇库结构化入库 + 确定性扫描器 + 审校两处挂载 + 修复 prompt 注入 + 前端展示。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 | 依赖 |
| --- | --- | --- | --- | --- | --- |
| T1 | 词库表设计、数据模型与 YAML 数据文件 | P0 | 2h | ✅ 已完成 | 无 |
| T2 | 词汇扫描引擎核心（VocabAuditScanner 服务） | P0 | 3h | ✅ 已完成 | T1 |
| T3 | FileToDbSyncService 集成 — 启动时将 YAML 同步到数据库 | P0 | 1.5h | ✅ 已完成 | T1 |
| T4 | 完整审校集成 — AuditService.auditChapter 挂载扫描 | P0 | 2h | ✅ 已完成 | T2, T3 |
| T5 | 执行审校集成 — NovelCoreReviewService.reviewChapter 挂载扫描 | P0 | 2h | ✅ 已完成 | T2, T3 |
| T6 | 修复 Prompt 注入 — 扫描结果注入 repair context | P1 | 1.5h | ⬜ 待开始 | T2 |
| T7 | 前端展示 — 审校报告融入词汇扫描结果 | P1 | 2h | ⬜ 待开始 | T4, T5 |
| T8 | 词库数据提取 — 从木棉素材 OCR 提取并整理为 YAML | P2 | 3h | ⬜ 待开始 | T1 |

---

## 逐项展开

### T1: 词库表设计、数据模型与 YAML 数据文件

**目标**: 创建 VocabularyRule 表 + 3 个 YAML 词库文件（各不少于 20 条规则）。

**改动点**:
- `server/src/prisma/schema.sqlite.prisma` — 新增 `VocabularyRule` 模型
- `server/src/prisma/schema.prisma` — 同步新增（如有差异）
- `server/src/data/vocabularyRules/zombie-words.yaml` — 僵尸词规则（≥20 条）
- `server/src/data/vocabularyRules/replaceable-words.yaml` — 高频替换词规则（≥20 条）
- `server/src/data/vocabularyRules/disruptor-words.yaml` — 隔断词规则（≥20 条）
- `pnpm db:migrate` — 执行迁移

**验证**:
- `pnpm typecheck` 通过
- `pnpm db:migrate` 成功
- `pnpm db:studio` 可看到 VocabularyRule 表

---

### T2: 词汇扫描引擎核心（VocabAuditScanner 服务）

**目标**: 开发纯规则匹配扫描引擎，加载词库 → 匹配章节正文 → 输出结构化结果。

**改动点**:
- `server/src/services/styleEngine/VocabAuditScanner.ts` — 扫描引擎核心 [NEW]
  - `loadRules()` — 从 DB 加载所有活跃规则
  - `scan(content, rules)` — 逐条匹配，统计命中
  - `computeScorePenalty(result)` — 评分计算公式
  - `toAuditReport(result)` — 转换为 AuditReport 条目
  - `toReviewIssues(result)` — 转换为 ReviewIssue 条目

**技术要点**:
- word 匹配：`\b` 边界正则
- contains 匹配：`indexOf` 子串查找
- regex 匹配：`new RegExp(pattern, 'gi')`
- 异常处理：单条规则匹配失败不阻断整体扫描
- 空词库时返回空结果（不报错）

---

### T3: FileToDbSyncService 集成

**目标**: 启动时将 YAML 词库文件同步到 VocabularyRule 表，与已有 antiAiRules/writingTechniques 同步机制一致。

**改动点**:
- `server/src/services/styleEngine/FileToDbSyncService.ts` — 新增词汇规则同步方法
- `server/src/services/bootstrap/SystemResourceBootstrapService.ts` — 启动时触发词库同步（如需要）

**技术要点**:
- 读取 `server/src/data/vocabularyRules/*.yaml`
- 解析为 VocabularyRule 数组
- upsert 到 DB（按 `category + pattern` 判断唯一性）
- YAML 解析失败时不影响其他同步种类

---

### T4: 完整审校集成（AuditService.auditChapter）

**目标**: 在完整审校流程中，LLM 审计前先执行词库扫描，生成 AuditReport 条目 + 注入评分影响。

**改动点**:
- `server/src/services/novel/chapterEditor/AuditService.ts` — 在 `auditChapter()` 中挂载词库扫描

**逻辑顺序**:
1. VocabAuditScanner.scan(chapterContent) → VocabScanResult
2. VocabAuditScanner.toAuditReport(result) → AuditReport（auditType: "vocabulary"）
3. auditReports.push(vocabAuditReport)
4. VocabAuditScanner.computeScorePenalty(result) → 影响 overall 评分
5. 继续原 LLM 审校流程

---

### T5: 执行审校集成（NovelCoreReviewService.reviewChapter）

**目标**: 在执行审校流程中，审校前先执行词库扫描，生成 ReviewIssue 条目 + 评分衰减。

**改动点**:
- `server/src/services/novel/NovelCoreReviewService.ts` — 在 `reviewChapter()` 中挂载词库扫描

**逻辑顺序**:
1. VocabAuditScanner.scan(chapterContent) → VocabScanResult
2. VocabAuditScanner.toReviewIssues(result) → ReviewIssue[]（category: "language"）
3. allIssues.push(...vocabIssues)
4. VocabAuditScanner.computeScorePenalty(result) → 衰减评分
5. 继续原审校流程

---

### T6: 修复 Prompt 注入

**目标**: 在 AI 修复 prompt 中注入词汇扫描命中详情 + 替换建议，让 AI 修复时能针对性替换。

**改动点**:
- `server/src/prompting/prompts/novel/chapterEditor/vocabularyFix.prompts.ts` — 新 PromptAsset [NEW]
- 在已有修复 prompt 合并逻辑中追加 vocabularyFix

**Prompt 内容**:
```text
以下词汇在本文中频繁使用，建议在修复时替换：

## 僵尸词（建议替换为更具体的表达）
- "进行" x8 → 建议: "执行"、"开展"

## 高频替换词（建议使用近义词）
- "说" x15 → 建议: "低声道"、"喊道"、"喃喃道"

## 隔断词（适当减少使用频率）
- "然而" x6 → 建议: 合并短句，减少转折
```

---

### T7: 前端展示

**目标**: 词汇扫描结果作为新 AuditReport/ReviewIssue 类型，自然融入已有审校报告 UI。

**改动点**:
- `client/src/pages/writingFormula/components/ChapterExecutionReferencePanel.tsx` — quality tab 融入词库扫描
- `client/src/pages/writingFormula/components/ChapterRuntimePanels.tsx` — ChapterRuntimeAuditCard 展示 vocabulary 条目

**展示要点**:
- auditType: "vocabulary" 或 category: "language" 自然过滤
- 按类别分组显示（僵尸词 / 高频替换词 / 隔断词）
- 每项显示：命中词 + 命中次数 + 替换建议
- 复用已有 AuditReport/ReviewIssue 展示组件，不新建专用组件

---

### T8: 词库数据提取

**目标**: 从木棉写作小红书 OCR 素材中提取三类词汇，整理为 YAML 文件。

**改动点**:
- `server/src/data/vocabularyRules/zombie-words.yaml` — 补全内容（≥50 条为佳）
- `server/src/data/vocabularyRules/replaceable-words.yaml` — 补全内容（≥50 条为佳）
- `server/src/data/vocabularyRules/disruptor-words.yaml` — 补全内容（≥50 条为佳）

**数据来源**:
- 木棉写作小红书账号 OCR 提取的写作替换词素材
- 开放式补充：写作者常犯的高频词 / 僵尸词清单

**注意**: T1 中先创建 ≥20 条的初始版本；T8 是补充增强阶段，非阻塞。

---

## DoD

每个任务的完成定义：

- [ ] T1: VocabularyRule 表可写、3 个 YAML 文件存在且可解析、各 ≥20 条规则、migration 成功
- [ ] T2: VocabAuditScanner 所有方法可调、word/contains/regex 三种匹配正确、空词库不报错
- [ ] T3: 启动后 DB 中 VocabularyRule 表数据与 YAML 文件一致
- [ ] T4: AuditService.auditChapter 输出含 vocabulary 类型的 AuditReport、评分影响正确
- [ ] T5: NovelCoreReviewService.reviewChapter 输出含 language 类型的 ReviewIssue、评分衰减正确
- [ ] T6: 修复 prompt 含词库命中详情 + 替换建议
- [ ] T7: 前端审校报告可展示词库扫描结果
- [ ] T8: 三类词库各 ≥50 条规则

---

## 验证步骤

1. `pnpm typecheck` — 零错误
2. `pnpm test` — 全量通过
3. `pnpm db:migrate` — 迁移成功
4. 启动后端 → 检查 DB 中 VocabularyRule 表有数据（与 YAML 一致）
5. 对一段测试正文运行 VocabAuditScanner.scan() → 校验命中正确性
6. 完成审校流程 → AuditReport 含 vocabulary 条目
7. 前端 quality tab 展示词汇扫描命中项

---

## 完成判定

- T1~T8 全部完成且 DoD 全部满足后，REQ-7017 达到"已完成"状态。
- T8（词库数据提取）为非阻塞增强，其余 T1~T7 全部完成为最小可交付。
