<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-08 | Updated: 2026-08-08 -->

# docs

## Purpose
编号化文档体系 — 按主题分区的项目文档根目录(版本计划 / 任务 / 技术 / 分析 / 杂项 / changelog / 周报 / 测试)。

## Key Files
| File | Description |
|------|-------------|
| `README.md` | 文档体系总览 |
| `INDEX.md` | 自动生成的文档索引(由 git hooks 维护,**禁止手动编辑**) |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `0.version_plan/` | 版本计划 |
| `1.task/` | 任务包(A.inactive / B.1.paused / B.2.done / B.3.cancelled / B.todo / template) |
| `2.tech/` | 技术文档 |
| `3.analysis/` | 分析文档 |
| `4.misc/` | 杂项(wiki / issues / backup 等)(see `4.misc/AGENTS.md`) |
| `5.git-commit/` | git 提交记录 |
| `6.changelog/` | 变更记录(see `6.changelog/AGENTS.md`) |
| `7.weekly/` | 周报 |
| `8.test/` | 测试记录 |

## For AI Agents

### Working In This Directory
- `INDEX.md` 与 `docs/1.task/requirements.md` 由 git 提交 hooks 自动同步,**不要手动编辑**(根 AGENTS.md)
- 新增任务包或文档后直接提交,索引自动更新
- Wiki 编写规范见 `docs/4.misc/wiki/README.md`

## Dependencies

### Internal
- 根 `AGENTS.md` — 文档规则

### External
- 无
