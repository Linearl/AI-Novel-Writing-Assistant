# 任务中心批量操作功能

## 项目信息

- **REQ编号**: 3012
- **复杂度**: C2（中等）
- **优先级**: P1
- **状态**: 进行中

## 任务清单

### Phase 1: UI 组件开发

- [ ] 1.1 创建 TaskCheckbox 组件（单个任务复选框）
  - 显示复选框，点击切换选中状态
  - 不触发父级 button 的点击事件
  
- [ ] 1.2 创建 TaskSelectAll 组件（全选复选框）
  - 显示全选复选框
  - 支持三种状态：未选中、部分选中、全选中
  - 点击切换选中状态
  
- [ ] 1.3 创建 TaskBatchActionBar 组件（批量操作栏）
  - 显示已选中任务数量
  - 显示批量取消按钮
  - 仅在有选中任务时显示

### Phase 2: 集成到 TaskCenterListPanel

- [ ] 2.1 修改 TaskCenterListPanel 接口
  - 添加 selectedTaskIds 属性
  - 添加 onSelectionChange 回调
  
- [ ] 2.2 修改任务项渲染逻辑
  - 在任务项左侧添加 TaskCheckbox
  - 保持点击任务项查看详情功能
  
- [ ] 2.3 添加全选框和批量操作栏
  - 在列表顶部添加全选框
  - 在列表底部添加批量操作栏

### Phase 3: 状态管理和业务逻辑

- [ ] 3.1 在 TaskCenterPage 管理选中状态
  - 使用 useState 管理 selectedTaskIds
  - 筛选/排序/刷新时清除选中状态
  
- [ ] 3.2 实现批量取消功能
  - 调用 cancelTask API 逐个取消选中的任务
  - 自动跳过不可取消的任务
  - 显示操作结果（成功/失败数量）

### Phase 4: 批量归档功能

- [ ] 4.1 修改 TaskBatchActionBar 组件
  - 添加"批量归档"按钮
  - 传入 onBatchArchive 回调和 isArchiving 状态
  
- [ ] 4.2 修改 TaskCenterListPanel
  - 传递批量归档回调到 TaskBatchActionBar
  
- [ ] 4.3 在 TaskCenterPage 实现批量归档逻辑
  - 使用 archiveTask API 逐个归档选中的任务
  - 自动跳过不可归档的任务（非 succeeded/failed/cancelled 状态）
  - 显示操作结果（成功/失败/跳过数量）

### Phase 5: 测试和验证

- [ ] 5.1 类型检查
  - 运行 pnpm typecheck 确保无错误
  
- [ ] 5.2 功能测试
  - 测试多选功能
  - 测试全选功能
  - 测试批量取消功能
  - 测试批量归档功能
  - 测试边界情况（无可归档任务等）

## 完成标准

- 所有任务完成
- 类型检查通过
- 功能测试通过
- 代码已提交
- 任务包已归档

## 进度记录

- **开始时间**: 2026-07-11
- **当前进度**: 0%
