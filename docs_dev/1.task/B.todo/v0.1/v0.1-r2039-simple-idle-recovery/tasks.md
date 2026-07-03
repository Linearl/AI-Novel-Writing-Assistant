---
description: "REQ-2039 闲置恢复任务拆解"
---

# 任务清单

## T1. React Query 全局配置优化

- `refetchOnWindowFocus` 改为 `true`
- `retry` 改为 3（指数退避）
- 关键查询设置 `staleTime: 30_000`
- **DoD**: typecheck 通过

## T2. 错误 toast 自动消失

- 错误 toast `duration` 从 `Infinity` 改为 5000ms
- 500 错误保持 4000ms（已有）
- **DoD**: toast 自动消失

## T3. Vite proxy keepalive 配置

- 添加 `timeout` 和 `proxyTimeout` 配置
- **DoD**: 闲置后 proxy 不断连

## 依赖关系

```
T1 → T2 → T3（串行，互不依赖可并行）
```
