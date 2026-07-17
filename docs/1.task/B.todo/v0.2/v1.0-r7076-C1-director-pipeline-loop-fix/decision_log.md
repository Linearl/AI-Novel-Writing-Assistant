# 决策日志 — REQ-7076 Director Pipeline 死循环修复

## 决策 1：修复范围选择

- **决策点**：修复方案选择
- **选择**：方案 C（全面修复）
- **理由**：路由层、持久化层、数据合并层三个根因同时存在，仅修复路由层可能在其他触发路径上复现
- **日期**：2026-07-16
- **决策者**：用户

## 决策 2：beat sheet 清空策略

- **决策点**：`mergeVolumeWorkspaceInput` 中 beat sheet 清空条件
- **选择**：仅在 `strategyChanged` 时清空，`volumeLevelStructureChanged` 不再清空
- **理由**：卷结构调整（标题、排序、章节数变化）不应丢弃已生成的 beat sheet 数据
- **日期**：2026-07-16
- **决策者**：AI 分析 + 用户确认
