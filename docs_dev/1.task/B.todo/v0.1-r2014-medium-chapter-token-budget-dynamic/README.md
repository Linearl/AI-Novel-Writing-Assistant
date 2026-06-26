---
description: "REQ-2014 单章 Token 预算动态化 —— 按字数计算阈值"
---

# REQ-2014 单章 Token 预算动态化

> 创建日期：2026-06-26
> 目标版本：0.1
> 状态：📋 待办

---

## 1. 任务概述

### 1.1 需求来源

当前单章 Token 预算硬编码为 80,000 tokens（`chapterTotalTokenLimit: 80_000`）。长章节（如第8章）因内容量 + 审校修复，实际消耗可达 89K+ tokens，触发断路器中断。中断后任务进入 `failed` 状态——面板只显示错误摘要、没有退路，对 Desktop 用户来说完全无法自助恢复。

此外，当前断路器触发时**没有任何缓冲**：`recordChapterUsageBudgetExceededSignal` 中一旦 `totalTokens >= 80_000` 就立即打开断路器，缺乏渐进式处理。

### 1.2 核心内容

1. **动态阈值**：`chapterTotalTokenLimit = Math.max(单章目标字数 × 20, 120_000)`
2. **渐进处理**：超过阈值时，先记录 event 并在 2 次内允许继续推进，次数用尽后再打开断路器
3. 保持原有 `singleStepTotalTokenLimit: 150_000` 不受影响

### 1.3 前置条件

- 章节的 `targetWordCount` 字段已存在
- 需要能够从 auto-execution 上下文中获取当前章节的字数配置

---

## 2. 任务包结构

| 文件 | 说明 |
| ---- | ---- |
| `README.md` | 本任务总线 |
| `REQ-2014-original.md` | 需求原始冻结副本 |
| `REQ-2014.md` | 需求工作副本 |
| `tasks.md` | 任务拆解 |
| `design.md` | 方案设计 |
| `decision_log.md` | 决策留痕 |

---

## 3. 验证清单

- [ ] 章节 `targetWordCount=3000` 时阈值为 `MAX(60000, 120000) = 120000`
- [ ] 章节 `targetWordCount=8000` 时阈值为 `MAX(160000, 120000) = 160000`
- [ ] 章节无 `targetWordCount` 时阈值为 120000
- [ ] 渐进计数：1 次超限记录 event，2 次超限打开断路器
- [ ] `resolveUsageCircuitBreaker` 能传入章节字数
- [ ] 类型检查通过：`pnpm typecheck`
- [ ] 单元测试覆盖阈值计算函数
