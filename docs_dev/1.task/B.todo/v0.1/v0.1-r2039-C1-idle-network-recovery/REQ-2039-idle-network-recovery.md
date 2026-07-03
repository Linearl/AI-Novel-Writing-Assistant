---
description: "REQ-2039 闲置后页面报错自动恢复"
id: REQ-2039
title: 闲置后网络连接自动恢复
version: 0.1
status: requirements_ready
priority: p2
complexity: simple
created: 2026-07-03
updated: 2026-07-03
tags:
  - resilience
  - react-query
  - network
---

# REQ-2039: 闲置后网络连接自动恢复

## 问题背景

长时间闲置（5+ 分钟）后返回页面，TCP 连接已被 OS 回收，请求失败显示"网络连接失败"红色 toast 且永不消失，用户必须手动刷新页面。

## 根因

1. `refetchOnWindowFocus: false` — 返回 tab 时不自动刷新
2. `retry: 1` — 只重试一次，连接池恢复需要时间
3. Vite dev proxy 无 keepalive 配置
4. 错误 toast `duration: Infinity`，永不自动消失

## 目标

闲置后返回页面时自动恢复连接，无需手动刷新。

## 验收条件

| ID | 条件 | 优先级 |
|---|---|---|
| AC-1 | 返回 tab 时自动刷新过期数据 | Must |
| AC-2 | 网络错误自动重试 2-3 次 | Must |
| AC-3 | 错误 toast 5 秒后自动消失 | Should |
| AC-4 | Vite proxy 配置 keepalive timeout | Could |
