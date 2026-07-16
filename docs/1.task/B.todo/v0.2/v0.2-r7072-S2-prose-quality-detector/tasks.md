---
reqId: 7072
title: "散文质量检测器 — 任务清单"
status: requirements_ready
priority: P2
complexity: S2
estimatedEffort: "0.7天"
version: v0.2
created: 2026-07-16
---

# REQ-7072: 散文质量检测器 — 任务清单

## 阶段零：需求就绪

- [x] 需求文档完成
- [x] 技术设计完成
- [x] 任务清单完成
- [x] 决策日志完成

## 阶段一：核心实现

- [ ] T1: 分析上游 `ProseQualityDetector.ts` 的 9 种 regex 规则（0.1 天）
- [ ] T2: 实现 `detectProseQuality` 主入口 — 逐行扫描 + 9 种检测器（0.15 天）
- [ ] T3: 实现 9 种 regex 模式 + 安全机制（引号豁免、代码块豁免、上限控制）（0.15 天）
- [ ] T4: 实现 `buildProseQualityAuditReport` — RuntimeAuditReport 格式转换（0.05 天）

## 阶段二：集成与测试

- [ ] T5: 集成到 `ChapterContentFinalizationService.finalizeChapterContent()`（在 runAcceptanceGateOnly 之后、buildRuntimePackage 之前插入）（0.1 天）
- [ ] T6: 单元测试 — 9 种规则各用样本文本验证检测效果（0.1 天）
- [ ] T7: 验证：章节生成管道不被破坏（端到端生成一个章节）（0.05 天）

## 阶段三：收尾

- [ ] T8: typecheck 通过
- [ ] T9: 更新 README + run_result 状态
- [ ] T10: 提交

## 完成标准

- [ ] 9 种规则独立可检测
- [ ] 引号内文本豁免生效
- [ ] 每种码 ≤8 条，总计 ≤40 条
- [ ] 集成不破坏现有管道
- [ ] typecheck + 单元测试通过
