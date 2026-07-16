---
description: "REQ-7055: RAG 质量提升 — 技术设计"
update_time: "2026-07-14"
status: requirements_ready
---

# REQ-7055: RAG 质量提升 — 技术设计

## 1. 架构设计

### 1.1 五层增强架构

```text
┌─────────────────────────────────────────────────────────┐
│                    检索请求入口                            │
│           HybridRetrievalService.search()                │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 1: 分面检索 (chunkFacets.ts)                      │
│  ├─ 7 维 facet 类型定义                                  │
│  ├─ facet 值归一化 (normalizeRagFacets)                   │
│  └─ facet 感知的检索过滤                                  │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 2: 上下文分块 (RagContextualChunkService.ts)       │
│  ├─ 为 chunk 生成上下文前缀 (<=260 chars)                 │
│  ├─ 前缀拼接到 chunk 文本                                 │
│  └─ 来源哈希去重 (SHA-256)                                │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 3: 交叉编码重排 (RagRerankerService.ts)            │
│  ├─ 调用 cross-encoder API                               │
│  ├─ 多格式结果归一化                                      │
│  └─ 优雅降级（API 不可用时跳过）                           │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 4: 检索追踪 (RagRetrievalTracer.ts)               │
│  ├─ 6 阶段时间快照 (vector/keyword/fusion/reranker/decay/hits)│
│  ├─ 候选数量记录                                          │
│  ├─ 查询摘要 (SHA-256)                                    │
│  └─ 异步持久化到 Prisma                                   │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 5: 追踪清理 (RagRetrievalTraceRetention.ts)       │
│  ├─ 定时器 (每 6 小时, unref)                             │
│  ├─ 按保留天数清理过期追踪                                 │
│  └─ 日志记录清理结果                                      │
└─────────────────────────────────────────────────────────┘
```

### 1.2 数据流

```text
索引时:
  原始文档 → 分块 → [Layer 1: facet 提取] → [Layer 2: 上下文前缀生成] → Embedding → Qdrant

检索时:
  查询 → 向量搜索 + 关键词搜索 → [Layer 1: facet 过滤] → [Layer 3: reranker 重排] → [Layer 4: 追踪记录] → 结果

后台:
  [Layer 5: 定时清理] → 删除过期追踪记录
```

## 2. 详细设计

### 2.1 分面检索（chunkFacets.ts）

```typescript
// 7 维 facet 常量
export const RAG_CHUNK_FACET_KEYS = [
  "genreTags",         // 类型标签（玄幻、都市、科幻...）
  "sellingPointTags",  // 卖点标签（爽文、甜宠、悬疑...）
  "targetReaders",     // 目标读者（男频、女频、通用...）
  "strengths",         // 优势
  "weaknesses",        // 劣势
  "characterRole",     // 角色定位（主角、配角、反派...）
  "chapterAnchor",     // 章节锚点（第几章、哪个场景）
] as const;

// 归一化：去重、去空、截断到 12 个
export function normalizeRagFacets(raw: unknown): RagChunkFacets { ... }
```

**上游参考**: `server/src/services/rag/chunkFacets.ts` — 类型定义和归一化函数可直接复用

### 2.2 上下文分块（RagContextualChunkService.ts）

```typescript
const CONTEXT_PREFIX_MAX_CHARS = 260;

interface RagContextualChunkInput {
  document: RagContextualChunkDocument;
  chunkOrder: number;
  chunkText: string;
  metadata?: Record<string, unknown>;
}

// 核心逻辑：
// 1. 构建 context source hash (SHA-256)
// 2. 调用 LLM 生成上下文前缀
// 3. 截断到 CONTEXT_PREFIX_MAX_CHARS
// 4. 前缀拼接到 chunkText
```

**上游参考**: `server/src/services/rag/RagContextualChunkService.ts` — 完整实现可参考，适配本项目 LLM 调用方式

### 2.3 交叉编码重排（RagRerankerService.ts）

```typescript
interface RagRerankerInput {
  query: string;
  documents: RagRerankerDocument[];
  topK: number;
  model?: string;
}

interface RagRerankerOutput {
  used: boolean;              // 是否实际使用了 reranker
  results: RagRerankerResult[];
  error?: string;             // 降级时的错误信息
}

// 多格式归一化
// 支持: relevance_score, relevanceScore, score, rank_score
// 支持: index, document_index, documentIndex
```

**上游参考**: `server/src/services/rag/RagRerankerService.ts` — 多格式归一化和降级逻辑可直接复用

### 2.4 检索追踪（RagRetrievalTracer.ts）

```typescript
type TraceStage = "vector" | "keyword" | "fusion" | "fallback" | "reranker" | "decay" | "hits";

interface TraceTimingSnapshot {
  vectorMs: number;
  keywordMs: number;
  fusionMs: number;
  rerankerMs: number;
  decayMs: number;
  totalMs: number;
}

interface TraceCandidateCounts {
  vector: number;
  keyword: number;
  fused: number;
  rerankerInput: number;
  rerankerOutput: number;
  final: number;
}

// 查询摘要: SHA-256(query).slice(0, 24)
// 持久化: prisma.ragRetrievalTrace.create()
```

**上游参考**: `server/src/services/rag/RagRetrievalTracer.ts` — 追踪逻辑和数据结构可直接参考

### 2.5 追踪清理（RagRetrievalTraceRetention.ts）

```typescript
const DEFAULT_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

class RagRetrievalTraceRetention {
  private timer: NodeJS.Timeout | null = null;

  start(intervalMs?: number): void {
    this.timer = setInterval(() => {
      void this.clearExpiredTraces().catch(console.warn);
    }, intervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS);
    this.timer.unref?.(); // 不阻塞进程退出
  }

  async clearExpiredTraces(now = new Date()): Promise<{ deletedCount: number; cutoff: Date }> {
    // 按 retentionDays 计算截止时间，批量删除
  }
}
```

**上游参考**: `server/src/services/rag/RagRetrievalTraceRetention.ts` — 45 行，可直接复用

## 3. Prisma Schema

```prisma
model RagRetrievalTrace {
  id           String   @id @default(cuid())
  queryHash    String   // SHA-256 摘要
  tenantId     String
  novelId      String?
  worldId      String?
  timingJson   String   // TraceTimingSnapshot JSON
  countsJson   String   // TraceCandidateCounts JSON
  hitsJson     String?  // 命中结果 JSON
  optionsJson  String?  // 检索选项 JSON
  createdAt    DateTime @default(now())

  @@index([tenantId, createdAt])
  @@index([queryHash])
}
```

## 4. RAG 配置扩展

```typescript
// 在现有 ragConfig 中新增
contextualRetrievalVersion: string;    // 上下文分块版本号
retrievalTraceRetentionDays: number;   // 追踪保留天数（默认 7）
rerankerModel: string;                 // reranker 模型名
rerankerTimeoutMs: number;             // reranker 超时（默认 3000）
```

## 5. 接口设计

### 5.1 内部接口（服务间调用）

```typescript
// 分面检索
interface FacetedSearchOptions {
  facets?: RagChunkFacets;
  facetMode?: "strict" | "boost"; // 严格过滤 vs 加权提升
}

// 上下文分块
interface ContextualChunkOptions {
  enabled: boolean;
  maxPrefixChars?: number;
}

// 检索追踪
interface RetrievalTraceOptions {
  enabled: boolean;
  persistToDb?: boolean;
}
```

### 5.2 查询 API（可选，调试用）

```text
GET /api/rag/traces?tenantId=xxx&limit=50    # 查询检索追踪
DELETE /api/rag/traces/cleanup               # 手动触发清理
GET /api/rag/traces/:traceId                  # 查看单条追踪详情
```

## 6. 实现步骤

### Phase 1: Schema + 配置（0.5d）

1. 新增 RagRetrievalTrace Prisma 模型
2. 扩展 ragConfig 配置项
3. 执行 prisma migrate dev

### Phase 2: 分面检索（0.5d）

1. 移植 chunkFacets.ts（类型定义 + 归一化）
2. 集成到索引管线
3. 集成到检索管线

### Phase 3: 上下文分块（1d）

1. 注册 contextualChunk.prompts.ts
2. 移植 RagContextualChunkService.ts
3. 集成到 RagIndexService
4. 测试前缀生成质量

### Phase 4: 重排序（0.5d）

1. 移植 RagRerankerService.ts
2. 集成到 HybridRetrievalService
3. 测试降级逻辑

### Phase 5: 追踪 + 清理（0.5d）

1. 移植 RagRetrievalTracer.ts
2. 移植 RagRetrievalTraceRetention.ts
3. 集成到检索管线
4. 启动清理定时器

### Phase 6: 测试与验证（1d）

1. 单元测试（各服务独立测试）
2. 集成测试（完整检索流程）
3. typecheck 验证
4. 追踪查询 API 测试

## 7. 交付物

- [ ] Prisma Schema 迁移文件（RagRetrievalTrace）
- [ ] `server/src/services/rag/chunkFacets.ts`
- [ ] `server/src/services/rag/RagContextualChunkService.ts`
- [ ] `server/src/services/rag/RagRerankerService.ts`
- [ ] `server/src/services/rag/RagRetrievalTracer.ts`
- [ ] `server/src/services/rag/RagRetrievalTraceRetention.ts`
- [ ] `server/src/prompting/prompts/rag/contextualChunk.prompts.ts`
- [ ] RAG 配置扩展
- [ ] 单元测试文件
- [ ] 集成测试文件
