---
description: "REQ-2028 决策留痕"
---

# REQ-2028 决策日志

## D1: 复用现有 refreshModelsMutation 而非新建 API

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-06-30 |
| 决策人 | AI |
| 决策 | 直接复用 SettingsPage 已有的 `refreshModelsMutation`，不新建 API 或 hook |
| 备选方案 | A: 新建独立 hook 封装刷新逻辑；B: 在弹窗内直接调用 fetch |
| 原因 | `refreshModelsMutation` 已包含完整的 loading/error/success 处理，且后端 API 无需修改。新增 hook 或直接 fetch 会引入重复逻辑。简单任务优先复用。 |
| 影响 | 仅需在 SettingsPage → ProviderConfigDialog 之间传递 props |

## D2: 按钮对内置厂商和自定义厂商统一显示

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-06-30 |
| 决策人 | AI |
| 决策 | "拉取模型列表"按钮对所有厂商统一显示，不区分内置/自定义 |
| 备选方案 | A: 仅内置厂商显示（自定义已有入口）；B: 根据条件动态显示/隐藏 |
| 原因 | 统一显示降低代码复杂度，用户认知一致。自定义厂商弹窗已有"获取模型列表"按钮，新增按钮不冲突（功能相同，位置不同），用户可选择任一入口。 |
| 影响 | 无额外条件判断，UI 逻辑更简单 |
