---
description: "REQ-2041 伏笔埋收可视化追踪 任务总线"
update_time: 2026-07-03
---

> 创建日期：2026-07-03
> 目标版本：v0.1
> 状态：📋 待开发

---

## 1. 任务概述

### 1.1 需求来源

竞品分析：游蜂写作的伏笔追踪功能。详见 docs_dev/3.analysis/report/2026-07-03-竞品分析-游蜂写作.md

### 1.2 核心内容

1. PayoffLedger 类型增强：增加 status、埋设章节、回收章节等字段（shared 层）
2. payoff ledger 服务增强 + 伏笔状态自动更新（server 层）
3. auto-director 集成：章节生成后自动检测新埋设伏笔；后续章节自动检查未回收伏笔（server 层）
4. 伏笔追踪面板 UI：列表展示、状态筛选、埋设/回收章节显示（client 层）

### 1.3 前置条件

无

---

## 2. 任务包结构

| 文件 | 说明 |
|------|------|
| README.md | 任务总线（本文件） |
| REQ-2041-payoff-ledger-visualization.md | 需求工作副本 |
| REQ-2041-payoff-ledger-visualization-original.md | 需求原始冻结副本 |
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
