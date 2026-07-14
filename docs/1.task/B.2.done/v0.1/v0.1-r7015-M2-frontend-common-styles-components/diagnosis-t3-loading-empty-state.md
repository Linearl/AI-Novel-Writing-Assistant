---
description: Loading 与 EmptyState 模式的深度诊断报告，覆盖 client/src 全量扫描
---

# Loading / EmptyState 模式深度诊断报告

> 诊断范围：`client/src/` 全目录
> 诊断时间：2026-07-09
> 关联任务包：`v0.1-r7015-M2-frontend-common-styles-components`

---

## 一、现状总览

| 维度 | 数量 |
|------|------|
| Loading 模式出现总文件数 | ~45 |
| Loading 模式出现总次数（含按钮 pending） | ~100+ |
| 纯文字 Loading（无 icon/spinner） | ~35 处 |
| Loader2 spinner Loading | ~10 处 |
| Skeleton / animate-pulse Loading | ~6 处（3 个文件） |
| 按钮 pending 文案切换（isPending / loading） | ~65 处 |
| EmptyState 出现总文件数 | ~50 |
| EmptyState 出现总次数 | ~80+ |
| 纯文字 EmptyState | ~25 处 |
| border-dashed 容器 EmptyState | ~55 处 |
| Card 式 EmptyState（含 title + action） | ~8 处 |
| 内联 "暂无" 占位 | ~40+ 处 |

---

## 二、Loading 模式详细分类

### 2.1 纯文字 Loading（无 icon、无 spinner）-- 35 处

最常见的重复模式：

```
<div className="[py-X] text-center text-sm text-muted-foreground">加载中...</div>
<div className="text-sm text-muted-foreground">正在加载XXX...</div>
```

| # | 文件 | 行号 | 具体文案 | 容器样式 |
|---|------|------|----------|----------|
| 1 | `components/knowledge/KnowledgeDocumentPicker.tsx` | 75 | `加载中...` | `<div text-sm text-muted-foreground>` |
| 2 | `components/risk/RiskPanel.tsx` | 211 | `加载中...` | `<div py-4 text-center text-sm text-muted-foreground>` |
| 3 | `pages/feedback/FeedbackList.tsx` | 138 | `加载中...` | `<div py-12 text-center text-muted-foreground>` |
| 4 | `pages/logs/LogCenterPage.tsx` | 228 | `加载中...` | `<div py-8 text-center text-sm text-muted-foreground>` |
| 5 | `pages/chat/CreativeHubPage.tsx` | 60 | `正在加载能力目录...` | `<span>` |
| 6 | `pages/genres/GenreManagementPage.tsx` | 104 | `正在加载题材基底树...` | `<div text-sm text-muted-foreground>` |
| 7 | `pages/antiAiRules/components/AntiAiRuleList.tsx` | 55 | `正在加载反 AI 规则...` | `<div text-sm text-muted-foreground>` |
| 8 | `pages/titles/components/TitleLibraryPanel.tsx` | 109 | `正在加载标题库...` | `<div rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground>` |
| 9 | `pages/knowledge/components/KnowledgeEmbeddingSettingsCard.tsx` | 153 | `正在加载可用的 Embedding 模型...` | `<div rounded-md border border-dashed p-3 text-sm text-muted-foreground>` |
| 10 | `pages/characters/components/CharacterCreateDialog.tsx` | 268 | `加载中...` | `<div text-sm text-muted-foreground>` |
| 11 | `pages/characters/components/CharacterCreateDialog.tsx` | 298 | `加载中...` | `<div text-sm text-muted-foreground>` |
| 12 | `pages/characters/components/CharacterCard.tsx` | 83 | `加载中...` | `<div text-xs text-muted-foreground>` |
| 13 | `pages/worlds/WorldWorkspace.tsx` | 307 | `加载中...`（内联标题） | `CardTitle` |
| 14 | `pages/worlds/WorldUnlinkDialog.tsx` | 80 | `加载中...` | `<div py-6 text-center text-sm text-muted-foreground>` |
| 15 | `pages/knowledge/components/KnowledgeDocumentDetailDialog.tsx` | 193 | `正在加载文档详情...` | `<div rounded-md border border-dashed p-4 text-sm text-muted-foreground>` |
| 16 | `pages/feedback/FeedbackDetail.tsx` | 81 | `加载中...` | `<p>` |
| 17 | `pages/storyModes/StoryModeManagementPage.tsx` | 626 | `正在加载推进模式树...` | `<div text-sm text-muted-foreground>` |
| 18 | `pages/novels/components/basicInfoForm/ContinuationSourceSection.tsx` | 143 | `正在加载当前来源可用的拆书结果...` | `<div text-xs text-muted-foreground>` |
| 19 | `pages/novels/components/chapterEditor/ChapterEditorSidebar.tsx` | 280 | `正在加载本章工作区。` | `<div text-sm text-muted-foreground>` |
| 20 | `pages/novels/components/CharacterCastOptionsSection.tsx` | 430 | `正在加载阵容方案...` | `<div rounded-xl border border-dashed p-3 text-xs text-muted-foreground>` |
| 21 | `pages/novels/components/CharacterCastOptionsSection.tsx` | 551 | `正在加载关系网络...` | `<div text-muted-foreground>` |
| 22 | `pages/novels/components/CharacterDynamicsSection.tsx` | 191 | `正在加载动态角色系统...` | `<div rounded-2xl border border-dashed p-6 text-sm text-muted-foreground>` |
| 23 | `pages/novels/components/titleWorkshop/NovelCreateTitleQuickFill.tsx` | 330 | `标题库加载中...` | `<div rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground>` |
| 24 | `pages/autoDirectorFollowUps/components/AutoDirectorFollowUpList.tsx` | 128 | `正在加载跟进项...` | `<div rounded-md border border-dashed p-6 text-sm text-muted-foreground>` |
| 25 | `pages/autoDirectorFollowUps/components/AutoDirectorFollowUpDetail.tsx` | 54 | `正在加载详情...` | `<div rounded-md border border-dashed p-6 text-sm text-muted-foreground>` |
| 26 | `pages/novels/mobile/MobileAutoDirectorStatusCard.tsx` | 17 | `加载中` | 返回字符串 |
| 27 | `components/workflow/AITakeoverContainer.tsx` | 34 | `加载中` | 返回字符串 |
| 28 | `pages/novels/components/OutlineVersionControl.tsx` | 131 | `加载中...` | 按钮文案切换 |
| 29 | `pages/novels/components/SettingConsistencyPanel.tsx` | 169 | `加载中...` | `<div py-6 text-center text-sm text-muted-foreground>` |
| 30 | `pages/novels/components/chapterInsights/CharacterArcTab.tsx` | 218 | `加载角色列表...` | `<div py-6 text-center text-xs text-muted-foreground>` |
| 31 | `pages/novels/components/chapterInsights/CharacterArcTab.tsx` | 237 | `加载弧线数据...` | `<div py-6 text-center text-xs text-muted-foreground>` |
| 32 | `pages/worlds/components/generator/WorldGeneratorStepOne.tsx` | 149 | `正在加载题材基底...` | `<option>` |
| 33 | `pages/worlds/components/generator/WorldGeneratorStepOne.tsx` | 165 | `正在加载题材基底树...` | `<div text-xs text-muted-foreground>` |
| 34 | `pages/worlds/components/generator/WorldLibraryQuickPick.tsx` | 65 | `正在加载素材库…` | `<div text-xs text-muted-foreground>` |
| 35 | `pages/worlds/components/workspace/WorldStructureTab.tsx` | 88 | `正在加载高级结构数据...` | `<CardContent text-sm text-muted-foreground>` |

### 2.2 Loader2 Spinner Loading -- 10 处

统一使用 `Loader2` from `lucide-react` + `animate-spin`：

| # | 文件 | 行号 | 用法 |
|---|------|------|------|
| 1 | `pages/novels/mobile/MobileNovelEditView.tsx` | 228 | `<Loader2 className="h-4 w-4 animate-spin" />` |
| 2 | `pages/settings/components/SettingsReadinessCard.tsx` | 27 | `<Loader2 className="h-4 w-4 animate-spin text-amber-600" />` |
| 3 | `pages/novels/components/DirectorFactDebugDialog.tsx` | 250 | `<Loader2 className="h-4 w-4 animate-spin" />` |
| 4 | `pages/novels/components/DirectorFactDebugDialog.tsx` | 258 | `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` |
| 5 | `pages/novels/components/chapterInsights/TimelinePanel.tsx` | 112 | `<Loader2 className="h-4 w-4 animate-spin" />` |
| 6 | `pages/novels/components/NovelEditView.tsx` | 204 | `<Loader2 className="animate-spin" />` |
| 7 | `pages/novels/components/NovelEditView.tsx` | 340 | `<><Loader2 className="animate-spin" />重置中…</>` |
| 8 | `pages/novels/components/SettingConsistencyPanel.tsx` | 168 | `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` |
| 9 | `pages/novels/components/SettingConsistencyPanel.tsx` | 249 | `<Loader2 className="mr-1.5 h-3.5 h-3.5 animate-spin" />` |
| 10 | `pages/novels/components/SettingConsistencyPanel.tsx` | 345 | `<Loader2 className="h-3 w-3 animate-spin" />` |

另有 `RefreshCw` + `animate-spin` 用于刷新按钮的加载态（3 处），不计入 spinner 类。

### 2.3 Skeleton / animate-pulse Loading -- 6 处（3 个文件）

| # | 文件 | 说明 |
|---|------|------|
| 1 | `components/layout/AppRouteFallback.tsx` | 路由 Suspense fallback，完整骨架屏（29 行） |
| 2 | `pages/Home.tsx:372-379,503-505` | 首页小说详情和最近列表骨架，手写 `<div animate-pulse rounded bg-muted>` |
| 3 | `pages/novels/NovelPreview.tsx:222-244` | 预览页骨架，Card+列表项脉冲 |

另有 2 个局部骨架组件定义在编辑器内部：
- `pages/novels/components/chapterEditor/ChapterEditorSidebar.tsx:37` -- `SkeletonLine` 组件
- `pages/novels/components/chapterEditor/ChapterEditorDirectorPanel.tsx:37` -- `SkeletonLine` 组件

### 2.4 按钮 Pending 文案切换 -- 65 处

模式统一为：`{mutation.isPending ? "XXX中..." : "原始按钮文案"}`

这是数量最多的 loading 模式，分布在所有有异步操作的按钮中。按 action 类型统计：

| Action 类型 | 次数 | 示例 |
|-------------|------|------|
| 保存中... | ~15 | 保存修改、保存覆盖、保存全部修改、保存设置、保存绑定 |
| 生成中... | ~10 | 生成标题候选、生成 3 套阵容、生成并入库 |
| 导入/导出中... | ~4 | 导入中...、导入 Profile |
| 删除中... | ~3 | 删除世界样本、批量解除 |
| 提交/创建中... | ~5 | 创建角色、提交任务中...、提交反馈 |
| AI 操作中... | ~8 | AI 解析、AI 优化 Prompt、AI 推荐资源 |
| 其他操作中... | ~20 | 填写中...、重建中...、提取中...、合并中...、重置中... |

---

## 三、EmptyState 模式详细分类

### 3.1 纯文字 EmptyState（无容器边框）-- 25 处

典型模式：

```
<div className="py-X text-center text-sm text-muted-foreground">暂无XXX</div>
```

| # | 文件 | 行号 | 文案 |
|---|------|------|------|
| 1 | `components/risk/RiskPanel.tsx` | 213 | `暂无风险记录` |
| 2 | `pages/feedback/FeedbackList.tsx` | 143 | `暂无反馈` |
| 3 | `pages/feedback/FeedbackDetail.tsx` | 157 | `暂无评论` |
| 4 | `pages/logs/LogCenterPage.tsx` | 230 | `暂无日志数据` |
| 5 | `pages/characters/CharacterLibrary.tsx` | 207 | `暂无角色。` |
| 6 | `pages/characters/components/CharacterCreateDialog.tsx` | 271 | `暂无可选知识文档。` |
| 7 | `pages/characters/components/CharacterCreateDialog.tsx` | 301 | `暂无可选拆书分析。` |
| 8 | `pages/novels/components/chapterInsights/CharacterArcTab.tsx` | 63 | `暂无时间线数据` |
| 9 | `pages/novels/components/chapterInsights/CharacterArcTab.tsx` | 94 | `暂无事件` |
| 10 | `pages/novels/components/chapterInsights/CharacterArcTab.tsx` | 133 | `暂无关系数据` |
| 11 | `pages/novels/components/chapterInsights/CharacterArcTab.tsx` | 179 | `暂无弧光规划` |
| 12 | `pages/novels/components/chapterInsights/CharacterArcTab.tsx` | 223 | `当前小说暂无角色数据。` |
| 13 | `pages/novels/NovelConversationsPage.tsx` | 57 | `暂无对话记录` |
| 14 | `pages/worlds/WorldUnlinkDialog.tsx` | 82 | `当前没有项目使用这个世界。` |
| 15 | `pages/worlds/components/WorldVisualizationBoard.tsx` | 812 | `暂无匹配内容` |
| 16 | `pages/worlds/components/WorldVisualizationBoard.tsx` | 829 | `暂无匹配内容` |
| 17 | `pages/knowledge/components/KnowledgeOpsTab.tsx` | 120 | `暂无`（空 Job 列表） |
| 18 | `pages/knowledge/components/KnowledgeOpsTab.tsx` | 179 | `暂无`（空失败 Job 列表） |
| 19 | `pages/novels/components/ChapterRuntimePanels.tsx` | 288 | `暂无章节规划。` |
| 20 | `pages/novels/components/ChapterRuntimePanels.tsx` | 313 | `暂无状态快照。` |
| 21 | `pages/novels/components/ChapterRuntimePanels.tsx` | 338 | `暂无活跃冲突。` |
| 22 | `pages/novels/components/SettingConsistencyPanel.tsx` | 221 | `当前未发现设定矛盾` |
| 23 | `pages/novels/components/RepairDetailDialog.tsx` | 118 | `暂无修复版本记录` |
| 24 | `pages/novels/components/PipelineTab.tsx` | 462 | `暂无运行中的流水线任务。` |
| 25 | `pages/novels/components/PipelineTab.tsx` | 499 | `暂无质量报告。` |

### 3.2 border-dashed 容器 EmptyState -- 55 处

典型模式：

```
<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">暂无XXX</div>
```

这是**数量最多的 EmptyState 模式**。变体：

| 容器变体 | 使用次数 | 示例文件 |
|----------|----------|----------|
| `rounded-md border border-dashed p-X text-sm text-muted-foreground` | ~20 | Home、KnowledgeDocumentPicker、PromptWorkbench、TaskCenter |
| `rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground` | ~15 | GenreManagement、TitleLibrary、NovelAutoDirectorCandidateBatches |
| `rounded-2xl border border-dashed p-X text-sm text-muted-foreground` | ~10 | NovelWorldManagerCard、ChapterExecutionResultPanel、ChapterEditorSidebar |
| `rounded-lg border border-dashed p-X text-xs text-muted-foreground` | ~8 | BookPayoffLedgerCard、CharacterAssetSidebar、KnowledgeOpsTab |
| `rounded-3xl border border-dashed p-X text-sm text-muted-foreground` | ~2 | NovelChapterEdit（PageStateCard）、ChapterEditorShell |

完整清单（部分）：

| # | 文件 | 行号 | 文案 |
|---|------|------|------|
| 1 | `pages/Home.tsx` | 517 | `暂无小说项目，先从"新建小说"开始。` |
| 2 | `pages/genres/GenreManagementPage.tsx` | 108 | `暂无题材基底树...` |
| 3 | `pages/storyModes/StoryModeManagementPage.tsx` | 630 | `暂无推进模式...` |
| 4 | `pages/knowledge/components/KnowledgeDocumentsTab.tsx` | 219 | `暂无...` |
| 5 | `pages/writingFormula/components/WritingFormulaSidebar.tsx` | 168 | `暂无写法...` |
| 6 | `pages/titles/components/TitleSuggestionList.tsx` | 29 | `暂无...` |
| 7 | `pages/titles/components/TitleLibraryPanel.tsx` | 114 | `暂无标题...` |
| 8 | `pages/bookAnalysis/components/BookAnalysisSidebar.tsx` | 264 | `暂无拆书分析...` |
| 9 | `pages/tasks/components/TaskCenterListPanel.tsx` | 74 | `暂无...` |
| 10 | `pages/tasks/TaskCenterPage.tsx` | 591 | `暂无步骤状态。` |
| 11 | `pages/novels/NovelConversationsPage.tsx` | 56 | `暂无对话记录` |
| 12 | `pages/novels/components/StructuredOutlineWorkspace.tsx` | 226 | `先在上一页生成卷战略和卷骨架。` |
| 13 | `pages/novels/components/VersionHistoryTab.tsx` | 111 | `暂无...` |
| 14 | `pages/novels/components/CharacterDynamicsSection.tsx` | 190 | `正在加载动态角色系统...` |
| 15 | `pages/novels/components/cover/NovelCoverCard.tsx` | 72 | `加载中...` / `暂无封面图` |

### 3.3 Card 式 EmptyState（含 Title + Description + Action）-- 8 处

| # | 文件 | 行号 | Title | Description | Action |
|---|------|------|-------|-------------|--------|
| 1 | `pages/novels/NovelList.tsx` | 294-314 | 暂无小说 / 暂无符合筛选条件的小说 | 详细说明 | AI 自动导演开书 + 手动创建小说 |
| 2 | `pages/novels/NovelPreview.tsx` | 262-272 | 还没有章节 | 先进入工作区... | 进入小说工作区 |
| 3 | `pages/Home.tsx` | 516-519 | （无 Title） | 暂无小说项目... | （无按钮） |
| 4 | `pages/worlds/WorldList.tsx` | 263-266 | 暂无世界样本 | （无 Description） | （未查看） |
| 5 | `pages/feedback/FeedbackList.tsx` | 137-143 | （无 Card） | 暂无反馈 | （无按钮） |
| 6 | `pages/novels/components/SettingConsistencyPanel.tsx` | 221 | （Badge 式） | 当前未发现设定矛盾 | （无按钮） |
| 7 | `pages/novels/NovelList.tsx` | 286-293 | 加载小说列表失败 | 可以重试 | 重新加载 |
| 8 | `pages/novels/components/PipelineTab.tsx` | 499-531 | 暂无质量报告 / 暂无作品圣经 / 暂无剧情拍点 | -- | -- |

### 3.4 内联 "暂无" 占位 -- 40+ 处

模式：`{value || "暂无"}` 或 `{value ?? "暂无"}`，散落在各种显示字段中。

分布：
- `pages/novels/components/` -- ~20 处（NovelWorldUsageCard、NovelTaskDrawer、CharacterAssetWorkspace、BookPayoffLedgerCard 等）
- `pages/tasks/` -- ~8 处（TaskCenterDetailSummary、TaskCenterListPanel、taskCenterUtils）
- `pages/novels/components/chapterInsights/` -- ~10 处（CharacterDynamicsPanel、CharacterArcTab 等）
- `pages/characters/components/CharacterCard.tsx` -- 5 处（性格、外貌、弱点、习惯、关键事件的 fallback）

---

## 四、重复模式分析

### 4.1 Loading 重复模式

**模式 A -- 纯文字 Loading（最高频，35 处）**
```
<div className="[py-6|py-8|py-12] text-center text-sm text-muted-foreground">加载中...</div>
```
差异仅在 padding 和字号，结构完全一致。涉及 ~25 个文件。

**模式 B -- 边框 Loading（中频，~10 处）**
```
<div className="rounded-md|xl border border-dashed p-6 text-sm text-muted-foreground">正在加载XXX...</div>
```
与 EmptyState 共用容器样式，仅文案不同。

**模式 C -- Loader2 Spinner（低频，10 处）**
```
<Loader2 className="[mr-2] h-[3-4] w-[3-4] animate-spin" />
```
className 不统一（有 h-3/h-3.5/h-4，有带 mr 有不带 mr）。

**模式 D -- 按钮 Pending（最高频，65 处）**
```
{mutation.isPending ? "XXX中..." : "原始文案"}
```
完全重复的模式，但 action 名不同，无法简单组件化。可提取 hook。

**模式 E -- Skeleton 骨架屏（低频，6 处）**
各处手写 `<div animate-pulse rounded bg-muted>` 模拟内容结构，完全无复用。`ChapterEditorSidebar` 和 `ChapterEditorDirectorPanel` 各自定义了局部 `SkeletonLine` 组件。

### 4.2 EmptyState 重复模式

**模式 F -- 纯文字 EmptyState（25 处）**
```
<div className="[py-X] text-center text-sm text-muted-foreground">暂无XXX</div>
```
与模式 A 完全对称，只是文案不同。

**模式 G -- border-dashed EmptyState（55 处）**
```
<div className="rounded-[md|xl|2xl|lg|3xl] border border-dashed p-[3-8] text-[xs|sm] text-muted-foreground">暂无XXX</div>
```
容器样式有 5 种以上变体，但核心语义完全一致。

**模式 H -- Card EmptyState（8 处）**
结构相似但各处定制程度较高（不同按钮、不同路由链接），难以统一。

**模式 I -- 内联 "暂无" 占位（40+ 处）**
```
{value || "暂无"}
```
纯字符串替换，无 UI 结构可提取。

---

## 五、可提取的公共模式

### 5.1 LoadingSpinner / LoadingIndicator

覆盖：**35 处**纯文字 Loading + **10 处** Loader2 spinner

所有 `isLoading ? <span>加载中...</span>` 和 `<div className="py-X text-center text-muted-foreground">加载中...</div>` 均可替换。

### 5.2 EmptyState 组件

覆盖：**55 处** border-dashed EmptyState + **25 处**纯文字 EmptyState = **80 处**

绝大多数空状态只是一句文案加一个虚线框，完全可以统一。

### 5.3 useButtonPending hook 或 LoadingButton 组件

覆盖：**65 处**按钮 pending 切换

虽然每处文案不同，但逻辑完全一致。可提取 `<LoadingButton isLoading={mutation.isPending} loadingText="保存中...">保存</LoadingButton>`。

### 5.4 Skeleton 组件

覆盖：**6 处**骨架屏 + **2 处**局部 SkeletonLine

当前各处手写 `<div animate-pulse>` 的做法应统一为可复用的 `<Skeleton>` 组件（shadcn/ui 已有标准实现，项目内 `components/ui/skeleton.tsx` 已存在但几乎未被使用）。

---

## 六、组件设计建议

### 6.1 LoadingIndicator 组件

```typescript
interface LoadingIndicatorProps {
  /** 显示文案，默认 "加载中..." */
  text?: string;
  /** 尺寸变体 */
  variant?: 'text' | 'spinner' | 'skeleton';
  /** 文字对齐 */
  align?: 'left' | 'center';
  /** 容器尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 用于边框容器变体 */
  bordered?: boolean;
}
```

**Variant 说明：**
- `text` -- 纯文字 + muted-foreground（覆盖 35 处）
- `spinner` -- Loader2 + animate-spin（覆盖 10 处）
- `skeleton` -- pulse 骨架块（覆盖 6 处 + 扩展用）

**预计替换：45 处**，涉及 ~30 个文件。

### 6.2 EmptyState 组件

```typescript
interface EmptyStateProps {
  /** 显示文案 */
  message: string;
  /** 图标（可选，lucide-react 组件） */
  icon?: React.ComponentType<{ className?: string }>;
  /** 操作按钮（可选） */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline';
    href?: string; // 如需路由跳转
  };
  /** 容器变体 */
  variant?: 'text' | 'bordered' | 'card';
  /** 占位文本大小 */
  size?: 'sm' | 'md' | 'lg';
}
```

**Variant 说明：**
- `text` -- 纯文字居中（覆盖 25 处）
- `bordered` -- border-dashed 虚线框（覆盖 55 处）
- `card` -- Card 包裹 + title + description + action（覆盖 8 处）

**预计替换：88 处**，涉及 ~40 个文件。

### 6.3 LoadingButton 组件

```typescript
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 是否处于 pending 态 */
  isLoading?: boolean;
  /** pending 时显示文案，如 "保存中..." */
  loadingText?: string;
  /** children 为正常态文案 */
  children: React.ReactNode;
  /** 按钮变体 */
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  /** 尺寸 */
  size?: 'default' | 'sm' | 'lg';
}
```

**预计替换：65 处**，涉及 ~35 个文件。

### 6.4 Skeleton 组件增强

项目已有 `components/ui/skeleton.tsx`（shadcn/ui 标准），但实际使用极少。建议：

1. 将 `ChapterEditorSidebar.tsx` 和 `ChapterEditorDirectorPanel.tsx` 中的局部 `SkeletonLine` 替换为 `Skeleton`
2. 将 `Home.tsx` 和 `NovelPreview.tsx` 中的手写 `animate-pulse` 替换为 `Skeleton`
3. 提供预设骨架组合（`SkeletonCard`、`SkeletonList`、`SkeletonForm`）

**预计替换：8 处**，涉及 4 个文件。

---

## 七、预估工作量

| 组件 | 预计替换处数 | 涉及文件数 | 预估工作量 |
|------|-------------|-----------|-----------|
| LoadingIndicator | 45 | ~30 | 1.5h（组件 + 逐文件替换 + 样式微调） |
| EmptyState | 88 | ~40 | 2h（组件 + 逐文件替换 + 边框变体对齐） |
| LoadingButton | 65 | ~35 | 2h（组件 + 按钮文案迁移 + 测试） |
| Skeleton 增强 | 8 | 4 | 0.5h（替换局部 SkeletonLine + 手写 pulse） |
| **合计** | **206 处** | **~50 个文件** | **~6h** |

### 建议实施顺序

1. **Skeleton 增强**（0.5h）-- 最小改动，立即可用
2. **LoadingIndicator**（1.5h）-- 消除最多的视觉不一致
3. **EmptyState**（2h）-- 最大的一致性提升
4. **LoadingButton**（2h）-- 改善最多的交互体验

### 风险与注意事项

- `isPending` 和 `isLoading` 来自 TanStack Query，替换时需确保 prop 名语义清晰
- 部分 EmptyState 有 action 按钮或 Link，替换时需逐一确认路由目标
- border-dashed 容器的 `rounded-*` 变体（md/xl/2xl/3xl）需在 EmptyState 组件中支持或统一为默认值
- 部分 loading/empty 文案内联在工具函数返回值中（如 `novelEditTakeoverBuilder.ts`、`taskCenterUtils.ts`），这些不涉及 UI 组件，保持现状即可
