---
description: "REQ-2002 方案设计"
---

# REQ-2002 方案设计

## 1. 方案概述

在 `ChapterWritingGraph` 的流式输出管道中插入一个轻量级的 `StreamingRepetitionDetector`，对每个 chunk 的文本进行 n-gram 重复率分析。当连续多个 chunk 的重复率超过阈值时，判定为死循环，立即通过 `AbortController` 中止 LLM 流，截断已累积文本到循环起始点之前，并向熔断器记录信号。

### 1.1 设计目标

1. **实时性**：检测发生在 chunk 到达时，非事后批量分析
2. **零侵入**：不修改通用 `streamToSSE()` 工具，仅在章节生成的流式回调中包装检测层
3. **可配置**：所有阈值通过环境变量暴露，可运行时调参
4. **安全截断**：截断回退到段落/句子边界，不产生残破内容

### 1.2 关键决策

1. **流式层检测 vs 事后检测**：选择流式层——目标就是减少浪费，事后检测无法达到
2. **n-gram 重复率 vs 编辑距离**：n-gram 更快（O(n)），适合流式场景；编辑距离 O(n²) 不适合
3. **AbortController 中止 vs 消费但丢弃**：AbortController 直接断开连接，真正停止 token 消耗
4. **截断回退到段落边界 vs 句子边界**：段落边界更安全，小说文本以段落为语义单元

### 1.3 不在范围

- 跨章节检测
- prompt 优化
- 自动重试（首版不做）

## 2. 实现细节

### 2.1 核心：StreamingRepetitionDetector

位置：`server/src/llm/streamingRepetitionDetector.ts`

```typescript
export interface LoopDetectionResult {
  isLoop: boolean;
  truncationIndex: number;  // 有效内容截止位置
  repeatedSegment: string;  // 被识别的重复片段
  tokenEstimate: number;    // 已消耗的估算 token 数
}

export interface StreamingRepetitionDetectorConfig {
  enabled: boolean;
  windowSize: number;        // 滑动窗口 chunk 数量
  ngramSize: number;         // n-gram 字符长度
  repetitionThreshold: number; // 重复率阈值
  consecutiveHitCount: number; // 连续命中次数阈值
  minValidContentLength: number;
}

export class StreamingRepetitionDetector {
  private chunks: string[] = [];
  private consecutiveHits = 0;
  private config: StreamingRepetitionDetectorConfig;

  constructor(config: StreamingRepetitionDetectorConfig) { ... }

  /**
   * 每个 chunk 到达时调用，返回检测结果。
   * 热路径，必须 < 5ms。
   */
  feed(chunk: string): LoopDetectionResult | null { ... }

  /**
   * 计算最近 windowSize 个 chunk 拼接后的 n-gram 重复率。
   * 使用 Set 去重 n-gram，重复率 = 1 - (unique / total)。
   */
  private computeRepetitionRate(text: string): number { ... }

  /**
   * 从当前窗口回溯，找到重复模式的起始 chunk 索引。
   * 方法：从窗口末尾向前扫描，找到与末尾片段首次相似的位置。
   */
  private findLoopStartIndex(): number { ... }

  /**
   * 从 loopStartIndex 回退到最近的段落边界（双换行符）。
   */
  private findSafeTruncationPoint(text: string, index: number): number { ... }

  reset(): void { ... }
}
```

**算法细节**：

1. `feed(chunk)` 将 chunk 追加到 `this.chunks[]` 滑动窗口
2. 当窗口满（`chunks.length >= windowSize`）时，拼接窗口内文本，计算 n-gram 重复率
3. 重复率 >= `repetitionThreshold` → `consecutiveHits++`，否则重置为 0
4. `consecutiveHits >= consecutiveHitCount` → 判定为死循环
5. 调用 `findLoopStartIndex()` 找到循环起点，再调用 `findSafeTruncationPoint()` 回退到段落边界
6. 返回 `LoopDetectionResult`

**n-gram 重复率计算**：

```
text = 拼接的窗口文本
ngrams = [text[i..i+ngramSize] for i in 0..text.length-ngramSize]
uniqueNgrams = new Set(ngrams)
repetitionRate = 1 - uniqueNgrams.size / ngrams.length
```

### 2.2 集成点：ChapterWritingGraph

位置：`server/src/services/novel/chapterWritingGraph.ts`

在 `createChapterStream()` 方法中（当前调用 `streamTextPrompt()` 的位置），改为流式回调包装：

```typescript
async createChapterStream(params, abortSignal) {
  const detector = new StreamingRepetitionDetector(loadLoopDetectorConfig());
  const controller = new AbortController();
  const combinedSignal = combineAbortSignals(abortSignal, controller.signal);

  const stream = streamTextPrompt({ ...params, signal: combinedSignal });

  let fullText = '';
  for await (const chunk of stream) {
    fullText += chunk.text;
    const result = detector.feed(chunk.text);

    if (result?.isLoop) {
      controller.abort();
      const validText = fullText.slice(0, result.truncationIndex);
      return {
        text: validText,
        status: 'loop_truncated',
        loopInfo: {
          repeatedSegment: result.repeatedSegment,
          tokensSpent: result.tokenEstimate,
          tokensSaved: estimateRemainingTokens(fullText, result.truncationIndex),
        },
      };
    }

    yield chunk;  // 正常转发给 SSE
  }

  return { text: fullText, status: 'completed' };
}
```

### 2.3 熔断器集成

位置：`server/src/services/novel/director/runtime/`

1. 在 `DirectorCircuitBreakerService` 新增方法：
```typescript
recordStreamingLoopDetectedSignal(params: {
  chapterId: string;
  tokensSpent: number;
  tokensSaved: number;
  repeatedSegment: string;
}): CircuitBreakerSignal | null
```

2. 该方法复用 `usageAnomalyCount` 计数器（与 token 超限共享）
3. 在 `novelDirectorAutoExecutionCircuitBreakerRuntime.ts` 的 `resolveUsageCircuitBreaker()` 中，额外查询 `streamingLoopDetected` 信号

### 2.4 前端集成

位置：`client/src/pages/novels/`

1. 流式 SSE 消费层：识别新增的 `loop_truncated` 状态事件
2. 在编辑器中展示截断标记（可复用现有的 error toast 或新增 inline badge）
3. 章节状态展示：`loop_truncated` 显示为黄色警告而非红色错误

### 2.5 配置加载

位置：`server/src/config/`

新增环境变量（`server/.env`）：

```env
LOOP_DETECTOR_ENABLED=true
LOOP_DETECTOR_WINDOW_SIZE=20
LOOP_DETECTOR_NGRAM_SIZE=50
LOOP_DETECTOR_REPETITION_THRESHOLD=0.7
LOOP_DETECTOR_CONSECUTIVE_HIT_COUNT=5
LOOP_DETECTOR_MIN_VALID_CONTENT_LENGTH=500
```

通过 `loadLoopDetectorConfig()` 函数统一加载，提供默认值。

## 3. 接口定义

### 3.1 无新增 HTTP 接口

循环检测完全在流式管道内部处理，不需要新增 API 端点。

### 3.2 SSE 事件扩展

现有流式 SSE 事件中新增一种类型：

```typescript
// 新增事件类型
{
  event: "loop_truncated",
  data: {
    validContent: string,
    loopInfo: {
      repeatedSegment: string,
      tokensSpent: number,
      tokensSaved: number,
    }
  }
}
```

## 4. 数据模型

无数据库 schema 变更。循环打断信号通过现有 `directorLlmUsageRecord` 表的 `metadata` 字段记录（JSON 类型）。

## 5. 异常处理

| 场景 | 处理 |
| ---- | ---- |
| 检测器自身抛异常 | catch + 日志，不阻塞正常生成流（降级为无检测） |
| 截断后有效内容不足 minValidContentLength | 标记为 `failed`，触发正常的重写流程 |
| AbortController.abort() 被调用但流已结束 | 无操作，幂等 |
| 合法的重复修辞被误判 | 可调高阈值或关闭检测器；后续迭代可引入语义级检测 |

## 6. 验证策略

1. 构造死循环 prompt（诱导模型输出重复内容），验证检测器在预期 token 范围内触发
2. 构造含合法排比/反复的文本，验证检测器不误判
3. 测量流式延迟：对比启用/禁用检测器时的 chunk 转发延迟
4. 验证截断后文本在段落边界，无残破句子
5. 验证熔断器正确记录信号
6. 验证前端正确展示 `loop_truncated` 状态
