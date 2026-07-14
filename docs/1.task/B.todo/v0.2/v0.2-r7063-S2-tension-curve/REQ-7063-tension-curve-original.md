---
reqId: 7063
title: "Tension Curve 冲突曲线 — 需求文档（冻结副本）"
status: requirements_ready
priority: P2
complexity: S2
estimatedEffort: "2-3天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7063: Tension Curve 冲突曲线 — 冻结副本

> 此为需求冻结副本。工作副本见 `REQ-7063-tension-curve.md`。

## 功能需求概要

| 编号 | 功能 | 优先级 | 预估 |
|------|------|--------|------|
| FR-1 | 交互式冲突强度可视化（React Flow + d3-shape） | P2 | 0.5 天 |
| FR-2 | 拖拽编辑（实时反馈 + 保存） | P2 | 0.3 天 |
| FR-3 | 节奏问题自动检测（5 种问题码） | P2 | 0.3 天 |
| FR-4 | 节拍表上下文联动 | P2 | 0.2 天 |
| FR-5 | 章节详情侧边栏 | P2 | 0.2 天 |
| FR-6 | 卷上下文栏 | P2 | 0.1 天 |
| FR-7 | 主面板容器 | P2 | 0.2 天 |

## 上游参考

`client/src/components/tensionCurve/` 目录下 10 个文件，总计约 1500+ 行代码。

| 文件 | 说明 |
|------|------|
| `TensionCurvePanel.tsx` | 主面板容器 |
| `TensionCurveFlowCanvas.tsx` | React Flow 画布 |
| `TensionCurveNodes.tsx` | 自定义节点 |
| `TensionCurveEditDialog.tsx` | 编辑对话框 |
| `TensionCurveBeatContextStrip.tsx` | 节拍上下文条 |
| `TensionCurveChapterDetailSidebar.tsx` | 章节详情侧边栏 |
| `TensionCurveVolumeContextBar.tsx` | 卷上下文栏 |
| `curveCoordinates.ts` | 坐标计算 |
| `tensionCurveAnalysis.ts` | 节奏分析 |
| `tensionCurveTypes.ts` | 类型定义 |

## 冻结日期

2026-07-14
