---
description: "REQ-7025 Desktop 包测试基础设施 — 原始冻结副本"
---

# REQ-7025 Desktop 包测试基础设施（原始冻结副本）

> 本文件为需求创建时的冻结快照，禁止手动编辑。

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7025 |
| 优先级 | P1 |
| 来源 | 架构诊断报告 2026-07-10 第8条发现 |
| 关联需求 | 无 |

---

## 核心目标

1. 拆分 `main.ts` 的可测试逻辑到独立模块（IPC 处理器、窗口管理、启动序列各提取为独立函数）
2. 为 `runtime/server.ts` 添加单元测试（健康检查、端口分配、进程生命周期）
3. 为 `runtime/state.ts`（SnapshotStore）添加单元测试
4. 为 `runtime/updater.ts` 添加测试（mock `electron-updater`）
5. 为 `stage-desktop.cjs` 打包脚本添加集成测试

## 测试框架

Node.js 内置 test runner（`node:test` + `node:assert`），与 server 包一致。

## 受影响文件

| 文件 | 行数 | 操作 |
|------|------|------|
| `desktop/src/main.ts` | 597 | 拆分可测试逻辑 |
| `desktop/src/runtime/server.ts` | 316 | 添加测试 |
| `desktop/src/runtime/state.ts` | — | 添加测试 |
| `desktop/src/runtime/updater.ts` | 215 | 添加测试 |
| `desktop/src/runtime/dataImport.ts` | ~400 | 添加测试 |
| `desktop/scripts/stage-desktop.cjs` | 240 | 添加集成测试 |

---

## 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-10 | 创建 | 冻结副本 |
