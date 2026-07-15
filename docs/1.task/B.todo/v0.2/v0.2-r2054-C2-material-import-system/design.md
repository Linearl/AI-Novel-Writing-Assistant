---
description: "REQ-2054 方案设计 — NovelMaterial 模型、API 路由、Prompt 注入、B2 两轮加载"
---

# 方案设计 — 多素材导入与按需加载

> 详细设计见 [架构设计文档](../../../2.tech/architecture/2026-07-15-multi-material-import-design.md)。本文档仅为实施层补充。

---

## 1. NovelMaterial 表 Prisma 定义

```prisma
model NovelMaterial {
  id          String   @id @default(cuid())
  novelId     String
  title       String
  description String?
  content     String
  wordCount   Int      @default(0)
  sortOrder   Int      @default(0)
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  novel       Novel    @relation(fields: [novelId], references: [id])
  @@index([novelId, enabled])
  @@index([novelId, sortOrder])
}
```

## 2. 接口清单

| 方法 | 端点 | 用途 | Zod 校验 | 持久化 |
|------|------|------|----------|--------|
| POST | `/parse-material` | 多材料解析 → 结构化字段 + storyInput | `materials: z.array(z.object({title, content}))` | 否 |
| POST | `/:novelId/materials/import` | 批量导入材料 | `materials: z.array(z.object({title, content, sortOrder?}))` | 是 |
| GET | `/:novelId/materials` | 材料列表 | — | 读 |
| GET | `/:novelId/materials/:id` | 材料全文 | — | 读 |
| PATCH | `/:novelId/materials/:id` | 编辑材料 | `z.object({title?, description?, sortOrder?})` | 是 |
| DELETE | `/:novelId/materials/:id` | 删除材料 | — | 是 |
| PATCH | `/:novelId/materials/:id/toggle` | 切换启用 | `z.object({enabled: z.boolean()})` | 是 |

## 3. material_index prompt block 格式

```
【用户参考材料索引】
以下是你可以在写作中参考的材料列表。如需某篇材料的全文，请在输出中声明其 ID。

- [材料ID: xxx] 角色设定与小传
  [类型] 角色设定 | [摘要] 包含8个角色的完整设定、小传、人物弧线、关系总览图 | [字数] 约8000字 | [适用] 全阶段

- [材料ID: xxx] 章节规划（30章详细剧情梗概）
  [类型] 章节大纲 | [摘要] 30章逐章概要、核心事件、情感核心、悬念钩子 | [字数] 约30000字 | [适用] 写作阶段
```

## 4. B2 两轮加载在 director step runtime 中的实现

在 `DirectorCoreStepModuleRuntime` 步骤执行函数内部：

```typescript
// 第一轮：含 material_index
const round1Schema = originalSchema.extend({
  requestedMaterialIds: z.array(z.string()).optional()
});
const round1Result = await invokeStructuredLlm(messages, round1Schema);

if (round1Result.requestedMaterialIds?.length > 0) {
  // 加载材料全文
  const materials = await db.novelMaterial.findMany({
    where: { id: { in: round1Result.requestedMaterialIds }, novelId }
  });
  const materialText = materials.map(m => `---\n## ${m.title}\n\n${m.content}`).join('\n\n');
  messages.push({ role: "user", content: `以下是您请求的参考材料全文：\n\n${materialText}` });

  // 第二轮：含材料全文
  const round2Result = await invokeStructuredLlm(messages, originalSchema);
  return round2Result;
}

const { requestedMaterialIds, ...cleanResult } = round1Result;
return cleanResult;
```

## 5. 前端文件夹选择

使用 `<input type="file" webkitdirectory>` 实现文件夹选择，`FileReader` 读取文件内容。处理 .txt 和 .md 文件，过滤其他格式。
