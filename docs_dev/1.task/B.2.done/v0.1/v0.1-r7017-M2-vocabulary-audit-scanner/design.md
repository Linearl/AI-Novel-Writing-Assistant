---
description: "REQ-7017 词汇库审校扫描器 — 方案设计"
---

# REQ-7017 方案设计

## 1. 方案概述

在 `server/src/services/styleEngine/` 下新增 `VocabAuditScanner` 服务，实现纯文本规则匹配引擎。词库数据通过 YAML 文件存储 + FileToDbSyncService 同步到 SQLite，扫描时从 DB 加载活跃规则。在 AuditService 和 NovelCoreReviewService 两处挂载，输出审计报告和修复建议。

### 1.1 设计目标

1. 零 LLM token 消耗 — 纯规则匹配
2. 与已有 FileToDbSyncService 同步机制一致 — 复用 precedent（antiAiRules、writingTechniques）
3. 与已有审校体系自然融合 — 不引入新类型框架
4. 词库可扩展 — 增删改规则无需改代码

### 1.2 关键决策

| # | 决策 | 理由 |
|---|------|------|
| D-01 | 词库用 YAML + FileToDbSyncService，不用独立 JSON 文件 | 与已有 antiAiRules/writingTechniques 同步机制一致 |
| D-02 | 扫描结果作为 AuditReport 条目（auditType: "vocabulary"），不另建表 | 复用已有审校报告基础设施，前端无需全新组件 |
| D-03 | 纯文本匹配，不引入分词库 | 降低复杂度；后续可按需添加 |
| D-04 | 评分只影响 overall，不引入新维度 | 避免侵入评分体系整体架构 |
| D-05 | 修复 prompt 在已有 PromptAsset 体系内注册 | 符合 Prompt Governance 规则 |

### 1.3 不在范围

- 不替代 LLM 审校
- 不引入 NLP/分词库
- 不修改评分体系架构

## 2. 架构与数据流

### 2.1 文件结构

```
server/src/
├── prisma/
│   └── schema.sqlite.prisma              # 新增 VocabularyRule 表
├── data/
│   └── vocabularyRules/
│       ├── zombie-words.yaml             # 僵尸词规则
│       ├── replaceable-words.yaml         # 高频替换词规则
│       └── disruptor-words.yaml           # 隔断词规则
├── services/
│   └── styleEngine/
│       ├── VocabAuditScanner.ts           # 扫描引擎核心 [NEW]
│       └── FileToDbSyncService.ts         # 词库同步集成 [MODIFY]
├── services/
│   └── novel/
│       ├── chapterEditor/
│       │   └── AuditService.ts            # 完整审校挂载 [MODIFY]
│       └── NovelCoreReviewService.ts      # 执行审校挂载 [MODIFY]
├── prompting/
│   └── prompts/
│       └── novel/
│           └── chapterEditor/
│               └── vocabularyFix.prompts.ts  # 修复 prompt [NEW]
```

### 2.2 数据流

```
[启动] → FileToDbSyncService.syncAllFromFileSystem()
           → 读取 server/src/data/vocabularyRules/*.yaml
           → upsert 到 VocabularyRule 表

[完整审校] → AuditService.auditChapter()
              → VocabAuditScanner.scan(chapterContent)
              → 返回 VocabScanResult
              → 转换为 AuditReport 条目
              → 注入评分影响

[执行审校] → NovelCoreReviewService.reviewChapter()
              → VocabAuditScanner.scan(chapterContent)
              → 返回 VocabScanResult
              → 转换为 ReviewIssue 条目
              → 衰减评分

[AI 修复] → 修复 prompt 中注入 VocabScanResult.hits
            → AI 收到替换建议（词汇 + 位置 + 建议替代词）
```

### 2.3 匹配引擎设计

VocabAuditScanner 核心逻辑：

```typescript
class VocabAuditScanner {
  // 从 DB 加载所有 active=true 的规则
  async loadRules(): Promise<VocabularyRule[]>

  // 扫描正文
  scan(content: string, rules: VocabularyRule[]): VocabScanResult {
    // 对每条规则，根据 matchType 执行匹配
    // - word: 用 \b 边界匹配
    // - contains: indexOf 子串匹配
    // - regex: new RegExp(pattern, 'gi')
    // 统计命中，组装 VocabScanResult
  }

  // 评分计算
  computeScorePenalty(result: VocabScanResult): number {
    // 千字僵尸词命中数 → 扣分规则
  }
}
```

## 3. 数据模型

### 3.1 Prisma Schema

```prisma
model VocabularyRule {
  id          String   @id @default(uuid())
  category    String   // zombie | replaceable | disruptor
  pattern     String   // 命中词/短语/正则
  matchType   String   // word | contains | regex
  suggestions String   // JSON 数组字符串（SQLite 无原生数组）
  weight      Int      @default(5)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 3.2 YAML 词库格式

```yaml
# zombie-words.yaml
category: zombie
label: 僵尸词
description: 高频无意义词，应替换为具体表达
rules:
  - pattern: "进行"
    matchType: word
    suggestions:
      - "执行"
      - "开展"
    weight: 8
```

### 3.3 扫描结果类型

```typescript
interface VocabHit {
  category: "zombie" | "replaceable" | "disruptor";
  pattern: string;
  suggestions: string[];
  weight: number;
  occurrences: VocabOccurrence[];
}

interface VocabOccurrence {
  index: number;       // 在原文中的字符位置
  context: string;     // 前后 20 字上下文
}

interface VocabScanSummary {
  totalHits: number;
  zombieCount: number;
  replaceableCount: number;
  disruptorCount: number;
  totalChars: number;
  zombiePerThousand: number;
  disruptorPerThousand: number;
  replaceablePerThousand: number;
}

interface VocabScanResult {
  summary: VocabScanSummary;
  hits: VocabHit[];
}
```

## 4. 挂载点设计

### 4.1 AuditService 集成

在 `auditChapter()` 方法的 LLM 审计前插入：

```typescript
// 词库扫描（零 token 消耗）
const vocabResult = await vocabAuditScanner.scan(chapterContent);

// 生成 AuditReport 条目
const vocabAuditReport = vocabAuditScanner.toAuditReport(vocabResult);
auditResults.push(vocabAuditReport);

// 评分影响
const vocabPenalty = vocabAuditScanner.computeScorePenalty(vocabResult);
finalScore.overall = Math.max(0, finalScore.overall - vocabPenalty);
```

### 4.2 NovelCoreReviewService 集成

在 `reviewChapter()` 方法的审校前插入：

```typescript
// 词库扫描
const vocabResult = await vocabAuditScanner.scan(chapterContent);

// 生成 ReviewIssue 条目
const vocabIssues = vocabAuditScanner.toReviewIssues(vocabResult);
allIssues.push(...vocabIssues);

// 评分衰减（同 AuditService）
```

### 4.3 修复 Prompt 注入

新增 PromptAsset：`server/src/prompting/prompts/novel/chapterEditor/vocabularyFix.prompts.ts`

```typescript
export const vocabularyFixPrompt: PromptAsset = {
  id: "novel.chapterEditor.vocabularyFix",
  // system prompt 注入 VocabScanResult.hits
  // 格式："以下词汇建议替换：\n- "进行"（僵尸词）→ 建议用"执行""开展"\n  ..."
};
```

在已有修复 prompt 合并逻辑中追加 vocabularyFixPrompt。

## 5. 接口定义

无新增 API 接口（词库扫描作为内部服务消费）。

## 6. 异常处理

| 场景 | 处理方式 |
| ---- | -------- |
| 词库为空（YAML 文件不存在或 DB 无数据） | 跳过扫描，返回空结果，不阻断审校流程 |
| DB 查询失败 | 降级到直接读取 YAML 文件；仍失败则跳过扫描 |
| 正则表达式异常 | 捕获异常，跳过该条规则，继续处理其余规则 |

## 7. 验证策略

1. **单元测试**：
   - VocabAuditScanner.scan() — 各类 matchType 的匹配正确性
   - VocabAuditScanner.computeScorePenalty() — 评分公式正确性
   - VocabAuditScanner.toAuditReport() / toReviewIssues() — 类型转换正确性
2. **集成测试**：
   - FileToDbSyncService 词库同步 → DB 校验
   - AuditService 挂载后 AuditReport 含 vocabulary 条目
3. **typecheck + 全量测试**
