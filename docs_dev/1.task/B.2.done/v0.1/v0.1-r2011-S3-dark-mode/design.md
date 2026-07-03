---
description: "REQ-2011 方案设计"
---

# REQ-2011 方案设计

## 1. 方案概述

使用 `next-themes` 库实现暗色主题。Tailwind 已配置 `darkMode: "class"`，shadcn/ui 组件已使用 CSS 变量，因此只需补充暗色变量定义 + ThemeProvider + 切换 UI 即可。

### 1.1 关键决策

1. **使用 `next-themes`**：业界标准方案，支持系统主题检测、localStorage 持久化、SSR 安全
2. **`attribute="class"` 模式**：通过 `<html class="dark">` 切换，与 Tailwind `darkMode: "class"` 配合
3. **默认跟随系统**：`defaultTheme="system"`，尊重用户系统偏好
4. **导航栏快捷切换**：三态按钮（亮色/暗色/系统），同时在设置页保留配置入口

## 2. 实现细节

### 2.1 安装依赖

```bash
pnpm --filter @ai-novel/client add next-themes
```

### 2.2 CSS 变量

`client/src/index.css` 在 `:root` 之后新增：

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}
```

### 2.3 ThemeProvider

`client/src/components/layout/AppLayout.tsx`（或 `main.tsx` 入口）：

```tsx
import { ThemeProvider } from "next-themes";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {/* existing app content */}
    </ThemeProvider>
  );
}
```

### 2.4 主题切换按钮

新增组件：`client/src/components/common/ThemeToggle.tsx`

```tsx
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <button onClick={cycle} title={`当前: ${theme}`}>
      {theme === "light" && <Sun className="h-4 w-4" />}
      {theme === "dark" && <Moon className="h-4 w-4" />}
      {theme === "system" && <Monitor className="h-4 w-4" />}
    </button>
  );
}
```

### 2.5 挂载位置

在 `Navbar.tsx` 右侧区域（用户头像/设置按钮旁边）添加 `<ThemeToggle />`。

### 2.6 设置页入口（可选）

在设置页新增外观配置区域，使用 Radio 按钮组：

```
外观
○ 亮色    ○ 暗色    ○ 跟随系统
```

## 3. 涉及文件

| 文件 | 改动类型 | 说明 |
| ---- | ---- | ---- |
| `client/package.json` | 修改 | 新增 next-themes 依赖 |
| `client/src/index.css` | 修改 | 新增 .dark 类 CSS 变量 |
| `client/src/components/layout/AppLayout.tsx` | 修改 | 挂载 ThemeProvider |
| `client/src/components/common/ThemeToggle.tsx` | 新增 | 主题切换按钮组件 |
| `client/src/components/layout/Navbar.tsx` | 修改 | 挂载 ThemeToggle |
