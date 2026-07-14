---
description: "QUA-022 任务拆解"
---

# REQ-7037 任务拆解

- [x] **T1** 创建 `directorRuntime/index.ts` barrel + 新建 3 个子文件骨架
- [x] **T2** 迁移 `directorRuntimeProjection`（~250 行，行 372-610）
- [x] **T3** 迁移 `directorRuntimeAutomation`（~200 行，行 616-750）
- [x] **T4** 迁移 `directorRuntimeWorker`（~350 行，行 751-1275）
- [x] **T5** barrel 导出全部 103 导出，验证旧 import 路径可用
- [x] **T6** `pnpm --filter @ai-novel/shared build`
- [x] **T7** `pnpm typecheck` + `pnpm test`
