---
description: "REQ-2006 决策留痕"
---

# REQ-2006 决策留痕

> 最后更新：2026-06-26T22:50:00+08:00

---

## D1：primaryAction 用 retry 还是 resume_from_checkpoint？

- **决策**：primaryAction 用 `retry`，secondaryActions 保留 `resume_from_checkpoint`
- **理由**：用户期望点击主按钮能"重新开始"，resume 作为更精细的选项放在次要位置
- **备选**：primaryAction 用 `resume_from_checkpoint`（更保守，保留已完成工作）
- **权衡**：retry 语义更直觉，但可能丢弃已完成的检查点。实际上 `retryTask` 默认 `resume: true`，所以 primary "重试" 行为等同于 resume

## D2：是否需要新增 props 还是复用现有 onOpenTaskCenter？

- **决策**：新增 `onRetry` / `onRetryWithResume` props
- **理由**：`onOpenTaskCenter` 的语义是"打开详情面板"，不应混入重试逻辑。分离 props 使组件职责清晰
- **备选**：在 `onOpenTaskCenter` 中自动触发重试（破坏单一职责）
