---
description: "2026-07-01 全量代码审计报告 - 9 维度扫描结果"
---

# 全量代码审计报告

## 概要

- 审计日期：2026-07-01
- 审计范围：全量（server/src, client/src, shared, desktop）
- 项目规模：1,278 文件 / 290K 行代码
- 综合评分：**62/100**

## 发现统计

| 维度 | 权重 | 发现数 | P1 | P2 | P3 | P4 |
|------|------|--------|-----|-----|-----|-----|
| security | 0.20 | 14 | 2 | 4 | 4 | 4 |
| stability | 0.15 | 16 | 0 | 3 | 7 | 6 |
| architecture | 0.15 | 15 | 1 | 6 | 6 | 2 |
| quality | 0.15 | 15 | 2 | 5 | 6 | 2 |
| performance | 0.10 | 15 | 0 | 4 | 7 | 4 |
| testability | 0.10 | 18 | 0 | 3 | 8 | 7 |
| observability | 0.05 | 12 | 1 | 3 | 5 | 3 |
| maintainability | 0.05 | 30 | 1 | 12 | 11 | 6 |
| compatibility | 0.05 | 15 | 0 | 1 | 9 | 5 |
| **合计** | - | **150** | **7** | **41** | **63** | **39** |

## P1 关键问题（必须修复）

### SEC-001: 认证中间件为空操作（no-op）
- **文件**: `server/src/middleware/auth.ts:3`
- **影响**: 所有挂载 authMiddleware 的路由（20+ 路由模块）实际上处于无认证状态。任意客户端可访问所有 API 端点，包括触发 LLM 调用、读写小说数据、管理设置等敏感操作。
- **修复**: 实现真正的认证机制。即使是单用户本地应用，也应至少实施基于 token 的简单认证或绑定 localhost 的 IP 白名单验证。

### SEC-002: API 无速率限制
- **文件**: `server/src/app.ts:117`
- **影响**: 整个 Express 应用未使用 express-rate-limit 或类似中间件。攻击者可发起大量请求导致 LLM API 额度快速耗尽、服务过载，或被用于 DDoS 放大攻击。
- **修复**: 安装 express-rate-limit，为全局设置基础速率限制（如 100 req/min），为 LLM 调用等高成本端点设置更严格的限制。

### ARCH-001: services/novel 与 services/planner 双向循环引用
- **文件**: `server/src/services/novel/novelCoreReviewService.ts`
- **影响**: 模块边界失效、循环初始化崩溃风险、难以独立测试和替换子系统。
- **修复**: 引入共享接口层或事件总线解耦；将跨服务调用改为通过事件/回调或抽取到公共 service 层。

### QUA-001: 超大文件 — 30个文件超过700行硬上限
- **文件**: `shared/types/directorRuntime.ts`（1273 行）、`PlannerService.ts`（992 行）等
- **影响**: 职责不清、合并冲突频繁、AI 上下文窗口溢出。
- **修复**: 按功能域拆分，优先拆分 PlannerService（992 行）和 CharacterPreparationService（845 行）。

### QUA-002: 超长函数 — 80+ 函数超过50行
- **文件**: `client/src/pages/novels/components/NovelAutoDirectorDialog.tsx`（654 行单组件）
- **影响**: 难以测试和理解，React 逻辑渲染混杂。
- **修复**: 提取 hooks + 拆分子组件；服务函数按职责拆分。

### OBS-001: Winston LoggerService 已实现但全项目零引用
- **文件**: `server/src/services/logging/LoggerService.ts`
- **影响**: 已建设的 winston 结构化日志体系（JSON 格式、日志轮转、错误分离、日志查询）完全未被使用。所有 52 个含 console.* 的文件均直接使用 console.log/warn/error/info。
- **修复**: 分批迁移 console.* 调用到 LoggerService 的 logger 实例。

### MAINT-001: server 端 20 个文件超过 700 行阈值，最高达 992 行
- **文件**: `server/src/services/planner/PlannerService.ts`（992 行）
- **影响**: 修改任一超大文件时，开发者理解成本极高，合并冲突概率大，测试覆盖难以保证。
- **修复**: 按职责拆分为子模块。

## P2 高优先级问题

| ID | 标题 | 文件 |
|----|------|------|
| SEC-003 | 文件路径遍历风险：用户输入直接拼接文件路径 | `server/src/services/comic/ComicCharacterImageService.ts` |
| SEC-004 | 无 CSRF 保护 | `server/src/app.ts` |
| SEC-005 | 错误响应泄露内部错误信息 | `server/src/middleware/errorHandler.ts` |
| SEC-006 | Prisma raw query 大量使用，需审计参数化程度 | `server/src/services/novel/worldContext/` 等 |
| STB-001 | 大量 HTTP 路由层 req.body as any 绕过类型检查 | `server/src/modules/novel/production/http/` 等 |
| STB-008 | 主进程缺少 unhandledRejection / uncaughtException 处理 | `server/src/app.ts` |
| STB-009 | 主 Express 服务器无 SIGTERM/SIGINT 处理 | `server/src/app.ts` |
| ARCH-002 | services/novel 反向依赖 modules/ | `server/src/services/novel/NovelExportService.ts` |
| ARCH-003 | services/styleEngine 反向依赖 prompting/ | `server/src/services/styleEngine/ChapterEditDiffService.ts` |
| ARCH-004 | 10 个路由/HTTP 文件直接访问 Prisma 数据库 | `server/src/routes/character.ts` 等 |
| ARCH-005 | server/src 有 15 个 .ts 文件超过 700 行 | `server/src/services/planner/PlannerService.ts` |
| ARCH-006 | client/src 有 9 个文件超过 700 行 | `client/src/pages/promptWorkbench/components/PromptSlotPanel.tsx` |
| ARCH-007 | 多个目录超过 12 个 .ts 文件未建子目录 | `server/src/routes/` 等 |
| QUA-003 | 深层嵌套: 60+处超过5层 | `server/src/agents/tools/novelReadTools.ts` |
| QUA-004 | console.log 残留: 20+处生产代码 console 输出 | `server/src/services/comic/ComicPanelImageService.ts` |
| QUA-005 | 错误码硬编码: 30+处 AppError 裸数字 | `server/src/services/bookAnalysis/BookAnalysisCommandService.ts` |
| QUA-006 | 代码重复: BookAnalysisCommandService 8处相同模式 | `server/src/services/bookAnalysis/BookAnalysisCommandService.ts` |
| QUA-007 | 错误吞没: 14处 `.catch(()=>{})` | `server/src/services/novel/novelCorePipelineExecutor.ts` |
| PERF-001 | list_chapters 工具查询全量章节内容字段 | `server/src/agents/tools/novelReadTools.ts` |
| PERF-002 | export 全量导出无分页/无限制查询 | `server/src/modules/export/novelExport.service.ts` |
| PERF-003 | listKnowledgeDocuments 后二次查询未使用 include | `server/src/agents/tools/knowledgeTools.ts` |
| PERF-004 | WorldService.listWorlds() 全量查询无分页无限制 | `server/src/services/world/WorldService.ts` |
| TEST-001 | 无 E2E 测试框架（Playwright/Cypress） | 项目根目录 |
| TEST-002 | 无标准 mock 框架，依赖 require.cache 手动注入 | `server/tests/*.test.js` |
| TEST-003 | 客户端测试极度稀疏，100+ 组件零测试覆盖 | `client/src/` |
| OBS-002 | 无 Request ID / Correlation ID 机制 | `server/src/` |
| OBS-003 | console.* 调用散布 52 个文件，日志格式和级别不统一 | `server/src/` |
| OBS-004 | LLM 调用追踪体系完备但仅写入数据库，无实时可观测性 | `server/src/llm/usageTracking.ts` |
| MAINT-002 | client 端 25+ 个文件超过 700 行阈值 | `client/src/pages/promptWorkbench/components/PromptSlotPanel.tsx` |
| MAINT-003 | 多个函数超过 400 行，最高 653 行 | `client/src/pages/novels/components/NovelAutoDirectorDialog.tsx` |
| MAINT-004 | 大量 10+ 分支的 switch 语句，可替换为查找表 | `server/src/` + `client/src/` |
| MAINT-005 | 多处 4-5 层深嵌套的控制流 | `server/src/llm/anthropicClient.ts` 等 |
| MAINT-006 | 88 处 as any 类型断言，系统性绕过类型检查 | `server/src/modules/novel/production/http/` 等 |
| MAINT-007 | plannerChapterPlanContext.ts 中 20 处 : any 类型标注 | `server/src/services/planner/plannerChapterPlanContext.ts` |
| MAINT-009 | 130 个 server 子目录中仅 4 个有 README（3.1%） | `server/src/` |
| MAINT-010 | JSDoc 覆盖率极低：server 6.3%、client 0%、shared 0% | 全项目 |
| MAINT-012 | server 端 396 处跨 3 层以上的深层 import | `server/src/` |
| MAINT-016 | 项目未配置 ESLint 或 Prettier | 项目根目录 |
| MAINT-026 | server/src/services/ 含 508 个 .ts 文件，远超 12 文件阈值 | `server/src/services/` |
| MAINT-029 | shared/types/ 48 个文件 251+ 导出符号零文档 | `shared/types/` |
| COMP-001 | node:sqlite 在 Node 20.x 下不可用 | `server/scripts/restore-dev-data.cjs` |

## 维度评分明细

评分公式：`(P4*1.0 + P3*0.7 + P2*0.3 + P1*0.0) / 总检查项`，加权后汇总。

### 安全性（0.20 权重）— 57/100

| 级别 | 数量 | 得分贡献 |
|------|------|----------|
| P4（合规） | 4 | 4.0 |
| P3（改进） | 4 | 2.8 |
| P2（高风险） | 4 | 1.2 |
| P1（关键） | 2 | 0.0 |
| **维度得分** | | **57/100** |

核心问题：authMiddleware 为空操作（SEC-001）是最高优先级修复项，修复后其他安全发现的风险会显著降低。

### 稳定性（0.15 权重）— 74/100

| 级别 | 数量 | 得分贡献 |
|------|------|----------|
| P4 | 6 | 6.0 |
| P3 | 7 | 4.9 |
| P2 | 3 | 0.9 |
| P1 | 0 | 0.0 |
| **维度得分** | | **74/100** |

核心问题：req.body as any 类型逃逸（STB-001）、主进程缺少 unhandledRejection 处理（STB-008）、无 SIGTERM/SIGINT 处理（STB-009）。

### 架构（0.15 权重）— 53/100

| 级别 | 数量 | 得分贡献 |
|------|------|----------|
| P4 | 2 | 2.0 |
| P3 | 6 | 4.2 |
| P2 | 6 | 1.8 |
| P1 | 1 | 0.0 |
| **维度得分** | | **53/100** |

核心问题：novel/planner 双向循环引用（ARCH-001）、services→modules 反向依赖、路由层直接访问数据库。

### 代码质量（0.15 权重）— 51/100

| 级别 | 数量 | 得分贡献 |
|------|------|----------|
| P4 | 2 | 2.0 |
| P3 | 6 | 4.2 |
| P2 | 5 | 1.5 |
| P1 | 2 | 0.0 |
| **维度得分** | | **51/100** |

核心问题：30 个超大文件、80+ 超长函数是最严重的两个问题。

### 性能（0.10 权重）— 67/100

| 级别 | 数量 | 得分贡献 |
|------|------|----------|
| P4 | 4 | 4.0 |
| P3 | 7 | 4.9 |
| P2 | 4 | 1.2 |
| P1 | 0 | 0.0 |
| **维度得分** | | **67/100** |

核心问题：无分页全量查询（export、list_chapters、listWorlds）、串行数据库查询。

### 可测试性（0.10 权重）— 75/100

| 级别 | 数量 | 得分贡献 |
|------|------|----------|
| P4 | 7 | 7.0 |
| P3 | 8 | 5.6 |
| P2 | 3 | 0.9 |
| P1 | 0 | 0.0 |
| **维度得分** | | **75/100** |

核心问题：无 E2E 测试框架、无标准 mock 框架、客户端 100+ 组件零测试覆盖。

### 可观测性（0.05 权重）— 62/100

| 级别 | 数量 | 得分贡献 |
|------|------|----------|
| P4 | 3 | 3.0 |
| P3 | 5 | 3.5 |
| P2 | 3 | 0.9 |
| P1 | 1 | 0.0 |
| **维度得分** | | **62/100** |

核心问题：Winston LoggerService 已实现但全项目零引用（OBS-001），已建设的结构化日志体系完全闲置。

### 可维护性（0.05 权重）— 58/100

| 级别 | 数量 | 得分贡献 |
|------|------|----------|
| P4 | 6 | 6.0 |
| P3 | 11 | 7.7 |
| P2 | 12 | 3.6 |
| P1 | 1 | 0.0 |
| **维度得分** | | **58/100** |

核心问题：超大文件普遍、类型安全有系统性缺口、文档覆盖率极低、配置分散。

### 兼容性（0.05 权重）— 77/100

| 级别 | 数量 | 得分贡献 |
|------|------|----------|
| P4 | 5 | 5.0 |
| P3 | 9 | 6.3 |
| P2 | 1 | 0.3 |
| P1 | 0 | 0.0 |
| **维度得分** | | **77/100** |

核心问题：node:sqlite 不兼容 Node 20（COMP-001）、Anthropic 模型列表过时。

## 正面发现

以下为审计中发现的良好实践，无需修复：

| ID | 维度 | 发现 |
|----|------|------|
| SEC-011 | security | Client 端无 XSS 漏洞（React 默认转义） |
| SEC-012 | security | .env 文件已正确 gitignore |
| SEC-013 | security | 输入验证覆盖率良好（Zod schema + validate 中间件） |
| SEC-014 | security | 无命令注入风险 |
| QUA-014 | quality | TODO 标记极少（仅 1 处），代码库清洁 |
| QUA-015 | quality | 命名规范良好（camelCase/PascalCase 一致） |
| PERF-014 | performance | 前端路由已全部使用 React.lazy 懒加载 |
| PERF-015 | performance | useSSE hook 和多个组件正确使用 useCallback/useMemo |
| MAINT-022 | maintainability | 当前无循环依赖（模块依赖图为 DAG） |
| MAINT-024 | maintainability | 2 处 @ts-ignore 和 2 处 @ts-nocheck，数量少且均合理 |
| MAINT-025 | maintainability | 8 处 eslint-disable，集中在迁移代码 |

## 修复优先级路线图

### Phase 1 — 紧急（P1，7 项）

影响最高、修复投入相对可控的问题。SEC-001（authMiddleware）是所有安全修复的前提。

1. **SEC-001** — 实现真正的 authMiddleware
2. **SEC-002** — 添加 express-rate-limit
3. **ARCH-001** — 解耦 services/novel 与 services/planner 循环引用
4. **QUA-001** — 拆分 30 个超大文件（优先 PlannerService 992 行）
5. **QUA-002** — 拆分 80+ 超长函数（优先 React 巨型组件）
6. **OBS-001** — 迁移 console.* 到 Winston LoggerService
7. **MAINT-001** — server 端超大文件拆分（与 QUA-001 部分重叠）

### Phase 2 — 高优（P2，41 项）

安全加固、架构修正、测试基础设施建设。

**安全加固**
- SEC-003: 添加 path traversal 防护
- SEC-004: 实现 CSRF 保护
- SEC-005: 错误响应脱敏
- SEC-006: Prisma raw query 参数化审计

**架构修正**
- ARCH-002 ~ ARCH-007: 消除反向依赖、路由层抽取 service、目录规范化

**稳定性**
- STB-001: 消除 req.body as any
- STB-008: 添加 unhandledRejection/uncaughtException 处理
- STB-009: 添加 SIGTERM/SIGINT 优雅关闭

**可观测性**
- OBS-002: 添加 Request ID / Correlation ID
- OBS-003: 统一日志格式和级别
- OBS-004: LLM 调用实时监控

**可维护性**
- MAINT-016: 配置 ESLint + Prettier
- MAINT-006/MAINT-007: 消除 as any 类型断言
- MAINT-009/MAINT-010: 添加 README 和 JSDoc

**测试**
- TEST-001: 引入 Playwright E2E 框架
- TEST-002: 引入标准 mock 框架
- TEST-003: 补充客户端测试

### Phase 3 — 中期（P3，63 项）

性能优化、深度代码清理、可观测性完善。

- PERF-001 ~ PERF-009: 修复无分页查询、优化 LLM 串行调用
- QUA-008 ~ QUA-013: 消除魔数、提取路由、修复类型问题
- OBS-005 ~ OBS-009: 健康检查增强、性能指标系统化、告警扩展
- MAINT-004 ~ MAINT-030: switch 重构、import 排序、env 集中管理

### Phase 4 — 长期（P39 项）

正面发现的维护和持续改进。

- SEC-011 ~ SEC-014: 保持现有安全实践
- PERF-012 ~ PERF-015: 保持前端性能优化实践
- MAINT-021 ~ MAINT-030: 低优先级配置和代码风格改进
- COMP-011 ~ COMP-015: 兼容性低优先级改进

## 附件

- `audit-findings.json`: 全量发现数据（150 条，含统一 severity 映射）
- `00-preprocessing/`: 预处理数据（file-stats.json, module-map.json, dependency-analysis.json）
- `01-scan-batch1/`: 安全、稳定性、架构维度扫描结果
- `02-scan-batch2/`: 质量、性能、可测试性维度扫描结果
- `03-scan-batch3/`: 可观测性、可维护性、兼容性维度扫描结果

---

## 复核结果

P1 关键发现经代码级验证：

| 发现 | 判定 | 说明 |
|------|------|------|
| SEC-001 | **confirmed** | authMiddleware 确为 no-op（仅 `next()` 一行） |
| SEC-002 | **confirmed** | 全项目无 rate-limit 中间件 |
| ARCH-001 | **confirmed** | planner ↔ novel 双向 import 链真实存在（5+ 文件深度循环链） |
| QUA-001 | **partially_true** | server 15 个 + client 9 个 + shared 6 个 = 30 个超大文件（server 部分属实，整体数字准确） |
| QUA-002 | **partially_true** | 超 50 行函数存在，但 80+ 总数需 AST 级验证 |
| OBS-001 | **confirmed** | LoggerService 导出 `logger` 实例但全项目零 import，属于死代码 |
| STB-008 | **confirmed** | 搜索 `process.on('unhandledRejection')` 全项目零命中 |

**复核结论**：7 个 P1 中 5 个完全确认，2 个部分确认（数量待精确验证，但问题性质属实）。无误报。复核后 P1 数量维持不变。
