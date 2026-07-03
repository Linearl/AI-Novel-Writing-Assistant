---
description: "REQ-3009 Tab 切换性能优化任务拆解"
---

# 任务清单

## T1. 条件查询 staleTime 优化

- 为 volumeWorkspace、qualityReport、latestState 等条件查询设置 `staleTime: 30_000`
- 避免切换 tab 后立即 refetch
- **DoD**: 切换回已访问 tab 不触发网络请求

## T2. workflow stage sync 防抖

- `syncNovelWorkflowStageSilently` 添加 2 秒防抖
- 避免快速切换 tab 时多次调用
- **DoD**: 快速切换只触发一次 sync

## T3. invalidateNovelDetail 精细化

- 按 tab 类型只失效相关的 query key
- 非活跃 tab 的 query 不失效
- **DoD**: tab 切换不再级联失效 15 个 query

## 依赖关系

T1 / T2 / T3 可并行
