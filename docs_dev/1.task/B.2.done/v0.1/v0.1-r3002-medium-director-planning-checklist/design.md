---
description: "REQ-3002 方案设计"
---

# REQ-3002 方案设计

## 1. 架构概述

```
┌─────────────────────────────────────────────────────┐
│  DirectorEventProjectionService                      │
│  inventory.missingArtifactTypes ──→ projection       │
│    .missingArtifactTypes                             │
└───────────────────────┬─────────────────────────────┘
                        │ API response
                        ▼
┌─────────────────────────────────────────────────────┐
│  DirectorRuntimeProjectionCard                       │
│                                                      │
│  ┌─ visibleRiskBadges (原有 Badge 逻辑保留) ─────┐  │
│  │  "缺少规划资源" → 检测到时替换为 Checklist     │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌─ ArtifactMissingChecklist (新增) ─────────────┐  │
│  │  折叠: "缺少 N 项规划资源 ▸"                   │  │
│  │  展开: ○ 书级合约 (book_contract)              │  │
│  │        ○ 角色阵容 (character_cast)             │  │
│  │        ...                                     │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 2. 数据流

### 2.1 后端变更

**改动文件**：`shared/types/directorRuntime.ts`

```typescript
// DirectorRuntimeProjection 新增字段
export interface DirectorRuntimeProjection {
  // ...existing fields...
  missingArtifactTypes?: DirectorArtifactType[];  // 新增
}
```

**改动文件**：`server/src/services/novel/director/runtime/DirectorEventProjectionService.ts`

在 `buildDirectorRuntimeProjection` 函数中，将 `inventory.missingArtifactTypes` 赋值到 projection：

```typescript
const projection: DirectorRuntimeProjection = {
  // ...existing fields...
  missingArtifactTypes: inventory.missingArtifactTypes.length > 0
    ? inventory.missingArtifactTypes
    : undefined,
};
```

### 2.2 前端变更

**改动文件**：`client/src/components/autoDirector/DirectorRuntimeProjectionCard.tsx`

新增产物类型中文映射常量：

```typescript
const DIRECTOR_ARTIFACT_DISPLAY_LABELS: Record<string, string> = {
  book_contract: "书级合约",
  story_macro: "故事宏观规划",
  character_cast: "角色阵容",
  volume_strategy: "卷战略",
  chapter_task_sheet: "章节任务单",
  chapter_draft: "章节草稿",
  audit_report: "审计报告",
  repair_ticket: "修复工单",
  reader_promise: "读者承诺",
  character_governance_state: "角色治理状态",
  world_skeleton: "世界骨架",
  source_knowledge_pack: "源知识包",
  chapter_retention_contract: "章节留存合约",
  continuity_state: "连续性状态",
  rolling_window_review: "滚动窗口审阅",
};
```

新增 `ArtifactMissingChecklist` 组件（内联在同文件中）：

```typescript
function ArtifactMissingChecklist({ types }: { types: DirectorArtifactType[] }) {
  const [expanded, setExpanded] = useState(false);
  if (types.length === 0) return null;
  return (
    <div className="rounded-md border bg-background/70">
      <button onClick={() => setExpanded(!expanded)} className="...">
        <Circle className="h-3.5 w-3.5 text-amber-500" />
        <span>缺少 {types.length} 项规划资源</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="border-t px-3 py-2 space-y-1.5">
          {types.map(t => (
            <div key={t} className="flex items-center gap-2 text-xs">
              <Circle className="h-3 w-3 text-muted-foreground" />
              <span>{DIRECTOR_ARTIFACT_DISPLAY_LABELS[t] ?? t}</span>
              <span className="text-muted-foreground/60">{t}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

在 `DirectorRuntimeProjectionCard` 组件中，替换原有"缺少规划资源"Badge 的渲染逻辑：

```typescript
// 原逻辑：visibleRiskBadges 中包含 "缺少规划资源" 的 badge 直接渲染为 Badge
// 新逻辑：检测到 missingArtifactTypes 非空时，用 Checklist 替换该 badge
const missingArtifactChecklist = projection.missingArtifactTypes?.length
  ? projection.missingArtifactTypes
  : null;

// 在 visibleRiskBadges 渲染时，过滤掉 "缺少规划资源" badge（由 Checklist 替代）
const filteredRiskBadges = visibleRiskBadges.filter(
  badge => !(badge.source === "artifact" && badge.label === "缺少规划资源" && missingArtifactChecklist)
);
```

**位置**：Checklist 放在 `visibleRiskBadges` 区域下方，紧邻 helperLines 之前。

## 3. 样式设计

- Checklist 折叠态：一行，圆角边框，左侧圆形警告图标 + 文案 + 右侧展开箭头
- 展开态：向下展开，每行一个产物，左侧小圆点 + 中文名 + 灰色 artifactType
- 配色：amber 色系（与 warning Badge 一致），不喧宾夺主
- 动画：箭头旋转 180°，展开/折叠平滑过渡

## 4. 测试策略

- 单元测试：`ArtifactMissingChecklist` 组件的展开/折叠行为
- 集成测试：`DirectorRuntimeProjectionCard` 在有/无 `missingArtifactTypes` 时的渲染差异
- 类型测试：`pnpm typecheck` 确认新增字段不影响现有类型
