---
description: 项目能力索引 — 供 Capability Gate hook 自动检测重复标识符，AI 写新函数前必查
---

# CAPABILITY_MAP

> **维护方式**：手动 + Capability Gate hook 自动检测。
> **用途**：PreToolUse hook 在 Write/Edit 前扫描此文件，检测新导出标识符是否与已有能力重复。
> **格式**：每个条目为 `| 模块路径 | `函数签名` | 说明 |` 的 Markdown 表格行。

---

## 1. LLM 层 (`server/src/llm/`)

### 1.1 工厂与客户端

| 文件 | 签名 | 说明 |
|------|------|------|
| `factory.ts` | `getLLM(provider?, options?)` | 获取 LLM 客户端（主入口） |
| `factory.ts` | `createLLMFromResolvedOptions(resolved)` | 从已解析选项创建 ChatOpenAI |
| `factory.ts` | `resolveLLMClientOptions(...)` | 解析 LLM 客户端配置 |
| `factory.ts` | `loadProviderApiKeys()` | 加载所有 Provider API Key |
| `factory.ts` | `setProviderSecretCache(provider, secret)` | 设置 Provider 密钥缓存 |
| `factory.ts` | `getResolvedLLMClientOptionsFromInstance(llm)` | 从实例获取已解析选项 |
| `anthropicClient.ts` | `createAnthropicLLM(options)` | 创建 Anthropic 客户端 |

### 1.2 结构化调用

| 文件 | 签名 | 说明 |
|------|------|------|
| `structuredInvoke.ts` | `invokeStructuredLlm<T>(input)` | 结构化调用（主入口） |
| `structuredInvoke.ts` | `invokeStructuredLlmDetailed<T>(input)` | 结构化调用（含详细结果） |
| `structuredInvoke.ts` | `summarizeStructuredOutputFailure(input)` | 汇总结构化输出失败原因 |
| `structuredInvokeParser.ts` | `parseStructuredLlmRawContentDetailed<T>(...)` | 解析原始 LLM 内容 |
| `structuredInvokeParser.ts` | `buildStructuredError(input)` | 构建结构化错误对象 |
| `structuredInvokeParser.ts` | `wrapStructuredInvokeError(input)` | 包装结构化调用错误 |
| `structuredInvokeParser.ts` | `shouldUseJsonObjectResponseFormat<T>(...)` | 判断是否用 JSON Object 响应格式 |
| `structuredInvokeParser.ts` | `logStructuredInvokeEvent(input)` | 记录结构化调用事件 |
| `structuredInvokeRepair.ts` | `repairWithLlm<T>(...)` | 用 LLM 修复损坏的 JSON |
| `structuredOutput.ts` | `resolveStructuredOutputProfile(input)` | 解析结构化输出策略 |
| `structuredOutput.ts` | `selectStructuredOutputStrategy<T>(...)` | 选择结构化输出策略 |
| `structuredOutput.ts` | `buildStructuredResponseFormat<T>(input)` | 构建结构化响应格式 |
| `structuredOutput.ts` | `classifyStructuredOutputFailure(input)` | 分类结构化输出失败 |
| `structuredOutput.ts` | `extractStructuredOutputErrorCategory(message?)` | 提取错误类别 |
| `structuredOutput.ts` | `canUseForcedJsonOutput(profile)` | 判断是否支持强制 JSON 输出 |
| `structuredOutput.ts` | `schemaAllowsTopLevelArray<T>(schema)` | 判断 schema 是否允许顶层数组 |

### 1.3 重试与容错

| 文件 | 签名 | 说明 |
|------|------|------|
| `retry.ts` | `invokeWithRetry<T>(...)` | 带重试的 LLM 调用 |
| `retry.ts` | `isRetryableTransportError(error)` | 判断是否可重试的传输错误 |
| `retry.ts` | `calculateWaitTime(...)` | 计算重试等待时间 |
| `retry.ts` | `parseRetryAfter(value)` | 解析 Retry-After 头 |
| `fallback.ts` | `executeWithFallbackChain(...)` | 执行降级链 |
| `fallback.ts` | `classifyFallbackTrigger(error)` | 分类降级触发原因 |
| `fallback.ts` | `selectFallbackModel(...)` | 选择降级模型 |
| `fallback.ts` | `getFallbackChainConfig(...)` | 获取降级链配置 |
| `fallback.ts` | `saveFallbackChainConfig(...)` | 保存降级链配置 |
| `errorClassifier.ts` | `classifyError(error)` | 分类 LLM 错误 |
| `errorClassifier.ts` | `isErrorRetryable(error)` | 判断错误是否可重试 |
| `errorClassifier.ts` | `getErrorCategory(error)` | 获取错误类别 |
| `errorClassifier.ts` | `getErrorSeverity(error)` | 获取错误严重度 |
| `requestGuard.ts` | `assertNonEmptyLLMInput(method, input, meta)` | 断言 LLM 输入非空 |
| `requestGuard.ts` | `attachLLMRequestGuard(llm, meta)` | 附加请求守卫 |

### 1.4 请求限制与速率

| 文件 | 签名 | 说明 |
|------|------|------|
| `requestLimiter.ts` | `createProviderModelLimiter(options)` | 创建 Provider/Model 限流器 |
| `requestLimiter.ts` | `attachLLMRequestLimiter(...)` | 附加请求限流器 |
| `requestLimiter.ts` | `evictSharedLimiters()` | 清理共享限流器 |
| `invokeTimeout.ts` | `runWithEnforcedTimeout<T>(input)` | 带超时的执行 |

### 1.5 Provider 与路由

| 文件 | 签名 | 说明 |
|------|------|------|
| `providers.ts` | `isBuiltInProvider(provider)` | 判断是否内置 Provider |
| `providers.ts` | `normalizeBaseURL(baseURL)` | 标准化 Base URL |
| `providers.ts` | `getProviderEnvApiKey(provider)` | 获取 Provider 环境变量 API Key |
| `providers.ts` | `getProviderDefaultBaseUrl(provider)` | 获取 Provider 默认 Base URL |
| `providers.ts` | `resolveProviderBaseUrl(...)` | 解析 Provider Base URL |
| `providers.ts` | `providerRequiresApiKey(provider)` | 判断 Provider 是否需要 API Key |
| `modelRouter.ts` | `resolveModel(...)` | 解析模型路由（核心） |
| `modelRouter.ts` | `listModelRouteConfigs()` | 列出模型路由配置 |
| `modelRouter.ts` | `upsertModelRouteConfig(...)` | 新增/更新模型路由配置 |
| `modelRouter.ts` | `toStructuredOutputStrategy(...)` | 转换为结构化输出策略 |
| `modelCatalog.ts` | `getProviderModels(...)` | 获取 Provider 模型列表 |
| `modelCatalog.ts` | `refreshProviderModels(...)` | 刷新 Provider 模型列表 |
| `capabilities.ts` | `supportsForcedJsonOutput(provider, model?, baseURL?)` | 判断是否支持强制 JSON |
| `capabilities.ts` | `getModelParameterCompatibility(provider, model?)` | 获取模型参数兼容性 |
| `capabilities.ts` | `resolveModelTemperature(...)` | 解析模型温度参数 |
| `capabilities.ts` | `getJsonCapability(provider, model?, baseURL?)` | 获取 JSON 能力 |

### 1.6 重复检测与流式

| 文件 | 签名 | 说明 |
|------|------|------|
| `repetition/detector.ts` | `detectConsecutiveRepeat(...)` | 检测连续重复 |
| `repetition/detector.ts` | `detectRepeatInText(...)` | 文本内重复检测 |
| `repetition/monitor.ts` | `createMonitorConfig(overrides?)` | 创建重复监控配置 |
| `repetition/recovery.ts` | `determineRecoveryAction(...)` | 决定重复恢复动作 |
| `repetition/recovery.ts` | `buildRecoveryMessage(action)` | 构建恢复消息 |
| `streaming.ts` | `writeSSEFrame(res, payload)` | 写入 SSE 帧 |
| `streaming.ts` | `initSSE(res)` | 初始化 SSE 连接 |
| `streaming.ts` | `streamToSSE(...)` | 流式转 SSE |
| `streamingRepetitionDetector.ts` | `loadLoopDetectorConfig()` | 加载流式循环检测配置 |

### 1.7 追踪与日志

| 文件 | 签名 | 说明 |
|------|------|------|
| `usageTracking.ts` | `extractLlmTokenUsage(output)` | 提取 token 用量 |
| `usageTracking.ts` | `mergeStreamTokenUsage(...)` | 合并流式 token 用量 |
| `usageTracking.ts` | `runWithLlmUsageTracking<T>(...)` | 带用量追踪的执行 |
| `usageTracking.ts` | `recordTrackedLlmUsage(...)` | 记录追踪的 LLM 用量 |
| `usageTracking.ts` | `attachLLMUsageTracking(llm, meta?)` | 附加用量追踪 |
| `llmOperationTracker.ts` | `trackLlmOperationStart(input)` | 追踪操作开始 |
| `llmOperationTracker.ts` | `trackLlmOperationEnd(input)` | 追踪操作结束 |
| `llmOperationTracker.ts` | `getActiveOperations()` | 获取活跃操作 |
| `llmOperationTracker.ts` | `getLlmOperationSummary()` | 获取操作摘要 |
| `connectivity.ts` | `llmConnectivityService` | LLM 连接性服务（对象） |
| `debugLogging.ts` | `attachLLMDebugLogging(llm, meta)` | 附加调试日志 |
| `repairLogging.ts` | `logStructuredRepairSession(input)` | 记录修复会话日志 |
| `sessionLogFile.ts` | `appendLlmSessionLog(entry)` | 追加 LLM 会话日志 |

### 1.8 推理与工具

| 文件 | 签名 | 说明 |
|------|------|------|
| `reasoning.ts` | `resolveProviderReasoningBehavior(input)` | 解析 Provider 推理行为 |
| `reasoning.ts` | `extractReasoningTextFromChunk(chunk)` | 从 chunk 提取推理文本 |
| `reasoning.ts` | `isMiniMaxCompatibleProvider(...)` | 判断 MiniMax 兼容性 |
| `schemaHelpers.ts` | `stringOrArraySchema(maxItems)` | 字符串或数组 schema |
| `schemaHelpers.ts` | `tolerantEnum<T>(values)` | 容错枚举 |
| `generatedContentSchema.ts` | `relaxGeneratedContentSchema<T>(schema)` | 放宽生成内容 schema |

---

## 2. Novel 服务层 (`server/src/services/novel/`)

### 2.1 章节

| 文件 | 签名 | 说明 |
|------|------|------|
| `ChapterService.ts` | `chapterService` | 章节服务（单例） |
| `chapterEditor/chapterEditorShared.ts` | `normalizeEditorText(text?)` | 标准化编辑器文本 |
| `chapterEditor/chapterEditorShared.ts` | `normalizeChapterContent(text?)` | 标准化章节内容 |
| `chapterEditor/chapterEditorShared.ts` | `countEditorWords(text?)` | 统计编辑器字数 |
| `chapterEditor/chapterEditorShared.ts` | `splitParagraphsWithRanges(text?)` | 带范围分段 |
| `chapterEditor/chapterEditorShared.ts` | `buildParagraphWindow(...)` | 构建段落窗口 |
| `chapterEditor/chapterEditorShared.ts` | `buildStyleSummary(novel)` | 构建风格摘要 |
| `chapterEditor/chapterEditorShared.ts` | `buildWorldConstraintSummary(world)` | 构建世界约束摘要 |
| `chapterEditor/chapterEditorShared.ts` | `buildCharacterStateSummary(snapshot?)` | 构建角色状态摘要 |
| `chapterEditor/chapterEditorShared.ts` | `buildPaceDirective(...)` | 构建节奏指令 |
| `chapterEditor/chapterEditorShared.ts` | `buildMacroContextSummary(context)` | 构建宏观上下文摘要 |
| `chapterEditor/chapterEditorDiff.ts` | `buildChapterEditorDiffChunks(original, rewritten)` | 构建章节编辑 diff |
| `chapterLifecycleState.ts` | `chapterStatePairAfterManualQualityReview(pass)` | 手动质量审核后状态 |
| `chapterLifecycleState.ts` | `chapterStatePairAfterPipelineApproval()` | 流水线审批后状态 |

### 2.2 自适应字数

| 文件 | 签名 | 说明 |
|------|------|------|
| `adaptiveWordCount/wordCountCalculator.ts` | `calculateWordCountTarget(...)` | 计算字数目标 |
| `adaptiveWordCount/wordCountCalculator.ts` | `calculateWordCountTargets(...)` | 计算多级字数目标 |
| `adaptiveWordCount/wordCountCheckService.ts` | `checkWordCount(...)` | 检查字数 |
| `adaptiveWordCount/wordCountCheckService.ts` | `runWordCountAdjustmentLoop(...)` | 字数调整循环 |
| `adaptiveWordCount/wordCountCheckService.ts` | `measureWordCount(text)` | 测量字数 |
| `adaptiveWordCount/waterContentDetectionService.ts` | `detectWaterContent(...)` | 检测水分内容 |

### 2.3 角色

| 文件 | 签名 | 说明 |
|------|------|------|
| `dynamics/characterDynamicsLlm.ts` | `generateVolumeProjection(context)` | 生成卷级角色投影 |
| `dynamics/characterDynamicsLlm.ts` | `extractChapterDynamics(input)` | 提取章节角色动态 |
| `bookFraming.ts` | `resolveCommercialTags(source)` | 解析商业化标签 |
| `bookFraming.ts` | `buildBookFramingSummary(source)` | 构建书籍框架摘要 |
| `chapterSummarySchemas.ts` | `chapterSummaryOutputSchema` | 章节摘要输出 schema |

### 2.4 审核

| 文件 | 签名 | 说明 |
|------|------|------|
| `audit/AuditService.ts` | `auditService` | 审核服务（单例） |
| `audit/GlobalReviewService.ts` | `globalReviewService` | 全局审核服务（单例） |
| `audit/auditContextBuilder.ts` | `buildGlobalReviewContextData(...)` | 构建全局审核上下文数据 |
| `audit/auditContextBuilder.ts` | `buildGlobalReviewContextBlocks(...)` | 构建全局审核上下文块 |
| `audit/auditSchemas.ts` | `reviewIssueSchema` | 审核问题 schema |
| `audit/auditSchemas.ts` | `fullAuditOutputSchema` | 完整审核输出 schema |

### 2.5 应用服务

| 文件 | 签名 | 说明 |
|------|------|------|
| `application/NovelApplicationServices.ts` | `createNovelApplicationServices()` | 创建 Novel 应用服务集 |
| `application/sharedNovelServices.ts` | `getSharedNovelServices()` | 获取共享 Novel 服务 |

---

## 3. 模块层 (`server/src/modules/`)

### 3.1 批处理

| 文件 | 签名 | 说明 |
|------|------|------|
| `batch/BatchQueueService.ts` | `decomposeIntoBatches(chapters, batchSize)` | 分解为批次 |
| `batch/BatchQueueService.ts` | `batchQueueService` | 批次队列服务（单例） |

### 3.2 导出

| 文件 | 签名 | 说明 |
|------|------|------|
| `export/novelExport.service.ts` | `novelExportService` | 小说导出服务（单例） |
| `export/novelExport.formatting.ts` | `buildTxtContent(novel)` | 构建 TXT 导出内容 |
| `export/novelExport.formatting.ts` | `buildMarkdownExportContent(bundle, scope)` | 构建 Markdown 导出 |
| `export/novelExport.formatting.ts` | `buildScopedNovelExportPayload(...)` | 构建导出 payload |
| `export/novelExport.formatting.ts` | `safeFileNamePart(input)` | 安全文件名片段 |
| `export/novelExport.mappers.ts` | `mapExportNovelDetail(...)` | 映射导出详情 |
| `export/novelExport.mappers.ts` | `buildExportTimelineGroups(...)` | 构建导出时间线 |

### 3.3 反馈

| 文件 | 签名 | 说明 |
|------|------|------|
| `feedback/feedbackStorage.ts` | `createFeedbackFolder(...)` | 创建反馈文件夹 |
| `feedback/feedbackStorage.ts` | `saveAttachment(...)` | 保存附件 |
| `feedback/feedbackStorage.ts` | `listFeedbackFolders()` | 列出反馈文件夹 |
| `feedback/feedbackStorage.ts` | `readFeedbackDetail(folderName)` | 读取反馈详情 |
| `feedback/issueGenerator.ts` | `generateIssue(input)` | 生成 Issue |

### 3.4 角色一致性

| 文件 | 签名 | 说明 |
|------|------|------|
| `characterConsistency/CharacterConsistencyModule.ts` | `characterConsistencyModule` | 角色一致性模块（单例） |

### 3.5 检查点

| 文件 | 签名 | 说明 |
|------|------|------|
| `novel/checkpoint/CheckpointService.ts` | `checkpointService` | 检查点服务（单例） |

---

## 4. 平台层 (`server/src/platform/`)

| 文件 | 签名 | 说明 |
|------|------|------|
| `json.ts` | `safeParseJSON<T>(raw, fallback)` | 安全 JSON 解析 |
| `json.ts` | `safeJsonParse` | safeParseJSON 别名 |
| `textUtils.ts` | `toText(content)` | 转为文本 |
| `security/safePath.ts` | `assertSafePath(resolvedPath, allowedRoot)` | 断言路径安全 |
| `dbErrors.ts` | `isMissingTableError(error)` | 判断是否缺表错误 |
| `dbErrors.ts` | `isDbUnavailableError(error)` | 判断是否 DB 不可用 |
| `encryptKey.ts` | `isEncrypted(value)` | 判断是否已加密 |
| `encryptKey.ts` | `encryptValue(plaintext, key)` | 加密值 |
| `encryptKey.ts` | `decryptValue(ciphertext, key)` | 解密值 |
| `deriveMachineKey.ts` | `deriveMachineKey()` | 派生机器密钥 |
| `logging/logRetention.ts` | `resolveLogRetentionConfig(env?)` | 解析日志保留配置 |
| `logging/logRetention.ts` | `cleanupLogDirectory(...)` | 清理日志目录 |

---

## 5. 运行时 (`server/src/runtime/`)

| 文件 | 签名 | 说明 |
|------|------|------|
| `appPaths.ts` | `resolveAppRuntimeMode()` | 解析运行时模式 |
| `appPaths.ts` | `resolveAppDataRoot()` | 解析应用数据根目录 |
| `appPaths.ts` | `resolveServerRoot()` | 解析服务端根目录 |
| `appPaths.ts` | `resolveWorkspaceRoot()` | 解析工作区根目录 |
| `appPaths.ts` | `resolveDataRoot()` | 解析数据根目录 |
| `appPaths.ts` | `resolveLogsRoot()` | 解析日志根目录 |
| `appPaths.ts` | `resolveGeneratedImagesRoot()` | 解析生成图片根目录 |
| `memoryTelemetry.ts` | `logMemoryUsage(context)` | 记录内存用量 |

---

## 6. 配置 (`server/src/config/`)

| 文件 | 签名 | 说明 |
|------|------|------|
| `constants.ts` | `DEFAULT_SERVER_PORT` | 默认服务端口 (13000) |
| `constants.ts` | `DEFAULT_APP_BASE_URL` | 默认应用 URL |
| `database.ts` | `normalizeDatabaseUrl(rawValue)` | 标准化数据库 URL |
| `database.ts` | `getDatabaseUrl(options?)` | 获取数据库 URL |
| `database.ts` | `resolveDatabaseRuntimeConfig(...)` | 解析数据库运行时配置 |
| `envValidator.ts` | `validateEnvironment()` | 验证环境变量 |
| `featureFlags.ts` | `featureFlags` | 特性标志（对象） |
| `errorCodes.ts` | `throwNotFound(message)` | 抛出 404 错误 |
| `errorCodes.ts` | `throwBadRequest(message)` | 抛出 400 错误 |
| `rag.ts` | `ragConfig` | RAG 配置（对象） |
| `logger.ts` | `logger` | Winston 日志实例 |
| `logger.ts` | `createChildLogger(module)` | 创建子日志器 |

---

## 7. 事件系统 (`server/src/events/`)

| 文件 | 签名 | 说明 |
|------|------|------|
| `EventBus.ts` | `EventBus` | 事件总线（类） |
| `EventBus.ts` | `novelEventBus` | Novel 事件总线（单例） |
| `sideEffects/NovelSideEffectJobService.ts` | `novelSideEffectJobService` | 副作用任务服务（单例） |
| `sideEffects/NovelSideEffectWorker.ts` | `novelSideEffectWorker` | 副作用 Worker（单例） |

---

## 8. 数据库 (`server/src/db/`)

| 文件 | 签名 | 说明 |
|------|------|------|
| `prisma.ts` | `prisma` | Prisma 客户端（单例） |
| `runtimeMigrations.ts` | `ensureRuntimeDatabaseReady()` | 确保数据库就绪 |
| `sqlitePragmas.ts` | `configureSqliteRuntimePragmas(...)` | 配置 SQLite pragmas |
| `sqliteRetry.ts` | `isTransientSqliteTimeoutError(error)` | 判断 SQLite 超时 |
| `sqliteRetry.ts` | `withSqliteRetry<T>(...)` | 带重试的 SQLite 操作 |

---

## 9. 客户端 API 层 (`client/src/api/`)

| 文件 | 签名 | 说明 |
|------|------|------|
| `client.ts` | `apiClient` | Axios 客户端（单例） |
| `agentCatalog.ts` | `getAgentCatalog()` | 获取 Agent 目录 |
| `agentRuns.ts` | `listAgentRuns(params?)` | 列出 Agent 运行 |
| `agentRuns.ts` | `getAgentRunDetail(id)` | 获取 Agent 运行详情 |
| `creativeHub.ts` | `listCreativeHubThreads()` | 列出创意中心线程 |
| `creativeHub.ts` | `streamCreativeHubRun(...)` | 流式运行创意中心 |
| `character.ts` | `getBaseCharacterList(params?)` | 获取基础角色列表 |
| `character.ts` | `generateBaseCharacter(payload)` | AI 生成角色 |
| `genre.ts` | `getGenreTree()` | 获取类型树 |
| `genre.ts` | `flattenGenreTreeOptions(...)` | 扁平化类型树选项 |
| `images.ts` | `generateCharacterImages(payload)` | 生成角色图片 |
| `images.ts` | `resolveImageAssetUrl(url)` | 解析图片资源 URL |
| `knowledge.ts` | `listKnowledgeDocuments(params?)` | 列出知识库文档 |
| `bookAnalysis.ts` | `listBookAnalyses(params?)` | 列出书籍分析 |
| `feedback.ts` | `submitFeedback(payload)` | 提交反馈 |
| `batchStyle.ts` | `batchStyleDetect(...)` | 批量风格检测 |
| `batchStyle.ts` | `batchStylePolish(...)` | 批量风格润色 |

---

## 10. 共享类型 (`shared/types/`)

> 类型/接口不触发 Capability Gate（仅检测 `export function/const/class`），
> 此处列出关键类型供 AI 快速查阅，避免重复定义。

| 文件 | 标识符 | 说明 |
|------|--------|------|
| `api.ts` | `ApiResponse<T>` | 统一 API 响应 |
| `api.ts` | `SSEFrame` | SSE 帧类型 |
| `agent.ts` | `AgentRun` | Agent 运行 |
| `agent.ts` | `AgentStep` | Agent 步骤 |
| `agent.ts` | `AgentCatalog` | Agent 目录 |
| `novel.ts` | `Novel` | 小说核心类型 |
| `director.ts` | `DirectorTask` | 导演任务 |
| `creativeHub.ts` | `CreativeHubThread` | 创意中心线程 |
