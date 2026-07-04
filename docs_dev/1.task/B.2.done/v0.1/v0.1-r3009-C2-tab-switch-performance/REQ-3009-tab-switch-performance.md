---
description: "REQ-3009 Tab 切换性能优化"
id: REQ-3009
title: Tab 切换性能优化
version: 0.1
status: done
priority: p3
complexity: medium
created: 2026-07-03
updated: 2026-07-03
tags:
  - performance
  - react
  - frontend
---

# REQ-3009: Tab 切换性能优化

## 问题背景

NovelEdit 页面 Tab 切换响应慢，原因：组件过于庞大（30+ state、20+ query）、条件查询 staleTime=0 导致每次切换都重新请求、auto-director 激活时级联失效 15 个 query。

## 根因

1. NovelEdit 组件单体过大，切换 tab 时所有 hook 重新执行
2. 条件查询 `staleTime` 默认为 0，每次激活都 refetch
3. `syncNovelWorkflowStageSilently` 每次 tab 切换都调用
4. `invalidateNovelDetail` 一次失效 15 个 query key

## 目标

Tab 切换响应时间从明显延迟降至无感知。

## 验收条件

| ID | 条件 | 优先级 |
|---|---|---|
| AC-1 | 条件查询设置 staleTime 避免重复请求 | Must |
| AC-2 | workflow stage sync 添加防抖 | Should |
| AC-3 | invalidateNovelDetail 精细化（只失效相关 tab 的 query） | Should |
