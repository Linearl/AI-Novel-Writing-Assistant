---
reqId: 7060
title: "Auto-Director 增强 — 技术设计"
status: requirements_ready
priority: P1
complexity: C1
estimatedEffort: "5-6天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7060: Auto-Director 增强 — 技术设计

## 1. 架构设计

### 1.1 模块划分

```
REQ-7060 子功能模块分布：

客户端（client/src/）
├── pages/novels/autoDirector/        ← FR-1: 5 步创建向导
│   ├── AutoDirectorCreatePage.tsx     // 主容器
│   ├── directorCreateStages.ts        // 步骤定义状态机
│   ├── useAutoDirectorCreateController.ts // 控制器 Hook
│   ├── StageBasicSetup.tsx            // 步骤 1
│   ├── StageIdea.tsx                  // 步骤 2
│   ├── StageWorldStyle.tsx            // 步骤 3
│   ├── StageCandidates.tsx            // 步骤 4
│   ├── StageModelRun.tsx             // 步骤 5
│   └── StageSummaryCard.tsx           // 汇总卡片
├── lib/autoDirectorPauseNotifications.ts ← FR-2: 桌面通知
└── components/tensionCurve/           ← FR-5: 冲突曲线（共享）

服务端（server/src/）
├── services/novel/state/PendingReviewAutoPromotionService.ts ← FR-3
├── services/novel/runtime/proseQuality/ProseQualityDetector.ts ← FR-4
└── prompting/prompts/novel/           ← FR-6: 待审上下文
```

### 1.2 组件交互

```
用户操作流程：
创建向导(FR-1)
  → 保存项目配置
  → 启动 Auto-Director
  → 桌面通知(FR-2) 监控执行状态
  → 章节进入待审
  → 待审上下文注入(FR-6)
  → 散文质量检测(FR-4)
  → 冲突等级曲线(FR-5) 约束生成
  → 待审超时 → 自动提升(FR-3)
```

## 2. 详细设计

### 2.1 FR-1: 5 步创建向导

**参考上游**：`client/src/pages/novels/autoDirector/` 目录下 9 个文件

#### 状态机设计

```typescript
// 基于上游 directorCreateStages.ts
interface CreateWizardState {
  currentStep: number;       // 0-4（5 个步骤）
  completedSteps: Set<number>;
  stepData: {
    basicSetup: BasicSetupData;
    idea: IdeaData;
    worldStyle: WorldStyleData;
    candidates: CandidatesData;
    modelRun: ModelRunData;
  };
  validationErrors: Record<number, string[]>;
}
```

#### 步骤定义

```typescript
interface CreateStage {
  id: number;
  title: string;
  description: string;
  component: React.ComponentType<StageProps>;
  validate: (data: StepData) => ValidationResult;
  isRequired: boolean;
}

const STAGES: CreateStage[] = [
  { id: 0, title: "基础设置", component: StageBasicSetup, ... },
  { id: 1, title: "创意想法", component: StageIdea, ... },
  { id: 2, title: "世界观与风格", component: StageWorldStyle, ... },
  { id: 3, title: "候选方案", component: StageCandidates, ... },
  { id: 4, title: "模型运行", component: StageModelRun, ... },
];
```

#### 关键实现

- 使用自定义 Hook `useAutoDirectorCreateController` 管理状态
- 步骤间前进/后退通过状态机控制
- 中间状态持久化到 `localStorage`
- 候选方案步骤调用 LLM 生成多方案供选择

### 2.2 FR-2: 桌面通知系统

**参考上游**：`client/src/lib/autoDirectorPauseNotifications.ts`（114 行）

```typescript
// 基于上游实现
class AutoDirectorPauseNotificationManager {
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastState: DirectorState | null = null;
  private pollIntervalMs: number = 15_000; // 15 秒

  async requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) return "denied";
    return Notification.requestPermission();
  }

  startPolling(novelId: string): void {
    this.pollTimer = setInterval(async () => {
      const state = await fetchDirectorState(novelId);
      if (this.stateChanged(state)) {
        this.sendNotification(state);
        this.lastState = state;
      }
    }, this.pollIntervalMs);

    // 页面不可见时增加频率
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.increasePollFrequency();
      } else {
        this.resetPollFrequency();
      }
    });
  }

  private sendNotification(state: DirectorState): void {
    if (Notification.permission === "granted") {
      new Notification("Auto-Director", {
        body: this.getNotificationBody(state),
        icon: "/favicon.ico",
      });
    }
  }
}
```

### 2.3 FR-3: 待审自动提升

**参考上游**：`server/src/services/novel/state/PendingReviewAutoPromotionService.ts`（594 行）

```typescript
// 核心逻辑
class PendingReviewAutoPromotionService {
  private readonly PROMOTION_THRESHOLD_DAYS = 14;

  async checkAndPromote(novelId: string): Promise<PromotionResult> {
    const pendingChapters = await this.getPendingChapters(novelId);
    const overdueChapters = pendingChapters.filter(
      (ch) => daysSince(ch.pendingSince) >= this.PROMOTION_THRESHOLD_DAYS
    );

    for (const chapter of overdueChapters) {
      // 双重确认：系统校验 + 用户确认
      const systemCheck = await this.systemValidation(chapter);
      if (systemCheck.passed) {
        await this.requestUserConfirmation(chapter);
      }
    }
  }

  private async systemValidation(chapter: NovelChapter): Promise<ValidationResult> {
    // 检查章节内容完整性
    // 检查前置章节是否已完成
    // 检查是否有阻塞性问题
  }

  private async requestUserConfirmation(chapter: NovelChapter): Promise<void> {
    // 通过 EventBus 发布确认请求
    // 等待用户响应（超时 7 天自动拒绝）
  }
}
```

### 2.4 FR-4: 散文质量检测器

**参考上游**：`server/src/services/novel/runtime/proseQuality/ProseQualityDetector.ts`（450 行）

```typescript
// 9 种问题码检测
type ProseIssueCode =
  | "repetitiveSentence"
  | "excessiveAdjective"
  | "passiveVoiceOveruse"
  | "tellingInsteadShowing"
  | "dialogueTag"
  | "pacing"
  | "vaguePronoun"
  | "clichePhrase"
  | "infoDump";

interface ProseIssue {
  code: ProseIssueCode;
  severity: "low" | "medium" | "high";
  position: { start: number; end: number };
  matchedText: string;
  suggestion: string;
}

class ProseQualityDetector {
  private rules: Map<ProseIssueCode, RegExp>;

  constructor() {
    this.rules = new Map([
      ["repetitiveSentence", /(.{10,})\1+/g],
      ["excessiveAdjective", /(\S+\s+){3,}(的|地)/g],
      // ... 其余 7 种 regex 规则
    ]);
  }

  detect(text: string): ProseIssue[] {
    const issues: ProseIssue[] = [];
    for (const [code, pattern] of this.rules) {
      // 对每种规则执行匹配并生成问题报告
    }
    return issues;
  }
}
```

### 2.5 FR-5: 冲突等级曲线

**参考上游**：`client/src/components/tensionCurve/`（10 文件）

- 使用 React Flow 构建可视化画布
- d3-shape 生成平滑曲线
- 支持拖拽编辑节点
- 自动检测节奏问题（平坦高原、高潮过迟）

### 2.6 FR-6: 待审上下文注入

在章节进入待审状态时，增强审校上下文：

```typescript
// 注入内容
interface PendingReviewContext {
  previousSummary: string;      // 前文摘要
  characterStates: CharacterState[];  // 角色当前状态
  worldChanges: WorldChange[];        // 世界设定变更
  thematicContinuity: string;         // 主题连贯性提示
}

// 注入位置：chapterAcceptance.prompt 构建时
```

### 2.7 FR-7: 资源上下文重构

```typescript
// 统一接口
interface ResourceContextBuilder {
  buildChapterContext(chapterId: string): Promise<ChapterContext>;
  buildNovelContext(novelId: string): Promise<NovelContext>;
  buildCharacterContext(characterId: string): Promise<CharacterContext>;
}

// 重构目标：将散落在各处的上下文组装逻辑收敛到此模块
```

## 3. 实现步骤

### Phase 1: 创建向导（2 天）

1. 参照上游 `autoDirector/` 目录实现 5 步向导
2. 实现状态机和步骤控制 Hook
3. 实现各步骤组件
4. 持久化中间状态

### Phase 2: 通知系统 + 待审自动提升（1.2 天）

1. 参照上游实现通知管理器
2. 集成 Browser Notification API
3. 实现待审自动提升服务
4. 双重确认机制

### Phase 3: 散文检测 + 冲突曲线（1.2 天）

1. 参照上游实现散文质量检测器
2. 实现 9 种 regex 规则
3. 参照上游实现冲突曲线组件
4. 曲线编辑器 UI

### Phase 4: 上下文增强（0.7 天）

1. 实现待审上下文注入
2. 重构资源上下文组装逻辑

### Phase 5: 测试与验证（1 天）

1. 单元测试（各模块独立）
2. 集成测试（创建向导端到端）
3. typecheck 验证

## 4. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 上游代码与本项目架构差异大 | 移植成本高 | 中 | 先做差异分析，适配接口 |
| 创建向导步骤过多 | 用户流失 | 低 | 支持跳步 |
| Browser Notification 兼容性 | 通知失败 | 中 | 降级为页面内通知 |
| 散文检测 regex 误报 | 用户体验差 | 中 | 可调阈值 |
