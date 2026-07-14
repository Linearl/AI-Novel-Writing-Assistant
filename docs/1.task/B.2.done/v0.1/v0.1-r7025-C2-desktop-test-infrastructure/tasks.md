---
description: "REQ-7025 Desktop 包测试基础设施 — 任务拆解"
---

# REQ-7025 任务拆解

> 状态：待激活

## 任务概述

### 1. 来源

架构诊断报告 2026-07-10 第8条发现。`desktop` 包 11 个 TS 文件测试覆盖率为 0%。

### 2. 问题

核心模块（main.ts 597行、server.ts 316行、updater.ts 215行、dataImport.ts ~400行）无回归保护，修改后只能手动验证。

### 3. 需求

拆分可测试逻辑 + 为 5 个核心模块添加测试。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 搭建 desktop 测试基础设施（配置、mock 工具） | P0 | 1h | 已完成 |
| T2 | 拆分 main.ts — 提取 IPC handlers 为独立模块 | P0 | 2h | 待开始 |
| T3 | 拆分 main.ts — 提取窗口管理 + 启动序列 | P0 | 2h | 待开始 |
| T4 | 为 runtime/server.ts 添加单元测试 | P0 | 2h | 已完成（模式/端口解析测试） |
| T5 | 为 runtime/state.ts 添加单元测试 | P1 | 1h | 已完成（40 个用例全部通过） |
| T6 | 为 runtime/updater.ts 添加测试 | P1 | 2h | 待开始（需 mock electron-updater） |
| T7 | 为 runtime/dataImport.ts 添加测试 | P2 | 2h | 已完成（纯工具函数测试） |
| T8 | 为 stage-desktop.cjs 添加集成测试 | P2 | 2h | 待开始 |
| T9 | CI 集成与全量验证 | P0 | 1h | 待开始 |

---

## 逐项展开

### T1: 搭建 desktop 测试基础设施

**目标**: 创建 `desktop/tests/` 目录，配置测试运行脚本，准备 mock 工具。

**改动点**:
- `desktop/tests/` — 新建测试目录
- `desktop/package.json` — 添加 `test` 脚本（`node --test` 或等效命令）
- `desktop/tests/helpers/` — mock 工具（mock Electron app、BrowserWindow、ipcMain 等）
- 配置 tsconfig 使测试文件可正确 import 源码

**技术要点**:
- 测试框架使用 Node.js 内置 `node:test`（与 server 一致）
- Electron 模块通过依赖注入或 jest-like mock 隔离
- 不需要 `electron-mock-ipc` 等第三方 mock 库（通过 DI 规避）

---

### T2: 拆分 main.ts — 提取 IPC handlers

**目标**: 将 main.ts 中的 IPC handler 注册逻辑提取为独立模块 `desktop/src/main/ipcHandlers.ts`。

**改动点**:
- `desktop/src/main/ipcHandlers.ts` — 新建，导出 `registerIpcHandlers(win: BrowserWindow): () => void`（返回清理函数）
- `desktop/src/main.ts` — 改为调用 `registerIpcHandlers(mainWindow)`

**提取标准**:
- 每个 IPC handler 是独立函数，可单独测试
- handler 注册函数接受 BrowserWindow 参数（可 mock）
- 返回清理函数用于测试 teardown

---

### T3: 拆分 main.ts — 提取窗口管理 + 启动序列

**目标**: 将窗口创建和启动序列编排提取为独立模块。

**改动点**:
- `desktop/src/main/windowManager.ts` — 新建，导出 `createMainWindow(config): BrowserWindow`
- `desktop/src/main/startupSequence.ts` — 新建，导出 `runStartup(app, deps): Promise<void>`
- `desktop/src/main.ts` — 改为编排调用

**提取标准**:
- `createMainWindow` 接收配置对象（可测试参数化）
- `runStartup` 接收依赖注入（app、窗口工厂、服务器启动函数）
- main.ts 最终只保留入口级调用，无业务逻辑

---

### T4: 为 runtime/server.ts 添加单元测试

**目标**: 为服务器子进程生命周期管理添加测试。

**测试覆盖**:
- 服务器启动：验证子进程 spawn 参数正确、环境变量传递正确
- 健康检查：模拟服务器响应，验证 health check 逻辑
- 进程退出清理：验证进程退出时子进程被 kill
- 端口冲突：验证端口分配逻辑的 fallback 行为
- 超时处理：验证启动超时后的错误处理

**mock 策略**:
- mock `child_process.spawn` 返回可控的 ChildProcess mock
- mock `fetch` 或 `http.get` 用于健康检查

---

### T5: 为 runtime/state.ts 添加单元测试

**目标**: 为 SnapshotStore 添加测试。

**测试覆盖**:
- 基本读写：set → get 返回正确值
- 持久化：写入后重新实例化，数据不丢失
- 边界情况：null/undefined key、空字符串、大对象
- 删除：delete 后 get 返回 undefined
- 并发：多个 set 操作不冲突

---

### T6: 为 runtime/updater.ts 添加测试

**目标**: 为自动更新器添加测试（mock electron-updater）。

**测试覆盖**:
- 更新检查：mock autoUpdater.checkForUpdates() 返回可用更新
- 下载进度：验证 progress 回调正确传递百分比
- 更新不可用：验证无更新时的行为
- 更新错误：验证 check/下载失败时的错误处理
- 用户交互：验证更新确认对话框逻辑

**mock 策略**:
- 创建 `electron-updater` 的 mock 模块
- 控制 autoUpdater 的事件触发（update-available、update-downloaded、error）

---

### T7: 为 runtime/dataImport.ts 添加测试

**目标**: 为数据库导入模块添加测试。

**测试覆盖**:
- 导入流程：验证导入函数的参数校验和错误处理
- 数据校验：验证导入数据的 schema 校验
- 事务处理：验证导入失败时的回滚行为
- 文件读取：验证文件不存在时的错误处理

**mock 策略**:
- mock Prisma client 避免真实数据库操作
- mock 文件系统操作

---

### T8: 为 stage-desktop.cjs 添加集成测试

**目标**: 为打包脚本添加集成测试（通过 child_process 执行脚本）。

**测试覆盖**:
- 脚本执行：验证脚本正常退出（exit code 0）
- 输出文件：验证打包产物存在于预期路径
- 文件结构：验证关键文件（main process、preload、renderer）存在
- 错误处理：验证缺少依赖时的错误提示

**技术要点**:
- 使用 `child_process.execFileSync` 或 `spawn` 执行脚本
- 测试可能需要较长时间（完整打包），考虑只测试关键路径

---

### T9: CI 集成与全量验证

**目标**: 确保测试在 CI 中可运行。

**改动点**:
- 更新 CI 配置（如有）加入 desktop 测试步骤
- `pnpm typecheck` — 零错误
- `pnpm --filter @ai-novel/desktop test` — 全量通过
- 验证所有测试在 headless 环境下可运行（无 GUI 依赖）

---

## DoD

- main.ts 可测试逻辑已拆分为独立模块（IPC handlers / windowManager / startupSequence）
- runtime/server.ts 单元测试覆盖核心路径
- runtime/state.ts 单元测试覆盖读写 + 边界情况
- runtime/updater.ts 单元测试通过（mock electron-updater）
- stage-desktop.cjs 集成测试通过
- 测试可在 CI 中运行
- typecheck 通过

---

## 验证步骤

1. `pnpm typecheck` — 零错误
2. `pnpm --filter @ai-novel/desktop test` — 所有测试通过
3. 验证测试不依赖 GUI（headless 环境可运行）
4. 验证 main.ts 拆分后桌面端启动行为不变

---

## 完成判定

- T1~T9 全部完成且 DoD 全部满足后，REQ-7025 达到"已完成"状态。
