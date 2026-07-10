---
description: "ARCH-004 任务拆解"
---

# REQ-7035 任务拆解

## 阶段一：接口提取
- [x] **T1.1** 分析 `workers/TaskDispatcher.ts` 公开方法，提取为 `IDirectorTaskDispatcher` 接口
  - 文件：`server/src/platform/IDirectorTaskDispatcher.ts`（新建）
- [x] **T1.2** `DirectorCommandService.ts` 改为从接口文件导入
- [x] **T1.3** `workers/` 启动入口注入具体 taskDispatcher 实例

## 阶段二：验证
- [x] **T2.1** grep 确认双向 import 链路已解除
- [x] **T2.2** `pnpm typecheck`（无新增错误，仅预存错误）
- [x] **T2.3** `pnpm test`（受预存构建错误阻断，与本任务无关）
- [ ] **T2.4** 手动验证自动导演流程
