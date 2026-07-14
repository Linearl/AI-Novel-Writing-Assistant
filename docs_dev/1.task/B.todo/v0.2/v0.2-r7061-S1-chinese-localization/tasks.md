---
reqId: 7061
title: "中文本地化 — 任务清单"
status: requirements_ready
priority: P0
complexity: S1
estimatedEffort: "1天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7061: 中文本地化 — 任务清单

## 阶段零：需求就绪

- [x] 需求文档完成
- [x] 技术设计完成
- [x] 任务清单完成
- [x] 决策日志完成

## 阶段一：FR-1 Context Group 标签映射（0.2 天）

> 参照上游 `server/src/prompting/context/contextGroupLabels.ts`（38 行）

- [ ] T1: 分析上游 `contextGroupLabels.ts` 映射结构（0.05 天）
- [ ] T2: 创建 `server/src/prompting/context/contextGroupLabels.ts`，填入 32 个映射（0.1 天）
- [ ] T3: 实现 `getContextGroupLabel()` 函数 + 空兜底逻辑（0.05 天）

## 阶段二：FR-2 上下文块标签中文化（0.2 天）

> 参照上游 `server/src/prompting/prompts/novel/chapterLayeredContextShared.ts`（420 行）

- [ ] T4: 分析上游 `chapterLayeredContextShared.ts` 中的标签定义（0.05 天）
- [ ] T5: 替换本项目对应文件中的英文块标签为中文（0.1 天）
- [ ] T6: 搜索其他 prompt 文件中的硬编码英文标签并替换（0.05 天）

## 阶段三：FR-3 toListBlock + FR-4 引导文本（0.1 天）

- [ ] T7: 修改 `toListBlock()` 空兜底返回"无"（0.02 天）
- [ ] T8: 替换角色引导文本为中文（0.03 天）
- [ ] T9: 替换关系阶段文本为中文（0.02 天）
- [ ] T10: 搜索其他硬编码英文 UI 文本并替换（0.03 天）

## 阶段四：验证与测试（0.5 天）

- [ ] T11: grep 全项目确认无遗漏的英文标签（0.1 天）
- [ ] T12: 编写 contextGroupLabels 单元测试（0.1 天）
- [ ] T13: 编写 toListBlock 单元测试（0.05 天）
- [ ] T14: 生成一个章节的完整 prompt 验证标签显示（0.1 天）
- [ ] T15: typecheck 通过（0.05 天）
- [ ] T16: pnpm test 通过（0.1 天）

## 阶段五：收尾

- [ ] T17: 更新 requirements.md
- [ ] T18: 更新任务包 README 状态
- [ ] T19: 更新 run_result.json 状态
- [ ] T20: 提交变更

## 完成标准

- [ ] 所有任务完成
- [ ] 32 个 context group ID 全部有中文映射
- [ ] 生成的 prompt 中标签为中文
- [ ] toListBlock 空兜底返回"无"
- [ ] typecheck 通过
- [ ] 测试覆盖率 > 80%
