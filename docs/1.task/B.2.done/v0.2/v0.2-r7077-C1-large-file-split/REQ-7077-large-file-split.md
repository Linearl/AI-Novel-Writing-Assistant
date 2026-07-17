---
description: Server 7+Client 3+Shared 4 共14个超700行文件的拆分重构
---

# REQ-7077 — 超大文件拆分重构

## 1. 背景

项目中有 14 个文件超过 700 行门槛（项目约定：>700 行必须重构），需要在保持功能完整性不变的前提下拆分为更小、更内聚的模块文件。

## 2. 目标

将全栈 14 个超大文件拆分为目标 ≤600 行的模块文件，拆分后通过 facade / index.ts 对外提供统一入口，内部实现细节不暴露给调用方。

## 3. 范围

### 包含

- Shared 层 4 个文件拆分（novel.ts 1208行、styleEngine.ts 856行、novelDirector.ts 810行、directorWorkflowStepCatalogData.ts 706行）
- Server 层 7 个文件拆分（chapterLayeredContextHelpers.ts 1046行、NovelPromptMaterialExporter.ts 771行、fallback.ts 731行、DirectorRuntimeStore.ts 727行、NovelWorldInstanceService.ts 711行、registry.ts 704行、novelDirectorAutoExecutionRuntime.ts 700行）
- Client 层 3 个文件拆分（TaskCenterPage.tsx 724行、NovelWorkspaceRail.tsx 704行、NovelExistingProjectTakeoverDialog.tsx 700行）
- 每个文件的 facade / index.ts 入口
- 相关 import 路径更新

### 不包含

- 业务逻辑变更
- 新功能添加
- 非本清单内其他超大文件

## 4. 非目标

- 不改变任何对外接口签名
- 不引入新的架构模式

## 5. EARS 验收条目

| ID | 验收条件 |
|----|----------|
| AC-1 | 全部 14 个文件拆分后的单文件行数均 ≤600 |
| AC-2 | 每个原文件对应的 facade/index.ts 保持与原文件相同的 export 签名 |
| AC-3 | 所有调用方 import 路径更新后，类型检查和测试通过 |
| AC-4 | `pnpm build` 全量构建通过 |
| AC-5 | `pnpm test:all` 全部测试通过 |
| AC-6 | `pnpm typecheck` 零新增错误 |

## 6. 风险与未决项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 拆分可能引入循环依赖 | 高 | 每个文件拆分前先分析依赖图，确保拆分方向遵循依赖单向原则 |
| import 路径变更可能遗漏调用方 | 中 | 依赖 TypeScript 编译器检查所有引用，逐个修复 |
| 大型文件拆分工作量大 | 中 | 按优先级分阶段执行，Shared → Server → Client |
