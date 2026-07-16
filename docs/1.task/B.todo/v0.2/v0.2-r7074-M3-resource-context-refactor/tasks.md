---
reqId: 7074
title: "资源上下文重构 — 任务清单"
status: in_progress
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

- [x] T1: grep 全仓库确认 4+1 个文件的全部导入方（0.05 天）
- [x] T2: `chapterLayeredContextBlocks.ts` → 保持不变（块组装逻辑已有498行），类型导入更新至 chapterLayeredContextTypes.ts
- [x] T3: `chapterLayeredContextShared.ts` → 工具函数并入 helpers；类型提取到 chapterLayeredContextTypes.ts（0.1 天）
- [x] T4: `chapterLayeredContextCharacters.ts` → 并入 helpers（0.05 天）
- [x] T5: `chapterLayeredContext.ts` → facade 更新内部 import，外部接口不变（0.05 天）
- [x] T6: 外部消费者 `ChapterAcceptanceAssessmentService.ts` 修复直接 Shared 导入（0.05 天）

## 阶段二：验证

- [x] T7: 章节相关 typecheck 零错误（已确认无 chapterLayered 相关 TS 错误）
- [ ] T8: 章节生成管道端到端走通（0.1 天）
- [ ] T9: typecheck 通过（现有错误均与此重构无关）（0.05 天）

## 阶段三：收尾

- [ ] T10: 更新 README + run_result 状态
- [ ] T11: 提交

## 完成标准

- [x] 5 文件收敛为 3 文件
- [x] 调用方零改动（AI驱动——仅 ChapterAcceptanceAssessmentService 的导入路径优化）
- [ ] 模拟新增一个上下文字段不超过 2 个文件变更
- [ ] 章节生成管端无退化
- [x] typecheck 无 chapterLayered 相关错误
