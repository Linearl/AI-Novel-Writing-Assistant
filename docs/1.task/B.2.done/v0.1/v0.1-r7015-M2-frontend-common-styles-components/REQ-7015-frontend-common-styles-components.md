---
description: "REQ-7015 前端公共样式与组件提取"
---

# REQ-7015 前端公共样式与组件提取

> 状态：⏳ 进行中

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7015 |
| 优先级 | P2 |
| 来源 | 2026-07-09 前端公共样式与组件诊断报告 |
| 关联需求 | 无 |

---

## 1. 背景与问题

2026-07-09 诊断发现 `client/src` 存在以下问题：

1. **Textarea 样式 ~30 处复制粘贴**：完全相同的 `min-h w-full rounded-md border bg-background p-2 text-sm` 出现在 15+ 个文件中，变体差异仅 `min-h` 和 `p-2/p-3`
2. **状态 Badge 31+ 处各自定义**：emerald/green/red 颜色、间距各不相同但结构一致
3. **Loading 状态 53+ 处各自实现**：无统一组件，各页面自行处理
4. **Card 容器 53+ 处绕过已有 Card 组件**：用原生 div + className 拼写
5. **index.css 移动端媒体查询 615 行**：路由选择器重复 4-5 次，选择器特异性高
6. **语义化 token 使用不一致**：~211 处使用 Tailwind 原始色板而非语义化 token

不改的后果：随着路由增长，`index.css` 持续膨胀，新页面开发时复制粘贴模式会继续扩散，dark mode 适配成本倍增。

---

## 2. 目标与范围

### 2.1 目标

1. 消除高频重复的 className 模式，通过提取公共组件实现单一来源
2. `index.css` 从 727 行降至 ~200 行以内（全局变量 + 基础工具类）
3. 新页面开发可直接使用公共组件，无需复制粘贴样式

### 2.2 In Scope

**前端**：
- `client/src/components/ui/` — 新增 Textarea、StatusBadge、Alert、Loading、EmptyState 组件
- `client/src/components/ui/card.tsx` — 已有组件，推广使用
- `client/src/index.css` — 移动端媒体查询拆分
- `client/src/pages/` — 各页面替换为公共组件
- `client/src/components/` — 各业务组件替换为公共组件

### 2.3 Out of Scope

- 不修改 Tailwind 配置（`tailwind.config.ts`）
- 不修改 `cn()` 工具函数
- 不引入新的 CSS 方案（保持 Tailwind utility-first）
- 不重构 `DesktopBootstrapShell.tsx`（桌面端独立壳，可后续单独处理）
- 不修改 `components/layout/` 布局组件

---

## 3. 需求详情

### 3.1 Textarea 组件

WHEN 开发者需要多行文本输入，THE SYSTEM SHALL 提供 `<Textarea>` 组件，支持 `size` variant（sm/md）和 `minHeight` prop，消除 30 处重复 className。

### 3.2 StatusBadge 组件

WHEN 需要显示状态标签，THE SYSTEM SHALL 提供 `<StatusBadge>` 组件，支持 `variant` prop（success/error/warning/info），统一 31+ 处状态指示样式。

### 3.3 Alert 组件

IF 需要错误/成功/警告提示容器，THE SYSTEM SHALL 提供 `<Alert>` 组件，支持 `variant` prop（destructive/warning/info），统一内联提示样式。

### 3.4 Loading / EmptyState 组件

WHEN 页面处于加载状态或无数据状态，THE SYSTEM SHALL 提供 `<Loading>` 和 `<EmptyState>` 组件，统一 53+ 处加载和空状态展示模式。

### 3.5 Card 组件推广

WHEN 需要卡片容器，THE SYSTEM SHALL 使用已有 `Card` 组件而非原生 div + className 拼写。

### 3.6 index.css 拆分

WHEN 移动端媒体查询需要维护，THE SYSTEM SHALL 将各路由的移动端样式拆分到独立文件，消除重复选择器。

### 3.7 语义化 token 统一

IF 使用了 Tailwind 原始色板（slate/emerald/red 等），THE SYSTEM SHALL 替换为语义化 token（muted-foreground/primary/destructive 等）。

---

## 4. 验收标准

- [ ] `<Textarea>` 组件提取完成，原 30 处重复 className 全部替换
- [ ] `<StatusBadge>` 组件提取完成，原 31+ 处状态标签统一
- [ ] `<Alert>` 组件提取完成，错误/警告提示样式统一
- [ ] `<Loading>` 和 `<EmptyState>` 组件提取完成
- [ ] 53+ 处绕过 Card 的 div 替换为 Card 组件
- [ ] `index.css` 降至 ~200 行，移动端样式按路由拆分
- [ ] ~211 处原始色板替换为语义化 token
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] 暗色模式下所有新增组件显示正常

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| 大量 className 替换可能引入视觉回归 | 按组件分批替换，每批完成后人工目视检查 |
| 移动端样式拆分可能遗漏媒体查询 | 拆分前后做 CSS diff 对比，确保无样式丢失 |
| 语义化 token 替换可能不完全匹配原始颜色 | 仅替换语义等价的 token，保留少量合理使用原始色板的场景 |

---

## 6. 关联与边界

- 与 REQ-7002（NovelEdit.tsx 大文件拆分）的边界：本任务不涉及文件拆分，仅涉及公共组件提取
- 依赖的外部条件：无

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-09 | 创建 | 基于诊断报告生成需求文档 |
