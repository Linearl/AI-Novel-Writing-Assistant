# 任务清单 — REQ-2056 自动导演暂停按钮

## 阶段 0：需求确认

- [x] 需求文档已生成
- [x] 设计文档已生成
- [x] 任务清单已生成

## 阶段 1：后端

### T1: 暂停端点 + 暂停标记
- [ ] 新增暂停 API
- [ ] workflowService 支持 recording checkpointType: "user_paused"
- [ ] while 循环顶端添加 waiting_approval 检查
- [ ] `pnpm typecheck` 通过

### T2: followUp 新增 user_paused 分支
- [ ] autoDirectorFollowUpReasonResolver 新增 user_paused
- [ ] autoDirectorFollowUpReasonResolver 新增 continue_generic action
- [ ] `pnpm typecheck` 通过

## 阶段 2：前端

### T3: 暂停按钮 UI
- [ ] NovelTaskDrawer running 状态下新增"暂停"按钮
- [ ] 调用暂停 API
- [ ] 暂停后自动显示"继续"按钮（走现有 continue 流程）
- [ ] `pnpm --filter @ai-novel/client typecheck` 通过

## 阶段 3：验证

### T4: 单元测试
- [ ] 运行 `pnpm test` 确保无回归

### T5: 集成验证
- [ ] 启动 `pnpm dev`
- [ ] 手动验证暂停→继续流程

## 阶段 4：收尾

### T6: 文档与提交
- [ ] 更新 `run_result.json` 状态为 `done`
- [ ] 提交变更
