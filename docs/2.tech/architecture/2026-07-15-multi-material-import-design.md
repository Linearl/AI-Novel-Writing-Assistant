---
description: "多素材导入与按需加载——NovelMaterial 表设计、接口解耦、material_index context group、B2 两轮材料加载机制"
---

# 多素材导入与按需加载架构设计

> **版本**：v1.0 | **日期**：2026-07-15 | **状态**：待评审

---

## 1. 背景与动机

### 1.1 现状问题

当前素材系统存在以下缺陷：

1. **仅支持单份素材**：`POST /api/novels/parse-material` 只接受一个文本字符串，用户无法导入多份参考材料（如角色设定、章节大纲、世界观手册等）
2. **原文不持久化**：AI 解析后原文被丢弃，只保留压缩后的结构化字段（`Novel.outline`），大量细节丢失
3. **素材与常规 outline 无法区分**：不知道 `outline` 来自用户素材还是手动填写
4. **无按需加载能力**：后续写作步骤无法查看"有哪些参考材料可查"，更无法按需读取全文
5. **50,000 字符限制**：单次 API 调用限制，不适合大篇文档

### 1.2 目标

- 用户可导入多份文档（单文件或文件夹），作为小说的参考材料
- 每份材料独立存储，附带 AI 生成的描述元信息
- 后续写作步骤中注入材料索引，AI 自主判断是否需要加载某篇材料的全文
- `storyInput` 由 AI 汇总生成（概要 + 材料列表），而非原始全文拼接
- 接口解耦：材料解析与材料导入分离

---

## 2. 总体架构

### 2.1 数据流

```
用户选择文件/文件夹
  │
  ├─ 接口 1：POST /api/novels/parse-material（改造）
  │   输入：{ materials: [{ title, content }] }
  │   输出：结构化字段 + storyInput（概要 + 材料列表）
  │   不写库，纯 LLM 解析
  │
  ├─ 用户确认解析结果，点击"创建项目"
  │
  └─ 接口 2：POST /api/novels/:id/materials/import（新增）
      输入：{ materials: [{ title, content }] }
      内置：每条材料调用 AI 生成 description
      写入：NovelMaterial 表
```

之后的写作步骤（卷规划、章节生成等）：

```
prompt 注入 material_index context block
  → AI 看到材料列表（标题 + 描述 + 字数）
  → AI 判断需要某篇材料，输出 requestedMaterialIds
  → 中间件加载全文 → 第二轮调用注入材料全文
```

### 2.2 涉及模块

```
┌─────────────┐    ┌──────────────┐    ┌──────────────────┐
│  前端导入    │    │  后端 API    │    │  Prompt 注入      │
│  UI 改造     │    │  parse/import│    │  material_index   │
└─────────────┘    └──────────────┘    └──────────────────┘
       │                   │                     │
       ▼                   ▼                     ▼
  MaterialParse        NovelMaterial        NovelPromptMaterial
  Dialog 扩展           表 + CRUD            Exporter 扩展
```

---

## 3. 数据库设计

### 3.1 新增表：NovelMaterial

```prisma
model NovelMaterial {
  id          String   @id @default(cuid())
  novelId     String
  title       String              // 素材标题（文件名或用户输入）
  description String?             // AI 生成摘要：类型 + 内容概要 + 适用阶段
  content     String              // 素材全文（无硬性字符限制）
  wordCount   Int                 @default(0)  // 估算字数
  sortOrder   Int                 @default(0)  // 排序
  enabled     Boolean             @default(true) // 是否激活
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  novel       Novel               @relation(fields: [novelId], references: [id])
  @@index([novelId, enabled])
  @@index([novelId, sortOrder])
}
```

### 3.2 description 字段格式

```
[类型] {角色设定|章节大纲|世界观|风格参考|叙事规则|歌词素材|其他}
[摘要] {2-3句内容概括}
[字数] {约XXXX字}
[适用范围] {全阶段|规划阶段|写作阶段|审校阶段}
```

---

## 4. API 设计

### 4.1 接口 1：改造 parse-material

**端点**：`POST /api/novels/parse-material`（改造现有）

**请求**：
```typescript
{
  materials: Array<{ title: string; content: string }>;  // 支持多份
  provider?: string;
  model?: string;
}
```

**移除**：旧的 `material: string` 单字段（Breaking Change：但 `material: singleString` 将被 `materials: [{title, content}]` 替代，前端适配）

**字数限制放宽**：每份材料无独立上限，总量不做硬限制（由 LLM token 窗口自然约束）

**返回**（在原有基础上新增 `storyInput` 字段）：
```typescript
{
  // 原有字段（不变）
  title?: string;
  description?: string;
  worldSetting?: string;    // 最多 2000 字
  characters?: string;      // 最多 2000 字
  outline?: string;         // 最多 2000 字
  // ...
  
  // 新增
  storyInput?: string;      // "概要段落...\n\n参考材料列表：\n- [角色设定] 8个角色完整小传，约8000字\n- ..."
}
```

职责：**纯解析**，不写数据库。

### 4.2 接口 2：导入材料

**端点**：`POST /api/novels/:novelId/materials/import`（新增）

**请求**：
```typescript
{
  materials: Array<{
    title: string;
    content: string;
    sortOrder?: number;
  }>;
}
```

**返回**：
```typescript
{
  items: Array<{
    id: string;
    title: string;
    description: string;   // AI 自动生成
    wordCount: number;
  }>;
}
```

**内部流程**：
1. 逐条入库 `NovelMaterial`
2. 每条调用 LLM 生成 `description`（轻量调用，temperature=0.1）
3. 返回结果

职责：**持久化**，不做结构化字段解析。

### 4.3 接口 3：查询材料列表

**端点**：`GET /api/novels/:novelId/materials`（新增）

**返回**：
```typescript
{
  items: Array<{
    id: string;
    title: string;
    description: string;
    wordCount: number;
    enabled: boolean;
    sortOrder: number;
    createdAt: string;
  }>;
}
```

### 4.4 接口 4：读取单篇材料全文

**端点**：`GET /api/novels/:novelId/materials/:materialId`（新增）

**返回**：
```typescript
{
  id: string;
  title: string;
  description: string;
  content: string;          // 全文
  wordCount: number;
}
```

### 4.5 其他接口

| 方法 | 端点 | 用途 |
|------|------|------|
| `PATCH` | `/api/novels/:novelId/materials/:materialId` | 编辑材料描述、标题、排序 |
| `DELETE` | `/api/novels/:novelId/materials/:materialId` | 删除单篇材料 |
| `PATCH` | `/api/novels/:novelId/materials/:materialId/toggle` | 启用/禁用材料 |

---

## 5. Prompt 注入设计

### 5.1 新增 context group：material_index

在 `materialGroups.ts` 中新增第 11 组：

```typescript
{
  group: "material_index",
  title: "用户参考材料索引",
  required: true,           // 标记为必须，防止被 token 裁剪丢弃
  importance: "must",
  sourceType: "material",
  aliases: ["user_materials", "reference_materials"],
}
```

`NovelPromptMaterialExporter` 新增 `buildMaterialIndex()` 方法：
- 查询当前 Novel 下 `enabled=true` 的所有材料
- 每条输出：标题 + description + 字数
- 总 token 消耗约 150-300（假设 10 篇以内）
- 不加载全文

### 5.2 注入位置

在导演步骤的 `contextRequirements` 中添加 `material_index`：

```
当前注入链：novel_basics → book_contract → chapter_mission → ... 
新增：material_index（在 character_state 之前或之后）
```

### 5.3 B2 两轮材料加载机制

**目标**：让 AI 在第一轮看到材料索引后，自主判断是否需要加载某些材料的全文，不影响核心调用链路。

**机制**：不改造 `invokeStructuredLlm`。在导演步骤 runtime 内部实现两轮循环。

**流程**：

```
Round 1:
  组装 messages（含 material_index context block）
  → invokeStructuredLlm(messages, extendedSchema)
    extendedSchema = 原有 output schema + { requestedMaterialIds: z.array(z.string()).optional() }
  → AI 看到材料列表，输出：{ ..., requestedMaterialIds: ["id1", "id3"] }

如果 requestedMaterialIds 非空：
  从 NovelMaterial 表查询对应材料全文
  → 追加一条 user message: "以下是您请求的参考材料全文：\n[材料1全文]\n---\n[材料3全文]"
  → invokeStructuredLlm(messages, originalSchema)  // Round 2，用原始 schema
  → 返回 Round 2 结果

如果 requestedMaterialIds 为空：
  → 直接返回 Round 1 结果（删除 requestedMaterialIds 字段）
```

**关键决策**：

- **不改 `invokeStructuredLlm`**：两轮逻辑在导演步骤 runtime 层实现，`structuredInvoke.ts` 保持不变
- **缓存友好**：System prompt + material_index 在两轮间完全相同，Anthropic prompt cache 在 5 分钟窗口内自动命中
- **成本可控**：Round 2 中新 token 只有材料全文（输出 token 与单轮相同），缓存命中部分享受 ~90% 折扣
- **适用步骤**：首期覆盖 `story.macro.plan`、`book.contract.create`、`chapter.draft.write` 三个最需要参考材料的步骤，后续按需扩展

### 5.4 与现有 StoryMacroPlan.storyInput 的关系

改造后 `storyInput` 不再存储全量原文，改为 AI 汇总的"概要 + 材料列表"。其来源有两个：

- **创建时**：接口 1（parse-material）自动生成
- **导入新材料后**：用户触发"重新汇总"，AI 读取所有材料 → 更新 storyInput

这样 `book_contract` context group 中的 storyInput 天然携带材料索引，与 `material_index` group 形成互补：storyInput 中的材料列表是静态快照（创建时生成），material_index 是动态实时查询（可随时增删材料）。

---

## 6. 前端设计

### 6.1 创建流程改造

当前 `MaterialParseDialog` 的改动：

```
[现有]：textarea 粘贴文本 / 选择单个 .txt .md 文件
[新]：
  - "从文件导入" 按钮 → 支持选择文件 OR 文件夹
  - 如果选文件夹 → 递归读取全部 .txt .md 文件
  - 每文件显示：标题（可编辑）、内容预览（前 200 字）、字数
  - 支持删除、排序、编辑标题
  - "解析"按钮 → 调用接口 1（parse-material）
  - 解析结果预览（与现有 UI 一致）
  - "创建项目"→ 调用接口 2（import-material）→ 创建 Novel
```

### 6.2 项目管理页

小说详情页新增"参考材料"Tab/区域：
- 材料列表（标题 + 描述 + 字数 + 导入时间）
- 启用/禁用开关
- 排序调整
- 删除
- "导入新材料"按钮
- "重新汇总 storyInput"按钮

---

## 7. 调用时序

### 7.1 创建小说

```
1. [前端] 用户选择文件/文件夹 → 读取内容 → 展示列表
2. [前端] 用户点击"解析"
3. [后端] POST /parse-material → LLM 解析 → 返回结构化字段 + storyInput
4. [前端] 展示解析结果，用户可编辑
5. [前端] 用户点击"创建项目"
6. [后端] POST /novels → 创建 Novel
7. [后端] POST /novels/:id/materials/import → 逐条入库 + AI 生成描述
8. [后端] Novel.storyInput 写入（来自步骤 3 的 storyInput）
9. [前端] 跳转小说详情页
```

### 7.2 后续写作步骤

```
1. 导演步骤运行时组装 prompt
2. NovelPromptMaterialExporter 注入 material_index context block
3. Round 1 LLM 调用 → 输出包含 requestedMaterialIds
4. 如果请求了材料 → 注入 full_text context block → Round 2 LLM 调用
5. 返回最终结果
```

---

## 8. 改动清单

| 层 | 文件 | 改动内容 | 复杂度 |
|----|------|---------|--------|
| **DB** | `prisma/schema.prisma` | 新增 `NovelMaterial` 模型 + 迁移 | 低 |
| **后端** | `novelMaterialParseRoutes.ts` | 改造：`material: string` → `materials: Array<{title, content}>`；输出新增 `storyInput` | 中 |
| **后端** | 新建 `novelMaterialRoutes.ts` | 新增 CRUD 路由：import、list、get、patch、delete、toggle | 中 |
| **后端** | `materialGroups.ts` | 新增 `material_index` 组定义 | 低 |
| **后端** | `NovelPromptMaterialExporter.ts` | 新增 `buildMaterialIndex()` 方法 | 低 |
| **后端** | 导演步骤 runtime | 新增 B2 两轮加载逻辑（round1 schema 扩展 + 材料全文注入） | 中 |
| **前端** | `MaterialParseDialog.tsx` | 支持文件夹选择 + 多文件管理 + 接口适配 | 中 |
| **前端** | 新增 `MaterialManagePage.tsx` | 小说详情页新增材料管理区域 | 中 |
| **前端** | `api/novel/materials.ts` | 新增前端 API client | 低 |

---

## 9. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| parse-material 接口 Breaking Change | 现有前端直接传入 `material` 字符串会报 Zod 校验错误 | 前端同步升级，无向后兼容需求（因为还要改文件选择 UI） |
| B2 两轮延迟 | Round 2 额外一次 LLM 调用增加响应时间 | 仅 AI 主动请求材料时才触发 Round 2；大部分步骤不需要材料全文 |
| material_index 内容膨胀 | 材料过多时索引本身也变大 | 当前单小说材料数量上限建议 20 篇；超过时裁剪为"标题+类型"最简格式 |
| description 生成质量 | AI 摘要不准确，影响后续选择性加载 | description 可由用户手动编辑（PATCH 接口） |

---

<!-- 最后更新：2026-07-15 -->
