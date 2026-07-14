<!-- Parent: ../../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# docs/wiki/product

## Purpose
记录"新手优先"的整本完成决策与 UX 原理。这是产品定位的最高优先级档案——帮助完全不懂写作的新手在 AI 引导下完成整本长篇小说。

## Key Files
| File | Description |
|------|-------------|
| `beginner-first-novel-completion.md` | 新手优先的整本完成决策 |
| `settings-readiness.md` | 设置就绪度判断 |
| `world-skeleton-generation.md` | 世界骨架生成 |

## For AI Agents

### Product Decision Principles (继承自根 AGENTS.md)
- 主要用户是**完全不懂写作**的新手,不是熟悉结构设计的资深作者
- 优先解决"如何把整本书写完",再优化"写得多精巧"
- 决策时倾向:低认知负担、强引导、清晰默认、自动推荐、端到端完成

### UI Copy Rules (继承自根 AGENTS.md)
- 用户可见文案必须从用户视角解释功能,不写实现/迁移/重构叙述
- 避免 `现在 / 不再 / 已经 / 之前 / 原本 / 迁回 / 升级为` 这类"我们改了什么"措辞
- 优先直接任务表述:入口引导、操作引导、预期效果、当前选择或结果
- 完成后审一遍新增文案,改掉任何"对开发者说话"的句子

### Trade-off Rule
当专家导向的灵活性 vs 新手完成率冲突时,选新手完成率更高的路径。

## Dependencies

### Internal
- 根 `AGENTS.md` 中"Product Context"和"UI Copy Rules"是最高优先级