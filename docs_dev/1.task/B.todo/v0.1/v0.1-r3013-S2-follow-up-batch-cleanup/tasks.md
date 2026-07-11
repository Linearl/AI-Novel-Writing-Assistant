---
description: "REQ-3013 导演跟进任务列表全选与批量清理 — 任务拆解"
---

# REQ-3013 任务拆解

## 阶段一：全选功能

- [x] **T1.1** 列表面板增加表头全选 checkbox
  - 文件：`client/src/pages/autoDirectorFollowUps/components/AutoDirectorFollowUpList.tsx`
  - 验证：表头有 checkbox，点击可全选/取消当前页
- [x] **T1.2** 全选状态管理（已选 N / 共 M 项）
  - 文件：`client/src/pages/autoDirectorFollowUps/AutoDirectorFollowUpCenterPage.tsx`
  - 验证：全选后批量栏显示正确数量

## 阶段二：批量归档

- [x] **T2.1** 批量操作栏增加"批量归档"按钮
  - 文件：`client/src/pages/autoDirectorFollowUps/components/AutoDirectorFollowUpBatchBar.tsx`
  - 验证：按钮仅在所选任务全为终态时可点击
- [x] **T2.2** 调用 batch-archive API 并处理结果
  - 文件：`client/src/pages/autoDirectorFollowUps/AutoDirectorFollowUpCenterPage.tsx`
  - API：`POST /api/tasks/batch-archive`（已有）
  - 验证：归档成功后列表刷新，toast 提示

## 阶段三：验证

- [x] **T3.1** `pnpm typecheck` 通过
- [ ] **T3.2** 手动验证：全选 → 批量归档 → 列表清空
