---
description: "REQ-2002 流式生成死循环检测与提前打断"
---

# REQ-2002 流式生成死循环检测与提前打断

> 状态：⏳ 进行中（完成后改为 ✅ 完成）

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2002 |
| 优先级 | P0 |
| 来源 | 用户反馈 — 模型死循环浪费 token 成本 |
| 关联需求 | 无 |
| 分类 | 7xxx 技术债务和重构 |
| 复杂度 | complex |

---

## 1. 背景与问题

当前系统在正文生成（`chapter_execution` 步骤）中，模型偶尔陷入死循环——输出大段重复内容（相同段落循环、相同场景反复描写、相同对话轮次无限展开）。

**现有防护全部是事后检测**：

| 机制 | 时机 | 问题 |
| ---- | ---- | ---- |
| `chapterTotalTokenLimit`（80k） | 单章 LLM 调用结束后 | 模型已输出 80k token 才被发现 |
| `singleStepTotalTokenLimit`（150k） | 单步（写+审+修）完成后 | 需要 2 次连续超限才触发 |
| `qualityThreshold.repetition < 75` | 质量审核阶段 | 审核本身也消耗 token |
| prompt 反重复约束 | 生成前（提示词层） | 模型行为异常时约束无效 |

**结果**：一个死循环章节可能消耗 80k~150k token，而其中有价值内容可能不到 3k。以 Claude Sonnet 计价，单次浪费约 $0.15~$0.30，批量生成时成本显著。

---

## 2. 目标与范围

### 2.1 目标

1. 在流式输出过程中实时检测重复模式，模型陷入死循环时立即中止生成
2. 中止点应在重复模式确认后的 1000~2000 token 内，而非等待 token 预算耗尽
3. 中止后截断已生成文本到循环起始点之前，保留有效内容
4. 与现有熔断器集成，记录循环打断信号

### 2.2 In Scope

**后端（核心）**：
- 新增 `StreamingRepetitionDetector` 类，在流式 chunk 级别实时检测重复
- 集成到 `ChapterWritingGraph.createChapterStream()` 的流式管道中
- 检测到循环时中止 LLM 流、截断输出、记录原因

**后端（熔断集成）**：
- 新增循环打断信号类型，写入 `DirectorCircuitBreakerService`
- 与现有 `usageAnomalySignal` 共存，不互相覆盖

**前端**：
- 流式展示中，循环打断后显示明确的状态提示（"检测到重复内容，已自动截断"）
- 区分"正常完成"和"循环打断"的视觉反馈

### 2.3 Out of Scope

- 跨章节重复检测（已有 `audit_chapter_continuity` 工具处理）
- prompt 层面的反重复优化（已有，且无法解决模型行为异常）
- 完全避免循环（不可能，只能缩短检测延迟）
- 自动重试被打断的章节（后续迭代，首版仅截断+标记）

---

## 3. 需求详情

### 3.1 流式重复检测器

WHEN LLM 正在流式输出正文（`chapter_execution` 步骤的 `createChapterStream`）
THE SYSTEM SHALL 在每个 chunk 到达时运行重复检测逻辑，不阻塞 chunk 的正常转发。

检测算法要求：
1. 维护一个滑动窗口（最近 N 个 chunk 的文本内容）
2. 计算窗口内的 n-gram 重复率
3. 当连续 X 个 chunk 的重复率超过阈值 Y 时，判定为死循环
4. 检测判定必须在 O(1)~O(windowSize) 时间内完成，不影响流式延迟

### 3.2 死循环确认与中止

WHEN 检测器判定当前输出为死循环
THE SYSTEM SHALL：
1. 立即调用 `AbortController.abort()` 中止 LLM 流
2. 截断已累积的文本，移除循环部分（保留循环起始点之前的全部内容）
3. 如果截断后的有效内容低于最低阈值（如 500 字），标记该章节生成失败
4. 如果截断后的有效内容足够，将截断结果作为该章节的生成结果继续后续流程

### 3.3 截断策略

WHEN 死循环被检测到
THE SYSTEM SHALL 使用以下截断策略：
1. 识别重复模式的起始位置（第一次出现重复内容的 chunk 索引）
2. 将文本截断到该位置之前的最后一个完整句子
3. 如果截断点在段落中间，回退到该段落的起始位置
4. 截断后的文本不得包含任何不完整的句子或段落

### 3.4 熔断器集成

WHEN 循环被打断
THE SYSTEM SHALL 在 `DirectorCircuitBreakerService` 中记录 `streamingLoopDetected` 信号：
- 记录检测到的重复模式描述
- 记录已消耗的 token 数
- 记录截断后保留的有效 token 数
- 该信号计入 `usageAnomaly` 计数器（与 token 超限共享计数）

### 3.5 前端状态展示

WHEN 循环打断导致章节生成中止
THE SYSTEM SHALL 在前端展示：
- 流式输出区域显示截断标记："⚠ 检测到重复内容，已自动截断"
- 截断后的有效内容正常展示
- 章节状态标记为 `loop_truncated`（区别于 `completed` 和 `failed`）

### 3.6 配置参数

THE SYSTEM SHALL 将检测参数暴露为可配置项（含合理默认值）：

| 参数 | 默认值 | 说明 |
| ---- | ---- | ---- |
| `loopDetectorEnabled` | `true` | 总开关 |
| `windowSize` | `20` | 滑动窗口大小（chunk 数） |
| `ngramSize` | `50` | n-gram 长度（字符数） |
| `repetitionThreshold` | `0.7` | 重复率阈值（0~1） |
| `consecutiveHitCount` | `5` | 连续命中阈值次数才判定死循环 |
| `minValidContentLength` | `500` | 截断后最低有效内容长度（字符） |

---

## 4. 验收标准

- [ ] 流式生成正文时，模型输出重复内容后 1000~2000 token 内被检测并中止
- [ ] 中止后截断文本不包含不完整句子或重复片段
- [ ] 截断后的有效内容正确保留并写入章节
- [ ] 熔断器正确记录 `streamingLoopDetected` 信号
- [ ] 前端展示截断标记，区分于正常完成和生成失败
- [ ] 检测逻辑不引入可感知的流式延迟（< 5ms/chunk）
- [ ] 配置参数可通过环境变量或运行时配置覆盖
- [ ] 检测器可通过 `loopDetectorEnabled` 完全关闭

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| 误判：合法的排比/反复手法被识别为循环 | 重复阈值设为 0.7（较高），需连续 5 次命中才判定；可调参 |
| 截断导致章节内容不完整 | 截断回退到完整段落边界；有效内容不足时标记为失败触发重写 |
| 流式延迟增加 | 检测算法 O(windowSize)，窗口仅 20 chunk，开销可控 |
| 与现有 `rewriteIfTooSimilar` 冲突 | 循环打断在流式层，相似度检测在后处理层，互不干扰 |

---

## 6. 关联与边界

- 与 `DirectorCircuitBreakerService` 的关系：新增 `streamingLoopDetected` 信号类型，复用现有熔断器框架
- 与 `ChapterWritingGraph` 的关系：在 `createChapterStream()` 的流式管道中插入检测层
- 与 `streamToSSE()` 的关系：不修改通用 SSE 工具，在章节生成专用的流式回调中处理
- 与 `qualityThreshold.repetition` 的关系：互为补充——流式检测拦截极端死循环，质量评分拦截轻度重复

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-06-26 | 创建 | 初始版本 — req 路由生成 |
