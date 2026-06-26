---
description: "REQ-2017 单章 Token 预算动态化 — 原始需求冻结副本"
---

# REQ-2017 单章 Token 预算动态化

> 版本：v1.0（冻结）
> 创建时间：2026-06-26T23:30:00+08:00

---

## 1. 问题描述

### 1.1 现象

- 第8章「赏金兑现计」累计消耗 89,312 tokens，超过硬编码阈值 80,000，触发断路器中断
- 中断后任务 `status: failed`，面板无重试入口，Desktop 用户无法自助恢复
- 阈值不考虑章节字数差异——3000 字短章和 8000 字长章用同一标准

### 1.2 影响

- Desktop 版本致命：用户无法从 GUI 恢复，必须刷新页面或 CLI 干预
- 长章 AI 生成 + 审校修复多轮迭代，80K 阈值很容易突破
- 断路器打开的副作用：任务 `markTaskFailed`，必须手动重试

### 1.3 现有代码

**硬编码阈值**（`DirectorCircuitBreakerService.ts:8-18`）：

```typescript
export const DIRECTOR_CIRCUIT_BREAKER_THRESHOLDS = {
  chapterTotalTokenLimit: 80_000,
  singleStepTotalTokenLimit: 150_000,
  ...
}
```

**超限判断**（同文件 `recordChapterUsageBudgetExceededSignal`）：

```typescript
if (input.totalTokens < DIRECTOR_CIRCUIT_BREAKER_THRESHOLDS.chapterTotalTokenLimit) {
  return null;  // 未超限
}
return openDirectorCircuitBreaker({...});  // 立即中断
```

**调用方**（`resolveUsageCircuitBreaker` in `novelDirectorAutoExecutionCircuitBreakerRuntime.ts:119-167`）：

```typescript
const chapterBudgetBreaker = largestChapterUsage && shouldOpenChapterBudgetBreaker
  ? recordChapterUsageBudgetExceededSignal({
      previous: input.autoExecution.circuitBreaker,
      totalTokens: largestChapterUsage.totalTokens,
      chapterId: largestChapterUsage.chapterId,
      // ❌ 没有传 chapterTargetWordCount
    })
  : null;
```

---

## 2. 期望行为

### 2.1 动态阈值

```
chapterTotalTokenLimit(chapter) = MAX(20 × chapter.targetWordCount, 120_000)
```

| 场景 | 字数 | 阈值 |
|------|------|------|
| 短章（2000字） | 2,000 | MAX(40,000, 120,000) = **120,000** |
| 标准章（4000字） | 4,000 | MAX(80,000, 120,000) = **120,000** |
| 长章（8000字） | 8,000 | MAX(160,000, 120,000) = **160,000** |
| 无字数配置 | null | **120,000** |

### 2.2 渐进处理

- 第 1 次超限：记录 `usage_anomaly` event，断路器保持 `closed`，任务继续
- 第 2 次超限：打开断路器 (`status: "open"`)，中断任务
- 同章节同记录去重（已有 `lastUsageRecordId` 检查）

### 2.3 不变量

- `singleStepTotalTokenLimit: 150_000` 保持不变
- `patchFailureOpenAt: 3`、`replanLoopOpenAt: 3` 等其他阈值保持不变
- 断路器打开后的恢复流程不变
