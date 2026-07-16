---
reqId: 7074
title: "资源上下文重构 — 任务清单"
status: requirements_ready
priority: P3
complexity: M3
estimatedEffort: "0.5天"
version: v0.2
created: 2026-07-16
---

# REQ-7074: 资源上下文重构 — 任务清单

## 阶段零：需求就绪

- [x] 需求文档完成
- [x] 技术设计完成
- [x] 任务清单完成
- [x] 决策日志完成

## 阶段一：重构

- [ ] T1: grep 全仓库确认 4 个文件的全部导入方（0.05 天）
- [ ] T2: `chapterLayeredContextBlocks.ts` → 并入 `chapterLayeredContextHelpers.ts`（0.1 天）
- [ ] T3: `chapterLayeredContextShared.ts` → 类型并入独立 types 文件，工具并入 helpers（0.1 天）
- [ ] T4: `chapterLayeredContext.ts` → 保留为 facade，对外接口不变（0.05 天）
- [ ] T5: 验证：调用方接口无变更（编译通过即验证）（0.05 天）

## 阶段二：验证

- [ ] T6: 章节生成管道端到端走通（0.1 天）
- [ ] T7: typecheck 通过（0.05 天）

## 阶段三：收尾

- [ ] T8: 更新 README + run_result 状态
- [ ] T9: 提交

## 完成标准

- [ ] 4 文件收敛为 2-3 文件
- [ ] 调用方零改动
- [ ] 模拟新增一个上下文字段不超过 2 个文件变更
- [ ] 章节生成管端无退化
- [ ] typecheck 通过
