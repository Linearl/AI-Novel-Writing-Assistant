---
description: "REQ-7034 Novel Application Services 门面收缩 — 任务拆解"
---

# REQ-7034 任务拆解

> 状态：⏳ 进行中

## 任务概述

### 1. 来源

架构诊断报告 2026-07-10 第13条发现。NovelApplicationServices.ts 694 行 ~90% 纯委托，门面无杠杆。

### 2. 问题

130 方法接口中约 117 个是纯委托（1 行 `return this.subService.method(params)`），删除门面后调用者直接持有子服务引用不会增加复杂性。

### 3. 需求

方法分类 → 门面收缩 → 调用方更新 → 验证。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 130 方法全量审计分类 | P0 | 1.5h | ⬜ 待开始 |
| T2 | 审计所有调用方引用 | P0 | 30min | ⬜ 待开始 |
| T3 | 收缩接口定义（NovelApplicationContracts.ts） | P1 | 30min | ⬜ 待开始 |
| T4 | 收缩门面实现（NovelApplicationServices.ts） | P1 | 30min | ⬜ 待开始 |
| T5 | 更新路由注册调用方 | P1 | 1h | ⬜ 待开始 |
| T6 | 更新其他调用方 | P1 | 1h | ⬜ 待开始 |
| T7 | 全量验证 | P0 | 30min | ⬜ 待开始 |

---

## 逐项展开

### T1: 130 方法全量审计分类

**目标**: 逐方法检查 `NovelApplicationContracts.ts` 和 `NovelApplicationServices.ts`，分类为纯委托 / 协调方法。

**检查项**:
- 方法体是否仅 1 行 `return this.subService.method(...)`
- 方法体是否包含条件判断、循环、try-catch
- 方法体是否涉及 2+ 子服务调用
- 方法体是否包含数据转换/聚合

**产物**: 分类表（方法名 + 分类 + 对应子服务）

---

### T2: 审计所有调用方引用

**目标**: grep 全仓搜索 `NovelApplicationServices` 的所有 import 和使用点。

**检查项**:
- `grep "NovelApplicationServices"` 全仓搜索
- 每个调用方调用了哪些方法
- 调用方是否已有子服务注入

---

### T3: 收缩接口定义

**目标**: 从 `NovelApplicationContracts.ts` 中移除纯委托方法的类型声明。

**改动点**:
- `server/src/services/novel/NovelApplicationContracts.ts` — 保留协调方法的接口定义，删除纯委托方法签名

---

### T4: 收缩门面实现

**目标**: 从 `NovelApplicationServices.ts` 中移除纯委托方法实现。

**改动点**:
- `server/src/services/novel/NovelApplicationServices.ts` — 保留协调方法实现，删除纯委托方法
- 目标 <200 行

---

### T5: 更新路由注册调用方

**目标**: 将 `novelRouteRegistration.ts` 中的纯委托调用改为直接使用子服务。

**改动点**:
- `server/src/routes/novelRouteRegistration.ts` — 注入所需子服务，直接调用

---

### T6: 更新其他调用方

**目标**: 更新除路由注册外的所有调用方。

**改动点**:
- 搜索 `NovelApplicationServices` 的所有 import 点
- 逐文件将纯委托调用改为子服务直接调用
- 协调方法调用保持不变

---

### T7: 全量验证

**目标**: typecheck + test 全部通过。

**改动点**:
- `pnpm typecheck`
- `pnpm test`
- 手动验证核心 novel 流程（创建小说、生成章节等）功能正常

---

## DoD

- 130 方法全量分类完成
- 纯委托方法已从接口和实现中移除
- 所有调用方已更新
- NovelApplicationServices.ts <200 行
- typecheck + test 通过

---

## 验证步骤

1. `pnpm typecheck` — 零错误
2. `pnpm test` — 全量通过
3. `pnpm dev` — 启动后手动验证创建小说、生成章节流程

---

## 完成判定

- T1~T7 全部完成且 DoD 全部满足后，REQ-7034 达到"已完成"状态。
