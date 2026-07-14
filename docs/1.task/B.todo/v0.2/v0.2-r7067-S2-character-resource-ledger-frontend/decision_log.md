
---
description: "REQ-7067 角色资源账本前端可视化管理 — 决策日志"
update_time: 2026-07-14
---

## 决策记录

### D1: 管理面板形式

- **决策**：独立面板（可嵌入角色详情 Tab 或独立路由），不强制限定位置
- **理由**：ResourceRiskPanel 已有嵌入模式，管理面板需要更大空间。具体路由/嵌入由实现时决定。
- **日期**：2026-07-14

### D2: 是否新增后端 API

- **决策**：不新增，复用现有 `novelCharacterResourceRoutes.ts`
- **理由**：后端 CRUD 路由已完备（GET/POST/PATCH/DELETE），前端只需调用
- **日期**：2026-07-14

### D3: 风险颜色方案

- **决策**：低=绿、中=黄、高=橙、阻塞=红，复用 Badge variant
- **理由**：与 ResourceRiskPanel 现有颜色一致
- **日期**：2026-07-14
