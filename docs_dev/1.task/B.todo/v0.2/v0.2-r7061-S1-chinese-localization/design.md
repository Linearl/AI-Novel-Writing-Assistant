---
reqId: 7061
title: "中文本地化 — 技术设计"
status: requirements_ready
priority: P0
complexity: S1
estimatedEffort: "1天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7061: 中文本地化 — 技术设计

## 1. 架构设计

### 1.1 标签管理策略

集中式标签管理，新增 `contextGroupLabels.ts` 文件（参照上游），所有中文标签集中在此文件定义。

```
标签变更范围：
server/src/prompting/
├── context/
│   └── contextGroupLabels.ts       ← 新增：32 个 ID → 中文映射
├── prompts/novel/
│   └── chapterLayeredContextShared.ts ← 修改：块标签中文化
└── ...（其他引用标签的位置）
```

### 1.2 映射结构

```typescript
// server/src/prompting/context/contextGroupLabels.ts

export const CONTEXT_GROUP_LABELS: Record<string, string> = {
  // 章节相关
  chapterTask: "章节任务",
  obligationContract: "义务契约",
  localState: "本地状态",
  chapterSummary: "章节摘要",
  chapterOutline: "章节大纲",
  previousChapterSummary: "前章摘要",

  // 角色相关
  characterGuide: "角色引导",
  characterState: "角色状态",
  characterArc: "角色弧光",
  characterRelationship: "角色关系",
  participantGuide: "参与者引导",
  relationshipStage: "关系阶段",

  // 世界观相关
  worldSetting: "世界设定",
  worldTimeline: "世界时间线",
  world geography: "世界地理",
  factionDynamics: "势力格局",

  // 风格相关
  styleGuide: "风格指南",
  toneDirection: "基调方向",
  writingTechnique: "写作技法",

  // 叙事相关
  plotThread: "情节线索",
  thematicElement: "主题要素",
  foreshadowing: "伏笔管理",
  pacingGuide: "节奏指引",
  tensionCurve: "冲突曲线",
  revealLevel: "揭示程度",

  // 大纲相关
  outline: "大纲",
  volumeOutline: "卷大纲",
  narrativeArc: "叙事弧线",

  // 其他
  metadata: "元数据",
  userPreferences: "用户偏好",
  systemInstruction: "系统指令",
  qualityCheckpoint: "质量检查点",
  generationConstraints: "生成约束",
};

/**
 * 获取 context group 的中文显示标签
 * @param groupId context group ID
 * @returns 中文标签，若无映射则返回原始 ID
 */
export function getContextGroupLabel(groupId: string): string {
  return CONTEXT_GROUP_LABELS[groupId] ?? groupId;
}
```

## 2. 详细设计

### 2.1 FR-1: Context Group 标签映射

直接创建 `contextGroupLabels.ts`，参照上游 38 行文件，补全 32 个映射。

### 2.2 FR-2: 上下文块标签中文化

```typescript
// 修改前（chapterLayeredContextShared.ts）
export const CHAPTER_TASK_BLOCK_LABEL = "Chapter Task";
export const OBLIGATION_CONTRACT_LABEL = "Obligation Contract";
export const LOCAL_STATE_LABEL = "Local State";

// 修改后
export const CHAPTER_TASK_BLOCK_LABEL = "章节任务";
export const OBLIGATION_CONTRACT_LABEL = "义务契约";
export const LOCAL_STATE_LABEL = "本地状态";
// ... 其余块标签
```

### 2.3 FR-3: toListBlock 空兜底

```typescript
// 修改前
function toListBlock(items: string[]): string {
  if (items.length === 0) return "";
  return items.map((item) => `- ${item}`).join("\n");
}

// 修改后
function toListBlock(items: string[]): string {
  if (items.length === 0) return "无";
  return items.map((item) => `- ${item}`).join("\n");
}
```

### 2.4 FR-4: 角色引导/关系阶段文本

```typescript
// 修改前
const RELATIONSHIP_STAGES = {
  stranger: "Strangers",
  acquaintance: "Acquaintances",
  friend: "Friends",
  close_friend: "Close Friends",
  rival: "Rivals",
  enemy: "Enemies",
};

// 修改后
const RELATIONSHIP_STAGES = {
  stranger: "陌生人",
  acquaintance: "相识",
  friend: "朋友",
  close_friend: "挚友",
  rival: "对手",
  enemy: "敌人",
};
```

## 3. 实现步骤

### Phase 1: 标签映射文件（0.2 天）

1. 创建 `server/src/prompting/context/contextGroupLabels.ts`
2. 参照上游填入 32 个映射
3. 实现 `getContextGroupLabel()` 函数

### Phase 2: 上下文块标签替换（0.2 天）

1. 搜索 `chapterLayeredContextShared.ts` 中所有英文标签
2. 替换为中文
3. 搜索其他文件中的硬编码英文标签

### Phase 3: toListBlock + 引导文本（0.1 天）

1. 修改 `toListBlock()` 空兜底为"无"
2. 替换角色引导和关系阶段文本

### Phase 4: 验证（0.5 天）

1. grep 全项目确认无遗漏英文标签
2. 生成一个章节的完整 prompt 验证标签显示
3. typecheck + 单元测试

## 4. 测试计划

```typescript
describe("Context Group Labels", () => {
  it("should have Chinese labels for all 32 group IDs", () => {
    const expectedIds = [
      "chapterTask", "obligationContract", "localState",
      // ... 32 个 ID
    ];
    for (const id of expectedIds) {
      expect(CONTEXT_GROUP_LABELS[id]).toBeDefined();
      expect(CONTEXT_GROUP_LABELS[id]).not.toBe(id); // 不是英文回退
    }
  });

  it("should fallback to raw ID for unknown groups", () => {
    expect(getContextGroupLabel("unknown_group")).toBe("unknown_group");
  });
});

describe("toListBlock", () => {
  it("should return '无' for empty list", () => {
    expect(toListBlock([])).toBe("无");
  });

  it("should format non-empty list correctly", () => {
    expect(toListBlock(["item1", "item2"])).toBe("- item1\n- item2");
  });
});
```

## 5. 交付物

- [ ] `server/src/prompting/context/contextGroupLabels.ts` — 新增
- [ ] `server/src/prompting/prompts/novel/chapterLayeredContextShared.ts` — 修改
- [ ] `server/tests/prompting/contextGroupLabels.test.ts` — 新增
