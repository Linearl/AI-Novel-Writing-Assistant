---
description: "REQ-7055: RAG 质量提升 — 任务清单"
update_time: "2026-07-16"
status: in_progress
---

# REQ-7055: RAG 质量提升 — 任务清单

## 阶段零：需求就绪

- [x] 需求文档完成
- [x] 技术设计完成
- [x] 任务清单完成
- [x] 决策日志完成

## 阶段一：Schema + 配置（0.5d）

- [x] T1.1: 新增 RagRetrievalTrace Prisma 模型
- [x] T1.2: 扩展 ragConfig（contextualRetrievalVersion, retrievalTraceRetentionDays, rerankerModel, rerankerTimeoutMs）
- [x] T1.3: 执行 prisma db push，验证模型

**验收点**: prisma generate 成功，RagRetrievalTrace 可用

## 阶段二：分面检索（0.5d）`参考上游 chunkFacets.ts`

- [x] T2.1: 创建 `server/src/services/rag/chunkFacets.ts` — 移植 7 维 facet 类型定义和常量 `直接参考上游 chunkFacets.ts`
- [x] T2.2: 移植 normalizeRagFacetValues / normalizeRagFacets / hasRagFacets 工具函数 `直接参考上游 chunkFacets.ts`
- [x] T2.3: 集成 facet 到 RagIndexService（索引时提取 facet） `参考上游索引逻辑`
- [x] T2.4: 集成 facet 到 HybridRetrievalService（检索时 facet 过滤） `参考上游检索逻辑`

**验收点**: facet 类型可用，索引和检索均支持 facet

## 阶段三：上下文分块（1d）`参考上游 RagContextualChunkService.ts`

- [x] T3.1: 注册 `server/src/prompting/prompts/rag/contextualChunk.prompts.ts` PromptAsset `参考上游 contextualChunk.prompts.ts`
- [x] T3.2: 创建 `server/src/services/rag/RagContextualChunkService.ts` — 移植核心逻辑 `参考上游 RagContextualChunkService.ts`
- [x] T3.3: 实现 buildContextSourceHash（SHA-256 去重） `参考上游 buildContextSourceHash`
- [x] T3.4: 实现 normalizeContextPrefix（前缀截断到 260 字符） `参考上游 normalizeContextPrefix`
- [x] T3.5: 集成到 RagIndexService（索引时生成上下文前缀） `参考上游集成方式`
- [x] T3.6: 测试前缀生成质量和性能

**验收点**: 上下文前缀正确生成，索引时间增加 < 20%

## 阶段四：交叉编码重排（0.5d）`参考上游 RagRerankerService.ts`

- [x] T4.1: 创建 `server/src/services/rag/RagRerankerService.ts` — 移植重排逻辑 `参考上游 RagRerankerService.ts`
- [x] T4.2: 实现多格式结果归一化（relevance_score/relevanceScore/score/rank_score） `参考上游 normalizeRawResult`
- [x] T4.3: 实现优雅降级（API 超时/不可用时返回 used=false） `参考上游降级逻辑`
- [x] T4.4: 集成到 HybridRetrievalService（检索后重排） `参考上游集成方式`

**验收点**: 重排序正常工作，API 不可用时降级正常

## 阶段五：追踪 + 清理（0.5d）`参考上游 Tracer + Retention`

- [x] T5.1: 创建 `server/src/services/rag/RagRetrievalTracer.ts` — 移植追踪逻辑 `参考上游 RagRetrievalTracer.ts`
- [x] T5.2: 实现 6 阶段时间快照记录 `参考上游 TraceTimingSnapshot`
- [x] T5.3: 实现查询摘要（SHA-256） `参考上游 digestQuery`
- [x] T5.4: 创建 `server/src/services/rag/RagRetrievalTraceRetention.ts` — 移植清理逻辑 `参考上游 RagRetrievalTraceRetention.ts`
- [x] T5.5: 集成 Tracer 到 HybridRetrievalService `参考上游集成方式`
- [x] T5.6: 在应用启动时初始化 Retention 定时器

**验收点**: 追踪记录完整，定时清理正常运行

## 阶段六：测试与验证（1d）

- [x] T6.1: 单元测试 — chunkFacets（归一化、验证）
- [x] T6.2: 单元测试 — RagContextualChunkService（前缀生成、哈希）
- [x] T6.3: 单元测试 — RagRerankerService（实例化、降级）
- [x] T6.4: 单元测试 — RagRetrievalTracer（SHA-256 摘要、快照）
- [x] T6.5: 单元测试 — RagRetrievalTraceRetention（定时器逻辑）
- [ ] T6.6: 集成测试 — 完整检索流程（分块 → 索引 → 检索 → 重排 → 追踪）
- [x] T6.7: typecheck 全量验证（RAG 相关文件零错误）
- [ ] T6.8: 更新 requirements.md 和任务包状态

**验收点**: 所有测试通过，typecheck 通过

## 依赖关系

```text
T1.x ──→ T2.x ──→ T3.x
                ──→ T4.x
                ──→ T5.x
T2.x + T3.x + T4.x + T5.x ──→ T6.x
```

## 完成标准

- [ ] 所有任务完成
- [ ] typecheck 通过
- [ ] 测试覆盖率 > 80%
- [ ] 7 维 facet 正常工作
- [ ] 上下文前缀生成正常
- [ ] 重排序正常（含降级）
- [ ] 检索追踪记录正常
- [ ] 追踪清理定时运行
