---
description: "REQ-7024 客户端共享 Hooks 抽象与大文件拆分 — 方案设计"
---

# REQ-7024 方案设计

## 1. 方案概述

在 `client/src/hooks/` 下新增 `useApiMutation`（和按需的 `useApiQuery`），封装项目中 ~20 处重复的 `useMutation` + toast + invalidate 模式。同时拆分 4 个超大文件，目标每个 <600 行。

### 1.1 设计目标

1. 减少样板代码：~20 处从 20 行减至 5-8 行
2. 统一 toast 和 invalidate 行为，避免不一致
3. 拆分 god component 和超大文件，提高可维护性
4. 不引入新依赖，复用现有 `sonner` toast 和 `@tanstack/react-query`

### 1.2 关键决策

1. **useApiMutation 定位为便利层**：保留底层 `useMutation` 的直通能力，不强制所有场景使用
2. **拆分策略按功能职责**：不按行数机械切割，按组件功能边界拆分
3. **保持对外 API 不变**：拆分后通过 facade 导出，消费者无感知

### 1.3 不在范围

- 不修改 `useSSE`、`useLocalDB`、`useDirectorChapterTitleRepair`
- 不引入新的状态管理方案
- 不拆分除 4 个目标文件外的其他文件

## 2. 实现细节

### 2.1 useApiMutation 接口

```typescript
// client/src/hooks/useApiMutation.ts

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";

interface UseApiMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateQueries?: string[][];
  successMessage?: string | ((data: TData) => string);
  errorMessage?: string | ((error: unknown) => string);
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: unknown, variables: TVariables) => void;
}

function useApiMutation<TData = unknown, TVariables = unknown>(
  options: UseApiMutationOptions<TData, TVariables>
): UseMutationResult<TData, unknown, TVariables> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: (data, variables, context) => {
      if (options.invalidateQueries) {
        for (const key of options.invalidateQueries) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
      if (options.successMessage) {
        const msg = typeof options.successMessage === "function"
          ? options.successMessage(data)
          : options.successMessage;
        toast.success(msg);
      }
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables, context) => {
      if (options.errorMessage) {
        const msg = typeof options.errorMessage === "function"
          ? options.errorMessage(error)
          : options.errorMessage;
        toast.error(msg);
      } else {
        toast.error("操作失败");
      }
      options.onError?.(error, variables);
    },
  });
}
```

### 2.2 调用方改造示例

```typescript
// 改造前（~20 行）
const mutation = useMutation({
  mutationFn: (data) => api.updateNovel(novelId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["novel", novelId] });
    toast.success("小说信息已更新");
  },
  onError: (err) => {
    toast.error("更新失败，请重试");
  },
});

// 改造后（~6 行）
const mutation = useApiMutation({
  mutationFn: (data) => api.updateNovel(novelId, data),
  invalidateQueries: [["novel", novelId]],
  successMessage: "小说信息已更新",
});
```

### 2.3 NovelWorkspaceRail 拆分方案

```
client/src/components/novel/
├── NovelWorkspaceRail.tsx          # facade，re-export
├── NovelWorkspaceRailShell.tsx     # 布局壳（JSX 结构，接收 props）
├── NovelWorkspaceRailDataProvider.tsx  # query + mutation 逻辑
└── NovelWorkspaceRailNav.tsx       # tab 状态 + 路由
```

**职责划分**:
- Shell：纯展示组件，负责 sidebar 布局、列表渲染、视觉结构
- DataProvider：持有所有 `useQuery` / `useApiMutation`，通过 props 向下传递 data 和 actions
- Nav：持有当前 active tab 状态 + 路由跳转逻辑

### 2.4 通用文件拆分原则

1. 识别文件内部的逻辑边界（独立功能块、独立 hook、独立子组件）
2. 从最独立的逻辑块开始抽取（抽取后不依赖原文件内部状态）
3. 抽取后原文件通过 import 消费新模块
4. 如抽取后文件仍 >600 行，继续下一轮拆分
5. 拆分完成时所有文件 <600 行

## 3. 接口定义

无新增 API 接口。

## 4. 数据模型

无数据库变更。

## 5. 异常处理

| 场景 | 处理方式 |
| ---- | -------- |
| useApiMutation error 对象为 string | toast.error 直接显示 |
| useApiMutation error 对象为 Error | toast.error 显示 error.message |
| useApiMutation error 对象未知 | fallback 到 "操作失败" |
| 拆分后循环依赖 | 拆分前检查 import 图，必要时引入共享类型文件 |

## 6. 验证策略

1. typecheck：`pnpm typecheck` 零错误
2. 单元/集成测试：`pnpm test:client` 全量通过
3. 手动验证：4 个拆分文件功能正常，useApiMutation 替换点 toast 和 invalidate 行为一致
