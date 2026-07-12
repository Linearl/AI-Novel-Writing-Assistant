# REQ-3016: 服务器日志系统实现

## 任务包状态

**状态**：✅ 完成  
**优先级**：P1  
**复杂度**：C2  
**创建时间**：2026-07-12  
**完成时间**：2026-07-12

## 需求概述

为服务器实现完整的日志系统，包括：
1. 日志持久化到文件系统
2. 日志文件轮转和归档
3. 日志查询 API 接口
4. 前端日志查看器（可选）

## 文档清单

| 文档 | 说明 |
|------|------|
| REQ-3016-server-logging-system.md | 完整需求规格 |
| tasks.md | 任务清单 |
| design.md | 技术设计文档 |
| decision_log.md | 决策记录 |
| run_result.json | 执行结果 |

## 核心功能

### 1. 日志持久化

- 服务器日志自动写入 `server/logs/` 目录
- 日志文件按日期轮转（`app-YYYY-MM-DD.log`）
- 超过 7 天的日志自动压缩归档（.gz）
- 日志文件被 Git 忽略（添加到 `.gitignore`）

### 2. 日志查询 API

**接口**：GET `/api/logs`

**参数**：
- `level`：日志级别（error, warn, info, debug）
- `since`：开始时间（ISO 8601）
- `until`：结束时间（ISO 8601）
- `limit`：返回条数（默认 100，最大 1000）
- `offset`：偏移量（分页）
- `keyword`：关键词搜索
- `module`：模块名称过滤

**响应**：

```json
{
  "data": {
    "items": [
      {
        "timestamp": "2026-07-12T10:30:45.123Z",
        "level": "error",
        "module": "novelService",
        "message": "novelService.listCharacterCandidates is not a function"
      }
    ],
    "total": 150,
    "hasMore": true
  }
}
```

### 3. 日志格式

```
[2026-07-12T10:30:45.123Z] [INFO] [module] Log message
[2026-07-12T10:30:45.456Z] [ERROR] [novelService] novelService.listCharacterCandidates is not a function
```

## 技术栈

- **日志库**：Winston + winston-daily-rotate-file
- **文件轮转**：按日期轮转，保留 30 天
- **压缩归档**：超过 7 天自动压缩（.gz）
- **查询接口**：RESTful API（Express 路由）

## 实现任务

### Phase 1: 基础设施（2 任务）
- 创建日志目录
- 配置日志库

### Phase 2: 日志中间件（2 任务）
- HTTP 请求日志
- 错误日志处理

### Phase 3: 日志查询 API（2 任务）
- 创建查询路由
- 实现过滤逻辑

### Phase 4: 前端集成（2 任务，可选）
- 日志查看组件
- 集成到 Admin 页面

## 验收标准

- ✅ 服务器日志自动写入 `server/logs/`
- ✅ 日志文件按日期轮转
- ✅ 日志文件被 Git 忽略
- ✅ API 接口可查询最近的日志
- ✅ 支持按级别和关键词过滤
- ✅ 日志查询响应时间 < 500ms

## 相关任务

- REQ-3015：修复缺失的服务方法（紧急 bug 修复）
- REQ-3012：任务中心批量操作功能

## 备注

本任务包是用户反馈"通知中有报错"后的紧急响应。日志系统的实现将帮助快速定位和修复类似 `novelService.listCharacterCandidates is not a function` 这样的错误。
