---
description: "流式循环检测分级恢复增强 — 参考 MiMo Code TextNgramMonitor 设计"
status: in_progress
priority: p3
created: 2026-07-01
updated: 2026-07-01
---

# 流式循环检测分级恢复增强

> 任务编号：REQ-7008
> 复杂度：medium
> 来源：MiMo Code 源码分析 + 现有 REQ-2002 改进需求

## 概述

当前项目的流式循环检测（StreamingRepetitionDetector）采用"硬失败"策略——检测到循环后直接截断返回失败。参考 MiMo Code 的 TextNgramMonitor 设计，改进为分级恢复机制，给模型自我纠正的机会。

## 当前实现

- **文件**：`server/src/llm/streamingRepetitionDetector.ts`
- **算法**：n-gram 重复率（`1 - unique/total`）
- **触发**：连续 5 次检测到重复率 ≥ 70%
- **处理**：截断到安全点，返回失败

## 改进目标

1. **分级恢复**：提醒 → 强制重新规划 → 停止
2. **优化算法**：采用连续重复块检测
3. **中文分词**：支持中日韩字符分词
4. **恢复限制**：最多尝试 2 次恢复

## 验证标准

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] 单元测试覆盖分级恢复逻辑
- [ ] 模拟循环场景验证恢复效果

## 状态

- [x] 需求分析
- [x] 设计文档
- [ ] 代码实现
- [ ] 测试验证
- [ ] 完成归档
