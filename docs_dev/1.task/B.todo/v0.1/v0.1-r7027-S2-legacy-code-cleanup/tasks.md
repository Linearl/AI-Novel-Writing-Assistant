---
description: "REQ-7027 遗留代码清理 — 任务拆解"
---

# REQ-7027 任务拆解

> 状态：⏳ 进行中

## 任务概述

### 1. 来源

架构诊断报告 2026-07-10 第10条发现。Chat 功能已被 Creative Hub 取代但遗留代码仍在。

### 2. 问题

`client/src/store/chatStore.ts`（168行）、`client/src/api/chat.ts`、`server/src/routes/chat.ts` 占用维护心智成本，`vite-plugin-pages` 未被使用但仍列为依赖。

### 3. 需求

移除 Chat 遗留代码及未使用依赖，typecheck 全绿。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 审计全仓 import 引用 | P0 | 30min | ⬜ 待开始 |
| T2 | 移除 client/src/store/chatStore.ts | P0 | 15min | ⬜ 待开始 |
| T3 | 移除 client/src/api/chat.ts | P0 | 10min | ⬜ 待开始 |
| T4 | 移除 server/src/routes/chat.ts | P0 | 10min | ⬜ 待开始 |
| T5 | 移除 vite-plugin-pages 依赖 | P1 | 10min | ⬜ 待开始 |
| T6 | 全量验证 | P0 | 15min | ⬜ 待开始 |

---

## 逐项展开

### T1: 审计全仓 import 引用

**目标**: 确认移除目标文件前的所有引用关系。

**检查项**:
- `grep "chatStore"` 全仓搜索
- `grep "from.*chat"` 搜索 API + route 引用
- `grep "vite-plugin-pages"` 搜索引用

---

### T2: 移除 client/src/store/chatStore.ts

**目标**: 删除 chatStore.ts 文件及 IndexedDB 清理逻辑。

**改动点**:
- `client/src/store/chatStore.ts` — 删除文件
- 移除所有 `import ... from "chatStore"` 引用
- 确认 IndexedDB 清理逻辑不涉及其他模块

---

### T3: 移除 client/src/api/chat.ts

**目标**: 删除 chat API 文件。

**改动点**:
- `client/src/api/chat.ts` — 删除文件
- 移除所有 `import ... from "@/api/chat"` 引用

---

### T4: 移除 server/src/routes/chat.ts

**目标**: 删除 chat 路由文件及注册代码。

**改动点**:
- `server/src/routes/chat.ts` — 删除文件
- `server/src/app.ts` — 移除 chat 路由注册

---

### T5: 移除 vite-plugin-pages 依赖

**目标**: 从 client/package.json 移除未使用的依赖。

**改动点**:
- `client/package.json` — 移除 `vite-plugin-pages`
- `pnpm install` — 更新 lock 文件

---

### T6: 全量验证

**目标**: typecheck + test + build 全部通过。

**改动点**:
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

---

## DoD

- Chat 遗留文件全部删除
- `vite-plugin-pages` 依赖已移除
- typecheck + test + build 通过
- 无残留 import 引用

---

## 验证步骤

1. `pnpm typecheck` — 零错误
2. `pnpm test` — 全量通过
3. `pnpm build` — 构建成功

---

## 完成判定

- T1~T6 全部完成且 DoD 全部满足后，REQ-7027 达到"已完成"状态。
