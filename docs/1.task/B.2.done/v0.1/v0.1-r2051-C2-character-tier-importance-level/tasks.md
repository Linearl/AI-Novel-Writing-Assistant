---
description: "REQ-2051 角色重要度分级任务分解"
---

# Tasks: 角色重要度分级（CharacterTier）

> REQ-2051 | 复杂度：C2（complex） | 预估工时：5-7 个 dev 循环
> status: done
> updated: 2026-07-14

---

## 阶段一：数据层

### T1.1 Prisma Schema + Migration
- **内容**：新增 `CharacterTier` enum（`lead | major | named | extra`），Character 模型加 `tier` 字段（默认 `named`）。同时补 `exitStatus` / `exitNote` / `exitChapterId` 迁移。
- **DoD**：`pnpm db:migrate` 成功，`pnpm db:studio` 可见 tier 列
- **验证**：`pnpm --filter @ai-novel/shared build` + `pnpm typecheck`

### T1.2 Shared Types 扩展
- **内容**：`shared/types/novelCharacter.ts` 新增 `CharacterTier` 类型，`Character`、`CharacterCastOptionMember`、`SupplementalCharacterCandidate` 接口加 `tier` 字段
- **DoD**：`pnpm --filter @ai-novel/shared build` 无错误
- **依赖**：T1.1

---

## 阶段二：Prompt 层

### T2.1 Prompt Schema 加 tier
- **内容**：`characterPreparation.promptSchemas.ts` 中成员 Zod schema 新增 `tier` 字段（enum validation，allow lead/major/named/extra）
- **DoD**：schema 编译通过，相关测试通过
- **依赖**：T1.2

### T2.2 阵容生成 Prompt 加 tier 指令
- **内容**：`characterPreparation.prompts.ts` 中所有 8 个 prompt 新增【重要度分级】指令块，要求标注 tier，限定 lead 有且仅有 1 个，extra 角色可省略部分字段
- **DoD**：prompt 版本号升级，手动测试生成阵容时 LLM 返回包含 tier 字段
- **依赖**：T2.1

### T2.3 上下文组装加 tier 信息
- **内容**：`characterPreparation.contextBlocks.ts` 中已有角色列表展示 tier 信息
- **DoD**：生成阵容时，LLM 能看到已有角色的 tier
- **依赖**：T1.2

---

## 阶段三：Service 层

### T3.1 characterCastQuality 加 tier 校验
- **内容**：新增 lead 数量校验（每套阵容有且仅有 1 个 lead）
- **DoD**：无 lead 或多 lead 的阵容方案被标记为质量问题
- **依赖**：T2.1

### T3.2 characterCastApply 写入 tier
- **内容**：应用阵容时将 member.tier 写入数据库
- **DoD**：应用阵容后，Character 表中 tier 字段有正确值
- **依赖**：T1.1, T2.1

### T3.3 Supplemental 透传 tier
- **内容**：`characterPreparationSupplemental.ts` 生成结果包含 tier，补充角色支持指定 targetTier
- **DoD**：补充角色创建后 tier 正确
- **依赖**：T2.1

---

## 阶段四：前端 UI

### T4.1 tier 辅助函数
- **内容**：`characterAssetWorkspace.helpers.ts` 新增 `getCharacterTierLabel()`、`getCharacterTierColor()`
- **DoD**：函数导出且类型正确
- **依赖**：T1.2

### T4.2 CharacterFormState 加 tier
- **内容**：`NovelCharacterPanel.tsx`、`CharacterAssetWorkspace.tsx`、`useNovelCharacterMutations.ts` 三处 `CharacterFormState` 新增 `tier` 字段
- **DoD**：`pnpm typecheck` 无新增错误
- **依赖**：T1.2

### T4.3 角色编辑区 tier 选择器
- **内容**：`CharacterAssetWorkspace.tsx` 中 gender 下拉后新增 tier 下拉选择器（lead / major / named / extra）
- **DoD**：选择器可见，切换 tier 后保存成功
- **依赖**：T4.2

### T4.4 快速创建弹窗加 tier
- **内容**：`CharacterQuickCreateDialog.tsx` 表单新增 tier 下拉
- **DoD**：创建角色时 tier 正确保存
- **依赖**：T4.2

### T4.5 侧边栏按 tier 分组
- **内容**：`CharacterAssetSidebar.tsx` 将角色按 lead → major → named → extra 四组显示，替代现有"主角/配角"分组
- **DoD**：侧边栏显示四个分组，每组有标题
- **依赖**：T1.2

### T4.6 侧边栏 tier 筛选器
- **内容**：`CharacterAssetSidebar.tsx` 顶部新增多选 chip 筛选器，支持按 tier 过滤显示角色
- **DoD**：点击 chip 可筛选/取消筛选，全部取消时显示全部角色
- **依赖**：T4.5

### T4.7 头部卡片 tier 徽章
- **内容**：`CharacterFocusSummary.tsx` 显示当前角色 tier 徽章（lead=蓝、major=绿、named=灰、extra=浅灰）
- **DoD**：徽章颜色正确，tier 变更后实时更新
- **依赖**：T4.1

### T4.8 阵容方案成员 tier 标签
- **内容**：`CharacterCastOptionsSection.tsx` 成员卡显示 tier 标签
- **DoD**：阵容方案中每个成员可见 tier 标签
- **依赖**：T4.1

### T4.9 补充角色目标 tier
- **内容**：`CharacterSupplementalDialog.tsx` 新增目标 tier 选择（含 auto 选项）
- **DoD**：选择目标 tier 后生成的补充角色 tier 正确
- **依赖**：T3.3

### T4.10 QuickCharacterCreatePayload 加 tier
- **内容**：`characterPanel.utils.ts` 和 `useNovelCharacterMutations.ts` 的 payload 加 tier 字段
- **DoD**：快速创建和 mutation 传递 tier 正确
- **依赖**：T1.2

---

## 阶段五：下游集成

### T5.1 章节上下文按 tier 详略
- **内容**：`chapterLayeredContextShared.ts` 按 tier 决定传递的角色 profile 详略度
- **DoD**：extra 角色只传 name + role + storyFunction；named 传基础 profile；lead/major 传完整 profile
- **依赖**：T1.2

---

## 阶段六：验证与收尾

### T6.1 类型检查与测试
- **内容**：`pnpm typecheck` + `pnpm test:all` 全部通过
- **DoD**：零新增错误，零回归失败
- **依赖**：全部阶段

### T6.2 E2E 手动验证
- **内容**：启动 `pnpm dev`，手动验证：
  1. 快速创建角色时选择不同 tier，保存后侧边栏正确分组
  2. 编辑角色 tier 后侧边栏实时更新
  3. 筛选器按 tier 过滤正常
  4. AI 生成阵容时返回 tier 字段
  5. 补充角色时指定 tier 正确
- **DoD**：5 个场景全部通过
- **依赖**：T6.1
