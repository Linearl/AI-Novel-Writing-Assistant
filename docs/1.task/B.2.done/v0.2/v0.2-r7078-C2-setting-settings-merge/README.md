# README — REQ-7078 setting/ 与 settings/ 目录合并

- **编号**: REQ-7078
- **标题**: setting/ 与 settings/ 目录合并 — 消除重复命名目录
- **优先级**: C2
- **版本**: 0.2
- **状态**: done
- **创建日期**: 2026-07-17
- **更新日期**: 2026-07-17

## 概述

将 `server/src/services/setting/` 下剩余的 2 个 consistency 文件迁移到 `server/src/services/settings/consistency/` 子目录，更新 2 个外部引用者的 import 路径，删除废弃的 `setting/` 空目录。

## 六件套

| 文件 | 状态 |
|------|------|
| README.md | ✅ |
| REQ-7078-setting-settings-merge.md | ✅ |
| REQ-7078-setting-settings-merge-original.md | ✅ |
| design.md | ✅ |
| tasks.md | ✅ |
| decision_log.md | ✅ |
| run_result.json | ✅ |
