---
description: "REQ-2047 文笔资料库——方案设计"
update_time: 2026-07-09
---

# REQ-2047 方案设计

## 1. 方案概述

文笔资料库采用 **MD 文件 + DB 状态 + AI 两阶段筛选** 的三层架构。技法内容以 Markdown 文件存储（frontmatter 两层加载），DB 仅管理开关状态和绑定关系，启动时自动同步。润色增强时通过 AI 筛选从候选池中选择适用技法，注入改写 prompt。同时修复章节编辑器的 StyleContract gap。

### 1.1 设计目标

1. 技法内容文件化，方便随时扩充和修改
2. 三级池子（全局 ∪ 画像 ∪ 小说），精细控制候选范围
3. AI 两阶段筛选，避免一次性加载全部技法全文导致 token 浪费
4. 修复润色增强不接入 StyleContract 的历史 gap

### 1.2 关键决策

1. **MD 文件存储技法内容**：frontmatter (name/description/category) + 全文 body，类 Skill.md 加载机制 — 方便扩充和修改，git 可追踪
2. **DB 自动同步**：启动时扫描目录注册到 DB，DB 只管开关状态 — 文件是内容 SSOT，DB 是状态 SSOT
3. **默认不启用**：新增技法全局/画像/小说均默认关闭 — 防止未审核的技法自动生效
4. **两阶段加载**：筛选时只看概述，确认后才加载全文 — 控制 token 成本

### 1.3 不在范围

- 自动导演生成注入技法（MVP 仅润色增强）
- 小说级绑定 UI（MVP 先通过画像绑定）
- 技法使用效果评估

## 2. 实现细节

### 2.1 技法文件目录

```
server/src/data/writingTechniques/
├── iceberg_dialogue.md      # 冰山对话法
├── lens_sentence.md         # 镜头句
├── white_space.md           # 留白
├── montage.md               # 蒙太奇
├── ...                      # 40+ 篇
└── _index.json              # 可选：缓存扫描结果
```

每个 `.md` 文件格式：

```markdown
---
name: 冰山对话法
description: 用动作和沉默代替直白对话，让读者自己补全潜台词。适合情感张力场景。
category: 对话
---

（精炼后的全文 body，200-500 字，包含原理、案例、用法）
```

### 2.2 Prisma Schema

```prisma
model WritingTechnique {
  id              String   @id @default(cuid())
  key             String   @unique
  name            String
  description     String
  category        String?
  filePath        String
  enabled         Boolean  @default(false)
  profileBindings WritingTechniqueProfileBinding[]
  novelBindings   WritingTechniqueNovelBinding[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model WritingTechniqueProfileBinding {
  id                String        @id @default(cuid())
  styleProfileId    String
  writingTechniqueId String
  enabled           Boolean       @default(true)
  styleProfile      StyleProfile  @relation(fields: [styleProfileId], references: [id], onDelete: Cascade)
  technique         WritingTechnique @relation(fields: [writingTechniqueId], references: [id], onDelete: Cascade)
  createdAt         DateTime      @default(now())
  @@unique([styleProfileId, writingTechniqueId])
}

model WritingTechniqueNovelBinding {
  id                 String        @id @default(cuid())
  novelId            String
  writingTechniqueId String
  enabled            Boolean       @default(true)
  novel              Novel         @relation(fields: [novelId], references: [id], onDelete: Cascade)
  technique          WritingTechnique @relation(fields: [writingTechniqueId], references: [id], onDelete: Cascade)
  createdAt          DateTime      @default(now())
  @@unique([novelId, writingTechniqueId])
}
```

### 2.3 后端 Service 层

**WritingTechniqueService**（CRUD + 池子解析）：

```typescript
class WritingTechniqueService {
  // 扫描目录，同步 DB（启动时调用）
  syncFromFiles(): Promise<void>

  // CRUD
  listTechniques(filters?: { category?: string; enabled?: boolean }): Promise<WritingTechnique[]>
  getTechniqueByKey(key: string): Promise<WritingTechnique | null>
  getTechniqueBody(key: string): Promise<string>  // 读取 .md body
  toggleGlobal(key: string, enabled: boolean): Promise<void>

  // 三级池子解析
  resolvePool(input: { styleProfileId?: string; novelId?: string }): Promise<ResolvedTechnique[]>

  // 画像绑定
  listProfileBindings(styleProfileId: string): Promise<WritingTechniqueProfileBinding[]>
  setProfileBindings(styleProfileId: string, techniqueIds: string[]): Promise<void>

  // 小说绑定
  listNovelBindings(novelId: string): Promise<WritingTechniqueNovelBinding[]>
  setNovelBindings(novelId: string, techniqueIds: string[]): Promise<void>
}
```

**AI 筛选**（新增 PromptAsset）：

```typescript
// server/src/prompting/prompts/writingTechnique/techniqueScreening.prompt.ts
const techniqueScreeningPrompt: PromptAsset<
  { candidates: {key, name, description}[]; selectedText: string; chapterContext: string },
  { selected: {key: string; reason: string}[] }
>
```

### 2.4 润色增强接入 StyleContract

**改动点**：

1. `ChapterEditorWorkspaceService.loadContext()` — 新增调用 `StyleBindingService.resolveForGeneration()`，获取 StyleContract
2. `buildStyleSummary()` — 升级为返回完整 StyleContract 文本（复用 `buildWriterStyleContractText()`）
3. `rewriteCandidates.prompts.ts` — `styleSummary` 字段语义升级为完整风格合同
4. `NovelChapterEditorService.previewAiRevision()` — 在改写前新增 AI 筛选步骤，组装候选池、筛选技法、加载全文
5. `rewriteCandidates.prompts.ts` — 新增 `【文笔技法】` 区块

### 2.5 前端页面

**`/writing-techniques` 路由页面**：

- 左侧：技法列表，支持按分类筛选、搜索、全局开关 toggle
- 右侧：选中技法的全文预览（只读渲染 .md body）
- 顶部：统计信息（总数/启用数/分类分布）

**写法引擎画像编辑器**：

- 在现有"反 AI 规则"面板下方新增"文笔技法"面板
- 展示所有技法列表，checkbox 绑定到当前画像

## 3. 接口定义

### 3.1 新增接口

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/api/writing-techniques` | 列表（支持 ?category=&enabled= 筛选） |
| GET | `/api/writing-techniques/:key` | 详情（含 body） |
| PUT | `/api/writing-techniques/:key/toggle` | 全局开关 |
| GET | `/api/writing-techniques/pool?styleProfileId=&novelId=` | 解析三级池子 |
| GET | `/api/style-profiles/:id/writing-techniques` | 画像绑定的技法列表 |
| PUT | `/api/style-profiles/:id/writing-techniques` | 设置画像绑定 |
| POST | `/api/writing-techniques/screen` | AI 筛选技法（供润色调用） |

## 4. 数据模型

见 §2.2 Prisma Schema。

## 5. 异常处理

| 错误码 | 场景 | 处理方式 |
| ---- | ---- | ---- |
| 404 | 技法 key 不存在 | 返回明确错误信息 |
| 400 | 筛选输入候选池为空 | 跳过筛选，返回空结果 |
| 500 | AI 筛选超时/失败 | 降级到普通改写（不注入技法） |
| 500 | .md 文件读取失败 | 跳过该技法，日志告警 |

## 6. 验证策略

1. 单元测试：WritingTechniqueService 池子解析逻辑
2. 集成测试：API 路由 CRUD + 绑定操作
3. 手动验证：润色增强端到端流程（选中文字 → AI 筛选 → 注入技法 → 候选改写）
4. 类型检查：`pnpm typecheck` 全量通过
