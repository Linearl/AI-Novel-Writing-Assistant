# README — REQ-7076 Director Pipeline 死循环修复

- **编号**: REQ-7076
- **标题**: Auto-Director Structured Outline Pipeline 死循环修复
- **优先级**: C1
- **版本**: 0.2
- **状态**: in_progress
- **创建日期**: 2026-07-16
- **更新日期**: 2026-07-16

## 概述

修复 Auto-Director 在 structured_outline 阶段的死循环问题。pipeline 在 beat sheet 生成完成后，"确认继续"会重新执行 beat sheet 而不是前进到 chapter_list。

## 根因

1. `resolveAssetFirstRecoveryFromSnapshot` 无条件路由到 structured_outline
2. `mergeVolumeWorkspaceInput` 在结构变更时误清空 beat sheets
3. `beatSheetReady` 是动态计算值，持久化不一致导致校验失败

## 六件套

| 文件 | 状态 |
|------|------|
| README.md | ✅ |
| REQ-7076-director-pipeline-loop-fix.md | ✅ |
| REQ-7076-director-pipeline-loop-fix-original.md | ✅ |
| design.md | ✅ |
| tasks.md | ✅ |
| decision_log.md | ✅ |
| run_result.json | ✅ |
