---
description: AI-Novel 全量代码审计报告，覆盖安全、稳定性、架构、质量、性能、可测试性、可观测性、可维护性、兼容性共 9 个维度
---

# AI-Novel 全量代码审计报告

## 基本信息

| 项目 | 详情 |
|------|------|
| 审计日期 | 2026-07-01 |
| 项目名称 | AI-Novel |
| 审计范围 | 全量代码（full） |
| 扫描文件数 | 1,317 |
| 代码总行数 | 299,035 |
| 综合评分 | **6.19 / 10** |
| 审查轮次 | 2 |

---

## 综合评分

本项目综合评分 **6.19 / 10**，处于"及格但有显著改进空间"水平。

- 权重最高的**安全性**（0.20）得分最低（5.5），认证中间件为空实现、环境变量明文存储等 P1 问题需要立即处理
- **架构**和**质量**维度（各 0.15）得分均为 5.8，存在大量循环依赖、God Object、超长函数等结构性问题
- **性能**（7.2）和**可维护性**（7.0）表现相对较好，但仍有改进空间

---

## 九维评分

| 维度 | 权重 | 得分 | 问题数 | 说明 |
|------|------|------|--------|------|
| 安全性 (security) | 0.20 | 5.5 | 14 | 认证空实现、SQL 插入、CORS 过宽 |
| 稳定性 (stability) | 0.15 | 6.8 | 25 | 静默吞错、资源泄漏、无 ErrorBoundary |
| 架构 (architecture) | 0.15 | 5.8 | 25 | 循环依赖、God Object、分层混乱 |
| 质量 (quality) | 0.15 | 5.8 | 42 | 超长函数、any 滥用、类型安全缺失 |
| 性能 (performance) | 0.10 | 7.2 | 14 | 无分页、N+1 查询、缓存缺失 |
| 可测试性 (testability) | 0.10 | 5.8 | 11 | 客户端测试严重不足、Mock 脆弱 |
| 可观测性 (observability) | 0.05 | 6.8 | 10 | Winston 已定义未使用、无 request ID |
| 可维护性 (maintainability) | 0.05 | 7.0 | 10 | 缺少 lint 配置、配置分散 |
| 兼容性 (compatibility) | 0.05 | 6.8 | 13 | ESM/CJS 混用、浏览器兼容性 |

**加权计算**：5.5×0.20 + 6.8×0.15 + 5.8×0.15 + 5.8×0.15 + 7.2×0.10 + 5.8×0.10 + 6.8×0.05 + 7.0×0.05 + 6.8×0.05 = **6.19**

---

## 问题统计

| 优先级 | 数量 | 占比 | 说明 |
|--------|------|------|------|
| P1（关键） | 18 | 13.4% | 必须立即修复 |
| P2（重要） | 38 | 28.4% | 应尽快修复 |
| P3（改善） | 45 | 33.6% | 计划内改进 |
| P4（优化） | 33 | 24.6% | 持续优化 |
| **合计（去重后）** | **134** | 100% | |
| 原始发现总数 | 164 | | 含 30 项跨维度重复 |

---

## P1 问题详情（18 项）

P1 级别问题直接影响系统安全性、稳定性或架构完整性，必须立即修复。

### 安全性 P1

| ID | 问题 | 文件 | 风险 |
|----|------|------|------|
| SEC-001 | 认证中间件为空实现 | `server/src/middleware/auth.ts:3` | 所有 API 端点无需认证即可访问，管理功能完全暴露 |

**代码**：
```ts
export const authMiddleware = (req, res, next) => next();
```

**建议**：实现基于 JWT 或 session 的真实认证机制，为所有受保护路由启用认证检查。

### 架构 P1（6 项）

| ID | 问题 | 文件 | 风险 |
|----|------|------|------|
| ARCH-001 | God Object: NovelDirectorService | `server/src/services/novel/director/NovelDirectorService.ts` | 单点故障、修改风险高、难以测试 |
| ARCH-002 | God Function: generateChapterPlan 352行 | `server/src/services/planner/PlannerService.ts:388` | 函数职责过多，难以理解和维护 |
| ARCH-003 | 循环依赖: llm/factory.ts <-> services/settings/ | `server/src/llm/factory.ts:5` | 模块初始化顺序不确定 |
| ARCH-004 | 循环依赖: director/commands/ <-> workers/ | `server/src/services/novel/director/commands/DirectorCommandService.ts:47` | 模块耦合度过高 |
| ARCH-005 | 循环依赖: structuredInvoke.ts <-> novelP0Utils.ts | `server/src/llm/structuredInvoke.ts:34` | 模块边界模糊 |
| ARCH-006 | 循环依赖: NovelExportService.ts <-> modules/export/ | `server/src/services/novel/NovelExportService.ts:1` | 服务层与模块层职责不清 |

**建议**：引入依赖注入容器或事件总线机制打破循环依赖；按职责拆分 God Object 和 God Function。

### 质量 P1（7 项）

| ID | 问题 | 文件 | 行数 |
|----|------|------|------|
| QUA-001 | PlannerService.ts 超大文件 | `server/src/services/planner/PlannerService.ts` | 992 行 |
| QUA-002 | CharacterPreparationService.ts 845行+418行巨型函数 | `server/src/services/novel/characterPrep/CharacterPreparationService.ts:66` | 845 行 |
| QUA-003 | novelDirectorAutoExecutionRuntime.ts 单函数 640 行 | `server/src/services/novel/director/automation/novelDirectorAutoExecutionRuntime.ts:58` | 640 行 |
| QUA-004 | ChapterTimelineFinalizationService.ts 单函数 505 行 | `server/src/services/novel/runtime/ChapterTimelineFinalizationService.ts:197` | 505 行 |
| QUA-005 | NovelWorkflowHealingService.ts 673行+601行类体 | `server/src/services/novel/workflow/NovelWorkflowHealingService.ts:73` | 673 行 |
| QUA-006 | registry.ts 单函数 569 行 | `server/src/prompting/registry.ts:14` | 569 行 |
| QUA-007 | GenerationContextAssembler.ts 单函数 485 行 | `server/src/services/novel/runtime/GenerationContextAssembler.ts:240` | 485 行 |

**建议**：按功能阶段或职责拆分为更小的函数和类，每个函数控制在 50 行以内。

### 测试性 P1（2 项）

| ID | 问题 | 文件 | 风险 |
|----|------|------|------|
| TEST-001 | 客户端测试严重不足 | `client/tests/` | UI 回归 bug 无法自动检测 |
| TEST-002 | 多个服务模块完全缺失测试覆盖 | `server/src/services/` | 业务逻辑变更可能引入未检测 bug |

**建议**：为核心组件和关键服务模块补充单元测试和集成测试，目标覆盖率 80%。

### 可观测性 P1（1 项）

| ID | 问题 | 文件 | 风险 |
|----|------|------|------|
| OBS-001 | Winston logger 已定义但从未被使用 | `server/src/services/logging/LoggerService.ts:46` | 无结构化日志，生产环境无法有效监控 |

**建议**：逐步将所有 `console.log` 替换为 Winston logger 调用，建立分级日志体系。

### 兼容性 P1（1 项）

| ID | 问题 | 文件 | 风险 |
|----|------|------|------|
| COMPAT-001 | ESM/CJS 模块系统不兼容 | `server/src/db/prisma.ts:5` | 模块导入可能在某些环境下失败 |

**建议**：统一模块系统为 ESM，或使用动态 import 兼容 CJS 环境。

---

## P2 问题详情（38 项）

P2 级别问题影响系统健壮性或代码质量，应尽快安排修复。

| ID | 标题 | 文件 | 风险摘要 |
|----|------|------|----------|
| SEC-002 | 原始 SQL 模板字符串插值 | `server/src/services/novel/worldContext/NovelWorldSyncService.ts:250` | SQL 注入风险 |
| SEC-003 | 错误处理器泄露内部错误 | `server/src/middleware/errorHandler.ts:287` | 内部堆栈暴露 |
| SEC-004 | 未启用速率限制 | `server/src/app.ts:80` | 暴力攻击/DoS |
| SEC-005 | CORS 配置过宽 | `server/src/app.ts:90` | 跨域请求伪造 |
| STA-001 | 批量日志查询未关闭 ReadStream | `server/src/services/logging/logQueryService.ts:101` | 文件描述符泄漏 |
| STA-002 | promptTraceReport 未关闭 ReadStream | `server/src/services/novel/novelPromptTraceReport.ts:119` | 文件描述符泄漏 |
| STA-003 | React 客户端无 ErrorBoundary | `client/src` | 渲染错误白屏 |
| STA-020 | CharacterDynamicsMutationService catch(() => null) | `server/src/services/novel/dynamics/CharacterDynamicsMutationService.ts:603` | 数据变更失败不可观测 |
| STA-021 | novelCoreReviewService 审计报告写入静默失败 | `server/src/services/novel/novelCoreReviewService.ts:140` | 审计记录丢失 |
| STA-025 | highMemoryReservation renew 竞态 | `server/src/services/novel/highMemoryReservation.ts:428` | 内存预留不一致 |
| ARCH-007 | 9 个路由文件直接访问 Prisma | `server/src/routes/character.ts:4` | 业务逻辑分散 |
| ARCH-008 | traceStore 包含 18 个直接 Prisma 调用 | `server/src/agents/traceStore.ts:14` | 数据访问与业务耦合 |
| ARCH-009 | services/http/ 包含路由定义 | `server/src/services/novel/director/http/novelDirector.ts:1` | 分层架构违反 |
| ARCH-010 | URL 路径命名不一致 | `server/src/app.ts` | API 一致性差 |
| ARCH-011 | API 响应格式不一致 | `server/src/modules/drama/http/dramaRoutes.ts:205` | 客户端解析困难 |
| ARCH-012 | 验证中间件使用不一致 | `server/src/routes/titleLibrary.ts:64` | 部分端点缺少验证 |
| ARCH-013 | 硬编码 PostgreSQL 连接串明文密码 | `server/src/config/database.ts:3` | 数据库密码泄露 |
| ARCH-014 | 电路断路器阈值硬编码 | `server/src/services/novel/director/runtime/DirectorCircuitBreakerService.ts:8` | 无法调整策略 |
| ARCH-016 | safeStructuredMaxTokens 8192 重复 9 次 | `server/src/llm/structuredOutput.ts:162` | 修改遗漏 |
| QUA-014 | novelDirectorRuntimeOrchestrator 多个超长函数 | `server/src/services/novel/director/runtime/novelDirectorRuntimeOrchestrator.ts:410` | 编排逻辑过复杂 |
| QUA-015 | 46处 req.body as any | `server/src/modules/novel/production/http/novelProductionRoutes.ts:101` | 类型安全缺失 |
| QUA-016 | 35处重复定义 compactText/truncateText | `server/src/services/planner/plannerContextHelpers.ts:36` | 行为不一致 |
| QUA-017 | plannerChapterPlanContext.ts 14处 any | `server/src/services/planner/plannerChapterPlanContext.ts:85` | 类型安全缺失 |
| QUA-018 | 81处 as any 在 server/src | `server/src/` | 大量类型绕过 |
| QUA-019 | 2个 @ts-ignore 用于 winston | `server/src/services/logging/LoggerService.ts:3` | 类型错误隐藏 |
| PERF-001 | summarize_chapter_range 无范围上限 | `server/src/agents/tools/novelReadTools.ts:235` | 上下文溢出 |
| PERF-002 | list_chapters 拉取全部 content | `server/src/agents/tools/novelReadTools.ts:127` | 不必要数据传输 |
| PERF-003 | modelRouteConfig 缺少进程级缓存 | `server/src/llm/modelRouter.ts:289` | 频繁 DB 查询 |
| TEST-003 | 测试文件使用 .js 扩展名 | `server/tests/*.test.js` | 缺少类型检查 |
| TEST-004 | Mock 依赖原型污染 | `server/tests/*.test.js` | Mock 不稳定 |
| TEST-005 | 测试隔离性不足 | `server/tests/*.test.js` | 测试结果不确定 |
| TEST-006 | API 路由集成测试不足 | `server/tests/` | 接口变更未检测 |
| OBS-002 | errorHandler 缺少 request ID | `server/src/middleware/errorHandler.ts:134` | 问题排查困难 |
| OBS-003 | API 请求无唯一 ID 跟踪 | `server/src/app.ts:107` | 请求链路不可追踪 |
| MAINT-001 | 无项目级 ESLint/Prettier 配置 | 项目根目录 | 代码风格不统一 |
| MAINT-002 | 无 .env.example 配置说明 | 项目根目录 | 开发环境配置困难 |
| COMPAT-002 | navigator.clipboard 无 try/catch | `client/src/pages/worlds/WorldWorkspace.tsx:288` | 不安全上下文崩溃 |
| COMPAT-003 | idb-keyval 无异常处理 | `client/src/hooks/useLocalDB.ts:1` | 存储不可用时崩溃 |
| COMPAT-004 | REST API 无版本管理 | `server/src/app.ts:119` | API 变更不兼容 |
| COMPAT-005 | Raw SQL 裸 false 字面量 | `server/src/services/novel/worldContext/NovelWorldManualService.ts:110` | 跨数据库不兼容 |

---

## P3 问题列表（45 项）

| ID | 标题 | 文件 | 维度 |
|----|------|------|------|
| SEC-006 | runtimeMigrations PRAGMA 注入风险 | `server/src/db/runtimeMigrations.ts:151` | 安全性 |
| SEC-007 | 文件读取操作参数化路径 | `server/src/modules/comic/http/comicRoutes.ts:400` | 安全性 |
| SEC-008 | res.sendFile 用户可达路径 | `server/src/routes/images.ts:194` | 安全性 |
| SEC-009 | 大量 console.log/warn 生产环境 | `server/src/app.ts:218` | 安全性 |
| SEC-010 | fetch 请求缺少超时管理 | `server/src/llm/anthropicClient.ts:147` | 安全性 |
| SEC-011 | JSON.parse 无 try-catch | `server/src/graphs/novelOutlineGraph.ts:98` | 安全性 |
| SEC-014 | API Key 明文存储在数据库 | `server/src/routes/settings.ts:507` | 安全性 |
| ARCH-017 | 26 个文件超过 700 行 | `server/src/services/planner/PlannerService.ts` | 架构 |
| ARCH-018 | 9 个 client 页面超过 700 行 | `client/src/pages/promptWorkbench/components/PromptSlotPanel.tsx` | 架构 |
| ARCH-019 | SSE 心跳间隔重复定义 | `server/src/llm/streaming.ts:69` | 架构 |
| ARCH-020 | modules/ 与 services/ 双向耦合 | `server/src/modules/` | 架构 |
| ARCH-021 | ImageGenerationService.executeTask 195行 | `server/src/services/image/ImageGenerationService.ts:491` | 架构 |
| ARCH-022 | TTS/视频超时值重复 | `server/src/services/drama/audio/TTSProviderPort.ts:43` | 架构 |
| QUA-020 | 15处 console.log 在生产服务 | `server/src/services/comic/ComicPanelImageService.ts:309` | 质量 |
| QUA-021 | 166处 .catch(() => ...) 静默吞错 | `server/src/` | 质量 |
| QUA-022 | shared/types 大文件 | `shared/types/directorRuntime.ts:1` | 质量 |
| QUA-027 | directorPlanningStepModules 超长步骤 | `server/src/services/novel/director/workflowStepRuntime/directorPlanningStepModules.ts:40` | 质量 |
| QUA-028 | novelDirectorRuntimeProjection 超长分支 | `server/src/services/novel/director/projections/novelDirectorRuntimeProjection.ts:396` | 质量 |
| QUA-029 | CharacterLibrarySyncService 多个超长函数 | `server/src/services/character/CharacterLibrarySyncService.ts:75` | 质量 |
| QUA-039 | CharacterPreparationService 嵌套深度 8 层 | `server/src/services/novel/characterPrep/CharacterPreparationService.ts:232` | 质量 |
| QUA-040 | client 1处 console.error 残留 | `client/src/components/layout/DesktopBootstrapShell.tsx:191` | 质量 |
| PERF-004 | characterTimeline 查询无 take 限制 | `server/src/agents/tools/characterTools.ts:151` | 性能 |
| PERF-005 | sharedLimiters Map 永不清理 | `server/src/llm/requestLimiter.ts:87` | 性能 |
| PERF-006 | EventBus.emit 串行 await | `server/src/events/EventBus.ts:25` | 性能 |
| PERF-007 | CharacterLibrary N+1 模式 | `client/src/pages/characters/CharacterLibrary.tsx:31` | 性能 |
| PERF-008 | listBaseCharacters 无分页 | `server/src/agents/tools/characterTools.ts:43` | 性能 |
| PERF-009 | healAutoDirectorTaskState 无并发限制 | `server/src/services/novel/novelCoreCrudService.ts:147` | 性能 |
| PERF-010 | syncEventEdges 无批量大小保护 | `server/src/modules/timeline/timelineEdgeTableSync.ts:33` | 性能 |
| TEST-007 | 边界测试不够系统化 | `server/tests/*.test.js` | 可测试性 |
| TEST-008 | 测试缺乏 describe 分组 | `server/tests/*.test.js` | 可测试性 |
| TEST-009 | 前端缺少测试基础设施 | `client/` | 可测试性 |
| TEST-010 | LLM Mock 仅部分实现 | `server/src/prompting/core/promptRunner.js` | 可测试性 |
| OBS-004 | EventBus 错误处理仅 console.error | `server/src/events/EventBus.ts:31` | 可观测性 |
| OBS-005 | 健康检查端点过于简单 | `server/src/routes/health.ts:9` | 可观测性 |
| OBS-006 | LLM debug 日志默认关闭 | `server/src/llm/debugLogging.ts:33` | 可观测性 |
| OBS-007 | memoryTelemetry 使用 console.info | `server/src/runtime/memoryTelemetry.ts:84` | 可观测性 |
| MAINT-004 | @ts-ignore/@ts-nocheck 抑制类型错误 | `server/src/services/logging/LoggerService.ts:3` | 可维护性 |
| MAINT-005 | 无 .editorconfig 文件 | 项目根目录 | 可维护性 |
| MAINT-008 | CHANGELOG 无标准版本号管理 | 项目根目录 | 可维护性 |
| MAINT-009 | client/src 5处 any 类型 | `client/src/pages/creativeHub/hooks/useCreativeHubRuntime.ts:70` | 可维护性 |
| COMPAT-006 | Array.prototype.at() Safari 兼容性 | `client/src/pages/novels/components/NovelAutoDirectorDialog.tsx:254` | 兼容性 |
| COMPAT-007 | electron-builder 仅 Windows 目标 | `desktop/electron-builder.config.cjs:83` | 兼容性 |
| COMPAT-008 | Prisma raw SQL boolean/integer 差异 | `server/src/services/novel/NovelProductionStatusService.ts:312` | 兼容性 |
| COMPAT-009 | sharp 未列入 onlyBuiltDependencies | `package.json:58` | 兼容性 |
| COMPAT-010 | Vite build 未设置 target | `client/vite.config.ts:97` | 兼容性 |

---

## P4 问题列表（33 项）

| ID | 标题 | 文件 | 维度 |
|----|------|------|------|
| SEC-012 | SHA-1 用于内容指纹 | `server/src/services/novel/runtime/chapterRuntimePackageBuilders.ts:98` | 安全性 |
| SEC-013 | localStorage 仅存 UI 状态 | `client/src/components/layout/AppLayout.tsx:57` | 安全性 |
| STA-016 | waitForStartLock busy-wait 轮询 | `server/src/services/novel/novelCorePipelineService.ts:59` | 稳定性 |
| STA-017 | 固定 1500ms 硬编码等待 | `server/src/services/novel/director/automation/novelDirectorAutoExecutionRuntime.ts:280` | 稳定性 |
| STA-018 | createReadStream.pipe 无流错误处理 | `server/src/modules/drama/http/dramaRoutes.ts:608` | 稳定性 |
| STA-019 | StyleExtractionTaskService 无并发保护 | `server/src/services/styleEngine/StyleExtractionTaskService.ts:387` | 稳定性 |
| ARCH-023 | chat.ts 返回硬编码空数组 | `server/src/routes/chat.ts:318` | 架构 |
| ARCH-024 | 只读操作使用 POST 方法 | `server/src/routes/llm.ts:109` | 架构 |
| ARCH-025 | novelP0Utils.ts 导致双向依赖 | `server/src/services/novel/novelP0Utils.ts` | 架构 |
| QUA-030 | 111处 process.env 直接读取 | `server/src/` | 质量 |
| QUA-031 | 4处魔法数字 | `server/src/services/novel/novelCoreShared.ts:529` | 质量 |
| QUA-032 | volumeGenerationOrchestrator 三个超长函数 | `server/src/services/novel/volume/volumeGenerationOrchestrator.ts:284` | 质量 |
| QUA-033 | directorRecoverySampleAudit 631行 | `server/src/services/novel/director/recovery/directorRecoverySampleAudit.ts:1` | 质量 |
| QUA-034 | NovelAutoDirectorProgressPanel 238行 | `client/src/pages/novels/components/NovelAutoDirectorProgressPanel.tsx:473` | 质量 |
| QUA-035 | NovelExistingProjectTakeoverDialog 324行 | `client/src/pages/novels/components/NovelExistingProjectTakeoverDialog.tsx:377` | 质量 |
| QUA-036 | DramaProjectPage 214行保存逻辑 | `client/src/pages/drama/DramaProjectPage.tsx:496` | 质量 |
| QUA-037 | panelsGridPanel 186行键盘事件 | `client/src/pages/comic/project/PanelsGridPanel.tsx:592` | 质量 |
| QUA-038 | WorldVisualizationBoard 209行拖拽逻辑 | `client/src/pages/worlds/components/WorldVisualizationBoard.tsx:424` | 质量 |
| QUA-041 | NovelAutoDirectorDialog 114行防止关闭 | `client/src/pages/novels/components/NovelAutoDirectorDialog.tsx:630` | 质量 |
| QUA-042 | NovelWorkflowTaskAdapter 多个超长函数 | `server/src/services/task/adapters/NovelWorkflowTaskAdapter.ts:306` | 质量 |
| PERF-011 | novelTokenUsageSummary 全量查询后 JS 过滤 | `server/src/services/novel/novelTokenUsageSummary.ts:90` | 性能 |
| PERF-012 | structuredFallbackSettings 缓存永不失效 | `server/src/llm/structuredFallbackSettings.ts:78` | 性能 |
| PERF-013 | useQuery 未设置 staleTime | `client/src/components/knowledge/KnowledgeDocumentPicker.tsx:20` | 性能 |
| PERF-014 | NovelWorkspaceRail 同时 7 个 useQuery | `client/src/components/layout/NovelWorkspaceRail.tsx:137` | 性能 |
| TEST-011 | 测试断言消息语言不一致 | `server/tests/*.test.js` | 可测试性 |
| OBS-008 | Health 路由被 authMiddleware 保护 | `server/src/routes/health.ts:7` | 可观测性 |
| OBS-009 | logStructuredInvokeEvent 仅 console.info | `server/src/llm/structuredInvokeParser.ts:256` | 可观测性 |
| OBS-010 | directorWorker 大量 console.log | `server/src/workers/directorWorker.ts:48` | 可观测性 |
| MAINT-006 | 子包 README 缺失 | 各子包 | 可维护性 |
| MAINT-007 | Prisma 迁移无自动回滚 | 项目根目录 | 可维护性 |
| COMPAT-011 | Desktop 未遵循 Linux XDG 规范 | `desktop/src/runtime/paths.ts:57` | 兼容性 |
| COMPAT-012 | Desktop 图标使用 .ico 格式 | `desktop/src/runtime/paths.ts:108` | 兼容性 |
| COMPAT-013 | 自动更新器消息 Windows 专属 | `desktop/src/runtime/updater.ts:44` | 兼容性 |

---

## 优先修复路线图

### 第一阶段：关键修复（P1，建议 1-2 周）

| 修复项 | 问题 ID | 预估工作量 | 说明 |
|--------|---------|-----------|------|
| 实现真实认证机制 | SEC-001 | 3-5 天 | 引入 JWT/session 认证，保护所有受保护路由 |
| 打破循环依赖 | ARCH-003~006 | 3-5 天 | 引入依赖注入或事件总线，解耦相互依赖的模块 |
| 拆分 God Object/Function | ARCH-001~002, QUA-001~007 | 5-7 天 | NovelDirectorService、PlannerService 等核心类拆分 |
| 修复 ESM/CJS 不兼容 | COMPAT-001 | 1-2 天 | 统一模块系统，解决 Prisma 导入问题 |
| 补充核心测试 | TEST-001~002 | 3-5 天 | 为缺失测试的核心服务模块补充单元测试 |
| 启用 Winston 日志 | OBS-001 | 2-3 天 | 替换 console.log，建立分级日志体系 |

### 第二阶段：重要改进（P2，建议 2-4 周）

| 修复项 | 问题 ID | 预估工作量 | 说明 |
|--------|---------|-----------|------|
| 修复 SQL 注入风险 | SEC-002 | 1 天 | 使用参数化查询替代模板字符串 |
| 启用速率限制 | SEC-004 | 1 天 | 为 API 添加基于 IP 和 token 的速率限制 |
| 添加 ErrorBoundary | STA-003 | 1-2 天 | 实现全局和路由级错误边界 |
| 收敛数据库访问 | ARCH-007~008 | 2-3 天 | 路由文件的数据库访问收敛到服务层 |
| 消除 as any 泛滥 | QUA-015~018 | 3-5 天 | 逐步替换 any 为具体类型，添加 Zod 验证 |
| 统一 API 规范 | ARCH-010~012 | 2 天 | 统一 URL 命名、响应格式、验证方式 |
| 补充测试基础设施 | TEST-003~006 | 2-3 天 | 迁移测试到 TS、改善 Mock 策略、补充集成测试 |
| 添加 request ID | OBS-002~003 | 1 天 | 为所有请求生成唯一 ID，支持链路追踪 |

### 第三阶段：改善提升（P3，建议 1-2 个月）

- 消除 166 处静默吞错（QUA-021），建立错误日志规范
- 拆分 26 个超 700 行的服务器文件（ARCH-017）
- 拆分 9 个超 700 行的客户端组件（ARCH-018）
- 实现数据库查询分页（PERF-004、PERF-008）
- 建立 LRU 缓存清理机制（PERF-005）
- 提升健康检查端点深度（OBS-005）

### 第四阶段：持续优化（P4）

- 消除魔法数字，使用命名常量
- 统一日志输出方式
- 完善 Desktop 跨平台兼容性
- 补充子包文档
- 添加 .editorconfig 配置

---

## 审查记录

### 第一轮审查（2026-07-01）

**审查范围**：全量代码扫描，覆盖 9 个维度

**审查方法**：
- 逐维度批量扫描，每批 3-4 个维度并行处理
- 使用 grep/代码搜索定位模式化问题
- 交叉验证跨维度重复发现

**主要发现**：
- 认证中间件为空实现（P1 安全漏洞）
- 5 个循环依赖链路（P1 架构缺陷）
- 7 个超长函数（P1 质量问题）
- 166 处静默吞错模式（P3 系统性问题）

### 第二轮审查（2026-07-01）

**审查范围**：去重分析和严重性校准

**审查方法**：
- 交叉对比所有维度的发现，识别 30 项重复
- 对重复项进行合并标记（mergedWith）
- 重新校准优先级排序

**审查结果**：
- 原始 164 项发现去重后为 134 项唯一问题
- P1: 18 项（无重复，均为独立关键问题）
- P2: 38 项（从 47 项去重 9 项）
- P3: 45 项（从 66 项去重 21 项）
- P4: 33 项（无重复）

---

## 正面发现

审计过程中也发现了一些值得肯定的方面：

1. **Prisma ORM 使用规范**：数据库操作整体使用 Prisma ORM，类型安全较好，仅少数地方使用原始 SQL
2. **Zod Schema 验证**：共享类型中使用 Zod 进行运行时验证，前后端类型一致性有保障
3. **Monorepo 结构清晰**：pnpm workspace 组织合理，shared 包实现前后端类型共享
4. **TypeScript 全面使用**：全项目使用 TypeScript，仅测试文件使用 JS（已列入改进项）
5. **模块化架构方向正确**：modules/ 目录的模块化方向正确，正在逐步收敛
6. **Prompt Governance 机制**：建立了 prompt 资产注册机制，为 AI 产品 prompt 管理提供了框架
7. **性能意识良好**：使用了 requestLimiter、CircuitBreaker 等性能保护机制
8. **事件驱动架构**：EventBus 的引入为模块间解耦提供了基础

---

> 本报告基于 2026-07-01 的代码快照生成。详细问题数据见 `scan-findings.json`。
