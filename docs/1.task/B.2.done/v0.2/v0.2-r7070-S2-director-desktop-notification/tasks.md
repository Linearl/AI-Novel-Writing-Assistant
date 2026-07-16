---
reqId: 7070
title: "桌面通知系统"
status: in_progress
priority: P2
complexity: S2
estimatedEffort: "0.7天"
version: v0.2
created: 2026-07-16
---

# REQ-7070: 桌面通知系统 — 任务清单

## 阶段零：需求就绪

- [x] 需求文档完成
- [x] 任务清单完成

## 阶段一：通知管理器实现

- [x] T1: 分析上游 `autoDirectorPauseNotifications.ts` 实现（0.1 天）
- [x] T2: 实现 `AutoDirectorPauseNotificationManager` 类 — 权限请求 + 通知发送（0.15 天）
- [x] T3: 实现 15 秒轮询 + 状态变化检测逻辑（0.15 天）
- [x] T4: 实现 visibilitychange 频率调整（页面不可见时降频）（0.1 天）
- [x] T5: 降级处理：Notification API 不可用时使用 toast（0.05 天）

## 阶段二：集成与验收

- [x] T6: 集成到 NovelEdit 页（复用现有 `activeAutoDirectorTaskQuery`）（0.05 天）
- [ ] T7: 验收：模拟导演任务状态变化验证通知触发（0.1 天）

## 阶段三：收尾

- [x] T8: typecheck 通过
- [ ] T9: 更新 README + run_result 状态
- [ ] T10: 提交

## 完成标准

- [x] 浏览器通知权限授予后可弹出通知
- [x] 不支持 Notification API 时降级为 toast
- [x] 页面隐藏时轮询频率降低
- [x] typecheck 通过
