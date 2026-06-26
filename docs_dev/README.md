# docs_dev — ll-workflow-core 工作区

> 这是 **ll-workflow-core 专用** 的工作目录,与项目业务侧 `docs/` 隔离。
>
> - `docs/`(architecture / design / plans / releases / wiki / checkpoints / superpowers)— 业务文档,人类维护
> - `docs_dev/`(本目录)— ll-workflow-core 治理产物,AI 路由自动写

## 目录编号映射(沿用 skill 的 default profile)

| 编号目录 | 用途 | 治理产物 |
| --- | --- | --- |
| `0.version_plan/` | 版本计划 / 里程碑 | `01-version-plan.md` |
| `1.task/` | 任务专题 | 六件套 + 审计包 + `requirements.md` + `README.md` |
| `2.tech/` | 技术文档(api/architecture/database/development/guide/specification/user_guide) | tech 文档族 |
| `3.analysis/` | 分析诊断(`diagnosis/01-active`、`02-outdated`)+ `report/` + `evidence/` | 审计报告 / 文档保鲜报告 |
| `4.misc/` | 杂项 + 交接工单(`handoff/`) | handoff-ticket |
| `5.git-commit/` | git 提交规范与模板 | commit 模板 |
| `6.changelog/` | 变更日志 | CHANGELOG |
| `7.weekly/` | 周报 / 经验回灌 | weekly |
| `8.test/` | 测试策略与覆盖率 | test docs |

## 不变式

- 本目录**不**被业务侧 docs/ 引用,也不在 AGENTS.md 树里出现
- skill 工作流(req/dev/aud/fix/branch/merge/hchk/haud/gt/df)默认**只**写本目录
- 任何 sync 到业务侧 docs/ 的迁移由显式 route 触发,绝不默认执行

## 触发入口

- `ll-workflow-core init` — 重新做骨架(已有结构会跳过)
- `ll-workflow-core req` — 需求开发,产物落 `1.task/B.todo/${ version }/`
- `ll-workflow-core dev` — 推进 todo,版本收口时把 `B.todo/${ version }/` 移到 `B.2.done/${ version }/`
- `ll-workflow-core aud` — 审计,产物落 `3.analysis/diagnosis/01-active/`
- `ll-workflow-core df` — 文档保鲜,扫描 `2.tech/` 与 `4.misc/`
- `ll-workflow-core haud` — 配置审计,产物落 `3.analysis/report/`
- `ll-workflow-core hchk` — 五维健康检查,产物落 `3.analysis/report/`
- `ll-workflow-core branch` — 并行开发,产物落 `worktree/<slot>/docs_dev/...`
