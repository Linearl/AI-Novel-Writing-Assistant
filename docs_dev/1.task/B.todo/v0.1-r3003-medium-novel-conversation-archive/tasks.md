---
description: "REQ-3003 任务拆解"
created: "2026-06-26"
---

# REQ-3003 任务拆解

## 阶段零：准备

- [x] **0.1** 需求调研：分析 NovelWorkspaceRail 结构、现有对话数据模型
- [x] **0.2** 编号分配：REQ-3003（3xxx 用户界面和体验）
- [x] **0.3** 六件套骨架搭建

## 阶段一：后端 API

- [ ] **1.1** `novelHttpSchemas.ts` 新增 Zod schema（conversation list / detail / export）
- [ ] **1.2** `conversationArchiveService.ts` 实现聚合查询逻辑
  - 按 novelId 查询关联 CreativeHubThread
  - 从 CreativeHubCheckpoint 解析 messagesJson
  - JSONL 序列化
- [ ] **1.3** `novelConversationRoutes.ts` 实现 3 个 API 端点
  - `GET /api/novels/:id/conversations`
  - `GET /api/novels/:id/conversations/:threadId`
  - `GET /api/novels/:id/conversations/export`
- [ ] **1.4** 在 `app.ts` 挂载新路由
- [ ] **1.5** 编写路由测试

## 阶段二：前端

- [ ] **2.1** `client/src/api/conversations.ts` API 请求层
- [ ] **2.2** `ConversationList.tsx` 对话线程列表组件
- [ ] **2.3** `ConversationDetail.tsx` 对话详情只读视图
- [ ] **2.4** `NovelConversationsPage.tsx` 页面组件（组装列表 + 详情）
- [ ] **2.5** `NovelWorkspaceRail.tsx` 新增"对话存档"tab
- [ ] **2.6** `client/src/router/index.tsx` 注册路由 `/novels/:id/conversations`

## 阶段三：验证

- [ ] **3.1** 类型检查：`pnpm typecheck`
- [ ] **3.2** 单元测试：`pnpm test`
- [ ] **3.3** 路由测试：`pnpm --filter @ai-novel/server test:routes`
- [ ] **3.4** 前端测试：`pnpm test:client`
- [ ] **3.5** 手动验证：启动 dev 环境，验证完整流程

## 阶段四：收尾

- [ ] **4.1** 更新 `run_result.json` status 为 done
- [ ] **4.2** 提交变更
- [ ] **4.3** 同步 `requirements.md`
