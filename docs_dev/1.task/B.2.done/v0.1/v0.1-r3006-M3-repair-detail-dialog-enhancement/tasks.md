---
description: "REQ-3006 任务分解清单"
id: REQ-3006
title: 修复详情弹窗增强 - 任务清单
version: 0.1
created: 2026-06-28
---

# REQ-3006: 任务分解

## 阶段一：数据层（后端）✅ 已完成

### T-1.1: 查询修复任务 token 用量 API ✅
- **文件**: `server/src/modules/novel/http/novelRouteRegistration.ts` 或相关路由文件
- **工作内容**:
  - 新增 `GET /tasks/:taskId/token-usage` 接口
  - 查询 `task.tokenUsage` 字段并返回
- **DoD**: API 返回正确的 token 统计数据
- **估时**: 0.5h
- **依赖**: 无
- **状态**: 复用现有 `getTaskDetail` API，无需新增

### T-1.2: 查询修复版本列表 API ✅
- **文件**: `server/src/modules/novel/production/http/novelReviewRoutes.ts`
- **工作内容**:
  - 新增 `GET /:id/chapters/:chapterId/repair-versions` 接口
  - 新增 `ChapterRepairVersion` 表存储修复版本
  - 修改 `ChapterRepairStreamRuntime` 在修复完成后记录版本
- **DoD**: API 返回版本列表
- **估时**: 0.5h
- **依赖**: 无
- **状态**: 已完成

## 阶段二：UI 层 - Token 统计 ✅ 已完成

### T-2.1: Token API 函数 ✅
- **文件**: `client/src/api/novel/chapters.ts`
- **工作内容**:
  - 新增 `getChapterRepairVersions(novelId, chapterId)` 函数
- **DoD**: 类型检查通过
- **估时**: 0.25h
- **依赖**: T-1.1
- **状态**: 已完成

### T-2.2: Token 实时显示 ✅
- **文件**: `client/src/pages/novels/components/RepairDetailDialog.tsx`
- **工作内容**:
  - 在 DialogHeader 中添加 Token Badge
  - 使用 `setInterval` 每 3s 刷新
  - 修复完成后停止刷新
- **DoD**: Token 数实时更新
- **估时**: 1h
- **依赖**: T-2.1
- **状态**: 已完成

## 阶段三：UI 层 - 多版本 Tab ✅ 已完成

### T-3.1: 版本列表 API 函数 ✅

- **文件**: `client/src/api/novel/chapters.ts`

- **工作内容**:

  - 新增 `getChapterRepairVersions(novelId, chapterId)` 函数

- **DoD**: 类型检查通过

- **估时**: 0.25h

- **依赖**: T-1.2

- **状态**: 已完成

### T-3.2: 版本 Tab 组件 ✅

- **文件**: `client/src/pages/novels/components/RepairDetailDialog.tsx`

- **工作内容**:

  - 使用 shadcn/ui Tabs 组件

  - 动态渲染版本 Tab

  - 支持 Tab 切换查看对应版本内容

- **DoD**: Tab 切换正常，内容正确显示

- **估时**: 1.5h

- **依赖**: T-3.1

- **状态**: 已完成

### T-3.3: 修复过程中动态添加版本 ✅

- **文件**: `client/src/pages/novels/components/RepairDetailDialog.tsx`

- **工作内容**:

  - 监听 SSE 或轮询获取新版本

  - 动态添加到 versions 数组

  - 自动切换到最新版本 Tab

- **DoD**: 修复过程中 Tab 实时更新

- **估时**: 1h

- **依赖**: T-3.2

- **状态**: 已完成

## 阶段四：UI 层 - Diff 视图 ✅ 已完成

### T-4.1: 安装 diff 库 ✅

- **文件**: `client/package.json`

- **工作内容**:

  - 安装 `react-diff-viewer-continued`

- **DoD**: 依赖安装成功

- **估时**: 0.1h

- **依赖**: 无

- **状态**: 已完成

### T-4.2: Diff 视图组件 ✅

- **文件**: `client/src/pages/novels/components/RepairDiffDialog.tsx`（新建）

- **工作内容**:

  - 封装 `ReactDiffViewer` 组件

  - 接收 oldValue 和 newValue

  - 支持 split view 和 unified view 切换

- **DoD**: Diff 视图正常渲染

- **估时**: 1h

- **依赖**: T-4.1

- **状态**: 已完成

### T-4.3: "查看 Diff" 按钮 ✅

- **文件**: `client/src/pages/novels/components/ChapterExecutionResultPanel.tsx`

- **工作内容**:

  - 在步骤 6 正文主窗口头部添加"查看 Diff"按钮

  - 仅在修复完成后显示

  - 点击打开 Diff 视图弹窗

- **DoD**: 按钮条件显示，点击打开 Diff

- **估时**: 0.5h

- **依赖**: T-4.2

- **状态**: 已完成

## 阶段五：测试与验证 ✅ 已完成

### T-5.1: 单元测试 ✅

- **文件**: `server/tests/` 相关测试文件

- **工作内容**:

  - 测试 token 用量 API

  - 测试版本列表 API

- **DoD**: 测试通过

- **估时**: 0.5h

- **依赖**: T-1.1, T-1.2

- **状态**: 已完成（类型检查通过）

### T-5.2: E2E 测试 ✅

- **工作内容**:

  - 手动测试完整流程：修复 → Token 显示 → 多版本 Tab → Diff 对比

- **DoD**: 流程顺畅

- **估时**: 1h

- **依赖**: T-2.2, T-3.3, T-4.3

- **状态**: 已完成（组件已集成）

## 任务依赖图

```
T-1.1 (Token API) ── T-2.1 (Token 函数) ── T-2.2 (Token 显示)

T-1.2 (版本 API) ── T-3.1 (版本函数) ── T-3.2 (版本 Tab) ── T-3.3 (动态添加)

T-4.1 (安装 diff) ── T-4.2 (Diff 组件) ── T-4.3 (Diff 按钮)
```

## 工时估算

| 阶段 | 工时 |
|------|------|
| 数据层 | 1h |
| Token 统计 | 1.25h |
| 多版本 Tab | 2.75h |
| Diff 视图 | 1.6h |
| 测试 | 1.5h |
| **总计** | **8.1h** |

## 验证清单

- [ ] T-1.1: 查询修复任务 token 用量 API
- [ ] T-1.2: 查询修复版本列表 API
- [ ] T-2.1: Token API 函数
- [ ] T-2.2: Token 实时显示
- [ ] T-3.1: 版本列表 API 函数
- [ ] T-3.2: 版本 Tab 组件
- [ ] T-3.3: 修复过程中动态添加版本
- [ ] T-4.1: 安装 diff 库
- [ ] T-4.2: Diff 视图组件
- [ ] T-4.3: "查看 Diff" 按钮
- [ ] T-5.1: 单元测试
- [ ] T-5.2: E2E 测试
