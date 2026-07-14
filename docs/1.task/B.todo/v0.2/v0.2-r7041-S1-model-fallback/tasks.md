---
description: "REQ-7041: 模型备用切换 — 任务清单"
update_time: "2026-07-11"
status: todo
---

# REQ-7041: 模型备用切换

## 阶段零：需求就绪

- [x] 需求文档完成
- [x] 技术设计完成
- [x] 任务清单完成
- [x] 决策日志完成

## 阶段一：开发

- [ ] T1: 实现错误类型分类（classifyFallbackTrigger）
- [ ] T2: 实现备用模型选择逻辑（selectFallbackModel）
- [ ] T3: 实现多级备用链配置读写（getFallbackChainConfig / saveFallbackChainConfig）
- [ ] T4: 集成到 invokeStructuredLlmDetailed
- [ ] T5: 实现切换日志记录

## 阶段二：测试

- [ ] T6: 单元测试（错误分类：429/401/503/transport_error/schema_mismatch/400）
- [ ] T7: 单元测试（备用模型选择：不同Provider优先/同Provider回退/跳过相同模型）
- [ ] T8: 单元测试（多级备用链：3级遍历/跳过未配置级别）
- [ ] T9: 集成测试（完整调用链路：重试 → 备用切换 → 成功）
- [ ] T10: 集成测试（向后兼容：无chain配置时使用原单一备用）

## 阶段三：验证

- [ ] T11: typecheck通过
- [ ] T12: 单元测试通过
- [ ] T13: 集成测试通过
- [ ] T14: 手动验证（模拟429限流场景，验证切换到不同Provider）

## 阶段四：收尾

- [ ] T15: 更新 requirements.md
- [ ] T16: 更新任务包 README 状态
- [ ] T17: 提交变更

## 完成标准

- [ ] 所有任务完成
- [ ] typecheck 通过
- [ ] 测试覆盖率 > 80%
- [ ] 验收标准达成
