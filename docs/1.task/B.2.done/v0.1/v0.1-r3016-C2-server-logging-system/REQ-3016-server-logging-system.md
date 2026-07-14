# REQ-3016: 服务器日志系统实现

## 需求背景

当前服务器日志没有持久化到文件，导致：
1. 无法事后查看和分析错误
2. 无法追踪问题根源
3. 通知中的错误无法记录和查询
4. 运维和调试困难

## 需求描述

1. **日志持久化**：服务器日志固化到文件系统
   - 在 `server/logs/` 目录下存放日志文件
   - 日志文件按日期自动轮转（例如：`app-YYYY-MM-DD.log`）
   - 日志文件大小限制（例如：100MB），超过后自动归档
   - Git 忽略日志文件（添加到 `.gitignore`）

2. **日志查询接口**：提供 API 查询最近日志
   - GET `/api/logs` - 查询最近的日志
   - 支持按级别过滤（error, warn, info, debug）
   - 支持按时间范围查询
   - 支持关键词搜索
   - 返回格式化的日志条目

3. **日志级别**：支持多个日志级别
   - error：错误和异常
   - warn：警告信息
   - info：一般信息
   - debug：调试信息

## 技术规格

### 日志存储结构

```
server/logs/
├── app-2026-07-12.log          # 当前日期的日志
├── app-2026-07-11.log          # 昨天的日志
├── app-2026-07-10.log.gz       # 归档压缩的日志
└── ...
```

### 日志格式

```
[2026-07-12T10:30:45.123Z] [INFO] [module_name] Log message here
[2026-07-12T10:30:45.456Z] [ERROR] [novelService] novelService.listCharacterCandidates is not a function
  at novelRoutes.ts:145
  ...
```

### API 查询参数

```
GET /api/logs?level=error&since=2026-07-11T00:00:00Z&limit=100&keyword=listCharacterCandidates
```

## 实现任务

### Phase 1: 日志配置和基础设施

- [ ] 1.1 创建日志目录结构
  - 创建 `server/logs/` 目录
  - 添加到 `.gitignore`

- [ ] 1.2 配置日志库（推荐 winston 或 pino）
  - 安装日志库
  - 配置文件轮转和归档
  - 配置日志格式

### Phase 2: 日志中间件集成

- [ ] 2.1 创建日志中间件
  - 记录所有 HTTP 请求
  - 记录错误和异常
  - 记录性能指标（响应时间）

- [ ] 2.2 集成到 Express 服务器
  - 在 app.ts 中使用日志中间件
  - 替换 console.log 为日志库调用

### Phase 3: 日志查询接口

- [ ] 3.1 创建日志查询路由
  - GET `/api/logs`
  - 支持 level, since, until, limit, keyword 参数

- [ ] 3.2 实现日志查询逻辑
  - 读取日志文件
  - 解析和过滤
  - 返回分页结果

### Phase 4: 前端日志查看（可选）

- [ ] 4.1 创建日志查看页面
  - 在 Admin 或 Debug 页面添加日志查看器
  - 实时刷新和过滤

### Phase 5: 测试和验证

- [ ] 5.1 测试日志写入
  - 验证日志持久化到文件
  - 验证日志轮转和归档

- [ ] 5.2 测试日志查询
  - 验证 API 返回正确的日志
  - 验证过滤和搜索功能

## 验收标准

- [ ] 服务器日志自动写入 `server/logs/` 目录
- [ ] 日志文件按日期轮转
- [ ] 日志文件被 Git 忽略
- [ ] API 接口可查询最近的日志
- [ ] 支持按级别和关键词过滤
- [ ] 日志查询响应时间 < 500ms（对于 1000 条日志）
