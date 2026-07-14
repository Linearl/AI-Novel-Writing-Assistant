<!-- Parent: ../../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# docs/wiki/debugging

## Purpose
记录反复出现的失败模式、诊断路径与恢复方法。新人/AI agent 遇到报错时应优先查阅这里。

## Key Files
| File | Description |
|------|-------------|
| `character-continuity-hard-facts.md` | 角色连续性硬事实 |
| `log-retention.md` | 日志保留策略 |
| `recurring-failure-modes.md` | 反复出现的失败模式 |

## For AI Agents

### Debugging Conventions
- 写"症状":用户/AI 看到的现象是什么
- 写"根因":为什么会发生
- 写"诊断路径":用哪些日志/字段/查询快速定位
- 写"恢复方法":确认根因后用什么命令/参数修复
- 写"如何预防":后续如何避免再次发生

## Dependencies

### Internal
- `docs/wiki/workflows/auto-director-runtime.md` — Director 失败模式上下文
- `docs/wiki/workflows/chapter-production-chain.md` — 章节生产失败模式上下文