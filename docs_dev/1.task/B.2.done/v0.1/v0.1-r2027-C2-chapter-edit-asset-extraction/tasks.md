---
description: "REQ-2027 任务分解 - 章节编辑器编辑后资产沉淀"
---

# REQ-2027 任务分解

## 阶段 0：需求与设计

- [x] T0.1 需求文档完成（REQ-2027.md）
- [x] T0.2 设计文档完成（design.md）
- [x] T0.3 决策日志完成（decision_log.md）

## 阶段 1：共享类型

- [ ] T1.1 在 `shared/types/styleEngine.ts` 中新增 `ChapterEditDiffExtractRequest`、`ChapterEditAntiAiExtractResult`、`ChapterEditStyleForkResult` 类型
- [ ] T1.2 构建 shared 包验证类型无误

## 阶段 2：Prompt 注册

- [ ] T2.1 在 `server/src/prompting/prompts/style/style.prompts.ts` 中新增章节编辑 diff 分析 prompt（支持 anti_ai_extraction 和 style_fork 两种 mode）
- [ ] T2.2 Prompt 实现为 PromptAsset 并在 registry 注册

## 阶段 3：后端 API

- [ ] T3.1 实现 `POST /api/style-engine/extract-anti-ai-from-diff` 路由 + handler
  - 接收 diff 视图（修改前后完整章节内容）直接传给 LLM
  - 读取当前风格画像的已有反 AI 规则
  - 调用 prompt 提取新规则（含去重）
  - 返回 intentSummary + drafts
- [ ] T3.2 实现 `POST /api/style-engine/fork-style-from-diff` 路由 + handler
  - 接收 diff 视图直接传给 LLM
  - 读取当前绑定的风格画像
  - 计算版本号（查询同名前缀的最大版本）
  - 调用 prompt 生成规则 patch
  - 创建新 StyleProfile
  - 创建新 StyleBinding + 删除旧绑定
  - 返回 changeSummary + suggestedName + newProfile
- [ ] T3.3 在 `server/src/routes/styleEngine.ts` 注册新路由
- [ ] T3.4 单元测试：反 AI 提取（含去重场景）、风格 fork（含版本号递增、绑定切换）

## 阶段 4：前端 UI

- [ ] T4.1 `ChapterEditorShell.tsx`：新增 `preEditContent` 缓存状态（章节加载时初始化、saveMutation.onMutate 时缓存、切换章节时清除）
- [ ] T4.2 `ChapterEditorShell.tsx`：新增 `hasDiff` 判断逻辑和 `getDiffView()` 函数（保存前/保存后两种场景）
- [ ] T4.3 `ChapterEditorShell.tsx`：在主编辑区保存按钮附近新增"提取反 AI 规则"和"提取风格画像"两个按钮
- [ ] T4.4 `ChapterEditorShell.tsx`：新增两个 mutation（extractAntiAi / extractStyle）+ 弹窗状态管理
- [ ] T4.5 新建 `AntiAiExtractConfirmDialog.tsx`：展示意图摘要 + 规则列表（可编辑/启用禁用）+ 确认保存
- [ ] T4.6 新建 `StyleForkConfirmDialog.tsx`：展示变更摘要 + 可编辑画像名 + 规则 diff 对比 + 确认
- [ ] T4.7 在 `client/src/api/styleEngine.ts` 中新增两个 API 调用函数
- [ ] T4.8 弹窗确认后的保存逻辑：反 AI 规则批量创建 + 关联风格画像；风格画像名更新（如用户修改）

## 阶段 5：集成验证

- [ ] T5.1 类型检查通过（pnpm typecheck）
- [ ] T5.2 单元测试通过（pnpm test）
- [ ] T5.3 手动验证：编辑章节 → 保存前点击"提取反 AI 规则" → 弹窗展示 → 确认保存
- [ ] T5.4 手动验证：编辑章节 → 保存 → 保存后点击"提取反 AI 规则"（使用缓存的 preEditContent）→ 弹窗展示 → 确认保存
- [ ] T5.5 手动验证：编辑章节 → 保存 → 点击"提取风格画像" → 新画像创建 → 绑定切换 → 写法引擎页面可见新画像
- [ ] T5.6 手动验证：无修改时两个按钮禁用
- [ ] T5.7 手动验证：新风格画像命名符合规则且可编辑
- [ ] T5.8 手动验证：切换章节后 preEditContent 清除，按钮正确禁用
