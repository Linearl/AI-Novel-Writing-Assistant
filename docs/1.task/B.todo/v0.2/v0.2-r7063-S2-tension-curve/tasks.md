---
reqId: 7063
title: "Tension Curve 冲突曲线 — 任务清单"
status: requirements_ready
priority: P2
complexity: S2
estimatedEffort: "2-3天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7063: Tension Curve 冲突曲线 — 任务清单

## 阶段零：需求就绪

- [x] 需求文档完成
- [x] 技术设计完成
- [x] 任务清单完成
- [x] 决策日志完成

## 阶段一：基础组件移植（1 天）

> 参照上游 `client/src/components/tensionCurve/` 目录下 10 个文件

- [ ] T1: 分析上游 `tensionCurveTypes.ts` 类型定义，适配本项目类型（0.1 天）
- [ ] T2: 移植 `curveCoordinates.ts` 坐标计算工具（0.1 天）
- [ ] T3: 移植 `TensionCurveNodes.tsx` 自定义可拖拽节点（0.15 天）
- [ ] T4: 安装 `@xyflow/react` 和 `d3-shape` 依赖（0.05 天）
- [ ] T5: 移植 `TensionCurveFlowCanvas.tsx` React Flow 画布（0.2 天）
- [ ] T6: 验证：基础曲线可视化渲染正确（0.1 天）
- [ ] T7: 调整上游代码适配本项目的路由和数据结构（0.1 天）
- [ ] T8: 验证：曲线在小说编辑页正确嵌入（0.1 天）

## 阶段二：联动组件（0.5 天）

- [ ] T9: 移植 `TensionCurvePanel.tsx` 主面板容器（0.1 天）
- [ ] T10: 移植 `TensionCurveBeatContextStrip.tsx` 节拍上下文条（0.1 天）
- [ ] T11: 移植 `TensionCurveChapterDetailSidebar.tsx` 章节详情侧边栏（0.1 天）
- [ ] T12: 移植 `TensionCurveVolumeContextBar.tsx` 卷上下文栏（0.1 天）
- [ ] T13: 验证：面板布局和组件联动正确（0.1 天）

## 阶段三：分析与交互（0.5 天）

- [ ] T14: 移植 `tensionCurveAnalysis.ts` 节奏问题检测逻辑（0.1 天）
- [ ] T15: 适配检测逻辑中的章节数组为本项目类型（0.05 天）
- [ ] T16: 移植 `TensionCurveEditDialog.tsx` 精确数值编辑对话框（0.1 天）
- [ ] T17: 实现 PATCH 冲突值 API 路由（0.1 天）
- [ ] T18: 实现拖拽结束后的自动保存（0.05 天）
- [ ] T19: 实现批量更新 API（卷级别调整）（0.1 天）

## 阶段四：测试与验证（1 天）

- [ ] T20: 编写 `curveCoordinates` 单元测试（0.1 天）
- [ ] T21: 编写 `tensionCurveAnalysis` 单元测试（0.1 天）
- [ ] T22: 编写节点拖拽交互单元测试（0.1 天）
- [ ] T23: typecheck 全量验证（0.05 天）
- [ ] T24: pnpm test 通过（0.1 天）
- [ ] T25: 手动验证：曲线渲染、拖拽编辑、节奏检测（0.25 天）
- [ ] T26: 手动验证：侧边栏、卷上下文栏、节拍联动（0.2 天）
- [ ] T27: 性能验证：160 章节渲染 < 1s（0.1 天）

## 阶段五：收尾

- [ ] T28: 更新 requirements.md
- [ ] T29: 更新任务包 README 状态
- [ ] T30: 更新 run_result.json 状态
- [ ] T31: 提交变更

## 完成标准

- [ ] 所有任务完成
- [ ] 冲突曲线可视化完整（React Flow + d3-shape）
- [ ] 拖拽编辑可用
- [ ] 5 种节奏问题检测准确
- [ ] typecheck 通过
- [ ] 测试覆盖率 > 80%
- [ ] 160 章节渲染 < 1s
