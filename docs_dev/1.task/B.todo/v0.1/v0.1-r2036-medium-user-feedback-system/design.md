---
description: "REQ-2036 用户反馈系统技术设计文档"
---

# REQ-2036 技术设计文档

## 1. 架构概述

### 1.1 系统架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client (React) │────▶│  Server (Express)│────▶│  File System    │
│                  │     │                  │     │  (server/feedback)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 1.2 目录结构

```
server/
├── src/
│   ├── routes/
│   │   └── feedback.ts           # 反馈路由
│   ├── services/
│   │   └── feedback/
│   │       ├── feedbackService.ts    # 反馈业务逻辑
│   │       └── httpHandler.ts        # HTTP 处理函数
│   ├── schemas/
│   │   └── feedback.ts           # Zod schema
│   └── shared/
│       └── feedbackRoot.ts       # 反馈根目录配置
└── feedback/                     # 反馈存储目录（运行时创建）

client/
└── src/
    └── components/
        └── feedback/
            ├── FeedbackDialog.tsx    # 反馈提交弹窗
            ├── FeedbackList.tsx      # 反馈列表
            └── FeedbackDetail.tsx    # 反馈详情
```

## 2. 数据模型

### 2.1 反馈元数据（issue.md frontmatter）

```typescript
interface FeedbackMeta {
  title: string;           // 反馈标题
  severity: 'P1' | 'P2' | 'P3' | 'P4';  // 严重程度
  submitted_at: string;    // ISO 8601 时间戳
  user_id: string;         // 用户 ID
}
```

### 2.2 反馈列表项

```typescript
interface FeedbackItem {
  folderName: string;      // 文件夹名称（如 "1_20260702_093000"）
  userId: string;
  timestamp: string;
  title: string;
  severity: string;
  submittedAt: string;
  hasAttachments: boolean;
  hasComments: boolean;
}
```

### 2.3 反馈详情

```typescript
interface FeedbackDetail extends FeedbackItem {
  description: string;     // 反馈描述
  attachments: string[];   // 附件文件名列表
  comments: Comment[];     // 评论列表
}
```

### 2.4 评论

```typescript
interface Comment {
  id: string;
  author: string;          // 评论作者
  content: string;         // 评论内容（Markdown）
  createdAt: string;       // ISO 8601 时间戳
}
```

## 3. API 设计

### 3.1 POST /api/feedback

**请求**：
```typescript
// multipart/form-data
{
  title: string;           // 必填，1-200 字符
  description: string;     // 必填，1-5000 字符
  severity: 'P1' | 'P2' | 'P3' | 'P4';  // 必填
  attachments?: File[];    // 可选，最多 5 张图片
}
```

**响应**：
```typescript
{
  success: boolean;
  folderName: string;      // 创建的文件夹名称
}
```

**错误**：
- 400：参数校验失败
- 429：速率限制

### 3.2 GET /api/feedback/admin/reviews

**请求**：
```typescript
// Query Parameters
{
  severity?: string;       // 按严重程度筛选
  sort?: 'asc' | 'desc';  // 排序方向
}
```

**响应**：
```typescript
{
  items: FeedbackItem[];
  total: number;
}
```

### 3.3 GET /api/feedback/admin/reviews/:folderName

**响应**：
```typescript
{
  detail: FeedbackDetail;
}
```

### 3.4 POST /api/feedback/admin/reviews/:folderName/archive

**响应**：
```typescript
{
  success: boolean;
}
```

### 3.5 GET /api/feedback/:folderName/comments

**响应**：
```typescript
{
  comments: Comment[];
}
```

### 3.6 POST /api/feedback/:folderName/comments

**请求**：
```typescript
{
  content: string;         // 评论内容（Markdown）
}
```

**响应**：
```typescript
{
  success: boolean;
  comment: Comment;
}
```

## 4. 核心实现

### 4.1 反馈根目录配置

```typescript
// server/src/shared/feedbackRoot.ts
import path from 'path';

const FEEDBACK_ROOT = process.env.FEEDBACK_ROOT
  ? path.resolve(process.env.FEEDBACK_ROOT)
  : path.resolve(__dirname, '../../feedback');

export { FEEDBACK_ROOT };
```

### 4.2 文件夹命名规则

```typescript
function generateFolderName(userId: string): string {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '_')
    .replace(/\.\d{3}Z$/, '');
  return `${userId}_${timestamp}`;
}
```

### 4.3 issue.md 生成

```typescript
function generateIssueMd(meta: FeedbackMeta, description: string, attachments: string[]): string {
  const frontmatter = `---
title: "${meta.title}"
severity: ${meta.severity}
submitted_at: "${meta.submitted_at}"
user_id: "${meta.user_id}"
---`;

  const body = `# ${meta.title}

## 描述

${description}

${attachments.length > 0 ? `## 附件\n\n${attachments.map(a => `![${a}](attachments/${a})`).join('\n')}` : ''}`;

  return `${frontmatter}\n\n${body}`;
}
```

### 4.4 速率限制

```typescript
import rateLimit from 'express-rate-limit';

const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 10, // 最多 10 次
  message: { error: 'too many feedback requests, please try again later' },
});

app.use('/api/feedback', feedbackLimiter);
```

## 5. 前端组件设计

### 5.1 FeedbackDialog

- 触发入口：设置菜单或帮助按钮
- 表单字段：标题、描述、严重程度下拉、附件上传
- 提交后显示成功提示

### 5.2 FeedbackList

- 管理员专用页面
- 卡片列表展示每条反馈
- 支持按严重程度筛选
- 点击进入详情

### 5.3 FeedbackDetail

- 显示完整反馈内容
- 图片附件预览
- 评论区
- 归档按钮

## 6. 安全考虑

1. **速率限制**：防止滥用
2. **文件类型校验**：只允许图片文件
3. **文件大小限制**：每张图片最大 5MB
4. **路径遍历防护**：验证文件名不包含 `..`
5. **管理员认证**：管理接口需登录

## 7. 测试策略

### 7.1 单元测试

- feedbackService：文件夹创建、issue.md 生成、归档逻辑
- schema 验证：Zod schema 校验

### 7.2 集成测试

- API 端点测试
- 文件上传测试

## 8. 依赖项

- `express-rate-limit`：速率限制
- `multer`：文件上传
- `zod`：参数校验
- `fs/promises`：文件系统操作
