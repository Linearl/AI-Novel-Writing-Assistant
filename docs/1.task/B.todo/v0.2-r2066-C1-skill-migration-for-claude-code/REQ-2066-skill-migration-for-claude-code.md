---
description: "REQ-2066 需求文档 — Skill 版本迁移"
req_id: "REQ-2066"
title: "Skill 版本迁移 — 面向 Claude Code 的小说生产系统蒸馏"
version: "0.2"
status: "approved"
priority: "p1"
complexity: "C1"
created: "2026-07-29"
updated: "2026-07-29"
---

# REQ-2066 Skill 版本迁移 — 面向 Claude Code 的小说生产系统蒸馏

## 1. 背景

上游作者已将 AI-Novel-Writing-Assistant 项目停止维护，转为 Codex + Skill 模式（Ani Book Skill v0.3.1）。我们当前项目基于 v0.32 大量增强，需要评估并实施类似的 Skill 版本迁移。

## 2. 目标

将当前项目的核心写作能力蒸馏为 Claude Code Skill，使其可以在 Claude Code 环境下直接使用，无需启动完整的 Web 应用。

### 2.1 核心目标

1. **创建 Skill 骨架**：SKILL.md + references + scripts
2. **蒸馏核心写作流程**：从灵感到章节的完整链路
3. **保持 Auto-Director 优势**：将自动导演能力显式化
4. **支持 Claude Code 原生交互**：适配 Claude Code 的对话模式

### 2.2 非目标

1. 不迁移 GUI 组件（React、CSS、图片）
2. 不迁移数据库操作（Prisma、PostgreSQL/SQLite）
3. 不迁移认证系统（auth）
4. 不迁移 RAG 知识库（Qdrant）
5. 不迁移漫画/短剧工坊

## 3. 范围

### 3.1 必须蒸馏（核心写作流程）

| 模块 | 来源 | 说明 |
|------|------|------|
| 小说创建流程 | `novelBrief` + `storyMacro` | 从灵感到书级设定 |
| 角色准备 | `characterPrep` | 角色阵容、动态、资源 |
| 卷级规划 | `volume` | 卷战略、骨架、节奏板 |
| 章节生产 | `chapterProduction` | 计划、正文、审核、修复 |
| 连续性管理 | `continuity` | 事实、伏笔、资源回灌 |
| 质量检查 | `quality` | 审核、修复、债务管理 |

### 3.2 可选蒸馏（增强能力）

| 模块 | 来源 | 说明 |
|------|------|------|
| 拆书分析 | `bookAnalysis` | 参考作品分析 |
| 写法资产 | `writingTechnique` + `writingFormula` | 写法特征提取与复用 |
| Token 用量 | `tokenUsage` | 成本追踪 |
| TXT 导入导出 | `txtIo` | 资产迁移 |

## 4. EARS 验收条目

### 4.1 核心功能

- **WHEN** 用户在 Claude Code 中激活 Skill **THEN** 系统应能识别并加载 Skill
- **WHEN** 用户输入一句灵感 **THEN** 系统应能执行渐进式确认并生成 novel-brief.md
- **WHEN** 用户确认方向 **THEN** 系统应能生成故事宏观规划、角色准备、卷战略
- **WHEN** 用户要求写章节 **THEN** 系统应能生成章节计划、正文、审核报告
- **WHEN** 章节完成 **THEN** 系统应能更新连续性状态（事实、伏笔、资源）

### 4.2 Auto-Director 能力

- **WHEN** 用户说"继续写" **THEN** 系统应能读取状态并从上次中断处继续
- **WHEN** 遇到质量问题 **THEN** 系统应能执行修复并记录质量债务
- **WHEN** 发现阻塞性问题 **THEN** 系统应能暂停并等待用户决策

### 4.3 输出格式

- **GIVEN** 工作区模式 **WHEN** 生成文件 **THEN** 输出 Markdown/YAML 格式
- **GIVEN** 预览模式 **WHEN** 用户请求 **THEN** 返回对话中的 bounded artifact

## 5. 风险与未决项

| 风险/未决项 | 影响 | 缓解措施 |
|-------------|------|----------|
| Skill 文件结构设计 | 需要重新组织核心能力 | 参考上游 Skill 结构 |
| Python 脚本迁移 | 需要从 TypeScript 翻译 | 保持接口一致 |
| Auto-Director Skill 化 | 决策逻辑需要显式化 | 分阶段蒸馏 |
| 测试验证 | 需要真实创作验证 | 用示例小说测试 |

## 6. 复杂度评估

- **类型**：核心功能开发（2xxx）
- **复杂度**：C1（高复杂度 + 高优先级）
- **预估工期**：3-4 周（分 3 个阶段）
