---
description: "REQ-7055: RAG 质量提升 — 决策日志"
update_time: "2026-07-14"
status: requirements_ready
---

# REQ-7055: RAG 质量提升 — 决策日志

## D1: 上下文分块的 Prompt 方式

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-14 |
| 决策人 | AI |
| 决策 | 使用 LLM 生成上下文前缀（Anthropic contextual retrieval 风格），前缀限制 260 字符 |
| 原因 | Anthropic 已验证该方法可显著提升检索质量；上游已有完整实现和 Prompt |
| 影响 | 每个 chunk 索引时多一次 LLM 调用，索引时间增加约 15-20% |
| 备选方案 | 方案B: 使用规则提取前缀 — 质量低；方案C: 使用 embedding 差值 — 复杂度高 |

---

## D2: Reranker 降级策略

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-14 |
| 决策人 | AI |
| 决策 | reranker API 不可用时返回 `used: false`，使用原始排序，不报错 |
| 原因 | reranker 是增强功能而非必要功能；降级策略确保基础检索不受影响 |
| 影响 | 重排序为可选增强，不影响核心检索流程 |
| 备选方案 | 方案B: 降级时报错 — 影响用户体验；方案C: 内置本地 reranker — 增加部署复杂度 |

---

## D3: 追踪存储方式

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-14 |
| 决策人 | AI |
| 决策 | 追踪数据存储在 Prisma（RagRetrievalTrace 表），不在内存或外部存储 |
| 原因 | 与现有数据层一致，支持持久化和历史查询；无需引入新的存储依赖 |
| 影响 | 新增一个 Prisma 模型，需要索引优化 |
| 备选方案 | 方案B: 内存存储 — 重启丢失；方案C: 文件存储 — 查询不便 |

---

## D4: 追踪清理策略

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-14 |
| 决策人 | AI |
| 决策 | 使用 Node.js setInterval + unref 实现定时清理，默认 6 小时一次，保留 7 天 |
| 原因 | 实现简单，unref 确保不阻塞进程退出；6 小时间隔平衡了及时性和性能开销 |
| 影响 | 需要在应用启动时初始化 Retention 定时器 |
| 备选方案 | 方案B: cron job — 部署复杂度高；方案C: 手动清理 — 不够及时 |

---

## D5: Facet 维度选择

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-14 |
| 决策人 | AI |
| 决策 | 采用上游的 7 维 facet 设计：genreTags, sellingPointTags, targetReaders, strengths, weaknesses, characterRole, chapterAnchor |
| 原因 | 上游已验证这 7 个维度覆盖了小说创作领域的主要检索需求 |
| 影响 | facet 提取需要 LLM 参与（可选），增加索引复杂度 |
| 备选方案 | 方案B: 仅用 genre + characterRole — 维度不足；方案C: 12+ 维度 — 过于复杂 |

---

## 总结

| 决策 | 选择 | 核心理由 |
| ---- | ---- | -------- |
| 上下文分块 | LLM 生成前缀 260 字符 | Anthropic 验证有效，上游有实现 |
| Reranker 降级 | used=false 静默降级 | 不影响基础检索 |
| 追踪存储 | Prisma 表 | 与现有架构一致 |
| 追踪清理 | setInterval + unref | 简单可靠 |
| Facet 维度 | 7 维 | 上游验证，覆盖核心需求 |
