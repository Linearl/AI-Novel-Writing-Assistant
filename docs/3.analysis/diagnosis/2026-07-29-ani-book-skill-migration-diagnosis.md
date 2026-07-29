# Ani Book Skill 迁移可行性诊断报告

## 1. 分析摘要

**分析对象**: `temp/ani-book-skill-main.zip`（上游 Ani Book Skill v0.3.1）
**分析目的**: 评估我们当前项目（基于 `temp/AI-Novel-Writing-Assistant-main-v0.32` 修改）能否也做一个类似的 Skill 版本
**分析时间**: 2026-07-29

## 2. 背景理解

### 2.1 项目演进关系

```text
AI-Novel-Writing-Assistant (原项目)
    │
    ├── v0.32 版本 ──────────────► 我们当前项目（ai-novel）
    │                              基于 v0.32 大量增强
    │
    └── 最新版本 (2026-07-09) ───► 作者停止维护
                                   改为 Codex + Skill 模式
                                   └── Ani Book Skill v0.3.1
```

### 2.2 我们项目 vs v0.32 vs 上游 Skill

| 维度 | v0.32 | 我们项目 | 上游 Skill |
|------|-------|----------|------------|
| **架构** | Web 应用 | Web 应用（增强版） | Codex Skill |
| **运行时** | React + Express + Prisma | React + Express + Prisma | 无（依赖 Codex） |
| **数据存储** | PostgreSQL/SQLite | PostgreSQL/SQLite | Markdown/YAML + SQLite 索引 |
| **新增能力** | - | auth, backgroundTask, logging, mediation, txt-io, writingTechnique | 跨书图谱、共享 IP 治理 |

## 3. 上游 Skill 核心能力分析

### 3.1 Skill 架构

```text
Codex：理解故事、提出设定与关系、规划、写作、审校、判断
  ↓
Skill / 合同：定义每个阶段必须消费什么、交付什么、如何验收
  ↓
Python：校验状态与证据、保护冲突、构建可重建索引、导出
  ↓
Markdown / YAML：作者可编辑的唯一权威；SQLite / JSONL：可丢弃派生物
```

### 3.2 核心文件结构

```text
ani-book-skill-main/
├── SKILL.md                    # Skill 主入口（核心契约）
├── references/                 # 22 个参考文档（能力契约）
│   ├── artifact-contracts.md
│   ├── book-analysis.md
│   ├── chapter-production.md
│   ├── chinese-novel-humanization.md
│   ├── cross-book-asset-graph.md
│   ├── continuity-ledgers.md
│   ├── generation-contracts.md
│   ├── hot-genre-trends.md
│   ├── novel-brief.md
│   ├── opening-seeds.md
│   ├── structured-continuity-store.md
│   ├── token-usage.md
│   ├── workflow-routing.md
│   └── ... (共 22 个)
├── scripts/                    # 9 个 Python 脚本
│   ├── novelctl.py            # 小说状态控制
│   ├── asset_graph.py         # 跨书资产图谱
│   ├── continuity_store.py    # 连续性存储
│   ├── analysis_retrieval.py  # 分析检索
│   ├── trend_snapshot.py      # 趋势快照
│   ├── token_usage.py         # Token 用量
│   ├── export_novel_txt.py    # 导出 TXT
│   ├── check_continuity_workspace.py
│   └── sync_skill_mirror.py
├── agents/                     # Agent 定义
├── assets/                     # 资产模板
└── tests/                      # 测试
```

### 3.3 上游 Skill 的核心能力

| 能力层 | 实现方式 | 我们是否有类似能力 |
|--------|----------|-------------------|
| **从灵感到章节** | 渐进确认、故事发动机、卷/章计划、正文、修订与审校 | ✅ 有（Auto-Director） |
| **长篇连续性** | YAML 权威事实、SQLite 可重建索引 | ✅ 有（ConsistencyFact、NovelFactEntry） |
| **跨书知识图谱** | 可复用机制、共享角色/势力/道具 | ❌ 无（单书模式） |
| **共享 IP 治理** | fork/sync 复用、正史候选 | ❌ 无（单书模式） |
| **Token 用量追踪** | 追加式用量账本与按步骤汇总 | ✅ 有（LlmTokenUsage） |
| **拆书分析** | 分析参考作品、建立本地检索 | ✅ 有（BookAnalysis） |
| **热门题材趋势** | 分析公开榜单元数据、机会卡 | ❌ 无 |

## 4. 我们项目的核心能力

### 4.1 比 v0.32 增强的能力

| 能力 | 说明 | 能否蒸馏成 Skill |
|------|------|-----------------|
| **认证系统 (auth)** | 用户认证、权限管理 | ❌ 不适合（Skill 无用户概念） |
| **后台任务 (backgroundTask)** | 异步任务执行 | ⚠️ 部分可（Python 脚本替代） |
| **日志系统 (logging)** | 结构化日志 | ⚠️ 部分可（Python logging） |
| **调解服务 (mediation)** | 冲突调解 | ✅ 可蒸馏 |
| **TXT 导入导出 (txt-io)** | 资产导入导出 | ✅ 可蒸馏 |
| **文笔技法 (writingTechnique)** | 写法资产 | ✅ 可蒸馏 |

### 4.2 比上游 Skill 更强的能力

| 能力 | 我们的状态 | 上游 Skill 状态 |
|------|------------|-----------------|
| **Auto-Director 系统** | ✅ 完整实现（自动导演、恢复、检查点） | ⚠️ 部分实现（依赖 Codex） |
| **角色弧光可视化** | ✅ 有 | ❌ 无 |
| **节奏曲线可视化** | ✅ 有 | ❌ 无 |
| **风险管理系统** | ✅ 有 | ❌ 无 |
| **伏笔追踪** | ✅ 完整实现 | ⚠️ 基础实现 |
| **自适应字数控制** | ✅ 完整实现 | ❌ 无 |
| **知识库 RAG** | ✅ 有 | ❌ 无 |
| **风格引擎** | ✅ 有 | ❌ 无 |
| **Creative Hub** | ✅ 完整实现 | ❌ 无 |

### 4.3 上游 Skill 有但我们没有的能力

| 能力 | 说明 | 值得蒸馏吗 |
|------|------|-----------|
| **跨书知识图谱** | 跨书资产复用 | ⚠️ 暂不需要 |
| **共享 IP 治理** | 共享宇宙正史 | ⚠️ 暂不需要 |
| **无想法开书种子** | 五条创意种子 | ✅ 值得 |
| **热门题材趋势** | 榜单分析 | ⚠️ 可选 |

## 5. 能否做 Skill 版本？

### 5.1 结论：**可以，且有独特优势**

我们可以基于当前项目做 Skill 版本，而且我们的版本会比上游 Skill 更完整。

### 5.2 我们的独特优势

| 优势 | 说明 |
|------|------|
| **Auto-Director 核心** | 我们有完整的自动导演系统，包括恢复、检查点、质量门 |
| **可视化能力** | 角色弧光、节奏曲线等可视化可作为 Markdown 图表导出 |
| **更丰富的连续性管理** | 事实、伏笔、资源、角色动态的完整追踪 |
| **质量检查体系** | 比上游更完整的质量循环和债务管理 |
| **Token 用量深度追踪** | 按步骤、按模型的详细统计 |

### 5.3 蒸馏范围建议

#### 必须蒸馏（核心写作流程）

| 模块 | 来源 | 说明 |
|------|------|------|
| **小说创建流程** | `novelBrief` + `storyMacro` | 从灵感到书级设定 |
| **角色准备** | `characterPrep` | 角色阵容、动态、资源 |
| **卷级规划** | `volume` | 卷战略、骨架、节奏板 |
| **章节生产** | `chapterProduction` | 计划、正文、审核、修复 |
| **连续性管理** | `continuity` | 事实、伏笔、资源回灌 |
| **质量检查** | `quality` | 审核、修复、债务管理 |

#### 可选蒸馏（增强能力）

| 模块 | 来源 | 说明 |
|------|------|------|
| **拆书分析** | `bookAnalysis` | 参考作品分析 |
| **写法资产** | `writingTechnique` + `writingFormula` | 写法特征提取与复用 |
| **Token 用量** | `tokenUsage` | 成本追踪 |
| **TXT 导入导出** | `txtIo` | 资产迁移 |

#### 不蒸馏（依赖运行时）

| 模块 | 原因 |
|------|------|
| **认证系统** | Skill 无用户概念 |
| **GUI 组件** | Skill 无界面 |
| **数据库操作** | Skill 使用文件系统 |
| **RAG 知识库** | 依赖 Qdrant 向量数据库 |
| **漫画/短剧工坊** | 依赖图像生成 API |

## 6. Skill 版本架构设计

### 6.1 目标架构

```text
Claude（或 Codex）：理解故事、规划、写作、审校、判断
  ↓
Skill / 合同：定义每个阶段必须消费什么、交付什么、如何验收
  ↓
Python 脚本：校验状态、保护冲突、构建索引、导出
  ↓
Markdown / YAML：作者可编辑的唯一权威
```

### 6.2 文件结构设计

```text
ai-novel-skill/
├── SKILL.md                    # Skill 主入口
├── references/                 # 能力契约文档
│   ├── novel-brief.md         # 小说创建流程
│   ├── character-preparation.md # 角色准备
│   ├── story-and-volume-planning.md # 卷级规划
│   ├── chapter-production.md  # 章节生产
│   ├── continuity-management.md # 连续性管理
│   ├── quality-and-repair.md  # 质量检查
│   ├── book-analysis.md       # 拆书分析
│   ├── writing-techniques.md  # 写法资产
│   ├── token-usage.md         # Token 用量
│   ├── auto-director.md       # 自动导演（独特）
│   └── ... (共 15-20 个)
├── scripts/                    # Python 脚本
│   ├── novelctl.py            # 小说状态控制
│   ├── continuity_store.py    # 连续性存储
│   ├── quality_checker.py     # 质量检查
│   ├── book_analysis.py       # 拆书分析
│   ├── writing_extractor.py   # 写法提取
│   ├── token_usage.py         # Token 用量
│   └── export_novel_txt.py    # 导出 TXT
├── templates/                  # 模板文件
│   ├── novel-brief.template.md
│   ├── chapter-contract.template.md
│   └── ...
└── examples/                   # 示例
    ├── example-novel/
    └── ...
```

### 6.3 独特能力：Auto-Director Skill 化

我们可以将 Auto-Director 的核心逻辑蒸馏成 Skill：

```text
自动导演流程（Skill 版）：
1. 从灵感开始 → 渐进确认 → 书级设定
2. 故事宏观规划 → 角色准备 → 卷战略
3. 节奏板 → 章节清单 → 章节细化
4. 章节执行 → 审核 → 修复 → 状态回灌
5. 检查点恢复 → 中断继续
```

这比上游 Skill 的流程更完整，因为上游依赖 Codex 的原生能力，而我们可以将 Auto-Director 的决策逻辑显式化。

## 7. 实施计划

### 7.1 阶段一：核心蒸馏（2-3 周）

| 任务 | 说明 |
|------|------|
| 创建 Skill 骨架 | SKILL.md + references + scripts |
| 蒸馏小说创建流程 | novel-brief、story-bible、world-bible |
| 蒸馏角色准备 | character-preparation、character-asset-layout |
| 蒸馏卷级规划 | story-and-volume-planning |
| 蒸馏章节生产 | chapter-production、context-package |

### 7.2 阶段二：增强能力（2-3 周）

| 任务 | 说明 |
|------|------|
| 蒸馏连续性管理 | continuity-ledgers、structured-continuity-store |
| 蒸馏质量检查 | quality-and-repair、audit |
| 蒸馏拆书分析 | book-analysis、analysis-retrieval |
| 蒸馏写法资产 | writing-techniques、atmosphere-cards |

### 7.3 阶段三：独特能力（2-3 周）

| 任务 | 说明 |
|------|------|
| 蒸馏 Auto-Director | auto-director-recovery、checkpoint |
| 蒸馏 Token 用量 | token-usage、cost-tracking |
| 蒸馏 TXT 导入导出 | import-export |
| 编写测试 | 单元测试、集成测试 |

## 8. 会丢失的能力

### 8.1 架构层面丢失

| 丢失项 | 影响 | 替代方案 |
|--------|------|----------|
| **GUI 界面** | 无法可视化操作 | 通过 Codex 对话交互 |
| **实时协作** | 无法多人同时编辑 | 单人模式 |
| **数据库持久化** | 数据安全性降低 | YAML/Markdown 文件 |
| **用户认证** | 无法多用户 | 单用户模式 |

### 8.2 功能层面丢失

| 丢失项 | 影响 | 替代方案 |
|--------|------|----------|
| **角色弧光可视化** | 无法直观查看角色变化 | Markdown 图表 |
| **节奏曲线可视化** | 无法直观查看节奏 | Markdown 图表 |
| **RAG 知识库** | 无法语义检索 | 关键词搜索 |
| **漫画/短剧工坊** | 无法生成衍生内容 | 手动创作 |
| **Creative Hub** | 无对话式创作中心 | 直接与 Codex 对话 |

## 9. 与上游 Skill 的差异化

### 9.1 我们的独特优势

| 特性 | 我们的 Skill | 上游 Skill |
|------|-------------|-----------|
| **Auto-Director** | ✅ 完整实现 | ⚠️ 部分实现 |
| **质量检查** | ✅ 多层次检查 | ⚠️ 基础检查 |
| **连续性管理** | ✅ 事实+伏笔+资源+动态 | ⚠️ 基础事实 |
| **Token 用量** | ✅ 按步骤+按模型 | ✅ 类似 |
| **写法资产** | ✅ 特征提取+复用 | ❌ 无 |
| **自适应字数** | ✅ 水文检测+自动调整 | ❌ 无 |

### 9.2 目标用户差异

| 用户类型 | 上游 Skill | 我们的 Skill |
|----------|-----------|-------------|
| **Codex 用户** | ✅ 适配 | ✅ 适配 |
| **Claude Code 用户** | ⚠️ 需适配 | ✅ 可适配 |
| **完全新手** | ⚠️ 需学习 | ✅ 更友好 |
| **有经验作者** | ✅ 灵活 | ✅ 更强大 |

## 10. 结论与建议

### 10.1 核心结论

**可以做 Skill 版本，且我们的版本会更完整**。原因：

1. **我们有更多能力**：Auto-Director、质量检查、连续性管理、写法资产等
2. **我们可以保留核心流程**：蒸馏时不丢失关键的写作方法论
3. **我们有独特优势**：Auto-Director 的 Skill 化是上游无法提供的

### 10.2 建议

1. **立即开始**：阶段一（2-3 周）蒸馏核心流程
2. **差异化定位**：强调 Auto-Director 和质量检查能力
3. **保持灵活**：可选蒸馏拆书分析、写法资产等增强能力
4. **测试验证**：用真实小说创作验证 Skill 版本的可用性

### 10.3 预期成果

| 指标 | 上游 Skill | 我们的 Skill |
|------|-----------|-------------|
| **reference 文档数** | 22 个 | 15-20 个 |
| **Python 脚本数** | 9 个 | 7-10 个 |
| **核心流程覆盖** | 80% | 95%+ |
| **独特能力** | 跨书图谱、共享 IP | Auto-Director、质量检查 |

---

**报告完成时间**: 2026-07-29
**报告人**: Claude Code
