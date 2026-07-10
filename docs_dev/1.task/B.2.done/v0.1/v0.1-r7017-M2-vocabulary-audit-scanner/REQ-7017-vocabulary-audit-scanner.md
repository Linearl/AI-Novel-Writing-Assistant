---
description: "REQ-7017 词汇库审校扫描器"
---

# REQ-7017 词汇库审校扫描器

> 状态：⏳ 进行中

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7017 |
| 优先级 | P2 |
| 来源 | 木棉写作小红书 OCR 素材 + 审校体系优化 |
| 关联需求 | 无 |
| 依赖系统 | FileToDbSyncService（已有）、AuditService、NovelCoreReviewService |

---

## 1. 背景与问题

### 1.1 现状

现有审校体系完全依赖 LLM：AuditService 的轻审校（quick audit）和完整审校（full audit）均通过 LLM 调用完成，存在以下问题：

- **Token 消耗大**：每次审校都需要将章节全文送入 LLM 进行语义分析
- **可能误报/漏报**：LLM 对高频重复词、僵尸词汇的敏感度不如确定性规则
- **无可复用的词库资产**：现有一批从木棉写作小红书账号 OCR 提取的写作替换词素材，尚未结构化入库

### 1.2 不改的后果

1. 审校成本持续增加（token 消耗随章节数量线性增长）
2. 词库资产无法复用，每次审校都是"从零开始"
3. 高频词汇问题（僵尸词、隔断词）依赖 LLM 自由裁量，缺乏一致性

---

## 2. 目标与范围

### 2.1 目标

1. 将三类写作替换词素材结构化入库（僵尸词、高频替换词、隔断词）
2. 开发纯规则匹配的词汇审校扫描器，零 token 消耗
3. 在完整审校和执行审校两处挂载扫描，生成结构化结果
4. 扫描结果注入 AI 修复 prompt，提升修复精准度
5. 前端审校报告融入词汇扫描结果，作为新类型自然融入现有 UI

### 2.2 In Scope

**后端**：
- `server/src/prisma/schema.prisma` — 新增 `VocabularyRule` 表
- `server/src/data/vocabularyRules/` — YAML 词库数据文件目录（3 个分类文件）
- `server/src/services/styleEngine/VocabAuditScanner.ts` — 扫描引擎核心服务
- `server/src/services/styleEngine/FileToDbSyncService.ts` — 集成词库同步
- `server/src/services/novel/chapterEditor/AuditService.ts` — 完整审校挂载点
- `server/src/services/novel/NovelCoreReviewService.ts` — 执行审校挂载点
- `server/src/prompting/prompts/novel/chapterEditor/vocabularyFix.prompts.ts` — 修复 prompt

**前端**：
- `client/src/components/.../ChapterExecutionReferencePanel.tsx` — quality tab 融入词库结果
- `client/src/pages/.../ChapterRuntimeAuditCard.tsx` — 新 AuditReport/ReviewIssue 类型展示

### 2.3 Out of Scope

- 不替代 LLM 审校（词库扫描是确定性辅助，不是替代品）
- 不引入 NLP/分词库（纯文本匹配，无需分词）
- 不改动评分体系的整体架构（局部注入词汇评分项）
- 不修改已有 AuditReport/ReviewIssue 的 TypeScript 类型定义结构（自然扩展）

---

## 3. 需求详情

### 3.1 词库数据层

**三类词汇素材**：

| 类别 | 说明 | 权重 | 示例 |
| ---- | ---- | ---- | ---- |
| 僵尸词 | 高频无意义词，应替换为具体表达 | 高 | "进行"、"存在"、"通过"、"具有" |
| 高频替换词 | 高频出现但可用近义词替换 | 低 | "说"、"看"、"想"、"走" |
| 隔断词 | 破坏阅读流畅性的词 | 中 | "然而"、"但是"、"不过"、"却" |

**数据模型（Prisma）**：

```prisma
model VocabularyRule {
  id          String   @id @default(uuid())
  category    String   // zombie | replaceable | disruptor
  pattern     String   // 命中模式（词/短句）
  matchType   String   // regex | contains | word
  suggestions String[] // 替换建议数组
  weight      Int      // 权重 1-10
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**YAML 文件格式**（`server/src/data/vocabularyRules/`）：

```yaml
category: zombie
rules:
  - pattern: "进行"
    matchType: word
    suggestions:
      - "执行"
      - "开展"
    weight: 8
  - pattern: "存在"
    matchType: word
    suggestions:
      - "有"
      - "出现"
    weight: 7
```

### 3.2 确定性扫描器

WHEN 对章节正文执行词汇扫描，THE SYSTEM SHALL 加载所有活跃词库规则，逐条匹配章节正文，统计每类命中数、千字命中率，输出结构化扫描结果。

**扫描输出结构**：

```typescript
interface VocabScanResult {
  summary: {
    totalHits: number;
    zombieCount: number;
    replaceableCount: number;
    disruptorCount: number;
    totalChars: number;
    hitsPerThousand: number; // 千字命中率
  };
  hits: Array<{
    category: "zombie" | "replaceable" | "disruptor";
    pattern: string;
    suggestions: string[];
    weight: number;
    occurrences: Array<{ index: number; context: string }>;
  }>;
}
```

### 3.3 挂载点 A：完整审校（步骤 6 runFullAudit）

WHEN 执行完整审校（`AuditService.auditChapter`），THE SYSTEM SHALL 在 LLM 审计前先执行词库扫描，将扫描结果作为 `AuditReport` 条目输出（`auditType: "vocabulary"`）。

**评分影响**：
- 千字僵尸词命中 < 3：不扣分
- 千字僵尸词命中 3-8：扣 5 分（overall）
- 千字僵尸词命中 > 8：扣 10 分（overall）

### 3.4 挂载点 B：执行审校（步骤 7 reviewChapter）

WHEN 执行审校（`NovelCoreReviewService.reviewChapter`），THE SYSTEM SHALL 在审校前先执行词库扫描，将扫描结果生成 `ReviewIssue` 条目（`category: "language"`），携带替换建议。

评分衰减公式同上（3.3 节）。

### 3.5 修复 Prompt 注入

WHEN AI 修复阶段需要针对性替换，THE SYSTEM SHALL 在修复 prompt 中注入扫描命中详情（词汇 + 位置 + 替换建议），让 AI 修复时能针对性替换。

### 3.6 前端展示

WHEN 审校报告渲染，THE SYSTEM SHALL 将词汇扫描结果作为新的 `AuditReport`/`ReviewIssue` 类型，自然融入 `ChapterExecutionReferencePanel` 的 quality tab 和 `ChapterRuntimeAuditCard` 展示。

---

## 4. 验收标准

- [ ] VocabularyRule 表创建并可写入
- [ ] 三类词库 YAML 文件存在且格式正确（各不少于 20 条规则）
- [ ] VocabAuditScanner 可加载词库并扫描章节正文，返回结构化结果
- [ ] FileToDbSyncService 启动时将 YAML 词库同步到 DB
- [ ] AuditService.auditChapter 执行前先进行词库扫描，生成 AuditReport（auditType: "vocabulary"）
- [ ] NovelCoreReviewService.reviewChapter 执行前先进行词库扫描，生成 ReviewIssue（category: "language"）
- [ ] 扫描结果注入修复 prompt，AI 收到替换建议
- [ ] 前端审校报告展示词库扫描命中项
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] 词库扫描不消耗 LLM token（纯规则匹配）

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| 词库覆盖不全导致漏报 | 词库可持续扩展；LLM 审校作为兜底 |
| 纯文本匹配误报（如对话中的"说"） | 预留上下文检查字段，可后续添加排除规则 |
| 文件同步频率冲突 | 复用 FileToDbSyncService 已有同步机制，不新增独立同步 |
| 评分体系侵入性修改 | 局部注入词汇评分项，不修改评分体系整体架构 |
| AI-First 原则冲突 | 词库匹配是确定性辅助，不是替代 LLM 审校；LLM 审校仍然是核心路径 |

---

## 6. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-10 | 创建 | 基于木棉 OCR 素材 + 审校体系优化需求生成 |
