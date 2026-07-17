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
- [ ] 运行 `pnpm --filter @ai-novel/server test:routes` 确保路由测试通过
- [ ] 运行 `pnpm --filter @ai-novel/server test:runtime` 确保 runtime 测试通过

### T5: 集成验证
- [ ] 启动 `pnpm dev`
- [ ] 手动验证自动导演流程能从 structured_outline 推进到 chapter_execution
- [ ] 验证"确认继续"不再触发死循环

## 阶段 3：收尾

### T6: 文档与提交
- [ ] 更新 `run_result.json` 状态为 `done`
- [ ] 更新 `tasks.md` 所有任务勾选
- [ ] 更新 `README.md` 状态
- [ ] 提交变更
