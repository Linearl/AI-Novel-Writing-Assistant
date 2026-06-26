---
description: "REQ-2011 任务拆解"
---

# REQ-2011 任务拆解

> 状态：⏳ 进行中

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 安装 next-themes 依赖 | P0 | 0.1h | ⬜ 待开始 |
| T2 | index.css 新增 .dark 类 CSS 变量 | P0 | 0.25h | ⬜ 待开始 |
| T3 | AppLayout 挂载 ThemeProvider | P0 | 0.25h | ⬜ 待开始 |
| T4 | 新增 ThemeToggle 组件（三态切换） | P0 | 0.5h | ⬜ 待开始 |
| T5 | Navbar 挂载 ThemeToggle | P0 | 0.25h | ⬜ 待开始 |
| T6 | 关键页面暗色适配审查 | P1 | 1h | ⬜ 待开始 |
| T7 | 设置页外观配置入口（可选） | P2 | 0.5h | ⬜ 待开始 |
| T8 | 验证：亮色/暗色/系统三态切换 | P1 | 0.25h | ⬜ 待开始 |
| T9 | 验证：刷新后偏好保持 | P1 | 0.1h | ⬜ 待开始 |

---

### T1: 安装依赖

**命令**: `pnpm --filter @ai-novel/client add next-themes`
**DoD**: package.json 包含 next-themes，pnpm install 成功

### T2: CSS 变量

**改动点**: `client/src/index.css`
**DoD**: `.dark` 类包含全部 CSS 变量，色值参考 shadcn/ui 暗色主题

### T3: ThemeProvider

**改动点**: `client/src/components/layout/AppLayout.tsx`
**DoD**: `ThemeProvider` 包裹应用根节点，`attribute="class" defaultTheme="system"`

### T4: ThemeToggle 组件

**改动点**: `client/src/components/common/ThemeToggle.tsx`（新增）
**DoD**: 三态循环切换（亮色→暗色→系统），图标随主题变化

### T5: Navbar 挂载

**改动点**: `client/src/components/layout/Navbar.tsx`
**DoD**: 右侧区域显示 ThemeToggle 按钮

### T6: 暗色适配审查

**改动点**: 关键页面组件
**DoD**: 首页、小说编辑页、Creative Hub、设置页在暗色下可读

### T7: 设置页入口（可选）

**改动点**: 设置页
**DoD**: 外观配置 Radio 按钮组

### T8-T9: 验证

**DoD**: 三态切换正常，刷新后偏好保持，系统主题切换自动跟随
