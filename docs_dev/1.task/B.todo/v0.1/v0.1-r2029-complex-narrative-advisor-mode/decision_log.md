---
description: "REQ-2029 决策留痕"
---

# REQ-2029 决策留痕

| # | 决策点 | 决策 | 理由 | 日期 |
| --- | --- | --- | --- | --- |
| D1 | 实现路径 | 在现有架构内新增意图（方案 A），而非绕过意图分类（方案 B） | 方案 A 复用 `coordinator_plan → tool_execute → answer_finalize` 全链路，改动集中，不影响现有意图 | 2026-06-30 |
| D2 | 意图命名 | `narrative_advisor`（叙事顾问） | 语义清晰，与现有命名风格一致（动词_名词），便于 prompt 中引用 | 2026-06-30 |
| D3 | 工具选择策略 | workflow resolve 中根据话题关键词动态选择工具 | 比硬编码每种话题的工具组合更灵活，新增话题只需扩展匹配规则 | 2026-06-30 |
| D4 | interactionMode | 固定为 `"review"`，不依赖 LLM 输出 | 架构级安全保证：即使 LLM 误输出 `execute`，schema 层面强制覆盖为 `review` | 2026-06-30 |
| D5 | 高级分析工具 | 不在本需求范围内，后续迭代 | 先验证基础通路可用，再按需增加 `analyze_pace_curve` 等高级工具 | 2026-06-30 |
| D6 | 与 general_chat 共存 | 两者独立，general_chat 行为不变 | 避免影响已有用户习惯；general_chat 继续处理闲聊，narrative_advisor 处理叙事讨论 | 2026-06-30 |
