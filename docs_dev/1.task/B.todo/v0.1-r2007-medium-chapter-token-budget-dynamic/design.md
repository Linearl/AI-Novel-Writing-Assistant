---
description: "REQ-2007 方案设计"
---

# REQ-2007 方案设计

> 最后更新：2026-06-26T23:30:00+08:00

---

## 1. 架构决策

### 1.1 阈值公式

```
limit = MAX(20 × targetWordCount, 120_000)
```

- **系数 20**：经验值。正常章节约 3-4K 字，一次生成 + 一次审校 + 一次修复 ≈ 55-60K tokens。20× 系数为长章节预留 3-4 轮迭代空间
- **下限 120K**：避免短章阈值过低。120K 约等于原来的 1.5 倍，给更多缓冲

### 1.2 渐进计数复用现有机制

`DIRECTOR_CIRCUIT_BREAKER_THRESHOLDS.usageAnomalyOpenAt = 2` 已有，无需新增常量：
- 第 1 次超限：`usageAnomalyCount = 1 < 2`，断路器 `closed`，message 记录
- 第 2 次超限：`usageAnomalyCount = 2 >= 2`，断路器 `open`

> 注意：`recordChapterUsageBudgetExceededSignal` 内部直接走 `openDirectorCircuitBreaker`，不走渐进计数。需要修改该函数逻辑，使其与 `recordUsageAnomalySignal` 保持一致的渐进模式。

### 1.3 字数获取

`resolveUsageCircuitBreaker` 需要获取章节目标字数：
- 优先从 `autoExecution.nextChapterTargetWordCount`（如果有）
- 否则查询 Prisma `Chapter.targetWordCount`

## 2. 数据流

```
resolveUsageCircuitBreaker()
  ├─ getLargestChapterUsage() → { chapterId, totalTokens }
  ├─ 获取 chapter.targetWordCount
  ├─ computeChapterTotalTokenLimit(targetWordCount) → 动态阈值
  └─ recordChapterUsageBudgetExceededSignal({ totalTokens, targetWordCount })
       ├─ totalTokens < limit → null（不中断）
       ├─ 第1次超限 → { status: "closed", reason: "usage_anomaly", ... }
       └─ 第N次超限 → openCircuitBreaker()（中断）
```

## 3. 向后兼容

- 阈值计算函数 `computeChapterTotalTokenLimit(null)` 返回 120,000，保持对旧数据的兼容
- `recordChapterUsageBudgetExceededSignal` 签名增加可选参数 `targetWordCount`，无默认值的调用处需更新
