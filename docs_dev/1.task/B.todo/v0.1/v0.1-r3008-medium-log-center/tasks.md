---
description: "REQ-3008 任务拆解"
---

# REQ-3008 任务拆解

> 状态：📋 待办

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 后端：引入 winston + daily-rotate-file 依赖 | P0 | 0.5h | ⬜ 待开始 |
| T2 | 后端：LoggerService 实现（结构化日志 + 文件 transport） | P0 | 1.5h | ⬜ 待开始 |
| T3 | 后端：全局错误中间件增强（详细日志写入 + errorId 返回） | P0 | 1h | ⬜ 待开始 |
| T4 | 后端：logQueryService 日志文件查询服务 | P0 | 1.5h | ⬜ 待开始 |
| T5 | 后端：日志查询 API 路由 `GET /api/logs` | P0 | 1h | ⬜ 待开始 |
| T6 | 前端：侧边栏 + 移动端导航新增"日志中心"入口 | P0 | 0.5h | ⬜ 待开始 |
| T7 | 前端：日志中心页面（列表 + 筛选 + 分页 + 详情抽屉） | P0 | 3h | ⬜ 待开始 |
| T8 | 前端：toast 通知增强（具体错误 + "查看详情"跳转） | P0 | 1h | ⬜ 待开始 |
| T9 | 前端：路由注册 `/logs` | P0 | 0.5h | ⬜ 待开始 |
| T10 | 测试：后端日志写入 + 查询 API 测试 | P1 | 1.5h | ⬜ 待开始 |
| T11 | 测试：前端日志中心页面测试 | P1 | 1h | ⬜ 待开始 |
| T12 | 集成验证：端到端日志流（错误 → 日志写入 → 前端查看） | P1 | 0.5h | ⬜ 待开始 |

---

### T1: 引入 winston 依赖

**改动点**: `server/package.json`
**DoD**: `winston` 和 `winston-daily-rotate-file` 安装成功，`pnpm install` 无报错

### T2: LoggerService 实现

**改动点**: `server/src/services/logging/LoggerService.ts`
**DoD**:
- winston logger 单例导出
- Console transport（dev 环境彩色）
- DailyRotateFile transport：`server/logs/app-%DATE%.log`，JSON 格式，maxSize 10m，maxFiles 14d
- Error 文件：`server/logs/error-%DATE%.log` 仅 error 级别
- `server/logs/` 加入 `.gitignore`

### T3: 全局错误中间件增强

**改动点**: `server/src/app.ts`（或现有错误处理中间件文件）
**DoD**:
- 错误发生时调用 `logger.error()` 写入完整上下文（堆栈、请求路径、方法、body）
- API 错误响应中包含 `errorId` 字段
- 具体错误消息透传到响应体（非泛化文案）

### T4: logQueryService

**改动点**: `server/src/services/logging/logQueryService.ts`
**DoD**:
- 读取 `server/logs/` 目录下最近 30 天的日志文件
- 逐行解析 JSON Lines
- 支持 level / startTime / endTime / keyword 筛选
- 支持分页（page + pageSize）
- 按时间倒序返回

### T5: 日志查询 API

**改动点**: `server/src/routes/logs.ts`，`server/src/app.ts` 挂载
**DoD**:
- `GET /api/logs` 正确响应
- 查询参数 level / startTime / endTime / page / pageSize 全部生效
- 返回格式 `{ data, total, page, pageSize }`

### T6: 侧边栏导航

**改动点**: `client/src/components/layout/Sidebar.tsx`，`client/src/components/layout/mobile/mobileSiteNavigation.ts`
**DoD**: "系统"分组"系统设置"下方出现"日志中心"，图标 `ScrollText`，路由 `/logs`

### T7: 日志中心页面

**改动点**: `client/src/pages/logs/` 目录
**DoD**:
- LogFilterBar：等级下拉 + 日期范围选择器
- LogTable：时间 | 等级（彩色标签）| 来源 | 消息 | 操作列
- LogDetailDrawer：行点击展开，显示堆栈、请求上下文、errorId
- 分页控件
- TanStack Query 驱动数据获取

### T8: toast 通知增强

**改动点**: `client/src/api/client.ts`
**DoD**:
- 5xx 错误 toast 显示后端返回的具体错误消息（不再 fallback 到"服务器错误，请稍后重试"）
- toast description 包含 errorId
- toast 增加"查看详情"action，点击跳转 `/logs?highlight={errorId}`

### T9: 路由注册

**改动点**: `client/src/router/index.tsx`
**DoD**: `/logs` 路由指向 `LogCenterPage`，lazy 加载

### T10-T11: 测试

**DoD**:
- 后端：LoggerService 写入测试、logQueryService 筛选分页测试、API 路由测试
- 前端：LogCenterPage 渲染测试、筛选交互测试

### T12: 集成验证

**DoD**: 手动触发一个后端错误 → 确认 toast 显示具体信息 → 日志中心能看到对应条目 → 筛选和详情正常
