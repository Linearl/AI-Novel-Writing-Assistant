---
description: "REQ-7027 遗留代码清理 — 原始冻结副本"
---

# REQ-7027 遗留代码清理（原始冻结副本）

> ⚠️ 本文件为需求创建时的冻结快照，禁止手动编辑。

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7027 |
| 优先级 | P0 |
| 来源 | 架构诊断报告 2026-07-10 第10条发现 |
| 关联需求 | 无 |

---

## 核心目标

1. 移除 `client/src/store/chatStore.ts` 及关联的 IndexedDB 清理逻辑
2. 移除 `client/src/api/chat.ts`
3. 移除 `server/src/routes/chat.ts`
4. 移除 `client/package.json` 中的 `vite-plugin-pages` 依赖
5. 审计确保无残留 import（typecheck 全绿）

## 待移除文件清单

| 文件 | 行数 | 说明 |
|------|------|------|
| `client/src/store/chatStore.ts` | 168 | Chat 状态管理 + IndexedDB 清理 |
| `client/src/api/chat.ts` | — | Chat API 请求层 |
| `server/src/routes/chat.ts` | — | Chat 路由定义 |
| `client/package.json` | — | 移除 `vite-plugin-pages` 依赖 |

---

## 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-10 | 创建 | 冻结副本 |
