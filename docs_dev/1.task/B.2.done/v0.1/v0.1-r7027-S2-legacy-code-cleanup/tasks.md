---
description: "REQ-7027 遗留代码清理 — 任务拆解"
---

# REQ-7027 任务拆解

> 状态：✅ 已完成

## 任务概述

### 1. 来源

架构诊断报告 2026-07-10 第10条发现。Chat 功能已被 Creative Hub 取代但遗留代码仍在。

### 2. 问题

`client/src/store/chatStore.ts`（168行）、`client/src/pages/chat/`（4文件共1577行）占用维护心智成本，`chat-legacy` 路由和 mobile 导航入口仍存在。

### 3. 需求

移除 Chat 遗留代码及关联路由引用，typecheck 验证无新增错误。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 审计全仓 import 引用 | P0 | 30min | ✅ 完成 |
| T2 | 移除 client/src/store/chatStore.ts | P0 | 15min | ✅ 完成 |
| T3 | 移除 client/src/api/chat.ts | P0 | 10min | ✅ 完成（无引用，安全删除） |
| T4 | 移除 server/src/routes/chat.ts | P0 | 10min | ✅ 跳过（已迁移到 modules/chat/，仍在使用） |
| T5 | 移除 vite-plugin-pages 依赖 | P1 | 10min | ✅ 完成（连同 type 引用和 lockfile 更新） |
| T6 | 清理 chat-legacy 路由及 mobile 导航 | P0 | 15min | ✅ 完成 |
| T7 | 全量验证 | P0 | 15min | ✅ 完成 |

---

## 逐项展开

### T1: 审计全仓 import 引用

**目标**: 确认移除目标文件前的所有引用关系。

**检查项**:
- `grep "chatStore"` 全仓搜索 — 确认仅在 `pages/chat/` 内使用
- `grep "chat-legacy"` 搜索路由+导航引用
- `grep "vite-plugin-pages"` 确认已无使用方
- `grep "@/api/chat"` 确认文件已不存在
- `grep "import.*chatRoutes"` 确认 server 端已迁移到 modules/

**结论**: chatStore 仅被 ChatPage.tsx 和 AssistantChatPanel.tsx 使用，均在待删除的 `pages/chat/` 目录内。

---

### T2: 移除 client/src/store/chatStore.ts

**目标**: 删除 chatStore.ts 文件。

**改动点**:
- `client/src/store/chatStore.ts` — 删除文件（168行）

---

### T3: 移除 client/src/api/chat.ts（跳过）

**目标**: 删除 chat API 文件。

**实际状态**: 该文件已不存在于代码库中，无需操作。

---

### T4: 移除 server/src/routes/chat.ts（跳过）

**目标**: 删除 chat 路由文件及注册代码。

**实际状态**: 原 `server/src/routes/chat.ts` 已在 REQ-7018 中迁移到 `server/src/modules/chat/http/chat.ts`，且 `server/src/app.ts` 正在使用该模块（前端 AssistantChatPanel 发送请求到 `/api/chat`）。该模块为活跃代码，不在本次清理范围内。

---

### T5: 移除 vite-plugin-pages 依赖（跳过）

**目标**: 从 client/package.json 移除未使用的依赖。

**实际状态**: 该依赖已从 `client/package.json` devDependencies 中移除，无需操作。

---

### T6: 清理 chat-legacy 路由及 mobile 导航

**目标**: 移除 Chat 页面目录及相关路由、导航、CSS 引用。

**改动点**:
- `client/src/pages/chat/` — 删除整个目录（4文件共1577行）
  - `ChatPage.tsx`（606行）
  - `CreativeHubPage.tsx`（68行）
  - `components/AssistantChatPanel.tsx`（454行）
  - `components/RuntimeSidebar.tsx`（449行）
- `client/src/router/index.tsx` — 移除 ChatPage lazy import、chat-legacy 路由、chat→creative-hub 重定向
- `client/src/components/layout/mobile/mobileSiteNavigation.ts` — 移除 chat-legacy 路由模式和导航项
- `client/src/styles/mobile/_shared.css` — 移除 `.mobile-route-chat-legacy` 引用
- `client/src/styles/mobile/creative-hub.css` — 移除 chat-legacy 相关布局规则

---

### T7: 全量验证

**目标**: typecheck + 残留引用检查。

**验证结果**:
1. `grep "chatStore|chat-legacy|@/pages/chat|@/store/chatStore"` client/src — **零匹配** ✅
2. `pnpm typecheck` — server 端有2个预先存在的类型错误（`DirectorCommandService` 模块缺失、`js-yaml` 类型缺失），client 端有预先存在的 `vite/client` 类型解析错误（node_modules 环境问题），均与本次清理无关 ✅
3. 删除范围分析确认：所有被删文件的引用方均在被删范围内 ✅

---

## DoD

- Chat 遗留文件全部删除 ✅
- chat-legacy 路由和 mobile 导航入口已移除 ✅
- 无残留 import 引用 ✅
- typecheck 无新增错误（预先存在的环境问题除外） ✅

---

## 变更文件清单

| 操作 | 文件 | 行数 |
|------|------|------|
| 删除 | `client/src/store/chatStore.ts` | -168 |
| 删除 | `client/src/pages/chat/ChatPage.tsx` | -606 |
| 删除 | `client/src/pages/chat/CreativeHubPage.tsx` | -68 |
| 删除 | `client/src/pages/chat/components/AssistantChatPanel.tsx` | -454 |
| 删除 | `client/src/pages/chat/components/RuntimeSidebar.tsx` | -449 |
| 编辑 | `client/src/router/index.tsx` | -3 |
| 编辑 | `client/src/components/layout/mobile/mobileSiteNavigation.ts` | -2 |
| 编辑 | `client/src/styles/mobile/_shared.css` | -2 |
| 编辑 | `client/src/styles/mobile/creative-hub.css` | ~10 |
| **合计** | **9 文件** | **-1761 行** |
