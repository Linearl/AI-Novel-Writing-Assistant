---
description: "REQ-3019 方案设计"
update_time: 2026-07-13
---

# REQ-3019 方案设计

## 1. 方案概述

将现有"管理员审核式"反馈系统改造为"用户自助生成 GitHub Issue"工具。前端新增 FAB 浮动按钮 + 上下文收集器，后端新增 AI Issue 生成端点。用户反馈的最终产物不是存储在服务端的工单，而是可以直接粘贴到 GitHub 的结构化 Issue Markdown。

### 1.1 设计目标

1. **零门槛反馈**：FAB 按钮始终可见，两步操作（填写 + 生成）完成反馈
2. **上下文自动附带**：前端收集器 + 后端日志，用户不需要手动描述环境和操作步骤
3. **AI 格式化整理**：将零散日志组织为结构化 Issue，不分析源码，只描述路径和现象
4. **闭环到 GitHub**：复制内容 + 跳转 GitHub，用户在 GitHub 上完成最终提交

### 1.2 关键决策

1. **FAB 替代 Dialog**：始终可见的浮动按钮，入口发现率从"需找到按钮"提升到"自然看到"
2. **FormData 单请求提交**：表单数据 + 截图一次性上传，消除两步提交的中间态
3. **环形缓冲区收集上下文**：内存占用可控，应用启动时安装，不影响正常业务性能
4. **AI 只做格式化**：用户端是编译版，AI 无法访问源码，只负责将日志组织为结构化文档

### 1.3 不在范围

- 管理员审核流程
- 评论系统
- AI 源码级分析
- 自动创建 GitHub Issue

## 2. 实现细节

### 2.1 前端

#### 2.1.1 FeedbackFab 组件

替换现有 `FeedbackDialog.tsx`，新组件包含：

- **FAB 按钮**：固定右下角，`position: fixed; right: 24px; bottom: 24px`，使用 lucide `MessageSquarePlus` 图标
- **表单弹窗**：标题（问题描述 textarea）+ 截图区（Ctrl+V 粘贴 + 文件选择）
- **预览弹窗**：生成完成后切换为 Markdown 预览 + 复制/跳转按钮

状态机：`form` → `loading` → `preview` → `done`

#### 2.1.2 前端上下文收集器（feedbackContextCollector.ts）

```
模块导出：
- installFeedbackCollector(): void  — 应用启动时调用一次
- collectFeedbackContext(): FeedbackContext  — 提交反馈时调用
```

收集策略：
- **console 日志**：劫持 console.error/warn，环形缓冲区 100 条
- **未捕获异常**：监听 window.onerror + unhandledrejection，20 条
- **网络错误**：拦截 axios 响应错误，20 条（仅记录非 2xx 响应）
- **路由历史**：在 router afterEach 钩子中记录，30 条
- **操作序列**：暴露 `trackAction(type, detail)` 供业务调用，50 条
- **浏览器信息**：navigator.userAgent + 屏幕尺寸（一次性）

防递归：收集器内部的日志标记 `__feedbackCollector` 跳过入队。
总量控制：序列化后检查大小，超过 50KB 时从最旧条目开始截断。

#### 2.1.3 前端 API 层

```typescript
// 重写 api/feedback.ts
POST /api/feedback/generate  // FormData: { description, images[], context }
→ { issueMarkdown: string }
```

### 2.2 后端

#### 2.2.1 路由精简

现有 7 个端点精简为 2 个：

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| POST | /api/feedback/generate | 接收上下文 → AI 生成 Issue Markdown |
| POST | /api/feedback/attachments | 上传截图（临时，TTL 1h） |

移除：管理员列表/详情/归档/删除、评论系统。

#### 2.2.2 AI Issue 生成器（issueGenerator.ts）

流程：
1. 接收 FormData（description + context JSON + 可选图片路径）
2. 组装 prompt（用户描述 + 结构化上下文）
3. 调用项目的 LLM（invokeStructuredLlm 或等效）
4. 返回生成的 Issue Markdown

#### 2.2.3 Prompt 注册

```
server/src/prompting/prompts/feedback/
└── issueGeneration.prompts.ts  — PromptAsset 注册
```

Prompt 核心指令：
- 角色：GitHub Issue 格式化助手
- 输入：用户描述 + 上下文（console/网络/路由/操作序列/后端日志）
- 输出：结构化 Issue Markdown（描述 → 环境 → 操作序列 → 错误日志 → 初步分析）
- 约束：不分析源码，只描述路径和现象；中文输出

### 2.3 存储

- 生成的 Issue Markdown 保存到 `storage/feedback/{timestamp}/issue.md`（备查）
- 截图临时存储到 `storage/feedback/{timestamp}/attachments/`（TTL 1h）

## 3. 接口定义

### 3.1 新增/修改接口

| 方法 | 路径 | 说明 | 权限 |
| ---- | ---- | ---- | ---- |
| POST | /api/feedback/generate | AI 生成 Issue | 登录用户 |
| POST | /api/feedback/attachments | 上传截图 | 登录用户 |

### 3.2 请求/响应示例

**POST /api/feedback/generate**

请求（multipart/form-data）：
```
description: "自动导演生成第三章时卡住了"
context: '{"consoleLogs":[...],"networkErrors":[...],"routeHistory":[...],...}'
images: [File, File]  // 可选
```

响应：
```json
{
  "success": true,
  "data": {
    "issueMarkdown": "## 问题描述\n\n自动导演生成第三章时卡住了\n\n## 环境信息\n..."
  }
}
```

## 4. 数据模型

无数据库变更。文件系统存储：

```
storage/feedback/
└── {timestamp}/
    ├── issue.md          # AI 生成的 Issue Markdown
    └── attachments/      # 截图（TTL 1h）
```

## 5. 异常处理

| 错误码 | 场景 | 处理方式 |
| ---- | ---- | -------- |
| 400 | 描述为空或超长 | 前端校验 + 后端 Zod |
| 500 | LLM 调用失败 | 返回降级内容（纯格式化，无 AI 分析） |
| 504 | LLM 超时（30 秒） | 返回超时提示，允许重试 |

## 6. 验证策略

1. 类型检查：`pnpm typecheck`
2. 单元测试：上下文收集器、API 层
3. 手动验证：FAB 可见性、粘贴截图、生成流程、复制/跳转
4. 端到端：pnpm dev → 提交反馈 → 验证 Issue 内容质量
