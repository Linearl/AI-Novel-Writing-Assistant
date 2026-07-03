---
description: "REQ-3001 决策日志"
---

# REQ-3001 决策日志

> 记录需求开发过程中的关键决策。

## 决策记录

### D1: 多选状态存储位置

- **时间**: 2026-06-26
- **决策点**: 多选状态存储在 TaskCenterListPanel（子组件）还是 TaskCenterPage（页面）？
- **选择**: TaskCenterPage（页面级）
- **理由**: 批量归档的 mutation 需要在页面级管理；选中状态需要与筛选联动（筛选变更时清空），这些逻辑在页面层更合理。子组件仅负责渲染 Checkbox 和触发 toggle 回调。
- **影响**: TaskCenterListPanel 增加 `selectedTaskKeys` / `onToggleSelect` / `selectableKeys` 三个 props

### D2: 全选范围

- **时间**: 2026-06-26
- **决策点**: "全选"是否选中所有任务，还是仅选中可归档任务？
- **选择**: 仅选中可归档状态（succeeded / failed / cancelled）
- **理由**: 正在运行的任务（queued / running / waiting_approval）不能归档，全选这些任务会导致批量归档时大量失败，用户体验差。
- **影响**: `archivableKeys` 计算仅包含 `ARCHIVABLE_STATUSES` 中的任务

### D3: 批量归档端点设计

- **时间**: 2026-06-26
- **决策点**: 使用独立端点还是前端循环调用单任务归档？
- **选择**: 独立 `POST /api/tasks/batch-archive` 端点
- **理由**: 循环调用会产生 N 次 HTTP 请求，网络开销大；独立端点可在服务端统一处理错误和返回汇总结果。
- **影响**: 新增路由 + Zod 校验 + 共享类型

### D4: 筛选联动策略

- **时间**: 2026-06-26
- **决策点**: 切换筛选条件时是否保留选中状态？
- **选择**: 清空选中状态
- **理由**: 切换筛选后选中状态可能指向不可见的任务，保留会导致困惑。清空是最安全的行为，用户可以重新选择。
- **影响**: 在 kind / status / keyword / onlyAnomaly / sortMode 变更的 useEffect 中调用 `setSelectedTaskKeys(new Set())`

### D5: REQ-3001 原始副本文件名修正

- **时间**: 2026-06-26
- **决策点**: REQ-3001-original.md 中的文件引用写成了 `REQ-2001.md`，应为 `REQ-3001.md`
- **选择**: 修正为正确的文件名
- **理由**: 笔误，原始副本应指向自己的工作副本
- **影响**: 仅文档修正
