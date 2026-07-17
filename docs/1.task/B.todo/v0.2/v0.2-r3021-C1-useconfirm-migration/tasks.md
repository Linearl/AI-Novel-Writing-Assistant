# 任务清单 — REQ-3021 window.confirm/prompt 迁移到 useConfirm

## 阶段 0：需求确认

- [ ] 需求文档已生成
- [ ] 设计文档已生成
- [ ] 任务清单已生成

## 阶段 1：批次 1 — worlds (3 文件)

### T1: 迁移 worlds 模块 confirm
- [ ] 定位 worlds 模块中所有 `window.confirm` 调用
- [ ] 替换为 `useConfirm` hook
- [ ] 确保 `await` 正确处理
- [ ] `pnpm typecheck` 通过

## 阶段 2：批次 2 — characters (2 文件)

### T2: 迁移 characters 模块 confirm
- [ ] 定位 characters 模块中所有 `window.confirm` 调用
- [ ] 替换为 `useConfirm` hook
- [ ] 确保 `await` 正确处理
- [ ] `pnpm typecheck` 通过

## 阶段 3：批次 3 — novels/components 组 1 (6 文件)

### T3: 迁移 novels/components 第一批
- [ ] 定位 6 个文件中的 `window.confirm` 调用
- [ ] 替换为 `useConfirm` hook
- [ ] 确保 `await` 正确处理
- [ ] `pnpm typecheck` 通过

## 阶段 4：批次 4 — novels/components 组 2 (4 文件)

### T4: 迁移 novels/components 第二批
- [ ] 定位 4 个文件中的 `window.confirm` 调用
- [ ] 替换为 `useConfirm` hook
- [ ] 确保 `await` 正确处理
- [ ] `pnpm typecheck` 通过

## 阶段 5：批次 5 — novels/pages (1 文件)

### T5: 迁移 novels/pages 模块
- [ ] 定位文件中的 `window.confirm` 调用
- [ ] 替换为 `useConfirm` hook
- [ ] `pnpm typecheck` 通过

## 阶段 6：批次 6 — settings (1 文件)

### T6: 迁移 settings 模块
- [ ] 定位文件中的 `window.confirm` 调用
- [ ] 替换为 `useConfirm` hook
- [ ] `pnpm typecheck` 通过

## 阶段 7：批次 7 — knowledge (2 文件)

### T7: 迁移 knowledge 模块
- [ ] 定位 2 个文件中的 `window.confirm` 调用
- [ ] 替换为 `useConfirm` hook
- [ ] `pnpm typecheck` 通过

## 阶段 8：批次 8 — genres + storyModes (2 文件)

### T8: 迁移 genres 和 storyModes 模块
- [ ] 定位 2 个文件中的 `window.confirm` 调用
- [ ] 替换为 `useConfirm` hook
- [ ] `pnpm typecheck` 通过

## 阶段 9：批次 9 — writingFormula + titles (2 文件)

### T9: 迁移 writingFormula 和 titles 模块
- [ ] 定位 2 个文件中的 `window.confirm` 调用
- [ ] 替换为 `useConfirm` hook
- [ ] `pnpm typecheck` 通过

## 阶段 10：批次 10 — autoDirector (2+1 文件)

### T10: 迁移 autoDirector 模块及确认修复
- [ ] 定位 autoDirector 相关文件中的 `window.confirm` 调用
- [ ] 替换为 `useConfirm` hook
- [ ] 验证自动导演流程中确认操作正常
- [ ] `pnpm typecheck` 通过

## 阶段 11：全量验证

### T11: 全量验证
- [ ] `pnpm typecheck` 零错误
- [ ] `pnpm test:client` 全部通过
- [ ] `pnpm build` 全量构建通过
- [ ] 手动验证所有确认对话框的 UI 和交互

## 阶段 12：收尾

### T12: 文档与提交
- [ ] 更新 `run_result.json` 状态为 `done`
- [ ] 更新 `tasks.md` 所有任务勾选
- [ ] 更新 `README.md` 状态
- [ ] 提交变更
