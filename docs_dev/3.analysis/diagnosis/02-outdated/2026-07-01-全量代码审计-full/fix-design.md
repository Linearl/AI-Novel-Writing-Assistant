# P1 关键问题修复设计文档

> 创建时间：2026-07-01 | 基于审计报告：2026-07-01-全量代码审计-full

## [S1] 问题范围

本次修复聚焦审计报告中 7 个 P1 关键问题：

| ID | 问题 | 影响 |
|---|---|---|
| SEC-001 | authMiddleware 空实现 | 所有 API 无认证保护 |
| SEC-002 | 无速率限制 | LLM 端点可被无限调用 |
| ARCH-001 | novel ↔ planner 循环引用 | 模块边界失效 |
| QUA-001 | 30 个文件超 700 行 | 职责不清、维护困难 |
| QUA-002 | 80+ 函数超 50 行 | 难以测试和理解 |
| OBS-001 | LoggerService 零引用 | 123 处 console.* 绕过 |
| STB-008 | 无 unhandledRejection 处理 | 静默崩溃风险 |

## [S2] 修复方案详情

### [S2.1] SEC-001: 静态 API Token 认证

**目标**: 实现简单有效的 API 认证机制

**方案**:
1. 创建 `server/src/services/auth/TokenService.ts`
   - 首次启动生成 32 字节随机 token
   - 写入 `.env` 文件的 `API_TOKEN=` 字段
   - 提供 `getToken()` 和 `validateToken(token)` 方法

2. 重写 `server/src/middleware/auth.ts`
   - 从 `Authorization: Bearer <token>` header 提取 token
   - 调用 TokenService 验证
   - 失败返回 401 `{ error: 'Unauthorized' }`

3. 前端适配
   - 在 `client/src/lib/api.ts` 的请求拦截器中自动附加 token
   - token 存储在 localStorage
   - 401 响应时跳转登录页或提示输入 token

**文件变更**:
- 新建: `server/src/services/auth/TokenService.ts`
- 修改: `server/src/middleware/auth.ts`
- 修改: `server/src/app.ts` (启动时初始化 token)
- 修改: `client/src/lib/api.ts` (请求拦截器)

---

### [S2.2] SEC-002: 速率限制

**目标**: 防止 API 滥用，保护 LLM 额度

**方案**:
1. 安装依赖: `pnpm add express-rate-limit`
2. 创建 `server/src/middleware/rateLimiter.ts`
   - 全局默认: 100 req/min
   - LLM 端点: 20 req/min
   - 返回 429 + `Retry-After` header

3. 在 `server/src/app.ts` 中挂载
   - 全局中间件: `app.use(globalLimiter)`
   - LLM 路由: `app.use('/api/llm', llmLimiter)`

**文件变更**:
- 新建: `server/src/middleware/rateLimiter.ts`
- 修改: `server/src/app.ts`
- 修改: `package.json` (添加依赖)

---

### [S2.3] ARCH-001: 引入中介层解耦循环引用

**目标**: 消除 novel ↔ planner 双向循环引用

**方案**:
1. 创建 `server/src/services/mediation/` 目录

2. 分析交叉调用点
   - 读取 `novelCoreReviewService.ts` 中对 planner 的调用
   - 读取 planner 中对 novel 的调用
   - 提取共享接口

3. 创建 `NovelPlannerMediator.ts`
   - 定义接口: `IPlannerService`, `INovelService`
   - 实现中介方法，转发调用

4. 修改依赖方向
   - novel → mediator (不再直接 import planner)
   - planner → mediator (不再直接 import novel)

**文件变更**:
- 新建: `server/src/services/mediation/NovelPlannerMediator.ts`
- 新建: `server/src/services/mediation/interfaces.ts`
- 修改: `server/src/services/novel/novelCoreReviewService.ts`
- 修改: `server/src/services/planner/` (相关文件)

---

### [S2.4] QUA-001: 超大文件拆分

**目标**: 30 个超大文件全部拆分至 <400 行

**拆分清单（按优先级排序）**:

**Server 端 (15 个)**:
| 原文件 | 行数 | 拆分策略 |
|---|---|---|
| PlannerService.ts | 992 | 按职责拆为 PlannerCore/PlannerQuery/PlannerCommand |
| CharacterPreparationService.ts | 845 | 拆为 CharacterCreate/CharacterUpdate/CharacterQuery |
| novelCorePipelineExecutor.ts | ~800 | 拆为 PipelineStages/PipelineRunner |
| novelCoreReviewService.ts | ~750 | 拆为 ReviewAnalyzer/ReviewReporter |
| ... (其余 11 个) | | 按功能域拆分 |

**Client 端 (9 个)**:
| 原文件 | 行数 | 拆分策略 |
|---|---|---|
| NovelAutoDirectorDialog.tsx | 654 | 提取 hooks + 拆分子组件 |
| PromptSlotPanel.tsx | ~700 | 拆为 PromptSlotList/PromptSlotEditor |
| ... (其余 7 个) | | 提取 hooks + 子组件 |

**Shared (6 个)**:
| 原文件 | 行数 | 拆分策略 |
|---|---|---|
| directorRuntime.ts | 1273 | 按阶段拆为 director/types.ts + director/stages/ |
| ... (其余 5 个) | | 按类型/接口域拆分 |

**通用拆分策略**:
- 提取工具函数到 `utils/` 子目录
- 提取类型定义到 `types.ts` 或 `types/` 子目录
- 提取 hooks 到 `hooks/` 子目录
- 提取子组件到 `components/` 子目录
- 保持每个拆分模块 <400 行

---

### [S2.5] QUA-002: 超长函数拆分

**目标**: 优先拆分影响最大的超长函数

**拆分清单**:
1. `runFromReady()` (~610 行) → 拆为 runInit/runExecute/runFinalize
2. `NovelAutoDirectorDialog` 组件 (~654 行) → 提取 useDirectorDialog hook + 子组件
3. 其余 Top-10 超长函数 → 按职责提取子函数

**拆分策略**:
- 提取纯逻辑到独立函数
- React 组件: 提取 custom hooks + 子组件
- 服务函数: 按阶段/职责拆分
- 保持每个函数 <50 行

---

### [S2.6] OBS-001: Logger 迁移

**目标**: server 端全量迁移 console.* 到 LoggerService

**方案**:
1. 确认 LoggerService 接口
   - `logger.error(msg, meta?)`
   - `logger.warn(msg, meta?)`
   - `logger.info(msg, meta?)`
   - `logger.debug(msg, meta?)`

2. 迁移范围 (server 端 ~52 个文件)
   - `server/src/services/` → 全量迁移
   - `server/src/routes/` → 全量迁移
   - `server/src/middleware/` → 全量迁移
   - `server/src/agents/` → 全量迁移
   - `server/src/modules/` → 全量迁移

3. 迁移规则
   - `console.log` → `logger.info`
   - `console.warn` → `logger.warn`
   - `console.error` → `logger.error`
   - `console.debug` → `logger.debug`
   - 保留结构化元数据作为第二参数

4. 导入统一
   - `import { logger } from '@/services/logging/LoggerService'`

---

### [S2.7] STB-008: 进程保护

**目标**: 防止未捕获异常导致静默崩溃

**方案**:
1. 在 `server/src/app.ts` 中添加:
   ```typescript
   process.on('unhandledRejection', (reason, promise) => {
     logger.error('Unhandled Rejection', { reason, promise });
     process.exit(1);
   });

   process.on('uncaughtException', (error) => {
     logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
     process.exit(1);
   });

   process.on('SIGTERM', () => {
     logger.info('SIGTERM received, shutting down gracefully');
     server.close(() => process.exit(0));
   });

   process.on('SIGINT', () => {
     logger.info('SIGINT received, shutting down gracefully');
     server.close(() => process.exit(0));
   });
   ```

2. 确保数据库连接关闭逻辑在退出前执行

**文件变更**:
- 修改: `server/src/app.ts`

---

## [S3] 实施顺序

按依赖关系排序：

1. **STB-008** — 进程保护（最先，防止后续修改时崩溃）
2. **SEC-001** — 认证机制（安全基础）
3. **SEC-002** — 速率限制（依赖认证）
4. **OBS-001** — Logger 迁移（后续修改需要日志）
5. **ARCH-001** — 循环引用解耦（架构基础）
6. **QUA-001** — 超大文件拆分（依赖架构清晰）
7. **QUA-002** — 超长函数拆分（最后，依赖文件拆分完成）

## [S4] 验证标准

每个修复项完成后需通过：

1. **编译检查**: `pnpm typecheck` 通过
2. **测试通过**: `pnpm test` 通过
3. **功能验证**: 手动验证核心功能正常
4. **行数检查**: 拆分后文件 <400 行，函数 <50 行
5. **循环引用检查**: `pnpm madge --circular` 无循环

## [S5] 风险与缓解

| 风险 | 缓解措施 |
|---|---|
| 拆分引入 bug | 每个拆分模块保持原有测试通过 |
| 认证影响现有功能 | 提供配置项禁用认证（开发环境） |
| 循环引用解耦不彻底 | 使用 madge 工具验证依赖图 |
| Logger 迁移遗漏 | 使用 grep 确认零 console.* 残留 |
