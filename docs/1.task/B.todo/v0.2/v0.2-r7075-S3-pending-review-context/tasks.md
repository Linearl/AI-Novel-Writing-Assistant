---
reqId: 7075
title: "待审上下文注入 — 任务清单"
status: requirements_ready
priority: P3
complexity: S3
estimatedEffort: "0.3天"
version: v0.2
created: 2026-07-16
---

# REQ-7075: 待审上下文注入 — 任务清单

## 阶段零：需求就绪

- [x] 需求文档完成
- [x] 任务清单完成

## 阶段一：实现

- [ ] T1: 确认 REQ-7074 已完成，上下文接口清晰（前置检查）（0.05 天）
- [ ] T2: 实现待审上下文组装：从 GenerationContextAssembler 提取前文摘要 + 角色状态 + 世界变更 + 主题连贯性（0.1 天）
- [ ] T3: 注入到章节审核 prompt 构建流程：长度截断 + 优雅降级（0.05 天）

## 阶段二：验证

- [ ] T4: 验证上下文注入后审校 prompt 格式正确（0.05 天）
- [ ] T5: typecheck 通过（0.05 天）

## 阶段三：收尾

- [ ] T6: 更新 README + run_result 状态
- [ ] T7: 提交

## 完成标准

- [ ] 审校 prompt 包含四大上下文字段
- [ ] 上下文缺失时优雅降级（不报错）
- [ ] Prompt Governance 合规（通过 registry.ts 注册）
- [ ] typecheck 通过
