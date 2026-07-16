---
description: "REQ-7054: Book Analysis 拆书系统 — 技术设计"
update_time: "2026-07-14"
status: requirements_ready
---

# REQ-7054: Book Analysis 拆书系统 — 技术设计

## 1. 架构设计

### 1.1 系统架构

```text
┌─────────────────────────────────────────────────────────┐
│                    前端 (React)                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  BookAnalysisPage (DualPaneLayout)               │   │
│  │  ├─ BookAnalysisSidebar (导航)                   │   │
│  │  ├─ BookAnalysisChapterReader (阅读)             │   │
│  │  ├─ BookAnalysisStructuredSummary (摘要)         │   │
│  │  ├─ BookAnalysisCharacterPanel (角色)            │   │
│  │  ├─ BookAnalysisCharacterAppearancePanel (外貌)  │   │
│  │  ├─ BookAnalysisCharacterImagePanel (肖像)       │   │
│  │  ├─ BookAnalysisSourceRangePicker (分段)         │   │
│  │  └─ BookAnalysisBudgetAdjustDialog (预算)        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    后端 (Express)                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  HTTP Layer: bookAnalysisCharacterRoutes         │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Application Layer                               │   │
│  │  ├─ BookAnalysisCommandService (写操作)          │   │
│  │  ├─ BookAnalysisQueryService (读操作)            │   │
│  │  └─ BookAnalysisWatchdogService (并发控制)       │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Domain Layer                                    │   │
│  │  ├─ generation/ (文档分段、分析管线、生命周期)     │   │
│  │  ├─ bookAnalysisCharacter/ (角色画像、外貌、媒体) │   │
│  │  ├─ publish/ (导出、发布)                         │   │
│  │  └─ caching/ (缓存、预算)                         │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Infrastructure Layer                            │   │
│  │  ├─ bookAnalysis.concurrent (并发控制)            │   │
│  │  ├─ bookAnalysis.progress (进度追踪)              │   │
│  │  ├─ bookAnalysis.queue (任务队列)                 │   │
│  │  └─ bookAnalysis.serialization (序列化)           │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Prompt Layer (server/src/prompting/)             │   │
│  │  ├─ bookAnalysis.prompts (12 个 PromptAsset)     │   │
│  │  ├─ bookAnalysisChapter.prompts                   │   │
│  │  └─ bookAnalysisCharacter.prompts                 │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Prisma (SQLite / PostgreSQL)                │
│  ├─ BookAnalysis                                         │
│  ├─ BookAnalysisSection                                  │
│  ├─ BookAnalysisSectionDraft                             │
│  ├─ BookAnalysisCharacter                                │
│  ├─ BookAnalysisCharacterAppearance                      │
│  ├─ BookAnalysisCharacterAppearanceTerm                  │
│  └─ BookAnalysisCharacterMedia                           │
└─────────────────────────────────────────────────────────┘
```

### 1.2 核心组件交互

```text
用户导入文档
  → BookAnalysisCommandService.createProject()
  → 文档分段 (documentChapters.ts)
  → 存储 BookAnalysis + BookAnalysisSection

用户触发分析
  → BookAnalysisCommandService.startAnalysis()
  → WatchdogService (并发控制)
  → generation/lifecycle.ts (逐段分析)
  → 调用 runStructuredPrompt (LLM)
  → 存储 BookAnalysisSectionDraft

角色提取
  → BookAnalysisCharacterService.extractCharacters()
  → bookAnalysisCharacter.prompts (12 维画像 Prompt)
  → 存储 BookAnalysisCharacter

外貌追踪
  → BookAnalysisCharacterAppearanceService
  → BookAnalysisCharacterAppearanceTermService (术语标准化)
  → 存储 BookAnalysisCharacterAppearance

肖像生成
  → BookAnalysisCharacterMediaService
  → 调用图像生成 API
  → 存储 BookAnalysisCharacterMedia

发布到小说
  → bookAnalysis.publish.ts
  → bookAnalysis.publish.facets.ts
  → 映射到 Novel/Character/World 模型
```

## 2. 数据库 Schema

### 2.1 Prisma 模型定义（参考上游适配）

```prisma
model BookAnalysis {
  id          String   @id @default(cuid())
  tenantId    String
  title       String
  status      String   @default("pending") // pending, analyzing, completed, failed
  config      Json     // { dimensions: [...], budgetTokens: N }
  overview    Json?    // 全局分析摘要
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  sections      BookAnalysisSection[]
  characters    BookAnalysisCharacter[]

  @@index([tenantId, status])
}

model BookAnalysisSection {
  id           String  @id @default(cuid())
  analysisId   String
  sectionIndex Int
  sectionKey   String  // 章节标识
  title        String?
  content      String  // 原文内容
  sourceScope  Json?   // { startParagraph, endParagraph }
  status       String  @default("pending") // pending, analyzing, completed, failed

  analysis BookAnalysis @relation(fields: [analysisId], references: [id])
  drafts   BookAnalysisSectionDraft[]

  @@index([analysisId, sectionIndex])
}

model BookAnalysisSectionDraft {
  id         String  @id @default(cuid())
  sectionId  String
  dimension  String  // plot, character, world, theme, style
  content    Json    // 结构化分析结果
  tokenCount Int?
  createdAt  DateTime @default(now())

  section BookAnalysisSection @relation(fields: [sectionId], references: [id])

  @@index([sectionId, dimension])
}

model BookAnalysisCharacter {
  id           String  @id @default(cuid())
  analysisId   String
  name         String
  profile      Json    // 12 维画像 JSON
  firstAppearanceSectionId String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  analysis    BookAnalysis @relation(fields: [analysisId], references: [id])
  appearances BookAnalysisCharacterAppearance[]
  media       BookAnalysisCharacterMedia[]

  @@index([analysisId, name])
}

model BookAnalysisCharacterAppearance {
  id           String  @id @default(cuid())
  characterId  String
  sectionId    String?
  excerpt      String  // 原文外貌描述摘录
  parsedTraits Json?   // 解析后的结构化外貌特征
  orderIndex   Int     // 时间线顺序
  createdAt    DateTime @default(now())

  character BookAnalysisCharacter @relation(fields: [characterId], references: [id])

  @@index([characterId, orderIndex])
}

model BookAnalysisCharacterAppearanceTerm {
  id           String  @id @default(cuid())
  characterId  String
  termCategory String  // hair, eyes, body, clothing, etc.
  termOriginal String  // 原始描述
  termStandard String  // 标准化后
  createdAt    DateTime @default(now())

  @@index([characterId, termCategory])
}

model BookAnalysisCharacterMedia {
  id          String  @id @default(cuid())
  characterId String
  mediaType   String  // portrait, concept
  url         String
  prompt      String? // 生成时使用的 prompt
  style       String?
  createdAt   DateTime @default(now())

  character BookAnalysisCharacter @relation(fields: [characterId], references: [id])

  @@index([characterId])
}
```

## 3. 服务层设计

### 3.1 目录结构

```text
server/src/
├── modules/bookAnalysis/
│   └── http/
│       ├── bookAnalysisRoutes.ts          # 项目 CRUD
│       ├── bookAnalysisSectionRoutes.ts   # 分段管理
│       └── bookAnalysisCharacterRoutes.ts # 角色管理
├── services/bookAnalysis/
│   ├── BookAnalysisService.ts             # 服务入口 facade
│   ├── application/
│   │   ├── BookAnalysisCommandService.ts  # 写操作
│   │   ├── BookAnalysisQueryService.ts    # 读操作
│   │   └── BookAnalysisWatchdogService.ts # 并发看门狗
│   ├── generation/
│   │   ├── documentChapters.ts            # 文档分段
│   │   ├── lifecycle.ts                   # 分析生命周期
│   │   ├── overviewContext.ts             # 全局上下文
│   │   ├── sourceScope.ts                 # 源范围
│   │   └── optimizeSectionPreview.ts      # 段落预览优化
│   ├── bookAnalysisCharacter/
│   │   ├── BookAnalysisCharacterService.ts           # 角色提取主服务
│   │   ├── BookAnalysisCharacterAppearanceService.ts # 外貌追踪
│   │   ├── BookAnalysisCharacterAppearanceTermService.ts # 术语标准化
│   │   ├── BookAnalysisCharacterMediaService.ts      # 肖像生成
│   │   ├── BookAnalysisCharacterRagAdapter.ts        # RAG 适配
│   │   └── BookAnalysisCharacterSerializers.ts       # 序列化
│   ├── publish/
│   │   ├── bookAnalysis.export.ts         # 导出
│   │   ├── bookAnalysis.publish.ts        # 发布到小说
│   │   └── bookAnalysis.publish.facets.ts # Facet 发布
│   ├── infrastructure/
│   │   ├── bookAnalysis.concurrent.ts     # 并发控制
│   │   ├── bookAnalysis.progress.ts       # 进度追踪
│   │   ├── bookAnalysis.queue.ts          # 任务队列
│   │   └── bookAnalysis.serialization.ts  # JSON 序列化
│   ├── caching/
│   │   ├── bookAnalysis.budget.ts         # 预算管理
│   │   └── bookAnalysis.cache.ts          # 缓存策略
│   ├── shared/
│   │   ├── bookAnalysis.config.ts         # 配置
│   │   ├── bookAnalysis.constants.ts      # 常量
│   │   ├── bookAnalysis.status.ts         # 状态机
│   │   ├── bookAnalysis.types.ts          # 类型定义
│   │   ├── bookAnalysis.utils.ts          # 工具函数
│   │   └── bookAnalysisSchemas.ts         # Zod Schema
│   └── writing/
│       └── bookAnalysis.sectionWriter.ts  # 段落写作
└── prompting/prompts/bookAnalysis/
    ├── bookAnalysis.prompts.ts            # 核心分析 PromptAsset
    ├── bookAnalysisChapter.prompts.ts     # 章节分析 PromptAsset
    └── bookAnalysisCharacter.prompts.ts   # 角色分析 PromptAsset
```

### 3.2 前端目录结构

```text
client/src/pages/bookAnalysis/
├── BookAnalysisPage.tsx
├── bookAnalysis.types.ts
├── bookAnalysis.utils.ts
├── components/
│   ├── BookAnalysisBudgetAdjustDialog.tsx
│   ├── BookAnalysisChapterNavigator.tsx
│   ├── BookAnalysisChapterReader.tsx
│   ├── BookAnalysisCharacterAppearancePanel.tsx
│   ├── BookAnalysisCharacterCandidateCard.tsx
│   ├── BookAnalysisCharacterImagePanel.tsx
│   ├── BookAnalysisCharacterPanel.tsx
│   ├── BookAnalysisCreateDialog.tsx
│   ├── BookAnalysisDetailPanel.tsx
│   ├── BookAnalysisDiagnosisTipBanner.tsx
│   ├── BookAnalysisDualPaneLayout.tsx
│   ├── BookAnalysisSectionCard.tsx
│   ├── BookAnalysisSidebar.tsx
│   ├── BookAnalysisSourceRangePicker.tsx
│   ├── BookAnalysisStructuredSummary.tsx
│   ├── BookAnalysisWorkbenchViewTabs.tsx
│   └── BookAnalysisWorkspaceToolbar.tsx
└── hooks/
    ├── actions/
    │   ├── useAnalysisBudget.ts
    │   └── useAnalysisPublishing.ts
    ├── character/
    │   └── useAnalysisCharacters.ts
    ├── drafts/
    │   └── useSectionDrafts.ts
    ├── bookAnalysisWorkspace.types.ts
    ├── useBookAnalysisActiveView.ts
    ├── useBookAnalysisChapterReader.ts
    ├── useBookAnalysisDualPanePreference.ts
    └── useBookAnalysisWorkspace.ts
```

## 4. 接口设计

### 4.1 HTTP API

```text
POST   /api/book-analysis                           # 创建分析项目
GET    /api/book-analysis/:id                       # 获取分析项目
GET    /api/book-analysis/list                      # 列出分析项目
PUT    /api/book-analysis/:id                       # 更新分析项目
DELETE /api/book-analysis/:id                       # 删除分析项目

POST   /api/book-analysis/:id/import                # 导入文档
GET    /api/book-analysis/:id/sections              # 获取分段列表
PUT    /api/book-analysis/:id/sections/:sectionId   # 更新分段范围

POST   /api/book-analysis/:id/analyze               # 触发分析
GET    /api/book-analysis/:id/progress              # 获取分析进度

GET    /api/book-analysis/:id/characters            # 获取角色列表
POST   /api/book-analysis/:id/characters/extract    # 提取角色
GET    /api/book-analysis/:id/characters/:charId    # 获取角色详情
PUT    /api/book-analysis/:id/characters/:charId    # 更新角色画像

GET    /api/book-analysis/:id/characters/:charId/appearances  # 外貌时间线
GET    /api/book-analysis/:id/characters/:charId/media        # 媒体列表
POST   /api/book-analysis/:id/characters/:charId/media/generate # 生成肖像

POST   /api/book-analysis/:id/publish               # 发布到小说
POST   /api/book-analysis/:id/export                # 导出分析结果
```

## 5. 实现步骤

### Phase 0: 需求就绪（0.5d）

1. 创建任务包六件套
2. 与用户确认需求范围

### Phase 1: Prisma Schema（0.5d）

1. 定义 7 个新模型（参考上游适配）
2. 执行 prisma migrate dev
3. 创建索引验证

### Phase 2: 服务端基础框架（1.5d）

1. 创建目录结构
2. 实现 shared/ 层（类型、常量、配置）
3. 实现 BookAnalysisService facade
4. 实现 BookAnalysisCommandService / QueryService
5. 创建 HTTP 路由
6. **参考上游**: `server/src/services/bookAnalysis/` 全部文件

### Phase 3: 文档导入与分段（1d）

1. 实现文档解析（TXT/DOCX/PDF）
2. 实现自动分段逻辑（documentChapters.ts）
3. 实现 SourceRangePicker 后端
4. **参考上游**: `server/src/services/bookAnalysis/generation/documentChapters.ts`

### Phase 4: AI 分析管线（1.5d）

1. 实现分析生命周期管理（lifecycle.ts）
2. 注册 PromptAsset（12 个核心 Prompt）
3. 实现分段分析 + 进度追踪
4. 实现并发控制（WatchdogService）
5. **参考上游**: `server/src/prompting/prompts/bookAnalysis/` 3 个文件

### Phase 5: 角色系统（1.5d）

1. 实现角色提取（12 维画像）
2. 实现外貌追踪（AppearanceService）
3. 实现术语标准化（AppearanceTermService）
4. 实现肖像生成（MediaService）
5. **参考上游**: `server/src/services/bookAnalysis/bookAnalysisCharacter/` 6 个文件

### Phase 6: 发布与导出（1d）

1. 实现发布到小说项目
2. 实现分析结果导出
3. **参考上游**: `server/src/services/bookAnalysis/publish/` 3 个文件

### Phase 7: 前端（2d）

1. 实现工作台主页面（BookAnalysisPage）
2. 实现双栏布局（DualPaneLayout）
3. 实现各子组件（Sidebar, ChapterReader, StructuredSummary 等）
4. 实现角色面板（CharacterPanel, AppearancePanel, ImagePanel）
5. 实现 Hooks 层
6. **参考上游**: `client/src/pages/bookAnalysis/` 全部文件

### Phase 8: 测试与验证（1.5d）

1. 单元测试（服务层各模块）
2. 集成测试（完整流程：导入 → 分析 → 角色提取 → 发布）
3. E2E 测试
4. typecheck 验证

## 6. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 上下游架构差异大 | 移植工作量增加 | 中 | 适配层隔离，保持接口一致 |
| LLM 分析质量 | 用户体验差 | 中 | Prompt 优化 + 人工编辑 |
| 大文档内存占用 | OOM | 低 | 流式分段处理 |
| 7 个 Prisma 模型 | 迁移复杂 | 中 | 分批创建，逐步验证 |

## 7. 交付物

- [ ] Prisma Schema 迁移文件（7 个新模型）
- [ ] `server/src/modules/bookAnalysis/http/` — 3 个路由文件
- [ ] `server/src/services/bookAnalysis/` — ~32 个服务文件
- [ ] `server/src/prompting/prompts/bookAnalysis/` — 3 个 Prompt 文件
- [ ] `client/src/pages/bookAnalysis/` — ~28 个前端文件
- [ ] 单元测试文件
- [ ] 集成测试文件
