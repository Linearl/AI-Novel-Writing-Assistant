---
description: "REQ-2057 决策日志：LLM 限流器 TPM/RPM 增强"
reqId: 2057
type: decision_log
created: 2026-07-18
---

# 决策日志

## D1: RPM 实现方案选择

- **日期**：2026-07-18
- **决策点**：RPM 计数器实现方式
- **选项**：
  - A: 固定窗口（每分钟重置）
  - B: 滑动窗口（最近 60 秒）
  - C: 令牌桶
- **选择**：B（滑动窗口）
- **理由**：
  - 固定窗口在边界处有突刺问题（如窗口末尾集中发请求）
  - 令牌桶实现复杂度高，RPM 场景不需要 burst 能力
  - 滑动窗口实现简单（存时间戳数组），平滑且无边界问题
- **风险**：时间戳数组在高并发下可能积累，需定期清理

## D2: TPM 实现方案选择

- **日期**：2026-07-18
- **决策点**：TPM 扣减方式
- **选项**：
  - A: 预估扣减（请求前按 maxTokens 估算）
  - B: 事后扣减（从 response.usage 回填）
  - C: 混合（预估 + 事后校正）
- **选择**：B（事后扣减）
- **理由**：
  - 预估不准确，容易过度限制或不足
  - 事后扣减精确，直接使用实际 token 消耗
  - 需要修改调用链在 `.then()` 中回填，但改动可控
- **风险**：部分 provider 可能不返回 usage → 降级为不扣减

## D3: 默认值选择

- **日期**：2026-07-18
- **决策点**：rpm/tpm/concurrencyLimit 默认值
- **选项**：
  - A: rpm=60, tpm=3M, concurrencyLimit=3（保守，对齐 DeepSeek 低 tier）
  - B: rpm=100, tpm=10M, concurrencyLimit=10（中等，覆盖大部分场景）
  - C: rpm=500, tpm=50M, concurrencyLimit=50（激进，对齐 OpenAI 高 tier）
- **选择**：B
- **理由**：
  - 100 RPM 覆盖大部分厂商默认限制
  - 10M TPM 作为兜底，精确限流靠用户自行调整
  - 并发 10 对大多数场景足够，低 tier 用户可在设置页调低
- **风险**：对低 tier 用户可能偏高，但可自行调低

## D4: 限流器 key 维度

- **日期**：2026-07-18
- **决策点**：限流器实例缓存 key 是否包含 rpm/tpm
- **选项**：
  - A: 仅 provider:model（同一模型共享限流器）
  - B: provider:model:concurrencyLimit:requestIntervalMs:rpm:tpm（当前方案扩展）
- **选择**：B
- **理由**：
  - 不同 rpm/tpm 配置的同一 provider 应走不同限流器
  - 保持与当前 key 策略一致
- **风险**：用户频繁修改配置会创建更多限流器实例，但旧实例无引用后会被 GC
