---
description: "REQ-7015 前端公共样式与组件提取 — 原始冻结副本"
---

# REQ-7015 前端公共样式与组件提取（原始冻结副本）

> ⚠️ 本文件为需求创建时的冻结快照，禁止手动编辑。
> 工作副本：[REQ-7015-frontend-common-styles-components.md](./REQ-7015-frontend-common-styles-components.md)

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

---

## 2. 目标与范围

### 2.1 目标

1. 消除高频重复的 className 模式，通过提取公共组件实现单一来源
2. `index.css` 从 727 行降至 ~200 行以内
3. 新页面开发可直接使用公共组件

### 2.2 In Scope

- `client/src/components/ui/` — 新增组件
- `client/src/index.css` — 移动端媒体查询拆分
- `client/src/pages/` + `client/src/components/` — 替换为公共组件

### 2.3 Out of Scope

- Tailwind 配置、cn() 工具函数、DesktopBootstrapShell、布局组件

---

## 3. 验收标准

- [ ] Textarea/StatusBadge/Alert/Loading/EmptyState 组件提取完成
- [ ] 30+31+53 处重复全部替换
- [ ] index.css 降至 ~200 行
- [ ] ~211 处原始色板替换为语义化 token
- [ ] pnpm typecheck + build 通过
- [ ] 暗色模式正常

---

## 4. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-09 | 创建 | 冻结副本 |
