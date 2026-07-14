---
description: "REQ-7066 artifactSyncMode 前端选择器 — 任务清单"
update_time: 2026-07-14
---

## 阶段零：准备

- [x] 需求文档完成
- [x] 任务清单完成
- [x] 决策日志完成

## 阶段一：实现

- [ ] **Task 1.1** — 在导演配置或章节设置页面添加 artifactSyncMode 选择器组件（下拉或 RadioGroup）
- [ ] **Task 1.2** — 连接 API：读取当前 artifactSyncMode 值，选择后写入
- [ ] **Task 1.3** — 类型检查 + 客户端测试通过

## 阶段二：验收

- [ ] 选择器正确渲染三个模式
- [ ] 默认值 `adaptive`
- [ ] 选择保存 + 刷新保持
- [ ] `pnpm typecheck` + `pnpm test:client` 通过
