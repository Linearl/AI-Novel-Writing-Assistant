---
description: "REQ-7042: 错误分类器 — 决策日志"
update_time: "2026-07-11"
status: todo
---

# REQ-7042: 错误分类器 — 决策日志

## 决策1: 错误分类体系的定位

**决策日期**：2026-07-11

**背景**：错误分类器应该放在哪一层？是独立模块还是嵌入现有 structuredOutput.ts？

**选项**：
- **方案A**: 在现有 `structuredOutput.ts` 中扩展，增加处理策略映射
- **方案B**: 新建独立 `errorClassifier.ts`，作为上层统一入口

**决策**：✅ 方案B

**理由**：
1. `structuredOutput.ts` 职责是结构化输出策略，错误分类是更上层的关注点
2. 错误分类器需要覆盖 HTTP 状态码、网络错误等非结构化输出的错误源
3. 独立文件更容易测试和维护
4. 与现有 `structuredOutput.ts` 保持单向依赖（分类器读取 StructuredOutputErrorCategory，不修改它）

**影响**：
- 新增 `server/src/llm/errorClassifier.ts`
- 不修改 `structuredOutput.ts`

---

## 决策2: 错误分类的数量

**决策日期**：2026-07-11

**背景**：错误分类应该定义多少种？太粗无法指导处理策略，太细增加维护负担。

**选项**：
- **方案A**: 4 种（可重试 / 需配置 / 需人工 / 系统错误）
- **方案B**: 8 种（按具体场景细分）
- **方案C**: 6 种（与 StructuredOutputErrorCategory 对齐）

**决策**：✅ 方案B（8 种）

**理由**：
1. 4 种粒度太粗，无法区分 rate_limited（需等待）和 retryable_transport（立即重试）
2. 6 种与 StructuredOutputErrorCategory 对齐，但缺少 auth_error、invalid_request 等常见场景
3. 8 种覆盖了所有已知场景，每个分类都有明确的处理策略
4. 新增分类的成本低（只需在映射表中添加条目）

**影响**：
- 定义 8 种 ErrorCategory
- 每种分类有独立的元数据（severity、isRetryable、recommendedAction）

---

## 决策3: 与 StructuredOutputErrorCategory 的关系

**决策日期**：2026-07-11

**背景**：新的 ErrorCategory 与现有的 StructuredOutputErrorCategory 是什么关系？

**选项**：
- **方案A**: 替换 StructuredOutputErrorCategory，统一为新类型
- **方案B**: 并存，新分类器读取旧分类并映射到新分类
- **方案C**: 扩展 StructuredOutputErrorCategory，新增处理策略字段

**决策**：✅ 方案B

**理由**：
1. StructuredOutputErrorCategory 已被 structuredInvoke.ts、structuredInvokeParser.ts 等多处引用
2. 替换需要大规模修改，风险高
3. 新增字段会污染现有类型的职责
4. 并存 + 映射是最安全的方案：旧类型继续服务策略降级，新类型服务全局错误处理

**影响**：
- StructuredOutputErrorCategory 保持不变
- classifyError() 内部通过 classifyFromStructuredOutputCategory() 映射

---

## 决策4: 安全兜底策略

**决策日期**：2026-07-11

**背景**：无法识别的错误应该怎么分类？

**选项**：
- **方案A**: 返回 null，由调用方处理
- **方案B**: 兜底为 system_error（最保守）
- **方案C**: 兜底为 retryable_transport（最激进）

**决策**：✅ 方案B

**理由**：
1. 返回 null 将处理责任推给调用方，增加调用方复杂度
2. 兜底为 retryable_transport 可能导致无限重试，风险高
3. 兜底为 system_error 是最保守的策略：不重试、要求人工介入
4. 未知错误通常确实是系统问题，归为 system_error 合理

**影响**：
- classifyError() 的最后一步始终返回 ERROR_HANDLING_MAP.system_error
- 无法识别的错误不会触发自动重试

---

## 决策5: 是否修改 errorHandler.ts

**决策日期**：2026-07-11

**背景**：新增错误分类器后，是否应该重构 errorHandler.ts 使用新分类？

**选项**：
- **方案A**: 同步重构 errorHandler.ts，替换 formatLlmUpstreamError 的正则匹配
- **方案B**: 不修改 errorHandler.ts，新分类器作为独立能力供上层使用

**决策**：✅ 方案B

**理由**：
1. REQ-7042 的范围是错误分类器本身，不包括重构消费方
2. errorHandler.ts 的 formatLlmUpstreamError 目前工作正常
3. 重构应作为后续独立任务，避免范围蔓延
4. 新分类器可以被渐进式采用

**影响**：
- errorHandler.ts 保持不变
- 新分类器作为独立模块，供 REQ-7040、REQ-7041 等后续任务使用

---

## 总结

| 决策 | 选择 | 理由 |
|------|------|------|
| 实现位置 | 方案B：独立 errorClassifier.ts | 职责分离，易于测试维护 |
| 分类数量 | 方案B：8 种 | 粒度适中，覆盖全场景 |
| 与旧类型关系 | 方案B：并存 + 映射 | 最安全，不破坏现有代码 |
| 安全兜底 | 方案B：兜底 system_error | 最保守，避免无限重试 |
| 是否重构 errorHandler | 方案B：不修改 | 控制范围，渐进式采用 |
