---
description: "REQ-2028 配置厂商弹窗内手动拉取模型列表 - 技术设计"
---

# REQ-2028: 技术设计

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────┐
│  SettingsPage.tsx                                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │  ProviderConfigDialog                           │    │
│  │  ┌─────────────────────────────────────────┐    │    │
│  │  │  模型选择区域                            │    │    │
│  │  │  ├── [拉取模型列表] ← 新增按钮          │    │    │
│  │  │  ├── [测试连接]                         │    │    │
│  │  │  └── model select dropdown              │    │    │
│  │  └─────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  refreshModelsMutation (已有) ──→ 传递给弹窗             │
└─────────────────────────────────────────────────────────┘
```

## 2. 修改方案

### 2.1 ProviderConfigDialog.tsx

新增 props：
- `onRefreshModels?: () => void` — 触发刷新模型列表
- `isRefreshingModels?: boolean` — 刷新中状态

在模型选择区域（`canSelectListedModels` 判断之前）新增按钮：
- 文案："拉取模型列表"
- loading 状态：`isRefreshingModels` 为 true 时显示 spinner 并禁用
- 显示条件：始终显示（内置厂商和自定义厂商统一）

### 2.2 SettingsPage.tsx

将已有的 `refreshModelsMutation` 传递给 `ProviderConfigDialog`：
- `onRefreshModels={() => refreshModelsMutation.mutate(providerId)}`
- `isRefreshingModels={refreshModelsMutation.isPending}`
- 成功后 `editingConfig.models` 自动更新（mutation 的 onSuccess 逻辑已有）

## 3. 复用分析

| 已有资产 | 用途 |
|----------|------|
| `refreshModelsMutation` | 前端 mutation，直接复用 |
| `POST /settings/api-keys/:provider/refresh-models` | 后端 API，无需修改 |
| `refreshProviderModelList` service | 后端服务，无需修改 |

## 4. 验证策略

- 手动验证：打开内置厂商配置弹窗 → 点击"拉取模型列表" → 模型下拉列表更新
- 手动验证：自定义厂商弹窗的"获取模型列表"按钮不受影响
- typecheck 通过
