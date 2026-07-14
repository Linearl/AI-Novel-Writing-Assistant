---
description: "REQ-2020 tasks: 自动导演流水线执行模式任务清单"
---

# REQ-2020: 自动导演流水线执行模式 - 任务清单

## 任务概览

| 阶段 | 任务数 | 状态 |
|------|--------|------|
| 阶段零：准备工作 | 2 | ☐ |
| 阶段一：后端核心逻辑 | 4 | ☐ |
| 阶段二：前端 UI | 3 | ☐ |
| 阶段三：集成测试 | 2 | ☐ |
| 阶段四：文档更新 | 1 | ☐ |
| **总计** | **12** | - |

---

## 阶段零：准备工作

### Z.1 了解现有自动导演架构
- [x] 阅读 `docs/wiki/workflows/auto-director-runtime.md`
- [x] 阅读 `docs/wiki/workflows/lazy-chapter-planning.md`
- [x] 阅读 `docs/wiki/workflows/chapter-production-chain.md`
- [x] 理解现有的章节执行流程

### Z.2 确认技术方案
- [x] 确认流水线模式的实现路径
- [x] 确认与现有 JIT 模式的兼容性
- [x] 确认状态管理方案

---

## 阶段一：后端核心逻辑

### T.1 添加流水线模式配置
**文件**：`shared/types/novelDirector.ts`
- [x] 在 `DirectorAutoExecutionState` 中添加 `pipelineMode` 字段
- [x] 类型定义：`pipelineMode: "batch" | "pipeline"`
- [x] 默认值：`"batch"`

### T.2 修改结构化大纲阶段
**文件**：`server/src/services/novel/director/phases/novelDirectorStructuredOutlinePhase.ts`
- [x] 在 `chapter_detail_bundle` 步骤中添加流水线模式判断
- [x] 流水线模式下，每完成一个章节细化，触发该章节的写作
- [x] 批量模式下，保持原有行为

### T.3 修改流水线执行服务
**文件**：`server/src/services/novel/novelCorePipelineService.ts`
- [x] 添加 `executePipelineWithPipelineMode` 方法
- [x] 实现细化与写作的交错执行逻辑
- [x] 添加前置检查：确保 task sheet 已生成
- [x] 添加人工审核阻塞机制

### T.4 修改自动导演运行时
**文件**：`server/src/services/novel/director/automation/novelDirectorAutoExecutionRuntime.ts`
- [x] 在 `runFromReady` 方法中添加流水线模式入口
- [x] 传递 `pipelineMode` 配置到执行层
- [x] 处理流水线模式下的暂停/恢复逻辑

---

## 阶段二：前端 UI

### T.5 修改自动导演高级设置面板
**文件**：`client/src/pages/novels/components/NovelAutoDirectorDialog.tsx`
- [x] 添加"使用改进流水线"复选框
- [x] 默认不勾选
- [x] 绑定到 `pipelineMode` 配置

### T.6 修改任务中心设置面板
**文件**：`client/src/pages/novels/components/NovelTaskDrawer.tsx`
- [x] 在暂停状态下显示流水线模式开关
- [x] 允许修改配置
- [x] 修改后保存到后端

### T.7 添加流水线状态显示
**文件**：`client/src/pages/novels/components/NovelAutoDirectorProgressPanel.tsx`
- [x] 显示流水线模式状态
- [x] 显示细化进度和写作进度
- [x] 显示阻塞状态（如有）

---

## 阶段三：集成测试

### T.8 编写后端单元测试
**文件**：`server/tests/novelDirectorPipelineMode.test.js`
- [x] 测试流水线模式配置传递
- [x] 测试细化与写作交错执行
- [x] 测试人工审核阻塞机制
- [x] 测试暂停/恢复功能

### T.9 编写前端组件测试
**文件**：`client/src/pages/novels/components/__tests__/NovelAutoDirectorDialog.test.tsx`
- [x] 测试流水线模式复选框显示
- [x] 测试配置保存
- [x] 测试暂停状态下可修改

---

## 阶段四：文档更新

### T.10 更新文档
- [x] 更新 `docs/wiki/workflows/lazy-chapter-planning.md`
- [x] 更新 `docs/wiki/workflows/chapter-production-chain.md`
- [x] 添加流水线模式说明

---

## 任务依赖

```
T.1 → T.2 → T.3 → T.4
                ↓
T.5 → T.6 → T.7
                ↓
T.8 → T.9 → T.10
```

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 细化未完成就开始写作 | 写作失败 | 添加前置检查 |
| 并行执行导致资源竞争 | 性能下降 | 限制并行度 |
| 全局状态不一致 | 连续性问题 | 使用数据库事务 |
| 人工审核阻塞逻辑复杂 | 调试困难 | 添加详细日志 |

---

## 预估工时

| 阶段 | 预估工时 |
|------|----------|
| 阶段零：准备工作 | 0.5 天 |
| 阶段一：后端核心逻辑 | 2 天 |
| 阶段二：前端 UI | 1 天 |
| 阶段三：集成测试 | 1 天 |
| 阶段四：文档更新 | 0.5 天 |
| **总计** | **5 天** |
