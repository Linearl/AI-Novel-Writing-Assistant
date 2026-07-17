# 决策日志 — REQ-2056 自动导演暂停按钮

## 决策 1：暂停状态复用 waiting_approval

- **决策点**：是否新增 paused 状态枚举
- **选择**：复用 waiting_approval + checkpointType: user_paused
- **理由**：无需 schema 变更、无需数据库迁移、continueTask 流程可复用、followUp 系统已有类似模式
- **日期**：2026-07-17
- **决策者**：用户

## 决策 2：暂停信号传递方式

- **决策点**：通过数据库状态传递 vs 内存标记
- **选择**：通过 workflowService.recordCheckpoint 写入数据库
- **理由**：跨进程（后台 worker + web server）可感知，重启后也能正确恢复
- **日期**：2026-07-17
