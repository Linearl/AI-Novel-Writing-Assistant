---
description: "REQ-3003 任务拆解"
---

# REQ-3003 任务拆解

## 总览

| 阶段 | 内容 | 预估 | 依赖 |
|------|------|------|------|
| 0 | 数据流确认 | 30min | - |
| 1 | RepairProgressDialog 组件 | 1h | 阶段 0 |
| 2 | ActionPanel 接线 | 30min | 阶段 1 |
| 3 | Storybook / 视觉验证 | 30min | 阶段 2 |
| 4 | 类型检查 + lint | 15min | 阶段 3 |
| 5 | 文档更新 | 15min | 阶段 4 |

## 阶段 0：数据流确认

**目标**：确认 `ChapterExecutionActionPanel` 已收到的 props 是否足够支撑弹窗需求。

**DoD**：
- [ ] 确认 `repairRunStatus`（`SSEFrame<"run_status">`）包含 `phase` 和 `message` 字段
- [ ] 确认 `repairStreamContent` 在 NovelEdit 层存在且可传递到 ActionPanel
- [ ] 确认 `isRepairStreaming` / `isRepairingChapter` / `repairStreamingChapterId` 语义清晰

**当前状态**（已知）：
- `repairRunStatus` ✅ 已传入 ActionPanel（line 326）
- `repairStreamingChapterId` ✅ 已传入（line 327）
- `repairStreamContent` ❌ 未传入 ActionPanel — 仅传入 ReferencePanel
- `isSelectedChapterRepairing` ✅ 已 resolved（line 223）

## 阶段 1：新建 RepairProgressDialog 组件

**文件**：`client/src/pages/novels/components/RepairProgressDialog.tsx`（新建）

**Props 设计**：
```typescript
interface RepairProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streamContent: string;
  isStreaming: boolean;
  runStatus?: Extract<SSEFrame, { type: "run_status" }> | null;
  onAbort?: () => void;
}
```

**DoD**：
- [ ] Dialog 弹窗：使用项目已有的 Dialog 组件（shadcn/ui）
- [ ] 流式输出区：内嵌 `StreamOutput` 组件
- [ ] 标题区：显示 `runStatus?.phase ?? "修复中"` + `runStatus?.message`
- [ ] 关闭按钮：右上角 X + 底部"关闭"按钮
- [ ] 流式文本实时跟随
- [ ] 文件 < 200 行

## 阶段 2：ActionPanel 接线

**改动文件**：`ChapterExecutionActionPanel.tsx`（修改）

**改动内容**：
1. Props 新增：`repairStreamContent: string`
2. 内部状态：`const [showRepairDialog, setShowRepairDialog] = useState(false)`
3. "查看详情"按钮：
   - 条件渲染：`isSelectedChapterRepairing` 时显示
   - 位置：在"自动修复问题"按钮下方（同一 grid 内）
   - 点击：`setShowRepairDialog(true)`
4. 引入 `<RepairProgressDialog>` 组件

**DoD**：
- [ ] "查看详情"按钮仅在修复进行中显示
- [ ] 弹窗正确传递 `streamContent`、`isStreaming`、`runStatus`
- [ ] 不改变现有按钮行为

## 阶段 3：视觉验证

**DoD**：
- [ ] 启动 `pnpm dev`，手动验证：审校 → 修复 → 查看详情 → 弹窗显示流式输出
- [ ] 弹窗在 light/dark 模式下正常显示（项目已有 dark mode）
- [ ] 修复完成后弹窗保持可查看

## 阶段 4：类型检查 + lint

**DoD**：
- [ ] `pnpm typecheck` 通过
- [ ] 无新增 lint warning

## 阶段 5：文档更新

**DoD**：
- [ ] 更新 `docs_dev/INDEX.md`
- [ ] 更新 `requirements.md`（via `req-sync`）
