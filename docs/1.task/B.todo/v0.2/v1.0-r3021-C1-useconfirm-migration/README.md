# README — REQ-3021 window.confirm/prompt 迁移到 useConfirm

- **编号**: REQ-3021
- **标题**: window.confirm/window.prompt 迁移到 useConfirm — 26 个文件分批迁移
- **优先级**: C1
- **版本**: 1.0
- **状态**: requirements_ready
- **创建日期**: 2026-07-17
- **更新日期**: 2026-07-17

## 概述

将 26 个使用同步阻塞 `window.confirm`/`window.prompt` 的文件迁移到异步 `useConfirm` hook，按 10 个模块批次执行，确保确认对话框 UI 风格统一。

## 六件套

| 文件 | 状态 |
|------|------|
| README.md | ✅ |
| REQ-3021-useconfirm-migration.md | ✅ |
| REQ-3021-useconfirm-migration-original.md | ✅ |
| design.md | ✅ |
| tasks.md | ✅ |
| decision_log.md | ✅ |
| run_result.json | ✅ |
