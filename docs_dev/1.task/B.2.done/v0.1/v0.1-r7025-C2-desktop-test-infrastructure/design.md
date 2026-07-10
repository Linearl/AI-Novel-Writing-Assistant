---
description: "REQ-7025 Desktop 包测试基础设施 — 方案设计"
---

# REQ-7025 方案设计

## 1. 方案概述

为 `desktop` 包建立测试体系，核心思路：先拆分可测试逻辑（main.ts 的 IPC/窗口/启动序列提取为独立可导出模块），再逐模块添加测试。使用 Node.js 内置 test runner，与 server 包保持一致。

### 1.1 设计目标

1. 不引入新测试框架（复用 Node test runner）
2. Electron 模块通过依赖注入隔离，不直接 mock `electron` 包
3. main.ts 拆分后行为完全不变（入口文件调用拆出模块的编排）
4. 测试可在 CI 中运行（headless，无 GUI 依赖）

### 1.2 关键决策

1. **测试框架用 Node test runner**：与 server 保持一致，无需额外依赖
2. **依赖注入而非 mock**：Electron 模块（app、BrowserWindow、ipcMain）通过函数参数传入，测试时传入 stub
3. **main.ts 保留为薄入口**：拆分后 main.ts 只做模块导入和顶层编排，无业务逻辑

### 1.3 不在范围

- 不做 E2E 测试（Electron 窗口级别）
- 不做渲染进程测试
- 不引入 jest/vitest 等第三方测试框架

## 2. 实现细节

### 2.1 main.ts 拆分架构

```
desktop/src/main/
├── main.ts              # 薄入口：import + 调用编排
├── ipcHandlers.ts       # registerIpcHandlers(win) → cleanup
├── windowManager.ts     # createMainWindow(config) → BrowserWindow
└── startupSequence.ts   # runStartup(app, { createWindow, startServer, ... })
```

**依赖注入模式**（startupSequence 示例）:

```typescript
interface StartupDeps {
  createMainWindow: (config: WindowConfig) => BrowserWindow;
  registerIpcHandlers: (win: BrowserWindow) => () => void;
  startServer: () => Promise<ChildProcess>;
  loadAppUrl: (win: BrowserWindow) => Promise<void>;
}

async function runStartup(app: App, deps: StartupDeps): Promise<void> {
  await app.whenReady();
  const serverProcess = await deps.startServer();
  const mainWindow = deps.createMainWindow({ /* config */ });
  const cleanup = deps.registerIpcHandlers(mainWindow);
  await deps.loadAppUrl(mainWindow);
  // ...
}
```

### 2.2 测试 mock 策略

**Electron 模块隔离**：
- 不直接 `import { app } from "electron"` in 测试
- 通过依赖注入传入 `app`、`BrowserWindow` 等
- 测试中传入 stub 对象（实现最小接口）

**Mock 层次**：

| 模块 | Mock 方式 |
| ---- | --------- |
| `electron` (app, BrowserWindow, ipcMain) | Stub 对象（依赖注入） |
| `electron-updater` (autoUpdater) | 手动 mock 模块（EventEmitter stub） |
| `child_process` (spawn) | `node:test` mock 或手动 stub |
| Prisma Client | Mock Prisma 方法 |
| File system (fs) | `node:test` mock 或 tmp 目录 |

### 2.3 测试文件结构

```
desktop/tests/
├── main/
│   ├── ipcHandlers.test.ts
│   ├── windowManager.test.ts
│   └── startupSequence.test.ts
├── runtime/
│   ├── server.test.ts
│   ├── state.test.ts
│   ├── updater.test.ts
│   └── dataImport.test.ts
├── stage-desktop.test.ts
└── helpers/
    ├── electronStubs.ts      # app, BrowserWindow, ipcMain stubs
    └── updaterMock.ts        # autoUpdater mock
```

### 2.4 server.ts 测试设计

```typescript
// 测试结构示例
test("startServer spawns child process with correct args", async () => {
  // mock child_process.spawn
  // 验证 spawn 参数
});

test("health check retries until server responds", async () => {
  // mock fetch: 前 2 次失败，第 3 次成功
  // 验证重试逻辑
});

test("process exit kills server child process", async () => {
  // mock spawn → 返回可控 ChildProcess
  // 触发 process.exit
  // 验证子进程被 kill
});
```

## 3. 接口定义

无新增 API 接口。

## 4. 数据模型

无数据库变更。

## 5. 异常处理

| 场景 | 处理方式 |
| ---- | -------- |
| Electron 模块 import 导致测试崩溃 | 通过 DI 隔离，测试不 import electron |
| node:test mock 与 CJS 模块冲突 | 测试文件使用 ESM（.mts）或确认 CJS mock 方式 |
| stage-desktop 在 CI 中执行时间过长 | 只测试关键路径，跳过完整打包 |

## 6. 验证策略

1. `pnpm typecheck` — 零错误（含 desktop 包）
2. `pnpm --filter @ai-novel/desktop test` — 所有测试通过
3. CI 环境验证测试可运行
4. 手动验证 main.ts 拆分后桌面端启动正常
