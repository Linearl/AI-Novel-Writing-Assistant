<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# shared/types

## Purpose
按域拆分的共享类型 — agent / api / chapter / character / creativeHub / director / image / llm / novel / world 等 47 个 `.ts` 文件。这是 `@ai-novel/shared` 暴露给所有 workspace 包的类型面。

## For AI Agents

### Working In This Directory
- 每个文件对应一个域;按域新增类型,不要在顶层 `index.ts` 堆
- 类型与 zod schema 同步导出,优先 schema-first
- 命名按域前缀清晰,避免与其他域冲突

## Dependencies

### Internal
- `shared/AGENTS.md`
- 下游消费者:`server/`、`desktop/`