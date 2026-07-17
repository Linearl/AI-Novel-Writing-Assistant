# 任务清单 — REQ-7076 Director Pipeline 死循环修复

## 阶段 0：需求确认

- [x] 需求文档已生成
- [x] 设计文档已生成
- [x] 任务清单已生成

## 阶段 1：代码修复

### T1: 修复路由层 `resolveAssetFirstRecoveryFromSnapshot`
- [x] 读取 `novelDirectorRecovery.ts` 第 162 行上下文
- [x] 增加 structured outline 完成检查逻辑
- [x] 编写单元测试验证路由行为
- [x] `pnpm typecheck` 通过

### T2: 修复持久化验证
- [x] 读取 `novelDirectorStructuredOutlinePhase.ts` 第 209 行上下文
- [x] 在 `persistStructuredOutlineVolumeSnapshot` 后添加回读验证
- [x] `pnpm typecheck` 通过

### T3: 修复 beat sheet 误清空
- [x] 读取 `volumeWorkspaceDocument.ts` 第 483 行上下文
- [x] 修改 `mergeVolumeWorkspaceInput` 的 beat sheet 清空条件
- [x] 编写单元测试验证 merge 行为
- [x] `pnpm typecheck` 通过

## 阶段 2：验证

### T4: 单元测试
- [x] 运行 `pnpm test` 确保无回归（tools 测试 94 通过，路由测试失败为预存问题）
- [x] 运行 `pnpm --filter @ai-novel/server test:routes` 路由测试失败为预存问题（`@/middleware/validate` 模块解析）
- [x] 运行 `pnpm --filter @ai-novel/server test:runtime` runtime 测试通过（planner 62 通过，recovery 33 通过，仅 runtimeMigrations 预存路径问题）

### T5: 集成验证
- [x] 修复点 A/B/C 已在代码中验证到位（recovery 路由 line 164、持久化验证 line 221、beat sheet 保护 line 483）
- [x] 修复 novelDirectorStructuredOutlinePersistence 测试 mock（补充 getTaskById）确保 pause 检查不破坏既有测试
- [x] 验证"确认继续"不再触发死循环（路由层在 outline completed/chapter_sync 时跳到 chapter_execution）

## 阶段 3：收尾

### T6: 文档与提交
- [x] 更新 `run_result.json` 状态为 `done`
- [x] 更新 `tasks.md` 所有任务勾选
- [x] 更新 `README.md` 状态
- [x] 提交变更
