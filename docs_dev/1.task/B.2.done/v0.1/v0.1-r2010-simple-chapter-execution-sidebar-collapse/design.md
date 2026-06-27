---
description: "REQ-2010 方案设计"
---

# REQ-2010 方案设计

## 1. 方案概述

在 `ChapterManagementTab.tsx` 中新增折叠状态，通过动态切换 grid 列定义实现右侧边栏的折叠/展开。折叠按钮放在 Tab 栏最左侧，状态持久化到 localStorage。参考项目中已有的 `Sidebar.tsx` 和 `NovelWorkspaceRail.tsx` 折叠模式。

### 1.1 关键决策

1. **Grid 列定义动态切换**：折叠时从 `332px` 变为 `40px`（仅显示折叠按钮），不完全移除列（避免布局跳变）
2. **localStorage 持久化**：参考 `Sidebar.tsx` 的 `ai-novel.sidebar.collapsed` 模式
3. **CSS transition**：`grid-template-columns` 使用 200ms ease-in-out 过渡
4. **仅 xl 断点生效**：移动端已是单栏堆叠，不需要折叠

## 2. 实现细节

### 2.1 折叠状态

`ChapterManagementTab.tsx` 新增状态：

```typescript
const [rightRailCollapsed, setRightRailCollapsed] = useState(() => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("ai-novel.chapter-execution.right-rail.collapsed") === "true";
});

const toggleRightRail = useCallback(() => {
  setRightRailCollapsed((prev) => {
    const next = !prev;
    localStorage.setItem("ai-novel.chapter-execution.right-rail.collapsed", String(next));
    return next;
  });
}, []);
```

### 2.2 Grid 布局切换

```tsx
<div
  className={cn(
    "flex flex-col gap-4 xl:grid xl:h-[calc(100dvh-8rem)] xl:items-stretch",
    rightRailCollapsed
      ? "xl:grid-cols-[300px_minmax(0,1fr)_40px]"
      : "xl:grid-cols-[300px_minmax(0,1fr)_332px]",
    "transition-[grid-template-columns] duration-200 ease-in-out",
  )}
>
```

### 2.3 折叠按钮

在 TabsList 最左侧插入按钮：

```tsx
<TabsList className="...">
  <button
    onClick={toggleRightRail}
    className="flex h-full w-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
    title={rightRailCollapsed ? "展开侧栏" : "折叠侧栏"}
  >
    {rightRailCollapsed ? (
      <ChevronLeft className="h-4 w-4" />
    ) : (
      <ChevronRight className="h-4 w-4" />
    )}
  </button>
  {!rightRailCollapsed && (
    <>
      <TabsTrigger value="insights">动态栏</TabsTrigger>
      <TabsTrigger value="reference">资料诊断</TabsTrigger>
      <TabsTrigger value="agent">AI 执行台</TabsTrigger>
    </>
  )}
</TabsList>
```

### 2.4 折叠状态下内容隐藏

```tsx
{!rightRailCollapsed && (
  <>
    <TabsContent value="insights">...</TabsContent>
    <TabsContent value="reference">...</TabsContent>
    <TabsContent value="agent">...</TabsContent>
  </>
)}
```

折叠时仅显示 TabsList（含折叠按钮），TabsContent 全部隐藏。

### 2.5 TabsList 样式适配

折叠时 TabsList 从 `grid-cols-3` 变为不需要 grid（仅一个按钮）：

```tsx
<TabsList
  className={cn(
    "h-auto w-full shrink-0 rounded-xl bg-muted/50 p-1.5",
    rightRailCollapsed ? "flex" : "grid grid-cols-4",  // 4 = 1 button + 3 tabs
  )}
>
```

## 3. 涉及文件

| 文件 | 改动类型 | 说明 |
| ---- | ---- | ---- |
| `client/src/pages/novels/components/ChapterManagementTab.tsx` | 修改 | 新增折叠状态、折叠按钮、Grid 列切换 |

仅需修改一个文件。
