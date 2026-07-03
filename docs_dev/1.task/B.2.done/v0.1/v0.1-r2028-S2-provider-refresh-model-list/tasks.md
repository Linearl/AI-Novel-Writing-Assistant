---
description: "REQ-2028 任务分解 - 配置厂商弹窗内手动拉取模型列表"
---

# REQ-2028 任务分解

## 阶段 0：需求与设计

- [x] T0.1 需求文档完成（README.md）

## 阶段 1：前端 UI

- [x] T1.1 `ProviderConfigDialog.tsx`：新增 `onRefreshModels` prop 和 `isRefreshingModels` prop
- [x] T1.2 在模型选择区域（`canSelectListedModels` 判断之前）新增"拉取模型列表"按钮，显示 loading 状态
- [x] T1.3 `SettingsPage.tsx`：将 `refreshModelsMutation` 传递给 `ProviderConfigDialog`，成功后更新 `editingConfig.models`

## 阶段 2：验证

- [ ] T2.1 手动验证：打开内置厂商配置弹窗 → 点击"拉取模型列表" → 模型下拉列表更新
- [ ] T2.2 手动验证：自定义厂商弹窗的"获取模型列表"按钮不受影响
