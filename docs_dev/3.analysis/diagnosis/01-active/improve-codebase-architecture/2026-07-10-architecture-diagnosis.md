---
description: 项目架构全面诊断报告 — 识别 10 个架构摩擦点，按影响度排序，含根因分析与改进建议
created: 2026-07-10
updated: 2026-07-10
status: active
---

# 项目架构诊断报告

> **诊断日期**: 2026-07-10 | **范围**: 全部 4 个子包 (shared / server / client / desktop)

---

## 量化总览

| 指标 | shared | server | client | desktop | 合计 |
|------|--------|--------|--------|---------|------|
| TS 源文件 | 108 | ~885 | ~454 | 11 | ~1,458 |
| 总代码行 | 37,756 | 33,061 | 13,912 | ~3,000 | ~87,729 |
| 测试文件 | 0 | 231 | 6 | 0 | 237 |
| 测试代码行 | 0 | ~60,500 | ~1,000 | 0 | ~61,500 |
| >700 行的文件 | 5 | ~15 | ~20 | 0 | ~40 |
| Zod schema 定义 | 1,695 (14 文件) | 407 (121 文件) | — | — | — |

---

## 发现摘要

13 个架构摩擦点，按影响程度排序：

1. **services/ vs modules/ vs routes/ 三层并存，无明确归并时间线** — 核心架构收敛方向未执行到位
2. **无依赖注入，测试靠 monkey-patching** — Prisma 方法被直接替换，脆弱且非线程安全
3. **shared 类型层无测试 + 双 barrel 不匹配** — 共享契约缺乏自动验证
4. **Zod schema 在 shared 和 server 间大量重复定义** — 单点真理分裂
5. **services/ 目录严重膨胀** — 516 文件，多个 >650 行文件濒临上限
6. **测试目录扁平化** — ~220 文件无层级，导航困难；无覆盖率工具
7. **客户端缺少共享 hooks 抽象** — 重复 mutation 模式，god component 未拆分
8. **desktop 包零测试** — 完整启动链、IPC、更新器、数据库导入均未覆盖
9. **构建链：ESM/CJS 双模块系统 + 路径别名指向 dist** — 增大迭代摩擦
10. **Legacy 代码滞留** — chatStore、旧路由仍存在但已被重定向
11. **Director 子系统自成体系** — 124 文件，独立的事件/投影基础设施与 EventBus 并行
12. **Prisma schema 超大型** — 3,326 行，131 模型，增长无放缓
13. **NovelApplicationServices 门面过大** — 130 方法接口 + 694 行纯委托

---

## 详细分析

### 1. services/ vs modules/ vs routes/ 三层并存

**涉及文件**: `server/src/services/` (516 文件, 62 子目录), `server/src/modules/` (57 文件), `server/src/routes/` (30 文件)

**问题**: CLAUDE.md 定义了收敛方向 `app/ → platform/ → modules/`，但实际代码分布呈现三重结构：

- `modules/` — 仅含 novel、export、setup、timeline、feedback 的 HTTP 入口，57 个文件
- `services/` — 承载几乎所有业务逻辑，516 个文件
- `routes/` — 仍在接收新路由文件（如 `settings.ts` 706 行，`styleEngine.ts` 606 行）

三者的路由注册分散在 `app.ts` 中混合导入：

```typescript
// app.ts — 三种注册方式混用
import novelRouter from "./modules/novel/http/novel";          // modules/
import novelDirectorRouter from "./services/novel/director/http/novelDirector"; // services/
import settingsRouter from "./routes/settings";                // routes/
```

**影响**: 新开发者无从判断"新功能路由该放哪"。架构收敛声明与实际不一致，降低了规则约束力。

**方案**:
- 明确 modules/ 的目标范围：仅作为 HTTP 入口层（请求解析、响应序列化），不包含业务逻辑
- routes/ 下所有已有文件加入迁移清单并标注优先级
- app.ts 统一只从 modules/ 或 platform/ 导入路由注册函数

---

### 2. 无依赖注入，测试靠 monkey-patching

**涉及文件**: `server/tests/helpers/prismaMock.js`, 所有 231 个测试文件

**问题**: 服务之间通过顶层 `new` 或工厂函数直接实例化依赖，无 DI 容器。测试通过 `prismaMock.js` 直接替换 Prisma 模型上的方法：

```javascript
// prismaMock.js — 直接 monkey-patch
mockPrismaModel(prisma, "novel", ["findUnique", "findMany"]);
```

**影响**:
- 测试之间共享状态，并发时可能互相污染
- 不能 mock Prisma 以外的依赖（EventBus、Logger、外部服务）
- 重构服务构造函数时需要同步修改所有 mock 调用点

**方案**:
- 引入轻量级手动 DI（如 tsyringe 或简单的工厂函数注入），不用全套 IoC 容器
- 每个 service 的构造函数显式接收依赖接口，方便测试替换
- 迁移可从 director 核心模块开始（测试最多、最深），逐步推广

---

### 3. shared 类型层无测试 + 双 barrel 不匹配

**涉及文件**: `shared/index.ts`, `shared/types/index.ts`, `shared/types/chapterRuntime.ts` (1,044 行)

**问题**:
- `shared/index.ts` 仅导出 32 个类型模块
- `shared/types/index.ts` 导出 55 个类型模块
- 两者间 23 个模块仅存在于内层 barrel，`import { X } from "@ai-novel/shared"` 不可用，必须用 `@ai-novel/shared/types/creativeHub` 等深层路径
- `chapterRuntime.ts` 1,044 行、741 次 zod 调用——远超 >700 行重构阈值
- shared 包没有测试：忘记 `shared build` 时，过期的 `.d.ts` 静默传播到 server/client

**影响**: 新类型不知道应加入哪个 barrel；大型类型文件难以导航；共享契约层的错误只能在 server/client 构建时发现。

**方案**:
- 统一两个 barrel：要么 `shared/index.ts` 包含所有类型（只需 `import {} from "@ai-novel/shared"`），要么显式文档说明分桶规则
- 拆分 `chapterRuntime.ts` 为按子域的文件（`chapterDraft.ts`, `chapterReview.ts` 等）
- 为 shared 包添加基础的 schema 验证测试（zod parse 测试）

---

### 4. Zod schema 在 shared 和 server 间重复定义

**涉及文件**: `shared/types/` (14 文件, 1,695 zod 调用), `server/src/` (121 文件, 407 zod 调用)

**问题**: shared 层定义了 zod schema 但 server 侧又独立定义了 407 个 zod 调用。部分可能是"相同的 schema 不同的文件"，部分是"server 特有逻辑"。但 407 > 0 说明存在重复。具体来说：
- 共享层 `characterResource.ts` 有 130 个 zod 调用
- 共享层 `canonicalState.ts` 有 177 个 zod 调用
- Server 侧仍然独立定义了 zod schema——这些 schema 是否已与 shared 同步？

**影响**: 当 shared schema 变更时，server 侧的重复 schema 可能遗漏更新，导致运行时类型不匹配。

**方案**:
- 审计 server 侧所有 zod 调用，判断是可合并到 shared 还是纯 server 内部逻辑
- 对可合并的 schema，采用 `sharedTypes.schema.extend()` 模式而非独立重写

---

### 5. services/ 目录严重膨胀

**涉及文件**: `server/src/services/` (516 文件, 62 子目录)

**问题**: 516 个文件远超可管理阈值。多个文件在 650-720 行区间，即将触发 >700 行强制重构：
- `PayoffLedgerSyncService.ts` 719 行
- `novelDirectorAutoExecutionRuntime.ts` 697 行
- `NovelApplicationServices.ts` 694 行
- `plannerChapterGeneration.ts` 688 行
- `ragIndexServiceDataPipeline.ts` 683 行
- `registry.ts` 680 行
- `NovelWorkflowHealingService.ts` 673 行

`services/novel/` 下有 34 个子目录，其中 `director/` 下有 11 个子目录，层级深达 4 级。

**影响**: 新功能不知放哪个子目录；跨 service 的依赖关系难以追踪；多个文件处于重构临界点。

**方案**:
- 对 >650 行的文件制定拆分计划（非紧急，但在下次修改时顺便执行）
- director 子目录考虑再收敛：`debug/` + `commands/` 是否可以合并为 `operations/`
- `services/novel/application/sharedNovelServices.ts` 语义模糊——它是"工厂"还是"注册中心"？

---

### 6. 测试目录扁平化 + 无覆盖率

**涉及文件**: `server/tests/` (231 文件, ~220 个在根目录)

**问题**:
- ~220 个测试文件平铺在一个目录下——无层级，只能靠字母排序查找
- 没有覆盖率工具（Node 原生 test runner 不内置）
- 测试跑在编译后的 `dist/` CJS 输出上，每次需 `shared build → server build`
- 集成测试和单元测试混在一起，仅靠文件名前缀区分

**影响**: 找不到特定领域的测试文件；无法量化覆盖率；每次测试迭代需要额外 10-30 秒构建等待。

**方案**:
- 按领域重构测试目录结构：`tests/director/`, `tests/novel/`, `tests/prompting/` 等（部分已有如 `tests/novel/chapter/`）
- 引入 `c8` 或 Node 22+ 内置 `--experimental-test-coverage` 做覆盖率
- 评估 `tsx` + `node --test` 是否可以替换 `dist/` 执行（减少构建步骤）

---

### 7. 客户端架构摩擦

**涉及文件**: 多个 client/src 下文件

**四个子问题**:

**7a. NovelWorkspaceRail.tsx (678 行) — God Component**
- 混合了布局、数据获取（6+ React Query hooks）、mutation、导航和 Dialog 状态
- 每新增一个 workspace 功能就往里塞更多逻辑

**7b. 共享 hooks 目录几乎为空**
- `hooks/` 仅 3 个文件（`useSSE`, `useLocalDB`, `useDirectorChapterTitleRepair`）
- 每个页面手工重复 "useMutation → onSuccess invalidate + toast.success → onError toast.error" 模式
- 可抽取 `useMutationWithToast` 将 20 行减为 2 行

**7c. 多个 >800 行文件**
- `PromptSlotPanel.tsx` 843 行
- `WorldVisualizationBoard.tsx` 837 行
- `WritingFormulaPage.tsx` 811 行

**7d. 遗留代码滞留**
- `chatStore.ts` (168 行) 通过 IndexedDB 持久化聊天，但 `/chat` 路由重定向至 `/creative-hub`
- `vite-plugin-pages` 已安装但未使用（vite.config.ts 无引用，路由为手动 react-router-dom 配置）

**方案**:
- 拆分 NovelWorkspaceRail 为 layout shell + data provider + navigation controller
- 创建 `hooks/useApiMutation.ts` 统一变异模式
- 清理或标注遗留代码（chatStore, vite-plugin-pages）

---

### 8. desktop 包零测试

**涉及文件**: `desktop/src/` (11 文件), `desktop/scripts/stage-desktop.cjs` (240 行)

**问题**: desktop 包完全没有测试，但包含大量关键逻辑：
- `main.ts` (597 行) — 启动序列、窗口管理、IPC 注册、更新检查
- `runtime/server.ts` (316 行) — 服务器子进程生命周期管理
- `runtime/updater.ts` (215 行) — electron-updater 控制
- `runtime/dataImport.ts` (~400 行) — 遗留数据库导入
- `stage-desktop.cjs` (240 行) — pnpm 符号链接处理、Prisma 客户端嵌入

**影响**: 桌面打包流程的任何改动都靠手动验证，没有自动化回归保护。

**方案**:
- 优先：拆分 `main.ts` 的可测试逻辑到独立模块
- 为 `runtime/server.ts`、`runtime/state.ts` 添加单元测试
- 为 `stage-desktop.cjs` 添加集成测试

---

### 9. 构建链摩擦

**涉及文件**: 各 `tsconfig.json`, `server/scripts/run-tests.cjs`

**三个子问题**:

**9a. ESM/CJS 分裂**
- shared 和 client 编译为 ESNext/Bundler
- server 和 desktop 编译为 CommonJS/Node
- 同一个仓库维护两套模块解析策略

**9b. 路径别名直指 dist/**
- server 的 `@ai-novel/shared/*` 解析到 `../shared/dist/*`
- 必须先 build shared 才能对 server 做 typecheck
- 开发迭代链路：改 shared 源码 → build shared → 重启 server

**9c. Prisma generate 不在构建链中**
- `server build` 不执行 prisma generate
- 需要额外步骤：`prisma:generate → build`

**方案**:
- 评估将 server 迁移到 ESNext + tsx 运行时的可行性（去掉 CJS 编译步骤）
- 使用 TypeScript 5.9 Project References 替代路径别名（让 tsc 自动 build 依赖）
- 将 prisma:generate 加入 `server build` 的 `prebuild` hook

---

### 11. Director 子系统自成体系 + 独立事件基础设施

**涉及文件**: `server/src/services/novel/director/` (124 文件, 11 子目录)

**问题**: Director 是最复杂的子系统，但存在几个结构性摩擦：

**11a. 与全局 EventBus 并行运行**
`events/EventBus.ts` 定义了 7 种小说领域事件类型，但 Director 自己维护了独立的 `DirectorEventProjectionService` 和 `DirectorEventProjectionHelpers.ts` (581 行)。两个事件系统之间没有明确的桥接或分工——不清楚哪些逻辑应该通过 EventBus，哪些通过 Director 内部投影。

**11b. runtime/ 子目录过大**
`director/runtime/` 有 36 个文件，其中 takeover 逻辑分散在 9 个文件中（`novelDirectorTakeover.ts` 596 行 + 8 个辅助文件）。还有自己独立的 `state/` 子目录（`DirectorStateStore.ts`、`DirectorStateCommitter.ts`、`DirectorStateReader.ts`），与 director 根目录下的同名文件存在潜在重复。

**11c. 最大文件接近重构线**
`novelDirectorRuntimeOrchestrator.ts` 622 行，`novelDirectorAutoExecutionRuntime.ts` 697 行——都在接近 >700 行的强制重构阈值。

**影响**: Director 的修改需要同时理解两套事件机制；新功能不知道应以哪种模式输出事件。

**方案**:

- 明确 EventBus 和 Director 投影的职责分工——EventBus 用于跨模块广播，Director 投影用于内部状态持久化
- 将 director state 文件去重：保留 `director/state/` 子目录或根目录下文件，不同时存在
- 制定 takeover 文件收敛计划（9→4 个文件）

---

### 12. Prisma Schema 超大型

**涉及文件**: `server/src/prisma/schema.prisma` (3,326 行, 131 模型, 43 枚举)

**问题**: Schema 文件超过 3,000 行，每个新增需求（drama-forge、comic、auto-director 后续等）都在持续追加新模型。增长没有放缓迹象。

特定问题：

- `Novel` 模型的字段趋于扁平化（50+ 列），新增配置项直接加列而非用 JSON 字段或关联表
- Schema 在 VS Code 中的 Prisma 语言服务可能延迟
- 54+ 迁移文件，双数据库（SQLite + PostgreSQL）迁移目录，维护负担大

**影响**: Schema 越大，每次 `prisma generate` 越慢；新开发者理解数据模型需要阅读 3,000+ 行。

**方案**:
- 评估将非核心模型（drama-forge、comic）拆分到独立 Prisma schema 文件（多 schema 支持）
- `Novel` 表过宽的列考虑收敛为结构化 JSON 字段（PostgreSQL jsonb / SQLite text json）
- 统一 SQLite 和 PostgreSQL 迁移历史，减少冗余维护

---

### 13. NovelApplicationServices 门面过大

**涉及文件**: `server/src/services/novel/application/NovelApplicationContracts.ts`, `NovelApplicationServices.ts` (694 行)

**问题**: `NovelApplicationContracts.ts` 定义了一个 ~130 方法的接口。`NovelApplicationServices.ts` 的 694 行几乎全是纯方法委托——将调用转发给子服务，不包含业务逻辑。

```typescript
// 典型的门面方法——纯委托
async getNovel(id: string): Promise<Novel | null> {
  return this.core.getNovel(id);
}
```

**影响**: 每新增一个 novel 子服务就要在三处改动：contract 接口 + 实现 + 路由注册。门面本身无杠杆（删除它后调用者会直接依赖子服务→复杂性没有集中，仅是移动）。

**方案**:

- 将门面缩减为仅处理跨服务协调的方法（如 `createNovelWithWorld` 需要多个子服务协作）
- 单服务方法直接由调用方持有子服务引用

---

**涉及文件**: `client/src/store/chatStore.ts`, `client/src/api/chat.ts`, `server/src/routes/chat.ts`, `vite-plugin-pages` 依赖

**问题**:
- Chat 相关功能已被 Creative Hub 取代（`/chat` → `/creative-hub` 301 重定向）
- 但 chatStore、chat API、chat route 文件仍然存在且被导入
- `vite-plugin-pages` 在 `devDependencies` 但未在 vite.config.ts 中使用

**影响**: 维护者可能误以为需要同时维护两套聊天系统；旧代码占用阅读时间。

**方案**:
- 在遗留文件顶部添加 `@deprecated` JSDoc 注释，注明替代方案和预计移除时间
- `vite-plugin-pages` 从 devDependencies 移除

---

## 综合评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 模块深度 | ⭐⭐⭐ | 核心业务（director, chapter runtime）封装良好，但 services/ 膨胀稀释了深度 |
| 架构一致性 | ⭐⭐ | 三层路由注册并存，收敛方向未执行到位 |
| 可测试性 | ⭐⭐ | server 测试覆盖尚可但靠 monkey-patch；shared/desktop 零测试 |
| AI 可导航性 | ⭐⭐⭐ | 文件命名规范好，prompt registry 治理清晰，但 services/ 文件数太多 |
| 构建效率 | ⭐⭐ | CJS/ESM 双轨、dist 指向、Prisma generate 步骤分离，迭代摩擦大 |
| 代码债权 | ⭐⭐ | 遗留代码、god components、接近上限的大文件、barrel 不匹配 |

---

## 建议优先级

| 优先级 | 改进项 | 预计工作量 | 影响面 |
|--------|--------|-----------|--------|
| P0 | 统一 shared barrel 导出 | 0.5 天 | 全项目类型引用 |
| P0 | 清理遗留代码 + 未使用依赖 | 0.5 天 | client |
| P1 | 引入 DI / 工厂模式（先从 director 开始） | 3-5 天 | server 测试 |
| P1 | 拆分 >700 行文件 | 2-3 天 | server + client |
| P1 | routes/ → modules/ 迁移清单 + 时间线 | 1 天（规划）| server |
| P2 | 重组测试目录 + 引入覆盖率 | 2-3 天 | server |
| P2 | 客户端共享 hooks 抽象 | 1-2 天 | client |
| P2 | shared Zod schema 去重审计 | 1-2 天 | shared + server |
| P3 | 评估 ESM 统一迁移 | 研究阶段 | 构建链 |
| P3 | desktop 包测试建设 | 3-5 天 | desktop |
| P3 | shared 包 schema 验证测试 | 1 天 | shared |

---

*报告由 improve-codebase-architecture skill 生成，基于三个并行 Explore agent 的全仓库扫描数据。*
