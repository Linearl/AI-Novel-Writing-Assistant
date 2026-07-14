---
description: "REQ-3001 任务拆解"
---

# REQ-3001 任务拆解

> 状态：⏳ 进行中（完成后改为 ✅ 全部完成）

## 任务概述

### 1. 来源

用户反馈 — 任务中心积累了大量历史任务，逐个归档效率低。

### 2. 问题

任务列表只支持单选和单个归档，缺少多选和批量操作能力。

### 3. 需求

- 前端：任务列表多选 Checkbox + 选择工具栏 + 批量归档按钮 + 确认对话框 + 结果反馈
- 后端：新增批量归档 API 端点
- 共享：新增批量归档请求/响应类型

### 4. 验收标准

> 见 [REQ-3001.md](./REQ-3001.md) 第 4 节。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 共享层：新增 BatchArchive 相关类型定义 | P0 | 0.25h | ⬜ 待开始 |
| T2 | 后端：新增 POST /api/tasks/batch-archive 端点 | P0 | 1h | ⬜ 待开始 |
| T3 | 前端：TaskCenterListPanel 增加 Checkbox 多选 | P0 | 1.5h | ⬜ 待开始 |
| T4 | 前端：新增 TaskCenterSelectionToolbar 组件 | P0 | 1h | ⬜ 待开始 |
| T5 | 前端：TaskCenterPage 集成多选状态管理 + 批量归档 mutation | P0 | 1.5h | ⬜ 待开始 |
| T6 | 前端：批量归档确认对话框 + 结果反馈 | P1 | 0.5h | ⬜ 待开始 |

---

## 逐项展开

### T1: 共享层 — BatchArchive 类型定义

**目标**: 定义批量归档请求和响应的 TypeScript 类型。

**改动点**:
- `shared/types/task.ts` — 追加 `BatchArchiveTaskItem`、`BatchArchiveRequest`、`BatchArchiveResultItem`、`BatchArchiveResponse`

**DoD**:
- [ ] 类型定义完整，覆盖请求体、响应体、单条结果
- [ ] `shared` 包 build 通过

---

### T2: 后端 — 批量归档端点

**目标**: 实现 `POST /api/tasks/batch-archive`，支持一次归档多个任务。

**改动点**:
- `server/src/routes/tasks.ts` — 新增路由和 Zod 校验

**DoD**:
- [ ] 请求体校验（tasks 数组非空、上限 80、每项含 kind + id）
- [ ] 逐个归档，单个失败不阻断
- [ ] 返回 results + summary
- [ ] 复用现有 `taskCenterService.archiveTask` 逻辑

---

### T3: 前端 — TaskCenterListPanel Checkbox 多选

**目标**: 在任务列表每个任务项增加 Checkbox，支持多选交互。

**改动点**:
- `client/src/pages/tasks/components/TaskCenterListPanel.tsx` — 增加 Checkbox 组件和相关 props

**DoD**:
- [ ] 每个任务项左侧显示 Checkbox
- [ ] Checkbox 点击不触发卡片单选（stopPropagation）
- [ ] 选中态有视觉区分
- [ ] 仅 `selectableKeys` 中的 key 对应的 Checkbox 可操作

---

### T4: 前端 — TaskCenterSelectionToolbar 组件

**目标**: 提供选择工具栏（计数 + 全选/取消全选 + 批量归档按钮）。

**改动点**:
- `client/src/pages/tasks/components/TaskCenterSelectionToolbar.tsx` — 新建

**DoD**:
- [ ] 显示"已选 N / 共 M 个"
- [ ] 全选按钮仅选中可归档任务
- [ ] 取消全选清空所有
- [ ] 批量归档按钮在有选中时显示，带数量标注
- [ ] 批量归档按钮有 loading 态

---

### T5: 前端 — TaskCenterPage 多选状态管理

**目标**: 在页面级管理多选状态，实现筛选联动和批量归档 mutation。

**改动点**:
- `client/src/pages/tasks/TaskCenterPage.tsx` — 新增状态、mutation、联动逻辑
- `client/src/api/tasks.ts` — 新增 `batchArchiveTasks` API 函数

**DoD**:
- [ ] `selectedTaskKeys` 状态管理正确
- [ ] 筛选条件变化时清空选中
- [ ] 列表刷新时移除不存在的选中项
- [ ] `archivableKeys` 计算正确
- [ ] 批量归档 mutation 集成正确

---

### T6: 前端 — 确认对话框与结果反馈

**目标**: 批量归档前弹出确认框，归档后展示结果 Toast。

**改动点**:
- `TaskCenterPage.tsx` 或 `TaskCenterSelectionToolbar.tsx` — 集成确认逻辑

**DoD**:
- [ ] 确认对话框显示归档数量
- [ ] 全部成功 → success Toast + 清空选中 + 刷新
- [ ] 部分失败 → warning Toast + 仅清空成功项
- [ ] 全部失败 → error Toast + 保留选中

---

## DoD（Definition of Done）

- 任务列表支持 Checkbox 多选
- 全选/取消全选快捷操作正常
- 批量归档按钮在有选中时显示
- 确认对话框和结果反馈完善
- 后端批量归档 API 正常工作
- 单个失败不阻断其他任务
- 筛选联动清空选中

---

## 依赖

- 前置依赖：无（任务中心和单任务归档已稳定）
- 关联依赖：无
- 后继依赖：后续可扩展批量重试/取消

---

## 验证步骤

1. 创建多个不同状态的任务（running / succeeded / failed / cancelled）
2. 勾选多个可归档任务，验证 Checkbox 交互不影响详情查看
3. 点击"全选"，验证仅可归档任务被选中
4. 点击"批量归档"，验证确认对话框
5. 确认后验证 Toast 反馈和列表刷新
6. 切换筛选条件，验证选中状态被清空
7. 模拟单个任务归档失败，验证部分失败的反馈

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-06-26 | req 路由生成任务包 | 完成 |

---

## 完成判定

- T1~T6 全部完成且 DoD 全部满足后，REQ-3001 达到"已完成"状态。
