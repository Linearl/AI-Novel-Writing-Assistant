<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# docs

## Purpose
项目设计、架构、Wiki、Release Notes、Checkpoints、Plans 的中心化文档目录。遵循根 AGENTS.md 中"Project Development Wiki Rules"的写作规范——记录稳定的架构决策、运行时契约、模块边界、AI 调用约定和失败模式,而不是变更日志。

## Key Files
| File | Description |
|------|-------------|
| `README.md` | docs 目录使用说明 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `architecture/` | 长期架构决策文档(测试策略等)(see `architecture/AGENTS.md`) |
| `wiki/` | 持久化的项目知识库,按主题分类(架构/工作流/Prompt/RAG/调试/产品)(see `wiki/AGENTS.md`) |
| `releases/` | 用户可见的 release notes 历史(完整保留,不裁剪)(see `releases/AGENTS.md`) |
| `checkpoints/` | 阶段性的 checkpoint 快照(开发节点) |
| `design/` | 设计稿与产品视觉决策 |
| `plans/` | 计划/方案类文档 |
| `superpowers/` | Superpowers 流程的计划与记录 |
| `superpowers/plans/` | Superpowers 计划子目录 |

## For AI Agents

### Working In This Directory
- **Wiki 是长期资产**:`docs/wiki/**` 只记录稳定知识,不要写"今天改了什么"
- **Release notes 是完整历史**:`docs/releases/release-notes.md` 保留所有历史条目,不要删旧加新
- **README 最新更新**:`README.md` 的 `## 最新更新` 只展示最新的合并日期块,带链接到完整 release notes
- **使用中文**:Wiki 默认中文,除非上下文明确是英文
- **优先用稳定结构**:建议使用 `Background / Decision / Current Rule / Examples / Failure Modes / Related Modules / Source Documents` 七段式

### What Should NOT Be Added To Wiki
- 微小无长期价值的变化、提交级文件清单、临时 TODO、纯 release note 内容
- 即将被丢弃的实现细节、只讲"本次改了什么"的叙述

### Wiki Update Trigger
完成以下任一动作前必须自检 Wiki 是否需要更新:开发阶段、重大 bug 修复、架构调整、核心工作流变更、Prompt/Runtime/Task Recovery/章节生产链变更、commit/push/PR。

## Dependencies

### Internal
- 引用根 `AGENTS.md` 的"Project Development Wiki Rules"作为权威规范
- 与 `README.md` 互为镜像:README 仅展示最新合并块,完整历史在 `docs/releases/release-notes.md`