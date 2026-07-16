---
reqId: 7074
title: "资源上下文重构 — 技术设计"
status: requirements_ready
priority: P3
complexity: M3
estimatedEffort: "0.5天"
version: v0.2
created: 2026-07-16
---

# REQ-7074: 资源上下文重构 — 技术设计

## 1. 当前结构

```
server/src/services/novel/runtime/
├── chapterLayeredContext.ts          # 主入口，层组合
├── chapterLayeredContextBlocks.ts    # 块定义（碎片化）
├── chapterLayeredContextHelpers.ts   # 核心构建逻辑（最重）
└── chapterLayeredContextShared.ts    # 共享类型 + 工具函数
```

## 2. 目标结构

```
server/src/services/novel/runtime/
├── chapterLayeredContext.ts          # 主入口（facade，对外接口不变）
├── chapterLayeredContextHelpers.ts   # 核心构建逻辑 + 原 blocks 内容
└── chapterLayeredContextTypes.ts     # 类型定义（从 shared 独立）
```

## 3. 合并规则

| 源文件 | 内容 | 目标 |
|--------|------|------|
| `chapterLayeredContextBlocks.ts` | 块定义函数 | → `chapterLayeredContextHelpers.ts` |
| `chapterLayeredContextShared.ts` | 类型/接口 | → `chapterLayeredContextTypes.ts`（新建） |
| `chapterLayeredContextShared.ts` | 工具函数 | → `chapterLayeredContextHelpers.ts` |
| `chapterLayeredContext.ts` | 保持 | 仅调整内部 import |

## 4. 不变约束

- 所有现有 import 路径保持不变（通过 `chapterLayeredContext.ts` facade 重导出）
- 不修改任何 prompt 文件
- 不修改 GenerationContextAssembler
