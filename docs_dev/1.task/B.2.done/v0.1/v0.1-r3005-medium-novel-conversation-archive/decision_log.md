---
description: "REQ-3005 决策日志"
created: "2026-06-26"
---

# REQ-3005 决策日志

| # | 决策点 | 选项 | 选择 | 理由 | 日期 |
| --- | --- | --- | --- | --- | --- |
| 1 | 编号段分类 | 2xxx（核心功能开发）vs 3xxx（用户界面和体验） | 3xxx | 核心变更是 UI 导航新增 tab + 对话查看页面，后端 API 是辅助性的；用户直接感知的是界面变化 | 2026-06-26 |
| 2 | 复杂度 | simple / medium / complex | medium | 涉及前端新页面 + 新 API + 数据聚合逻辑，不涉及数据库 Schema 变更 | 2026-06-26 |
| 3 | 归档存储格式 | JSON / JSONL / SQLite / 纯文本 | JSONL | 与 Claude Code 一致；逐行追加、流式解析、人类可读、便于 grep | 2026-06-26 |
| 4 | Novel-Thread 关联方式 | 新建外键 / JSON 字段查询 / 新建关联表 | JSON 字段查询 | 不修改 Prisma Schema，保持向后兼容；resourceBindingsJson 已存在 | 2026-06-26 |
| 5 | 列表分页 | offset / cursor | offset | v0.1 简单可控，后续迭代可升级 | 2026-06-26 |
| 6 | 是否新建归档表 | 是 / 否 | 否 | 复用 CreativeHubThread + CreativeHubCheckpoint，避免数据冗余 | 2026-06-26 |
| 7 | 导航位置 | NovelWorkspaceRail 工具区 / 创作流程区 / 全局 Sidebar | NovelWorkspaceRail 工具区 | 与"版本历史"同级，属于项目工具类 tab | 2026-06-26 |

## 待定决策

| # | 决策点 | 阻塞原因 | 预计解决 |
| --- | --- | --- | --- |
| 1 | 服务端 JSONL 存储 vs 纯浏览器下载 | 需用户确认长期归档策略 | dev 阶段确认 |
