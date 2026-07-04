---
description: "REQ-2039 网络连接自动恢复 方案设计"
update_time: 2026-07-03
---

# REQ-2039 方案设计

## 1. 方案概述

通过三项配置调整解决闲置后网络连接失效问题：启用 React Query 的 `refetchOnWindowFocus`、增加重试次数、配置 Vite proxy keepalive。

### 1.1 设计目标

1. 用户返回 tab 时自动刷新过期数据，无需手动刷新
2. 网络错误时自动重试，利用指数退避等待连接池恢复
3. 错误 toast 自动消失，不再占用屏幕空间

### 1.2 关键决策

1. **refetchOnWindowFocus 设为 true**：返回 tab 时自动触发 stale query 的 refetch，最直接的恢复路径
2. **retry 增加到 3 次**：TCP 连接恢复需要时间，3 次重试配合指数退避可覆盖 95% 场景
3. **错误 toast 5 秒消失**：平衡用户感知与信息完整性

### 1.3 不在范围

- Service Worker 离线缓存
- WebSocket 自动重连
- 自定义网络状态检测组件

## 2. 实现细节

### 2.1 React Query 全局配置

修改 `client/src/` 中的 QueryClient 初始化：

```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 30_000,
    },
  },
})
```

### 2.2 错误 Toast 持续时间

将错误 toast 的 `duration` 从 `Infinity` 改为 5000ms。

### 2.3 Vite Proxy Keepalive

在 `vite.config.ts` 的 proxy 配置中添加 keepalive 参数：

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    timeout: 60000,
    proxyTimeout: 60000,
  }
}
```

## 3. 验证策略

1. 手动测试：打开页面 → 等待 5+ 分钟 → 返回 tab → 确认数据自动刷新
2. 错误 toast：触发网络错误 → 确认 5 秒后 toast 消失
3. 重试验证：断开网络 → 恢复 → 确认自动重试成功
