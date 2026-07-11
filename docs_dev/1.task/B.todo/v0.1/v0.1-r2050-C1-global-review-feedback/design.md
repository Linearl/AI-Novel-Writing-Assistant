---
description: "REQ-2050 方案设计"
---

# REQ-2050 方案设计

## 1. 方案概述

在现有逐章审校体系基础上，新增全局审校能力。全局审校从全书视角检测跨章节问题（角色一致性、伏笔呼应、情节连贯性、节奏、设定自洽），输出结构化的跨章节问题清单，持久化到 GlobalReviewIssue 表，并回灌到逐章审校 context 中，形成"全局发现问题 → 逐章修复"的闭环。

### 1.1 设计目标

1. 跨章节视角：从全书层面检测逐章审校无法发现的问题
2. 闭环修复：全局审发现的问题回灌到逐章审校，引导逐章修复
3. 自动裁剪：按 320K token budget 自动裁剪章节范围
4. 双触发：手动触发 + 卷完成自动触发
5. 状态追踪：问题状态全生命周期管理（pending → acknowledged → fixed / dismissed）

### 1.2 关键决策

1. **手动 + 卷完成自动触发**：用户可控 + 自动兜底
2. **与逐章审互补**：逐章审先跑，全局审补充跨章节问题
3. **角色弧线从 growthPath 推导**：复用 story_macro 数据，不新建表
4. **320K token budget**：覆盖约 37 章，超出时自动裁剪
5. **结构化输出 crossChapterIssues**：便于解析和持久化
6. **回灌通过 GlobalReviewIssue 表 + context block**：持久化 + 低侵入注入

### 1.3 不在范围

- 全局审校结果的前端展示 UI
- 跨书籍审校
- 全局审校的自动修复（仅输出修复方向）

---

## 2. 数据模型

### 2.1 GlobalReviewIssue Prisma Model

```prisma
model GlobalReviewIssue {
  id                String   @id @default(cuid())
  novelId           String
  reviewRunId       String
  severity          String   // critical | major | minor
  category          String   // character_consistency | plot_continuity | foreshadowing | pacing | worldbuilding
  description       String
  fixDirection      String
  affectedChapters  String   // JSON array of chapter IDs
  primaryFixChapter String?  // chapter ID where main fix should happen
  status            String   @default("pending") // pending | acknowledged | fixed | dismissed
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  novel Novel @relation(fields: [novelId], references: [id], onDelete: Cascade)

  @@index([novelId, reviewRunId])
  @@index([novelId, status])
  @@index([primaryFixChapter, status])
}
```

### 2.2 字段说明

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| novelId | String | 关联小说 ID |
| reviewRunId | String | 本次全局审校运行标识（UUID） |
| severity | String | 问题严重程度：critical / major / minor |
| category | String | 问题类别：character_consistency / plot_continuity / foreshadowing / pacing / worldbuilding |
| description | String | 问题描述 |
| fixDirection | String | 修复方向建议 |
| affectedChapters | String | 受影响章节 ID 列表（JSON 数组） |
| primaryFixChapter | String? | 主要修复应在的章节 ID |
| status | String | 处理状态：pending / acknowledged / fixed / dismissed |

---

## 3. 全局审 prompt 设计

### 3.1 Prompt 结构

```
system prompt:
  - 角色：全局审校专家
  - 任务：从跨章节视角审校小说，检测一致性、连贯性、伏笔呼应等问题
  - 输出格式：crossChapterIssues 数组

user prompt:
  - 全局层上下文（book_contract, story_macro, 角色弧线, 伏笔总账）
  - 章节层上下文（每章摘要 + 全文）
  - 指令：输出跨章节问题清单
```

### 3.2 审校维度

| 维度 | 检测内容 | 典型问题 |
| ---- | ---- | ---- |
| character_consistency | 性格、称谓、能力设定 | 角色 A 在第 3 章怕蛇，第 8 章却养蛇 |
| plot_continuity | 时间线、因果链 | 第 5 章提到"三天后出发"，第 6 章开头就到了 |
| foreshadowing | 伏笔埋设 vs 回收 | 第 2 章提到的神秘人到结局未出现 |
| pacing | 张力曲线、信息密度 | 连续 5 章低张力，读者可能弃书 |
| worldbuilding | 世界观、规则体系 | 第 1 章说魔法有代价，第 10 章无代价使用 |

### 3.3 输出 Schema

```json
{
  "crossChapterIssues": [
    {
      "severity": "critical",
      "category": "character_consistency",
      "description": "角色'林风'在第3章表现出内向性格，但在第8章突然外向社交，缺乏性格转变铺垫",
      "fixDirection": "在第4-7章之间添加性格渐变的过渡章节，或在第8章增加触发事件解释性格转变",
      "affectedChapters": ["chapter_3_id", "chapter_8_id"],
      "primaryFixChapter": "chapter_8_id"
    }
  ]
}
```

---

## 4. Context 结构

### 4.1 全局层（注入一次，~8K tokens）

```
<global_review_context>
  <book_contract>
    {book_contract 内容} ~1K
  </book_contract>

  <story_macro>
    {story_macro 内容} ~1K
  </story_macro>

  <character_arc_planning>
    {从 growthPath + characterDynamics 推导的角色弧线} ~3K
  </character_arc_planning>

  <foreshadow_ledger>
    {伏笔总账} ~2K
  </foreshadow_ledger>

  <current_volume_overview>
    {当前卷概览} ~1K
  </current_volume_overview>
</global_review_context>
```

### 4.2 章节层（每章 ~6-10K tokens）

```
<chapter_entries>
  <chapter id="{chapter_id}" order="{order}">
    <structured_summary>
      {结构化摘要} ~1K
      - 剧情推进
      - 角色行为
      - 伏笔变化
      - 未解决钩子
      - 质量分数
    </structured_summary>
    <full_text>
      {全文} ~5-9K
    </full_text>
  </chapter>
  ...
</chapter_entries>
```

### 4.3 Token Budget 分配

```
总预算: 320K tokens
├── 系统 prompt + 输出格式: ~2K
├── 全局层（注入一次）: ~8K
│   ├── book_contract: ~1K
│   ├── story_macro: ~1K
│   ├── 角色弧线规划: ~3K
│   ├── 伏笔总账: ~2K
│   └── 当前卷概览: ~1K
├── 章节层（每章 ~8K）: ~300K
│   ├── 结构化摘要: ~1K
│   └── 全文: ~5-9K
└── 预留输出: ~10K

可审章节数: ~300K / 8K ≈ 37章
```

---

## 5. 回灌机制流程图

```
全局审校完成
  |
  v
解析 crossChapterIssues 数组
  |
  v
写入 GlobalReviewIssue 表（status = 'pending'）
  |
  v
逐章审校开始
  |
  v
查询 GlobalReviewIssue WHERE
  novelId = 当前小说
  AND status = 'pending'
  AND affectedChapters 包含当前章
  |
  v
注入 context block "global_review_feedback"
  priority: 105（高于 chapter_mission 的 100）
  |
  v
逐章审校 LLM 审校时
  参考 global_review_feedback 中的跨章节问题
  在逐章审校结果中标注相关问题
```

---

## 6. API 设计

### 6.1 POST /api/novels/:id/global-review

**请求**:

```json
{
  "scope": "currentVolume" | "range",
  "startOrder": 1,      // 仅 scope = "range" 时需要
  "endOrder": 10        // 仅 scope = "range" 时需要
}
```

**响应**:

```json
{
  "reviewRunId": "uuid",
  "status": "completed" | "in_progress",
  "chaptersReviewed": 12,
  "issuesFound": 5,
  "issues": [
    {
      "id": "issue_id",
      "severity": "critical",
      "category": "character_consistency",
      "description": "...",
      "primaryFixChapter": "chapter_id"
    }
  ]
}
```

### 6.2 GET /api/novels/:id/global-review-issues

**查询参数**:

- `status`: 按状态过滤（pending / acknowledged / fixed / dismissed）
- `category`: 按类别过滤
- `severity`: 按严重程度过滤
- `chapterId`: 查询影响某章的所有 issue

**响应**:

```json
{
  "issues": [
    {
      "id": "issue_id",
      "reviewRunId": "uuid",
      "severity": "critical",
      "category": "character_consistency",
      "description": "...",
      "fixDirection": "...",
      "affectedChapters": ["chapter_id_1", "chapter_id_2"],
      "primaryFixChapter": "chapter_id_1",
      "status": "pending",
      "createdAt": "2026-07-12T..."
    }
  ],
  "total": 5
}
```

---

## 7. Scope 选择 + Token Budget 裁剪

### 7.1 Scope 解析

```typescript
interface GlobalReviewScope {
  type: 'currentVolume' | 'range';
  startOrder?: number;  // range 时使用
  endOrder?: number;    // range 时使用
}

function resolveScope(novelId: string, scope: GlobalReviewScope): Chapter[] {
  if (scope.type === 'currentVolume') {
    // 获取当前卷所有章节
    return getCurrentVolumeChapters(novelId);
  } else {
    // 获取指定 order 范围的章节
    return getChaptersByOrderRange(novelId, scope.startOrder!, scope.endOrder!);
  }
}
```

### 7.2 Token Budget 裁剪

```typescript
const GLOBAL_REVIEW_BUDGET = 320_000;
const SYSTEM_PROMPT_TOKENS = 2_000;
const GLOBAL_LAYER_TOKENS = 8_000;
const OUTPUT_BUFFER_TOKENS = 10_000;
const CHAPTER_LAYER_BUDGET = GLOBAL_REVIEW_BUDGET - SYSTEM_PROMPT_TOKENS - GLOBAL_LAYER_TOKENS - OUTPUT_BUFFER_TOKENS;
const AVG_CHAPTER_TOKENS = 8_000;

function trimChaptersByBudget(chapters: Chapter[]): { included: Chapter[]; trimmed: number } {
  const maxChapters = Math.floor(CHAPTER_LAYER_BUDGET / AVG_CHAPTER_TOKENS);
  if (chapters.length <= maxChapters) {
    return { included: chapters, trimmed: 0 };
  }
  return {
    included: chapters.slice(0, maxChapters),
    trimmed: chapters.length - maxChapters,
  };
}
```

---

## 8. 文件变更清单

| 文件 | 改动类型 | 说明 |
| ---- | ---- | ---- |
| `server/src/prisma/schema.prisma` | 修改 | 新增 GlobalReviewIssue model |
| `server/src/prompting/prompts/audit/` | 新增 | audit.global prompt |
| `server/src/services/audit/auditService.ts` | 修改 | 新增全局审校逻辑 |
| `server/src/services/audit/auditContextBuilder.ts` | 修改 | 新增 buildGlobalReviewContext + 注入 global_review_feedback |
| `server/src/modules/novel/production/http/novelReviewRoutes.ts` | 修改 | 新增全局审校 API 端点 |
