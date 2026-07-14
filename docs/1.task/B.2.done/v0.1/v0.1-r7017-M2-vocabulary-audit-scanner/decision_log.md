---
description: "REQ-7017 词汇库审校扫描器 — 决策留痕"
---

# REQ-7017 决策留痕

## 决策记录

### D-01：词库存储用 DB（Prisma 表）+ YAML 文件双源，通过 FileToDbSyncService 同步

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-10 |
| 决策者 | AI 建议 |
| 决策内容 | 词库数据用 YAML 文件存放 + Prisma 表持久化，通过 FileToDbSyncService 在启动时同步 |
| 决策理由 | 与已有 antiAiRules、writingTechniques 同步机制一致，YAML 是源（便于版本管理），DB 是运行时缓存 |
| 备选方案 | 纯 YAML 文件加载（不落 DB）— 运行时每次读取文件，无持久化，不利于未来扩展查询和统计 |

### D-02：扫描结果作为 AuditReport/ReviewIssue 类型扩展，不另建独立表

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-10 |
| 决策者 | AI 建议 |
| 决策内容 | 词库扫描结果通过 `auditType: "vocabulary"` 和 `category: "language"` 融入已有 AuditReport/ReviewIssue |
| 决策理由 | 复用已有审校报告基础设施，前端无需全新组件，自然融入已有展示 |
| 备选方案 | 新建 VocabAuditReport 独立表和独立前端组件 — 增加维护成本，且与现有审校体系割裂 |

### D-03：纯文本匹配，不引入 NLP/分词库

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-10 |
| 决策者 | AI 建议 |
| 决策内容 | 扫描引擎使用 word 边界正则 / indexOf 子串查找 / 自定义正则，不引入 jieba 等分词库 |
| 决策理由 | 降低复杂度，避免新依赖；中文词汇检测对短词（2-4 字）直接用 indexOf 足够；后续可按需添加分词 |
| 备选方案 | 引入 jieba 分词 — 增加了分词步骤复杂度，对 2-4 字短词的匹配提升有限 |

### D-04：评分只影响 overall 维度，不引入新评分维度

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-10 |
| 决策者 | AI 建议 |
| 决策内容 | 词库扫描评分只衰减 QualityScore.overall，不引入"词汇丰富度"等新维度 |
| 决策理由 | 避免侵入评分体系整体架构；词汇问题本身是综合性质量指标，纳入 overall 合理 |
| 备选方案 | 引入 vocabularyRichness 新维度 — 增加评分维度会连锁影响前端雷达图和评分对比逻辑 |

### D-05：评分公式用衰减阶梯（<3 / 3-8 / >8）

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-10 |
| 决策者 | 用户指定 |
| 决策内容 | 千字僵尸词命中数：<3 不扣分、3-8 扣 5 分、>8 扣 10 分 |
| 决策理由 | 用户明确指定；阶梯式衰减避免微小区间过度惩罚，同时对严重情况加重扣分 |
| 备选方案 | 线性扣分（每命中扣 1 分）— 对大量高频词的惩罚过于严厉，缺乏容错空间 |

### D-06：YAML 词库存放目录为 `server/src/data/vocabularyRules/`

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-10 |
| 决策者 | AI 建议 |
| 决策内容 | 词汇规则 YAML 文件存放在 `server/src/data/vocabularyRules/` |
| 决策理由 | 与 other prompt 数据文件同在 `server/src/data/` 下；FileToDbSyncService 已有该路径的同步逻辑 |
| 备选方案 | 放在 `server/src/prompts/` 或 `server/src/config/` — 与 prompt/配置概念混淆 |

### D-07：修复 prompt 作为 PromptAsset 注册，不内联到 service

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-10 |
| 决策者 | AI 建议 |
| 决策内容 | 词汇修复 prompt 作为 PromptAsset 注册到 `server/src/prompting/prompts/novel/chapterEditor/vocabularyFix.prompts.ts` |
| 决策理由 | 符合 Prompt Governance 规则（`server/src/prompting/` 是唯一产品级 prompt 入口） |
| 备选方案 | 在 service 中内联 prompt — 违反 Prompt Governance 规则 |
