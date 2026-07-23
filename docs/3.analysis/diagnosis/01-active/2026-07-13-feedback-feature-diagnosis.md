---
description: 用户反馈→AI 生成 GitHub Issue 功能的需求诊断与改进方案
---

# 用户反馈功能诊断报告

> 参考项目：`D:\1.workspace\data_platform\02-dev\dev_13`
> 目标项目：ai-novel（当前仓库）
> 日期：2026-07-13

---

## 1. 目标定位

### 用户故事

> 用户在使用编译版应用时遇到问题 → 点击右下角 💬 按钮 → 填写现象描述（可选粘贴截图帮助 AI 理解）→ 系统自动抓取前后端日志/操作序列 → AI 将零散信息格式化成结构化 GitHub Issue Markdown → 用户预览、一键复制 → 跳转 GitHub Issues 页面粘贴提交

### 与参考项目的本质区别

| 维度 | data_platform | ai-novel（目标） |
|------|--------------|-----------------|
| 产物 | 管理员审核的 Issue 工单 | 用户直接提交的 GitHub Issue |
| AI 定位 | 分析 + 修复（深度） | 格式化整理（轻量） |
| 管理端 | 完整审核/归档/修复流程 | **不需要** |
| 截图用途 | 嵌入 issue 附件 | 帮助 AI 理解现象，不嵌入 |
| 用户端假设 | 可访问源码 | 编译版，无源码 |

---

## 2. 现有实现分析

### 2.1 当前架构

| 层级 | 文件 | 状态 |
|------|------|------|
| 共享类型 | `shared/types/feedback.ts` | ✅ 完善（Zod + 接口） |
| 前端入口 | `client/src/components/feedback/FeedbackDialog.tsx` | ⚠️ Dialog 按钮，不易发现 |
| 前端 API | `client/src/api/feedback.ts` | ⚠️ 两步提交 |
| 后端路由 | `server/src/modules/feedback/feedbackRoutes.ts` | ⚠️ 面向管理员审核 |
| 存储层 | `server/src/modules/feedback/feedbackStorage.ts` | ⚠️ 面向持久化 |

### 2.2 当前流程问题

```
现有流程：
用户找到"提交反馈"按钮 → 填表 → 后端存储 → 结束（？）

问题：
1. 入口隐蔽 — Dialog 触发按钮藏在界面中，不是始终可见
2. 无截图粘贴 — 只有文件选择器
3. 两步提交 — 先创建再上传附件，可能中间态丢失
4. 无上下文收集 — 没有自动抓取日志/操作序列
5. 无 AI 格式化 — 存储了原始内容，但没有生成可提交的 Issue
6. 产物不可用 — 用户拿到的是"提交成功"，而不是"可以贴到 GitHub 的 Issue"
```

---

## 3. 目标方案设计

### 3.1 完整用户流程

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  💬 FAB 按钮 │────▶│  反馈表单弹窗  │────▶│  AI 处理 + 预览    │
│  始终可见     │     │  描述 + 截图   │     │  格式化 Issue 内容  │
└─────────────┘     └──────────────┘     └──────────────────┘
                                                  │
                     ┌──────────────┐              │
                     │  复制 + 跳转   │◀─────────────┘
                     │  GitHub Issue │
                     └──────────────┘
```

### 3.2 表单字段（精简）

| 字段 | 必填 | 说明 |
|------|------|------|
| 问题描述 | ✅ | 现象、复现步骤、期望行为 |
| 截图 | ❌ | Ctrl+V 粘贴或选择文件，帮助 AI 理解，不嵌入最终 Issue |

**移除现有字段**：severity、category — 对用户是额外负担，AI 可以从描述中推断标签

### 3.3 自动收集的上下文（全量，低频功能不怕重）

**前端收集：**
| 数据 | 来源 | 说明 |
|------|------|------|
| console 日志 | 劫持 console.error/warn | 最近 N 条，含时间戳 |
| 未捕获异常 | window.onerror / unhandledrejection | 错误消息 + 堆栈 |
| 网络请求错误 | 拦截 axios/fetch 错误 | URL + 状态码 + 响应体 |
| 当前路由 | useLocation() | 页面路径 + 查询参数 |
| 操作序列 | 事件收集器 | 最近 N 次关键操作（页面切换、功能调用） |
| 应用版本 | package.json / 环境变量 | 版本号 + 构建时间 |
| 浏览器信息 | navigator | UA + 屏幕分辨率 |

**后端收集：**
| 数据 | 来源 | 说明 |
|------|------|------|
| 服务器日志 | 最近 N 条日志文件 | 错误和警告级别 |
| 请求日志 | 中间件记录 | 最近 N 条 API 请求 |

### 3.4 AI 生成的 Issue 格式

```markdown
## 问题描述

{用户填写的描述}

## 环境信息

- **应用版本**: v0.x.x (2026-07-13)
- **浏览器**: Chrome 126 / Windows 11
- **屏幕**: 1920×1080
- **当前页面**: /novel/123/auto-director

## 操作序列

1. 14:30:12 打开小说 #123 的自动导演页面
2. 14:30:45 点击"开始生成"
3. 14:31:02 切换到章节视图
4. 14:31:15 **发生错误**

## 错误日志

### 前端错误
```
[14:31:15] ERROR: TypeError: Cannot read properties of undefined (reading 'status')
    at NovelDirectorCard.tsx:142
```

### 网络请求
```
[14:31:14] POST /api/novel/123/director/next-phase → 500
Response: { "error": "Internal server error" }
```

### 服务器日志
```
[2026-07-13 14:31:14] ERROR [director] Phase transition failed: missing volume context
```

## 初步分析

根据日志，问题可能与自动导演的阶段切换流程相关。
前端在读取 `status` 属性时，后端返回了 500 错误，
服务器日志显示缺少 volume context。

> 💡 **提示**：如有截图，请在下方手动粘贴
```

### 3.5 前端交互流程

```
步骤 1: 用户点击 💬 FAB
步骤 2: 弹窗展示表单（描述 + 截图区）
步骤 3: 用户填写描述，可选粘贴截图
步骤 4: 点击"生成 Issue"
步骤 5: 前端收集所有上下文 → 发送到后端
步骤 6: 后端调用 LLM 格式化 → 返回 Issue Markdown
步骤 7: 弹窗切换为预览模式：
        - 渲染的 Markdown 预览
        - [复制内容] 按钮
        - [在 GitHub 中提交] 按钮（跳转 GitHub Issues 页面）
步骤 8: 用户复制后自行在 GitHub 粘贴截图并提交
```

---

## 4. 技术改动清单

### 4.1 前端改动

| 文件 | 改动 | 行数估算 |
|------|------|---------|
| `client/src/components/feedback/FeedbackFab.tsx` | **新建**：FAB + 弹窗 + 预览 | ~300 行 |
| `client/src/components/feedback/FeedbackFab.module.css` | **新建**：FAB + 图片预览样式 | ~120 行 |
| `client/src/components/feedback/FeedbackDialog.tsx` | **删除**（被 FeedbackFab 替代） | -235 行 |
| `client/src/lib/feedbackContextCollector.ts` | **新建**：前端上下文收集器 | ~150 行 |
| `client/src/api/feedback.ts` | **重写**：单请求 FormData 提交 | ~30 行 |
| `client/src/hooks/useFeedbackSubmit.ts` | **新建**：提交状态管理 | ~40 行 |

**前端上下文收集器核心设计：**

```typescript
// feedbackContextCollector.ts
// 安装时机：应用启动时
// 收集内容：console 日志、未捕获异常、网络错误、路由变化、操作序列

interface FeedbackContext {
  consoleLogs: LogEntry[];        // 最近 100 条
  uncaughtErrors: ErrorEntry[];   // 最近 20 条
  networkErrors: NetworkEntry[];  // 最近 20 条
  routeHistory: RouteEntry[];     // 最近 30 次路由切换
  actionSequence: ActionEntry[];  // 最近 50 次关键操作
  appVersion: string;
  browserInfo: BrowserInfo;
}

// 全局单例，环形缓冲区，内存占用可控
```

### 4.2 后端改动

| 文件 | 改动 | 行数估算 |
|------|------|---------|
| `server/src/modules/feedback/feedbackRoutes.ts` | **重写**：精简为 2 个端点 | ~80 行 |
| `server/src/modules/feedback/feedbackStorage.ts` | **精简**：只保留存储 | ~80 行 |
| `server/src/modules/feedback/issueGenerator.ts` | **新建**：AI 生成 Issue | ~120 行 |
| `server/src/prompting/prompts/feedback/` | **新建**：Issue 生成 prompt | ~60 行 |

**后端 API 精简为 2 个端点：**

```
POST /api/feedback/generate    # 提交上下文 → AI 生成 Issue Markdown
POST /api/feedback/attachments # 上传截图（辅助 AI 理解，临时存储）
```

### 4.3 共享类型改动

| 文件 | 改动 |
|------|------|
| `shared/types/feedback.ts` | **重写**：精简为生成请求/响应类型 |

### 4.4 Prompt Governance

Issue 生成 prompt 必须注册到 `server/src/prompting/`：

```
server/src/prompting/prompts/feedback/
└── issueGeneration.prompts.ts    # Issue 生成 prompt（PromptAsset）
```

---

## 5. 与现有功能的关系

### 保留

- ✅ Zod 校验体系
- ✅ 文件系统存储（保存生成记录备查）
- ✅ 截图上传能力（辅助 AI 理解）

### 移除

- ❌ 管理员审核流程（列表/详情/归档/删除）— 不需要
- ❌ 评论系统 — 直接在 GitHub Issue 讨论
- ❌ severity/category 表单字段 — AI 从描述推断标签
- ❌ 两步提交 — 改为单请求

### 简化

- ⬇️ 后端路由：12 个端点 → 2 个端点
- ⬇️ 存储层：meta.json + comments → 仅 issue.md + context 备查

---

## 6. 实施建议

### 推荐顺序

```
① 前端上下文收集器（feedbackContextCollector.ts）
② FAB 组件 + 表单 + 预览（FeedbackFab.tsx）
③ 后端 AI 生成端点（issueGenerator.ts + prompt）
④ 联调 + 端到端验证
```

### 风险点

1. **上下文数据量** — 全量收集可能导致请求体过大，需设上限（建议 context 总量 < 50KB）
2. **截图临时存储** — 截图仅用于 AI 理解，生成后应自动清理（TTL 1 小时）
3. **LLM 延迟** — AI 生成需要几秒，需 loading 状态 + 超时处理
4. **前端收集器性能** — 环形缓冲区大小可控，但劫持 console 需谨慎避免递归
