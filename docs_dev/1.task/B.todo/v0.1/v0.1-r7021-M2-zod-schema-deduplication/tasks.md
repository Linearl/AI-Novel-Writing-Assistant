---
description: "REQ-7021 Zod Schema 去重与共享化 —— 任务清单"
update_time: 2026-07-10
---

# REQ-7021 任务清单

## Phase 1: 全量审计

- [ ] 1.1 生成 server/src/ 下所有含 zod 调用的文件清单（121 文件）
- [ ] 1.2 逐文件审计，标注每处 zod 调用分类（可迁移 / 纯内部 / 过度重复）
- [ ] 1.3 输出审计报告 CSV，含 file/line/schemaName/classification/suggestedTarget
- [ ] 1.4 与 shared/types/ 交叉对比，确认迁移目标文件

## Phase 2: 优先级 1 迁移（直接重复）

- [ ] 2.1 角色 domain 直接重复迁移（shared characterResource.ts 覆盖 server 角色 schema）
- [ ] 2.2 状态 domain 直接重复迁移（shared canonicalState.ts 覆盖 server 状态 schema）
- [ ] 2.3 世界 domain 直接重复迁移（shared world.ts 覆盖 server 世界 schema）
- [ ] 2.4 章节 domain 直接重复迁移（shared novel.ts 覆盖 server 章节 schema）
- [ ] 2.5 配置 domain 直接重复迁移（shared config.ts 覆盖 server 配置 schema）

## Phase 3: 优先级 2 迁移（子集/变体重复）

- [ ] 3.1 角色变体 schema 用 .extend()/.pick()/.omit() 迁移
- [ ] 3.2 其他 domain 变体 schema 迁移

## Phase 4: 优先级 3 合并（语义重复）

- [ ] 4.1 识别跨 2+ server 文件的重复 schema 定义
- [ ] 4.2 提取到 shared/types/ 新文件或合并到已有文件

## Phase 5: 验证与规则固化

- [ ] 5.1 `pnpm typecheck` 通过
- [ ] 5.2 `pnpm test` 通过
- [ ] 5.3 验证 server 侧独立 zod 调用数量 <200
- [ ] 5.4 更新 CLAUDE.md / AGENTS.md "新 schema 先去 shared" 规则
