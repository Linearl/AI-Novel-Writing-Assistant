---
description: "REQ-3003 小说项目对话存档——设计方案"
created: "2026-06-26"
---

# REQ-3003 方案设计

## 1. 架构概览

```
client/src/pages/novels/
  NovelConversationsPage.tsx    ← 新增：对话存档页面
  components/
    ConversationList.tsx         ← 新增：对话线程列表
    ConversationDetail.tsx       ← 新增：对话详情只读视图

client/src/components/layout/
  NovelWorkspaceRail.tsx         ← 修改：新增"对话存档"tab

client/src/api/
  conversations.ts              ← 新增：对话归档 API 请求层

server/src/modules/novel/
  http/
    novelConversationRoutes.ts   ← 新增：对话归档 API 路由
    novelHttpSchemas.ts          ← 修改：新增 Zod schema

server/src/services/novel/
  conversationArchiveService.ts  ← 新增：对话归档业务逻辑
```

## 2. 数据流

```
用户点击"对话存档"tab
  → 路由 /novels/:id/conversations
  → NovelConversationsPage mount
  → GET /api/novels/:id/conversations
    → conversationArchiveService.listThreads(novelId)
      → Prisma: CreativeHubThread.findMany({ where: { resourceBindingsJson contains novelId } })
        + CreativeHubCheckpoint 聚合消息数量
      → 返回线程列表
  → 渲染 ConversationList

用户点击某线程
  → 展开 ConversationDetail
  → GET /api/novels/:id/conversations/:threadId
    → conversationArchiveService.getThreadDetail(threadId)
      → Prisma: CreativeHubCheckpoint.findMany({ where: { threadId }, orderBy: { createdAt: 'asc' } })
      → 解析 messagesJson，展平为消息列表
    → 返回消息列表

用户点击"导出归档"
  → GET /api/novels/:id/conversations/export
    → conversationArchiveService.exportJsonl(novelId)
      → 聚合全部线程 → 全部 checkpoints → 全部 messages
      → 序列化为 JSONL
      → 返回 application/x-jsonlines
  → 浏览器触发下载
```

## 3. API 设计

### 3.1 GET /api/novels/:id/conversations

**Query**: `?page=1&limit=20`

**Response**:
```json
{
  "success": true,
  "data": {
    "threads": [
      {
        "id": "cuid",
        "title": "章节3修改讨论",
        "status": "idle",
        "messageCount": 42,
        "createdAt": "2026-06-26T...",
        "updatedAt": "2026-06-26T..."
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 20
  }
}
```

### 3.2 GET /api/novels/:id/conversations/:threadId

**Response**:
```json
{
  "success": true,
  "data": {
    "threadId": "cuid",
    "title": "章节3修改讨论",
    "messages": [
      {
        "role": "user",
        "content": "...",
        "timestamp": "2026-06-26T...",
        "checkpointId": "..."
      }
    ]
  }
}
```

### 3.3 GET /api/novels/:id/conversations/export

**Query**: `?format=jsonl`

**Response**: `Content-Type: application/x-jsonlines`，每行一个消息对象的 JSON。

### 3.4 JSONL 消息格式

```jsonl
{"threadId":"xxx","threadTitle":"章节3修改讨论","role":"user","content":"帮我改一下第三章的对话","timestamp":"2026-06-26T10:00:00.000Z"}
{"threadId":"xxx","threadTitle":"章节3修改讨论","role":"assistant","content":"好的，我已经分析了第三章的对话...","timestamp":"2026-06-26T10:00:05.000Z"}
```

## 4. 前端路由

```typescript
// client/src/router/index.tsx 新增
{
  path: "novels/:id/conversations",
  element: <NovelConversationsPage />,
}
```

## 5. NovelWorkspaceRail 集成

```typescript
// 在 tools 分类中新增
{
  id: 'conversations',
  label: '对话存档',
  icon: MessageSquareText,  // lucide-react
  stage: 'conversations',
  route: `/novels/${novelId}/conversations`,
}
```

## 6. 关键决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 归档存储格式 | JSONL | 与 Claude Code 一致，逐行追加、人类可读、易于处理 |
| 是否新建数据表 | 否（复用 CreativeHubThread + CreativeHubCheckpoint） | 避免数据冗余，降低维护成本 |
| Novel-Thread 关联方式 | 通过 `resourceBindingsJson` 字段查询 | 不修改 Prisma Schema，保持向后兼容 |
| 列表分页策略 | 传统 offset 分页（page/limit） | v0.1 简单可控，后续可升级 cursor 分页 |
| 是否做全文搜索 | 否（Out of Scope） | v0.1 聚焦浏览和归档导出 |
| 归档文件存储位置 | 先行浏览器下载，后续迭代服务端存储 | 最小可用方案 |
