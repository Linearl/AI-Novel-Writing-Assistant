---
description: "QUA-039 任务拆解"
---

# REQ-7038 任务拆解

- [x] **T1** 提取 `buildMemberCreateData(castOption)` → 独立函数
- [x] **T2** 提取 `buildRelationCreateData(relation)` → 独立函数
- [x] **T3** `persistCharacterCastOptions` 中替换内联 map 回调为函数引用
- [x] **T4** 验证嵌套深度 ≤4（目视 + grep 缩进）
- [x] **T5** `pnpm typecheck` + `pnpm test`
