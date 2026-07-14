---
description: "REQ-2002 任务拆解"
---

# REQ-2002 任务拆解

> 状态：⏳ 进行中（完成后改为 ✅ 全部完成）

## 任务概述

### 1. 来源

用户反馈 — 模型死循环输出重复内容，现有事后检测（80k/150k token 阈值）来得太晚，浪费大量 token 成本。

### 2. 问题

正文生成时模型偶尔陷入死循环，当前防护全在事后。需要在流式输出过程中实时检测并提前打断。

### 3. 需求

- 核心：`StreamingRepetitionDetector` 流式重复检测器
- 集成：嵌入 `ChapterWritingGraph.createChapterStream()` 流式管道
- 熔断：与 `DirectorCircuitBreakerService` 集成
- 前端：展示截断状态

### 4. 验收标准

> 见 [REQ-2002.md](./REQ-2002.md) 第 4 节。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 核心：`StreamingRepetitionDetector` 类实现 | P0 | 3h | ⬜ 待开始 |
| T2 | 集成：嵌入 `ChapterWritingGraph.createChapterStream()` | P0 | 2h | ⬜ 待开始 |
| T3 | 熔断：`DirectorCircuitBreakerService` 新增循环信号 | P1 | 1.5h | ⬜ 待开始 |
| T4 | 前端：SSE 事件扩展 + 截断状态展示 | P1 | 1.5h | ⬜ 待开始 |
| T5 | 配置：环境变量 + 运行时配置加载 | P2 | 0.5h | ⬜ 待开始 |
| T6 | 测试：单元测试 + 集成验证 | P1 | 2h | ⬜ 待开始 |

---

## 逐项展开

### T1: 核心 — StreamingRepetitionDetector 类实现

**目标**: 实现流式 chunk 级别的重复检测器，支持 n-gram 重复率计算和安全截断。

**改动点**:
- `server/src/llm/streamingRepetitionDetector.ts` — 新建文件
  - `StreamingRepetitionDetector` 类
  - `LoopDetectionResult` / `StreamingRepetitionDetectorConfig` 接口
  - `feed(chunk)` 核心热路径方法
  - `computeRepetitionRate()` n-gram 分析
  - `findLoopStartIndex()` 循环起点定位
  - `findSafeTruncationPoint()` 段落边界回退

**DoD**:

- [ ] `feed()` 单次调用 < 5ms（20 chunk 窗口、50 字符 n-gram）
- [ ] 连续重复内容 → `consecutiveHits` 正确递增
- [ ] 合法内容 → `consecutiveHits` 正确重置
- [ ] `findSafeTruncationPoint()` 回退到段落边界（双换行符）
- [ ] `reset()` 清空所有状态

---

### T2: 集成 — 嵌入 ChapterWritingGraph

**目标**: 在 `createChapterStream()` 的流式管道中包装检测器，实现检测 → 中止 → 截断的完整链路。

**改动点**:
- `server/src/services/novel/chapterWritingGraph.ts` — 修改 `createChapterStream()` 方法
  - 创建 `StreamingRepetitionDetector` 实例
  - 创建 `AbortController` 并与外部 signal 合并
  - 在 `for await (chunk of stream)` 循环中调用 `detector.feed(chunk.text)`
  - 检测到死循环时 `controller.abort()` + 截断文本 + 返回 `loop_truncated` 结果
- `server/src/llm/abortUtils.ts`（如不存在则新建） — `combineAbortSignals()` 工具函数

**DoD**:

- [ ] 正常生成不受影响（检测器开销可忽略）
- [ ] 死循环时 LLM 流被 `AbortController.abort()` 中止
- [ ] 返回结果包含 `status: 'loop_truncated'` 和 `loopInfo`
- [ ] 截断后的文本在段落边界，无残破句子

---

### T3: 熔断 — DirectorCircuitBreakerService 新增循环信号

**目标**: 将循环打断信号纳入熔断器体系，计入 usage anomaly 计数。

**改动点**:
- `server/src/services/novel/director/runtime/ DirectorCircuitBreakerService.ts` — 新增 `recordStreamingLoopDetectedSignal()` 方法
- `server/src/services/novel/director/automation/ novelDirectorAutoExecutionCircuitBreakerRuntime.ts` — 在 `resolveUsageCircuitBreaker()` 中查询循环信号
- `server/src/services/novel/chapterWritingGraph.ts` — 在截断后调用熔断器记录信号

**DoD**:

- [ ] 循环打断后熔断器正确记录 `streamingLoopDetected` 信号
- [ ] 信号计入 `usageAnomalyCount`，与 token 超限共享计数
- [ ] 连续异常达到 `usageAnomalyOpenAt`（2 次）时触发熔断

---

### T4: 前端 — SSE 事件扩展 + 截断状态展示

**目标**: 前端识别 `loop_truncated` 状态，展示截断标记和原因说明。

**改动点**:
- `client/src/` 下 SSE 消费相关文件 — 识别新增的 `loop_truncated` 事件类型
- 章节编辑器/流式展示组件 — 展示截断标记（黄色警告，非红色错误）
- 章节状态列表 — `loop_truncated` 状态的视觉样式

**DoD**:

- [ ] 流式输出被截断时显示 "⚠ 检测到重复内容，已自动截断"
- [ ] 截断后的有效内容正常展示
- [ ] `loop_truncated` 状态在章节列表中有区别于 `completed`/`failed` 的视觉标识

---

### T5: 配置 — 环境变量 + 运行时配置加载

**目标**: 检测参数可通过环境变量覆盖，提供合理默认值。

**改动点**:
- `server/.env.example` — 新增 `LOOP_DETECTOR_*` 环境变量说明
- `server/src/config/` 下配置加载文件 — 新增 `loadLoopDetectorConfig()` 函数

**DoD**:

- [ ] 6 个配置参数均可通过环境变量覆盖
- [ ] 不设置环境变量时使用合理默认值
- [ ] `LOOP_DETECTOR_ENABLED=false` 完全禁用检测

---

### T6: 测试 — 单元测试 + 集成验证

**目标**: 验证检测器准确性、截断安全性和熔断集成。

**改动点**:
- `server/tests/llm/streamingRepetitionDetector.test.ts` — 检测器单元测试
- `server/tests/novel/chapterWritingGraph.loop.test.ts` — 集成测试

**测试用例**:

1. **死循环检测**：模拟重复 chunk 序列，验证 `isLoop = true`
2. **合法内容不误判**：模拟正常小说文本（含排比），验证 `isLoop = false`
3. **截断边界**：验证截断点在段落边界
4. **有效内容不足**：截断后内容 < minValidContentLength，验证返回 `failed`
5. **配置覆盖**：验证环境变量生效
6. **性能**：`feed()` 20 chunk 窗口 p99 < 5ms

**DoD**:

- [ ] 所有测试用例通过
- [ ] 覆盖率 >= 80%

---

## DoD（Definition of Done）

- 流式生成正文时，重复内容在 1000~2000 token 内被检测并中止
- 截断文本在段落边界，保留有效内容
- 熔断器正确记录信号
- 前端展示截断标记
- 检测开销 < 5ms/chunk
- 配置可覆盖

---

## 依赖

- 前置依赖：无
- 关联依赖：REQ-2001（导入功能）— 无直接依赖，可并行
- 后继依赖：后续迭代可增加自动重试机制

---

## 验证步骤

1. 构造死循环 prompt → 验证检测器在 ~3k token 后触发（而非 80k）
2. 用正常 prompt 生成章节 → 验证无误判
3. 检查截断文本完整性（无残破句子）
4. 检查熔断器数据库记录
5. 检查前端截断标记展示

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-06-26 | req 路由生成任务包 | 完成 |

---

## 完成判定

- T1~T6 全部完成且 DoD 全部满足后，REQ-2002 达到"已完成"状态。
