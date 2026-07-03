---
description: "REQ-3003 决策留痕"
---

# REQ-3003 决策留痕

## D-01：弹窗组件独立 vs 内嵌

- **日期**：2026-06-26
- **决策者**：AI（Claude）
- **选择**：独立组件 `RepairProgressDialog.tsx`
- **备选**：直接内嵌在 ActionPanel
- **理由**：ActionPanel 已 ~470 行，不应继续膨胀；独立组件可复用
- **类型**：AI 自主决策

## D-02：StreamOutput 复用 vs 自定义渲染

- **日期**：2026-06-26
- **决策者**：AI（Claude）
- **选择**：复用 `StreamOutput`
- **备选**：自定义 Dialog 内渲染
- **理由**：StreamOutput 已在 ReferencePanel repair 标签中用于同样场景，自带流式动画
- **类型**：AI 自主决策

## D-03：按钮位置

- **日期**：2026-06-26
- **决策者**：AI（Claude）
- **选择**：修复按钮下方，同一推荐动作卡片内
- **备选**：卡片外独立区域
- **理由**：修复进度与修复按钮强关联，分离割裂操作流
- **类型**：AI 自主决策
