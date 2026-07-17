# README — REQ-2056 自动导演暂停按钮

- **编号**: REQ-2056
- **标题**: 自动导演创作工作台增加暂停/继续功能
- **优先级**: C2
- **版本**: v0.2
- **状态**: in_progress
- **创建日期**: 2026-07-17
- **更新日期**: 2026-07-17

## 概述

在创作工作台增加暂停按钮，允许用户随时暂停 AI 自动导演的推进。暂停状态复用现有 `waiting_approval` 机制，记录 `checkpointType: user_paused`，恢复时走现有 continueTask 流程。

## 设计思路

- 复用 `waiting_approval` 状态 + `checkpointType: user_paused`
- while 循环顶端检查暂停标记，检测到后 recordCheckpoint + break
- 前端 running 状态下新增"暂停"按钮

## 六件套

| 文件 | 状态 |
|------|------|
| README.md | ✅ |
| REQ-2056-director-pause.md | ✅ |
| REQ-2056-director-pause-original.md | ✅ |
| design.md | ✅ |
| tasks.md | ✅ |
| decision_log.md | ✅ |
| run_result.json | ✅ |
