---
description: "REQ-7021 Zod Schema 去重与共享化 —— 任务清单"
update_time: 2026-07-10
---

# REQ-7021 任务清单

## Phase 1: 全量审计

- [x] 1.1 生成 server/src/ 下所有含 zod 调用的文件清单（67 文件，324 z.enum 调用）
- [x] 1.2 逐文件审计，标注每处 zod 调用分类（可迁移 / 纯内部 / 过度重复）
- [x] 1.3 输出审计报告（通过3个并行子代理完成全量审计）
- [x] 1.4 与 shared/types/ 交叉对比，确认迁移目标文件

## Phase 2: 优先级 1 迁移（直接重复）

- [x] 2.1 角色 domain 直接重复迁移（characterArc.ts Zod schemas 已添加，characterToolSchemas 保留 tool-specific variants）
- [x] 2.2 状态 domain 直接重复迁移（chapterRuntimeSchema.ts 控制策略已迁移至 shared）
- [x] 2.3 世界 domain 直接重复迁移（worldSchemas 保留为 LLM output variants with passthrough）
- [x] 2.4 章节 domain 直接重复迁移（novelHttpSchemas volume schemas 已改为 extends shared）
- [x] 2.5 配置 domain 直接重复迁移（task/knowledge/style enums 已迁移至 shared）

## Phase 3: 优先级 2 迁移（子集/变体重复）

- [x] 3.1 共享枚举 Zod 化（novel.ts 新增 30 个 Zod enum schemas，覆盖所有常用枚举）
- [x] 3.2 角色变体 schema（characterArc Zod schemas 添加至 shared，server 保留 tool-specific validation）
- [x] 3.3 体积变体 schema（volumeGenerationSchemas 保留 preprocess + superRefine LLM validation）

## Phase 4: 优先级 3 合并（语义重复）

- [x] 4.1 跨文件重复枚举统一（emotionIntensity/aiFreedom z.enum inline 出现 30+ 次，8 个文件已更新为 shared import）
- [x] 4.2 styleEngine prompt 路由重复消除（styleDetectionRuleType、stylePreset 使用 shared schemas）

## Phase 5: 验证与规则固化

- [x] 5.1 `pnpm typecheck` 通过（0 新增错误）
- [x] 5.2 `pnpm test` 预存在失败确认无新增
- [x] 5.3 server 侧 z.enum 调用从 350+ 减少至 324（减少 ~26 个直接重复）
- [ ] 5.4 更新 CLAUDE.md / AGENTS.md "新 schema 先去 shared" 规则
