---
description: "提取硬编码常量 — REQ-7032 需求文档，修复重复魔数、重复函数定义、硬编码阈值"
---

# REQ-7032：提取硬编码常量

## 背景

审计复核确认以下硬编码问题，全部方案明确（提取常量/统一函数）。

## 范围

### 1. 重复常量提取（2 处）

| 来源 ID | 位置 | 当前 | 修复 |
|---------|------|------|------|
| ARCH-016 | `server/src/llm/structuredOutput.ts` 9 处 | `safeStructuredMaxTokens: 8192` 在 9 个 provider family 分支各写一遍 | 提取 `DEFAULT_SAFE_STRUCTURED_MAX_TOKENS = 8192`，buildProfile 中用默认值，各 family 仅差异时覆盖 |
| STA-017 | `server/src/services/novel/director/automation/novelDirectorAutoExecutionRuntime.ts:280` | `await new Promise(r => setTimeout(r, 1500))` | 提取 `PIPELINE_POLL_INTERVAL_MS = 1500` 常量 |

### 2. 断路器阈值配置化（1 处）

| 来源 ID | 位置 | 当前 | 修复 |
|---------|------|------|------|
| ARCH-014 | `server/src/services/novel/director/runtime/DirectorCircuitBreakerService.ts:8-16` | 7 个阈值硬编码 TypeScript 字面量 | 在 `server/src/config/` 创建 `circuitBreaker.yaml`，启动时读取 + 默认值 fallback，合并到 `DIRECTOR_CIRCUIT_BREAKER_THRESHOLDS` 常量。对外接口不变 |

### 3. 魔法数字命名（1 处）

| 来源 ID | 位置 | 当前 | 修复 |
|---------|------|------|------|
| QUA-031 | `server/src/services/novel/novelCoreShared.ts:464-475` | `ruleScore()` 中 12+ 个内联数字 | 提取命名常量：`TEXT_LENGTH_LONG_THRESHOLD`、`COHERENCE_SCORE_LONG` 等 |

### 4. 重复函数定义收敛（1 处）

| 来源 ID | 位置 | 当前 | 修复 |
|---------|------|------|------|
| QUA-016 | `server/src/` 中 31 处重复定义 | compactText/truncateText 在 31 个文件中各有一份 | 在 shared 包创建 `compactText` 和 `truncateText` 统一工具函数，替换所有 31 处调用。参数签名采用最常见的版本（默认 maxLen=200, suffix='...'） |

### 5. 锁超时（1 处）

| 来源 ID | 位置 | 当前 | 修复 |
|---------|------|------|------|
| STA-016 | `server/src/services/novel/novelCorePipelineService.ts:58-62` | busy-wait `while (locks.has(key)) { await sleep(50) }` 无超时 | 添加 `START_LOCK_TIMEOUT_MS = 30000` 常量 + 指数退避（50→100→200），超时抛错 |

## 验收标准

- [ ] `DEFAULT_SAFE_STRUCTURED_MAX_TOKENS` 常量定义，9 处重复替换为引用
- [ ] `PIPELINE_POLL_INTERVAL_MS` 常量定义并引用
- [ ] 断路器阈值对象添加环境变量 fallback 注释
- [ ] novelCoreShared ruleScore() 中所有魔法数字替换为命名常量
- [ ] shared 包中 compactText/truncateText 统一函数存在，无新增循环依赖
- [ ] `START_LOCK_TIMEOUT_MS` + 超时抛错逻辑
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] `pnpm --filter @ai-novel/shared build` 通过

## 不纳入

- 31 处 compactText/truncateText 调用点的全量重构（仅创建统一函数 + 验证无循环依赖，调用的逐一替换留给后续迭代）
- 环境变量读取方式的统一（另有任务包覆盖 QUA-030）
