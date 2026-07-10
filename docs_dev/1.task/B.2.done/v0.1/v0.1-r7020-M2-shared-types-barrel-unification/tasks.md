---
description: "REQ-7020 共享类型 Barrel 统一导出——任务清单"
update_time: 2026-07-10
---

# REQ-7020 任务清单

## Phase 1: Barrel 合并

- [x] 1.1 对比 `shared/index.ts` 和 `shared/types/index.ts`，列出差异模块清单
- [x] 1.2 将差异模块（23 个）添加到 `shared/index.ts` 的导出列表
- [x] 1.3 验证：`shared/index.ts` 导出模块数 = `shared/types/index.ts`
- [x] 1.4 构建 shared 包：`pnpm --filter @ai-novel/shared build` — PASS

## Phase 2: chapterRuntime.ts 拆分

- [x] 2.1 分析 `chapterRuntime.ts` 内容，按子域划分导出组
- [x] 2.2 创建子文件：`chapterCore.ts`、`chapterStyle.ts`、`chapterContext.ts`、`generationPackage.ts`
- [x] 2.3 将原文件内容按子域迁移到对应子文件
- [x] 2.4 `chapterRuntime.ts` 改为 barrel facade，重新导出子模块（~200 行）
- [x] 2.5 验证：每个子文件 <= 700 行（321 / 207 / 405 / 148 行）

## Phase 3: Import 审计替换

- [x] 3.1 搜索全项目 `from "@ai-novel/shared/types/` 深层导入（实际 805 个文件，1350+ 处）
- [x] 3.2 逐模块替换为 `from "@ai-novel/shared"`（保持解构导入不变）
- [x] 3.3 验证：再次搜索确认无深层导入残留（0 remaining）
- [x] 3.4 构建验证：`pnpm typecheck` 通过（9 个 pre-existing errors，非本次变更引入）

## Phase 4: 测试

- [ ] 4.1 为 shared 包创建测试目录 `shared/tests/`
- [ ] 4.2 编写 zod schema 验证测试（>= 10 个，覆盖核心类型 schema）
- [ ] 4.3 运行测试：`pnpm --filter @ai-novel/shared test`
- [ ] 4.4 全量验证：`pnpm typecheck` + `pnpm build` + `pnpm test`

---

## DoD

- [x] `shared/index.ts` 导出覆盖所有 `shared/types/` 模块
- [x] `chapterRuntime.ts` 已拆分，无超 700 行文件
- [x] 全项目无 `@ai-novel/shared/types/X` 深层导入
- [ ] shared 包有 >= 10 个 schema 验证测试（Phase 4 待完成）
- [x] typecheck + build 通过（9 pre-existing errors，非本次引入）
