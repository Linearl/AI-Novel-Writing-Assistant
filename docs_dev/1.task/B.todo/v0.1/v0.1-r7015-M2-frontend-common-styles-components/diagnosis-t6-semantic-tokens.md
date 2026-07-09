---
description: client/src 原始 Tailwind 色板使用深度诊断 — 语义化 token 迁移分析
date: 2026-07-09
scope: client/src
---

# 诊断 T6：语义化 Token 使用情况深度诊断

## 1. 统计总览

**扫描范围**: `client/src/` 下所有 `.tsx`、`.ts`、`.css` 文件
**排除**: `index.css`（CSS 变量定义）、`components/ui/`（shadcn 内部）、`tailwind.config.ts`
**总 TSX/TS/CSS 行数**: ~12,327 行
**涉及原始色板的文件数**: 89 个
**原始色板类使用总次数**: ~1,329 次

### 按色板族汇总

| 色板族 | 总使用次数 | 占比 | 涉及文件数 | 语义关联 |
|--------|-----------|------|-----------|---------|
| **slate** | 829 | 62.4% | ~60 | 通用中性灰 |
| **amber** | 282 | 21.2% | ~25 | 警告/待确认 |
| **emerald** | 105 | 7.9% | ~30 | 成功/完成 |
| **red** | 48 | 3.6% | ~18 | 错误/失败/危险 |
| **yellow** | 22 | 1.7% | ~5 | 警告/开发工具 |
| **blue** | 13 | 1.0% | ~6 | 信息/进行中 |
| **orange** | 12 | 0.9% | ~4 | 警告/重要 |
| **cyan** | 7 | 0.5% | 1 | 品牌色（DesktopBootstrap） |
| **indigo** | 5 | 0.4% | 3 | 特殊状态 |
| **green** | 4 | 0.3% | 2 | 成功/活跃 |
| **gray** | 2 | 0.15% | 1 | 退场状态 |
| **总计** | **~1,329** | **100%** | **89** | — |

### 按用途分类（slate 族拆分）

| 用途 | 次数 | 典型类 |
|------|------|--------|
| `text-slate-*`（文字颜色） | ~415 | text-slate-500, text-slate-900, text-slate-700 |
| `bg-slate-*`（背景色） | ~163 | bg-slate-50, bg-slate-900, bg-slate-100 |
| `border-slate-*`（边框色） | ~226 | border-slate-200, border-slate-300, border-slate-800 |
| `ring-slate-*`（焦点环） | ~17 | ring-slate-200 |
| `from/to/via-slate-*`（渐变） | ~8 | from-slate-50, to-slate-100 |

---

## 2. TOP 15 高频原始色板类

| 排名 | 类名 | 次数 | 语义含义 |
|------|------|------|---------|
| 1 | `border-slate-200` | 128 | 默认边框 |
| 2 | `text-slate-500` | 127 | 次要/辅助文字 |
| 3 | `bg-slate-50` | 102 | 浅灰背景/卡片底色 |
| 4 | `text-slate-900` | 86 | 主文字/标题 |
| 5 | `bg-amber-50` | 76 | 警告提示底色 |
| 6 | `text-slate-700` | 63 | 次级文字 |
| 7 | `text-slate-600` | 56 | 次级文字 |
| 8 | `border-amber-200` | 48 | 警告边框 |
| 9 | `border-slate-300` | 42 | 输入框/卡片边框 |
| 10 | `text-amber-900` | 36 | 警告文字 |
| 11 | `border-slate-400` | 34 | 输入框焦点边框 |
| 12 | `border-amber-300` | 27 | 警告强调边框 |
| 13 | `text-slate-950` | 25 | 强调文字 |
| 14 | `bg-emerald-50` | 25 | 成功底色 |
| 15 | `text-amber-800` | 21 | 警告文字 |

---

## 3. 各文件原始色板使用密度 TOP 20

| 文件 | 使用次数 | 主要色板 |
|------|---------|---------|
| `pages/chat/components/RuntimeSidebar.tsx` | 65 | slate, amber, red |
| `pages/creativeHub/components/CreativeHubSidebar.tsx` | 60 | slate, amber, emerald, orange |
| `pages/writingFormula/components/WritingFormulaEditorPanel.tsx` | 49 | slate |
| `pages/writingFormula/components/WritingFormulaLanding.tsx` | 40 | slate |
| `pages/novels/components/cover/NovelCoverDialog.tsx` | 39 | slate |
| `pages/creativeHub/components/CreativeHubToolResultCard.tsx` | 35 | slate, emerald, indigo |
| `pages/writingFormula/components/WritingFormulaCreateDialog.tsx` | 34 | slate |
| `components/layout/DesktopBootstrapShell.tsx` | 33 | slate, amber, cyan |
| `pages/characters/components/CharacterImageDialog.tsx` | 29 | slate, amber, emerald |
| `pages/writingFormula/components/WritingFormulaCleanFlow.tsx` | 20 | slate |
| `pages/chat/components/AssistantChatPanel.tsx` | 19 | slate, amber |
| `pages/promptWorkbench/components/PromptSlotPanel.tsx` | 17 | slate, red, blue |
| `pages/creativeHub/components/CreativeHubNovelSetupCard.tsx` | 17 | slate, amber, emerald |
| `pages/writingFormula/components/WritingFormulaWorkbenchPanel.tsx` | 16 | slate |
| `pages/writingFormula/components/WritingFormulaCleanPanel.tsx` | 15 | slate |
| `pages/creativeHub/components/NovelProductionStarterCard.tsx` | 15 | slate |
| `pages/creativeHub/components/CreativeHubTurnSummaryCard.tsx` | 15 | slate |
| `pages/creativeHub/components/CreativeHubInlineToolCall.tsx` | 15 | slate, amber, red |
| `pages/novels/components/NovelStyleRecommendationCard.tsx` | 14 | slate |
| `pages/creativeHub/components/CreativeHubMessagePrimitives.tsx` | 13 | slate, amber |

---

## 4. 语义化 Token 映射建议表

### 4.1 已有语义 Token 直接映射（安全替换）

| 原始色板 | 当前使用模式 | 推荐语义 Token | 安全等级 |
|---------|-------------|---------------|---------|
| `text-slate-500` | 次要文字、辅助说明 | `text-muted-foreground` | **安全** |
| `text-slate-400` | 更弱的辅助文字、标签 | `text-muted-foreground`（需验证亮度） | **安全** |
| `text-slate-900` / `text-slate-950` | 主文字、标题 | `text-foreground` | **安全** |
| `text-slate-700` / `text-slate-800` | 次级正文 | `text-foreground`（偏暗场景） | **安全** |
| `bg-slate-50` | 卡片底色、浅灰背景 | `bg-muted` 或 `bg-card` | **安全** |
| `bg-slate-100` | 输入框/标签底色 | `bg-secondary` | **安全** |
| `bg-slate-900` / `bg-slate-950` | 深色面板（暗色系 UI） | `bg-background`（暗色模式）或 `bg-primary` | **需谨慎** |
| `border-slate-200` | 默认边框 | `border-border`（通过 `@apply border-border` 已全局设定） | **安全** |
| `border-slate-300` | 输入框/卡片边框 | `border-border` | **安全** |
| `border-slate-400` | 输入框 focus 边框 | `border-ring` 或 `ring-ring` | **需谨慎** |
| `ring-slate-200` | 焦点环/装饰环 | `ring-border` 或 `ring-ring` | **需谨慎** |
| `bg-slate-900 text-white` | 主按钮（深色） | `bg-primary text-primary-foreground` | **安全** |
| `text-slate-50` / `text-white` | 深色背景上的浅色文字 | `text-primary-foreground` | **安全** |
| `text-red-600` / `text-red-700` | 错误文字 | `text-destructive` | **需谨慎** |
| `bg-red-50` / `border-red-200` | 错误提示框 | 需新增 `--destructive-muted` 或保留原色 | **需新增 token** |
| `bg-red-100 text-red-800` | 严重标签 | 需新增 `--destructive-subtle` 或保留 | **需新增 token** |

### 4.2 缺失语义 Token（需新增 CSS 变量）

| 语义场景 | 当前原始色板用法 | 建议新增 Token | 优先级 |
|---------|----------------|---------------|-------|
| **成功/完成** | `bg-emerald-50`, `text-emerald-700`, `border-emerald-200`, `bg-emerald-600` | `--success`, `--success-foreground` | **高** |
| **警告/待确认** | `bg-amber-50`, `text-amber-700/800/900`, `border-amber-200/300` | `--warning`, `--warning-foreground` | **高** |
| **信息/进行中** | `bg-blue-50`, `text-blue-600/700/800`, `border-blue-200` | `--info`, `--info-foreground` | **中** |
| **成功-活跃** | `bg-green-600 text-white` | 可复用 `--success` 或保持 | **低** |
| **次要灰**（退场/禁用） | `bg-gray-400 text-white` | 可复用 `--muted` + `--muted-foreground` | **低** |

### 4.3 不可替换 / 应保留原始色板的场景

| 场景 | 原始色板 | 原因 |
|------|---------|------|
| **DesktopBootstrap 深色主题** | `bg-slate-950`, `border-slate-800`, `text-slate-300` 等 | 独立深色 UI 壳，不属于语义系统范围 |
| **Chat 消息气泡**（深色） | `bg-slate-900 text-slate-50`（用户消息） | 深色气泡是设计意图，不映射 primary |
| **Chat 消息气泡**（浅色） | `bg-white text-slate-900 border-slate-200`（AI 消息） | 白色气泡是设计意图，保留 card 语义 |
| **渐变色** | `from-slate-50 to-slate-100`, `bg-gradient-to-b` | 渐变不适合语义 token |
| **品牌色/特色色** | `bg-cyan-400`, `bg-cyan-500/20`（DesktopBootstrap） | 品牌色不应纳入语义系统 |
| **图表/数据可视化** | `bg-indigo-500`, `bg-blue-500`（RunTracker 圆点） | 图表色有独立配色需求 |
| **Feedback 严重度标签** | `bg-blue-100 text-blue-800`, `bg-orange-100` 等 | 多级严重度需保留色阶区分 |
| **Noto 字体色**（写作配方） | slate 色阶用于字体选择预览 | 色阶展示需保留原始色 |
| **opacity 变体** | `bg-amber-500/10`, `border-amber-500/40` | 语义 token 不支持自定义 opacity |

---

## 5. 暗色模式兼容性风险

### 现状分析

- `tailwind.config.ts` 配置了 `darkMode: "class"`
- `index.css` 中 `:root` 和 `.dark` 都定义了完整的语义 CSS 变量
- **但绝大多数原始色板使用没有 `dark:` 对应变体**
- 仅发现 ~10 处使用了 `dark:text-amber-*` / `dark:bg-emerald-*` / `dark:bg-amber-*` 等显式暗色模式原始色

### 风险

| 风险 | 说明 | 严重度 |
|------|------|-------|
| 浅色面板在暗色模式下反白 | `bg-slate-50`、`bg-white` 在暗色主题下会显得刺眼 | **高** |
| 文字对比度不足 | `text-slate-500` 在暗色背景上对比度可能不够 | **高** |
| 边框不可见 | `border-slate-200` 在暗色背景上几乎不可见 | **中** |
| 警告/成功色不协调 | amber/emerald 色阶在暗色背景下需不同亮度值 | **中** |
| 深色面板（bg-slate-900）在亮色模式下反暗 | DesktopBootstrap 有意为之，非 bug | **低** |

### 建议

迁移到语义化 token 后，`index.css` 中 `.dark` 变量组自动适配暗色模式，一次性解决以上所有问题。这是本次迁移的核心收益之一。

---

## 6. 按颜色族的详细使用清单

### 6.1 slate（829 次，~60 文件）

**文字颜色（~415 次）**

| 类名 | 次数 | 典型映射 |
|------|------|---------|
| `text-slate-500` | 127 | `text-muted-foreground` |
| `text-slate-900` | 86 | `text-foreground` |
| `text-slate-700` | 63 | `text-foreground`（偏暗） |
| `text-slate-600` | 56 | `text-muted-foreground`（偏暗） |
| `text-slate-950` | 25 | `text-foreground`（最暗） |
| `text-slate-800` | 15 | `text-foreground`（偏暗） |
| `text-slate-400` | 15 | `text-muted-foreground`（偏亮） |
| `text-slate-200` | 10 | 暗色 UI 上的浅色文字，保留 |
| `text-slate-100` | 8 | 暗色 UI 上的浅色文字，保留 |
| `text-slate-300` | 7 | 暗色 UI 上的浅色文字，保留 |
| `text-slate-50` | 3 | 暗色 UI 上的白色文字 |

**背景色（~163 次）**

| 类名 | 次数 | 典型映射 |
|------|------|---------|
| `bg-slate-50` | 102 | `bg-muted` |
| `bg-slate-100` | 20 | `bg-secondary` |
| `bg-slate-900` | 14 | 暗色 UI 专用，保留或映射 `bg-primary` |
| `bg-slate-950` | 13 | 暗色 UI 专用，保留 |
| `bg-slate-200` | 3 | `bg-secondary` |
| `bg-slate-800` | 7 | 暗色 UI 专用，保留 |
| `bg-slate-700` | 2 | 暗色 UI 专用，保留 |
| `bg-white` | 多处 | `bg-card` 或 `bg-background` |

**边框色（~226 次）**

| 类名 | 次数 | 典型映射 |
|------|------|---------|
| `border-slate-200` | 128 | `border-border`（已全局 @apply） |
| `border-slate-300` | 42 | `border-border` |
| `border-slate-400` | 34 | `border-ring`（focus 态） |
| `border-slate-950` | 7 | 暗色 UI 专用，保留 |
| `border-slate-800` | 7 | 暗色 UI 专用，保留 |
| `border-slate-600` | 4 | 暗色 UI 专用，保留 |
| `border-slate-900` | 3 | 暗色 UI 专用，保留 |

### 6.2 amber（282 次，~25 文件）

| 类名 | 次数 | 语义 |
|------|------|------|
| `bg-amber-50` | 76 | 警告/待确认底色 |
| `border-amber-200` | 48 | 警告边框 |
| `text-amber-900` | 36 | 警告文字 |
| `border-amber-300` | 27 | 警告强调边框 |
| `text-amber-800` | 21 | 警告文字 |
| `text-amber-700` | 19 | 警告文字 |
| `bg-amber-500` | 13 | 警告指示点/进度条 |
| `text-amber-950` | 6 | 警告文字 |
| `text-amber-600` | 6 | 警告链接/次要文字 |
| `bg-amber-100` | 5 | 警告标签底色 |
| `border-amber-500` | 9 | 警告强调边框 |
| `border-amber-400` | 2 | 警告边框 |
| `border-amber-300` | 27 | 警告边框 |
| `bg-amber-300` | 3 | DesktopBootstrap 专用 |
| `text-amber-400` | 2 | 暗色模式警告文字 |

### 6.3 emerald（105 次，~30 文件）

| 类名 | 次数 | 语义 |
|------|------|------|
| `bg-emerald-50` | 25 | 成功/完成底色 |
| `border-emerald-200` | 17 | 成功边框 |
| `text-emerald-700` | 10 | 成功文字 |
| `bg-emerald-500` | 9 | 成功指示点 |
| `border-emerald-500` | 7 | 成功强调边框 |
| `text-emerald-900` | 5 | 成功深色文字 |
| `text-emerald-800` | 4 | 成功文字 |
| `bg-emerald-600` | 4 | 成功按钮 |
| `bg-emerald-100` | 4 | 成功标签底色 |
| `border-emerald-300` | 4 | 成功边框 |
| `text-emerald-950` | 3 | 成功最深文字 |
| `text-emerald-600` | 3 | 成功次要文字 |
| `ring-emerald-500` | 2 | 成功焦点环 |
| `border-emerald-600` | 2 | 成功边框 |

### 6.4 red（48 次，~18 文件）

| 类名 | 次数 | 语义 |
|------|------|------|
| `text-red-600` | 8 | 错误文字 |
| `bg-red-50` | 11 | 错误底色 |
| `border-red-200` | 9 | 错误边框 |
| `bg-red-500` | 4 | 错误指示点 |
| `text-red-800` | 4 | 错误深色文字 |
| `bg-red-100` | 4 | 错误标签 |
| `text-red-700` | 3 | 错误文字 |
| `border-red-400` | 2 | 错误边框 |
| `border-red-300` | 2 | 错误边框 |

### 6.5 yellow（22 次，5 文件）

| 类名 | 次数 | 语义 | 文件 |
|------|------|------|------|
| `bg-yellow-100` | 4 | Feedback 中级标签 | FeedbackDetail, FeedbackList |
| `text-yellow-950` | 3 | 自动导演跟进详情文字 | AutoDirectorFollowUpDetail |
| `border-yellow-300` | 1 | 自动导演跟进边框 | AutoDirectorFollowUpDetail |
| `border-yellow-400` | 1 | 自动导演跟进边框 | AutoDirectorFollowUpDetail |
| `bg-yellow-50` | 2 | 跟进底色 | AutoDirectorFollowUpDetail |
| `text-yellow-800` | 2 | Feedback 中级标签 | FeedbackDetail, FeedbackList |
| `text-yellow-700` | 2 | 开发工具标题 | NovelEditView |
| `border-yellow-500` | 2 | 开发工具边框 | NovelEditView |

### 6.6 其他低频色板

| 色板 | 次数 | 文件 | 用途 |
|------|------|------|------|
| `blue` | 13 | RuntimeSidebar, RunTracker, FeedbackDetail/List, PromptSlotPanel, PaceCurveChart, CharacterExitBadge | 信息/进行中状态 |
| `orange` | 12 | AITakeoverContainer, CreativeHubSidebar, FeedbackDetail/List, titleStudio.shared | 高优先级/重要 |
| `cyan` | 7 | DesktopBootstrapShell | 品牌色/CTA 按钮 |
| `indigo` | 5 | AICockpit, CreativeHubToolResultCard, PaceCurveChart | 特殊状态指示 |
| `green` | 4 | CharacterExitBadge（活跃）, CreativeHubRunTracker, ImportFromFileDialog | 活跃/成功 |
| `gray` | 2 | CharacterExitBadge（已退场） | 禁用/退场 |

---

## 7. 分批执行计划

### 前置工作：新增缺失语义 Token

**在 `index.css` 和 `tailwind.config.ts` 中新增：**

```css
:root {
  /* 现有 token 保持不变 */
  --success: 152 69% 52%;        /* emerald-500 */
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%;         /* amber-500 */
  --warning-foreground: 20 80% 10%;
  --info: 217 91% 60%;           /* blue-500 */
  --info-foreground: 0 0% 100%;
}
.dark {
  --success: 152 69% 42%;
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 40%;
  --warning-foreground: 38 92% 90%;
  --info: 217 91% 50%;
  --info-foreground: 0 0% 100%;
}
```

### 批次划分原则

- **批次 1-2**（低风险、高收益）：纯 slate 族替换，改动量大但模式简单
- **批次 3**（中风险）：amber/warning 族替换（需新增 token）
- **批次 4**（中风险）：emerald/success 和 red/destructive 族替换
- **批次 5**（低风险、低优先级）：剩余小众色板
- **每个批次完成后**：`pnpm typecheck` + `pnpm dev` 视觉验证

### 详细分批

#### 批次 1：creativeHub 系列（~15 文件，~250 处）

**优先原因**：文件集中，模式统一，改动效率最高

| 文件 | 处数 | 主要替换 |
|------|------|---------|
| `CreativeHubSidebar.tsx` | 60 | slate → muted/foreground/border |
| `CreativeHubToolResultCard.tsx` | 35 | slate → muted/foreground |
| `CreativeHubNovelSetupCard.tsx` | 17 | slate → muted/foreground, emerald → success |
| `NovelProductionStarterCard.tsx` | 15 | slate → muted/foreground/border |
| `CreativeHubTurnSummaryCard.tsx` | 15 | slate → muted/foreground/border |
| `CreativeHubInlineToolCall.tsx` | 15 | slate → muted/foreground, amber → warning |
| `CreativeHubMessagePrimitives.tsx` | 13 | slate → muted/foreground, amber → warning |
| `CreativeHubDebugTraceCard.tsx` | 10 | slate → muted/foreground |
| `CreativeHubThreadList.tsx` | 6 | slate → foreground/border, red → destructive |
| `CreativeHubActivityFeed.tsx` | 6 | slate → muted/foreground |
| `CreativeHubConversation.tsx` | 7 | slate → muted/foreground/border |
| `CreativeHubRunTracker.tsx` | 3 | blue → info, green → success, red → destructive |

#### 批次 2：chat + workflow 系列（~5 文件，~100 处）

| 文件 | 处数 | 主要替换 |
|------|------|---------|
| `RuntimeSidebar.tsx` | 65 | slate → muted/foreground/border, amber → warning, red → destructive, blue → info |
| `AssistantChatPanel.tsx` | 19 | slate → muted/foreground/border, amber → warning |
| `AITakeoverContainer.tsx` | 6 | slate → muted, amber → warning, orange → 保留 |
| `WorkflowProgressBar.tsx` | 3 | slate → muted, amber → warning |
| `ChatPage.tsx` | 3 | slate → muted/foreground, red → destructive |

#### 批次 3：writingFormula 系列（~8 文件，~180 处）

| 文件 | 处数 | 主要替换 |
|------|------|---------|
| `WritingFormulaEditorPanel.tsx` | 49 | slate → muted/foreground/border |
| `WritingFormulaLanding.tsx` | 40 | slate → muted/foreground/border |
| `WritingFormulaCreateDialog.tsx` | 34 | slate → muted/foreground/border |
| `WritingFormulaCleanFlow.tsx` | 20 | slate → muted/foreground/border |
| `WritingFormulaWorkbenchPanel.tsx` | 16 | slate → muted/foreground/border |
| `WritingFormulaCleanPanel.tsx` | 15 | slate → muted/foreground/border |
| `WritingFormulaImitateFlow.tsx` | 12 | slate → muted/foreground/border |
| `WritingFormulaBookStyleFlow.tsx` | 8 | slate → muted/foreground/border |
| `WritingFormulaPage.tsx` | 6 | slate → muted/foreground |

#### 批次 4：novels/components 系列（~15 文件，~120 处）

| 文件 | 处数 | 主要替换 |
|------|------|---------|
| `NovelCoverDialog.tsx` | 39 | slate → muted/foreground |
| `NovelStyleRecommendationCard.tsx` | 14 | slate → muted/foreground |
| `ChapterTextEditor.tsx` | 7 | emerald → success, amber → warning |
| `ChapterEditorDirectorPanel.tsx` | 2 | emerald → success, amber → warning |
| `ChapterEditorSidebar.tsx` | 2 | emerald → success |
| `BookPayoffLedgerCard.tsx` | 3 | emerald → success, amber → warning, slate → muted |
| `PayoffLedgerPanel.tsx` | 10 | red → destructive, slate → muted |
| `ChapterExecutionQueueCard.tsx` | 1 | amber → warning |
| `ChapterExecutionResultPanel.tsx` | 2 | amber → warning |
| `ChapterExecutionStatusFlow.tsx` | 少量 | emerald → success |
| `TimelinePanel.tsx` | 2 | red → destructive, emerald → success |
| `PipelineTab.tsx` | 2 | red → destructive |
| `WordCountIndicator.tsx` | 11 | red → destructive, emerald → success |
| `SettingConsistencyPanel.tsx` | 少量 | amber → warning, emerald → success |
| `NovelEditView.tsx` | 3 | yellow → 保留（开发工具） |
| `NovelTaskDrawer.tsx` | 1 | amber → warning |

#### 批次 5：其余散落文件（~15 文件，~80 处）

| 文件 | 处数 | 主要替换 |
|------|------|---------|
| `CharacterImageDialog.tsx` | 29 | slate → muted/foreground/border |
| `PromptSlotPanel.tsx` | 17 | slate → muted/foreground, red → destructive, blue → info |
| `BasicInfoFormPrimitives.tsx` | 1 | emerald → success |
| `CharacterCastOptionsSection.tsx` | 少量 | emerald → success |
| `NovelAutoDirectorProgressPanel.tsx` | 少量 | amber → warning |
| `NovelAutoDirectorSetupPanel.tsx` | 少量 | emerald → success |
| `NovelCreateResourceRecommendationCard.tsx` | 少量 | emerald → success |
| `OutlineStrategyReadiness.tsx` | 少量 | emerald → success |
| `WorldInjectionHint.tsx` | 少量 | emerald → success |
| `ProviderStatusCard.tsx` | 少量 | emerald → success |
| `SettingsReadinessCard.tsx` | 少量 | emerald → success |
| `ModelRoutesPage.tsx` | 1 | red → destructive |
| `FeedbackDetail.tsx` | 4 | blue/yellow/orange/red → 保留（严重度标签） |
| `FeedbackList.tsx` | 4 | blue/yellow/orange/red → 保留（严重度标签） |
| `HelpPage.tsx` | 3 | amber → warning, emerald → 保留 |

### 批次 6：保留项（不替换）

以下文件中的原始色板**有意保留**，不纳入迁移范围：

| 文件 | 原因 |
|------|------|
| `DesktopBootstrapShell.tsx`（33 处） | 独立深色 UI 壳，有完整视觉体系 |
| `DesktopModelSetupGate.tsx`（2 处） | 同上 |
| `DesktopUpdateCard.tsx`（1 处） | 同上 |
| `NovelWorkspaceRail.tsx`（5 处） | 深色侧边栏专用色 |
| `CharacterExitBadge.tsx`（3 处） | 状态标签需独立色阶 |
| `FeedbackDetail.tsx` / `FeedbackList.tsx`（各 4 处） | 严重度等级需色阶区分 |
| `AICockpit.tsx`（3 处） | 仪表盘专用色阶 |
| `PaceCurveChart.tsx`（2 处） | 图表专用色 |
| `titleStudio.shared.ts`（1 处） | 品牌色 |
| `CreativeHubRunTracker.tsx` 中的 `bg-blue-500`/`bg-green-500`/`bg-red-500` 圆点 | 进度指示灯专用 |

---

## 8. 预估工作量

| 维度 | 数值 |
|------|------|
| 需处理文件数 | ~75（排除保留项后） |
| 需替换原始色板类数 | ~1,200+（slate 为主） |
| 需新增 CSS 变量 | 6 个（success, warning, info 各 foreground） |
| 需修改 tailwind.config.ts | 新增 3 个颜色映射 |
| 预估批次执行时间 | 6 批，每批 20-40 分钟 |
| 总预估工时 | 3-5 小时（含验证） |

### ROI 分析

**收益**：
1. 暗色模式一键适配（~10 处显式 dark: 变为全局自动）
2. 主题切换能力（更换 `:root` 变量即可换肤）
3. 代码一致性（开发者不需要记"这个场景用什么灰色"）
4. 减少 ~1,200 处硬编码色值

**风险**：
1. 颜色值不完全一致（如 `text-slate-500` = `hsl(215 16.3% 46.9%)` vs 语义 token 可能略有差异）
2. 渐变、opacity 变体需手动保留原始色
3. 暗色 UI 壳（DesktopBootstrap）不应迁移

---

## 9. 建议执行顺序

1. **新增 success/warning/info 语义 token**（index.css + tailwind.config.ts）
2. **批次 1**：creativeHub 系列（验证 token 体系可用）
3. **批次 2**：chat + workflow（验证跨模块一致性）
4. **批次 3**：writingFormula 系列（纯 slate 替换，量大但简单）
5. **批次 4**：novels/components（混合色板，需谨慎）
6. **批次 5**：散落文件
7. **全局验证**：`pnpm typecheck` + `pnpm dev` + 暗色模式视觉检查
