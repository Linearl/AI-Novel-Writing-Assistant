---
description: "2026-W28 周报 — v0.1.00 定稿与发布 + v0.2 上游功能点分析拆分"
created: 2026-07-14
updated: 2026-07-16
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

## 下周展望（W29: 2026-07-15 ~ 07-18）

### 上游功能点分析与任务包拆分（07-15 ~ 07-16）

针对 REQ-7069（Auto-Director 增强）进行了深度分析：原始任务包包含 7 个子功能（FR-1 5步创建向导 / FR-2 桌面通知 / FR-3 待审自动提升 / FR-4 散文质量检测 / FR-5 冲突曲线 / FR-6 待审上下文 / FR-7 资源上下文重构），预估 5-6 天。

**核心发现**：7069 的 FR-1（5步创建向导）与现有的 `NovelAutoDirectorDialog`（模态对话框）存在架构冲突——现有项目已将导演创建流程实现为紧凑面板模式，而上游 Wizard 是独立全页面路由。两者核心控制器逻辑 90% 相同，差异仅 UI 组织方式。

**整合方案（方案 C）**：提取共享 controller + Wizard 步骤栏作为 Modal 的展开引导形态。保留现有所有交互路径，只改变 Modal 内部的 UI 组织。不引入新路由、不改变外部调用方式。

**任务包拆分决策**：原 7069 的 7 个子功能拆分为 7 个独立任务包（7069 + 7070~7075），理由：
- FR-1 与其他 FR 零代码耦合（纯客户端 UI vs 纯服务端逻辑）
- FR-3 的三个前置模块（StateChangeProposal、OpenConflict、StateCommitService）已就绪
- FR-4 是纯函数模块，零外部依赖，可独立开发测试
- FR-7 必须先于 FR-6（上下文重构是上下文注入的前置）
- FR-5 与 REQ-7063 已有关系：7063 处理前端可视化，FR-5 处理后端约束注入

**拆分结果**：

| 新 REQ | 内容 | 复杂度 | 工时 | 优先级 |
|--------|------|--------|------|--------|
| 7069 | FR-1 创建向导（范围缩窄） | C1 | 3.5天 | P1 |
| 7070 | FR-2 桌面通知 | S2 | 0.7天 | P2 |
| 7071 | FR-3 待审自动提升 | M2 | 0.7天 | P2 |
| 7072 | FR-4 散文质量检测器 | S2 | 0.7天 | P2 |
| 7073 | FR-5 冲突等级约束注入 | S2 | 0.2天 | P2 |
| 7074 | FR-7 资源上下文重构 | M3 | 0.5天 | P3 |
| 7075 | FR-6 待审上下文注入（依赖 7074） | S3 | 0.3天 | P3 |

### v0.2 进度盘点（07-16）

对 v0.2 全量任务包进行了盘点：

| 状态 | 数量 | 说明 |
|------|------|------|
| ✅ 已归档 | 23 个 | M1~M4 全部 16 个 + M5 上游移植 7 个（2054,2055,7061,7062,7063,7065,7066） |
| 📋 待开发 | 13 个 | 3020,7054,7055,7064,7067,7068 + 7069 系列 7 个 |
| **总计** | **36 个** | |

**进度亮点**：
- M1（异常自动处理）4/4 完成 — API 重试、模型切换、错误分类、网络监控全部到位
- M2（长篇生成优化）3/3 完成 — 检查点、批量队列、进度可视化
- M3（质量自动控制）6/6 完成 — 质量检查、自动重做、AI味检测/趋势、一致性监控、人物一致性
- 版本计划文档（v0.2-plan.md）已更新为反映实际 36 个任务包的清单和依赖关系
- 架构知识库（v0.2-architecture-knowledge.md）已新增 M5 完成总结和 M6 待开发明细

**文档同步**：
- `docs/0.version_plan/v0.2-plan.md` — 更新状态为 executing，任务清单 23→36，依赖图增加 M5/M6
- `docs/1.task/B.todo/v0.2/v0.2-architecture-knowledge.md` — 新增第 5b/5c 节，详细记录 7069 系列拆分决策
- `docs/6.changelog/releases/release-notes.md` — 待追加 07-15~07-16 变更记录

### 下一步重点
- [ ] REQ-7069（FR-1 创建向导）启动开发，3.5 天
- [ ] REQ-7068（Prompt 模板系统）继续推进
- [ ] REQ-7070~7075 按优先级依次开发
- [ ] v0.2 端到端验收测试（160 章验证）
