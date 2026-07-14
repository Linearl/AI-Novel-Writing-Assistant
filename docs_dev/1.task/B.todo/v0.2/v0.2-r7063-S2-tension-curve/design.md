---
reqId: 7063
title: "Tension Curve 冲突曲线 — 技术设计"
status: requirements_ready
priority: P2
complexity: S2
estimatedEffort: "2-3天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7063: Tension Curve 冲突曲线 — 技术设计

## 1. 架构设计

### 1.1 组件结构

```
client/src/components/tensionCurve/    ← 直接参照上游目录
├── TensionCurvePanel.tsx              // 主面板容器
├── TensionCurveFlowCanvas.tsx         // React Flow 画布
├── TensionCurveNodes.tsx              // 自定义节点（可拖拽）
├── TensionCurveEditDialog.tsx         // 精确数值编辑对话框
├── TensionCurveBeatContextStrip.tsx   // 节拍上下文条
├── TensionCurveChapterDetailSidebar.tsx // 章节详情侧边栏
├── TensionCurveVolumeContextBar.tsx   // 卷上下文栏
├── curveCoordinates.ts               // 坐标计算工具
├── tensionCurveAnalysis.ts           // 节奏问题检测
└── tensionCurveTypes.ts              // 类型定义
```

### 1.2 数据流

```
API 层
  ↓
fetchNovelChapters(novelId) → Chapter[]  // 获取所有章节
  ↓
TensionCurvePanel                         // 主面板
  ├── TensionCurveVolumeContextBar        // 卷上下文信息
  ├── TensionCurveFlowCanvas              // React Flow 画布
  │   ├── TensionCurveNodes               // 可拖拽节点
  │   │   └── onDragEnd → PATCH API       // 保存冲突值
  │   └── curveCoordinates               // 坐标映射
  ├── TensionCurveBeatContextStrip         // 节拍上下文
  └── TensionCurveChapterDetailSidebar     // 侧边栏详情
        └── TensionCurveEditDialog         // 精确编辑
```

### 1.3 React Flow 集成

```typescript
// TensionCurveFlowCanvas.tsx 核心结构
import { ReactFlow, Node, Edge, useNodesState, useEdgesState } from "@xyflow/react";
import { curveMonotoneX } from "d3-shape";

// 章节节点定义
const chapterNodes: Node[] = chapters.map((ch, i) => ({
  id: ch.id,
  type: "tensionNode",
  position: { x: i * NODE_SPACING, y: 100 - ch.conflictLevel },
  data: { chapter: ch, value: ch.conflictLevel },
}));

// 平滑曲线边
const curveEdges: Edge[] = chapters.slice(0, -1).map((ch, i) => ({
  id: `${ch.id}-${chapters[i + 1].id}`,
  source: ch.id,
  target: chapters[i + 1].id,
  type: "smoothstep",
  style: { stroke: getConflictColor(ch.conflictLevel), strokeWidth: 2 },
}));
```

## 2. 详细设计

### 2.1 FR-1: 交互式可视化

**参考上游**：`TensionCurveFlowCanvas.tsx` + `curveCoordinates.ts`

#### 坐标计算

```typescript
// curveCoordinates.ts
export function computeCurveCoordinates(
  chapters: Chapter[],
  bounds: { width: number; height: number }
): CurvePoint[] {
  const xScale = scaleLinear()
    .domain([0, chapters.length - 1])
    .range([0, bounds.width]);

  const yScale = scaleLinear()
    .domain([0, 100])  // 冲突值范围
    .range([bounds.height, 0]);

  return chapters.map((ch, i) => ({
    x: xScale(i),
    y: yScale(ch.conflictLevel),
    chapter: ch,
  }));
}

// d3-shape 曲线生成
export function generateCurvePath(points: CurvePoint[]): string {
  const lineGenerator = line<CurvePoint>()
    .x((d) => d.x)
    .y((d) => d.y)
    .curve(curveMonotoneX);

  return lineGenerator(points) ?? "";
}
```

### 2.2 FR-2: 拖拽编辑

**参考上游**：`TensionCurveNodes.tsx` + `TensionCurveEditDialog.tsx`

```typescript
// TensionCurveNodes.tsx 核心逻辑
function TensionNode({ data }: NodeProps) {
  const { chapter, value } = data;

  const handleDrag = useCallback((event: DragEvent, delta: { dx: number; dy: number }) => {
    // 计算新冲突值（限制 0-100）
    const newValue = Math.max(0, Math.min(100, value - delta.dy));
    // 实时更新本地状态
    updateNodePosition(chapter.id, newValue);
  }, [value, chapter.id]);

  const handleDragEnd = useCallback(async () => {
    // 保存到后端
    await PATCH `/api/novels/${novelId}/chapters/${chapter.id}/conflict-level`,
      { conflictLevel: currentValue }
  }, [chapter.id, currentValue]);

  return (
    <div
      draggable
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      style={{ transform: `translateY(${100 - value}px)` }}
    >
      <span>{chapter.title}</span>
      <span>{value}</span>
    </div>
  );
}
```

### 2.3 FR-3: 节奏问题检测

**参考上游**：`tensionCurveAnalysis.ts`

```typescript
// tensionCurveAnalysis.ts
type IssueCode = "flatPlateau" | "lateClimax" | "earlyPeak" | "noTension" | "excessiveTension";

interface TensionIssue {
  code: IssueCode;
  severity: "warning" | "critical";
  affectedChapters: string[];  // chapter IDs
  description: string;
  suggestion: string;
}

export function analyzeTensionCurve(chapters: Chapter[]): TensionIssue[] {
  const issues: TensionIssue[] = [];
  const values = chapters.map((ch) => ch.conflictLevel);

  // 检测平坦高原
  issues.push(...detectFlatPlateau(chapters, values));
  // 检测高潮过迟
  issues.push(...detectLateClimax(chapters, values));
  // 检测高潮过早
  issues.push(...detectEarlyPeak(chapters, values));
  // 检测无冲突
  issues.push(...detectNoTension(chapters, values));
  // 检测冲突过度
  issues.push(...detectExcessiveTension(chapters, values));

  return issues;
}

function detectFlatPlateau(chapters: Chapter[], values: number[]): TensionIssue[] {
  const issues: TensionIssue[] = [];
  let consecutive = 0;
  let startIdx = 0;

  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - values[i - 1]) < 10) {
      if (consecutive === 0) startIdx = i - 1;
      consecutive++;
    } else {
      if (consecutive >= 5) {
        issues.push({
          code: "flatPlateau",
          severity: "warning",
          affectedChapters: chapters.slice(startIdx, i).map((ch) => ch.id),
          description: `第 ${startIdx + 1}-${i} 章冲突值波动不足，节奏过于平坦`,
          suggestion: "考虑在该区间增加冲突事件或悬念来提升紧张感",
        });
      }
      consecutive = 0;
    }
  }

  return issues;
}
```

### 2.4 FR-4/5/6: 联动组件

```typescript
// TensionCurveBeatContextStrip.tsx
// 显示当前悬停章节对应的节拍信息

// TensionCurveChapterDetailSidebar.tsx
// 侧边栏显示章节详情 + 精确数值编辑

// TensionCurveVolumeContextBar.tsx
// 顶部显示卷名、章节数、平均冲突值
```

### 2.5 API 接口

```typescript
// 冲突值更新 API
PATCH /api/novels/:novelId/chapters/:chapterId/conflict-level
Body: { conflictLevel: number }
Response: { success: boolean; data: Chapter }

// 批量更新 API（卷级别）
PATCH /api/novels/:novelId/volumes/:volumeId/conflict-level
Body: { conflictLevel: number; applyTo: "all" | "remaining" }
Response: { success: boolean; data: Chapter[] }
```

## 3. 实现步骤

### Phase 1: 基础组件移植（1 天）

1. 分析上游 `tensionCurveTypes.ts`，适配本项目类型定义
2. 移植 `curveCoordinates.ts` 坐标计算
3. 移植 `TensionCurveNodes.tsx` 节点组件
4. 移植 `TensionCurveFlowCanvas.tsx` 画布组件

### Phase 2: 联动组件（0.5 天）

1. 移植 `TensionCurvePanel.tsx` 主面板
2. 移植 `TensionCurveBeatContextStrip.tsx` 节拍上下文
3. 移植 `TensionCurveChapterDetailSidebar.tsx` 侧边栏
4. 移植 `TensionCurveVolumeContextBar.tsx` 卷上下文栏

### Phase 3: 分析与交互（0.5 天）

1. 移植 `tensionCurveAnalysis.ts` 节奏检测
2. 移植 `TensionCurveEditDialog.tsx` 编辑对话框
3. 实现拖拽保存 API
4. 实现批量更新 API

### Phase 4: 测试与验证（1 天）

1. 类型适配和接口对齐
2. 单元测试（坐标计算、节奏检测）
3. typecheck 验证
4. 手动验证交互功能

## 4. 测试计划

```typescript
describe("curveCoordinates", () => {
  it("should map chapter index to x coordinate", () => {
    const points = computeCurveCoordinates(mockChapters, { width: 800, height: 400 });
    expect(points[0].x).toBe(0);
    expect(points[points.length - 1].x).toBe(800);
  });

  it("should map conflict value to y coordinate", () => {
    const points = computeCurveCoordinates(mockChapters, { width: 800, height: 400 });
    // conflictLevel=50 should map to middle
    expect(points.find((p) => p.chapter.conflictLevel === 50)?.y).toBeCloseTo(200);
  });
});

describe("tensionCurveAnalysis", () => {
  it("should detect flat plateau", () => {
    const flatChapters = Array(8).fill({ conflictLevel: 50, id: "ch-" });
    const issues = analyzeTensionCurve(flatChapters);
    expect(issues.some((i) => i.code === "flatPlateau")).toBe(true);
  });

  it("should detect no tension", () => {
    const noTensionChapters = Array(5).fill({ conflictLevel: 10, id: "ch-" });
    const issues = analyzeTensionCurve(noTensionChapters);
    expect(issues.some((i) => i.code === "noTension")).toBe(true);
  });

  it("should not flag varied tension", () => {
    const variedChapters = [
      { conflictLevel: 30 }, { conflictLevel: 70 }, { conflictLevel: 45 },
      { conflictLevel: 80 }, { conflictLevel: 20 }, { conflictLevel: 60 },
    ].map((ch, i) => ({ ...ch, id: `ch-${i}` }));
    const issues = analyzeTensionCurve(variedChapters);
    expect(issues.filter((i) => i.code === "flatPlateau")).toHaveLength(0);
  });
});
```

## 5. 交付物

- [ ] `client/src/components/tensionCurve/` — 10 个组件文件
- [ ] API 路由（冲突值更新） — 1-2 个路由文件
- [ ] `client/tests/components/tensionCurve/` — 单元测试
