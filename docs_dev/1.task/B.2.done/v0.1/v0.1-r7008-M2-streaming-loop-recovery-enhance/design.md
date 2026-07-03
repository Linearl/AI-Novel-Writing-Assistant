---
description: "流式循环检测分级恢复增强技术设计文档"
---

# 技术设计文档

## 1. 架构设计

### 1.1 整体架构

```
用户输入
    ↓
模型输出 token 流
    ↓
StreamingRepetitionDetector（改进版）
    ↓
检测到重复？
    ├─ 否 → 继续输出
    └─ 是 → 返回 "text-repeat"
                ↓
         分级恢复处理器
                ↓
         第 1 次？→ 发送 RECOVERY_REMIND
         第 2 次？→ 发送 RECOVERY_REPLAN
         第 3 次？→ 停止执行
```

### 1.2 模块划分

| 模块 | 文件 | 职责 |
|------|------|------|
| 分词器 | `tokenizer.ts` | 中日韩+英文分词 |
| 检测器 | `detector.ts` | 连续重复块检测 |
| 恢复器 | `recovery.ts` | 分级恢复逻辑 |
| 监控器 | `monitor.ts` | 整合以上模块 |

## 2. 分词器设计

### 2.1 中日韩+英文分词

```typescript
// server/src/llm/repetition/tokenizer.ts

/**
 * 将文本分词为 token 数组，支持中日韩字符和英文多种格式
 * 
 * 支持的分词场景：
 * - 空格分词：hello world → ["hello", "world"]
 * - 连字符分词：hello-world → ["hello", "world"]
 * - 下划线分词：api_key → ["api", "key"]
 * - camelCase：helloWorld → ["hello", "world"]
 * - PascalCase：HelloWorld → ["hello", "world"]
 * - CJK 字符：你好世界 → ["你", "好", "世", "界"]
 * - 混合文本：hello你好 → ["hello", "你", "好"]
 * - 数字+文字：2026年 → ["2026", "年"]
 */
export function tokenizeForNgram(text: string): string[] {
  return text
    .toLowerCase()
    // camelCase → camel case
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    // snake_case → snake case
    .replace(/_/g, " ")
    // kebab-case → kebab case
    .replace(/-/g, " ")
    // CJK 字符前后添加空格
    .replace(/([\u3000-\u9FFF\uF900-\uFAFF])/g, " $1 ")
    // 数字与非数字之间添加空格
    .replace(/(\d)([^\d])/g, "$1 $2")
    .replace(/([^\d])(\d)/g, "$1 $2")
    // 合并多个空格
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
}
```

### 2.2 分词示例

| 输入 | 输出 | 说明 |
|------|------|------|
| `"hello world"` | `["hello", "world"]` | 空格分词 |
| `"hello-world"` | `["hello", "world"]` | 连字符分词 |
| `"api_key"` | `["api", "key"]` | 下划线分词 |
| `"helloWorld"` | `["hello", "world"]` | camelCase 分词 |
| `"API_KEY"` | `["api", "key"]` | 大写+下划线分词 |
| `"你好世界"` | `["你", "好", "世", "界"]` | CJK 字符分词 |
| `"hello你好"` | `["hello", "你", "好"]` | 混合分词 |
| `"2026年7月"` | `["2026", "年", "7", "月"]` | 数字+汉字分词 |
| `"v0.1-r7008"` | `["v0", "1", "r7008"]` | 版本号分词 |

## 3. 检测器设计

### 3.1 连续重复块检测

```typescript
// server/src/llm/repetition/detector.ts
export function detectConsecutiveRepeat(
  tokens: readonly string[],
  minBlockSize: number,
  threshold: number,
  minDistinct: number = 3,
): boolean {
  if (threshold < 2 || tokens.length < minBlockSize * threshold) return false

  const maxPeriod = Math.floor(tokens.length / threshold)
  for (let p = minBlockSize; p <= maxPeriod; p++) {
    let run = 0
    for (let i = 0; i <= tokens.length - p - 1; i++) {
      if (tokens[i] === tokens[i + p]) {
        run++
        if (run >= p * (threshold - 1)) {
          const blockStart = i - run + 1
          const distinct = new Set(tokens.slice(blockStart, blockStart + p)).size
          if (distinct >= minDistinct) return true
          run = 0
        }
      } else {
        run = 0
      }
    }
  }
  return false
}
```

### 3.2 检测算法对比

| 算法 | 输入 | 结果 |
|------|------|------|
| n-gram 重复率 | `"abcabcabc"` | 重复率 = 0.67 |
| 连续重复块 | `"abcabcabc"` | 检测到 `abc` 重复 3 次 |

## 4. 恢复器设计

### 4.1 分级恢复逻辑

```typescript
// server/src/llm/repetition/recovery.ts
export class RepetitionRecovery {
  private attemptCount = 0
  private readonly maxAttempts = 2

  getNextAction(): RecoveryAction {
    this.attemptCount++
    
    if (this.attemptCount === 1) {
      return { type: "remind", message: RECOVERY_REMIND }
    }
    
    if (this.attemptCount === 2) {
      return { type: "replan", message: RECOVERY_REPLAN }
    }
    
    return { type: "stop", message: "Maximum recovery attempts reached" }
  }

  reset(): void {
    this.attemptCount = 0
  }

  get hasExceededMaxAttempts(): boolean {
    return this.attemptCount >= this.maxAttempts
  }
}
```

### 4.2 恢复消息

```typescript
export const RECOVERY_REMIND = `<system-reminder>
REPETITION DETECTED: Your recent output contains repeated phrases (sliding n-gram match within your last ${WINDOW_SIZE} tokens).

STOP repeating yourself and retry with a different approach:
- Vary your wording and reasoning — do not reuse the same phrases
- If you were about to call a tool, try a different tool or different arguments
- If you are blocked, explain what you are blocking you instead of looping

Do NOT output the same phrases again.
</system-reminder>`

export const RECOVERY_REPLAN = `<system-reminder>
CRITICAL REPETITION: You are STILL repeating phrases after a recovery attempt.

You MUST completely replan before continuing:
1. Abandon your current approach entirely — it is stuck in repetition
2. Write out a NEW plan with different steps and a different strategy
3. State what you were trying to do, why it failed, and how your new plan differs

Do NOT continue the same line of reasoning or reuse the same wording.
</system-reminder>`
```

## 5. 监控器设计

### 5.1 整合模块

```typescript
// server/src/llm/repetition/monitor.ts
export class RepetitionMonitor {
  private buffer = ""
  private tokens: string[] = []
  private recovery = new RepetitionRecovery()

  constructor(
    private readonly minBlockSize: number,
    private readonly threshold: number,
    private readonly windowTokens: number,
  ) {}

  append(text: string): RepetitionResult | null {
    if (!text) return null

    this.buffer += text
    const all = tokenizeForNgram(this.buffer)
    this.tokens = all.length > this.windowTokens 
      ? all.slice(-this.windowTokens) 
      : all

    // 清理过长的 buffer
    if (all.length > this.windowTokens * 2) {
      this.buffer = this.tokens.join(" ")
    }

    // 检测连续重复块
    const isRepeat = detectConsecutiveRepeat(
      this.tokens,
      this.minBlockSize,
      this.threshold,
    )

    if (!isRepeat) return null

    // 获取恢复动作
    const action = this.recovery.getNextAction()
    
    return {
      isRepeat: true,
      action: action.type,
      message: action.message,
      hasExceededMaxAttempts: this.recovery.hasExceededMaxAttempts,
    }
  }

  reset(): void {
    this.buffer = ""
    this.tokens = []
    this.recovery.reset()
  }
}

export interface RepetitionResult {
  isRepeat: boolean
  action: "remind" | "replan" | "stop"
  message: string
  hasExceededMaxAttempts: boolean
}

export type RecoveryAction = {
  type: "remind" | "replan" | "stop"
  message: string
}
```

## 6. 配置设计

### 6.1 环境变量

```typescript
// server/src/llm/repetition/config.ts
export interface RepetitionConfig {
  enabled: boolean
  minBlockSize: number      // 最小重复块大小
  threshold: number         // 重复阈值
  windowTokens: number      // 窗口大小（tokens）
  maxRecoveryAttempts: number  // 最大恢复次数
}

export function loadRepetitionConfig(): RepetitionConfig {
  return {
    enabled: process.env.REPETITION_DETECTOR_ENABLED !== "false",
    minBlockSize: Number(process.env.REPETITION_MIN_BLOCK_SIZE) || 3,
    threshold: Number(process.env.REPETITION_THRESHOLD) || 2,
    windowTokens: Number(process.env.REPETITION_WINDOW_TOKENS) || 200,
    maxRecoveryAttempts: Number(process.env.REPETITION_MAX_RECOVERY) || 2,
  }
}
```

## 7. 集成设计

### 7.1 与现有流式管道集成

```typescript
// server/src/llm/streaming.ts
import { RepetitionMonitor } from "./repetition/monitor"

export function streamToSSE(...) {
  const config = loadRepetitionConfig()
  const monitor = new RepetitionMonitor(
    config.minBlockSize,
    config.threshold,
    config.windowTokens,
  )

  // 在流式输出过程中检测
  for await (const chunk of stream) {
    const result = monitor.append(chunk.text)
    
    if (result) {
      if (result.action === "stop") {
        // 停止执行
        break
      }
      
      // 发送恢复提醒给模型
      yield { type: "system-reminder", content: result.message }
    }
    
    yield chunk
  }
}
```

## 8. 测试设计

### 8.1 单元测试

```typescript
describe("RepetitionMonitor", () => {
  it("should detect repeated paragraph", () => {
    const monitor = new RepetitionMonitor(3, 2, 200)
    
    // 模拟段落重复
    const text = "这是一段测试文本。".repeat(5)
    const result = monitor.append(text)
    
    expect(result).not.toBeNull()
    expect(result!.action).toBe("remind")
  })

  it("should escalate to replan on second detection", () => {
    const monitor = new RepetitionMonitor(3, 2, 200)
    
    // 第一次检测
    monitor.append("重复内容".repeat(5))
    
    // 第二次检测
    const result = monitor.append("重复内容".repeat(5))
    
    expect(result!.action).toBe("replan")
  })

  it("should stop after max recovery attempts", () => {
    const monitor = new RepetitionMonitor(3, 2, 200)
    
    // 触发 3 次检测
    monitor.append("重复内容".repeat(5))
    monitor.append("重复内容".repeat(5))
    const result = monitor.append("重复内容".repeat(5))
    
    expect(result!.action).toBe("stop")
    expect(result!.hasExceededMaxAttempts).toBe(true)
  })
})
```

## 9. 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 恢复提醒无效 | 限制最大恢复次数 |
| 检测算法误报 | 设置合理的阈值和窗口大小 |
| 性能影响 | 使用滑动窗口限制 token 数量 |
