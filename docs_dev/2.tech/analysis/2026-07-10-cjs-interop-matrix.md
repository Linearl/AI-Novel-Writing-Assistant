---
description: "REQ-7026 CJS/ESM 互操作兼容性矩阵"
---

# CJS/ESM 互操作兼容性矩阵

## 1. 概述

盘点 server 所有依赖的模块系统类型，识别 CJS-only 高风险包，评估 tsx 下的互操作兼容性。

## 2. 分析日期

2026-07-10

## 3. 兼容性矩阵

### 3.1 生产依赖

| 包 | 版本 | 模块类型 | exports 字段 | 风险级别 | tsx 兼容性 | 备注 |
|----|------|----------|-------------|----------|------------|------|
| @ai-novel/shared | workspace:* | **ESM** | 有 | 无 | 无问题 | 内部包，ESM 原生 |
| @aws-sdk/client-s3 | 3.1037.0 | CJS | 无 | 中 | 可用 | CJS-only，tsx 可正确 import |
| @langchain/community | 1.1.21 | **ESM** | 有 | 无 | 无问题 | ESM 原生 |
| @langchain/core | 1.1.29 | **ESM** | 有 | 无 | 无问题 | ESM 原生 |
| @langchain/langgraph | 1.2.0 | **ESM** | 有 | 无 | 无问题 | ESM 原生 |
| @langchain/openai | 1.2.11 | **ESM** | 有 | 无 | 无问题 | ESM 原生 |
| @prisma/adapter-better-sqlite3 | 7.4.2 | CJS | 有 | 无 | 无问题 | Prisma managed，dual support |
| @prisma/adapter-pg | 7.4.2 | CJS | 有 | 无 | 无问题 | Prisma managed，dual support |
| @prisma/client | 7.4.2 | CJS | 有 | 无 | 无问题 | Prisma managed，dual support |
| better-sqlite3 | 12.6.2 | CJS | 无 | **高** | 有条件 | native addon，tsx 需验证 |
| compression | 1.8.1 | CJS | 无 | 中 | 可用 | 纯 JS CJS，tsx 自动转换 |
| cors | 2.8.6 | CJS | 无 | 中 | 可用 | 纯 JS CJS，tsx 自动转换 |
| dotenv | 17.3.1 | CJS | 有 | 无 | 无问题 | dual support |
| express | 5.2.1 | CJS | 无 | 中 | 可用 | 纯 JS CJS，tsx 自动转换 |
| express-rate-limit | 8.5.2 | **ESM** | 有 | 无 | 无问题 | ESM 原生 |
| helmet | 8.1.0 | CJS | 有 | 无 | 无问题 | dual support |
| langchain | 1.2.28 | **ESM** | 有 | 无 | 无问题 | ESM 原生 |
| morgan | 1.10.1 | CJS | 无 | 中 | 可用 | 纯 JS CJS，tsx 自动转换 |
| sharp | 0.35.1 | CJS | 有 | 无 | 无问题 | dual support |
| winston | 3.19.0 | CJS | 无 | 中 | 可用 | 纯 JS CJS，tsx 自动转换 |
| winston-daily-rotate-file | 5.0.0 | CJS | 无 | 中 | 可用 | 纯 JS CJS，tsx 自动转换 |
| zod | 4.3.6 | **ESM** | 有 | 无 | 无问题 | ESM 原生 |

### 3.2 开发依赖

| 包 | 版本 | 模块类型 | tsx 兼容性 | 备注 |
|----|------|----------|------------|------|
| @types/better-sqlite3 | 7.6.13 | 类型声明 | N/A | 仅类型，不影响运行时 |
| @types/compression | 1.8.1 | 类型声明 | N/A | 仅类型 |
| @types/cors | 2.8.19 | 类型声明 | N/A | 仅类型 |
| @types/express | 5.0.6 | 类型声明 | N/A | 仅类型 |
| @types/morgan | 1.9.10 | 类型声明 | N/A | 仅类型 |
| @types/node | 25.3.3 | 类型声明 | N/A | 仅类型 |
| prisma | 7.4.2 | CJS | 无问题 | CLI 工具，独立进程 |
| tsx | 4.23.0 | **ESM** | N/A | 运行时本身 |
| typescript | 5.9.3 | CJS | N/A | 编译器，不参与运行时 |

## 4. 风险分析

### 4.1 高风险：better-sqlite3（Native Addon）

**问题**: better-sqlite3 通过 `node-gyp` 编译的 C++ native addon，不遵循标准 CJS/ESM 模块约定。

**tsx 行为**: tsx 通过 `--import` 注册 Node.js loader。对 native addon 的支持取决于：
1. Node.js loader API 的 native 模块支持
2. better-sqlite3 的绑定方式（prebuild binaries）

**项目缓解**: better-sqlite3 在 tsx dev 模式下已正常运行。但生产环境长时间运行（30+ 分钟）的内存行为未验证。

**解决方案（如迁移 tsx）**: 
- 方案 A: 保留 CJS 构建链，仅 tsx 用于开发
- 方案 B: 使用 `--loader` 或 `node:module` register API
- 方案 C: 保持当前方案（tsc → node），不迁移

### 4.2 中风险：CJS-only 纯 JS 包

以下包为 CJS-only 但无 native 依赖，tsx 的 CJS→ESM 互操作层可正确处理：

- compression, cors, express, morgan, winston, winston-daily-rotate-file

**tsx 行为**: tsx 通过 `require()` 机制加载 CJS 模块，然后用 `__esModule` 标记桥接到 ESM import。这是成熟路径，无需特殊处理。

### 4.3 低风险：有 exports 的 CJS 包

- @prisma/client, @prisma/adapter-*, helmet, sharp, dotenv

这些包的 `exports` 字段同时声明了 `import` 和 `require` 条件，tsx 可自动选择正确的入口。

### 4.4 无风险：ESM 原生包

@langchain/*, langchain, zod, express-rate-limit, @ai-novel/shared

ESM 原生包在 tsx 和 tsc+node 下行为完全一致。

## 5. 模块系统分布统计

```
ESM 原生 (无风险):   10 个依赖 (45%)
CJS with exports:     6 个依赖 (27%)
CJS-only (中风险):    5 个依赖 (23%)  — 纯 JS，tsx 可处理
CJS-only (高风险):    1 个依赖 (5%)   — better-sqlite3 (native)
```

## 6. 结论

### tsx 迁移兼容性

| 场景 | 兼容性 | 建议 |
|------|--------|------|
| 开发模式（tsx watch） | 完全兼容 | 已在使用，无需变更 |
| 生产模式（tsx 直接运行） | **有条件兼容** | better-sqlite3 需额外验证 |
| tsc + node（当前方案） | 完全兼容 | 推荐保持 |

### 核心发现

1. **95% 的依赖在 tsx 下无兼容性问题**：10 个 ESM 原生 + 6 个 dual support + 5 个纯 JS CJS
2. **唯一高风险项是 better-sqlite3**：native addon 的 tsx 兼容性取决于运行时版本和平台
3. **CJS/ESM 互操作不是迁移障碍**：tsx 的自动转换机制成熟可靠
4. **真正的阻碍是运行时成熟度**，而非模块兼容性
