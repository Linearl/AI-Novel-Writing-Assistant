---
description: "REQ-3009 Tab 切换性能优化 任务总线"
id: REQ-3009
title: Tab 切换性能优化
version: 0.1
status: requirements_ready
priority: p3
complexity: C2
created: 2026-07-03
updated: 2026-07-03
tags:
  - performance
  - react
  - frontend
---

> 创建日期：2026-07-03
> 目标版本：v0.1
> 状态：📋 待开发

---

## 1. 任务概述

### 1.1 需求来源

NovelEdit 页面 Tab 切换响应慢，组件过于庞大（30+ state、20+ query），条件查询 staleTime=0 导致每次切换都重新请求，auto-director 激活时级联失效 15 个 query。

### 1.2 核心内容

1. 条件查询设置 `staleTime` 避免重复请求
2. workflow stage sync 添加 2 秒防抖
3. `invalidateNovelDetail` 精细化——按 tab 类型只失效相关 query

### 1.3 前置条件

无

---

## 2. 任务包结构

| 文件 | 说明 |
|------|------|
| README.md | 任务总线（本文件） |
| REQ-3009-tab-switch-performance.md | 需求工作副本 |
| REQ-3009-tab-switch-performance-original.md | 需求原始冻结副本 |
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
