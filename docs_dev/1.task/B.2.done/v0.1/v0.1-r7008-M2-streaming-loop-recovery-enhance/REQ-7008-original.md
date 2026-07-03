---
description: "流式循环检测分级恢复增强需求文档"
---

# REQ-7008: 流式循环检测分级恢复增强

## 需求来源

1. MiMo Code 源码分析（TextNgramMonitor 设计）
2. 现有 REQ-2002 改进需求

## 当前问题

### 问题 1：硬失败策略

当前实现检测到循环后直接截断返回失败，没有给模型自我纠正的机会：

```typescript
// 当前实现
if (this.consecutiveHits < this.config.consecutiveHitCount) return null;
// 直接返回失败
return { isLoop: true, truncationIndex, ... }
```

### 问题 2：检测算法简单

使用 n-gram 重复率（`1 - unique/total`），对"段落循环"模式不够敏感。

### 问题 3：不支持中文分词

字符级滑动窗口对中日韩字符处理不友好。

## 改进方案

### 方案 1：分级恢复机制

参考 MiMo Code 的分级恢复策略：

| 级别 | 触发条件 | 处理方式 |
|------|----------|----------|
| 第 1 次 | 首次检测到重复 | 发送恢复提醒给模型 |
| 第 2 次 | 再次检测到重复 | 强制模型重新规划 |
| 第 3 次 | 超过最大恢复次数 | 停止执行 |

**恢复提醒内容**（参考 MiMo Code）：

```typescript
const RECOVERY_REMIND = `<system-reminder>
REPETITION DETECTED: Your recent output contains repeated phrases.

STOP repeating yourself and retry with a different approach:
- Vary your wording and reasoning — do not reuse the same phrases
- If you were about to call a tool, try a different tool or different arguments
- If you are blocked, explain what you are blocking you instead of looping

Do NOT output the same phrases again.
</system-reminder>`

const RECOVERY_REPLAN = `<system-reminder>
CRITICAL REPETITION: You are STILL repeating phrases after a recovery attempt.

You MUST completely replan before continuing:
1. Abandon your current approach entirely — it is stuck in repetition
2. Write out a NEW plan with different steps and a different strategy
3. State what you were trying to do, why it failed, and how your new plan differs

Do NOT continue the same line of reasoning or reuse the same wording.
</system-reminder>`
```

### 方案 2：优化检测算法

采用连续重复块检测（detectConsecutiveRepeat）：

```typescript
function detectConsecutiveRepeat(
  tokens: readonly string[],
  minBlockSize: number,
  threshold: number,
  minDistinct: number = 3,
): boolean {
  // 检测连续重复块，而不是简单的重复率
  // 对"段落循环"模式更敏感
}
```

### 方案 3：中文分词支持

```typescript
function tokenizeForNgram(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/([　-ヿ㐀-䶿一-鿿豈-﫿＀-￯])/g, " $1 ")  // 中日韩字符分词
    .trim()
    .split(" ")
    .filter(Boolean)
}
```

## 验收标准

1. 分级恢复机制正常工作（提醒 → 重规划 → 停止）
2. 连续重复块检测算法正确实现
3. 中文分词支持正常
4. 最大恢复次数限制生效（默认 2 次）
5. 单元测试覆盖所有分支
