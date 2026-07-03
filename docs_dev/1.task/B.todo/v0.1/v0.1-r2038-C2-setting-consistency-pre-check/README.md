---
description: "REQ-2038 设定一致性前置校验任务包 README"
status: pending
priority: p2
created: 2026-07-03
updated: 2026-07-03
---

# REQ-2038: 设定一致性前置校验

## 基本信息

| 字段 | 值 |
|------|-----|
| 编号 | REQ-2038 |
| 标题 | 设定一致性前置校验 |
| 类型 | 核心功能开发 (2xxx) |
| 复杂度 | M2 (medium) |
| 优先级 | p2 |
| 状态 | pending |
| 目标版本 | v0.1 |
| 创建日期 | 2026-07-03 |

## 概述

分阶段实现设定一致性校验。本次（v0.1）先做 LLM 内置校验——设定生成/修改后自动跑一次 LLM 校验，检测设定内部矛盾。后续迭代加变更 diff + 影响分析。

## 核心功能

1. **LLM 校验 Prompt**：在 `prompting/` 注册设定校验 prompt，支持字段矛盾、时间线冲突、世界观自洽性检测
2. **校验服务**：server 端校验服务，接收设定数据，调用 LLM 输出结构化校验报告
3. **Auto-Director 集成**：world building 阶段完成后自动触发校验
4. **客户端展示**：设定页面展示校验结果，支持一键修复或忽略

## 来源

竞品分析（游蜂写作） → `docs_dev/3.analysis/report/2026-07-03-竞品分析-游蜂写作.md`

## 任务包六件套

- [ ] README.md - 本文件
- [ ] REQ-2038-setting-consistency-pre-check.md - 需求工作副本
- [ ] REQ-2038-setting-consistency-pre-check-original.md - 需求冻结副本
- [ ] design.md - 技术设计文档
- [ ] tasks.md - 任务拆解
- [ ] decision_log.md - 决策日志
- [ ] run_result.json - 运行结果

## 相关文档

- 需求来源：竞品分析-游蜂写作
- 涉及层：server（prompt + 校验服务）、client（设定页面校验结果展示）
