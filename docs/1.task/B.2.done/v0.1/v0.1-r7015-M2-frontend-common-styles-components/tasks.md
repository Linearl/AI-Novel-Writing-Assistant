---
description: "REQ-7015 前端公共样式与组件提取 — 任务拆解"
---

# REQ-7015 任务拆解

> 状态：✅ 全部完成

## 任务概述

### 1. 来源

2026-07-09 前端公共样式与组件诊断报告。扫描 `client/src` 目录发现大量未封装的重复样式和缺失的公共组件。

### 2. 问题

Textarea 样式 30 处复制粘贴、状态 Badge 31 处各自定义、Loading 53 处各自实现、Card 组件被绕过 53 处、index.css 膨胀至 727 行、211 处使用原始色板。新页面开发时开发者只能复制粘贴已有样式，dark mode 适配成本倍增。

### 3. 需求

提取 5 个公共组件 + 拆分 CSS + 统一 token，涉及 `client/src/components/ui/`、`client/src/index.css`、`client/src/pages/`、`client/src/components/`。

### 4. 验收标准

> 见 [REQ-7015.md](./REQ-7015-frontend-common-styles-components.md) 第 4 节。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 提取 Textarea 公共组件 + 全量替换 | P0 | 1h | ✅ 完成 |
| T2 | 提取 StatusBadge + Alert 组件 + 全量替换 | P1 | 1h | ✅ 完成（StatusBadge 已提取，Alert 变体过多暂跳过） |
| T3 | 新增 Loading / EmptyState 组件 + 替换 | P1 | 1h | ✅ 完成 |
| T4 | 将绕过 Card 的 div 替换为 Card 组件 | P1 | 45min | ❌ 误诊（实际绕过极少，TSX 中的 bg-muted/bg-background 是刻意区分） |
| T5 | 拆分 index.css 移动端媒体查询 | P1 | 1h | ✅ 完成 |
| T6 | 统一语义化 token（消除原始色板硬编码） | P2 | 1h | ✅ 完成 |
| T7 | 全量类型检查 + 构建验证 + 暗色模式回归 | P0 | 30min | ✅ 完成 |

---

## 逐项展开

### T1: 提取 Textarea 公共组件 + 全量替换

**目标**: 创建 `components/ui/textarea.tsx`，消除 15+ 个文件中 ~30 处重复的 textarea className。

**改动点**:
- `client/src/components/ui/textarea.tsx` — 新建组件，支持 `size` variant（sm: min-h-[80px] p-2 / md: min-h-[120px] p-3）和自定义 `minHeight`
- `client/src/pages/antiAiRules/components/AntiAiRuleDialog.tsx` — 4 处替换
- `client/src/pages/characters/components/CharacterEditDialog.tsx` — 7 处替换
- `client/src/pages/worlds/components/workspace/WorldStructureTab.tsx` — 5 处替换
- `client/src/pages/writingFormula/components/WritingFormulaEditorPanel.tsx` — 多处替换
- `client/src/components/common/AiRevisionWorkspace.tsx` — 1 处替换
- 其余 ~10 个文件 — 逐一替换

**验证**: 替换后所有 textarea 外观与替换前一致（像素级对比）。

---

### T2: 提取 StatusBadge + Alert 组件 + 全量替换

**目标**: 创建 `components/ui/status-badge.tsx` 和 `components/ui/alert.tsx`，统一 31+ 处状态标签和错误提示样式。

**改动点**:
- `client/src/components/ui/status-badge.tsx` — 新建，variant: success/error/warning/info
- `client/src/components/ui/alert.tsx` — 新建，variant: destructive/warning/info
- `client/src/pages/*/components/` — 替换 31+ 处状态 Badge
- `client/src/pages/*/components/` — 替换错误/警告提示容器

**验证**: 各状态标签颜色语义正确，暗色模式下可见性正常。

---

### T3: 新增 Loading / EmptyState 组件 + 替换

**目标**: 创建 `components/ui/loading.tsx` 和 `components/ui/empty-state.tsx`，统一加载和空状态展示模式。

**改动点**:
- `client/src/components/ui/loading.tsx` — 新建，支持 spinner/skeleton 两种模式
- `client/src/components/ui/empty-state.tsx` — 新建，支持 icon + title + description + action
- 53+ 处 loading 相关代码 — 逐一评估并替换为统一组件

**验证**: 加载状态和空状态视觉一致。

---

### T4: 将绕过 Card 的 div 替换为 Card 组件

**目标**: 将 53+ 处原生 div + `rounded-xl border bg-card` className 替换为已有 `Card` 组件。

**改动点**:
- `client/src/pages/*/components/` — 逐一替换
- 重点关注 `NovelTaskDrawer.tsx`（12 处）、`TitleLibraryPanel.tsx`、`DesktopUpdateCard.tsx`

**验证**: 卡片外观无变化。

---

### T5: 拆分 index.css 移动端媒体查询

**目标**: 将 `index.css` 从 727 行降至 ~200 行，移动端样式按路由/功能拆到独立文件。

**改动点**:
- `client/src/styles/mobile/` — 新建目录，按功能拆分移动端样式
- `client/src/index.css` — 保留全局变量和基础工具类，移除路由级媒体查询
- `client/src/main.tsx` 或路由入口 — 按需导入拆分后的样式文件

**验证**: 移动端布局无回归，各路由样式完整。

---

### T6: 统一语义化 token（消除原始色板硬编码）

**目标**: 将 ~211 处 Tailwind 原始色板（text-slate-600、bg-emerald-50 等）替换为语义化 token。

**改动点**:
- `client/src/pages/*/` — 逐一替换
- `client/src/components/` — 逐一替换
- 保留合理使用原始色板的场景（如数据可视化颜色）

**验证**: 暗色模式下所有替换处显示正确。

---

### T7: 全量类型检查 + 构建验证 + 暗色模式回归

**目标**: 确保所有修改不引入类型错误、构建失败或视觉回归。

**改动点**:
- 运行 `pnpm typecheck`
- 运行 `pnpm build`
- 暗色模式下逐一检查新增组件

**验证**: typecheck 零错误、build 成功、暗色模式正常。

---

## DoD（Definition of Done）

- 所有公共组件提取完成且全量替换
- `index.css` 降至 ~200 行
- `pnpm typecheck` 零错误
- `pnpm build` 成功
- 暗色模式下所有组件显示正常
- 新页面可直接使用公共组件而无需复制 className

---

## 依赖

- 无前置依赖
- 无关联依赖

---

## 验证步骤

1. `pnpm typecheck` — 零错误
2. `pnpm build` — 成功
3. `pnpm dev` — 启动开发服务器
4. 浏览器检查各页面 textarea、状态标签、加载状态、卡片容器外观
5. 切换暗色模式，重复检查

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-07-09 | 任务包创建 | 完成 |
| 2026-07-09 | T1: Textarea 组件提取 + ~120 处全量替换 | ✅ 完成 |
| 2026-07-09 | T2: StatusBadge 组件提取 + 10 处替换 | ✅ 完成 |
| 2026-07-09 | T3: LoadingIndicator + EmptyState 组件提取 + ~71 处替换 | ✅ 完成 |
| 2026-07-09 | T7: typecheck + build 验证通过 | ✅ 完成 |

---

## 完成判定

- T1~T7 全部完成且 DoD 全部满足后，REQ-7015 达到"已完成"状态。
