---
description: "REQ-2050 任务拆解"
---

# REQ-2050 任务拆解

> status: done
> updated: 2026-07-14

## 任务概述

### 1. 来源

审校质量分析 — 当前审校只能逐章进行，缺少跨章节视角。

### 2. 问题

逐章审校无法检测角色一致性、伏笔呼应、情节连贯性等跨章节问题，需要全局审校能力。

### 3. 需求

- 全局审校 prompt + context builder
- GlobalReviewIssue 数据模型 + API
- Scope 选择 + token budget 裁剪
- 跨章节问题回灌到逐章审校
- 手动触发 + 卷完成自动触发

### 4. 验收标准

> 见 [REQ-2050-global-review-feedback.md](./REQ-2050-global-review-feedback.md) 第 4 节。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1.1 | 新增 GlobalReviewIssue Prisma model + migration | P0 | 1h | ✅ 已完成 |
| T1.2 | 新增全局审校 prompt（audit.global） | P0 | 1h | ✅ 已完成 |
| T1.3 | 新增全局审校 context builder（全局层 + 章节层） | P0 | 1.5h | ✅ 已完成 |
| T2.1 | 新增全局审校 API 端点（POST /api/novels/:id/global-review） | P0 | 1h | ✅ 已完成 |
| T2.2 | scope 选择 + token budget 自动裁剪逻辑 | P1 | 1h | ✅ 已完成 |
| T2.3 | 全局审输出解析 + GlobalReviewIssue 写入 | P0 | 1h | ✅ 已完成 |
| T3.1 | 逐章审校时注入 global_review_feedback context block | P0 | 0.5h | ✅ 已完成 |
| T3.2 | 卷完成自动触发全局审 | P1 | 0.5h | ✅ 已完成 |
| T3.3 | pnpm typecheck 通过 | P0 | 0.5h | ✅ 已完成 |
| T3.4 | 端到端验证（含前端UI页面+路由+侧边栏入口） | P1 | 0.5h | ✅ 已完成 |

---

## 逐项展开

### T1.1: 新增 GlobalReviewIssue Prisma model + migration

**目标**: 在 Prisma schema 中新增 GlobalReviewIssue 数据模型。

**改动点**:
- `server/src/prisma/schema.prisma` — 新增 model

**DoD**:
- model 定义包含所有必要字段（novelId, reviewRunId, severity, category, description, fixDirection, affectedChapters, primaryFixChapter, status）
- `pnpm db:migrate` 成功创建迁移
- Prisma client 生成正确

---

### T1.2: 新增全局审校 prompt（audit.global）

**目标**: 创建全局审校 prompt，定义跨章节审校维度和输出格式。

**改动点**:
- `server/src/prompting/prompts/audit/` — 新增 audit.global prompt
- `server/src/prompting/prompts/audit/registry.ts` — 注册新 prompt

**DoD**:
- prompt 定义 5 个审校维度（角色一致性、伏笔呼应、情节连贯性、节奏与张力、设定自洽性）
- 输出格式包含 crossChapterIssues 数组
- prompt 通过 PromptAsset 接口注册

---

### T1.3: 新增全局审校 context builder（全局层 + 章节层）

**目标**: 创建全局审校 context builder，组装全局层和章节层上下文。

**改动点**:
- `server/src/services/audit/auditContextBuilder.ts` — 新增 buildGlobalReviewContext 函数

**DoD**:
- 全局层包含 book_contract、story_macro、角色弧线规划、伏笔总账、当前卷概览
- 章节层包含结构化摘要和全文
- 总 token 估算准确（~8K 全局 + 每章 ~6-10K）
- 缺失数据时跳过对应段，不阻断

---

### T2.1: 新增全局审校 API 端点（POST /api/novels/:id/global-review）

**目标**: 新增全局审校 API 端点。

**改动点**:
- `server/src/modules/novel/production/http/novelReviewRoutes.ts` — 新增路由

**DoD**:
- 端点接收 novelId + scope 参数（currentVolume / range）
- 异步执行全局审校（返回 reviewRunId）
- 返回审校进度和结果摘要

---

### T2.2: scope 选择 + token budget 自动裁剪逻辑

**目标**: 实现 scope 选择和 token budget 自动裁剪。

**改动点**:
- `server/src/services/audit/auditService.ts` — 新增 scope 解析和裁剪逻辑

**DoD**:
- 支持三种 scope 选项：当前卷、指定范围、自动裁剪
- 自动裁剪按 320K budget 计算可审章节数
- 裁剪后返回"本次覆盖 N 章"提示

---

### T2.3: 全局审输出解析 + GlobalReviewIssue 写入

**目标**: 解析全局审 LLM 输出并写入 GlobalReviewIssue 表。

**改动点**:
- `server/src/services/audit/auditService.ts` — 新增输出解析逻辑

**DoD**:
- 解析 crossChapterIssues 数组
- 每个 issue 正确映射到 GlobalReviewIssue 字段
- 写入数据库成功
- 解析失败时记录错误，不阻断流程

---

### T3.1: 逐章审校时注入 global_review_feedback context block

**目标**: 在逐章审校 context 中注入全局审校反馈。

**改动点**:
- `server/src/services/audit/auditContextBuilder.ts` — 在 buildChapterReviewContext 中新增注入逻辑

**DoD**:
- 查询 GlobalReviewIssue 表中 status = 'pending' 且 affectedChapters 包含当前章的记录
- 注入为 context block "global_review_feedback"（priority 105）
- 无 pending issue 时不注入该 block
- 最多注入 10 条 issue

---

### T3.2: 卷完成自动触发全局审

**目标**: 每完成一卷所有章节审校后自动触发全局审校。

**改动点**:
- `server/src/services/audit/auditService.ts` — 新增卷完成检测和自动触发逻辑

**DoD**:
- 检测当前卷所有章节是否已完成审校
- 自动触发全局审校（scope = 当前卷）
- 不阻断章节生成流程

---

### T3.3: pnpm typecheck 通过

**目标**: 确保所有新增代码类型检查通过。

**验证步骤**:
1. `pnpm --filter @ai-novel/shared build`
2. `pnpm typecheck`

**DoD**:
- 无新增类型错误
- shared 包构建成功

---

### T3.4: 端到端验证（含前端UI页面+路由+侧边栏入口）

**目标**: 在真实环境中验证完整流程，包括前端UI。

**验证步骤**:
1. 启动 `pnpm dev`
2. 创建测试小说并写入几章内容
3. 手动触发全局审校（前端入口/POST /api/novels/:id/global-review）
4. 验证 GlobalReviewIssue 表有数据
5. 触发逐章审校，验证 global_review_feedback context block 注入
6. 完成一卷审校，验证自动触发全局审校

**DoD**:
- 全局审校 API 正常返回
- GlobalReviewIssue 正确写入
- 逐章审校时注入 global_review_feedback
- 卷完成自动触发
- 前端页面+路由+侧边栏入口正常可用
