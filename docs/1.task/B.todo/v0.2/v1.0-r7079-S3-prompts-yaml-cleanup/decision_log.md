# 决策日志 — REQ-7079 Prompts YAML 清理与内联 Prompt 迁移

## 决策 1：迁移策略

- **决策点**：逐个迁移还是一次性迁移
- **选择**：逐个 prompt 迁移，每个完成后验证
- **理由**：每个 YAML 的调用方可能不同，逐个迁移可快速定位问题
- **日期**：2026-07-17
- **决策者**：AI 分析

## 决策 2：删除旧加载器

- **决策点**：何时删除 `data/prompts/`
- **选择**：3 个 YAML 全部迁移完成后，确认无其他引用后删除
- **理由**：避免中途删除导致未迁移的 prompt 失效
- **日期**：2026-07-17
- **决策者**：AI 分析

## 决策 3：合并内联 Prompt 迁移到 R7079

- **决策点**：内联 prompt 迁移是否作为独立任务包
- **选择**：合并到 R7079（扩展范围）
- **理由**：内联 prompt 迁移与 YAML 清理属于同一范畴（prompt 治理），工时增量较小（+4-6h），保持单一任务包便于追踪
- **日期**：2026-07-17
- **决策者**：用户确认

## 决策 4：内联 Prompt 数量修正

- **决策点**：诊断报告中的 23 处内联 prompt 是否属实
- **选择**：实际可迁移的仅 4-5 处
- **理由**：代码验证发现 characterConsistency/ 和 novelCoreCharacterService.ts 已正确使用 PromptAsset 或 loadPrompt()，诊断报告存在误报
- **日期**：2026-07-17
- **决策者**：AI 分析

## 决策 5：意图解析 Prompt 处理方案

- **决策点**：intentPromptSupport.ts 的 23 行 system prompt 如何迁移
- **选择**：创建 `agent.intentParse` PromptAsset，使用 context 对象注入动态变量
- **理由**：prompt 内容独立且有明确的输入/输出 schema，可通过 PromptAsset 的 context 机制处理 INTENT_NAMES 等编译时/运行时变量
- **日期**：2026-07-17
- **决策者**：AI 分析

## 决策 6：人名修正 Prompt 的动态变量处理

- **决策点**：characterPreparationSupplemental.ts 人名修正 prompt 中的动态列表（validNames、allInvalid）如何处理
- **选择**：使用 PromptAsset slots 机制处理动态变量
- **理由**：人名修正 prompt 需要根据运行时数据动态填充合法/非法人名列表，slots 机制可以优雅地处理这种模式
- **日期**：2026-07-17
- **决策者**：AI 分析
