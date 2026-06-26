<!-- Parent: ../../../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src/services/novel/director/runtime

## Purpose
Director runtime 子系统 — 包含约 36 个文件,涵盖 `DirectorRuntimeService` / `DirectorNodeRunner` / `DirectorPolicyEngine` / `DirectorArtifactLedger` / takeover runtime 等。Director 实际跑起来的全部机制都在这里。

## Key Files
| File | Description |
|------|-------------|
| `DirectorRuntimeService.ts` | Runtime 主服务 |
| `DirectorNodeRunner.ts` | 单个节点运行器 |
| `DirectorPolicyEngine.ts` | Director 策略引擎 |
| `DirectorArtifactLedger.ts` | Director 产物台账 |
| `novelDirectorTakeoverRuntime.ts` | 用户/手动接管 runtime |

## For AI Agents

### Working In This Directory
- 这是 Director runtime 的实现层;改这里会直接影响 auto-director 行为
- 涉及 checkpoint / 状态转移 / 任务恢复的改动,必须先看 `docs/wiki/workflows/auto-director-runtime.md`
- 涉及 state 契约的改动,必须同步更新 `docs/wiki/architecture/`
- 文件可能 >500 行,严格遵守 700 行硬上限(根 AGENTS.md "Architecture Rules")

### Runtime Contract Stability
- Director runtime 与 task center / 前端投影共享的运行时契约必须保持稳定
- 任何破坏契约的改动先在 feature 分支跑通 → 进 `beta` → 再 `main`

## Dependencies

### Internal
- `server/src/services/novel/director/AGENTS.md`
- `docs/wiki/workflows/auto-director-runtime.md`