<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src/routes

## Purpose
Express 路由的当前归属 — 正在收敛到各模块自有的 `http/` 入口。**新路由不要直接加到这里**。

## Key Files
| File | Description |
|------|-------------|
| `appPaths.ts` | 应用路径常量 |
| `memoryTelemetry.ts` | 内存遥测路由 |
| `settings/` | 设置相关路由 |

## For AI Agents

### Working In This Directory
- 这是过渡层;新增路由放到 `server/src/modules/<domain>/http/`
- 老的路由在迁移到模块自有 `http/` 后再删除
- 根 AGENTS.md "Architecture Rules" 明确:`routes/` 应收敛到模块自有 `http/` 入口

## Dependencies

### Internal
- 根 `AGENTS.md` "Architecture Rules"
- `server/src/modules/AGENTS.md`