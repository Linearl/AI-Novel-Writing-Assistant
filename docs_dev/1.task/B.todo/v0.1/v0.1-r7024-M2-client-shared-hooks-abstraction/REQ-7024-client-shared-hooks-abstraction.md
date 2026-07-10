---
description: "REQ-7024 客户端共享 Hooks 抽象与大文件拆分"
---

# REQ-7024 客户端共享 Hooks 抽象与大文件拆分

> 状态：待激活

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7024 |
| 优先级 | P2 |
| 来源 | 架构诊断报告 2026-07-10 第7条发现 |
| 关联需求 | 无 |

---

## 1. 背景与问题

`client/src/hooks/` 当前仅 3 个文件（`useSSE`、`useLocalDB`、`useDirectorChapterTitleRepair`），缺少通用的 API 调用封装。每个页面手工重复以下模式约 20 行：

```typescript
const mutation = useMutation({
  mutationFn: ...,
  onSuccess: () => { queryClient.invalidateQueries(...); toast.success(...); },
  onError: () => { toast.error(...); },
});
```

此外，4 个文件超过项目 800 行限制：

| 文件 | 行数 | 限制 |
|------|------|------|
| `PromptSlotPanel.tsx` | 843 | >800 |
| `WorldVisualizationBoard.tsx` | 837 | >800 |
| `WritingFormulaPage.tsx` | 811 | >800 |
| `NovelWorkspaceRail.tsx` | 678 | god component（非纯行数问题） |

不改的后果：重复模式持续蔓延，每次新增页面都要写 20 行样板代码；大文件越滚越大，最终无法维护。

---

## 2. 目标与范围

### 2.1 目标

1. 创建 `hooks/useApiMutation.ts` — 封装 `useMutation` + toast + invalidate 模式
2. 创建 `hooks/useApiQuery.ts`（如需要）— 封装带错误处理的 `useQuery` 默认参数
3. 拆分 `NovelWorkspaceRail.tsx` 为 layout shell + data provider + navigation controller（每个 <300 行）
4. 拆分 3 个 >800 行文件到合理大小（目标 <600 行）
5. 将至少 20 处 inline mutation 模式替换为 `useApiMutation`

### 2.2 In Scope

**新建文件**：
- `client/src/hooks/useApiMutation.ts` — 通用 mutation hook
- `client/src/hooks/useApiQuery.ts` — 通用 query hook（如判定需要）
- `NovelWorkspaceRail` 拆分后的子组件（layout shell / data provider / navigation controller）

**拆分目标**：
- `client/src/components/novel/NovelWorkspaceRail.tsx` — 678 行 god component
- `client/src/components/prompt/PromptSlotPanel.tsx` — 843 行
- `client/src/components/world/WorldVisualizationBoard.tsx` — 837 行
- `client/src/pages/WritingFormulaPage.tsx` — 811 行

**替换目标**：
- 全项目范围内 ~20 处 inline `useMutation` 模式

### 2.3 Out of Scope

- 不修改 `useSSE`、`useLocalDB`、`useDirectorChapterTitleRepair` 的内部实现
- 不拆分除上述 4 个文件外的其他文件
- 不引入新的状态管理方案

---

## 3. 需求详情

### 3.1 useApiMutation

WHEN 需要执行 API 写操作（POST/PUT/DELETE），THE SYSTEM SHALL 提供统一的 `useApiMutation` hook，自动处理 toast 通知 + queryClient 缓存失效。

```typescript
interface UseApiMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateQueries?: string[][];    // queryKey 数组，成功后自动 invalidate
  successMessage?: string | ((data: TData) => string);
  errorMessage?: string | ((error: unknown) => string);
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: unknown, variables: TVariables) => void;
}

function useApiMutation<TData = unknown, TVariables = unknown>(
  options: UseApiMutationOptions<TData, TVariables>
): UseMutationResult<TData, unknown, TVariables>
```

### 3.2 useApiQuery（按需）

IF 项目中存在重复的 useQuery 样板模式（如统一的错误 toast、统一的 staleTime 配置），THEN 创建 `useApiQuery` 封装；ELSE 跳过此 hook。

### 3.3 文件拆分原则

- 目标每个文件 <600 行（项目约束 500-700 可接受）
- 按功能职责拆分，不按代码行数机械切割
- 拆分后通过 facade / index.ts 消费，不深导入内部文件
- NovelWorkspaceRail 拆分为：
  - `NovelWorkspaceRailShell.tsx` — 布局壳（layout + sidebar 结构）
  - `NovelWorkspaceRailDataProvider.tsx` — 数据加载层（query + mutation 逻辑）
  - `NovelWorkspaceRailNav.tsx` — 导航控制器（tab 切换 + 路由逻辑）

---

## 4. 验收标准

- [ ] `useApiMutation` 可供全项目使用，覆盖 toast.success / toast.error / invalidate 三种场景
- [ ] `useApiQuery` 在判定需要时实现，否则有明确跳过理由记录在 decision_log
- [ ] NovelWorkspaceRail.tsx 拆分为 3 个文件，每个 <300 行（原 678 行）
- [ ] PromptSlotPanel.tsx <600 行（原 843 行）
- [ ] WorldVisualizationBoard.tsx <600 行（原 837 行）
- [ ] WritingFormulaPage.tsx <600 行（原 811 行）
- [ ] 至少 20 处 inline mutation 模式替换为 useApiMutation
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test:client` 通过
- [ ] 替换前后功能行为完全一致

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| 拆分后组件间通信复杂化 | 保持 props 接口不变，内部拆分不改变对外 API |
| useApiMutation 抽象过度（覆盖不了所有场景） | 保留底层 useMutation 的直通能力，useApiMutation 作为便利层 |
| 大文件拆分引入循环依赖 | 拆分前检查 import 图，避免循环引用 |

---

## 6. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-10 | 创建 | 基于架构诊断报告第7条发现生成需求文档 |
