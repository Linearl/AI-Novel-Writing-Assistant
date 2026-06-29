---
description: "REQ-7001 任务拆解"
---

# REQ-7001 任务拆解

> 状态：⏳ 进行中

## 任务概述

### 1. 来源

2026-06-28 健康检查报告 — 测试健康度评估

### 2. 问题

批量运行测试时 prisma mock 污染导致 4 个 auto-director 测试失败，通过率 79%。

### 3. 需求

- 修复测试隔离问题
- 涉及文件：`server/tests/autoDirector*.test.js`

### 4. 验收标准

> 见 [REQ-7001.md](./REQ-7001.md) 第 4 节。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 分析批量运行失败的精确传播路径 | P0 | 30min | ⬜ 待开始 |
| T2 | 修复 autoDirectorAutoApprovalAudit.test.js mock 恢复 | P0 | 30min | ⬜ 待开始 |
| T3 | 修复其他受影响的 auto-director 测试 mock 恢复 | P1 | 30min | ⬜ 待开始 |
| T4 | 验证 `pnpm test` 全部通过 | P0 | 15min | ⬜ 待开始 |

---

## 逐项展开

### T1: 分析批量运行失败的精确传播路径

**目标**: 确定哪个前序测试文件污染了 prisma mock，以及哪些方法未被恢复。

**改动点**:
- 分析 `server/scripts/run-tests.cjs` 的测试执行顺序
- 对比批量 vs 单独运行的 prisma 状态差异

### T2: 修复 autoDirectorAutoApprovalAudit.test.js mock 恢复

**目标**: 确保 `prisma.autoDirectorAutoApprovalRecord.findMany` 等方法在测试 teardown 时恢复原值。

**改动点**:
- `server/tests/autoDirectorAutoApprovalAudit.test.js` — 添加 finally 块恢复所有 mock

### T3: 修复其他受影响的 auto-director 测试 mock 恢复

**目标**: 所有 auto-director 测试文件的 mock 都有完整的 teardown 恢复。

**改动点**:
- `server/tests/autoDirectorChannelCallbacks.test.js` — 检查 mock 恢复
- `server/tests/autoDirectorApprovalPreferenceRoutes.test.js` — 检查 mock 恢复
- 其他共享 prisma 的测试文件

### T4: 验证 pnpm test 全部通过

**目标**: 批量运行 19/19 通过。

**改动点**: 无代码改动，纯验证。

---

## DoD（Definition of Done）

- `pnpm test` 输出 0 个 fail
- 无生产代码变更

---

## 验证步骤

1. `pnpm test` — 确认 19/19 通过
2. `node --test server/tests/autoDirectorAutoApprovalAudit.test.js` — 单独运行仍通过
3. `node --test server/tests/autoDirectorChannelCallbacks.test.js` — 单独运行仍通过
