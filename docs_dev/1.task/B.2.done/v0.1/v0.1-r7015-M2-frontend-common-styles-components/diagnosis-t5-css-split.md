---
description: "index.css 移动端媒体查询拆分深度诊断 — 结构分析、重复检测、拆分方案与风险评估"
---

# index.css 移动端媒体查询拆分诊断

## 1. 文件结构地图

**文件路径**：`client/src/index.css`  
**总行数**：727 行  
**唯一 CSS 文件**：整个 `client/src/` 目录下仅有此一个 CSS 文件，由 `main.tsx` 直接 import。

### 段落划分

| 段落 | 行范围 | 行数 | 占比 | 说明 |
|------|--------|------|------|------|
| Tailwind 指令 | 1-3 | 3 | 0.4% | `@tailwind base/components/utilities` |
| CSS 变量 - Light 主题 | 5-26 | 22 | 3.0% | `:root` HSL 色彩系统 |
| CSS 变量 - Dark 主题 | 28-48 | 21 | 2.9% | `.dark` 覆盖 |
| 全局 reset | 50-52 | 3 | 0.4% | `* { @apply border-border }` |
| Body 样式 | 54-57 | 4 | 0.5% | 字体、背景、抗锯齿 |
| @layer utilities | 59-110 | 52 | 7.2% | 移动端工具类（定义区，非媒体查询） |
| **@media (max-width: 767px)** | **112-726** | **615** | **84.6%** | **唯一的媒体查询块，包含所有移动端覆盖** |

**核心问题**：单一 `@media` 块占文件 84.6%，包含 24 个路由类名的样式覆盖 + 16 个通用组件级规则，没有任何内部组织结构。

---

## 2. 移动端媒体查询详细分析

### 2.1 规则组清单（按行范围）

整个 `@media (max-width: 767px)` 块可划分为以下逻辑段落：

| # | 行范围 | 约行数 | 规则组描述 | 选择器前缀 |
|---|--------|--------|------------|------------|
| A | 113-140 | 28 | 通用布局工具：`.mobile-site-main > div`、`mobile-card-flat`、`mobile-stack`、`mobile-full-actions` | `.mobile-site-main` |
| B | 141-247 | 107 | **网格/宽度/高度/flex/圆角覆盖** — 针对 `mobile-site-main`、`mobile-page-novel-edit`、`mobile-page-chapter-edit` 三个容器的 Tailwind class 属性选择器覆盖 | `[class*="sm:grid-cols"]` 等 |
| C | 248-278 | 31 | 表单输入 `font-size: 16px`、tab 滚动、dialog 通用尺寸 | `.mobile-site-main button/input/textarea/select` |
| D | 280-306 | 27 | **路由 overflow-x: hidden 声明** — 25 个路由类名全部列出（重复块 1） | `.mobile-route-*` |
| E | 308-337 | 30 | **路由 width/max-width 声明** — 25 个路由类名 + 2 个 page 类名全部列出（重复块 2） | `.mobile-route-*` + `.mobile-page-*` |
| F | 339-353 | 15 | `mobile-page-novel-edit` 专属：`min-width: 0`、`overflow-x: hidden`；`mobile-novel-step-nav` 隐藏滚动条 | `.mobile-page-novel-edit` |
| G | 355-478 | 124 | **路由专属布局**：home 重排、home/tasks 状态网格、tasks 筛选器、home flex-wrap、novels/novel-create/worlds 等路由的布局覆盖 | `.mobile-route-home/tasks/novels/novel-create/worlds/...` |
| H | 480-513 | 34 | 多路由首 flex 子元素布局、网格重置 | `.mobile-route-novels/worlds/base-characters/style-engine/creative-hub/...` |
| I | 515-580 | 66 | creative-hub/chat-legacy/book-analysis/tasks/auto-director 的子元素排序、auto-director 部分网格和字号 | `.mobile-route-creative-hub/chat-legacy/...` |
| J | 582-602 | 21 | **深层嵌套 card-in-card 覆盖** — 17 个路由类名的 `.rounded-xl.border.bg-card .rounded-xl.border.bg-card` 去阴影/背景 | `.mobile-route-*` |
| K | 604-676 | 73 | 知识库/titles/world-workspace/style-engine 的 tablist；多路由网格重置；padding、flex justify 覆盖 | 多路由混合 |
| L | 677-726 | 50 | dialog 尺寸覆盖、`mobile-novel-workspace-panel` 嵌套 card 重置、`mobile-chapter-editor-shell` 子元素排序 | 多路由 + 组件级 |

### 2.2 选择器特异性分析

| 特异性等级 | 代表选择器 | 数量估计 |
|------------|-----------|---------|
| 低（1-2 个类） | `.mobile-route-home { overflow-x: hidden }` | ~15 |
| 中（2-3 个类） | `.mobile-route-home .home-status-summary-grid .p-6` | ~20 |
| 高（4-5 个类） | `.mobile-route-home .flex.flex-wrap.items-center.justify-between > *` | ~12 |
| **极高（嵌套 5+ 层）** | `.mobile-site-main .rounded-xl.border.bg-card .rounded-xl.border.bg-card .rounded-xl.border.bg-card > div` (L242-243) | ~8 |
| **属性选择器组合** | `.mobile-site-main .grid[class*="sm:grid-cols"]` (L141-153) | ~6 组 |

最深嵌套出现在 **B 段**（L233-246）：`.mobile-site-main` 内三层 `.rounded-xl.border.bg-card` 嵌套，以及 **J 段**（L582-602）：17 个路由前缀 x `.rounded-xl.border.bg-card .rounded-xl.border.bg-card`。这些选择器的特异性极高，极难被后续样式覆盖。

---

## 3. 路由类名统计

### 3.1 完整出现频次排行

| 排名 | 路由类名 | 出现次数 | 对应路由/页面 |
|------|----------|----------|-------------|
| 1 | `mobile-route-home` | 27 | 首页 |
| 2 | `mobile-route-tasks` | 19 | 任务管理 |
| 3 | `mobile-page-novel-edit` | 19 | 小说编辑（页面级容器） |
| 4 | `mobile-page-chapter-edit` | 17 | 章节编辑（页面级容器） |
| 5 | `mobile-route-auto-director-follow-ups` | 15 | 自动导演跟进 |
| 6 | `mobile-route-style-engine` | 13 | 风格引擎 |
| 7 | `mobile-route-novels` | 12 | 小说列表 |
| 8 | `mobile-route-knowledge` | 11 | 知识库 |
| 9 | `mobile-route-model-routes` | 10 | 模型路由 |
| 10 | `mobile-route-settings` | 10 | 设置 |
| 11 | `mobile-route-world-workspace` | 10 | 世界工作区 |
| 12 | `mobile-route-base-characters` | 9 | 基础角色 |
| 13 | `mobile-route-creative-hub` | 8 | 创意中心 |
| 14 | `mobile-route-book-analysis` | 8 | 书本分析 |
| 15 | `mobile-route-genres` | 8 | 类型管理 |
| 16 | `mobile-route-world-generator` | 8 | 世界生成器 |
| 17 | `mobile-route-chat-legacy` | 7 | 旧版聊天 |
| 18 | `mobile-route-worlds` | 7 | 世界列表 |
| 19 | `mobile-route-story-modes` | 7 | 故事模式 |
| 20 | `mobile-route-titles` | 6 | 标题管理 |
| 21 | `mobile-route-novel-create` | 6 | 新建小说 |
| 22 | `mobile-route-novel-preview` | 1 | 小说预览（仅 overflow 声明） |
| 23 | `mobile-route-help` | 2 | 帮助 |
| 24 | `mobile-route-anti-ai-rules` | 3 | 反 AI 规则 |
| 25 | `mobile-route-prompt-workbench` | 3 | 提示词工作台 |

### 3.2 重复选择器清单

#### 重复块 1：`overflow-x: hidden`（L280-306）

25 个路由类名被逐一列出，全部声明 `overflow-x: hidden`。这是一个纯罗列式的重复块。

```css
/* L280-306 — 25 个选择器，每个仅 overflow-x: hidden */
.mobile-route-home, .mobile-route-help, .mobile-route-novels, ... {
  overflow-x: hidden;
}
```

#### 重复块 2：`width/max-width`（L308-337）

25 个路由类名 + 2 个 page 类名被逐一列出，全部声明 `width: 100%; max-width: 100%`。

```css
/* L308-337 — 27 个选择器，每个仅 width/max-width */
.mobile-route-home, .mobile-route-help, ..., .mobile-page-novel-edit, .mobile-page-chapter-edit {
  width: 100%;
  max-width: 100%;
}
```

#### 重复块 3：card-in-card 去阴影（L582-602）

17 个路由类名的 `.rounded-xl.border.bg-card .rounded-xl.border.bg-card` 全部声明相同的 3 个属性。

```css
/* L582-602 — 17 个选择器，每个相同属性值 */
.mobile-route-creative-hub .rounded-xl.border.bg-card .rounded-xl.border.bg-card,
.mobile-route-book-analysis .rounded-xl.border.bg-card .rounded-xl.border.bg-card,
... {
  border-color: hsl(var(--border) / 0.72);
  background: hsl(var(--muted) / 0.18);
  box-shadow: none;
}
```

#### 重复块 4：网格单列化（L620-641）

14 个路由 x 多个响应式网格断点选择器，全部声明 `grid-template-columns: minmax(0, 1fr)`。

#### 重复块 5：padding 覆盖（L643-652）

8 个路由的 `.rounded-xl > .p-6` 全部声明 `padding: 1rem`。

#### 重复块 6：flex justify-end 拉伸（L654-670）

6 个路由的 flex 容器全部改为 `justify-content: stretch` 并让子元素 `flex: 1 1 100%`。

### 3.3 重复块小结

| 重复块 | 涉及选择器数 | 重复次数 | 可消除行数估计 |
|--------|-------------|---------|--------------|
| overflow-x: hidden | 25 | 1 | ~25 行（保留选择器列表但可大幅精简） |
| width/max-width | 27 | 1 | ~28 行 |
| card-in-card 去阴影 | 17 | 1 | ~18 行 |
| 网格单列化 | 14 x 多断点 | 1 | ~20 行 |
| padding 覆盖 | 8 | 1 | ~8 行 |
| flex justify 拉伸 | 6 | 1 | ~14 行 |
| **合计可优化** | | | **~113 行** |

---

## 4. 拆分方案建议

### 4.1 推荐维度：功能分组 + 路由模块

纯按路由拆分会导致大量重复代码在各文件间散布；纯按功能拆分则难以维护路由特有样式。推荐 **两层结构**：

```
功能基础层（所有路由共享）+ 路由模块层（按路由或路由组拆分）
```

### 4.2 推荐文件结构

```
client/src/
├── index.css                        # 精简为入口，仅保留: Tailwind 指令 + CSS 变量 + @import
├── styles/
│   ├── base.css                     # 全局 reset + body 样式
│   ├── utilities.css                # @layer utilities 工具类定义
│   └── mobile/
│       ├── _shared.css              # 共享移动端基础规则（A/C/D/E 段：通用布局、表单、overflow、width）
│       ├── _card-overrides.css      # 卡片嵌套覆盖（B 段 tailwind class 覆盖 + J 段 card-in-card）
│       ├── home.css                 # .mobile-route-home 专属（~40 行）
│       ├── tasks.css                # .mobile-route-tasks 专属（~35 行）
│       ├── novels.css               # .mobile-route-novels + novel-create（~25 行）
│       ├── editors.css              # .mobile-page-novel-edit + chapter-edit + workspace + chapter-editor-shell（~45 行）
│       ├── creative-hub.css         # .mobile-route-creative-hub + chat-legacy + book-analysis（~30 行）
│       ├── auto-director.css        # .mobile-route-auto-director-follow-ups（~30 行）
│       ├── settings-models.css      # .mobile-route-settings + model-routes（~25 行）
│       ├── knowledge-titles.css     # .mobile-route-knowledge + titles（~20 行）
│       ├── worlds.css               # .mobile-route-worlds + world-generator + world-workspace（~30 行）
│       ├── style-engine.css         # .mobile-route-style-engine（~20 行）
│       └── misc.css                 # 剩余低频路由（genres/story-modes/base-characters/anti-ai-rules/prompt-workbench/help）（~30 行）
```

### 4.3 import 链设计

`index.css` 作为入口，通过 CSS `@import` 串联所有子文件：

```css
/* index.css — 精简后的入口 */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 设计令牌 */
@import "./styles/base.css";

/* 移动端样式 */
@import "./styles/mobile/_shared.css";
@import "./styles/mobile/_card-overrides.css";
@import "./styles/mobile/home.css";
@import "./styles/mobile/tasks.css";
@import "./styles/mobile/novels.css";
@import "./styles/mobile/editors.css";
@import "./styles/mobile/creative-hub.css";
@import "./styles/mobile/auto-director.css";
@import "./styles/mobile/settings-models.css";
@import "./styles/mobile/knowledge-titles.css";
@import "./styles/mobile/worlds.css";
@import "./styles/mobile/style-engine.css";
@import "./styles/mobile/misc.css";
```

> **关键注意**：`@tailwind` 指令必须在 `@import` 之前。Vite 的 PostCSS 处理会将 `@import` 内联，`@tailwind` 指令生成的样式在源码顺序上先于子文件中的 `@media` 块，确保层叠顺序正确。

### 4.4 Vite 对 CSS @import 的处理

- Vite 原生支持 CSS `@import`，在构建时自动内联到同一个 `<style>` 标签
- 开发模式下，修改任意子文件会触发 HMR，无需额外配置
- `@import` 路径相对于当前文件（使用 `./` 相对路径）
- **不需要**安装任何额外插件

### 4.5 各文件预估行数

| 文件 | 预估行数 | 占比 |
|------|---------|------|
| `index.css`（精简后入口） | ~30 | - |
| `styles/base.css` | ~55 | 包含 CSS 变量 + reset + body |
| `styles/utilities.css` | ~52 | @layer utilities 原样搬入 |
| `styles/mobile/_shared.css` | ~80 | A + C + D + E 段 |
| `styles/mobile/_card-overrides.css` | ~120 | B + J 段（嵌套最深） |
| `styles/mobile/home.css` | ~40 | home 专属 |
| `styles/mobile/tasks.css` | ~35 | tasks 专属 |
| `styles/mobile/novels.css` | ~25 | novels + novel-create |
| `styles/mobile/editors.css` | ~45 | novel-edit + chapter-edit 页面 |
| `styles/mobile/creative-hub.css` | ~30 | creative-hub + chat + book-analysis |
| `styles/mobile/auto-director.css` | ~30 | auto-director 专属 |
| `styles/mobile/settings-models.css` | ~25 | settings + model-routes |
| `styles/mobile/knowledge-titles.css` | ~20 | knowledge + titles |
| `styles/mobile/worlds.css` | ~30 | worlds 三件套 |
| `styles/mobile/style-engine.css` | ~20 | style-engine |
| `styles/mobile/misc.css` | ~30 | 其余低频路由 |
| **合计** | **~657** | 略低于原文件（减少重复选择器列表） |

---

## 5. 风险评估

### 5.1 移动端样式遗漏风险 — 中等

**风险描述**：拆分过程中如果选择器拆分边界判断错误，可能导致某些规则被遗漏。

**缓解措施**：
- 拆分前先建立 **选择器完整清单**（本诊断已提供）
- 拆分后运行视觉回归测试（至少对比 320px / 375px / 768px 三个断点的截图）
- 每个路由的 CSS 可与对应页面的 TSX 文件关联 review

### 5.2 选择器特异性变化风险 — 低

**风险描述**：CSS `@import` 仅改变文件组织，不改变选择器本身。层叠顺序由 `@import` 声明顺序决定，与原来单文件中从上到下的顺序一致。

**但需注意**：
- `_card-overrides.css`（B/J 段）中存在极深嵌套选择器（4-5 层），如果未来引入新的移动端样式文件，可能因加载顺序导致覆盖失败
- 建议在 `_card-overrides.css` 中加注释标明这是 "高特异性覆盖层"，不得在其后引入普通选择器覆盖

### 5.3 构建产物大小影响 — 可忽略

**风险描述**：CSS 文件拆分后，Vite 会将所有 `@import` 内联为单个 CSS bundle，最终构建产物大小与拆分前完全一致。

- 不会产生额外 HTTP 请求（单 bundle 策略不变）
- 不影响 CSS tree-shaking（Tailwind purge 不受影响）
- 拆分仅影响源码组织，不影响运行时

### 5.4 其他风险

| 风险 | 等级 | 说明 |
|------|------|------|
| `@tailwind` 指令顺序 | 低 | 只要保持在 `@import` 之前，无影响 |
| CSS `@import` 性能 | 低 | Vite 内联处理，无网络开销；仅开发模式下 HMR 可能略慢（文件数增多） |
| Tailwind class 属性选择器 | 无变化 | `[class*="sm:grid-cols"]` 等选择器在拆分前后行为一致 |
| 后续新增路由移动端样式 | 低 | 拆分后需要知道放哪个文件；建议在 `_shared.css` 顶部加路由索引注释 |

---

## 6. 预估工作量

| 阶段 | 工作内容 | 预估时间 |
|------|---------|---------|
| 准备 | 建立选择器清单、确认路由映射 | 15 min |
| 拆分执行 | 创建 `styles/` 目录结构，按段落搬移代码 | 45 min |
| 去重优化 | 消除重复选择器列表（D/E/J/K 段合并） | 30 min |
| 验证 | 类型检查 + 构建 + 截图对比 | 30 min |
| **合计** | | **~2 小时** |

### 拆分执行策略建议

1. **先创建空文件骨架**，确认 `@import` 链能正常构建
2. **逐段搬移**，每搬一段验证一次构建，不要一次性搬完
3. **最后做去重优化**，在所有选择器正确拆分后再合并重复列表
4. **拆分前截图基线**：320px / 375px / 768px 三个宽度的首页、小说编辑、章节编辑页面截图
