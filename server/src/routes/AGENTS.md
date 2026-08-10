<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-08-08 -->

# server/src/routes

## Purpose
遗留 Express 路由的过渡归属 — 绝大多数已收敛到各模块自有的 `http/` 入口。**新路由不要直接加到这里**。

## Key Files
| File | Description |
|------|-------------|
| `logs.ts` | 日志相关路由(遗留) |

## For AI Agents

### Working In This Directory
- 这是过渡层;新增路由放到 `server/src/modules/<domain>/http/`
- 老的路由在迁移到模块自有 `http/` 后再删除
- 根 AGENTS.md "Architecture Rules" 明确:`routes/` 应收敛到模块自有 `http/` 入口

## Dependencies

### Internal
- 根 `AGENTS.md` "Architecture Rules"
- `server/src/modules/AGENTS.md`
