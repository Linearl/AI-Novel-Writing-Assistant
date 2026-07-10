---
description: "REQ-7025 Desktop 包测试基础设施 — 决策留痕"
---

# REQ-7025 决策留痕

## 决策记录

### D-01：测试框架选 Node test runner，不引入 jest/vitest

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-10 |
| 决策者 | AI 建议 |
| 决策内容 | 使用 Node.js 内置 `node:test` + `node:assert` 作为测试框架 |
| 决策理由 | server 包已使用 Node test runner，desktop 保持一致可降低认知负担；不引入额外依赖 |
| 备选方案 | vitest — 功能更强但需额外依赖，与 server 测试体系不一致；jest — Electron 生态常用但需额外配置 ts-jest |

### D-02：Electron 模块通过依赖注入隔离，不直接 mock

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-10 |
| 决策者 | AI 建议 |
| 决策内容 | main.ts 中依赖 Electron 模块的逻辑通过函数参数（依赖注入）传入，测试中传入 stub |
| 决策理由 | 直接 mock `electron` 包在 Node test runner 中较困难且脆弱。依赖注入让测试不依赖 Electron 运行时，可在任何 Node 环境执行 |
| 备选方案 | 使用 `jest.mock('electron')` — 需要 jest；使用 `electron-mock-ipc` — 依赖第三方库且可能版本滞后 |

### D-03：main.ts 保留为薄入口，不删除

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-10 |
| 决策者 | AI 建议 |
| 决策内容 | main.ts 拆分后保留原文件作为入口，内部改为调用拆出的模块 |
| 决策理由 | Electron 主进程入口文件路径在 `package.json` 的 `main` 字段中硬编码（或约定为 `dist/main.js`），保留原入口避免配置变更 |
| 备选方案 | 删除 main.ts，入口指向新文件 — 需要改 package.json 配置，风险更大 |

### D-04：stage-desktop.cjs 用 child_process 执行测试

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-10 |
| 决策者 | AI 建议 |
| 决策内容 | stage-desktop.cjs 集成测试通过 `child_process.execFile` 执行脚本，验证退出码和输出 |
| 决策理由 | stage-desktop.cjs 是独立 CJS 脚本，不是可 import 的模块。作为集成测试通过进程级执行验证更贴近真实使用场景 |
| 备选方案 | 将 stage-desktop.cjs 改为可 import 模块 — 会改变脚本的使用方式，与现有打包流程冲突 |
