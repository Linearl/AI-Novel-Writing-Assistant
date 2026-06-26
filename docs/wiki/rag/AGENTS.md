<!-- Parent: ../../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# docs/wiki/rag

## Purpose
记录知识库与上下文装配规则:embedding、向量检索、上下文组装、世界观/角色/章节/写法/连续性如何被喂给 LLM。

## Key Files
| File | Description |
|------|-------------|
| `knowledge-and-context-assembly.md` | 知识库与上下文装配规则 |

## For AI Agents

### Context Assembly Concerns
- 写"喂什么":哪些知识(世界观、角色、章节历史、写法模板、连续性事实)被纳入上下文
- 写"怎么排":优先级、长度限制、覆盖策略
- 写"为什么这个顺序":为后续推理提供稳定支点
- 写"失败模式":上下文超限 / 信息冲突 / 跨卷一致性问题如何处理

## Dependencies

### Internal
- `docs/wiki/architecture/world-context-gateway.md`
- `server/src/services/rag/` — 实际 RAG 实现