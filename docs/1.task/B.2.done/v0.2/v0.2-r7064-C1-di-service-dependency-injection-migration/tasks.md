---
description: "REQ-7064 任务拆解"
update_time: 2026-07-14
---

# 任务拆解 — Service DI 迁移

## 阶段零：准备

- [ ] **T0.1** 确认 `IDatabase.$transaction` 是否覆盖 DirectorService 的事务用法；若不覆盖，扩展接口
  - 验证：`pnpm typecheck` 通过
  - 估时：0.5h

## 阶段一：逐 Service 改造（按顺序，每个独立提交）

### T1 — ChapterService（最低风险，先改验证模式）

- [ ] **T1.1** 修改 `ChapterService` 构造函数，注入 `IDatabase`，默认值 `= prisma`
  - 改动文件：`server/src/services/novel/ChapterService.ts`
  - 验证：`pnpm typecheck` 通过，现有测试全部通过
  - 估时：0.5h

- [ ] **T1.2** 为 `ChapterService` 新增 DI mock 单测，覆盖核心 CRUD 路径
  - 改动文件：`server/tests/` 下新增或修改测试文件
  - 验证：行覆盖率 ≥ 80%
  - 估时：1h

- [ ] **T1.3** 提交：`refactor: ChapterService 构造函数注入 IDatabase`

### T2 — NovelContextService

- [ ] **T2.1** 修改 `NovelContextService` 构造函数，注入 `IDatabase`
  - 验证：`pnpm typecheck` + `pnpm test` 通过
  - 估时：0.5h

- [ ] **T2.2** 新增 DI mock 单测
  - 估时：1h

- [ ] **T2.3** 提交

### T3 — NovelCoreService

- [ ] **T3.1** 修改 `NovelCoreService` 构造函数，注入 `IDatabase`
  - 估时：0.5h

- [ ] **T3.2** 新增 DI mock 单测
  - 估时：1h

- [ ] **T3.3** 提交

### T4 — NovelWorkflowService

- [ ] **T4.1** 修改 `NovelWorkflowService` 构造函数，注入 `IDatabase`
  - 估时：0.5h

- [ ] **T4.2** 新增 DI mock 单测，重点覆盖状态转换路径
  - 估时：1.5h

- [ ] **T4.3** 提交

### T5 — CharacterDynamicsService

- [ ] **T5.1** 修改 `CharacterDynamicsService` 构造函数，注入 `IDatabase`
  - 估时：0.5h

- [ ] **T5.2** 新增 DI mock 单测
  - 估时：1h

- [ ] **T5.3** 提交

### T6 — DirectorService（最复杂，最后改）

- [ ] **T6.1** 修改 `DirectorService` 构造函数，注入 `IDatabase` + `ILlmClient`
  - 重点：确认事务用法与 `IDatabase.$transaction` 兼容
  - 估时：1h

- [ ] **T6.2** 新增 DI mock 单测，覆盖自动导演核心路径
  - 估时：2h

- [ ] **T6.3** 提交

## 阶段二：清理与文档

- [ ] **T7.1** 为 `prismaMock.js` 添加 `@deprecated` 注释，说明新测试使用 DI mock
  - 估时：0.5h

- [ ] **T7.2** 更新 `docs/2.tech/architecture/dependency-injection.md`，记录迁移完成状态
  - 估时：0.5h

- [ ] **T7.3** 全量验证：`pnpm typecheck && pnpm test`
  - 估时：0.5h

- [ ] **T7.4** 提交：`docs: 标记 DI 迁移完成，prismaMock 标记 deprecated`

---

## 估时汇总

| 阶段 | 估时 |
|------|------|
| 阶段零（准备） | 0.5h |
| 阶段一（6 个 Service 改造 + 测试） | 12h |
| 阶段二（清理文档） | 2h |
| **总计** | **~14.5h** |
