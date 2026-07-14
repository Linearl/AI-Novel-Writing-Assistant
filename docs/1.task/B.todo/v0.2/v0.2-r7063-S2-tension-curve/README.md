---
reqId: 7063
title: "Tension Curve 冲突曲线"
status: requirements_ready
priority: P2
complexity: S2
estimatedEffort: "2-3天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7063: Tension Curve 冲突曲线

## 概述

交互式冲突强度可视化组件，支持 0-100 冲突强度编辑，React Flow + d3-shape 曲线渲染，自动检测节奏问题（平坦高原、高潮过迟），支持拖拽编辑。上游仓库有完整 10 文件组件集可直接移植。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7063.md](./REQ-7063-tension-curve.md) | 需求文档（工作副本） |
| [REQ-7063-tension-curve-original.md](./REQ-7063-tension-curve-original.md) | 冻结副本 |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：requirements_ready
- 复杂度：S2
- 优先级：P2
- 预估工时：2-3 天
- 依赖：无（与 REQ-7060 FR-5 共享上游参考）
- 预估影响文件：10-12 个

## 上游参考

| 上游路径 | 说明 | 文件数 |
|----------|------|--------|
| `client/src/components/tensionCurve/` | 完整冲突曲线组件集 | 10 文件 |

### 上游文件清单

| 文件 | 说明 |
|------|------|
| `TensionCurvePanel.tsx` | 主面板容器 |
| `TensionCurveFlowCanvas.tsx` | React Flow 画布 |
| `TensionCurveNodes.tsx` | 自定义节点组件 |
| `TensionCurveEditDialog.tsx` | 编辑对话框 |
| `TensionCurveBeatContextStrip.tsx` | 节奏上下文条 |
| `TensionCurveChapterDetailSidebar.tsx` | 章节详情侧边栏 |
| `TensionCurveVolumeContextBar.tsx` | 卷上下文栏 |
| `curveCoordinates.ts` | 曲线坐标计算 |
| `tensionCurveAnalysis.ts` | 节奏问题检测 |
| `tensionCurveTypes.ts` | 类型定义 |
