---
description: "REQ-2023 技术设计文档"
id: REQ-2023
title: 资源变更风险拒绝意图注入 - 技术设计
version: 0.1
created: 2026-06-28
---

# REQ-2023: 技术设计

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer                               │
│  ResourceProposalCard                                       │
│  ├── [确认并用于后续写作] → confirm API                      │
│  ├── [忽略这条变化] → reject API (无意图)                    │
│  └── [不接受此风险] → 弹出意图输入框 → reject API (有意图)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                              │
│  POST /:id/character-resource-proposals/:proposalId/reject  │
│  Body: { reason?: string, intent?: string }                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│  stateChangeProposal 表                                     │
│  ├── status: "rejected"                                     │
│  └── validationNotesJson: [..., "rejectedIntent:xxx"]       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Business Layer                            │
│  Chapter Repair Flow                                        │
│  ├── 读取章节关联的 rejected proposals                       │
│  ├── 提取 rejectedIntent                                    │
│  └── 注入到 AI prompt                                       │
└─────────────────────────────────────────────────────────────┘
```

## 2. 数据结构变更

### 2.1 proposal 存储方案

**方案 A：复用 validationNotesJson（推荐）**

在 `validationNotesJson` 数组中添加特殊格式的条目：

```json
{
  "validationNotesJson": [
    "原有验证说明",
    "rejectedIntent:用户希望弱化陈子轩的戏份",
    "rejectedReason:风险过高"
  ]
}
```

**方案 B：新增字段（不推荐）**

在 `stateChangeProposal` 表新增 `rejectedIntent` 字段。

**选择理由**：方案 A 无需数据库迁移，复用现有字段，解析逻辑简单。

### 2.2 类型定义变更

```typescript
// shared/types/characterResource.ts
export const characterResourceProposalSummarySchema = z.object({
  // ... 现有字段
  rejectedIntent: z.string().optional(),  // 新增
  rejectedReason: z.string().optional(),  // 新增
});
```

## 3. API 变更

### 3.1 Reject API

```typescript
// POST /:id/character-resource-proposals/:proposalId/reject
// Request Body
{
  reason?: string;   // 拒绝原因
  intent?: string;   // 修正意图（AI 修复时参考）
}

// Response
{
  success: true;
  data: CharacterResourceLedgerResponse;
  message: "资源变更已忽略。";
}
```

### 3.2 后端实现

```typescript
// novelCharacterResourceRoutes.ts
router.post(
  "/:id/character-resource-proposals/:proposalId/reject",
  validate({ params: characterResourceProposalParamsSchema, body: rejectSchema }),
  async (req, res, next) => {
    const { id, proposalId } = req.params;
    const { reason, intent } = req.body;

    // 构建 validationNotes
    const validationNotes: string[] = [];
    if (reason) validationNotes.push(`rejectedReason:${reason}`);
    if (intent) validationNotes.push(`rejectedIntent:${intent}`);

    // 更新 proposal
    await prisma.stateChangeProposal.updateMany({
      where: { id: proposalId, novelId: id, status: "pending_review" },
      data: {
        status: "rejected",
        validationNotesJson: JSON.stringify(validationNotes),
      },
    });

    // 返回更新后的数据
    // ...
  }
);
```

## 4. UI 变更

### 4.1 ResourceProposalCard

```tsx
// 新增"不接受此风险"按钮
{proposal.riskLevel === "high" ? (
  <Button
    type="button"
    size="sm"
    variant="destructive"
    onClick={() => onRejectWithIntent?.(proposal)}
  >
    不接受此风险
  </Button>
) : null}
```

### 4.2 意图输入对话框

```tsx
<Dialog open={isIntentDialogOpen} onOpenChange={setIsIntentDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>说明修正意图</DialogTitle>
      <DialogDescription>
        请描述你希望如何修正这个风险，AI 修复章节时会参考你的意图。
      </DialogDescription>
    </DialogHeader>
    <Textarea
      value={intent}
      onChange={(e) => setIntent(e.target.value)}
      placeholder="例如：需要弱化陈子轩的戏份，避免与匿名私信的关联"
    />
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsIntentDialogOpen(false)}>
        取消
      </Button>
      <Button onClick={handleSubmitReject}>
        确认不接受
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## 5. AI Prompt 注入

### 5.1 章节修复 Prompt 模板

在 `chapterPatchRepair.prompts.ts` 或相关 prompt 中添加：

```markdown
## 用户修正意图

以下资源变更被用户拒绝，请在修复时考虑：

{{#each rejectedProposals}}
- **{{resourceName}}** (风险等级: {{riskLevel}})
  - 风险描述: {{summary}}
  - 用户意图: {{rejectedIntent}}
{{/each}}

请根据以上用户意图，调整修复策略，确保修复后的内容符合用户期望。
```

### 5.2 数据读取逻辑

```typescript
// 在章节修复流程中
async function getRejectedIntentsForChapter(novelId: string, chapterId: string) {
  const proposals = await prisma.stateChangeProposal.findMany({
    where: {
      novelId,
      chapterId,
      proposalType: "character_resource_update",
      status: "rejected",
    },
  });

  return proposals
    .map((p) => parseValidationNotes(p.validationNotesJson))
    .filter((n) => n.rejectedIntent);
}
```

## 6. 错误处理

| 场景 | 处理方式 |
|------|----------|
| proposal 不存在 | 返回 404，提示"该变更可能已被自动处理" |
| proposal 状态非 pending_review | 返回 400，提示"该变更已处理" |
| 意图过长 | 限制 500 字符，超出提示 |
| 网络错误 | 前端 toast 提示重试 |

## 7. 测试策略

| 测试类型 | 覆盖点 |
|----------|--------|
| 单元测试 | 解析 validationNotes 中的 rejectedIntent |
| 集成测试 | reject API 传入意图参数 |
| E2E 测试 | 用户填写意图 → 章节修复时 AI 参考意图 |

## 8. 性能影响

- **无额外数据库查询**：复用 validationNotesJson 字段
- **无额外 API 调用**：意图随 reject 请求一起提交
- **Prompt 长度增加**：每个 rejected proposal 增加约 50-100 tokens
