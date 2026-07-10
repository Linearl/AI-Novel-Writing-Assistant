---
description: "QUA-022: directorRuntime.ts 渐进拆分（1275行→主文件≤475行+3个子文件+barrel）"
---

# REQ-7037：directorRuntime.ts 渐进拆分

## 背景

`shared/types/directorRuntime.ts` 1275 行，103 个导出，超项目 700 行约束 82%。shared 包的大文件影响前后端双方构建。

## 决策

**方案 B：渐进拆分**。先拆 3 个最大域，加 barrel `index.ts` 兼容旧 import 路径。

## 拆分目标

| 子文件 | 内容 | 推估行数 |
|--------|------|----------|
| `directorRuntimeProjection.ts` | Projection（运行时投影、进度、质量债务、章节执行进度） | ~250 |
| `directorRuntimeWorker.ts` | Worker（状态、下一步动作、健康摘要） | ~350 |
| `directorRuntimeAutomation.ts` | Automation（自动化状态、Action、Timeline、Artifact） | ~200 |

拆分后主文件 ~475 行（5-397 的 types/usage/events 域保留）。

## 验收标准

- [ ] 3 个子文件创建完毕，主文件 ≤700 行
- [ ] `directorRuntime/index.ts` barrel re-export 所有 103 个导出
- [ ] `import { X } from "@ai-novel/shared/types/directorRuntime"` 仍可用
- [ ] `pnpm --filter @ai-novel/shared build` 通过
- [ ] `pnpm typecheck` 通过（server + client）
- [ ] `pnpm test` 通过
