---
description: "REQ-7027 遗留代码清理"
---

# REQ-7027 遗留代码清理

> 状态：⏳ 进行中

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7027 |
| 优先级 | P0 |
| 来源 | 架构诊断报告 2026-07-10 第10条发现 |
| 关联需求 | 无 |

---

## 1. 背景与问题

Chat 功能已被 Creative Hub 取代（`/chat` → `/creative-hub` 301 重定向），但以下遗留文件仍存在于代码库中：

| 文件 | 行数 | 说明 |
|------|------|------|
| `client/src/store/chatStore.ts` | 168 | Chat 状态管理 + IndexedDB 清理逻辑 |
| `client/src/api/chat.ts` | — | Chat API 请求层 |
| `server/src/routes/chat.ts` | — | Chat 路由定义 |

此外，`vite-plugin-pages` 在 `client/package.json` devDependencies 中，但 `vite.config.ts` 从未引用该插件。

不改的后果：遗留代码占用维护心智成本，新人可能误用已废弃的 Chat API，依赖清单不准确。

---

## 2. 目标与范围

### 2.1 目标

1. 移除 `client/src/store/chatStore.ts` 及关联的 IndexedDB 清理逻辑
2. 移除 `client/src/api/chat.ts`
3. 移除 `server/src/routes/chat.ts`
4. 移除 `client/package.json` 中的 `vite-plugin-pages` 依赖
5. 审计确保无残留 import（typecheck 全绿）

### 2.2 In Scope

**后端**：
- `server/src/routes/chat.ts` — 删除文件
- `server/src/app.ts` — 移除 chat 路由注册（如有）

**前端**：
- `client/src/store/chatStore.ts` — 删除文件及 IndexedDB 清理逻辑
- `client/src/api/chat.ts` — 删除文件
- `client/package.json` — 移除 `vite-plugin-pages` 依赖

### 2.3 Out of Scope

- Creative Hub 功能本身（不修改）
- 其他未使用依赖的审计（不在本次范围）
- 路由重定向逻辑（`/chat` → `/creative-hub` 保留）

---

## 3. 需求详情

### 3.1 移除 chatStore.ts

WHEN 移除 `client/src/store/chatStore.ts`，THE SYSTEM SHALL 审计并移除所有引用该 store 的 import 语句，确保 typecheck 零错误。

### 3.2 移除 chat API

WHEN 移除 `client/src/api/chat.ts`，THE SYSTEM SHALL 确保无其他模块依赖该 API 文件。

### 3.3 移除 chat route

WHEN 移除 `server/src/routes/chat.ts`，THE SYSTEM SHALL 同时移除 `app.ts` 中的路由注册代码。

### 3.4 移除未使用依赖

WHEN 移除 `vite-plugin-pages` 依赖，THE SYSTEM SHALL 重新执行 `pnpm install` 更新 lock 文件。

---

## 4. 验收标准

- [ ] `client/src/store/chatStore.ts` 已删除，无残留 import
- [ ] `client/src/api/chat.ts` 已删除
- [ ] `server/src/routes/chat.ts` 已删除
- [ ] `client/package.json` 中 `vite-plugin-pages` 已移除
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] `pnpm build` 通过

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| IndexedDB 清理逻辑误删 | 确认 chatStore 中 IndexedDB 逻辑仅用于 chat，不影响其他模块 |
| vite-plugin-pages 被间接依赖 | 检查 lock 文件确认无其他包依赖它 |
| 其他文件引用 chat store | grep 全仓搜索 import 引用后再删除 |

---

## 6. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-10 | 创建 | 基于架构诊断报告生成需求文档 |
