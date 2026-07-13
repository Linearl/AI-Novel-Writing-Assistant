---
description: "REQ-2051 角色重要度分级技术设计文档"
---

# Design: 角色重要度分级（CharacterTier）

## 1. 架构概览

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Prisma DB  │◄───│ Shared Types │◄───│  Prompt Schema  │
│  (tier col) │    │ (tier field) │    │  (tier in Zod)  │
└─────────────┘    └──────────────┘    └─────────────────┘
       ▲                  ▲                    ▲
       │                  │                    │
┌──────┴───────┐   ┌──────┴───────┐    ┌──────┴──────┐
│   Service    │   │   Frontend   │    │   Prompt    │
│  (tier ops)  │   │ (UI + filter)│    │ (tier guide)│
└──────────────┘   └──────────────┘    └─────────────┘
```

## 2. 数据层设计

### 2.1 Prisma Schema 变更

```prisma
// 新增 enum（与 CharacterGender 同级）
enum CharacterTier {
  lead
  major
  named
  extra
}

// Character 模型新增字段
model Character {
  // ...existing fields...
  tier  CharacterTier @default(named)
}
```

**Migration 文件**：`20260713120000_character_tier`

同时补上 `exitStatus` / `exitNote` / `exitChapterId` 的迁移（历史遗留）。

### 2.2 Shared Types 变更

```typescript
// shared/types/novelCharacter.ts
export type CharacterTier = "lead" | "major" | "named" | "extra";

// Character 接口新增
interface Character {
  // ...existing...
  tier?: CharacterTier | null;
}

// CharacterCastOptionMember 新增
interface CharacterCastOptionMember {
  // ...existing...
  tier?: CharacterTier | null;
}

// SupplementalCharacterCandidate 新增
interface SupplementalCharacterCandidate {
  // ...existing...
  tier?: CharacterTier | null;
}
```

## 3. Prompt 层设计

### 3.1 阵容生成 Prompt 新增指令

在 `characterPreparation.prompts.ts` 的 `characterCastOptionPrompt` 和 `characterCastAutoPrompt` 中新增：

```
【重要度分级】
每个成员必须标注 tier 字段，允许值：lead / major / named / extra。
- lead：故事主角，有且仅有1个
- major：重要配角，有独立弧线
- named：有名有姓的出场角色，需要一致性但不一定有弧线
- extra：出场少的次要角色，只需 name + role + storyFunction + shortDescription
- extra 角色的 personality / background / development / hard facts / inner psychology 字段可以为空字符串
```

### 3.2 Zod Schema 变更

`characterPreparation.promptSchemas.ts` 中 `CHARACTER_CAST_MEMBER_FIELDS` 新增 `tier` 字段（enum validation）。

### 3.3 上下文组装变更

`characterPreparation.contextBlocks.ts`：已有角色列表中展示 tier 信息。

## 4. Service 层设计

### 4.1 characterCastQuality 新增校验

```typescript
// 每套阵容有且仅有 1 个 lead
const leadCount = option.members.filter(m => m.tier === 'lead').length;
if (leadCount !== 1) {
  issues.push({ code: 'missing_protagonist', ... });
}
```

### 4.2 characterCastApply

应用阵容时，将每个 member 的 `tier` 写入数据库 Character 表。

### 4.3 characterPreparationSupplemental

补充角色生成时，透传 `targetTier` 参数到 prompt。

## 5. 前端 UI 设计

### 5.1 Tier 选择器（CharacterAssetWorkspace）

位置：紧跟 gender 下拉之后，role 输入之前。

```tsx
<select value={characterForm.tier} onChange={...}>
  <option value="lead">主角</option>
  <option value="major">重要配角</option>
  <option value="named">有名角色</option>
  <option value="extra">次要角色</option>
</select>
```

### 5.2 侧边栏分组（CharacterAssetSidebar）

```
lead（主角）
  → 林平之
───────────
major（重要配角）
  → 岳不群
  → 任盈盈
───────────
named（有名角色）
  → 田伯光
  → 仪琳
───────────
extra（次要角色）
  → 客栈老板
```

### 5.3 Tier 筛选器

位置：角色列表顶部（侧边栏上方或内部），多选 chip 样式。

```tsx
<div className="tier-filter">
  <Chip selected={filter.tier.includes('lead')}   onClick={toggle('lead')}>主角</Chip>
  <Chip selected={filter.tier.includes('major')}  onClick={toggle('major')}>重要配角</Chip>
  <Chip selected={filter.tier.includes('named')}  onClick={toggle('named')}>有名角色</Chip>
  <Chip selected={filter.tier.includes('extra')}  onClick={toggle('extra')}>次要角色</Chip>
</div>
```

### 5.4 Tier 徽章（CharacterFocusSummary）

在角色名旁显示对应 tier 徽章，颜色区分：
- lead：蓝色
- major：绿色
- named：灰色
- extra：浅灰

### 5.5 辅助函数

```typescript
// characterAssetWorkspace.helpers.ts
export function getCharacterTierLabel(tier?: string | null): string { ... }
export function getCharacterTierColor(tier?: string | null): string { ... }
```

## 6. 下游集成设计

### 6.1 章节生成上下文

`chapterLayeredContextShared.ts` 中，角色信息传递按 tier 区分：

| tier | 传递内容 |
|------|---------|
| lead / major | 完整 profile（所有字段） |
| named | 基础 profile（personality + background + appearance + hard facts） |
| extra | 最小 profile（name + role + 一句话 storyFunction） |

## 7. 文件变更清单

### DB & Types
| 文件 | 改动 |
|------|------|
| `server/src/prisma/schema.prisma` | 新增 CharacterTier enum + Character.tier 字段 |
| `server/src/prisma/schema.sqlite.prisma` | 同步 |
| `server/src/prisma/migrations/20260713120000_character_tier/` | 新迁移（含 exitStatus 补丁） |
| `shared/types/novelCharacter.ts` | 新增 CharacterTier 类型 + 3 个接口加 tier |

### Prompt
| 文件 | 改动 |
|------|------|
| `server/src/prompting/prompts/novel/characterPreparation.prompts.ts` | 8 个 prompt 加 tier 指令 |
| `server/src/prompting/prompts/novel/characterPreparation.promptSchemas.ts` | Zod schema 加 tier |
| `server/src/prompting/prompts/novel/characterPreparation.contextBlocks.ts` | 上下文加 tier 信息 |
| `server/src/prompting/prompts/novel/characterPreparation.autoFallback.prompts.ts` | fallback prompt 加 tier |

### Service
| 文件 | 改动 |
|------|------|
| `server/src/services/novel/characterPrep/characterCastGeneration.ts` | 透传 tier |
| `server/src/services/novel/characterPrep/characterCastApply.ts` | 写入 tier |
| `server/src/services/novel/characterPrep/characterCastQuality.ts` | 校验 lead 数量 |
| `server/src/services/novel/characterPrep/characterPreparationSupplemental.ts` | 透传 tier |
| `server/src/services/novel/characterPrep/characterPrepHelpers.ts` | 序列化含 tier |

### 前端
| 文件 | 改动 |
|------|------|
| `client/src/pages/novels/components/CharacterAssetSidebar.tsx` | 按 tier 分组 + 筛选器 |
| `client/src/pages/novels/components/CharacterAssetWorkspace.tsx` | tier 选择器 |
| `client/src/pages/novels/components/CharacterFocusSummary.tsx` | tier 徽章 |
| `client/src/pages/novels/components/CharacterQuickCreateDialog.tsx` | tier 下拉 |
| `client/src/pages/novels/components/CharacterCastOptionsSection.tsx` | 成员 tier 标签 |
| `client/src/pages/novels/components/CharacterSupplementalDialog.tsx` | 目标 tier 选择 |
| `client/src/pages/novels/components/characterAssetWorkspace.helpers.ts` | tier 辅助函数 |
| `client/src/pages/novels/components/characterPanel.utils.ts` | QuickCreatePayload 加 tier |
| `client/src/pages/novels/hooks/useNovelCharacterMutations.ts` | mutation payload 加 tier |
| 3 处 `CharacterFormState` 定义 | 加 tier 字段 |

### 下游
| 文件 | 改动 |
|------|------|
| `server/src/prompting/prompts/novel/chapterLayeredContextShared.ts` | 按 tier 决定 profile 详略 |
