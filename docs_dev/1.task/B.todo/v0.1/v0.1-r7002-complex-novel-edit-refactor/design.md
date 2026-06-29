---
description: "REQ-7002 NovelEdit.tsx 拆分方案设计"
---

# REQ-7002 NovelEdit.tsx 拆分方案设计

> 状态：待补充（开发阶段产出）

## 1. 现状分析

`client/src/pages/novels/NovelEdit.tsx` 当前 2731 行，包含：
- 页面级状态管理（多个 useState/useEffect）
- 数据加载与缓存逻辑
- 标签页切换与内容渲染
- 顶部工具栏
- 各种事件处理函数

## 2. 拆分目标

将 2731 行拆分为 5-8 个文件，每个 ≤ 600 行。

## 3. 拆分方案

> 待 T1 分析完成后补充具体方案。

### 3.1 候选拆分单元

| 文件 | 职责 | 来源行范围（估） |
|------|------|------------------|
| `NovelEdit.tsx` | 页面编排、路由、标签页壳 | 待定 |
| `useNovelEditState.ts` | 状态声明与初始化 | 待定 |
| `useNovelEditActions.ts` | 操作处理函数 | 待定 |
| `NovelEditHeader.tsx` | 顶部工具栏渲染 | 待定 |
| `NovelEditTabContent.tsx` | 标签页内容分发 | 待定 |
| `novelEdit.constants.ts` | 常量与配置 | 待定 |

### 3.2 状态策略

> 待分析后补充：哪些状态保留在主文件、哪些下沉到 hooks。

## 4. 验证策略

- 每步拆分后 typecheck
- 最终 build + 手动验证
