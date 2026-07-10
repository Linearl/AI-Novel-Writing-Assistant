---
description: "REQ-2047 文笔资料库——任务拆解"
update_time: 2026-07-09
---

# REQ-2047 任务拆解

> 状态：✅ 完成

## 任务概述

### 1. 来源

用户需求讨论 2026-07-09。核心诉求：建立可管理的文笔技法库，在润色增强时由 AI 自动筛选注入。

### 2. 问题

- 润色增强不接入 StyleContract，产出质量低
- 缺少正向文笔技法指导机制
- 40+ 篇技法素材未结构化利用

### 3. 需求

- 技法 MD 文件 + DB 同步 + 三级池子
- 文笔资料库管理页面
- AI 两阶段筛选 + 注入
- 润色增强接入 StyleContract

### 4. 验收标准

> 见 [REQ-2047.md](./REQ-2047-writing-technique-library.md) 第 4 节。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 技法 MD 文件批量提取与精炼 | P0 | 2h | ✅ 完成（59 个技法） |
| T1b | 反 AI 规则 YAML 迁移 | P0 | 1h | ✅ 完成（24 条 YAML） |
| T2 | 数据模型与 DB 同步机制 | P0 | 3h | ✅ 完成（Prisma + FileToDbSyncService） |
| T3 | 后端 API（CRUD + 池子解析 + AI 筛选 prompt） | P0 | 4h | ✅ 完成 |
| T4 | 文笔资料库前端管理页面 | P1 | 3h | ✅ 完成 |
| T5 | 画像编辑器集成文笔技法面板 | P1 | 2h | ✅ 完成 |
| T6 | 润色增强接入 StyleContract + 技法注入 | P0 | 4h | ✅ 完成 |

---

## 逐项展开

### T1: 技法 MD 文件批量提取与精炼

**目标**: 从 `temp/写法学习` 的 40+ 篇原始素材中，批量提取并精炼为结构化技法 MD 文件。

**改动点**:
- `server/src/data/writingTechniques/*.md` — 新增 40+ 篇技法文件
- 每个文件包含 frontmatter (name/description/category) + 精炼 body (200-500字)

**执行方式**:
1. 使用 AI 批量处理，一次性从原始素材提取
2. 生成后人工 review / 微调
3. 剔除非技法帖（情书、林徽因等）

**分类**:
- 句法：镜头句、涟漪句、枯笔句、炊烟句、落点句、落差句、棱镜句、灰阶句、双轨句、回旋句、光线句、咬尾句
- 修辞：通感、倒喻、列锦、转品、对偶句、对顶、约喻、奇设、同语反复、陌生化
- 对话：冰山对话法
- 叙事：蒙太奇、跳笔、伏笔、倒着写、倒为因果、预言回响、意象反杀、逆挽、意识流、岐凝
- 描写：留白、空镜、物候、物化、冷笔触、拟音、把形容词全删掉
- 节奏：封底、漂亮废话

### T1b: 反 AI 规则 YAML 迁移

**目标**: 将反 AI 规则从 `defaults.ts` 硬编码迁移到 YAML 文件，与文笔技法共享文件-DB 同步模式。

**改动点**:
- `server/src/data/antiAiRules/*.yaml` — 22 个 YAML 文件（12 条现有 + 10 条新增）
- `server/src/services/styleEngine/defaults.ts` — 删除 `DEFAULT_ANTI_AI_RULES` 数组
- `server/src/services/styleEngine/StyleEngineSeedService.ts` — 改为扫描 YAML 目录 seed
- `temp/anti-ai-rules-import.json` — 已生成的 10 条新规则 JSON（转为 YAML）

**规则清单**:
- 现有 12 条：forbid-explicit-psychology, forbid-ending-elevation, forbid-theme-summary, forbid-direct-preaching, risk-even-paragraph-length, risk-three-paragraphs-exposition, risk-dialogue-too-functional, risk-repeated-sentence-structure, encourage-useless-action, encourage-reality-gap, encourage-hard-mouth-compensation, encourage-life-noise
- 新增 10 条：forbid-zombie-emotion-words, forbid-intensifier-adjective, forbid-cliche-metaphor, forbid-emotion-label, forbid-empty-adjective, forbid-sensory-filter, risk-logic-cement, risk-vague-generalization, forbid-cliche-opening, forbid-eye-red-cliche

**依赖**: 与 T2 共享文件扫描同步机制

### T2: 数据模型与 DB 同步机制

**目标**: 创建 Prisma schema（3 张表），实现启动时自动同步机制。

**改动点**:
- `server/src/prisma/schema.prisma` — 新增 WritingTechnique / WritingTechniqueProfileBinding / WritingTechniqueNovelBinding
- `server/src/services/styleEngine/WritingTechniqueService.ts` — 新增服务（CRUD + syncFromFiles + resolvePool）
- `server/src/services/styleEngine/WritingTechniqueSyncService.ts` — 文件扫描与 DB 同步

**依赖**: T1（需要技法文件存在）

### T3: 后端 API + AI 筛选 prompt

**目标**: 暴露 REST API + 实现 AI 筛选 PromptAsset。

**改动点**:
- `server/src/routes/writingTechniques.ts` — 新增路由文件
- `server/src/app.ts` — 挂载路由
- `server/src/prompting/prompts/writingTechnique/techniqueScreening.prompt.ts` — AI 筛选 prompt
- `server/src/prompting/registry.ts` — 注册 prompt

**API**:
- `GET /api/writing-techniques` — 列表
- `GET /api/writing-techniques/:key` — 详情
- `PUT /api/writing-techniques/:key/toggle` — 全局开关
- `GET /api/writing-techniques/pool` — 三级池子解析
- `GET/PUT /api/style-profiles/:id/writing-techniques` — 画像绑定
- `POST /api/writing-techniques/screen` — AI 筛选

**依赖**: T2

### T4: 文笔资料库前端管理页面

**目标**: 新增 `/writing-techniques` 路由页面，支持浏览、筛选、开关技法。

**改动点**:
- `client/src/pages/writingTechniques/WritingTechniquesPage.tsx` — 主页面
- `client/src/pages/writingTechniques/components/TechniqueList.tsx` — 列表组件
- `client/src/pages/writingTechniques/components/TechniqueDetail.tsx` — 详情预览
- `client/src/pages/writingTechniques/components/TechniqueStats.tsx` — 统计信息
- `client/src/router/index.tsx` — 注册路由
- `client/src/components/layout/Sidebar.tsx` — 侧边栏添加入口（放在反 AI 规则下方）
- `client/src/api/writingTechniques.ts` — API 客户端
- `client/src/api/queryKeys.ts` — 查询键

**依赖**: T3

### T5: 画像编辑器集成文笔技法面板

**目标**: 在写法引擎画像编辑器中新增"文笔技法"绑定面板。

**改动点**:
- `client/src/pages/writingFormula/components/WritingFormulaEditorPanel.tsx` — 新增技法面板
- 或新建 `WritingFormulaTechniquesPanel.tsx` — 独立技法绑定组件

**依赖**: T3, T4

### T6: 润色增强接入 StyleContract + 技法注入

**目标**: 修复 styleSummary gap，新增 AI 技法筛选和注入步骤。

**改动点**:
- `server/src/services/novel/chapterEditor/ChapterEditorWorkspaceService.ts` — 调用 StyleBindingService.resolveForGeneration() 获取 StyleContract
- `server/src/services/novel/chapterEditor/chapterEditorShared.ts` — buildStyleSummary() 升级为 buildStyleContractText()
- `server/src/services/novel/chapterEditor/NovelChapterEditorService.ts` — previewAiRevision() 新增筛选步骤
- `server/src/prompting/prompts/novel/chapterEditor/rewriteCandidates.prompts.ts` — 新增文笔技法区块 + system prompt 指令
- `shared/types/novel.ts` — 更新相关类型（如需）

**流程**:
```
loadContext() → 获取 StyleContract + resolvedPool
  ↓
Step 2: AI 筛选（候选概述 + 选中文字 → 最多 5 条技法）
  ↓
Step 3: 加载选中技法全文
  ↓
Step 4: 注入改写 prompt（StyleContract + 文笔技法 + 原有上下文）
```

**依赖**: T2, T3

---

## DoD（Definition of Done）

- 所有 T1~T6 完成
- `pnpm typecheck` 通过
- `pnpm test` 通过
- 手动验证：选中文字 → AI 优化 → 看到技法被筛选和注入 → 候选改写质量提升
- 40+ 篇技法文件全部入库且可浏览

---

## 依赖

- 前置依赖：无硬性前置（StyleEngine、章节编辑器已就绪）
- 内部依赖：T1 → T2 → T3 → T4/T5/T6
- T6 依赖 T2（StyleContract 需要 StyleBindingService）

---

## 验证步骤

1. 技法文件存在且格式正确（frontmatter + body）
2. 启动服务后 DB 自动同步，`GET /api/writing-techniques` 返回完整列表
3. 全局开关 toggle 生效
4. 画像绑定可在写法引擎页面操作
5. 润色增强时，AI 筛选步骤正确输出技法 key
6. 改写 prompt 中包含文笔技法区块
7. `pnpm typecheck` + `pnpm test` 全量通过

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-07-10 | 全部完成 | 标记 done |
| 2026-07-09 | 需求确认 + 六件套创建 | 完成 |

---

## 完成判定

- T1~T6 全部完成且 DoD 全部满足后，REQ-2047 达到"已完成"状态。
