# @ai-novel/desktop

AI 小说创作工作台 Windows 桌面客户端。

## 技术栈

- Electron 35
- 内嵌 `@ai-novel/server` 作为本地后端
- electron-builder 打包
- electron-updater 自动更新

## 开发

```bash
# 安装依赖（在项目根目录执行）
pnpm install

# 启动桌面端开发模式
pnpm dev:desktop

# 构建
pnpm --filter @ai-novel/desktop build

# 类型检查
pnpm --filter @ai-novel/desktop typecheck

# 打包 Windows 安装包
pnpm dist:desktop:nsis       # NSIS 安装包
pnpm dist:desktop:portable   # 便携版
```

## 架构说明

桌面端是一个 Electron 壳，启动时拉起 `@ai-novel/server` 作为本地后端服务，前端通过内嵌浏览器加载客户端页面。所有业务逻辑均由 server 包提供，桌面端仅负责：

- 应用窗口管理
- 本地数据目录管理（自动检测 `LOCALAPPDATA` / `APPDATA`）
- 原生菜单与系统托盘
- 自动更新检查

## 打包流程

完整构建链：`shared build` -> `prisma generate` -> `server build` -> `client:desktop build` -> `desktop build`

快捷命令：`pnpm build:desktop:all`
