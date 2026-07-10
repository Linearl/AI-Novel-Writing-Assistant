---
description: "REQ-7024 客户端共享 Hooks 抽象与大文件拆分 — 任务拆解"
---

# REQ-7024 任务拆解

> 状态：待激活

## 任务概述

### 1. 来源

架构诊断报告 2026-07-10 第7条发现。`client/src/hooks/` 仅 3 个专用 hook，缺少通用 API 调用封装；4 个文件超过项目限制。

### 2. 问题

每个页面手工重复 "useMutation → onSuccess invalidate + toast → onError toast" 约 20 行；`NovelWorkspaceRail.tsx` 是 god component；3 个文件均超 800 行限制。

### 3. 需求

创建通用 API hooks + 拆分大文件 + 替换 ~20 处 inline 模式。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 调研现有 inline mutation 模式，统计变体 | P0 | 1h | 待开始 |
| T2 | 创建 useApiMutation hook | P0 | 2h | 待开始 |
| T3 | 评估 useApiQuery 必要性并实施/跳过 | P1 | 1h | 待开始 |
| T4 | 拆分 NovelWorkspaceRail.tsx | P0 | 3h | 待开始 |
| T5 | 拆分 PromptSlotPanel.tsx | P1 | 2h | 待开始 |
| T6 | 拆分 WorldVisualizationBoard.tsx | P1 | 2h | 待开始 |
| T7 | 拆分 WritingFormulaPage.tsx | P1 | 2h | 待开始 |
| T8 | 逐文件替换 inline mutation 为 useApiMutation | P0 | 3h | 待开始 |
| T9 | 全量验证 | P0 | 30min | 待开始 |

---

## 逐项展开

### T1: 调研现有 inline mutation 模式，统计变体

**目标**: 盘点全项目所有 `useMutation` 调用，分类统计 toast + invalidate 模式变体，确认 `useApiMutation` 的接口设计能覆盖所有场景。

**改动点**:
- grep `useMutation` 全项目，统计每个调用的 toast 和 invalidateQueries 使用情况
- 分类为：有无 toast、有无 invalidate、有无自定义 onSuccess/onError
- 输出调研报告（记录在 decision_log 中）

---

### T2: 创建 useApiMutation hook

**目标**: 实现 `client/src/hooks/useApiMutation.ts`，封装 useMutation + toast + invalidate 模式。

**改动点**:
- `client/src/hooks/useApiMutation.ts` — 核心 hook 实现
- 支持 `successMessage` / `errorMessage`（字符串或函数）
- 支持 `invalidateQueries` 数组，成功后自动批量 invalidate
- 支持可选的 `onSuccess` / `onError` 回调（在 toast 之后执行）
- 导出类型 `UseApiMutationOptions`

**技术要点**:
- 使用 `import { toast } from "sonner"`（项目现有 toast 库）
- 使用 `useQueryClient` 获取 queryClient 实例
- error 消息提取：尝试从 error 对象中提取 message，fallback 到通用文案

---

### T3: 评估 useApiQuery 必要性并实施/跳过

**目标**: 检查项目中是否存在重复的 useQuery 样板模式（统一 error toast、统一 staleTime 等），如有则创建 `useApiQuery`；如无则记录跳过理由。

**改动点**:
- 调研全项目 useQuery 调用模式
- 如判定需要：创建 `client/src/hooks/useApiQuery.ts`
- 如判定不需要：在 decision_log 中记录跳过理由

---

### T4: 拆分 NovelWorkspaceRail.tsx（678 行）

**目标**: 拆分为 layout shell + data provider + navigation controller，每个 <300 行。

**改动点**:
- `client/src/components/novel/NovelWorkspaceRailShell.tsx` — 布局壳（layout + sidebar 结构）
- `client/src/components/novel/NovelWorkspaceRailDataProvider.tsx` — 数据加载层（query + mutation 逻辑）
- `client/src/components/novel/NovelWorkspaceRailNav.tsx` — 导航控制器（tab 切换 + 路由逻辑）
- `client/src/components/novel/NovelWorkspaceRail.tsx` — 改为 facade，re-export 三个子组件

**拆分原则**:
- Shell 持有 UI 布局（JSX 结构），接收 children/data 作为 props
- DataProvider 持有所有 useQuery / useMutation 逻辑，向下传递数据
- Nav 持有 tab 状态管理和路由跳转逻辑

---

### T5: 拆分 PromptSlotPanel.tsx（843 行 → <600）

**目标**: 将 843 行的 PromptSlotPanel.tsx 拆分为 2-3 个文件，每个 <600 行。

**改动点**:
- 分析现有结构，识别可独立拆出的子组件/逻辑模块
- 按功能职责拆分（如 slot 列表 + slot 编辑面板 + 搜索过滤逻辑）
- 通过 facade index.ts 统一导出

---

### T6: 拆分 WorldVisualizationBoard.tsx（837 行 → <600）

**目标**: 将 837 行的 WorldVisualizationBoard.tsx 拆分为 2-3 个文件，每个 <600 行。

**改动点**:
- 分析现有结构，识别可独立拆出的子组件/逻辑模块
- 按可视化类型拆分（如图表渲染 + 数据加载 + 交互控制）
- 通过 facade index.ts 统一导出

---

### T7: 拆分 WritingFormulaPage.tsx（811 行 → <600）

**目标**: 将 811 行的 WritingFormulaPage.tsx 拆分为 2-3 个文件，每个 <600 行。

**改动点**:
- 分析现有结构，识别可独立拆出的子组件/逻辑模块
- 按功能区域拆分（如公式列表 + 公式编辑器 + 预览面板）
- 通过 facade index.ts 统一导出

---

### T8: 逐文件替换 inline mutation 为 useApiMutation

**目标**: 将全项目 ~20 处 inline `useMutation` 模式替换为 `useApiMutation`。

**改动点**:
- 逐文件替换，每次替换后运行 typecheck 确认无新增错误
- 对每个替换点验证：toast 行为不变、invalidate 行为不变、自定义逻辑保留

**替换策略**:
- 标准模式（mutation → invalidate + toast）：直接替换为 useApiMutation
- 复杂模式（多个 invalidate、条件 toast、自定义副作用）：useApiMutation + 自定义 onSuccess/onError

---

### T9: 全量验证

**目标**: typecheck + client 测试通过。

**改动点**:
- `pnpm typecheck`
- `pnpm test:client`
- 手动验证关键页面（NovelWorkspaceRail、PromptSlotPanel、WorldVisualizationBoard、WritingFormulaPage）

---

## DoD

- useApiMutation 覆盖 toast.success / toast.error / invalidate 三种场景
- useApiQuery 已实施或有明确跳过理由
- 4 个大文件均拆分到 <600 行（NovelWorkspaceRail 子文件 <300 行）
- 至少 20 处 inline mutation 已替换
- typecheck + client test 通过
- 无功能行为变化

---

## 验证步骤

1. `pnpm typecheck` — 零错误
2. `pnpm test:client` — 全量通过
3. 手动验证 NovelWorkspaceRail 拆分后布局/导航/数据加载正常
4. 手动验证 3 个 >800 行文件拆分后功能正常
5. 抽查 3-5 处 useApiMutation 替换点，toast 和 invalidate 行为一致

---

## 完成判定

- T1~T9 全部完成且 DoD 全部满足后，REQ-7024 达到"已完成"状态。
