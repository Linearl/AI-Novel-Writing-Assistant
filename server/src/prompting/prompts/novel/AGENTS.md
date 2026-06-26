<!-- Parent: ../../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src/prompting/prompts/novel

## Purpose
小说生成核心 prompt family — 章节编辑(`chapterEditor/`)、卷级(`volume/`)等。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `chapterEditor/` | 章节编辑器相关 prompt |
| `volume/` | 卷级 prompt |

## For AI Agents

### Working In This Directory
- 新增小说 prompt 必须遵循根 AGENTS.md "Prompt Governance" 与 `server/src/prompting/AGENTS.md`
- 注册到 `server/src/prompting/registry.ts`,声明 taskType / mode / contextPolicy / outputSchema
- 章节相关 prompt 改动前必读 `docs/wiki/workflows/chapter-production-chain.md`

## Dependencies

### Internal
- `server/src/prompting/AGENTS.md`
- `docs/wiki/workflows/chapter-production-chain.md`