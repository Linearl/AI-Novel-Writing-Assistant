---
description: "REQ-3019 任务拆解"
update_time: 2026-07-13
---

# REQ-3019 任务拆解

> 状态：🚧 进行中

## 任务概述

### 1. 来源

诊断报告 `docs_dev/3.analysis/diagnosis/2026-07-13-feedback-feature-diagnosis.md`

### 2. 问题

现有反馈系统的产物是存储在服务端的工单，用户无法直接拿到可用于 GitHub Issue 的内容。且缺乏自动上下文收集，用户手动描述问题困难。

### 3. 需求

- FAB 浮动按钮替代 Dialog 入口
- 前端上下文收集器（console/异常/网络/路由/操作序列）
- 后端 AI Issue 生成（prompt 注册到 prompting/）
- 预览 + 复制 + 跳转 GitHub

### 4. 验收标准

> 见 [REQ-3019-feedback-github-issue-generator.md](./REQ-3019-feedback-github-issue-generator.md) 第 4 节。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 前端上下文收集器 | P0 | 2h | ⬜ 待开始 |
| T2 | FAB 浮动按钮 + 反馈表单弹窗 | P0 | 3h | ⬜ 待开始 |
| T3 | 后端 AI Issue 生成端点 | P1 | 2h | ⬜ 待开始 |
| T4 | Issue 生成 Prompt 注册 | P1 | 1h | ⬜ 待开始 |
| T5 | 前端预览 + 复制 + 跳转 | P1 | 2h | ⬜ 待开始 |
| T6 | 联调 + 端到端验证 | P1 | 1h | ⬜ 待开始 |

---

## 逐项展开

### T1: 前端上下文收集器

**目标**: 实现全局上下文收集器，应用启动时安装，提交反馈时导出快照。

**改动点**:
- `client/src/lib/feedbackContextCollector.ts` — **新建**：环形缓冲区收集 console/异常/网络/路由/操作
- `client/src/main.tsx` 或 `client/src/App.tsx` — 调用 `installFeedbackCollector()`

**DoD**:
- 收集器安装后不影响正常业务
- `collectFeedbackContext()` 返回序列化 JSON，总量 < 50KB
- 劫持 console 不产生递归

### T2: FAB 浮动按钮 + 反馈表单弹窗

**目标**: 替换现有 FeedbackDialog，实现始终可见的 FAB 按钮 + 粘贴截图表单。

**改动点**:
- `client/src/components/feedback/FeedbackFab.tsx` — **新建**：FAB + 弹窗 + 表单
- `client/src/components/feedback/FeedbackFab.module.css` — **新建**：样式
- `client/src/components/feedback/FeedbackDialog.tsx` — **删除**
- `client/src/components/feedback/index.ts` — 更新导出

**DoD**:
- FAB 固定右下角，z-index 最高层
- 支持 Ctrl+V 粘贴截图 + 文件选择
- 图片预览网格 + 删除按钮，最多 5 张
- 点击"生成 Issue"触发上下文收集 + 提交

### T3: 后端 AI Issue 生成端点

**目标**: 实现 POST /api/feedback/generate 端点，接收上下文并调用 LLM 生成 Issue。

**改动点**:
- `server/src/modules/feedback/feedbackRoutes.ts` — 重写路由（精简为 2 个端点）
- `server/src/modules/feedback/issueGenerator.ts` — **新建**：AI 生成逻辑
- `server/src/modules/feedback/feedbackStorage.ts` — 精简存储逻辑

**DoD**:
- 端点接收 FormData（description + context + images）
- 调用 LLM 生成结构化 Issue Markdown
- 生成结果保存到 storage/feedback/ 备查
- 截图临时存储 + TTL 清理

### T4: Issue 生成 Prompt 注册

**目标**: 将 Issue 生成 prompt 注册为 PromptAsset，符合 Prompt Governance 约束。

**改动点**:
- `server/src/prompting/prompts/feedback/issueGeneration.prompts.ts` — **新建**
- `server/src/prompting/registry.ts` — 注册新 prompt

**DoD**:
- prompt 作为 PromptAsset 注册到 registry
- prompt 指令包含：角色、输入格式、输出格式、约束（不分析源码）

### T5: 前端预览 + 复制 + 跳转

**目标**: 生成完成后展示 Markdown 预览，提供复制和跳转 GitHub 的能力。

**改动点**:
- `client/src/components/feedback/FeedbackFab.tsx` — 预览状态（在 T2 中一起实现）
- `client/src/api/feedback.ts` — 重写 API 层

**DoD**:
- Markdown 预览正确渲染
- [复制内容] 按钮写入剪贴板
- [在 GitHub 中提交] 按钮跳转 `https://github.com/{owner}/{repo}/issues/new`

### T6: 联调 + 端到端验证

**目标**: 全链路验证：FAB → 表单 → 上下文收集 → AI 生成 → 预览 → 复制 → 跳转。

**改动点**: 无代码改动，纯验证。

**DoD**:
- pnpm typecheck 通过
- pnpm test 通过
- pnpm dev 手动验证完整流程
- 生成的 Issue 内容包含环境信息、操作序列、错误日志

---

## DoD（Definition of Done）

- 所有 T1~T6 完成
- 类型检查和测试全部通过
- 手动验证完整反馈流程可用

---

## 依赖

- 前置依赖：无
- 关联依赖：REQ-2036（旧版反馈系统，本需求替代）
- 后继依赖：无

---

## 验证步骤

1. `pnpm --filter @ai-novel/shared build` — 共享类型构建
2. `pnpm typecheck` — 全量类型检查
3. `pnpm test` — 后端测试
4. `pnpm dev` — 启动开发环境
5. 手动验证：FAB 可见 → 填写描述 → 粘贴截图 → 生成 → 预览 → 复制 → 跳转

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-07-13 | req 路由完成，六件套生成 | ✅ |

---

## 完成判定

- T1~T6 全部完成且 DoD 全部满足后，REQ-3019 达到"已完成"状态。
