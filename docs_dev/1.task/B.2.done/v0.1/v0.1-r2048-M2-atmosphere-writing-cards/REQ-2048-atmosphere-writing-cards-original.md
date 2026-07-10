---
description: "REQ-2048 氛围写作卡片 — 原始冻结副本"
---

# REQ-2048 氛围写作卡片（原始冻结副本）

> ⚠️ 本文件为需求创建时的冻结快照，禁止手动编辑。

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2048 |
| 优先级 | P1 |
| 来源 | 文笔素材账号 OCR 提取 + 审校修复增强 |
| 关联需求 | REQ-2047（文笔技法库，已有） |
| 依赖系统 | FileToDbSyncService（已有）、WritingTechniqueService（已有）、ChapterRepairStreamRuntime（已有） |

---

## 1. 背景与问题

### 1.1 现状

现有文笔技法库（WritingTechnique）覆盖了原子级别的修辞技法（冷笔触、涟漪句、蝶影句等），在审校修复阶段将已启用技法注入修复 prompt，作为【技法约束】层生效。

但原子技法缺少"氛围级别"的指导——作者和 AI 面对"我要写出潮湿感/窒息感/无力感"这类高层次需求时，原子技法提供的参考粒度太细、缺乏系统性策略组合。

### 1.2 不改的后果

1. 修复 prompt 只能提供原子技法列表，无法提供"如何营造特定氛围"的策略指导
2. 15 篇 OCR 提取的氛围写法教程闲置，无法作为结构化资产复用
3. AI 修复缺乏氛围层面的约束，修复结果可能技法正确但氛围不对味

---

## 2. 目标与范围

### 2.1 目标

1. 将 15 篇氛围写法教程结构化入库（MD 文件 + 数据库配置表）
2. 提供 LLM 驱动的氛围匹配机制（AI-First，不在服务端写硬编码规则）
3. 在修复阶段注入匹配的氛围卡策略详情，优先级高于技法约束
4. 提供前端 Tab 浏览氛围卡内容 + 启停控制 + 关联文笔技法展示

### 2.2 In Scope

**后端**：
- `server/src/prisma/schema.prisma` / `schema.sqlite.prisma` — 新增 `AtmosphereCard` 表
- `server/src/data/atmosphereCards/` — 15 个 MD 文件（frontmatter + body）
- `server/src/services/styleEngine/AtmosphereCardService.ts` — 氛围卡查询与管理服务 [NEW]
- `server/src/services/styleEngine/FileToDbSyncService.ts` — 集成氛围卡同步 [MODIFY]
- `server/src/services/bootstrap/SystemResourceBootstrapService.ts` — 启动时触发同步 [MODIFY]
- `server/src/prompting/prompts/writingTechnique/atmosphereMatch.prompts.ts` — 氛围匹配 prompt [NEW]
- `server/src/routes/writingTechniques.ts` — 扩展氛围卡 API 路由 [MODIFY]
- `server/src/services/novel/runtime/repair/ChapterRepairStreamRuntime.ts` — 修复流挂载 [MODIFY]

**前端**：
- `client/src/router/index.tsx` — 新增 `/atmosphere-cards` 路由
- `client/src/components/layout/Sidebar.tsx` — 侧边栏新增入口
- `client/src/pages/atmosphereCards/` — 氛围卡 Tab 页面 [NEW]
- `client/src/api/queryKeys.ts` — 新增氛围卡 query keys

### 2.3 Out of Scope

- 不依赖 RAG/向量检索（LLM 直接基于轻量 frontmatter 信息匹配）
- 15 篇只做 MVP，不扩展自动化采集流程
- 氛围卡匹配失败不阻断工作流（matched: [] 仅日志记录 + suggestedNew 提示）
- 不在 DB 中存储优先级数值字段（优先级通过 prompt 结构化表达）

---

## 3. 需求详情

### 3.1 MD 文件数据层

15 篇氛围卡以 MD 文件存储在 `server/src/data/atmosphereCards/`。

**文件格式**：

```markdown
---
name: "潮湿感"
description: "营造环境湿润、情绪粘稠、氛围压抑的效果"
category: "感官氛围"
applicableEmotions:
  - "压抑"
  - "粘稠"
  - "闷热"
triggerKeywords:
  - "潮湿"
  - "湿润"
  - "水汽"
  - "雨水"
  - "粘湿"
relatedTechniques:
  - "leng-bi-chu"
  - "lian-yi-ju"
---

## 策略一：感官铺陈

**核心技法**: 用多种感官（触觉、嗅觉、视觉）叠加描写潮湿度
**例句**: "空气里满是水汽，每吸一口都像是吞了一口温水。墙壁上挂着细密的水珠，手掌按上去，留下一个湿漉漉的印子。"

## 策略二：意象关联

**核心技法**: 通过意象联想传递潮湿感，如苔藓、水痕、霉斑
**例句**: "墙角的苔藓又厚了一层，像是被雨喂了一整季。"
```

**Frontmatter 字段**：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `name` | string | 氛围名称（如"潮湿感"） |
| `description` | string | 简短描述 |
| `category` | string | 分类（如"感官氛围"、"情感氛围"、"叙事氛围"） |
| `applicableEmotions` | string[] | 适用情绪标签 |
| `triggerKeywords` | string[] | 触发关键词 |
| `relatedTechniques` | string[] | 关联的文笔技法 key 列表 |

### 3.2 数据库配置表

```prisma
model AtmosphereCard {
  id                  String   @id @default(cuid())
  key                 String   @unique
  name                String
  description         String
  category            String?
  filePath            String
  applicableEmotions  String   @default("[]")   // JSON string 数组
  triggerKeywords     String   @default("[]")   // JSON string 数组
  relatedTechniques   String   @default("[]")   // JSON string 数组（关联技法 key）
  enabled             Boolean  @default(false)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([category, enabled])
}
```

### 3.3 加载模式（AI-First）

三阶段：前端加载 → LLM 匹配 → 按需注入。

匹配结果结构：

```typescript
interface AtmosphereMatchResult {
  matched: Array<{
    key: string;
    name: string;
    relevance: "high" | "medium" | "low";
    reason: string;
  }>;
  suggestedNew: Array<{
    name: string;
    reason: string;
  }>;
}
```

### 3.4 审校修复流程集成

在 `ChapterRepairStreamRuntime` 修复 prompt 中按优先级注入：氛围约束 > 技法约束 > 风格引擎约束。

匹配失败不阻断流程。

### 3.5 前端 Tab

路由 `/atmosphere-cards`，卡片列表浏览 + 展开/折叠 + 启停开关 + 关联文笔技法展示。

### 3.6 同步机制

`FileToDbSyncService.syncAtmosphereCardsFromFileSystem()` 在启动时同步，mode 支持 `missing_only` 和 `sync_existing`。

---

## 4. 验收标准

- [ ] AtmosphereCard 表创建并可写入
- [ ] 15 篇氛围卡 MD 文件存在且格式正确（frontmatter 字段完整、body 含策略列表）
- [ ] AtmosphereCardService.listEnabledCards() 返回已启用的轻量 frontmatter 数据
- [ ] AtmosphereCardService.getCardBodyByKey() 返回指定卡片的 body
- [ ] FileToDbSyncService.syncAtmosphereCardsFromFileSystem() 启动时同步成功
- [ ] 氛围匹配 LLM prompt 可基于 frontmatter 输出匹配结果
- [ ] 修复 prompt 按优先级注入（氛围 > 技法 > 风格引擎）
- [ ] 匹配失败不阻断修复流程（matched: [] 仅日志记录）
- [ ] 前端 `/atmosphere-cards` 页面可浏览氛围卡 + 启停开关
- [ ] 侧边栏在"写法引擎"和"反 AI 规则"之间显示"氛围卡片"入口
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] `pnpm build` 通过

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| LLM 匹配质量不稳定（氛围判断主观性强） | 采用"低门槛匹配 + 人工启停控制"策略；匹配失败不阻断 |
| 15 篇素材部分内容质量参差 | T2 阶段人工审校 + 补充例句 |
| OCR 识别错误遗留 | T2 执行时逐篇校对原文 |
| 修复 prompt 长度增加，token 消耗上升 | 仅匹配成功时才注入 body |
| AI-First 原则 — 匹配决策由 LLM 完成 | 不在服务端写硬编码关键词匹配规则 |
| Prompt Governance — 新 prompt 必须注册 | 在 `server/src/prompting/prompts/writingTechnique/` 下注册 |

## 6. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-10 | 创建 | 基于文笔素材 OCR 提取 + 审校修复增强需求生成 |
