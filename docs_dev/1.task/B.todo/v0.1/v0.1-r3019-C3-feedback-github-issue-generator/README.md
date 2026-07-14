---
description: "REQ-3019 用户反馈→AI 生成 GitHub Issue 任务总线"
update_time: 2026-07-13
---

> 创建日期：2026-07-13
> 目标版本：v0.1
> 状态：🚧 进行中

---

## 1. 任务概述

### 1.1 需求来源

诊断报告 `docs_dev/3.analysis/diagnosis/2026-07-13-feedback-feature-diagnosis.md` — 对比 data_platform 反馈系统与 ai-novel 现有实现，确认改进方向。

### 1.2 核心内容

1. **FAB 浮动按钮**：右下角始终可见的 💬 反馈入口，替代现有隐蔽的 Dialog 按钮
2. **前端上下文收集器**：自动捕获 console 日志、未捕获异常、网络错误、路由变化、操作序列
3. **AI Issue 生成器**：后端调用 LLM 将用户描述 + 上下文格式化为结构化 GitHub Issue Markdown
4. **预览 + 复制 + 跳转**：用户预览生成的 Issue 内容，一键复制后跳转 GitHub Issues 页面

### 1.3 前置条件

- 无外部依赖（现有 LLM 基础设施已就绪）

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-3019-feedback-github-issue-generator-original.md` | 需求原始冻结副本 | 否 |
| `REQ-3019-feedback-github-issue-generator.md` | 需求工作副本 | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-07-13 | 🚧 进行中 | req 路由完成，六件套生成 |

---

## 4. 执行清单

- [ ] T1: 前端上下文收集器
- [ ] T2: FAB 浮动按钮 + 反馈表单弹窗
- [ ] T3: 后端 AI Issue 生成端点
- [ ] T4: Issue 生成 Prompt 注册
- [ ] T5: 前端预览 + 复制 + 跳转
- [ ] T6: 联调 + 端到端验证
