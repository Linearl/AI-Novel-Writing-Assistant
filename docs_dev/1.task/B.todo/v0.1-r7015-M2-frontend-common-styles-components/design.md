---
description: "REQ-7015 前端公共样式与组件提取 — 方案设计"
---

# REQ-7015 方案设计

## 1. 方案概述

沿用现有 shadcn/ui 组件模式（Radix UI 原语 + CVA variants + `cn()` 工具函数），新增 5 个公共组件到 `components/ui/`，然后逐文件替换重复 className。CSS 拆分采用按路由/功能分文件 + `@import` 组织的方式。

### 1.1 设计目标

1. 新组件与已有 shadcn/ui 组件风格完全一致（CVA + `cn()`）
2. 替换过程零视觉回归
3. CSS 拆分后仍可通过单一入口加载

### 1.2 关键决策

1. **Textarea 用原生 `<textarea>` + className 封装**：项目未引入 Radix textarea 原语，保持轻量，不新增依赖
2. **StatusBadge 基于已有 Badge 组件扩展**：复用 `badge.tsx` 的 CVA 结构，增加 status 语义 variant
3. **CSS 拆分用 `@import` 而非动态加载**：保持构建简单性，Vite 会自动合并

### 1.3 不在范围

- 不引入新的 npm 依赖
- 不修改 Tailwind 配置
- 不重构布局组件

## 2. 实现细节

### 2.1 新增组件 API

#### Textarea

```tsx
// client/src/components/ui/textarea.tsx
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: "sm" | "md"  // sm: min-h-[80px] p-2, md: min-h-[120px] p-3 (default)
}
```

#### StatusBadge

```tsx
// client/src/components/ui/status-badge.tsx
interface StatusBadgeProps {
  variant?: "success" | "error" | "warning" | "info"
  children: React.ReactNode
}
// 内部复用 badge.tsx 的 CVA 模式
```

#### Alert

```tsx
// client/src/components/ui/alert.tsx
interface AlertProps {
  variant?: "default" | "destructive" | "warning"
  children: React.ReactNode
}
```

#### Loading

```tsx
// client/src/components/ui/loading.tsx
interface LoadingProps {
  variant?: "spinner" | "skeleton"
  text?: string
}
```

#### EmptyState

```tsx
// client/src/components/ui/empty-state.tsx
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}
```

### 2.2 CSS 拆分方案

```
client/src/
├── index.css              # 全局变量 + 基础工具类 (~200 行)
├── styles/
│   └── mobile/
│       ├── home.css       # .mobile-route-home 相关
│       ├── novel-edit.css # .mobile-route-novel-edit 相关
│       ├── chapter.css    # .mobile-route-chapter-* 相关
│       └── ...            # 按路由/功能分组
```

`index.css` 中保留：
- `:root` / `.dark` CSS 变量（第 5-48 行）
- `@layer base` 基础重置（第 50-57 行）
- `@layer utilities` 自定义工具类（第 59-110 行）

移动端样式拆分到 `styles/mobile/` 下，按功能分组后在对应路由页面按需导入。

### 2.3 替换策略

按组件类型分批执行，每批完成后验证：
1. **第一批**：Textarea（影响最小，收益最大）
2. **第二批**：StatusBadge + Alert
3. **第三批**：Loading + EmptyState
4. **第四批**：Card 替换
5. **第五批**：CSS 拆分
6. **第六批**：语义化 token 统一

## 3. 接口定义

无新增 API 接口，纯前端组件提取。

## 4. 数据模型

无数据库变更。

## 5. 异常处理

| 错误码 | 场景 | 处理方式 |
| ---- | ---- | -------- |
| N/A | className 替换后样式不一致 | 回退到原始 className，记录例外 |

## 6. 验证策略

1. 每批替换后 `pnpm typecheck` 确保零类型错误
2. 每批替换后浏览器目视检查受影响页面
3. 最终 `pnpm build` 确保构建通过
4. 暗色模式下逐一检查新增组件
