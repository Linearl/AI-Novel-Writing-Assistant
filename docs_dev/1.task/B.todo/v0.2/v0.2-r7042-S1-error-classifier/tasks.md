---
description: "REQ-7042: 错误分类器 — 任务清单"
update_time: "2026-07-11"
status: todo
---

# REQ-7042: 错误分类器

## 阶段零：需求就绪

- [x] 需求文档完成
- [x] 技术设计完成
- [x] 任务清单完成
- [x] 决策日志完成

## 阶段一：开发

- [ ] T1: 创建 errorClassifier.ts，定义 ErrorCategory / ErrorSeverity / RecommendedAction 类型
- [ ] T2: 实现 ERROR_HANDLING_MAP 映射表
- [ ] T3: 实现 classifyError() 入口函数 + 子分类函数
- [ ] T4: 实现便捷查询函数（isErrorRetryable / getErrorCategory / getErrorSeverity）

## 阶段二：测试

- [ ] T5: 单元测试 — StructuredOutputErrorCategory 映射（6 种分类）
- [ ] T6: 单元测试 — HTTP 状态码映射（400/401/403/429/502/503/504）
- [ ] T7: 单元测试 — 网络错误码映射（ECONNRESET / ETIMEDOUT / ENOTFOUND）
- [ ] T8: 单元测试 — 安全兜底（未知错误 / null / undefined）
- [ ] T9: 单元测试 — 便捷查询函数

## 阶段三：验证

- [ ] T10: typecheck 通过（pnpm typecheck）
- [ ] T11: 现有测试全部通过（pnpm test）
- [ ] T12: 新增测试覆盖率 >80%

## 阶段四：收尾

- [ ] T13: 更新任务包 README.md 状态
- [ ] T14: 提交变更

## 完成标准

- [ ] 所有任务完成
- [ ] typecheck 通过
- [ ] 测试覆盖率 >80%
- [ ] 现有测试不被破坏
- [ ] 验收标准达成
