# README — REQ-3022 AutoDirector 共享 Stage 组件提取

- **编号**: REQ-3022
- **标题**: AutoDirector 共享 Stage 组件提取 — 消除 5 对双轨 Stage 组件的逻辑重复
- **优先级**: C2
- **版本**: 1.0
- **状态**: requirements_ready
- **创建日期**: 2026-07-17
- **更新日期**: 2026-07-17

## 概述

提取共享 Core 组件，消除 AutoDirector 创建流程中 5 对双轨 Stage 组件的逻辑重复（占总量 ~70%）。每个 Stage 提取 Core 组件包含共享逻辑，两套包装组件（页面级/子组件级）只处理布局差异。

## 六件套

| 文件 | 状态 |
|------|------|
| README.md | ✅ |
| REQ-3022-autodirector-shared-stage.md | ✅ |
| REQ-3022-autodirector-shared-stage-original.md | ✅ |
| design.md | ✅ |
| tasks.md | ✅ |
| decision_log.md | ✅ |
| run_result.json | ✅ |
