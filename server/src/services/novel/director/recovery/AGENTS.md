<!-- Parent: ../../../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src/services/novel/director/recovery

## Purpose
Director 恢复逻辑 — 包括整体恢复、结构化大纲恢复、下游 reset、样本审计、draft 基线回填。

## Key Files
| File | Description |
|------|-------------|
| `novelDirectorRecovery.ts` | Director 主恢复逻辑 |
| `novelDirectorDownstreamReset.ts` | 下游状态重置 |
| `novelDirectorStructuredOutlineRecovery.ts` | 结构化大纲阶段恢复 |
| `directorRecoverySampleAudit.ts` | 恢复样本审计(脚本) |
| `directorChapterDraftBaselineBackfill.ts` | draft baseline 回填(脚本) |

## For AI Agents

### Working In This Directory
- 修改恢复路径前必读 `docs/wiki/workflows/auto-director-runtime.md` 的恢复章节
- 样本审计脚本可作为回归参考
- 不要轻易改变 "recoverable vs non-recoverable" 判定 — 涉及全局 vs 局部的质量债归因(根 AGENTS.md "Auto-Director Quality Gate Rules")

### Data Protection
- `directorChapterDraftBaselineBackfill.ts` 涉及数据回填 → 必须先有 verified backup(根 AGENTS.md "Safety Rules → Data Protection")

## Dependencies

### Internal
- `server/src/services/novel/director/AGENTS.md`
- `docs/wiki/workflows/auto-director-runtime.md`