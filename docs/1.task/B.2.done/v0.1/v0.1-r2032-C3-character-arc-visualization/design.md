---
description: "REQ-2032 方案设计"
---

# REQ-2032 方案设计 — 角色弧光可视化

## 1. 方案概述

后端新增两个聚合 API 端点（复用 REQ-2031 的 service 层），前端新增两个可视化组件：`CharacterArcTimeline`（时间线图）和 `CharacterRelationNetwork`（关系网络图），集成到角色管理页面。

### 1.1 设计目标

1. 复用 REQ-2031 的后端工具和数据格式，不重复查询逻辑
2. 时间线图用 recharts（与 REQ-2030 一致），关系网络图用 visx 或纯 SVG
3. 组件独立可复用，可在 narrative_advisor 对话中嵌入

### 1.2 关键决策

1. **关系网络图不用 d3-force**：d3 全量引入包体积过大（~250KB），用 `@visx/network` 或手动布局（角色数一般 <20，力导向计算量可控）
2. **时间线图复用 recharts**：与节奏曲线（REQ-2030）一致，减少依赖
3. **只显示 core 角色**：关系网络图默认只显示 `isCore=true` 的角色，减少拥挤

### 1.3 不在范围

- 不做弧光编辑、AI 分析、动画效果

## 2. 实现细节

### 2.1 后端

**新文件：`server/src/modules/novel/http/characterArcHttp.ts`**

两个端点：
- `GET /api/novels/:novelId/character-arcs`：聚合 `Character`（arc 字段）+ `CharacterTimeline` + `CharacterState`
- `GET /api/novels/:novelId/character-relations`：聚合 `CharacterRelationStage` + `CharacterRelation`

路由挂载到 novel 模块。

### 2.2 前端

**新文件：`client/src/components/novel/CharacterArcTimeline.tsx`**

```
CharacterArcTimeline
├── 角色选择下拉框
├── 弧光阶段标注（arcStart → Midpoint → Climax → End 背景色块）
├── ResponsiveContainer
│   └── ComposedChart
│       ├── XAxis（章节序号，按卷分组）
│       ├── YAxis（stressLevel 0-100）
│       ├── Area（stressLevel 渐变填充）
│       ├── Scatter（事件节点，hover 显示详情）
│       └── ReferenceLine（卷边界虚线）
```

**新文件：`client/src/components/novel/CharacterRelationNetwork.tsx`**

```
CharacterRelationNetwork
├── 节点：圆形，大小=重要性，颜色=castRole
├── 边：线段，粗细=trust+intimacy 综合，颜色=关系倾向
├── hover 边：tooltip 显示四维分数
└── 点击节点：切换到该角色的弧光时间线
```

布局方案：对于 <15 个角色，用简单的圆形布局或手写力导向；对于 >=15 个，引入 `@visx/network`。

### 2.3 集成位置

在角色管理页面（或 beat sheet 页面）新增"角色弧光"标签页，包含：
- 左侧：角色关系网络图
- 右侧：选中角色的弧光时间线图

## 3. 接口定义

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/api/novels/:novelId/character-arcs` | 角色弧光数据 |
| GET | `/api/novels/:novelId/character-relations` | 角色关系网络 |

## 4. 数据模型

不涉及。无新表。

## 5. 异常处理

| 场景 | 处理 |
| ---- | ---- |
| novelId 不存在 | 404 |
| 无角色数据 | 返回空数组，前端显示"暂无角色数据" |
| 关系数据缺失 | 节点显示但无边 |

## 6. 验证策略

1. `pnpm typecheck`
2. `pnpm test:client`
3. 手动 E2E：`pnpm dev` → 角色弧光标签页 → 选择角色 → 查看时间线和关系图
