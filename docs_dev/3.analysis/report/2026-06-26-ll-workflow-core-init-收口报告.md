# ll-workflow-core init 收口报告

**执行时间**:2026-06-26
**Skill 版本**:v0.2.1
**项目**:ai-novel
**目标工作区**:`docs_dev/`(与业务 `docs/` 隔离)

## 关键决策

| 决策点 | 选择 | 原因 |
| --- | --- | --- |
| 业务 docs/ 是否被触碰 | **否** | docs/ 是已有人类维护的业务文档(architecture/design/plans/releases/wiki/checkpoints/superpowers)+ 36 个 AGENTS.md,不能被 init 覆盖 |
| ll-workflow 工作区 | **新建 `docs_dev/`** | 与 docs/ 完全隔离,各自演化 |
| base_profile | **default** | skill 默认的编号化结构(0/1/2/3/4/5/6/7/8),语义最标准,后续扩展成本最低 |
| pre-commit hook | **写入 `.git/hooks/pre-commit`** | 路径已全部重定向到 `docs_dev/` 与 `worktree/.slots.json`,不会触碰业务 docs/ |
| 同步失败策略 | **warning 不阻塞** | 避免 hook 把仓库锁死;但 `.slots.json` JSON 格式错误会**阻塞** commit |

## 实际产出

### 1. 配置层
- `.ll-workflow.yaml` — 重写,`base_profile: default` + 26 个 slot 全部指向 `docs_dev/`
- `package.json` — 新增 3 个 llwf 脚本:
  - `pnpm llwf:sync` — 生成 docs_dev/INDEX.md
  - `pnpm llwf:req-sync` — 同步 requirements.md
  - `pnpm llwf:check` — dry-run,只输出不写文件

### 2. 目录层(`docs_dev/`)
27 个子目录,按 default profile 编号化:

| 编号 | 路径 | 用途 |
| --- | --- | --- |
| 0 | `0.version_plan/` | 版本计划 |
| 1 | `1.task/` (A.inactive / B.todo / B.1.paused / B.2.done / B.3.cancelled / template / todolist) | 任务管理 + 需求池 |
| 2 | `2.tech/` (api/architecture/database/development/guide/specification/user_guide) | 技术文档 |
| 3 | `3.analysis/` (diagnosis/01-active / 02-outdated / report / evidence) | 诊断与报告 |
| 4 | `4.misc/` (+ handoff) | 杂项 + 交接工单 |
| 5 | `5.git-commit/` | 提交模板 |
| 6 | `6.changelog/` | 变更日志 |
| 7 | `7.weekly/` | 周报 + 经验回灌 |
| 8 | `8.test/` | 测试文档 |

预置文件:
- `docs_dev/README.md` — 工作区说明 + 不变式
- `docs_dev/INDEX.md` — 入口索引(初始版本,后续由 hook 自动重生成)
- `docs_dev/1.task/requirements.md` — 需求池占位
- `docs_dev/1.task/README.md` — 任务包总览占位
- `docs_dev/1.task/template/todolist-template.md` — 标准待办模板

### 3. worktree 池
- `worktree/.slots.json` — v1 协议,空池,max_slots=3(从 .ll-workflow.yaml `workflows.branch.max_parallel_slots` 同步)
- `worktree/.gitkeep` — 保留目录
- `.gitignore` 增量: `worktree/*/`(槽位目录由 git worktree 管理) + 保留 `.slots.json` 与 `.gitkeep`

### 4. Git 治理
- `.git/hooks/pre-commit` — ll-workflow-core 同步 hook,可执行
- 特征标记:`# ll-workflow-core: auto-sync`(幂等,二次注册会被跳过)
- 同步范围:
  1. `docs_dev/INDEX.md` 重生成 → 重新 `git add`
  2. `docs_dev/1.task/requirements.md` 重生成 → 重新 `git add`
  3. `worktree/.slots.json` JSON 合法性校验(失败则阻塞 commit)

## Slot 映射速查

| 语义 | slot 名 | 解析结果 |
| --- | --- | --- |
| 工作区根 | `docs_root` | `docs_dev/` |
| 需求池 | `task_requirements_index` | `docs_dev/1.task/requirements.md` |
| 待办根 | `task_todo_version_root` | `docs_dev/1.task/B.todo/${ version }/` |
| 已完成 | `task_done_version_root` | `docs_dev/1.task/B.2.done/${ version }/` |
| 审计落点 | `analysis_diagnosis_active` | `docs_dev/3.analysis/diagnosis/01-active/` |
| 文档保鲜落点 | `analysis_diagnosis_root` | `docs_dev/3.analysis/diagnosis/` |
| 配置审计落点 | `analysis_report_root` | `docs_dev/3.analysis/report/` |
| 周报 | `weekly_root` | `docs_dev/7.weekly/` |
| 交接工单 | `governance_handoff_root` | `docs_dev/4.misc/handoff/` |
| worktree 池 | `worktree_slots_json` | `worktree/.slots.json` |

## 不变式(写入 docs_dev/README.md)

- `docs_dev/` **不**被业务侧 docs/ 引用,也不在 AGENTS.md 树里出现
- skill 工作流默认**只**写 `docs_dev/`
- 任何 sync 到业务侧 docs/ 的迁移由显式 route 触发,绝不默认执行

## 验证结果

| 检查项 | 结果 |
| --- | --- |
| `pnpm llwf:check` dry-run 跑通 | ✅ 扫描 docs_dev/ 4 个 markdown |
| 路径已重定向到 docs_dev/ | ✅ 验证脚本输出提到 1.task/ 子目录 |
| `.git/hooks/pre-commit` 可执行 | ✅ 2924 字节,rwxr-xr-x |
| Hook 在空 stage 下能优雅跳过 | ✅ 输出 "no docs_dev/ changes, skip sync" |
| `.gitignore` 不误伤池文件 | ✅ `.slots.json` 与 `.gitkeep` 仍可追踪 |
| `worktree/` 与 `docs_dev/` 互不干扰 | ✅ 物理隔离,逻辑独立 |

## 后续可触发的路由

| 路由 | 产物落点 |
| --- | --- |
| `req <description>` | `docs_dev/1.task/B.todo/${ version }/<REQ-XXXX>/` |
| `dev` | 推进 todo,版本收口移 `B.2.done/` |
| `aud` / `aud-cc` / `aud-trad` | `docs_dev/3.analysis/diagnosis/01-active/` |
| `fix` | 读 audit-package,按 P1→P4 修复 |
| `branch` | `worktree/<slot>/` + 槽位注册到 `.slots.json` |
| `merge` | 链式验证 + 清理 worktree 槽位 |
| `hchk` | `docs_dev/3.analysis/report/` |
| `haud` | `docs_dev/3.analysis/report/` |
| `gt` / `gt-cc` | 服务层单元测试(CC Workflow 优先) |
| `df` / `df-cc` / `df-trad` | `docs_dev/3.analysis/diagnosis/` |
