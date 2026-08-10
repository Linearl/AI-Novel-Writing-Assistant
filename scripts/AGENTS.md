<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-08 | Updated: 2026-08-08 -->

# scripts

## Purpose
仓库级辅助脚本,按功能分组(desktop / dev / data / analysis / docs)。这些脚本服务于开发流程、数据迁移、构建发布等运维需求,不属于产品代码。

## Key Files
| File | Description |
|------|-------------|
| `req-sync.js` | REQ 任务包编号同步工具(`node scripts/req-sync.mjs next --category 7` 查询可用编号) |
| `README.md` | 脚本使用说明 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `analysis/` | 代码分析工具(list-class-methods / print-lines / summarize-repair-log) |
| `data/` | 数据工具(backfill-step-type / import-rules / restore-user-data / sync-file-to-db) |
| `desktop/` | 桌面打包发布脚本(build-portable / bump-version / trigger-release / update-release-notes) |
| `dev/` | 开发辅助(clean-dev-db / cleanup-zombie / start-all / wait-for-port / run-with-log) |
| `docs/` | 文档工具(export-git-log / task-md-sync) |

## For AI Agents

### Working In This Directory
- 脚本用 CJS / ESM / Python 混写,遵循所在子目录的既有风格
- **数据脚本谨慎执行**:`scripts/data/*` 涉及用户数据,执行前确认目标与备份(根 AGENTS.md "数据保护")
- 不要重复造轮子:`req-sync.mjs` 已提供 REQ 编号查询,不要创建替代脚本(如 `next-req.ps1`)

### Testing Requirements
- 脚本大多无自动化测试;修改后手动跑一次验证(如 `node scripts/req-sync.mjs next`)

## Dependencies

### Internal
- 根 `AGENTS.md` — 数据保护规则最高优先级

### External
- Node.js ≥20.19、Python 3(部分脚本)
