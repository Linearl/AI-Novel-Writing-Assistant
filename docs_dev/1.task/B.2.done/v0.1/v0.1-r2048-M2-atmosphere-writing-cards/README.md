---
description: "REQ-2048 氛围写作卡片 — 任务总线"
---

# REQ-2048 氛围写作卡片

> 创建日期：2026-07-10
> 目标版本：0.1
> 状态：✅ 已完成（全部 8 个任务完成，17 张氛围卡已入库）

---

## 1. 任务概述

### 1.1 需求来源

现有文笔技法库覆盖了原子级别的修辞技法（冷笔触、涟漪句、蝶影句等）。在实际写作中，作者和 AI 需要更高一层参考——"我要写出潮湿感/窒息感/无力感，有哪些策略可用？"这种氛围级别的指导。从文笔素材账号 OCR 提取了约 15 篇情感氛围写法教程，需要结构化入库并融入审校修复流程。

### 1.2 核心内容

1. MD 文件数据层：15 篇氛围卡存储在 `server/src/data/atmosphereCards/`，frontmatter (YAML) + body (Markdown)
2. 数据库配置表：`AtmosphereCard` 表 + 配套 `AtmosphereCardService`
3. 加载模式：启动时加载前端 frontmatter 轻量数据 → LLM 匹配 → 注入修复 prompt
4. 审校流程集成：修复阶段挂载，按优先级注入（氛围 > 技法 > 风格引擎）
5. 前端 Tab：`/atmosphere-cards` 路由 + 侧边栏 + 卡片列表浏览 + 启停开关

### 1.3 前置条件

- 依赖 `FileToDbSyncService` 同步机制（已有 precedent：writingTechniques、antiAiRules）
- 依赖 `ChapterRepairStreamRuntime` 修复流程运行时（已有）
- 参考 `WritingTechniqueService` 模板

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2048-atmosphere-writing-cards.md` | 需求工作副本 | 否 |
| `REQ-2048-atmosphere-writing-cards-original.md` | 冻结副本 | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-07-10 | 🆕 需求就绪 | 创建任务包 |

---

## 4. 执行清单

- [ ] T1: Prisma Schema — 新增 AtmosphereCard 表 + 迁移
- [ ] T2: 氛围卡 MD 文件 — 从 OCR 素材提取、结构化、写入 15 个 MD 文件
- [ ] T3: AtmosphereCardService + FileToDbSyncService 集成
- [ ] T4: 修复 Prompt 生成器 — 氛围匹配 prompt + 注入逻辑
- [ ] T5: 后端 API — 氛围卡 CRUD + 启停路由
- [ ] T6: 前端路由 + 侧边栏 + Tab 页
- [ ] T7: 审校修复流程集成 — ChapterRepairStreamRuntime 挂载
- [ ] T8: Bootstrap 同步 + 端到端验证
