---
description: "REQ-2030 方案设计"
---

# REQ-2030 方案设计 — 节奏曲线可视化与调整

## 1. 方案概述

后端新增一个聚合 API 端点，从 `VolumeChapterPlan`（规划值）和 `Chapter`（实际值）汇总节奏数据；前端新增基于 recharts 的折线图组件，支持查看全书节奏走势并直接调整未写章节的节奏参数。

### 1.1 设计目标

1. 复用现有 `conflictLevel` / `revealLevel` 字段，不新增数据库列
2. 图表交互直观：实心/空心区分已写/未写，点击即编辑
3. 调整结果实时保存到 `VolumeChapterPlan`，与 beat sheet 流程一致

### 1.2 关键决策

1. **图表库选择 recharts**：项目已有 React 19 + Vite，recharts 与 React 19 兼容良好，API 简洁；若安装后发现冲突则降级为 visx 或纯 SVG
2. **API 粒度：按小说聚合**：一个端点返回全书所有卷的节奏数据，前端一次性渲染，避免多次请求
3. **编辑目标：VolumeChapterPlan**：未写章节的节奏调整写入规划表（`VolumeChapterPlan`），与 beat sheet 生成流程保持一致；已写章节的值来自 `Chapter` 表，只读

### 1.3 不在范围

- 不新增 pacingScore 曲线（已写章节可后期叠加）
- 不做 AI 节奏建议
- 不修改 beat sheet 生成流程

## 2. 实现细节

### 2.1 后端

**新文件：`server/src/modules/novel/http/paceCurveHttp.ts`**

```typescript
// 伪代码
router.get("/novels/:novelId/pace-curve", async (req, res) => {
  const { novelId } = req.params;
  
  // 1. 加载所有 VolumeChapterPlan，按 volumeSortOrder 排序
  const chapterPlans = await prisma.volumeChapterPlan.findMany({
    where: { volume: { novelId } },
    include: { volume: true },
    orderBy: [{ volume: { sortOrder: "asc" } }, { order: "asc" }],
  });
  
  // 2. 加载已存在的 Chapter（已写章节）
  const chapters = await prisma.chapter.findMany({
    where: { novelId },
    orderBy: { order: "asc" },
  });
  const chapterMap = new Map(chapters.map(c => [c.order, c]));
  
  // 3. 组装：每卷 → 每章，合并规划值与实际值
  const volumes = groupByVolume(chapterPlans).map(vol => ({
    volumeId: vol.id,
    volumeSortOrder: vol.sortOrder,
    title: vol.title,
    chapters: vol.chapterPlans.map(cp => {
      const written = chapterMap.get(cp.order);
      return {
        chapterId: written?.id ?? null,
        order: cp.order,
        title: written?.title ?? cp.title ?? `第${cp.order}章`,
        conflictLevel: written?.conflictLevel ?? cp.conflictLevel ?? null,
        revealLevel: written?.revealLevel ?? cp.revealLevel ?? null,
        pacingScore: written?.pacingScore ?? null,
        status: written?.status ?? "planned",
        isWritten: !!written,
      };
    }),
  }));
  
  res.json({ volumes });
});
```

**路由注册**：在 `server/src/modules/novel/http/` 下注册新路由，挂载到 `/api/novels/:novelId/pace-curve`。

### 2.2 前端

**新文件：`client/src/components/novel/PaceCurveChart.tsx`**

组件结构：
```
PaceCurveChart
├── 图例（conflictLevel 红 / revealLevel 蓝，可点击切换）
├── ResponsiveContainer
│   └── LineChart
│       ├── XAxis（章节序号，按卷分组 label）
│       ├── YAxis（0-100）
│       ├── ReferenceLine（卷边界虚线）
│       ├── Line × 2（conflictLevel 红 / revealLevel 蓝）
│       └── Tooltip（章节标题 + 数值）
└── PaceAdjustModal（点击空心点时弹出）
    ├── 章节标题
    ├── conflictLevel Slider
    ├── revealLevel Slider
    └── 保存按钮 → PATCH API
```

**新文件：`client/src/components/novel/PaceAdjustModal.tsx`**

调整面板：两个 Slider + 保存按钮，调用已有的 `PATCH /api/novels/:novelId/volumes/:volumeId/chapter-plans/:order` 端点。

**集成位置**：在步骤 6（章节执行）或 beat sheet 页面中新增"节奏曲线"标签页/卡片。

### 2.3 共享类型

**文件：`shared/types/novel.ts`**

新增接口：
```typescript
interface PaceCurveChapter {
  chapterId: string | null;
  order: number;
  title: string;
  conflictLevel: number | null;
  revealLevel: number | null;
  pacingScore: number | null;
  status: string;
  isWritten: boolean;
}

interface PaceCurveVolume {
  volumeId: string;
  volumeSortOrder: number;
  title: string;
  chapters: PaceCurveChapter[];
}

interface PaceCurveData {
  volumes: PaceCurveVolume[];
}
```

## 3. 接口定义

| 方法 | 路径 | 说明 | 权限 |
| ---- | ---- | ---- | ---- |
| GET | `/api/novels/:novelId/pace-curve` | 节奏数据聚合 | 用户 |
| PATCH | `/api/novels/:novelId/volumes/:volumeId/chapter-plans/:order` | 更新章节规划节奏参数 | 用户（已有端点） |

## 4. 数据模型

不涉及。无新表、无新列。

## 5. 异常处理

| 错误码 | 场景 | 处理方式 |
| ---- | ---- | ---- |
| 404 | novelId 不存在 | 返回标准 404 |
| 200 (空) | 尚无 VolumeChapterPlan | 返回 `{ volumes: [] }`，前端显示占位文案 |

## 6. 验证策略

1. `pnpm typecheck` 通过
2. `pnpm test:client` 通过
3. 手动 E2E：`pnpm dev` → 打开已有小说 → 查看节奏曲线 → 调整未写章节参数 → 刷新验证持久化
