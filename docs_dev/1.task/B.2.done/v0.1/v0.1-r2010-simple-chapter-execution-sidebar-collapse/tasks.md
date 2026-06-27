---
description: "REQ-2010 任务拆解"
---

# REQ-2010 任务拆解

> 状态：⏳ 进行中

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | ChapterManagementTab：新增折叠状态 + localStorage 持久化 | P0 | 0.25h | ⬜ 待开始 |
| T2 | ChapterManagementTab：Grid 列定义动态切换 | P0 | 0.5h | ⬜ 待开始 |
| T3 | ChapterManagementTab：Tab 栏最左侧插入折叠按钮 | P0 | 0.5h | ⬜ 待开始 |
| T4 | ChapterManagementTab：折叠时隐藏 TabsContent | P0 | 0.25h | ⬜ 待开始 |
| T5 | ChapterManagementTab：CSS transition 平滑过渡 | P1 | 0.25h | ⬜ 待开始 |
| T6 | 验证：低分辨率屏幕下正文区扩展效果 | P1 | 0.25h | ⬜ 待开始 |
| T7 | 验证：折叠状态持久化 + 页面刷新恢复 | P1 | 0.25h | ⬜ 待开始 |

---

### T1: 折叠状态

**改动点**: `ChapterManagementTab.tsx` (line 106 附近)
**DoD**: `rightRailCollapsed` state + `toggleRightRail` callback + localStorage 读写

### T2: Grid 列切换

**改动点**: `ChapterManagementTab.tsx` (line 177)
**DoD**: `xl:grid-cols-[300px_minmax(0,1fr)_332px]` ↔ `xl:grid-cols-[300px_minmax(0,1fr)_40px]`

### T3: 折叠按钮

**改动点**: `ChapterManagementTab.tsx` (lines 226-230 TabsList)
**DoD**: 按钮在 TabsList 最左侧，`>` 折叠 / `<` 展开

### T4: 内容隐藏

**改动点**: `ChapterManagementTab.tsx` (lines 231-330 TabsContent)
**DoD**: 折叠时 TabsContent 不渲染

### T5: 动画

**改动点**: `ChapterManagementTab.tsx` grid div
**DoD**: `transition-[grid-template-columns] duration-200`

### T6-T7: 验证

**DoD**: 低分辨率屏幕正文区扩展，状态刷新后保持
