---
description: "REQ-7026 TypeScript 5.9 Project References 评估"
---

# TypeScript 5.9 Project References 评估

## 1. 概述

评估 TypeScript Project References 能否替代当前路径别名方案，实现"改 shared 源码 → server 自动感知"的开发体验提升。

## 2. 当前方案分析

### 2.1 shared → server 类型传递

```
shared/tsconfig.json:
  module: ESNext
  moduleResolution: Bundler
  outDir: dist
  declaration: true

server/tsconfig.json:
  module: CommonJS
  moduleResolution: Node
  paths:
    @ai-novel/shared/* → ../shared/dist/*
```

**当前工作流**:
1. 修改 `shared/src/` 中的类型
2. 手动运行 `pnpm --filter @ai-novel/shared build`（编译到 dist/）
3. server 的 `tsc --noEmit` 或 `tsc` 才能感知到 shared 的变更
4. 或者 `pnpm build` 自动执行 shared → server 编译链

**痛点**:
- 修改 shared 后必须手动 build shared，否则 server 报类型错误
- 开发迭代周期：改 shared → 等 build → 重启 server → 验证
- 缺乏跨包类型即时反馈

### 2.2 client → 类型传递（对比）

```
client/tsconfig.json:
  paths:
    @ai-novel/shared → ../shared/index.ts
    @ai-novel/shared/* → ../shared/*
```

client 直接引用 shared 源码（通过 Vite 的源码依赖解析），无需 build shared。这是 Vite 的独特优势。

## 3. Project References 方案

### 3.1 配置设计

**shared/tsconfig.json**（增加 `composite: true`）:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": ".",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noEmit": false
  },
  "include": ["*.ts", "types/**/*.ts", "utils/**/*.ts"]
}
```

**server/tsconfig.json**（增加 `references`，修改 `paths`）:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "dist",
    "rootDir": "src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@ai-novel/shared/*": ["../shared/dist/*"]
    },
    "types": ["node"],
    "noEmit": false,
    "incremental": true,
    "tsBuildInfoFile": "dist/.tsbuildinfo"
  },
  "references": [
    { "path": "../shared" }
  ],
  "include": ["src/**/*.ts", "src/**/*.d.ts"],
  "exclude": ["dist", "node_modules"]
}
```

### 3.2 构建命令变更

| 命令 | 当前 | Project References |
|------|------|--------------------|
| shared build | `tsc -p tsconfig.json` | `tsc -p tsconfig.json`（不变） |
| server build | `tsc -p tsconfig.json` | `tsc --build`（或 `tsc -b`） |
| 增量构建 | 手动 | `tsc --build` 自动增量 |
| 全量构建 | 手动编排 | `tsc --build` 自动按依赖编排 |

### 3.3 VS Code 智能提示

Project References 的 `declarationMap: true` 配置允许 VS Code "Go to Definition" 跳转到 shared 源码而非 dist，开发体验显著提升。

### 3.4 watch 模式

```bash
tsc --build --watch
```

在 watch 模式下，修改 shared 源码会自动触发 shared 增量编译 + server 增量编译，无需手动操作。

## 4. 对比分析

| 维度 | 当前方案 | Project References |
|------|----------|--------------------|
| 类型传递可靠性 | 手动同步，容易遗漏 | 自动追踪依赖 |
| VS Code 智能提示 | 指向 dist（无 declaration map） | 指向源码（有 declaration map） |
| 增量编译 | 仅 server 内增量 | shared + server 联合增量 |
| 构建复杂度 | 简单（各自独立 tsc） | 略复杂（需 references 配置） |
| CI/CD 影响 | 无 | 需确保 shared 先编译 |
| 学习成本 | 低 | 中（references 概念） |
| 跨包类型错误 | 编译时才能发现 | 编译时自动发现 |

## 5. 实验结果

### 5.1 配置可行性

**可行**。Project References 的 `composite: true` + `references` 配置在 TypeScript 5.9 下工作正常。

### 5.2 与现有路径别名的关系

**不冲突**。Project References 和 `paths` 别名可以共存：
- `paths` 用于运行时路径解析（`@ai-novel/shared/*` → `../shared/dist/*`）
- `references` 用于 TypeScript 编译器的依赖追踪和增量编译

### 5.3 关键限制

1. **`composite: true` 要求 `declaration: true`**：shared 已有此配置，无影响
2. **`composite: true` 要求 `outDir` 必须在 `rootDir` 下**：需检查 shared 配置
3. **references 路径必须是相对路径**：当前 monorepo 结构兼容
4. **`--build` 模式下 `paths` 仍需指向 dist**：因为 references 仅做类型传递，不改变运行时解析

### 5.4 改进点

Project References 可以将 `paths` 中的 shared 引用改为源码路径（`../shared/*.ts`），这样 VS Code 可直接跳转到源码。但需注意：
- `paths` 用于 TypeScript 编译器的模块解析
- `references` 用于构建依赖追踪
- 两者独立但互补

## 6. 推荐方案

### 6.1 渐进式引入（推荐）

**Phase 1**: 仅添加 `references` + `composite: true`，保持 `paths` 不变
- 风险最低，立即获得增量编译和依赖追踪能力
- 验证期：1-2 周

**Phase 2**: 修改 `paths` 指向源码（可选）
- 需要同时更新 Vite 配置
- 风险：source map 和 sourcemap 可能受影响

### 6.2 当前方案保持

如果迁移 ROI 不足，保持当前方案也可接受：
- 手动 build shared 的痛点可通过 `dev:shared` watch 模式缓解
- 当前方案成熟稳定，无迁移风险

## 7. 结论

Project References **技术上可行**，可显著改善开发体验（增量编译、依赖追踪、VS Code 智能提示）。建议在条件成熟时分 Phase 1 → Phase 2 渐进引入。当前保持现有方案也无大碍。
