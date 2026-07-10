---
description: "REQ-7025 Desktop 包测试基础设施"
---

# REQ-7025 Desktop 包测试基础设施

> 状态：待激活

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7025 |
| 优先级 | P1 |
| 来源 | 架构诊断报告 2026-07-10 第8条发现 |
| 关联需求 | 无 |

---

## 1. 背景与问题

`desktop` 包共有 11 个 TypeScript 文件，测试覆盖率为 0%。核心模块缺乏测试：

| 文件 | 行数 | 职责 | 风险 |
|------|------|------|------|
| `main.ts` | 597 | 启动序列、窗口管理、IPC 处理 | 启动失败导致桌面端不可用 |
| `runtime/server.ts` | 316 | 服务器子进程生命周期管理 | 进程泄漏、端口冲突 |
| `runtime/updater.ts` | 215 | 自动更新器 | 更新循环、版本校验失败 |
| `runtime/dataImport.ts` | ~400 | 数据库导入 | 数据损坏风险 |
| `runtime/state.ts` | — | SnapshotStore | 窗口状态持久化 |
| `stage-desktop.cjs` | 240 | 打包脚本 | 打包失败导致无法发布 |

不改的后果：桌面端核心逻辑无回归保护，修改 main.ts 或 server.ts 后只能手动验证，效率低且易遗漏。

---

## 2. 目标与范围

### 2.1 目标

1. 拆分 `main.ts` 的可测试逻辑为独立模块（IPC 处理器、窗口管理、启动序列各提取为独立函数/模块）
2. 为 `runtime/server.ts` 添加单元测试（健康检查、端口分配、进程生命周期）
3. 为 `runtime/state.ts`（SnapshotStore）添加单元测试
4. 为 `runtime/updater.ts` 添加测试（mock `electron-updater`）
5. 为 `stage-desktop.cjs` 打包脚本添加集成测试

### 2.2 In Scope

**拆分与重构**：
- `desktop/src/main.ts` — 提取 IPC handler 注册、窗口创建、启动序列为独立函数
- 新建 `desktop/src/main/ipcHandlers.ts` — IPC handler 注册逻辑
- 新建 `desktop/src/main/windowManager.ts` — 窗口创建与管理
- 新建 `desktop/src/main/startupSequence.ts` — 启动序列编排

**测试文件**：
- `desktop/tests/main/ipcHandlers.test.ts`
- `desktop/tests/main/windowManager.test.ts`
- `desktop/tests/runtime/server.test.ts`
- `desktop/tests/runtime/state.test.ts`
- `desktop/tests/runtime/updater.test.ts`
- `desktop/tests/runtime/dataImport.test.ts`
- `desktop/tests/stage-desktop.test.ts`

### 2.3 Out of Scope

- 不引入新的测试框架（保持与 server 一致的 Node test runner）
- 不为纯 Electron 渲染进程代码（preload、renderer）添加测试
- 不做 E2E 测试（Electron 窗口级别的端到端测试）

---

## 3. 需求详情

### 3.1 测试框架选型

使用 Node.js 内置 test runner（`node:test` + `node:assert`），与 server 包保持一致。

### 3.2 main.ts 可测试化拆分

WHEN main.ts 需要测试，THE SYSTEM SHALL 将其可测试逻辑提取为独立可导出的函数模块。

拆分目标：
- IPC handler 注册函数：接收 `BrowserWindow` 参数，注册所有 IPC handlers，返回清理函数
- 窗口创建函数：接收配置参数，返回 `BrowserWindow` 实例（可 mock）
- 启动序列函数：编排初始化步骤，接收依赖注入（app、BrowserWindow 工厂等）

### 3.3 runtime/server.ts 测试

测试范围：
- 服务器启动：验证子进程正确启动、端口可访问
- 健康检查：验证 health endpoint 返回 200
- 进程生命周期：验证进程退出时子进程被正确清理
- 端口分配：验证端口冲突检测和 fallback 逻辑

### 3.4 runtime/state.ts 测试

测试范围：
- SnapshotStore 读写：验证窗口状态保存和恢复
- 并发安全：验证并发读写不丢失数据
- 边界情况：空 store、缺失 key、大尺寸状态

### 3.5 runtime/updater.ts 测试

测试范围（mock `electron-updater`）：
- 更新检查流程：mock autoUpdater.checkForUpdates()
- 下载进度事件：验证进度回调正确触发
- 错误处理：验证更新失败时的 fallback 行为

### 3.6 stage-desktop.cjs 集成测试

测试范围：
- 打包脚本执行：验证脚本正常完成不报错
- 输出文件存在性：验证打包产物在预期路径
- 文件结构正确性：验证关键文件（主进程、preload）存在于打包输出中

---

## 4. 验收标准

- [ ] `main.ts` 可测试逻辑已拆分为独立模块（IPC handlers / windowManager / startupSequence）
- [ ] `runtime/server.ts` 单元测试通过（覆盖健康检查、端口分配、进程生命周期）
- [ ] `runtime/state.ts` 单元测试通过（覆盖读写、并发、边界情况）
- [ ] `runtime/updater.ts` 单元测试通过（mock electron-updater）
- [ ] `stage-desktop.cjs` 集成测试通过
- [ ] 测试在 CI 中可运行（非交互模式）
- [ ] `pnpm typecheck` 通过
- [ ] 新增测试文件覆盖率达标

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| Electron 模块无法在 Node test runner 中直接 mock | 拆分可测试逻辑时不依赖 `electron` import，通过依赖注入传入 |
| `electron-updater` mock 困难 | 只 mock 行为接口，不 mock 内部实现 |
| `stage-desktop.cjs` 是 CJS 脚本 | 用 child_process 执行脚本，验证退出码和输出文件 |
| 拆分 main.ts 可能影响 Electron 启动行为 | 拆分后保留原 main.ts 作为入口，内部调用拆出的模块，行为不变 |

---

## 6. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-10 | 创建 | 基于架构诊断报告第8条发现生成需求文档 |
