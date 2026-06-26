<!-- Parent: ../../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/tests

## Purpose
服务端 Node test runner 测试 — 覆盖 planner / tools / runtime / routes / book-analysis 等关键模块。

## For AI Agents

### Working In This Directory
- 使用 Node test runner(`node --test`),非 vitest / jest
- 跑测试:`pnpm test`(fast) / `pnpm test:integration` / `pnpm test:planner` / `pnpm test:tools` / `pnpm test:runtime` / `pnpm test:routes` / `pnpm test:book-analysis`
- 完整流程:`pnpm --filter @ai-novel/shared build && pnpm --filter @ai-novel/server build && pnpm --filter @ai-novel/server test:node`
- 跑测试前先 build shared 包

### Verification Reuse (来自根 AGENTS.md)
- 同一代码路径已通过近期验证 → 默认不复跑
- 涉及 runtime 契约 / prompt schema / task recovery / 数据库行为 / 跨模块产品流的改动 → 跑最窄必要验证并记录跳过的更广检查
- 纯文档改动或最近 build/typecheck 已覆盖 → 跳过重复 `pnpm build` / `pnpm typecheck`

### Cost Awareness
- Build 可能耗时 → 文档型 diff 不强制 rebuild
- 若复用近期验证,显式说明"信任的是哪次检查、为什么仍适用"

## Dependencies

### Internal
- 根 `AGENTS.md` "Verification Reuse Rules"
- `server/package.json` 的 test scripts