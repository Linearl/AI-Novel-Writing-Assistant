---
name: weekly-report-workflow
description: 项目周报生成技能。用于用户提到"写周报/周报/weekly report/项目周报"时，AI 自动收集本周进展、生成周报草稿（Markdown），并追加或创建到 docs/7.weekly/。支持通过 ll-workflow-core 路由调用（简写 wk / weekly）。
---

# Weekly Report Workflow | 项目周报生成技能

## 何时使用

当用户提出以下诉求时启用：

- 写周报 / 生成周报 / 项目周报
- weekly report / project weekly report
- wk / weekly
- 按提交记录整理上周进展

## 能力边界

本技能负责任务：

1. 确定周报周期（当前周 or 上周，由 mode 控制）。
2. 从 git log 提取本周提交记录。
3. 从 `docs/` 各数据源自动提炼本周完成内容（新归档任务包、changelog 条目、版本计划进展）。
4. 生成或追加周报到 `docs/7.weekly/YYYY-W{ISO周号}-weekly.md`。
5. 生成"本周迭代对用户的影响"段落（面向产品用户，自然语言）。
6. 生成"经验回灌"段落（从 decision_log / tasks 中提取可复用教训）。

## 配置

- 配置文件：`./config/report-config.json`
  - `mode`: `"current_week"`（默认，当周实时追加）或 `"last_week"`（上周回顾，创建新文件）

## 标准执行流程

当用户触发 wk / weekly 时，AI 应执行以下步骤：

### 步骤 1：确定周报周期

```
mode = "current_week":
  periodStart = 本周一
  periodEnd   = 本周日
  如果 docs/7.weekly/YYYY-W{ISO周号}-weekly.md 已存在 → 追加模式
  否则 → 创建新文件

mode = "last_week":
  periodStart = 上周一
  periodEnd   = 上周日
  始终创建新文件
```

### 步骤 2：收集数据源

按以下优先级从项目文档中提取本周进展：

| 数据源 | 路径 | 提取内容 |
|--------|------|----------|
| Git 提交 | `git log --since="{periodStart}" --until="{periodEnd}" --oneline` | 本周提交摘要 |
| 已完成任务包 | `docs/1.task/B.2.done/{version}/` | 本周新增归档目录的 REQ-*.md |
| 待办任务包状态变更 | `docs/1.task/B.todo/{version}/` | run_result.json 中 status 变化的包 |
| 发布说明 | `docs/6.changelog/releases/release-notes.md` | 最新一条 ### YYYY-MM-DD 条目 |
| 版本计划 | `docs/0.version_plan/v0.2-plan.md` | 任务清单变化、进度更新 |
| 架构知识库 | `docs/1.task/B.todo/{version}/v0.2-architecture-knowledge.md` | 新增决策、架构变更 |

### 步骤 3：生成周报内容

模板包含以下章节：

1. **本周完成** — 按功能域分组的表格 + 关键交付物的项目符号列表
2. **问题与风险** — 本周遇到的问题、影响、处理方式
3. **KPI 指标** — 目标 vs 实际（任务包数、测试通过率、typecheck 等）
4. **经验回灌** — 从 decision_log.md 和 tasks.md 中提取"如果再来一次会怎么做"
5. **下周展望**（current_week 模式下可后续追加）— 下周期待完成的里程碑
6. **本周迭代对用户的影响** — 面向产品用户，用自然语言描述本周交付物对用户的具体价值

### 步骤 4：生成"用户影响"段落

这是周报的核心价值段落。生成规则：

- **面向用户，不面向开发者**：说"自动导演在 API 失败时会自动重试，用户不需要手动点击重试按钮"，不说"实现了指数退避重试机制"
- **从 REQ 文档提炼用户价值**：读取本周完成的 REQ-*.md，从"目标与范围"和"验收标准"章节提取用户可感知的变化
- **参考 release-notes 的行文风格**：一段总述（2-4 句），然后一个项目符号列表（每个 - 一句话，具体、有场景）
- **覆盖所有用户接触点**：自动导演行为变化、UI 变化、写作体验变化、配置体验变化等

### 步骤 5：生成"经验回灌"段落

从本周任务包的 `decision_log.md` 和 `tasks.md` 中提取：

- "为什么选了 A 而不是 B"的决策理由
- 踩过的坑和解决方式
- 验证过程中发现的隐藏约束
- 每条经验一句话，以 `- **标题**：说明` 格式呈现

### 步骤 6：落盘

- 文件命名：`docs/7.weekly/YYYY-W{ISO周号}-weekly.md`（如 `2026-W29-weekly.md`）
- 如果是追加模式：在原文件末尾追加新章节，不覆盖已有内容
- 更新文件 front matter 的 `updated` 日期

## 注意事项

- `mode` 默认为 `"current_week"`。用户说"写上周周报"时，切换为 `"last_week"`。
- 周报面向用户和项目管理者，中文优先。
- 不要在周报正文中出现实现细节术语（如"重构了 useDirectorTaskQuery"），除非在"经验回灌"章节。
- 如果本周没有新提交/新归档任务包，周报仍然生成但标注"本周无新进展"。
