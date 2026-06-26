<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# shared

## Purpose
`@ai-novel/shared` 包:跨 server / client / desktop 的共享 TypeScript 类型与工具(`zod` schema + image prompt)。**这是公开的类型 API surface**,改动会影响所有 workspace 包。

## Key Files
| File | Description |
|------|-------------|
| `package.json` | 包定义(`type: module`,`exports: .` / `./imagePrompt` / `./types/*`) |
| `tsconfig.json` | TS 配置 |
| `index.ts` | 顶层 barrel |
| `imagePrompt.ts` | 图片 prompt 工具 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `types/` | 按域拆分的共享类型(agent / api / chapter / character / creativeHub / director / image / llm / novel / world 等 47 个文件) |

## For AI Agents

### Working In This Directory
- 这是**跨包契约层**,任何破坏性改动需要走 feature 分支 + 全量 typecheck
- 改类型后必须跑 `pnpm --filter @ai-novel/shared build`,否则下游包消费不到新类型
- 用 zod 4 校验/导出,优先 schema-first 而非手写 type

### Compatibility Rule
- 新增字段 → 可选字段,不要改现有必填语义
- 删除字段 → 先标记 deprecated 一个 release,再删除

## Dependencies

### Internal
- 根 `AGENTS.md` 是最高优先级
- 下游消费者:`@ai-novel/server`、`@ai-novel/desktop`

### External
- `zod ^4.3.6` — schema 校验