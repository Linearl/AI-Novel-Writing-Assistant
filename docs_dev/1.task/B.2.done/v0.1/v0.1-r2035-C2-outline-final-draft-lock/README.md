---
description: "REQ-2035 大纲终稿锁定 任务总线"
update_time: 2026-07-03
---

> 创建日期：2026-07-03
> 目标版本：v0.1
> 状态：📋 待开发

---

## 1. 任务概述

### 1.1 需求来源

竞品分析：游蜂写作的大纲终稿功能。详见 docs_dev/3.analysis/report/2026-07-03-竞品分析-游蜂写作.md

### 1.2 核心内容

1. Chapter 模型增加 `locked` 字段（shared 层）
2. auto-director 各阶段（replan / 审查 / 补充关系网 / 补充时间线）过滤 locked 章节（server 层）
3. 章节列表增加锁定按钮和状态标识（client 层）

### 1.3 前置条件

无

---

## 2. 任务包结构

| 文件 | 说明 |
|------|------|
| README.md | 任务总线（本文件） |
| REQ-2035-outline-final-draft-lock.md | 需求工作副本 |
| REQ-2035-outline-final-draft-lock-original.md | 需求原始冻结副本 |
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
