---
description: "REQ-2006 任务拆解"
---

# REQ-2006 任务拆解

> 最后更新：2026-06-26T22:50:00+08:00

---

## 阶段一：服务端修复

- [ ] 1.1 修改 `DirectorDashboardViewBuilder.buildActions()` 的 `failed` 分支，增加 `retry` primary action 和保留 `resume_from_checkpoint` secondary action

## 阶段二：客户端修复

- [ ] 2.1 `NovelAutoDirectorProgressPanel` 新增 `onRetry` / `onRetryWithResume` props
- [ ] 2.2 `resolveDashboardAction()` 新增 `retry` case，映射到 `onRetry`
- [ ] 2.3 `resolveDashboardAction()` 将 `resume_from_checkpoint` 从 `onOpenTaskCenter` 改为 `onRetryWithResume`
- [ ] 2.4 `NovelEdit.tsx` 将 retry mutations 传递到 progress panel props

## 阶段三：验证

- [ ] 3.1 类型检查：`pnpm typecheck`
- [ ] 3.2 手动验证：模拟 failed 状态，确认面板显示重试按钮
- [ ] 3.3 手动验证：点击重试后任务恢复为 running
- [ ] 3.4 手动验证：TaskDrawer 重试按钮仍可用
