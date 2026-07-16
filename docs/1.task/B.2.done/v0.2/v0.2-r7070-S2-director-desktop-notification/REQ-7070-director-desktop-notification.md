---
description: "REQ-7070 桌面通知系统——需求文档"
---

# REQ-7070 桌面通知系统

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 需求编号 | REQ-7070 |
| 优先级 | P2 |
| 版本 | v0.2 |
| 状态 | requirements_ready |
| 来源 | 上游仓库 `AI-Novel-Writing-Assistant-main` 参考实现 `client/src/lib/autoDirectorPauseNotifications.ts`（114 行） |

---

## 1. 背景与问题

用户在 NovelEdit 页面等待自动导演执行时，需要持续关注页面才能知道进度。切换到其他标签页后会错过状态变更（暂停/恢复/完成/失败），导致导演流水线停滞无人处理。

## 2. 目标与范围

### 2.1 目标

1. 在自动导演任务状态变化时通过浏览器桌面通知提醒用户
2. 页面不可见时自动调整检测频率以减少不必要的轮询

### 2.2 In Scope

- 浏览器 Notification API 权限请求与管理
- 15 秒轮询活跃导演任务状态
- 检测状态变化并触发桌面通知
- visibilitychange 事件处理：页面不可见时降低轮询频率
- 降级方案：浏览器不支持 Notification 时使用页内 toast 通知

### 2.3 Out of Scope

- 服务端 SSE/WebSocket 实时推送
- Electron 原生通知（后续 desktop 包处理）
- 通知的持久化历史记录

---

## 3. 需求详情

- WHEN 自动导演任务状态变化（暂停/恢复/完成/失败）THE SYSTEM SHALL 通过浏览器桌面通知提醒用户
- WHEN 页面不可见（document.hidden = true）THE SYSTEM SHALL 降低轮询频率
- WHEN 页面恢复可见 THE SYSTEM SHALL 恢复 15 秒轮询频率并立即查询一次
- IF 浏览器不支持 Notification API THE SYSTEM SHALL 降级为页内 toast 通知

参考上游 `autoDirectorPauseNotifications.ts`（114 行），实现 `AutoDirectorPauseNotificationManager` 类。

---

## 4. 验收标准

- [ ] 浏览器授予通知权限后，导演任务状态变化时弹出桌面通知
- [ ] 切换到其他标签页后通知正常触发
- [ ] 浏览器不支持 Notification API 时降级为 toast
- [ ] 用户拒绝通知权限后不反复弹窗索要
- [ ] typecheck 通过

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| Browser Notification 兼容性问题 | 降级为页内 toast |
| 轮询增加服务端负载 | 15 秒间隔 + 页面不可见时降频 |

---

## 6. 关联与边界

- 与 REQ-7069（FR-1 创建向导）的关系：需活跃导演任务才可测试，但无代码依赖
- 与 REQ-7071（FR-3 待审提升）的关系：独立，无共享代码
- 依赖：`activeAutoDirectorTaskQuery` 在 NovelEdit 页已存在（4 秒轮询），可复用其查询基础设施

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-16 | 创建 | 从 REQ-7069 拆分 |
