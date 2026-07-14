---
description: "REQ-2009 方案设计"
---

# REQ-2009 方案设计

## 1. 方案概述

纯前端改动。在 `ModelRoutesPage` 中应用已有的 `isRunnableProviderConfig()` 过滤函数，仅在厂商下拉框中显示已配置可用的厂商。已有路由引用的厂商作为保护选项始终可见。

### 1.1 关键决策

1. **复用 `isRunnableProviderConfig()`**：不新增过滤逻辑，与 `LLMSelector` 行为一致
2. **客户端过滤**：不修改服务端 API，减少改动范围
3. **保护已有路由引用**：编辑路由时，当前厂商始终可见（即使不可用）

## 2. 实现细节

### 2.1 `ModelRoutesPage.tsx` (line 113-118)

**当前代码：**

```typescript
const providerOptions = useMemo(
  () => providerConfigs.map((item) => item.provider),
  [providerConfigs],
);
```

**修改后：**

```typescript
const runnableConfigs = useMemo(
  () => providerConfigs.filter(isRunnableProviderConfig),
  [providerConfigs],
);

const providerOptions = useMemo(() => {
  const runnable = runnableConfigs.map((item) => item.provider);
  // 保护已有路由引用的厂商
  const existingProviders = routes.map((r) => r.provider);
  const protectedProviders = existingProviders.filter((p) => !runnable.includes(p));
  return [...runnable, ...protectedProviders];
}, [runnableConfigs, routes]);
```

### 2.2 `ModelRouteFields.tsx` (line 48-67)

增加 `unavailableProviders` prop，用于标记不可用的厂商选项：

```typescript
interface ModelRouteFieldsProps {
  // ... existing props
  unavailableProviders?: string[];  // 不可用但需保护的厂商列表
}
```

在 `<Select.Item>` 中，对不可用厂商添加视觉标记：

```tsx
<SelectItem
  value={provider}
  disabled={unavailableProviders?.includes(provider)}
  className={unavailableProviders?.includes(provider) ? "opacity-50" : ""}
>
  {getProviderDisplayName(provider)}
  {unavailableProviders?.includes(provider) && (
    <span className="text-muted-foreground ml-1">（未配置）</span>
  )}
</SelectItem>
```

### 2.3 空状态

当 `providerOptions` 为空时，显示提示：

```tsx
{providerOptions.length === 0 ? (
  <div className="text-muted-foreground text-sm">
    暂无可用厂商，请先在
    <a href="/settings/api-keys" className="underline">「API Key 设置」</a>
    中配置至少一个厂商。
  </div>
) : (
  <Select>...</Select>
)}
```

## 3. 涉及文件

| 文件 | 改动类型 | 说明 |
| ---- | ---- | ---- |
| `client/src/pages/settings/ModelRoutesPage.tsx` | 修改 | 应用 `isRunnableProviderConfig` 过滤 |
| `client/src/pages/settings/ModelRouteFields.tsx` | 修改 | 增加 `unavailableProviders` prop + 空状态 |
| `client/src/lib/llmSelection.ts` | 不变 | 复用现有 `isRunnableProviderConfig` |
