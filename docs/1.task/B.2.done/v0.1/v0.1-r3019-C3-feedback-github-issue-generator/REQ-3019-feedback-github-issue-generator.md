---
description: "REQ-3019 用户反馈→AI 生成 GitHub Issue"
update_time: 2026-07-13
---

# REQ-3019 用户反馈→AI 生成 GitHub Issue

> 状态：🚧 进行中

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-3019 |
| 优先级 | P2 |
| 来源 | 诊断报告 `docs_dev/3.analysis/diagnosis/2026-07-13-feedback-feature-diagnosis.md` |
| 关联需求 | REQ-2036（旧版用户反馈系统，已被本需求替代） |

---

## 1. 背景与问题

现有反馈系统（REQ-2036）存在以下问题：

1. **入口隐蔽**：Dialog 触发按钮藏在界面中，用户难以发现
2. **无上下文收集**：提交反馈时不自动抓取日志/操作序列，管理员拿到的只是用户描述
3. **无 AI 格式化**：存储了原始内容，但没有生成可直接提交的 GitHub Issue
4. **产物不可用**：用户拿到的是"提交成功"提示，而非"可以贴到 GitHub 的 Issue"
5. **两步提交**：先创建再上传附件，可能中间态丢失

用户使用的是编译版应用，看不到源码，反馈时难以提供足够的调试信息。

---

## 2. 目标与范围

### 2.1 目标

1. 用户在任何页面都能一键打开反馈表单（FAB 浮动按钮）
2. 提交反馈时自动收集前端日志、网络错误、路由变化、操作序列和后端日志
3. AI 将零散信息格式化为结构化 GitHub Issue Markdown（环境信息 + 操作序列 + 错误日志 + 初步分析）
4. 用户预览后一键复制，跳转 GitHub Issues 页面粘贴提交

### 2.2 In Scope

**前端**：
- FAB 浮动按钮（右下角 💬，始终可见）
- 反馈表单弹窗（描述 + 可选截图，Ctrl+V 粘贴支持）
- 前端上下文收集器（console 日志、异常、网络错误、路由、操作序列）
- Issue 预览 + 复制 + 跳转 GitHub

**后端**：
- AI Issue 生成端点（接收上下文 + 调用 LLM 格式化）
- 截图临时上传端点（辅助 AI 理解，生成后清理）
- Issue 生成 Prompt 注册（PromptAsset）

**共享**：
- 精简后的 feedback 类型定义

### 2.3 Out of Scope

- 管理员审核流程（列表/详情/归档/删除）
- 评论系统（直接在 GitHub Issue 讨论）
- AI 源码分析（用户端是编译版，无源码）
- 自动创建 GitHub Issue（需要 token 配置，手动复制即可）
- severity/category 表单字段（AI 从描述推断标签）

---

## 3. 需求详情

### 3.1 FAB 浮动按钮

WHEN 用户在任何页面浏览时 THE SYSTEM SHALL 在页面右下角显示一个固定的 💬 浮动按钮。
WHEN 用户点击该按钮 THE SYSTEM SHALL 打开反馈表单弹窗。

### 3.2 反馈表单

WHEN 反馈弹窗打开 THE SYSTEM SHALL 展示以下字段：
- 问题描述（必填，textarea，最多 5000 字）
- 截图区域（可选，支持 Ctrl+V 粘贴 + 文件选择，最多 5 张，帮助 AI 理解现象）

WHEN 用户点击"生成 Issue" THE SYSTEM SHALL 收集前端上下文并提交到后端。

### 3.3 前端上下文收集器

应用启动时 THE SYSTEM SHALL 安装全局上下文收集器，以环形缓冲区收集：
- console.error / console.warn 日志（最近 100 条）
- 未捕获异常（window.onerror / unhandledrejection，最近 20 条）
- 网络请求错误（最近 20 条，含 URL + 状态码 + 响应体摘要）
- 路由变化历史（最近 30 次）
- 关键操作序列（最近 50 次页面切换/功能调用）
- 应用版本号 + 浏览器信息

上下文数据总量上限 50KB，超出时截断最旧条目。

### 3.4 AI Issue 生成

WHEN 后端收到反馈提交请求 THE SYSTEM SHALL 调用 LLM 将用户描述 + 上下文格式化为 GitHub Issue Markdown。

生成的 Issue 格式包含：
1. 问题描述（用户原文）
2. 环境信息（版本、浏览器、路由）
3. 操作序列（时间线）
4. 错误日志（前端 + 网络 + 后端）
5. 初步分析（AI 从日志推断的可能原因，不分析源码）

### 3.5 预览 + 复制 + 跳转

WHEN AI 生成完成 THE SYSTEM SHALL 展示：
- 渲染后的 Markdown 预览
- [复制内容] 按钮
- [在 GitHub 中提交] 按钮（跳转 GitHub Issues 新建页面）

---

## 4. 验收标准

- [ ] 右下角 💬 FAB 按钮始终可见，点击打开反馈弹窗
- [ ] 支持 Ctrl+V 粘贴截图，图片预览网格 + 删除
- [ ] 提交时自动收集前端上下文（console/异常/网络/路由）
- [ ] 后端成功调用 LLM 生成格式化 Issue Markdown
- [ ] 生成的 Issue 包含环境信息、操作序列、错误日志
- [ ] 预览页正确渲染 Markdown
- [ ] [复制内容] 按钮将 Issue Markdown 写入剪贴板
- [ ] [在 GitHub 中提交] 按钮跳转到正确的 Issues 页面
- [ ] 类型检查通过（pnpm typecheck）
- [ ] 现有测试不受影响（pnpm test）

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| 上下文数据量过大导致请求超限 | 环形缓冲区 + 50KB 总量上限 |
| LLM 生成延迟（3-10 秒） | Loading 状态 + 超时处理（30 秒） |
| 劫持 console 可能递归 | 收集器内部日志不入队列 |
| 截图临时存储空间 | TTL 1 小时自动清理 |

---

## 6. 关联与边界

- 替代 REQ-2036（旧版用户反馈系统）
- Issue 生成 prompt 必须注册到 `server/src/prompting/`（Prompt Governance 约束）
- 不涉及 Prisma Schema 变更（文件系统存储）

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-13 | 创建 | 初始版本，基于诊断报告生成 |
