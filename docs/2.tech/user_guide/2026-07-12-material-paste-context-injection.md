# 粘贴素材功能流程说明

## 功能概述

在手动创建小说模式中，用户可以通过"粘贴素材"功能将一大段创作素材粘贴进去。AI会自动解析这段素材，并将解析出的信息（世界观、角色、大纲等）保存到小说的基本信息中，供后续的创作步骤使用。

## 粘贴素材的解析字段

当用户粘贴素材时，AI会从素材中提取以下字段：

| 字段 | 说明 | 存储位置 |
|------|------|----------|
| title | 小说标题 | novel.title |
| description | 一句话概述 | novel.description |
| targetAudience | 目标读者 | novel.targetAudience |
| bookSellingPoint | 核心卖点 | novel.bookSellingPoint |
| competingFeel | 竞品阅读感 | novel.competingFeel |
| first30ChapterPromise | 前30章承诺 | novel.first30ChapterPromise |
| styleTone | 风格关键词 | novel.styleTone |
| commercialTagsText | 商业标签 | novel.commercialTags |
| **worldSetting** | 世界观设定 | **novel.outline**（合并） |
| **characters** | 角色信息 | **novel.outline**（合并） |
| **outline** | 大纲信息 | **novel.outline**（合并） |
| genreHint | 题材倾向 | 用于推荐（不保存） |
| chapterCountHint | 预计章节数 | 用于推荐（不保存） |

## 核心流程

### 1. 素材粘贴与解析

```
用户粘贴素材 → MaterialParseDialog → 调用 /api/material-parse
                                          ↓
                                   AI解析素材
                                          ↓
                                   返回结构化字段
                                          ↓
                                   用户确认/编辑
                                          ↓
                                   应用到基本表单
```

### 2. 字段合并与保存

```
basicForm.worldSetting + basicForm.characters + basicForm.outline
                        ↓
         buildOutlineFromMaterialFields()
                        ↓
         组合为单一的 outline 字段
                        ↓
         调用 createNovel API
                        ↓
         保存到 novel.outline
```

关键代码位置：
- `client/src/pages/novels/novelBasicInfo.shared.ts:329` - 字段合并逻辑
- `client/src/pages/novels/novelBasicInfo.shared.ts:393` - 在创建时注入

### 3. 后续步骤的上下文注入

#### A. AI Agent 读取（novelReadTools.ts:104）

AI Agent 在执行任务时可以通过工具读取小说信息，其中包含：
```typescript
{
  outline: novel.outline,  // 包含世界观、角色、大纲
  structuredOutline: novel.structuredOutline,
  // ...其他字段
}
```

这意味着后续的自动导演、章节生成等任务**可以访问到这些信息**。

#### B. RAG 索引（ragDataPipelineDocumentLoader.ts:33）

素材解析的内容会被加载到 RAG（检索增强生成）索引中：

```typescript
const content = [
  novel.outline ?? undefined,           // 包含世界观、角色、大纲
  novel.structuredOutline ?? undefined,
  novel.world?.description ?? undefined,
].filter(Boolean).join("\n\n");
```

后续章节生成时，系统会自动检索相关上下文，确保新生成的内容与已有设定一致。

#### C. 章节规划上下文（plannerChapterPlanContext.ts:291）

在规划章节时，会读取outline：

```typescript
{
  outline: novel.outline,
  structuredOutline: novel.structuredOutline,
  // ...其他上下文
}
```

这确保了规划的章节与粘贴的素材设定保持一致。

## 信息流转路径

```
用户粘贴素材
    ↓
AI解析出：worldSetting, characters, outline
    ↓
保存到 novel.outline 字段
    ↓
┌─────────────────────────────────────┐
│  后续步骤使用                         │
├─────────────────────────────────────┤
│ ✓ AI Agent 直接读取                  │
│ ✓ RAG 检索（章节生成时自动注入）      │
│ ✓ 章节规划上下文                     │
│ ✓ 大纲生成参考                       │
│ ✓ 角色创建参考                       │
│ ✓ 风格推荐参考                       │
└─────────────────────────────────────┘
```

## 验证与使用

### 如何验证信息是否保存成功

1. 粘贴素材并完成创建
2. 进入项目设定 → 基本信息
3. 展开"书级定位与基本信息"
4. 查看"大纲信息"字段是否包含解析出的世界观、角色、大纲

### 如何验证后续步骤是否使用

1. **查看RAG索引**：
   - 打开 Prisma Studio（`pnpm db:studio`）
   - 查看 novel 表的 outline 字段

2. **测试AI是否知道这些信息**：
   - 让AI创建角色（它应该能参考角色设定）
   - 让AI生成大纲（它应该能参考世界观）
   - 让AI生成章节（它应该能参考大纲）

3. **查看日志**：
   - 在RAG查询日志中查看是否检索到相关内容

## 典型场景

### 场景1：粘贴完整设定

用户粘贴包含完整设定的素材：
```
【世界观】
修仙世界，分为凡人界、修仙界、仙界...

【角色】
主角：张三，废材逆袭型
反派：李四，宗门长老之子...

【大纲】
第一卷：入门宗门
第二卷：下山历练...
```

→ 这些信息会被保存到novel.outline
→ 后续大纲生成时会参考这些设定
→ 章节生成时会参考这些设定

### 场景2：部分信息缺失

用户只粘贴标题和描述，不粘贴详细设定：
```
《修仙从入门到精通》
一本讲述废材逆袭的修仙小说...
```

→ 只保存标题和描述
→ outline字段为空
→ 后续步骤会基于标题和描述生成新设定

## 最佳实践

### 粘贴素材时

1. **尽可能详细**：世界观、角色、大纲越详细越好
2. **结构化格式**：使用【】标记不同部分，便于AI解析
3. **避免重复**：如果已有详细设定，不需要再粘贴到素材
4. **明确标注**：对于重要设定，用明确的标题标记

### 编辑解析结果

1. **检查解析结果**：确认AI正确识别了所有字段
2. **修正错误**：如果有错误，手动编辑修正
3. **补充遗漏**：如果AI遗漏了重要信息，手动添加

### 后续步骤

1. **查看大纲**：确认大纲是否包含粘贴的信息
2. **AI对话**：询问AI关于小说设定，验证它是否知道
3. **角色创建**：让AI创建角色，验证它是否参考了设定

## 相关文件

### 前端
- `client/src/pages/novels/components/MaterialParseDialog.tsx` - 素材粘贴对话框
- `client/src/pages/novels/novelBasicInfo.shared.ts` - 字段合并逻辑（第329行）

### 后端
- `server/src/prompting/prompts/novel/materialParse.prompts.ts` - 素材解析prompt
- `server/src/agents/tools/novelReadTools.ts` - AI读取工具
- `server/src/services/rag/ragDataPipelineDocumentLoader.ts` - RAG索引加载

## 总结

✅ **是的，粘贴素材的信息会自动注入到后续步骤中。**

具体来说：
1. 世界观、角色、大纲会被合并保存到 `novel.outline` 字段
2. 这个字段会在后续的AI任务中被直接读取
3. 同时会被加载到RAG索引，章节生成时自动检索
4. 确保整个创作流程与粘贴的素材保持一致

这是一个**隐式但自动的上下文注入机制**，用户无需手动操作，系统会自动确保信息在各个步骤中保持一致。
