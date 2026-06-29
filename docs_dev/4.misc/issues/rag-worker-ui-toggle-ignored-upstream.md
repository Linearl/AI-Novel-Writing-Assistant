# RAG Worker 无法通过 UI 设置页动态启停（上游原版问题）

**状态**: 已在本项目修复 | 上游原版存在相同问题
**影响版本**: AI-Novel-Writing-Assistant-main (原版)
**严重程度**: 高 — RAG 索引功能在 UI 配置后完全不可用

## 问题描述

用户在 UI 设置页配置 Embedding 提供商（如 Ollama + bge-m3）并开启 RAG 开关后，点击"保存并重建索引"，索引作业始终停留在 `queued` 状态，无法被 Worker 拾取。

## 根因分析

### 原版代码（存在问题）

**server/src/config/rag.ts:77-78**
```typescript
export const ragConfig = {
  enabled: isEnabled(process.env.RAG_ENABLED, true), // ← 静态常量，启动时固化
};
```

**server/src/services/rag/RagWorker.ts:37-40**
```typescript
start(): void {
  if (!ragConfig.enabled || this.timer) {  // ← 永远读启动时的值
    return;
  }
  // ... 启动轮询
}
```

### 问题机制

1. `ragConfig.enabled` 在服务启动时从 `RAG_ENABLED` 环境变量一次性读取，之后不再更新
2. UI 设置页保存 RAG 配置时，虽然会将 `rag.enabled` 写入 `AppSetting` 表并调用 `ragWorker.start()`
3. 但 `start()` 内部仍检查 `ragConfig.enabled`（env 变量），导致调用被静默忽略

**结果**：当 `.env` 中 `RAG_ENABLED=false` 时，无论用户在 UI 如何切换 RAG 开关，Worker 永远不会启动。

## 复现步骤

1. `server/.env` 设置 `RAG_ENABLED=false`
2. 启动服务
3. 进入 UI 设置页，配置 Embedding 提供商，开启 RAG 开关，保存
4. 导入知识文档或触发重建索引
5. 作业始终为 `queued`，Worker 未启动

## 原版修复建议

将 `RagWorker.start()` 改为异步方法，移除对静态 `ragConfig.enabled` 的依赖：

```typescript
// RagWorker.ts — 建议修复
async start(enabled?: boolean): Promise<void> {
  if (this.timer) return;
  const shouldStart = enabled ?? (await getRagRuntimeSettings()).enabled;
  if (!shouldStart) return;
  // ... 启动轮询
}
```

## 本项目修复记录

本项目已在以下提交中修复此问题：
- `fix(RAG): RagWorker 启动守卫改为读取运行时配置`

变更文件：
- `server/src/services/rag/RagWorker.ts` — 核心修复
- `server/src/app.ts` — 启动调用适配 async
- `server/src/routes/settings.ts` — 保存路由传入显式 enabled 值

## 影响范围

- 所有使用 `RAG_ENABLED=false` 启动且依赖 UI 动态开启 RAG 的场景
- Docker 部署中通过环境变量禁用 RAG 但希望通过 UI 启用的用户
