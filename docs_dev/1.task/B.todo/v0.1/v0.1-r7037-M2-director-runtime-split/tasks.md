---
description: "QUA-022 任务拆解"
---

# REQ-7037 任务拆解

- [ ] **T1** 创建 `directorRuntime/index.ts` barrel + 新建 3 个子文件骨架
- [ ] **T2** 迁移 `directorRuntimeProjection`（~250 行，行 372-610）
- [ ] **T3** 迁移 `directorRuntimeAutomation`（~200 行，行 616-750）
- [ ] **T4** 迁移 `directorRuntimeWorker`（~350 行，行 751-1275）
- [ ] **T5** barrel 导出全部 103 导出，验证旧 import 路径可用
- [ ] **T6** `pnpm --filter @ai-novel/shared build`
- [ ] **T7** `pnpm typecheck` + `pnpm test`
