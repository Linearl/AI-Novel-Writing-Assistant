---
description: "2026-W28 周报 — v0.1.00 定稿与发布"
created: 2026-07-14
---

# 2026-W28 周报（2026-07-10 ~ 2026-07-14）

## 本周完成

### v0.1.00 核心任务包（2026-07-11 ~ 07-14）

完成 5 个核心任务包 + 多个收尾任务：

| 编号 | 功能 | 复杂度 | 状态 |
|------|------|--------|------|
| r2049 | 审校上下文增强 | S2 | ✅ |
| r2050 | 全局审校 + 跨章节回灌 | C1 | ✅ |
| r2051 | 角色重要度分级 | C2 | ✅ |
| r3014 | 批量润色 | C2 | ✅ |
| r3019 | 反馈 → GitHub Issue | C3 | ✅ |

#### r2049 审校上下文增强

- `audit.prompts.ts`：light/full prompt 新增 5 组 context requirements
- `chapterLayeredContextBlocks.ts`：review 模式强制注入 timeline/character_dynamics/payoff_directives

#### r2050 全局审校

- 新增 `GlobalReviewIssue` Prisma model
- 新增 `audit.global.prompts.ts`（5 个审校维度）
- 新增 `GlobalReviewService.ts`（scope 解析 + 320K token budget 裁剪）
- 新增 `auditContextBuilder.ts`（全局层 + 章节层组装）
- 新增 `POST /api/novels/:id/global-review` 端点
- 逐章审校自动注入 `global_review_feedback` context block

#### r2051 角色重要度分级

- Prisma：`CharacterTier` enum + `Character.tier` 字段
- Shared types：`CharacterTier` 类型 + 3 个接口加 tier
- Prompt：Zod schema 校验 + 8 个 prompt 加分级指令
- Service：lead 数量校验、cast apply 写入、supplemental 透传
- 前端：tier 选择器、侧边栏分组/筛选、徽章、阵容标签
- 下游：章节上下文按 tier 详略

#### r3014 批量润色

- 新增 `novelBatchStyleRoutes.ts`（4 个端点）
- 后台任务机制（AbortController、进度轮询、自动清理）
- 前端组件：Button/Progress/Result + useBatchPolish hook

#### r3019 反馈 → GitHub Issue

- 新增 `feedbackContextCollector.ts`（环形缓冲区 <50KB）
- 重写 `FeedbackDialog.tsx`（FAB + 弹窗 + 粘贴截图）
- 新增 `issueGenerator.ts` + `issueGeneration.prompts.ts`
- 前端：Markdown 预览 + 复制 + 跳转 GitHub

### Bug 修复（11 个）

- NovelWorldInstanceService 重复方法实现
- characterSchema API 验证层缺少 tier 字段
- 自动导演进度卡在 99%
- 世界同步功能多处修复（方法名不匹配、缺失方法、差异对比）
- 任务包编号冲突 7040→7045

### 文档与治理（2026-07-14）

- README 重写：移除上游截图引用、标注 fork 独有功能、更新项目定位
- v0.1-release-notes.md：完整记录 110 个任务包（9 大领域分类）
- v0.2-plan.md：重命名统一版本规划文档
- Git 治理：移除 .github/.claude/.mimocode/worktree 追踪（849 文件）
- Git 历史重写：彻底从历史中移除敏感目录
- .gitignore 完善：整目录排除规则

### 其他归档任务（2026-07-11 ~ 07-13）

| 编号 | 功能 |
|------|------|
| r3011 | 小说预览页面增强控制面板 |
| r3012 | 任务中心批量操作功能 |
| r3013 | 导演跟进任务列表全选与批量清理 |
| r3015 | 修复缺失的服务方法 |
| r3016 | 服务器日志系统实现 |
| r3017/r3018 | 创建页面路径选择卡片 |
| r7045 | 世界同步手动对比功能 |

## 问题与风险

| 问题 | 影响 | 处理 |
|------|------|------|
| 角色 tier 未传入 API 验证层 | 创建角色时 tier 丢失 | 补充 characterSchema tier 字段 |
| review 模式 timelineContext 为 null 时崩溃 | 测试失败 | 添加 null 检查 + fallback 占位 |
| buildParticipantText tier 分级导致测试回归 | signature/voice 字段丢失 | named tier 保持完整 profile 输出 |
| Git 历史中残留敏感目录 | 推送时泄露配置 | git filter-repo 彻底清理 |

## KPI 指标

| 指标 | 目标 | 实际 |
|------|------|------|
| v0.1.00 定稿 | 07-14 | ✅ |
| 核心任务包 | 5/5 | 5/5 ✅ |
| 测试通过 | 1326 pass / 0 fail | ✅ |
| 类型检查 | 零错误 | ✅ |
| 全量构建 | 成功 | ✅ |
| 总任务包数 | 110 | 110 ✅ |
| Git 历史清理 | 完成 | ✅ |

## 经验回灌

- **Prisma schema 变更后必须 db push**：新增 enum/字段后，测试用的 SQLite dev.db 需要同步，否则 findUnique 查询会报 column not found
- **多代理并行开发**：4 个代理并行处理 4 个任务包，无文件冲突，效率提升 ~3x
- **git filter-repo 使用**：重写历史前必须创建备份分支，完成后删除；filter-repo 会自动移除 remote 配置
- **CharacterFormState 多处定义**：前端有 4 处独立的 CharacterFormState interface，修改时必须全部同步
