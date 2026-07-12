# 设计文档：服务器日志系统

## 架构设计

### 组件关系图

```
Express Server
    ↓
日志中间件 (logging middleware)
    ↓
日志库 (winston/pino)
    ↓
日志文件系统 (server/logs/)
    ↓
日志查询 API (GET /api/logs)
    ↓
前端日志查看器 (可选)
```

### 日志库选择

**推荐方案：winston**

理由：
1. 成熟稳定，社区活跃
2. 支持多种传输方式（文件、控制台、HTTP等）
3. 支持日志轮转和归档
4. 支持自定义格式和过滤
5. TypeScript 类型支持良好

### 日志格式设计

```typescript
interface LogEntry {
  timestamp: string;      // ISO 8601 格式
  level: 'error' | 'warn' | 'info' | 'debug';
  module: string;         // 模块名称
  message: string;        // 日志消息
  metadata?: unknown;     // 附加元数据
  stack?: string;         // 错误堆栈（仅 error 级别）
}
```

### 日志文件命名规则

```
app-YYYY-MM-DD.log          # 当前日志
app-YYYY-MM-DD HH-mm-ss.log  # 历史归档
```

### 日志轮转策略

- 每日轮转：每天 00:00 创建新日志文件
- 大小限制：单个文件最大 100MB
- 归档保留：保留最近 30 天的日志
- 压缩归档：超过 7 天的日志自动压缩（.gz）

### API 查询设计

**GET /api/logs**

查询参数：
- `level`：日志级别（error, warn, info, debug）
- `since`：开始时间（ISO 8601）
- `until`：结束时间（ISO 8601）
- `limit`：返回条数（默认 100，最大 1000）
- `offset`：偏移量（分页）
- `keyword`：关键词搜索（在 message 中搜索）
- `module`：模块名称过滤

**响应格式**：

```json
{
  "data": {
    "items": [
      {
        "timestamp": "2026-07-12T10:30:45.123Z",
        "level": "error",
        "module": "novelService",
        "message": "novelService.listCharacterCandidates is not a function",
        "stack": "...",
        "file": "novelRoutes.ts",
        "line": 145
      }
    ],
    "total": 150,
    "hasMore": true
  }
}
```

## 实现细节

### 1. 日志库配置

```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const transport = new DailyRotateFile({
  filename: 'server/logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '100m',
  maxFiles: '30d',
  zippedArchive: true,
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    transport,
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});
```

### 2. 日志中间件

```typescript
function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
    });
  });
  
  next();
}
```

### 3. 日志查询服务

```typescript
async function queryLogs(params: {
  level?: string;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
  keyword?: string;
  module?: string;
}) {
  // 读取日志文件
  // 解析 JSON 行
  // 应用过滤
  // 返回分页结果
}
```

## 安全考虑

1. **敏感信息过滤**：自动过滤密码、令牌等敏感信息
2. **访问控制**：日志查询接口仅允许管理员访问
3. **日志大小限制**：防止日志文件无限增长
4. **磁盘空间监控**：当日志目录超过阈值时发出警告

## 性能优化

1. **异步写入**：日志写入不影响请求处理
2. **批量写入**：缓冲日志，定期批量写入
3. **索引优化**：对日志文件按时间建立索引
4. **缓存策略**：缓存常用查询结果

## 扩展性

1. **日志级别动态调整**：支持运行时调整日志级别
2. **远程日志**：可扩展支持发送到远程日志服务（如 ELK Stack）
3. **日志分析**：可扩展支持日志统计和分析
4. **告警集成**：可扩展支持基于日志的告警
