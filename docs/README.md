# docs — 文档体系

> 本目录同时承载 **ll-workflow-core 工作区**（编号化目录）和**业务侧文档**（从上游迁移并收敛到编号体系内）。

## 目录编号映射

| 编号目录 | 用途 | 说明 |
| --- | --- | --- |
| `0.version_plan/` | 版本计划 / 里程碑 | `v0.1-plan.md`、`v0.2-plan.md` 等 |
| `1.task/` | 任务专题 | 六件套 + 审计包 + `requirements.md` + `README.md` |
| `2.tech/` | 技术文档 | api / architecture / design / guide / plans |
| `3.analysis/` | 分析诊断 | diagnosis + report + evidence |
| `4.misc/` | 杂项 | wiki、checkpoints、superpowers、交接工单(handoff)、issues |
| `5.git-commit/` | git 提交规范与模板 | commit 模板 |
| `6.changelog/` | 变更日志 + 发布说明 | releases 子目录放用户可见版本更新 |
| `7.weekly/` | 周报 / 经验回灌 | weekly |
| `8.test/` | 测试策略与覆盖率 | test docs |

## 不变式

- 本目录是文档的唯一入口，不再有并列的 `docs_dev/` 或上游 `docs/`
- skill 工作流(req/dev/aud/fix/branch/merge/hchk/haud/gt/df)默认**只**写本目录
- 业务侧文档（architecture/design/plans/wiki 等）已迁入对应编号目录

## 触发入口

- `ll-workflow-core init` — 重新做骨架(已有结构会跳过)
- `ll-workflow-core req` — 需求开发,产物落 `1.task/B.todo/${ version }/`
- `ll-workflow-core dev` — 推进 todo,版本收口时把 `B.todo/${ version }/` 移到 `B.2.done/${ version }/`
- `ll-workflow-core aud` — 审计,产物落 `3.analysis/diagnosis/01-active/`
- `ll-workflow-core df` — 文档保鲜,扫描 `2.tech/` 与 `4.misc/`
- `ll-workflow-core haud` — 配置审计,产物落 `3.analysis/report/`
- `ll-workflow-core hchk` — 五维健康检查,产物落 `3.analysis/report/`
- `ll-workflow-core branch` — 并行开发,产物落 `worktree/<slot>/docs/...`

---

## 上游文档迁入映射（供查阅）

以下目录从上游 `docs/` 迁入，保留原有内容：

| 上游目录 | 迁入位置 | 内容说明 |
|---------|---------|---------|
| `architecture/` | `2.tech/architecture/` | 依赖注入、后端测试约定 |
| `design/` | `2.tech/design/` | 模块设计、领域建模、产品机制 |
| `plans/` | `2.tech/plans/` | 仍有执行价值的模块计划 |
| `guides/` | `2.tech/guide/`（合并已有）| 操作指南 |
| `wiki/` | `4.misc/wiki/` | 架构/工作流/调试/产品/Prompt/RAG 长期知识沉淀 |
| `checkpoints/` | `4.misc/checkpoints/` | 阶段检查点、迁移里程碑 |
| `superpowers/` | `4.misc/superpowers/` | 特殊计划 |
| `releases/` | `6.changelog/releases/` | 用户可见版本更新完整历史 |

## 文档维护约定

- 新增文档时，默认放入对应编号目录，不再创建顶层子目录。
- `TASK.md` 负责"当前主路线与优先级"，设计细节沉到 `2.tech/`。
- 根 `README.md` 的更新说明只保留最新一次；完整历史在 `6.changelog/releases/release-notes.md`。
- 新增或修改核心工作流、Prompt、RAG、任务状态、自动导演、章节生产时，判断是否产生稳定 wiki 价值，有则更新 `4.misc/wiki/`。
- Wiki 页面解释长期规则和原因，不写成文件修改列表、临时 TODO 或 release notes 复制品。
