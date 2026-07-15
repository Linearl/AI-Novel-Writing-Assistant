---
description: "REQ-2054 决策日志"
---

# 决策日志 — 多素材导入与按需加载

| # | 决策 | 选项 | 选定 | 理由 | 日期 |
|---|------|------|------|------|------|
| D1 | 材料元信息注入方式 | A. 合并到 storyInput / B. 独立 context group | **B** | 解耦更干净，独立组小且不受 token 裁剪影响 | 2026-07-15 |
| D2 | 材料全文加载方式 | A. (B1) function calling 改造 invokeStructuredLlm / B. (B2) 两轮交互 + JSON 声明 | **B** | 不改核心 LLM 模块，影响面小；缓存友好；后续可迁移到 B1 | 2026-07-15 |
| D3 | parse-material 与 import-material 的关系 | A. 合并为一个接口 / B. 两个独立接口 | **B** | parse 只管解析（不写库），import 只管入库（不做结构化解析），职责分离 | 2026-07-15 |
| D4 | 字数限制 | A. 保留 50,000 字符硬限制 / B. 不做硬限制 | **B** | 约束在 token 注入预算层面处理（Exporter 裁剪机制），存储层不设限制 | 2026-07-15 |
| D5 | B2 覆盖哪些导演步骤 | 全部 vs 首期 3 个 | **首期 3 个** | story.macro.plan / book.contract.create / chapter.draft.write 覆盖规划+写作核心场景，后续按需扩展 | 2026-07-15 |
| D6 | 材料数量上限 | 不做限制 vs 建议 20 篇 | **建议 20 篇** | material_index block 约 200 token/条，20 篇以上裁剪为最简格式（仅标题+类型） | 2026-07-15 |
