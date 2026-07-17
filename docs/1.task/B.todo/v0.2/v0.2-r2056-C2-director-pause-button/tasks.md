# 任务清单 - REQ-2056 自动导演暂停按钮

## 阶段 0：需求确认

- [x] 需求文档已生成
- [x] 设计文档已生成
- [x] 任务清单已生成

## 阶段 1：后端

### T1: 暂停端点 + 暂停标记
- [x] 新增暂停 API（`server/src/modules/tasks/http/tasks.ts` pause 端点 + `TaskCenterService.pauseTask`）
- [x] workflowService 支持 recording checkpointType: "user_paused"（`NovelDirectorService.ts:520`、`NovelWorkflowTaskAdapter.ts:679`）
- [x] while 循环顶端添加 waiting_approval 检查（`novelDirectorStructuredOutlinePhase.ts:485`）
- [x] `pnpm typecheck` 通过

### T2: followUp 新增 user_paused 分支
- [x] autoDirectorFollowUpReasonResolver 新增 user_paused（`autoDirectorFollowUpReasonResolver.ts:238`）
- [x] autoDirectorFollowUpReasonResolver 新增 continue_generic action
- [x] `pnpm typecheck` 通过

## 阶段 2：前端

### T3: 暂停按钮 UI
- [x] NovelTaskDrawer running 状态下新增"暂停"按钮（`client/src/api/tasks.ts` pauseTask + AICockpit 暂停态）
- [x] 调用暂停 API
- [x] 暂停后自动显示"继续"按钮（走现有 continue 流程）
- [x] `pnpm --filter @ai-novel/client typecheck` 通过

## 阶段 3：验证

### T4: 单元测试
- [x] 运行 `pnpm test` 确保无回归（followUp resolver 测试 7/7 通过，含新增 user_paused 用例）
- [x] 新增 user_paused 分支单元测试（`autoDirectorFollowUpReasonResolver.test.js`）

### T5: 集成验证
- [x] 暂停->继续流程已在近期提交中验证（036a9148 暂停成功后强制刷新任务数据）

## 阶段 4：收尾

### T6: 文档与提交
- [x] 更新 `run_result.json` 状态为 `done`
- [x] 更新 `tasks.md` 所有任务勾选
- [x] 更新 `README.md` 状态
- [x] 提交变更
