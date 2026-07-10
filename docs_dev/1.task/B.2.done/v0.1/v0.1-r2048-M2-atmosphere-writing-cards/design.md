---
description: "REQ-2048 氛围写作卡片 — 方案设计"
---

# REQ-2048 方案设计

## 1. 方案概述

在 `server/src/services/styleEngine/` 下新增 `AtmosphereCardService`，管理氛围卡的查询与匹配调度。MD 文件存储在 `server/src/data/atmosphereCards/`，通过 `FileToDbSyncService` 同步到 `AtmosphereCard` 表。修复阶段通过 LLM 匹配章节需要的氛围 → 按 key 读取 body → 注入修复 prompt。

### 1.1 设计目标

1. 复刻 WritingTechnique 的成功模式：MD 文件源 + DB 配置 + 启动同步
2. AI-First 氛围匹配：LLM 基于 frontmatter 轻量信息判断，零硬编码规则
3. 分层优先级注入：氛围 > 技法 > 风格引擎
4. 失败容错：匹配失败不阻断修复流程
5. 最小代码增量：复用 FileToDbSyncService、ChapterRepairStreamRuntime、前端写作技法页模板

### 1.2 关键决策

| # | 决策 | 理由 |
|---|------|------|
| D-01 | 氛围卡用 MD（frontmatter + body）存储，复用已有 MD 解析工具 | 与 writingTechniques 格式一致，解析工具可复用 |
| D-02 | LLM 匹配的两阶段加载（先 frontmatter 再 body） | 减少 prompt token 消耗；15 篇完整 body 直接注入将大幅膨胀 prompt |
| D-03 | 氛围匹配 prompt 注册到 PromptRegistry | 符合 Prompt Governance 规则 |
| D-04 | 修复 prompt 中通过结构化排序表达优先级，不在 DB 存 priority 字段 | 避免侵入已有数据模型；优先级是 prompt 层的编排逻辑 |
| D-05 | API 路由复用 `writingTechniques.ts`，不另建独立路由文件 | 氛围卡在业务上隶属于写法体系，统一管理 |
| D-06 | 不引入 profileBindings / novelBindings 多级绑定 | 氛围卡是通用写作参考，不分画像/小说维度 |

### 1.3 不在范围

- 不引入 RAG/向量检索
- 不扩展自动化采集（15 篇 MVP）
- 不对氛围卡内容做 Diff/Version 管理

## 2. 架构与数据流

### 2.1 文件结构

```
server/src/
├── prisma/
│   ├── schema.sqlite.prisma              # 新增 AtmosphereCard 表 [MODIFY]
│   └── schema.prisma                     # 同步新增 [MODIFY]
├── data/
│   └── atmosphereCards/                  # 15 个 MD 文件 [NEW]
│       ├── chao-shi-gan.md
│       ├── liang-bo-gan.md
│       ├── fen-nu-gan.md
│       └── ...（共 15 篇）
├── services/
│   └── styleEngine/
│       ├── AtmosphereCardService.ts       # 氛围卡查询与管理 [NEW]
│       └── FileToDbSyncService.ts         # 氛围卡同步集成 [MODIFY]
├── services/
│   ├── bootstrap/
│   │   └── SystemResourceBootstrapService.ts  # 启动时触发同步 [MODIFY]
│   └── novel/
│       └── runtime/
│           └── repair/
│               └── ChapterRepairStreamRuntime.ts  # 修复流挂载 [MODIFY]
├── routes/
│   └── writingTechniques.ts              # 扩展氛围卡 CRUD 路由 [MODIFY]
├── prompting/
│   └── prompts/
│       └── writingTechnique/
│           └── atmosphereMatch.prompts.ts  # 氛围匹配 prompt [NEW]
```

```
client/src/
├── router/
│   └── index.tsx                         # 新增 /atmosphere-cards 路由 [MODIFY]
├── components/
│   └── layout/
│       └── Sidebar.tsx                   # 侧边栏新增入口 [MODIFY]
├── pages/
│   └── atmosphereCards/                  # 氛围卡 Tab 页面 [NEW]
│       ├── AtmosphereCardsPage.tsx
│       └── components/
│           ├── AtmosphereCardList.tsx
│           └── AtmosphereCardDetail.tsx
├── api/
│   ├── queryKeys.ts                      # 新增 query keys [MODIFY]
│   └── atmosphereCards.ts                # API 请求层 [NEW]
```

### 2.2 数据流

```
[启动]
  → SystemResourceBootstrapService
    → FileToDbSyncService.syncAtmosphereCardsFromFileSystem(mode)
      → 读取 server/src/data/atmosphereCards/*.md
      → 解析 frontmatter (YAML)
      → upsert 到 AtmosphereCard 表

[章节修复]
  → ChapterRepairStreamRuntime.createRepairStream()
    → AtmosphereCardService.listEnabledCards() // 轻量 frontmatter
    → LLM 氛围匹配 (atmosphereMatch.prompts.ts)
      → 输入: 章节内容 + 轻量 frontmatter 列表
      → 输出: AtmosphereMatchResult { matched[], suggestedNew[] }
    → 按 matched[].key 逐个调用 AtmosphereCardService.getCardBodyByKey()
    → 组装修复 prompt:
      ├── 【氛围约束】matched 卡片的 body（策略详情）
      ├── 【技法约束】WritingTechniqueService.listEnabledTechniques()
      └── 【风格引擎约束】styleContract rules

[前端浏览]
  → GET /api/writing-techniques/atmosphere-cards
    → AtmosphereCardService.listAll()
  → PATCH /api/writing-techniques/atmosphere-cards/:key
    → AtmosphereCardService.toggleEnabled(key, enabled)
  → GET /api/writing-techniques/atmosphere-cards/:key
    → AtmosphereCardService.getCardByKey(key) // 含 body + 关联技法名
```

### 2.3 修复 Prompt 注入顺序

```
【氛围约束】（最高优先级）
以下是为本章匹配的氛围写作策略，请在修复时严格遵循对应氛围的技法组合和例句风格：

## 潮湿感
（策略一~策略N 的 body 内容）

## 无力感
（策略一~策略N 的 body 内容）

【技法约束】（次优先级）
以下技法在修复时务必使用：
- 冷笔触：...
- 涟漪句：...

【风格引擎约束】（最低优先级）
- 全局风格：...
- 音节约束：...
```

## 3. 数据模型

### 3.1 Prisma Schema

```prisma
model AtmosphereCard {
  id                  String   @id @default(cuid())
  key                 String   @unique
  name                String
  description         String
  category            String?
  filePath            String
  applicableEmotions  String   @default("[]")   // JSON 字符串数组
  triggerKeywords     String   @default("[]")   // JSON 字符串数组
  relatedTechniques   String   @default("[]")   // JSON 字符串数组
  enabled             Boolean  @default(false)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([category, enabled])
}
```

**字段说明**：

| 字段 | 类型 | 来源 |
| ---- | ---- | ---- |
| `key` | 唯一字符串 | MD 文件名（不含扩展名），如 `chao-shi-gan` |
| `name` | 中文名称 | frontmatter `name` |
| `description` | 简短描述 | frontmatter `description` |
| `category` | 分类 | frontmatter `category` |
| `filePath` | 文件路径 | `server/src/data/atmosphereCards/{key}.md` |
| `applicableEmotions` | JSON 数组 | frontmatter `applicableEmotions` |
| `triggerKeywords` | JSON 数组 | frontmatter `triggerKeywords` |
| `relatedTechniques` | JSON 数组 | frontmatter `relatedTechniques`（文笔技法 key 列表） |
| `enabled` | 布尔 | 默认 false，需手动启用 |

### 3.2 AtmosphereCardService 接口

```typescript
class AtmosphereCardService {
  // 列出所有氛围卡
  listAll(): Promise<AtmosphereCard[]>;

  // 列出所有启用的氛围卡（仅轻量字段）
  listEnabledLightweight(): Promise<AtmosphereCardLightweight[]>;

  // 按 key 获取单张卡（含 body）
  getCardByKey(key: string): Promise<AtmosphereCardWithBody | null>;

  // 按 key 获取 body
  getCardBodyByKey(key: string): Promise<string | null>;

  // 启停切换
  toggleEnabled(key: string, enabled: boolean): Promise<AtmosphereCard>;
}

interface AtmosphereCardLightweight {
  key: string;
  name: string;
  description: string;
  applicableEmotions: string[];
  triggerKeywords: string[];
}
```

### 3.3 MD 文件解析

复用 `FileToDbSyncService` 已有的 `parseSimpleYaml()` 方法（轻量 YAML 解析，已在 `syncWritingTechniquesFromFileSystem()` 中使用）。

MD 文件拆分方式：
- 用 `---` 分隔 frontmatter 和 body
- Frontmatter 用 `parseSimpleYaml()` 解析
- Body = 第二个 `---` 之后的所有内容

## 4. API 路由设计

路由挂在已有 `writingTechniques.ts` 下，基础路径为 `/api/writing-techniques`。

### 4.1 氛围卡列表

```
GET /api/writing-techniques/atmosphere-cards
```

响应：

```json
{
  "success": true,
  "data": [
    {
      "key": "chao-shi-gan",
      "name": "潮湿感",
      "description": "营造环境湿润、情绪粘稠、氛围压抑的效果",
      "category": "感官氛围",
      "applicableEmotions": ["压抑", "粘稠", "闷热"],
      "triggerKeywords": ["潮湿", "湿润", "水汽"],
      "relatedTechniques": ["leng-bi-chu", "lian-yi-ju"],
      "enabled": true
    }
  ]
}
```

### 4.2 氛围卡详情

```
GET /api/writing-techniques/atmosphere-cards/:key
```

响应含 body 和关联技法完整信息。

### 4.3 启停切换

```
PATCH /api/writing-techniques/atmosphere-cards/:key/toggle
Body: { "enabled": true }
```

### 4.4 关联技法解析

在详情接口中，`relatedTechniques` 数组中的 key 自动解析为技法名称列表。

## 5. Prompt 设计

### 5.1 氛围匹配 Prompt（atmosphereMatch.prompts.ts）

```typescript
export const atmosphereMatchPrompt: PromptAsset = {
  id: "writingTechnique.atmosphereMatch",
  version: "1.0.0",
  systemPrompt: `你是一位专业的小说写作编辑，擅长分析文本的情感氛围。

我会提供：
1. 当前章节的内容片段
2. 可用的氛围写作卡片列表（含名称、描述、适用情绪、触发关键词）

请分析章节内容，判断哪些氛围卡片适用于本章的写作风格修复：

- matched: 章节当前需要强化的氛围（说明 relevance 和原因）
- suggestedNew: 章节内容暗示存在但卡片库中没有的氛围类型（说明原因和命名建议）

注意：
- 匹配应基于氛围是否在章节中已有体现或需要强化，不应勉强匹配不相关的氛围
- 如果章节内容与某氛围完全无关，不要强行匹配
- relevance 分为 high（强烈相关）、medium（有一定关联）、low（弱相关但可参考）
`,
  userPromptTemplate: `## 章节内容
{{chapterContent}}

## 可用氛围卡片
{{atmosphereCards}}

请输出匹配结果。`,
  outputSchema: z.object({
    matched: z.array(z.object({
      key: z.string(),
      name: z.string(),
      relevance: z.enum(["high", "medium", "low"]),
      reason: z.string(),
    })),
    suggestedNew: z.array(z.object({
      name: z.string(),
      reason: z.string(),
    })),
  }),
};
```

### 5.2 修复 Prompt 注入位置

在 `ChapterRepairStreamRuntime.createRepairStream()` 中，在已有技法约束和风格约束之前插入氛围约束块。

## 6. 同步机制

### 6.1 同步函数签名

```typescript
export async function syncAtmosphereCardsFromFileSystem(
  mode: "missing_only" | "sync_existing" = "missing_only"
): Promise<{ inserted: number; updated: number; errors: string[] }>
```

### 6.2 同步执行流程

1. 扫描 `server/src/data/atmosphereCards/*.md`
2. 逐个解析 frontmatter → 提取字段
3. 检查 key 是否已存在
   - `missing_only`：跳过已存在
   - `sync_existing`：用文件内容覆盖
4. Upsert 到 `AtmosphereCard` 表
5. 返回统计（inserted / updated / errors）

### 6.3 Banner 聚合

```typescript
export async function syncAllFromFileSystem(mode = "missing_only") {
  // ...现有 antiAi + writingTechniques ...
  // 新增：
  const atmosResult = await syncAtmosphereCardsFromFileSystem(mode);
  results.push(`Atmosphere cards: ${atmosResult.inserted} new, ${atmosResult.updated} updated`);
}
```

## 7. 前端组件设计

### 7.1 路由

```tsx
{ path: "/atmosphere-cards", element: <AtmosphereCardsPage /> }
```

### 7.2 侧边栏入口

在"资产"分组中，写法引擎和反 AI 规则之间：

```tsx
{ to: "/style-engine", label: "写法引擎", icon: WandSparkles },
{ to: "/atmosphere-cards", label: "氛围卡片", icon: Palette },      // [NEW]
{ to: "/anti-ai-rules", label: "反 AI 规则", icon: ShieldCheck },
```

### 7.3 页面组件结构

```
AtmosphereCardsPage
├── 分类筛选栏（category filter）
├── AtmosphereCardList
│   └── AtmosphereCardItem[]  // 每个卡片显示 name + description + 启停开关
│       └── AtmosphereCardDetail  // 展开后显示完整内容
│           ├── 定义 (description)
│           ├── 适用情绪标签 (applicableEmotions)
│           ├── 触发关键词 (triggerKeywords)
│           ├── 策略列表 (body 的 Markdown 渲染)
│           └── 关联文笔技法 (relatedTechniques → 技法名称 + 链接)
```

### 7.4 状态管理

- TanStack Query 管理氛围卡列表和详情
- 启停切换使用 `useMutation` + optimistic update
- 无需 Zustand store（氛围卡是只读参考，无复杂客户端状态）

## 8. 异常处理

| 场景 | 处理方式 |
| ---- | -------- |
| 氛围卡 MD 文件不存在 | 同步时记录 error，不阻断其他同步 |
| YAML 解析失败 | 记录错误详情 + 跳过该文件 |
| LLM 氛围匹配返回空 matched | 日志记录 + 跳过氛围约束注入 + 继续修复 |
| LLM 氛围匹配超时/异常 | 日志警告 + 跳过氛围约束注入 + 不阻断修复 |
| getCardBodyByKey 文件不存在 | 返回 null，调用方跳过该卡片 |
| DB 同步冲突（key 重复） | upsert 处理 |

## 9. 验证策略

1. **单元测试**：
   - AtmosphereCardService.listEnabledLightweight() — 仅返回 enabled=true 的轻量数据
   - AtmosphereCardService.getCardBodyByKey() — 返回 correct body
   - FileToDbSyncService.syncAtmosphereCardsFromFileSystem() — 同步计数正确
2. **集成测试**：
   - 启动后 DB 中 AtmosphereCard 表数据与 MD 文件一致
   - 修复流中氛围匹配 prompt 被调用 + 匹配结果注入 prompt
3. **手动验证**：
   - 前端 `/atmosphere-cards` 页面可正常浏览 + 启停切换
   - 侧边栏入口位置正确（写法引擎和反 AI 规则之间）
4. **typecheck + 全量测试 + build**
