---
description: "REQ-7039 任务拆解"
---

# REQ-7039 任务拆解

- [x] **T1** ARCH-005: 将 toText 从 novelP0Utils → platform/textUtils.ts，更新 structuredInvoke.ts import
- [x] **T2** ARCH-009: 搬移 novelDirector.ts → routes/，更新 app.ts import
- [x] **T3** ARCH-023: GET /history → 501 Not Implemented + TODO
- [x] **T4** ARCH-024: POST → GET connectivity
- [x] **T5** STA-025: setInterval → 递归 setTimeout
- [x] **T6** PERF-003: modelRouteConfig Map 缓存 + 启动预载 + save 时 update
- [ ] **T7** `pnpm typecheck` + `pnpm test`（已有预存错误，与本次改动无关）
