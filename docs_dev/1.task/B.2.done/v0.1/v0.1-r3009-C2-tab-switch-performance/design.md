---
description: "REQ-3009 Tab 切换性能优化 方案设计"
update_time: 2026-07-03
---

# REQ-3009 方案设计

## 1. 方案概述

通过三项前端性能优化解决 Tab 切换延迟：条件查询 staleTime 缓存、workflow stage sync 防抖、invalidateNovelDetail 查询失效精细化。

### 1.1 设计目标

1. 已访问 tab 切换回来时不再触发网络请求（staleTime 缓存）
2. 快速切换 tab 时 sync 只触发一次（防抖）
3. tab 切换时只失效相关 query，避免级联刷新

### 1.2 关键决策

1. **staleTime 30 秒**：条件查询（volumeWorkspace、qualityReport、latestState）设置 `staleTime: 30_000`，30 秒内切换回来不重新请求
2. **2 秒防抖**：`syncNovelWorkflowStageSilently` 添加 2 秒防抖，覆盖快速切换场景
3. **按 tab 精细化失效**：根据切换目标 tab 类型，只 invalidate 相关 query key

### 1.3 不在范围

- NovelEdit 组件拆分（架构级重构）
- React.memo / useMemo 优化
- 虚拟列表

## 2. 实现细节

### 2.1 条件查询 staleTime

为以下条件查询设置 `staleTime: 30_000`：

| Query | 位置 |
|-------|------|
| volumeWorkspace | NovelEdit 页面 |
| qualityReport | NovelEdit 页面 |
| latestState | NovelEdit 页面 |

```typescript
useQuery({
  queryKey: ['volumeWorkspace', novelId],
  queryFn: () => fetchVolumeWorkspace(novelId),
  staleTime: 30_000,
  enabled: !!novelId,
})
```

### 2.2 workflow stage sync 防抖

为 `syncNovelWorkflowStageSilently` 添加 2 秒防抖：

```typescript
import { debounce } from 'lodash'

const debouncedSync = debounce(syncNovelWorkflowStageSilently, 2000)
```

调用处改用 `debouncedSync` 替代直接调用。

### 2.3 invalidateNovelDetail 精细化

按 tab 类型定义失效策略：

| Tab | 需失效的 query key |
|-----|---------------------|
| 章节 | chapters, chapterDetail |
| 角色 | characters, characterRelations |
| 世界观 | worldBuilding, worldSlices |
| 时间线 | timeline, timelineEvents |
| 知识库 | knowledge |

```typescript
function invalidateTabQueries(tabType: NovelTabType) {
  const queryKeyMap: Record<NovelTabType, string[]> = {
    chapters: ['chapters', 'chapterDetail'],
    characters: ['characters', 'characterRelations'],
    worldbuilding: ['worldBuilding', 'worldSlices'],
    timeline: ['timeline', 'timelineEvents'],
    knowledge: ['knowledge'],
  }
  
  const keys = queryKeyMap[tabType] ?? []
  keys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }))
}
```

## 3. 验证策略

1. 性能测试：切换 tab 前后记录网络请求数，优化后应减少 60%+
2. 功能测试：各 tab 内容正确加载，无数据过期
3. 防抖测试：快速切换 5 次 tab，sync 只触发 1 次
