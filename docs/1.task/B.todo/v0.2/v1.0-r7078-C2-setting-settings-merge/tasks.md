# 任务清单 — REQ-7078 setting/ 与 settings/ 目录合并

## 阶段 0：需求确认

- [ ] 需求文档已生成
- [ ] 设计文档已生成
- [ ] 任务清单已生成

## 阶段 1：文件迁移

### T1: 创建目标子目录并移动文件
- [ ] 创建 `server/src/services/settings/consistency/` 目录
- [ ] 移动 `settingConsistencyService.ts` 到 `settings/consistency/`
- [ ] 移动 `settingConsistencyStorage.ts` 到 `settings/consistency/`
- [ ] 确认 2 个文件内容无变化（git mv 保留历史）

### T2: 更新外部引用 import 路径
- [ ] grep 查找所有引用 `setting/settingConsistency` 的 import
- [ ] 更新 2 个外部引用者的 import 路径为 `settings/consistency/`
- [ ] `pnpm typecheck` 通过

### T3: 清理废弃目录
- [ ] 删除空的 `server/src/services/setting/` 目录
- [ ] 确认无其他残留引用

## 阶段 2：验证

### T4: 验证
- [ ] `pnpm typecheck` 零错误
- [ ] `pnpm test` 全部通过
- [ ] 手动确认 `setting/` 目录已删除

## 阶段 3：收尾

### T5: 文档与提交
- [ ] 更新 `run_result.json` 状态为 `done`
- [ ] 更新 `tasks.md` 所有任务勾选
- [ ] 更新 `README.md` 状态
- [ ] 提交变更
