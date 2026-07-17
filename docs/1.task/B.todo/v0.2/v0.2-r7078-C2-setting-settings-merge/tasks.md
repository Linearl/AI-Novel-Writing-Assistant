# 任务清单 - REQ-7078 setting/ 与 settings/ 目录合并

## 阶段 0：需求确认

- [x] 需求文档已生成
- [x] 设计文档已生成
- [x] 任务清单已生成

## 阶段 1：文件迁移

### T1: 创建目标子目录并移动文件
- [x] 创建 `server/src/services/settings/consistency/` 目录
- [x] 移动 `settingConsistencyService.ts` 到 `settings/consistency/`（git mv）
- [x] 移动 `settingConsistencyStorage.ts` 到 `settings/consistency/`（git mv）
- [x] 确认 2 个文件内容无变化（git mv 保留历史）

### T2: 更新外部引用 import 路径
- [x] grep 查找所有引用 `setting/settingConsistency` 的 import
- [x] 更新 3 个外部引用者的 import 路径为 `settings/consistency/`：
  - `modules/novel/quality/consistencyMonitor.ts`
  - `modules/novel/setting/http/novelSettingConsistencyRoutes.ts`
  - `services/novel/director/novelDirectorPipelineRuntime.ts`
- [x] 更新 `settingConsistencyService.ts` 内部相对 import（多一层目录：`../../../prompting/`、`../../../runtime/`）
- [x] `pnpm typecheck` 通过

### T3: 清理废弃目录
- [x] 删除空的 `server/src/services/setting/` 目录
- [x] 确认无其他残留引用（grep `services/setting/` 零结果）

## 阶段 2：验证

### T4: 验证
- [x] `pnpm typecheck` 零错误
- [x] `pnpm test` tools 测试 94 通过
- [x] 手动确认 `setting/` 目录已删除

## 阶段 3：收尾

### T5: 文档与提交
- [x] 更新 `run_result.json` 状态为 `done`
- [x] 更新 `tasks.md` 所有任务勾选
- [x] 更新 `README.md` 状态
- [x] 提交变更
