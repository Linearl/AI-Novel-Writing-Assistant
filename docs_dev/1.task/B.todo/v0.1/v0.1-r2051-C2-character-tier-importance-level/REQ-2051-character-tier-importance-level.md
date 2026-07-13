---
description: "REQ-2051 角色重要度分级（CharacterTier）功能需求规格"
req_id: "2051"
title: "角色重要度分级（CharacterTier）"
version: "0.1"
status: "approved"
created: "2026-07-13"
---

# REQ-2051 角色重要度分级（CharacterTier）

## 1. 目标

为角色模块引入"重要度"维度（`characterTier`），使系统能区分不同戏份等级的角色，并据此决定 profile 自动生成深度、上下文传递详略程度和 UI 分组筛选方式。

## 2. 背景与动机

当前角色模块仅有 `castRole`（叙事功能）维度，缺少"戏份重要度"维度。导致：
- 3-6 人的阵容无法容纳"需要详细设定但无结构功能"的有名角色
- AI 生成阵容时统一对所有成员要求全量 profile，浪费 token
- 前端角色列表只有"主角/配角"粗分，角色多时难以筛选浏览

## 3. 范围

### 3.1 在范围内

| 层 | 改动 |
|----|------|
| DB | Character 模型新增 `tier` 字段（Prisma enum `CharacterTier`，默认 `"named"`） |
| Shared Types | `Character`、`CharacterCastOptionMember`、`SupplementalCharacterCandidate` 新增 `tier` 字段 |
| Prompt | 阵容生成 prompt 新增 tier 指令；Zod schema 加 tier；上下文组装传递 tier |
| Service | `characterCastGeneration`、`characterCastApply`、`characterCastQuality`、`characterPreparationSupplemental` 适配 tier |
| 前端 - 选择器 | 角色编辑区、快速创建弹窗新增 tier 下拉选择器 |
| 前端 - 侧边栏 | `CharacterAssetSidebar` 按 tier 分组显示（lead / major / named / extra） |
| 前端 - 筛选 | 角色阵容页面支持按 tier 筛选（多选过滤器） |
| 前端 - 展示 | `CharacterFocusSummary` 显示 tier 徽章；`CharacterCastOptionsSection` 显示成员 tier |
| 前端 - 补充角色 | `CharacterSupplementalDialog` 支持选择目标 tier |
| 下游 | 章节生成上下文按 tier 决定 profile 详略度 |

### 3.2 不在范围内

- `castRole` 枚举值不变（正交维度）
- BaseCharacter（角色库级别）暂不加 tier（库级角色无戏份概念）
- 角色动态系统（Character Dynamics）的 `isCore` 字段暂不联动（后续迭代）
- 已有角色数据迁移（默认 `"named"` 即可）

## 4. 角色重要度等级定义

| tier | 中文 | 定义 | 系统行为 |
|------|------|------|---------|
| `lead` | 主角 | 故事第一视角，弧线贯穿全书 | 自动生成完整 profile（hard facts + arc 全阶段） |
| `major` | 重要配角 | 有独立弧线/转变，对主线有实质影响 | 自动生成完整 profile（同 lead） |
| `named` | 有名角色 | 多次出场、需要一致性，但不一定有独立弧线 | 自动生成基础 profile（personality + background + appearance） |
| `extra` | 次要角色 | 出场少，可有名可无名，基本功能交代即可 | 最小 profile（name + role + 一句话描述） |

## 5. EARS 验收条目

### 5.1 数据层

- **EARS-1**：`tier` 字段存入 Character 表，类型为 enum，允许值为 `lead | major | named | extra`，默认值为 `named`
- **EARS-2**：新创建的角色若未指定 tier，自动使用 `named` 默认值
- **EARS-3**：`CharacterCastOptionMember` 和 `SupplementalCharacterCandidate` 类型包含 `tier` 字段

### 5.2 Prompt 层

- **EARS-4**：阵容生成 prompt 要求 LLM 为每个成员标注 `tier`，且每套方案恰好包含 1 个 `lead`
- **EARS-5**：`extra` 角色在 prompt 输出中只需 name + role + storyFunction + 一句话描述，不必全量 profile
- **EARS-6**：补充角色生成 prompt 支持指定目标 tier

### 5.3 Service 层

- **EARS-7**：`characterCastQuality` 新增校验：每套阵容有且仅有 1 个 `lead`
- **EARS-8**：`characterCastApply` 将 tier 写入数据库
- **EARS-9**：`characterPreparationSupplemental` 透传 tier 到生成结果

### 5.4 前端 UI

- **EARS-10**：角色编辑区（`CharacterAssetWorkspace`）显示 tier 下拉选择器，选项为 lead / major / named / extra
- **EARS-11**：快速创建弹窗（`CharacterQuickCreateDialog`）包含 tier 选择器
- **EARS-12**：侧边栏（`CharacterAssetSidebar`）按 lead → major → named → extra 四组分组显示
- **EARS-13**：角色阵容页面支持按 tier 多选筛选（筛选器位于角色列表顶部）
- **EARS-14**：`CharacterFocusSummary` 头部卡片显示当前角色的 tier 徽章
- **EARS-15**：阵容方案成员卡（`CharacterCastOptionsSection`）显示每个成员的 tier 标签

### 5.5 下游集成

- **EARS-16**：章节生成上下文中，`extra` 角色只传递 name + role + 一句话描述；`named` 传递基础 profile；`lead` / `major` 传递完整 profile

## 6. 风险与未决项

| 编号 | 类型 | 描述 | 处理方式 |
|------|------|------|---------|
| R-1 | 风险 | `exitStatus` 等三个字段有 schema 无迁移，新 migration 需一并处理 | 本任务 migration 同时包含 exitStatus 迁移补丁 |
| R-2 | 风险 | `CharacterFormState` 在 3 个文件重复定义，改动需同步 | 统一修改三处，确保一致 |
| R-3 | 风险 | prompt 版本升级影响已有测试 | 升级 prompt 版本号，更新相关测试用例 |
| Q-1 | 未决 | 侧边栏筛选器是否支持"全部"切换 | 默认显示全部，筛选器为附加过滤 |
| Q-2 | 未决 | tier 变更是否触发角色动态重建 | 本期不触发，后续迭代考虑 |
