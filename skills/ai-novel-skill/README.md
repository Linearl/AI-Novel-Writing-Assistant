# AI Novel Skill

> 面向 Claude Code 的长篇中文小说生产系统 Skill

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)

## 简介

**AI Novel Skill** 是从 [AI-Novel-Writing-Assistant](https://github.com/ExplosiveCoderflome/AI-Novel-Writing-Assistant) 项目蒸馏而来的 Claude Code Skill 版本。它保留了核心的写作方法论和流程，去掉了 Web 应用运行时依赖，可以在 Claude Code 环境下直接使用。

### 与上游 Skill 的区别

| 维度 | 上游 Skill (Ani Book Skill) | 本 Skill (AI Novel Skill) |
|------|---------------------------|---------------------------|
| 基础平台 | Codex | Claude Code |
| Auto-Director | ⚠️ 部分（依赖 Codex） | ✅ 完整蒸馏 |
| 质量检查 | ⚠️ 基础 | ✅ 多层次 |
| 连续性管理 | ⚠️ 基础事实 | ✅ 事实+伏笔+资源+动态 |
| 写法资产 | ❌ 无 | ✅ 特征提取+复用 |
| 跨书图谱 | ✅ 有 | ✅ 完整蒸馏 |
| Python 脚本 | ✅ 9 个 | ✅ 10 个 |

## 快速开始

### 环境准备

```bash
# 安装依赖
pip install -r requirements.txt

# 验证安装
python scripts/novelctl.py --help
```

### 从灵感开始

```text
使用 produce-long-form-novel 帮我从一个灵感开始规划长篇小说。
```

系统会先帮你确定读者频道、连载形态和主要阅读回报，而不是立刻抛出一份不可控的万字大纲。

### 继续已有小说

```text
使用 produce-long-form-novel 继续 novels/都市异能/，先判断上一章稳定后下一步该做什么。
```

它会读取必要的恢复记录、上章承接、参与角色和活跃伏笔，只装配当前章真正需要的上下文。

### 分析参考作品

```text
使用 produce-long-form-novel 分析近期男频玄幻榜单的题材构成，并生成机会卡。
```

## 核心能力

### 1. 从灵感到章节

- 渐进确认：先锁定读者期待，再扩写世界
- 故事发动机：主角欲望、世界规则、角色关系、卷级承诺
- 章节计划：章节合同、最小上下文、完整正文
- 人性化修订：减少模板感，增加角色区分度

### 2. 长篇连续性

- YAML 权威事实：事实、伏笔、资源、角色动态
- SQLite 可重建索引：只负责检索和上下文候选
- Markdown 可读台账：人类可读的连续性视图

### 3. Auto-Director（独特能力）

- 自动导演流程：从灵感到成书的完整链路
- 检查点恢复：中断后可从上次位置继续
- 质量门控：局部问题不阻断全局链
- 中断处理：遇到阻塞暂停等待用户决策

### 4. 质量检查

- 多层次审核：结构、文风、一致性
- 修复建议：针对性修复方案
- 质量债务：记录非阻塞问题

### 5. 写法资产（独特能力）

- 写法特征提取：从参考作品提取写法
- 写法资产复用：在生成中应用写法
- 氛围写作卡：场景氛围参考

## 文件结构

```text
ai-novel-skill/
├── SKILL.md                    # Skill 主入口
├── AGENTS.md                   # AI 协作规范
├── README.md                   # 本文件
├── GUIDE.md                    # 用户使用指南
├── COMPATIBILITY.md            # 兼容性报告
├── requirements.txt            # Python 依赖
├── references/                 # 能力契约文档（24个）
│   ├── novel-brief.md         # 小说创建流程
│   ├── character-preparation.md
│   ├── story-and-volume-planning.md
│   ├── chapter-production.md
│   ├── continuity-management.md
│   ├── quality-and-repair.md
│   ├── book-analysis.md
│   ├── writing-techniques.md
│   ├── token-usage.md
│   ├── auto-director.md
│   ├── workflow-routing.md
│   ├── artifact-contracts.md
│   ├── cross-book-asset-graph.md  # 跨书资产图谱
│   └── ...
├── scripts/                    # Python 脚本（10个）
│   ├── novelctl.py            # 工作区管理（6个命令）
│   ├── continuity_store.py    # 连续性管理（4个命令）
│   ├── asset_graph.py         # 跨书资产图谱（7个命令）
│   ├── analysis_retrieval.py  # 分析检索（5个命令）
│   ├── token_usage.py         # Token 统计（4个命令）
│   ├── export_novel_txt.py    # TXT 导出
│   ├── check_continuity_workspace.py  # 工作区检查
│   ├── sync_skill_mirror.py   # Skill 镜像同步
│   ├── trend_snapshot.py      # 热点趋势分析
│   └── __init__.py
├── templates/                  # 模板文件（12个）
└── examples/                   # 示例小说（8个）
```

## 使用前提

- Python 3.10+
- Claude Code 环境

## 安装

```bash
# 安装 Python 依赖
pip install -r requirements.txt
```

## 工作流

```text
方向判断 → 故事发动机 → 章节计划 → 完整正文 → 审查回灌
    ↑                                                    ↓
    └─────────────── 连续性状态与下一章 ───────────────┘
```

**关键原则：一次只稳定一章。** 不并行拼接同一章，不让未验收候选进入事实，也不把整本书塞入下一次上下文；定稿后才允许提炼为跨书资产或共享宇宙事件候选。

## 许可证

本项目采用 [AGPL-3.0](LICENSE) 许可证。

## 来源

本项目由 [AI-Novel-Writing-Assistant](https://github.com/ExplosiveCoderflome/AI-Novel-Writing-Assistant) 的维护者，基于其中的长篇生产经验蒸馏而成。

## 相关项目

- [AI-Novel-Writing-Assistant](https://github.com/ExplosiveCoderflome/AI-Novel-Writing-Assistant) - 原始 Web 应用版本
- [Ani Book Skill](https://github.com/ExplosiveCoderflome/ani-book-skill) - 上游 Codex Skill 版本
