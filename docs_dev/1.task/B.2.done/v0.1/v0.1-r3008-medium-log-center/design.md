---
description: "REQ-3008 方案设计"
---

# REQ-3008 日志中心 — 方案设计

## 1. 方案概述

采用 **winston 结构化日志 + 文件查询 API + 前端日志中心页面** 的三层架构。

### 1.1 关键决策

1. **日志库选择 winston**：Node.js 生态最成熟的日志库，支持多 transport、日志轮转、结构化 JSON 输出
2. **日志存储为 JSON Lines 文件**：按日期分割，便于 grep 和程序化读取，不需要额外数据库
3. **查询 API 读文件**：直接读取日志文件并解析，避免引入额外存储层
4. **错误通知增强在 axios 拦截器层**：前端拦截器已有的错误处理逻辑增强，同时每次 toast 触发时记录到前端日志缓冲

## 2. 实现细节

### 2.1 后端日志模块

**新增文件**: `server/src/services/logging/LoggerService.ts`

```
server/src/services/logging/
├── LoggerService.ts     # winston logger 单例，导出 logger 实例
├── logQueryService.ts   # 日志文件读取与查询服务
└── index.ts             # 统一导出
```

LoggerService 核心职责：
- 创建 winston logger 实例
- Console transport（开发环境彩色输出）
- File transport：`server/logs/app-%DATE%.log`，JSON Lines 格式
- Error File transport：`server/logs/error-%DATE%.log`，仅 error 级别
- DailyRotateFile transport：maxSize 10m，maxFiles 14d

日志格式（JSON Lines）：
```json
{
  "timestamp": "2026-06-30T12:00:00.000Z",
  "level": "error",
  "message": "章节生成失败",
  "module": "chapterGeneration",
  "stack": "Error: ...\n    at ...",
  "requestContext": { "method": "POST", "path": "/api/chapters/generate", "novelId": "xxx" }
}
```

### 2.2 全局错误中间件增强

**修改文件**: `server/src/app.ts`（或现有错误处理中间件）

现有错误处理中间件增加：
1. 将完整错误（含堆栈、请求上下文）写入 winston logger
2. API 响应中返回 `errorId`（日志条目的关联 ID）和具体错误消息
3. 保留 HTTP 状态码语义，不泄露内部实现细节到错误消息

### 2.3 日志查询 API

**新增文件**: `server/src/routes/logs.ts`

```
GET /api/logs
Query Parameters:
  - level?: "debug" | "info" | "warn" | "error"
  - startTime?: ISO 8601 string
  - endTime?: ISO 8601 string
  - keyword?: string (全文搜索)
  - page?: number (default: 1)
  - pageSize?: number (default: 50, max: 200)

Response:
{
  data: LogEntry[],
  total: number,
  page: number,
  pageSize: number
}
```

logQueryService 实现：
- 读取最近 30 天的日志文件（按文件名日期排序）
- 逐行解析 JSON，按筛选条件过滤
- 分页返回结果

### 2.4 前端 — 侧边栏入口

**修改文件**: `client/src/components/layout/Sidebar.tsx`

在 `navGroups` 的"系统"分组中，"系统设置"之后添加：
```ts
{ to: "/logs", label: "日志中心", icon: ScrollText }
```

同步更新 mobile navigation：`client/src/components/layout/mobile/mobileSiteNavigation.ts`

### 2.5 前端 — 日志中心页面

**新增文件**:
```
client/src/pages/logs/
├── LogCenterPage.tsx        # 页面主组件
├── components/
│   ├── LogFilterBar.tsx     # 筛选栏（等级下拉 + 时间范围）
│   ├── LogTable.tsx         # 日志列表表格
│   ├── LogDetailDrawer.tsx  # 日志详情抽屉（堆栈 / 上下文）
│   └── LogBadge.tsx         # 等级标签（颜色区分）
└── hooks/
    └── useLogs.ts           # 日志查询 hook（TanStack Query）
```

页面布局：
- 顶部：筛选栏（等级下拉 + 日期范围选择器）
- 中部：日志表格（时间 | 等级 | 来源 | 消息 | 操作）
- 行点击展开详情抽屉（堆栈、请求上下文、errorId）
- 底部：分页控件

### 2.6 前端 — toast 通知增强

**修改文件**: `client/src/api/client.ts`

axios 响应拦截器修改：
1. 错误响应中提取 `errorId`，附在 toast description 中
2. toast 增加 action 按钮"查看详情"，点击跳转 `/logs?highlight={errorId}`
3. 移除泛化 fallback 文案"服务器错误，请稍后重试"，改为始终使用后端返回的具体消息

### 2.7 路由注册

**修改文件**: `client/src/router/index.tsx`

添加路由：
```ts
{ path: "/logs", element: <LogCenterPage /> }
```

---

## 3. 依赖变更

| 操作 | 包名 | 说明 |
| ---- | ---- | ---- |
| 新增 | `winston` | 结构化日志库 |
| 新增 | `winston-daily-rotate-file` | 日志轮转 transport |
| 新增 | `@types/winston`（devDep） | 类型定义 |

---

## 4. 文件变更清单

| 文件 | 操作 | 说明 |
| ---- | ---- | ---- |
| `server/package.json` | 修改 | 新增 winston 依赖 |
| `server/src/services/logging/LoggerService.ts` | 新增 | winston logger 单例 |
| `server/src/services/logging/logQueryService.ts` | 新增 | 日志查询服务 |
| `server/src/services/logging/index.ts` | 新增 | 统一导出 |
| `server/src/routes/logs.ts` | 新增 | 日志查询 API 路由 |
| `server/src/app.ts` | 修改 | 挂载日志路由 + 错误中间件增强 |
| `client/src/components/layout/Sidebar.tsx` | 修改 | 新增日志中心导航项 |
| `client/src/components/layout/mobile/mobileSiteNavigation.ts` | 修改 | 移动端同步 |
| `client/src/pages/logs/LogCenterPage.tsx` | 新增 | 日志中心页面 |
| `client/src/pages/logs/components/*.tsx` | 新增 | 页面子组件 |
| `client/src/pages/logs/hooks/useLogs.ts` | 新增 | 日志查询 hook |
| `client/src/api/client.ts` | 修改 | toast 通知增强 |
| `client/src/router/index.tsx` | 修改 | 注册路由 |
