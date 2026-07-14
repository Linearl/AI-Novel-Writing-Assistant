---
description: "REQ-3003 方案设计"
---

# REQ-3003 方案设计

## 1. 决策概述

在 `ChapterExecutionActionPanel` 中新增"查看详情"按钮 + `RepairProgressDialog` 弹窗组件。数据流完全复用现有的 `repairSSE` hook，不增加新的数据获取逻辑。

## 2. 关键决策

### D-01：弹窗组件独立 vs 内嵌

**选择**：独立组件 `RepairProgressDialog.tsx`

**理由**：
- 单一职责：弹窗只负责渲染流式输出 + 状态
- 未来其他地方（如 PipelineTab）可直接复用
- ActionPanel 保持 ~470 行不膨胀

**备选方案**：直接在 ActionPanel 中内嵌 Dialog 代码  
**否决原因**：ActionPanel 已经 ~470 行，不应继续膨胀

### D-02：StreamOutput 复用 vs 自定义渲染

**选择**：复用 `StreamOutput` 组件

**理由**：
- `StreamOutput` 已在 ReferencePanel 的 repair 标签中用于同样场景
- 自带流式动画、字数统计、Markdown 渲染
- 避免重复造轮子

### D-03："查看详情"按钮位置

**选择**：在修复按钮下方，同一 `div.grid` 内，作为第三个辅助按钮

**理由**：
- 视觉层级：主按钮 → 次按钮 → 辅助按钮，符合现有模式
- `showQuickRepairAction` 段已有类似逻辑（打开编辑器 / 运行审校 / 自动修复），加一个"查看详情"自然延续这个模式

**备选方案**：放在"当前最推荐动作"卡片外  
**否决原因**：修复进度与修复按钮强关联，分离会割裂操作流

## 3. 实现细节

### 3.1 组件树

```
ChapterExecutionActionPanel
├── 当前最推荐动作 Card
│   ├── PrimaryActionButton
│   ├── "打开章节编辑器" (showQuickEditorAction)
│   ├── "运行完整审校" (showQuickAuditAction)
│   └── "自动修复问题" (showQuickRepairAction)
│       └── "查看详情" (NEW: showRepairProgressButton)
└── RepairProgressDialog (NEW: 条件渲染)
    └── StreamOutput
```

### 3.2 数据流

```
NovelEdit.tsx
  └── repairSSE (useSSE hook)
      ├── content → repairStreamContent
      ├── isStreaming → isRepairStreaming
      ├── latestRun → repairRunStatus
      └── chapterId → repairStreamingChapterId
          │
          ▼
  ChapterManagementTab (pass-through)
          │
          ▼
  ChapterExecutionActionPanel
      ├── repairStreamContent (NEW prop)
      ├── isRepairingChapter (existing)
      ├── repairStreamingChapterId (existing)
      ├── repairRunStatus (existing)
      └── repairActionKind (existing)
          │
          ▼
  RepairProgressDialog (new)
      ├── open / onOpenChange (local state)
      ├── streamContent
      ├── isStreaming
      ├── runStatus
      └── onAbort (passed from parent)
```

### 3.3 Props 变更

ChapterExecutionActionPanel 新增 1 个 prop：

```typescript
repairStreamContent: string;  // NEW
```

Parent (ChapterManagementTab) 新增 1 个 prop 传递（从 NovelEdit 已有）：

```typescript
repairStreamContent: string;
```

### 3.4 条件渲染逻辑

```
"查看详情"按钮显示条件:
  isSelectedChapterRepairing === true

"查看详情"按钮隐藏条件:
  isSelectedChapterRepairing === false（修复未启动或已结束）
```

## 4. 文件变更清单

| 文件 | 操作 | 行数预估 |
|------|------|----------|
| `client/.../RepairProgressDialog.tsx` | 新建 | ~120 行 |
| `client/.../ChapterExecutionActionPanel.tsx` | 修改 | +30 行 |
| `client/.../ChapterManagementTab.tsx` | 修改 | +2 行 |
| `client/.../NovelEditView.types.ts` | 修改 | +1 行 |
