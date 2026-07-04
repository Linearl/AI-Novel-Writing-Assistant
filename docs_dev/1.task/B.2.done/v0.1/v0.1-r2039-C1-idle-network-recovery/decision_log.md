---
description: "REQ-2039 网络连接自动恢复 决策留痕"
update_time: 2026-07-03
---

# REQ-2039 决策日志

## D1: 采用 refetchOnWindowFocus 而非自定义网络检测

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-03 |
| 决策人 | AI |
| 决策 | 启用 React Query 内置的 `refetchOnWindowFocus` 而非自定义网络检测组件 |
| 原因 | `refetchOnWindowFocus` 是 React Query 原生能力，零代码量、零依赖，覆盖"返回 tab 时数据过期"场景。自定义网络检测（如 navigator.onLine + 定时 ping）实现复杂且收益有限。 |
| 影响 | 全局 QueryClient 配置变更，所有 query 受益 |
| 备选方案 | 自定义 `useNetworkStatus` hook + 手动 refetch — 需要额外组件和状态管理，且不能自动触发 query refetch |
