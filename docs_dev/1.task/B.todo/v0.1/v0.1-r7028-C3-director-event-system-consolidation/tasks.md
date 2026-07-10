---
description: "REQ-7028 Director 事件系统收敛 — 任务拆解"
---

# REQ-7028 任务拆解

> 状态：⏳ 进行中

## 任务概述

### 1. 来源

架构诊断报告 2026-07-10 第11条发现。Director 子系统两套事件系统并行，state 文件重复，takeover 文件分散。

### 2. 问题

124 文件 Director 子系统内 EventBus 与 DirectorEventProjection 无桥接，State 文件双版本，takeover 9 文件分散。

### 3. 需求

职责分工明确化 → state 去重 → takeover 收敛 → 统一事件出口。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 事件系统职责映射与文档化 | P0 | 1h | ⬜ 待开始 |
| T2 | 审计 State 文件引用关系 | P0 | 30min | ⬜ 待开始 |
| T3 | State 文件去重（根目录旧版→state/） | P0 | 1h | ⬜ 待开始 |
| T4 | 审计 takeover 文件依赖关系 | P0 | 30min | ⬜ 待开始 |
| T5 | Takeover 9→4 文件收敛 | P1 | 2h | ⬜ 待开始 |
| T6 | 建立 DirectorEventBridge | P1 | 1h | ⬜ 待开始 |
| T7 | DirectorEventProjectionHelpers.ts 收敛 | P1 | 1h | ⬜ 待开始 |
| T8 | 全量验证 | P0 | 30min | ⬜ 待开始 |

---

## 逐项展开

### T1: 事件系统职责映射与文档化

**目标**: 在 EventBus 和 DirectorEventProjectionService 的接口文件中添加明确的职责文档注释。

**改动点**:
- `server/src/events/EventBus.ts` — 添加 JSDoc："跨模块事件广播，不用于 Director 内部状态持久化"
- `server/src/services/novel/director/DirectorEventProjectionService.ts` — 添加 JSDoc："Director 内部状态投影，不用于跨模块广播"

---

### T2: 审计 State 文件引用关系

**目标**: grep 全仓搜索 `StateStore`、`StateCommitter`、`StateReader` 的 import 路径。

**检查项**:
- 根目录版本的所有 import 方
- `director/state/` 版本的所有 import 方
- 两份版本的功能差异对比

---

### T3: State 文件去重

**目标**: 将根目录 State 文件的调用方迁移到 `director/state/`，删除根目录旧版本。

**改动点**:
- 迁移所有 `import ... from "../StateStore"` → `import ... from "./state/StateStore"`
- 迁移所有 `import ... from "../StateCommitter"` → `import ... from "./state/StateCommitter"`
- 迁移所有 `import ... from "../StateReader"` → `import ... from "./state/StateReader"`
- 删除根目录 `StateStore.ts`、`StateCommitter.ts`、`StateReader.ts`

---

### T4: 审计 takeover 文件依赖关系

**目标**: 绘制 9 个 takeover 文件的依赖图和功能聚类。

**检查项**:
- 各文件的功能职责
- 文件间的 import 关系
- 聚类方案（读/写/校验/入口）

---

### T5: Takeover 9→4 文件收敛

**目标**: 按功能聚类合并 takeover 文件。

**改动点**:
- `takeover-read.ts` — 合并读取类逻辑
- `takeover-write.ts` — 合并写入类逻辑
- `takeover-validate.ts` — 合并校验逻辑
- `takeover-index.ts` — 统一 facade
- 更新所有调用方 import

---

### T6: 建立 DirectorEventBridge

**目标**: 创建 EventBus 与 DirectorEventProjection 之间的桥接层。

**改动点**:
- 新建 `server/src/services/novel/director/DirectorEventBridge.ts`
- 定义 Director 内部事件到全局事件的映射规则
- Director 内部通过 Bridge 发出事件，Bridge 决定是否升级为 EventBus 全局事件

---

### T7: DirectorEventProjectionHelpers.ts 收敛

**目标**: 581 行的 Helpers 文件按职责拆分或精简。

**改动点**:
- 将纯工具函数提取到独立 utility 文件
- 将与 Projection 紧耦合的逻辑保留在 ProjectionService 内

---

### T8: 全量验证

**目标**: typecheck + test + director 专项测试全部通过。

**改动点**:
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter @ai-novel/server test:director`（如有）

---

## DoD

- EventBus / DirectorEventProjection 职责边界文档化
- State 根目录文件已删除，所有引用指向 `director/state/`
- Takeover 文件从 9 个减少到 4 个
- DirectorEventBridge 建立并可工作
- typecheck + test 通过

---

## 验证步骤

1. `pnpm typecheck` — 零错误
2. `pnpm test` — 全量通过
3. `pnpm --filter @ai-novel/server test:director` — 专项通过
4. grep 确认无残留对根目录 State 文件的引用

---

## 完成判定

- T1~T8 全部完成且 DoD 全部满足后，REQ-7028 达到"已完成"状态。
