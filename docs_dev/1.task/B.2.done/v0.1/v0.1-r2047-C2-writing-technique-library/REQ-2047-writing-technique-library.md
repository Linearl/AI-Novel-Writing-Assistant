---
description: "REQ-2047 文笔资料库——需求文档"
update_time: 2026-07-09
---

# REQ-2047 文笔资料库

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 需求编号 | REQ-2047 |
| 优先级 | P2 |
| 版本 | v0.1 |
| 状态 | 📋 待办 |
| 来源 | 用户需求讨论 2026-07-09 |

---

## 1. 背景与问题

### 现状

1. **润色增强不接入写法引擎**：章节编辑器的"AI 优化这段"只取小说上 4 个简单字段（`styleTone`、`narrativePov`、`pacePreference`、`emotionIntensity`）拼成一行文本，完全没用到 StyleProfile 的四层规则（narrative/character/language/rhythm）和反 AI 规则。自动导演生成有完整的 StyleContract，润色增强只有"一句话摘要"。

2. **缺少正向文笔指导**：反 AI 规则解决的是"减法"（禁止/风险/鼓励某些表达），但没有"加法"——缺少系统化的正向写作技法库来指导 AI 在改写中主动运用具体技巧。

3. **用户有丰富的技法素材**：`temp/写法学习` 目录下有 40+ 篇小红书写作技法帖（冰山对话法、镜头句、留白、蒙太奇、枯笔句等），涵盖句法、修辞、对话、叙事、描写、节奏六大维度，需要结构化入库。

### 不改会怎样

- 润色增强持续产出低质量的风格一致性结果
- 用户精心配置的写法画像在润色时完全不生效
- 技法素材无法系统化利用，只能靠用户手动记忆和应用

---

## 2. 目标与范围

### 2.1 目标

1. 建立"文笔资料库"——可管理、可开关、可按画像/小说绑定的写作技法集合
2. 修复润色增强的 StyleContract gap，让画像规则和反 AI 规则在润色时生效
3. 实现 AI 两阶段筛选机制：AI 根据章节内容自动选择适用的技法，注入改写 prompt

### 2.2 In Scope

**后端**：
- 技法 MD 文件目录 + DB 自动同步机制（启动时扫描注册）
- 技法 CRUD API（列表/详情/启用/禁用）
- 三级池子解析（全局 ∪ 画像 ∪ 小说）
- AI 筛选 prompt（PromptAsset，输入候选池概述 + 章节内容，输出选中技法 key 列表）
- 章节编辑器上下文升级：接入 StyleBindingService.resolveForGeneration()，注入 StyleContract
- 章节编辑器改写 prompt 升级：新增文笔技法注入区块

**前端**：
- 新增 `/writing-techniques` 页面（文笔资料库管理）
- 写法引擎画像编辑器新增"文笔技法"绑定面板
- 小说编辑页新增文笔技法选择（可选，MVP 可延后）

**基础设施**：
- 技法 MD 文件目录（`server/src/data/writingTechniques/`）
- 批量提取脚本（从 `temp/写法学习` 生成精炼 MD 文件）

### 2.3 Out of Scope

- 自动导演生成中注入技法（MVP 只做润色增强）
- 小说级绑定 UI（MVP 可先通过画像绑定间接生效）
- 技法的 AI 自动学习/生成（只做批量导入 + 手动新增）
- 技法使用效果评估/反馈机制

---

## 3. 需求详情

### 3.1 文笔资料库数据模型

**技法 MD 文件格式**（两层加载，类 Skill 机制）：

```markdown
---
name: 冰山对话法
description: 用动作和沉默代替直白对话，让读者自己补全潜台词。适合情感张力场景。
category: 对话
---

（全文 body：原理说明、文学案例、实操用法，精炼后约 200-500 字）
```

**DB 同步**：启动时扫描 `server/src/data/writingTechniques/` 目录，将 frontmatter 注册到 `WritingTechnique` 表。表结构：

```prisma
model WritingTechnique {
  id          String   @id @default(cuid())
  key         String   @unique        // 文件名（不含 .md）
  name        String                  // frontmatter.name
  description String                  // frontmatter.description
  category    String?                 // frontmatter.category
  filePath    String                  // 相对路径
  enabled     Boolean  @default(false) // 全局开关，默认关闭
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**默认不启用**：新增技法的全局开关、画像绑定、小说绑定均默认关闭。

### 3.2 三级池子

```
resolvedPool = global(enabled) ∪ profile(bindings) ∪ novel(bindings)
```

- **全局池**：`WritingTechnique.enabled == true`
- **画像池**：`WritingTechniqueProfileBinding` 表（styleProfileId + writingTechniqueId + enabled）
- **小说池**：`WritingTechniqueNovelBinding` 表（novelId + writingTechniqueId + enabled）
- 去重：按 key 去重，同一技法只出现一次

### 3.3 AI 两阶段筛选

**Step 1 — 组装候选池**：resolvedPool 中每个技法取 `{key, name, description}`

**Step 2 — AI 筛选**：
- LLM 输入：候选技法列表（key + name + description）+ 选中文字 + 章节上下文
- LLM 输出：最多 5 条适用技法 key + 一句话理由
- 空池 → 跳过 Step 2/3
- 筛选结果为空 → 跳过 Step 3

**Step 3 — 加载全文**：按选中 key 读取对应 .md 文件 body

**Step 4 — 注入改写**：
- 新增 `【文笔技法】` 区块，注入选中技法全文
- System prompt 新增通用指令："当上下文中提供了文笔技法时，在改写中适当运用，但不要为了用技法而强行堆砌，保持自然。"

### 3.4 润色增强接入 StyleContract

在 `ChapterEditorWorkspaceService.loadContext()` 中调用 `StyleBindingService.resolveForGeneration()`，获取完整 StyleContract 文本（含画像四层规则 + 反 AI 规则），替换现有的 4 字段 `styleSummary`。

### 3.5 批量导入

一次性 AI 批量处理 `temp/写法学习` 的 40+ 篇素材：
- 从原始帖子中提取技法核心（剥离营销话术、重复内容、OCR 噪声）
- 生成 frontmatter：name、description（50 字概述）、category
- 精炼 body：保留原理、关键案例、实操用法，压缩到 200-500 字
- 人工 review 后落库

### 3.6 分类体系

| 分类 | 覆盖范围 |
|------|---------|
| 句法 | 镜头句、涟漪句、枯笔句、炊烟句、落点句、落差句、棱镜句、灰阶句、双轨句、回旋句、光线句、咬尾句 |
| 修辞 | 通感、倒喻、列锦、转品、对偶句、对顶、约喻、奇设、同语反复、陌生化 |
| 对话 | 冰山对话法 |
| 叙事 | 蒙太奇、跳笔、伏笔、倒着写、倒为因果、预言回响、意象反杀、逆挽、意识流、岐凝 |
| 描写 | 留白、空镜、物候、物化、冷笔触、拟音、把形容词全删掉 |
| 节奏 | 封底、漂亮废话 |

---

## 4. 验收标准

- [ ] 技法 MD 文件可新增/编辑/删除，DB 自动同步
- [ ] 全局开关 toggle 生效，开关后进入/退出候选池
- [ ] 画像绑定可在写法引擎画像编辑器中管理
- [ ] 润色增强时 StyleContract（画像规则 + 反 AI 规则）正确注入
- [ ] AI 筛选步骤可从候选池中选择最多 5 条适用技法
- [ ] 选中技法全文正确注入改写 prompt
- [ ] 空池/空筛选结果时降级到普通改写，无报错
- [ ] 40+ 篇素材已批量提取为精炼 MD 文件
- [ ] 文笔资料库前端页面可浏览、筛选、开关技法
- [ ] 类型检查通过：`pnpm typecheck`

---

## 5. 风险与约束

| 风险 | 缓解 |
| --- | --- |
| 技法全文注入增加 token 成本 | 精炼后每条 200-500 字，最多 5 条 ≈ 2500 tokens，可接受 |
| AI 筛选可能选错技法 | 设最多 5 条上限；用户可通过开关控制候选池质量 |
| StyleContract 注入可能与技法冲突 | 技法是"加法"，StyleContract 是"综合约束"，理论上互补；如冲突以 StyleContract 优先 |
| 批量提取质量不稳定 | AI 初稿 + 人工 review 两步走 |

---

## 6. 关联与边界

- **StyleEngine (写法引擎)**：文笔技法的画像绑定依赖 StyleProfile 模型
- **AntiAiRule (反 AI 规则)**：并列关系，技法是正向指导，反 AI 规则是负向约束
- **章节编辑器**：润色增强是技法注入的消费方
- **REQ-2043 Style Engine Auto Close Loop**：前置已解决 StyleEngine 的闭环，本任务在此基础上扩展

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-09 | 创建 | 初始版本，基于用户需求讨论确认 |
