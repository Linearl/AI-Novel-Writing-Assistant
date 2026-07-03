---
description: "REQ-2027 设计文档 - 章节编辑器编辑后资产沉淀的技术方案"
---

# REQ-2027 设计文档

## 1. 架构概览

本次变更涉及三层：章节编辑器 UI → 新增后端 API → 现有风格引擎服务复用。

```
用户编辑章节正文（ChapterEditorShell contentDraft vs savedContent / preEditContent）
  ↓ 点击按钮（保存前或保存后均可）
判断 diff 来源：
  ├── 保存前：beforeText = savedContent, afterText = contentDraft
  └── 保存后：beforeText = preEditContent（缓存）, afterText = savedContent
  ↓ 传递完整 diff 视图（修改前后两个版本的完整章节内容）
新增后端 API: POST /style-engine/extract-from-diff
  ├── 反 AI 规则提取路径：LLM 分析 diff 视图 → 生成 AntiAiRuleDraftFields[]
  └── 风格画像 fork 路径：读取当前绑定画像 → LLM 分析 diff 视图 → 生成规则调整 patch → 创建新 StyleProfile
  ↓ 返回提取结果
前端弹窗展示 → 用户确认/编辑
  ├── 反 AI 规则：保存到 AntiAiRule 表 → 关联到当前风格画像
  └── 风格画像：新画像已创建 → 更新 StyleBinding 切换到新画像
```

## 2. 数据结构变更

### 2.1 新增请求/响应类型（shared/types/styleEngine.ts）

```typescript
/** 章节编辑 diff 提取请求 */
export interface ChapterEditDiffExtractRequest {
  /** 编辑前的完整章节内容 */
  beforeText: string;
  /** 编辑后的完整章节内容 */
  afterText: string;
  /** 当前小说 ID（用于读取绑定的风格画像） */
  novelId: string;
  /** 章节 ID（用于上下文） */
  chapterId?: string;
  /** LLM 配置 */
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}

/** 反 AI 规则提取结果 */
export interface ChapterEditAntiAiExtractResult {
  /** 提取的反 AI 规则草稿列表 */
  drafts: AntiAiRuleDraftFields[];
  /** LLM 对用户修改意图的分析摘要 */
  intentSummary: string;
}

/** 风格画像 fork 结果 */
export interface ChapterEditStyleForkResult {
  /** 新创建的风格画像 */
  newProfile: StyleProfile;
  /** 原风格画像 ID */
  originalProfileId: string;
  /** fork 后的规则变更摘要 */
  changeSummary: string;
  /** 推荐的新画像名（用户可修改） */
  suggestedName: string;
}
```

### 2.2 版本号策略

版本号按"原画像名"维度递增。查询时：
1. 模糊匹配所有名称以 `{原画像名}-{小说名}-v` 开头的画像
2. 取最大版本号 + 1
3. 无匹配时从 v1 开始

## 3. 后端新增 API

### 3.1 反 AI 规则提取

```
POST /api/style-engine/extract-anti-ai-from-diff
```

请求体：`ChapterEditDiffExtractRequest`

处理流程：
1. 将 beforeText 和 afterText 作为 diff 视图（修改前后两个版本的完整章节内容）传给 LLM
2. 读取当前小说绑定的风格画像的已有反 AI 规则列表
3. 调用 LLM，prompt 包含：
   - diff 视图：修改前完整章节 + 修改后完整章节
   - 已有反 AI 规则列表（去重用）
   - 要求输出：每条规则的 key、name、type、severity、description、detectPatterns、rewriteSuggestion、promptInstruction
   - 要求分析用户修改意图
4. 返回 `ChapterEditAntiAiExtractResult`

### 3.2 风格画像 fork

```
POST /api/style-engine/fork-style-from-diff
```

请求体：`ChapterEditDiffExtractRequest`

处理流程：
1. 读取当前小说绑定的风格画像（通过 StyleBindingService）
2. 将 beforeText 和 afterText 作为 diff 视图传给 LLM
3. 调用 LLM，prompt 包含：
   - 原风格画像的四维规则（narrative/character/language/rhythm）
   - diff 视图：修改前完整章节 + 修改后完整章节
   - 要求输出：对原规则的 patch 调整 + 变更摘要 + 推荐命名
4. 合并 patch 到原规则，创建新 StyleProfile
5. 自动创建 StyleBinding（targetType: novel, targetId: novelId），删除旧绑定
6. 返回 `ChapterEditStyleForkResult`

### 3.3 Prompt 设计要点

两个 API 共用一个 prompt 模板（在 `server/src/prompting/prompts/style/style.prompts.ts` 注册），通过 mode 参数区分：

- `mode: "anti_ai_extraction"`：侧重识别 AI 味道表达，生成反 AI 规则
- `mode: "style_fork"`：侧重理解用户对叙事/语言/节奏/角色的调整意图，生成规则 patch

### 3.4 路由注册

在 `server/src/routes/styleEngine.ts` 中新增两个路由。

## 4. 前端变更

### 4.1 preEditContent 缓存机制

在 `ChapterEditorShell.tsx` 中新增 `preEditContent` 状态：

```typescript
// 章节加载时初始化
const [preEditContent, setPreEditContent] = useState<string>("");

// 章节数据加载成功时，记录初始内容
useEffect(() => {
  if (chapter?.content && !preEditContent) {
    setPreEditContent(chapter.content);
  }
}, [chapter?.content]);

// 保存时缓存当前编辑前的内容
const saveMutation = useMutation({
  onMutate: () => {
    setPreEditContent(contentDraft); // 保存前缓存
    setSaveStatus("saving");
  },
  // ...
});

// 切换章节时清除缓存
useEffect(() => {
  setPreEditContent("");
}, [chapter?.id]);
```

### 4.2 按钮位置

在章节编辑器主编辑区的保存按钮附近新增两个按钮（参考截图中保存/版本入口的位置）：

```
┌──────────────────────────────────────────────────┐
│ 第 1 章 · 重生之破晓 (2)                            │
│ 1080 字 · 已同步 · 问题 2                           │
│ [保存]  [版本入口]                                  │
│ ──────────────────────────────────────────────    │
│ [提取反 AI 规则]  [提取风格画像]                     │
│ ...编辑器内容...                                    │
└──────────────────────────────────────────────────┘
```

### 4.3 diff 来源与 hasDiff 判断

```typescript
// 保存前：before = savedContent, after = contentDraft
// 保存后：before = preEditContent, after = savedContent
// hasDiff = 有编辑前内容可比 && 前后内容不同
const hasDiff = (() => {
  // 保存前：有未保存修改
  if (isDirty && savedContent && contentDraft !== savedContent) return true;
  // 保存后：有缓存的编辑前内容，且与当前保存版本不同
  if (!isDirty && preEditContent && savedContent && preEditContent !== savedContent) return true;
  return false;
})();

// 获取 diff 视图（含修改前后完整章节内容）
function getDiffView() {
  if (isDirty) {
    return { beforeText: savedContent ?? "", afterText: contentDraft };
  }
  return { beforeText: preEditContent ?? "", afterText: savedContent ?? "" };
}
```

### 4.4 ChapterEditorShell.tsx mutation 和弹窗

新增两个 mutation：
- `extractAntiAiMutation`：调用反 AI 提取 API，成功后打开确认弹窗
- `extractStyleMutation`：调用风格 fork API，成功后打开确认弹窗

管理弹窗状态：
- `antiAiExtractResult`：反 AI 提取结果
- `styleForkResult`：风格 fork 结果

### 4.5 新增弹窗组件

#### AntiAiExtractConfirmDialog.tsx

- 展示 LLM 的意图分析摘要
- 逐条展示提取的反 AI 规则（可编辑 key/name/description/detectPatterns/rewriteSuggestion）
- 每条规则有启用/禁用开关
- 确认按钮：调用 AntiAiRuleService 批量创建规则 → 关联到风格画像

#### StyleForkConfirmDialog.tsx

- 展示原风格画像名称和 fork 变更摘要
- 展示新画像名（可编辑输入框，预填推荐名）
- 展示规则 diff 对比（原规则 vs 新规则）
- 确认按钮：更新画像名（如果用户修改了）→ 完成绑定切换

### 4.6 章节编辑器按钮组件

在主编辑区保存按钮旁渲染：

```tsx
<div className="flex flex-wrap gap-2">
  <Button
    size="sm"
    variant="outline"
    onClick={onExtractAntiAi}
    disabled={!hasDiff || extractAntiAiMutation.isPending}
  >
    {extractAntiAiMutation.isPending ? "提取中..." : "提取反 AI 规则"}
  </Button>
  <Button
    size="sm"
    variant="outline"
    onClick={onExtractStyle}
    disabled={!hasDiff || extractStyleMutation.isPending}
  >
    {extractStyleMutation.isPending ? "提取中..." : "提取风格画像"}
  </Button>
</div>
```

## 5. 数据流

### 5.1 反 AI 规则提取数据流

```
ChapterEditorShell
  ├── getDiffView() → { beforeText, afterText }（完整章节内容）
  ↓
POST /api/style-engine/extract-anti-ai-from-diff
  ├── 读取 novelId → StyleBinding → 当前 StyleProfile → 已有 antiAiRules
  ├── LLM 分析 diff 视图（修改前完整章节 + 修改后完整章节）+ 去重
  ↓ 返回
AntiAiExtractConfirmDialog
  ↓ 用户确认
批量创建 AntiAiRule → 关联到 StyleProfile
  ↓ 同步
AntiAiPolicyResolver 在下次生成时自动加载新规则
```

### 5.2 风格画像 fork 数据流

```
ChapterEditorShell
  ├── getDiffView() → { beforeText, afterText }（完整章节内容）
  ↓
POST /api/style-engine/fork-style-from-diff
  ├── 读取 novelId → StyleBinding → 当前 StyleProfile
  ├── 计算版本号
  ├── LLM 分析 diff 视图 → 生成 rulePatch
  ├── mergeStyleRuleSet(原规则, patch) → 新规则
  ├── 创建新 StyleProfile（名称 = "{原名}-{小说名}-v{N}"）
  ├── 创建新 StyleBinding（novel → 新画像）
  ├── 删除旧 StyleBinding
  ↓ 返回
StyleForkConfirmDialog
  ↓ 用户可能修改名称 → PUT 更新画像名
完成
```

## 6. 关键决策

| 决策 | 选择 | 理由 |
|------|------|------|
| diff 对比时机 | 保存前 + 保存后均可 | 保存时缓存 preEditContent，确保保存后仍有基准 |
| 提交给 LLM 的输入 | diff 视图（修改前后两个版本的完整章节内容） | 完整上下文让 LLM 理解修改意图，而非仅看修改片段 |
| 风格 fork 自动切换绑定 | 是 | 用户 fork 的意图就是要用新画像，不切换需要额外操作 |
| 反 AI 规则默认应用到当前项目 | 是 | 用户在章节编辑器中提取，意图明确是为当前项目服务 |
| 版本号策略 | 按原画像名维度递增 | 同一画像多次 fork 时版本号连续，便于追溯 |
| preEditContent 缓存时机 | saveMutation.onMutate | 保存前一刻缓存，确保不遗漏任何编辑 |

## 7. Prompt Governance

新增 prompt 必须在 `server/src/prompting/prompts/style/style.prompts.ts` 中注册为 `PromptAsset`，禁止在 service 文件中内联。
