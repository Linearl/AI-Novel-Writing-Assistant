---
description: "REQ-2039 网络连接自动恢复 任务总线"
id: REQ-2039
title: 闲置后网络连接自动恢复
version: 0.1
status: requirements_ready
priority: p2
complexity: C1
created: 2026-07-03
updated: 2026-07-03
tags:
  - resilience
  - react-query
  - network
---

> 创建日期：2026-07-03
> 目标版本：v0.1
> 状态：📋 待开发

---

## 1. 任务概述

### 1.1 需求来源

用户反馈：长时间闲置（5+ 分钟）后返回页面，TCP 连接已被 OS 回收，请求失败显示"网络连接失败"红色 toast 且永不消失，用户必须手动刷新页面。

### 1.2 核心内容

1. React Query 全局配置优化——`refetchOnWindowFocus: true`、`retry: 3` 指数退避
2. 错误 toast 自动消失——`duration` 从 `Infinity` 改为 5000ms
3. Vite proxy keepalive 配置——添加 `timeout` 和 `proxyTimeout`

### 1.3 前置条件

无

---

## 2. 任务包结构

| 文件 | 说明 |
|------|------|
| README.md | 任务总线（本文件） |
| REQ-2039-idle-network-recovery.md | 需求工作副本 |
| REQ-2039-idle-network-recovery-original.md | 需求原始冻结副本 |
| tasks.md | 任务拆解 |
| design.md | 方案设计 |
| decision_log.md | 决策日志 |
| run_result.json | 执行快照 |

---

## 3. 执行清单

- [ ] 任务拆解（tasks.md）
- [ ] 方案设计（design.md）
- [ ] 开发实现
- [ ] 测试验证
- [ ] 归档
