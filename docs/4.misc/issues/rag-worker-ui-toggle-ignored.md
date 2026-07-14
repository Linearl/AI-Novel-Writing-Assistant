# RAG Worker 无法通过 UI 设置页动态启停

**状态**: 已修复 (local) | 待提交 upstream
**影响版本**: 当前 main 分支
**严重程度**: 高 — RAG 索引功能在 UI 配置后完全不可用

## 问题描述

用户在 UI 设置页配置 Embedding 提供商（Ollama + bge-m3）并开启 RAG 开关后，点击"保存并重建索引"，索引作业始终停留在 `queued` 状态，无法被 Worker 拾取。

## 根因

`RagWorker.start()` 的启动守卫读取的是**模块级静态常量** `ragConfig.enabled`，该值在服务启动时从 `RAG_ENABLED` 环境变量一次性读取，之后不再更新：

```typescript
// config/rag.ts — 启动时固化
export const ragConfig = {
  enabled: isEnabled(process.env.RAG_ENABLED, true), // ← 静态常量
};

// RagWorker.ts — 守卫条件
start(): void {
  if (!ragConfig.enabled || this.timer) {  // ← 永远读启动时的值
    return;
  }
}
```

而 UI 设置页的保存路径虽然会将 `rag.enabled` 写入 `AppSetting` 表并调用 `ragWorker.start()`，但 `start()` 内部仍检查 `ragConfig.enabled`（env 变量），导致调用被静默忽略。

**结果**：当 `.env` 中 `RAG_ENABLED=false` 时，无论用户在 UI 如何切换 RAG 开关，Worker 永远不会启动。

## 复现步骤

1. `server/.env` 设置 `RAG_ENABLED=false`
2. 启动服务
3. 进入 UI 设置页，配置 Embedding 提供商，开启 RAG 开关，保存
4. 导入知识文档或触发重建索引
5. 作业始终为 `queued`，Worker 未启动

## 修复方案

将 `RagWorker.start()` 改为异步方法，移除对静态 `ragConfig.enabled` 的依赖：

- **无参调用**（启动时）：从 `AppSetting` 表读取 `rag.enabled` 运行时配置
- **有参调用**（设置保存后）：由调用方传入显式 `enabled` 值

```typescript
// RagWorker.ts — 修复后
async start(enabled?: boolean): Promise<void> {
  if (this.timer) return;
  const shouldStart = enabled ?? (await getRagRuntimeSettings()).enabled;
  if (!shouldStart) return;
  // ... 启动轮询
}
```

## 变更文件

- `server/src/services/rag/RagWorker.ts` — 核心修复
- `server/src/app.ts` — 启动调用适配 async
- `server/src/routes/settings.ts` — 保存路由传入显式 enabled 值
