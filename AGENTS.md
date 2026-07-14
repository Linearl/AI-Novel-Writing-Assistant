# 安全规则
<!-- 父级: (根级，无父级) -->
<!-- 生成: 2026-06-26 | 更新: 2026-06-28 -->
<!-- 备份: docs/4.misc/backup/AGENTS.md.backup-2026-06-28 -->

## 项目概况

- **名称**: AI 小说创作助手 v2 (`ai-novel-writing-assistant-v2`)
- **类型**: pnpm workspace monorepo（4 子包：shared / server / client / desktop）
- **许可证**: AGPL-3.0-only
- **运行时**: Node 20.19+ / 22.12+ / 24+，pnpm 10.6+
- **核心产品**: 面向写作新手的"AI 导演式"长篇小说生产系统
- **当前产品优先级**: 稳定 auto-director 恢复 + 章节生产链 + 保持新手完成率为最高目标

## 数据保护（最高优先级）

- 未经过验证的备份，绝不能执行任何破坏性数据操作。
- 破坏性操作包括（但不限于）：删除数据库文件、`prisma migrate reset`、`db reset`、截断表、删除表，或任何可能移除现有数据的命令。
- 执行任何此类操作前，必须：
  - 获得用户对破坏性步骤的明确批准；
  - 完成备份并确认具体的备份路径；
  - 进行快速恢复验证（或至少检查备份文件的存在和大小）。
- 如果备份缺失或未验证，立即停止，不得继续。

## AI-First 系统规则（最高优先级）

- 本项目是 AI 原生应用。对于意图识别、任务分类、规划、路由、工具选择等决策路径，必须以 AI 结构化理解为主要实现方式。
- 当问题本应由 AI 处理时，不得使用固定关键词匹配、硬编码 regex 路由、手写分支表或任何非 AI fallback 路径来实现面向产品的核心行为。
- 如果 AI 意图识别失败，应视为 AI 能力/问题来修复，不得添加 fallback 匹配来掩盖遗漏。
- 固定判断仅允许用于：
  - 输入校验或安全守卫；
  - 对已结构化 AI 输出的确定性后处理。
- 添加新能力时，应先扩展 AI schema / 结构化输出 / 工具契约，不得通过堆叠特殊字符串规则来修补行为。

## Auto-Director 质量门规则（最高优先级）

- 章节审核、验收和质量循环结果不得自动阻断全局 auto-director 或全书执行链。
- 非全局的章节质量问题，包括 `local_patch_plan`、`continue_with_warning`、`patchable_obligation_gap`、`draft_obligation_unmet`、可恢复的修复失败和 `defer_and_continue` 质量债务，必须记录为章节级质量债务或本地修复指导，并允许剩余章节范围继续执行。
- 只有明确的 `stop_for_replan`、`replan_required`、`recommendedAction=replan`、无可用章节内容的不可恢复生成失败，或运行时安全/数据完整性失败才能停止全局链。
- 除非结构化 AI/运行时决策明确表示相邻章节计划必须停止重规划，否则不得将本地审核问题路由到 `replanAlertDetails`、`PIPELINE_REPLAN_REQUIRED` 或 `replan_required` 检查点。
- 如果本地修复已尝试但仍有残留问题，而章节有可用内容，优先采用降级定稿加质量债务，而非让整个 auto-director 任务失败。
- UI、任务投影和恢复逻辑必须保留此区分：本地质量债务是可见警告和后续跟进项，不是失败的 auto-director 工作流。
- 带有 `failed`、`blocked` 或 `waiting_recovery` 状态且有最新任务的书级 auto-director 投影，必须在 AI 驾驶舱、任务抽屉和恢复入口中保持可见，即使 URL 中不包含 `directorTaskId`；`workspaceTaskId` 是手动工作区通道，绝不能用作替代的 director 任务 ID。

## 产品上下文（最高优先级）

- 主要目标用户是完全不懂写作的写作新手。
- 优化方向：低认知负荷、强分步指导、清晰默认值、端到端完成体验。
- 不假设用户能手动修复结构、节奏、人物弧线或章节规划。
- 专家灵活性与新手完成率冲突时，优先新手完成率。

## UI 文案规则

- 所有面向用户的 UI 文案必须从用户视角说明功能：用户可以做什么、系统在帮助什么、下一步是什么。
- 不得将 UI 文案写成实现说明、迁移说明、重构说明或变更历史说明。
- 避免使用"现在已经"、"不再"、"迁回"、"升级为"等实现叙述式措辞。
- 完成 UI 工作前，检查新增文案并重写任何听起来像在对开发者说话的句子。

## Prompt 治理

- `server/src/prompting/` 是添加新产品级 prompt 的唯一允许入口。
- 任何新的面向产品的 prompt 必须作为 `PromptAsset` 实现在 `server/src/prompting/prompts/<family>/` 下，并在 `registry.ts` 注册。
- 不得通过在 service 文件中内联 `systemPrompt` / `userPrompt` 然后调用 `invokeStructuredLlm` 来添加新的业务 prompt。
- 不得通过从 service 代码调用原始 `getLLM()` 来添加新的业务 prompt，除非是已批准的例外（JSON 修复、连接性探测、流式桥接代码）。
- 触及现有未注册 prompt 路径时，默认迁移而非扩展旧实现。
- 命名和注册工作流参考 `server/src/prompting/README.md`。

## 代理协作规则

- 使用子代理处理范围明确的并行工作（独立探索、聚焦实现、文档审计、非阻塞验证）。
- 委托时分配明确的文件或模块所有权，子代理不得覆盖他人更改。
- 不得使用子代理绕过安全规则、数据保护、分支工作流、prompt 治理或 Wiki 要求。
- 不得委托破坏性操作、数据库重置、有数据丢失风险的迁移或分支提升决策。
- 通过正常审查集成子代理输出：检查 diff、确认符合架构规则、运行验证。

## 当前产品优先级

1. 稳定 auto-director 恢复和章节生产链。
2. 保持新手优先的完整小说完成作为主要产品目标。
3. 避免引入新的工作流分支，除非它们简化主要生产路径。
4. 优先修复运行时契约、prompt schema 和状态投影，而非添加仅 UI 的补丁。
5. 不得将 Creative Hub 扩展为通用聊天工具，除非它直接支持小说完成。

## 详细规则索引

以下章节已迁移到 `docs/wiki/`，按需查阅：

| 主题 | 位置 |
| --- | --- |
| Wiki 编写规范 | [`docs/wiki/README.md`](docs/wiki/README.md) |
| 开发分支工作流（含 Beta / 桌面分支） | [`docs/wiki/workflows/branch-workflow.md`](docs/wiki/workflows/branch-workflow.md) |
| Release Notes 工作流 + 发布标识规则 | [`docs/wiki/workflows/release-notes-workflow.md`](docs/wiki/workflows/release-notes-workflow.md) |
| 桌面打包上传规则 | [`docs/wiki/workflows/desktop-release-versioning.md`](docs/wiki/workflows/desktop-release-versioning.md) |
| 验证复用规则 | [`docs/wiki/workflows/verification-reuse.md`](docs/wiki/workflows/verification-reuse.md) |
| 架构规则（文件大小、目录组织、模块化） | [`CLAUDE.md`](CLAUDE.md)「关键架构约束」章节 |
