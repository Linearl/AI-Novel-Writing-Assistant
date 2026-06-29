# 项目开发 Wiki

本目录用于沉淀长期项目知识，帮助未来开发者和 AI Agent 理解项目为什么这样设计，以及后续应该如何维护。

Wiki 不记录单次提交改了什么，也不替代 release notes。它只记录跨阶段仍然有用的架构规则、工作流边界、运行协议、调试经验和产品设计依据。

## 使用方式

- 先从本页找到相关主题，再进入对应分类页面。
- 如果页面内容来自历史计划、设计文档或检查点，保留来源链接，不搬空原文档。
- 如果一次开发澄清了长期规则，应更新对应 Wiki；如果只是小改动或发布流水账，不写 Wiki。
- 新页面默认使用 [entry-template.md](./entry-template.md) 的结构。

## 目录

### Architecture

- [模块边界与文档治理](./architecture/module-boundaries.md)
- [当前模型选择与厂商默认模型边界](./architecture/model-selection.md)

### Workflows

- [自动导演 Runtime 与恢复边界](./workflows/auto-director-runtime.md)
- [章节生产链路](./workflows/chapter-production-chain.md)
- [拆书工作流](./workflows/book-analysis-workflow.md)
- [Creative Hub 边界](./workflows/creative-hub-boundary.md)

### Prompts

- [Prompt Registry 与结构化输出](./prompts/prompt-registry-and-structured-output.md)

### RAG

- [知识库与上下文组装](./rag/knowledge-and-context-assembly.md)

### Debugging

- [重复故障模式与排查路径](./debugging/recurring-failure-modes.md)

### Product

- [新手优先与整本小说完成原则](./product/beginner-first-novel-completion.md)

## Wiki 编写规范

本项目必须持续维护开发 Wiki，涵盖架构决策、工作流规则、模块边界、运行时契约、调试经验和产品设计原理。

Wiki 不是”改了什么”的记录。它应该帮助未来的开发者和 AI 代理理解系统为何这样设计以及应如何维护。

### 应记录什么

记录稳定知识，例如：

- 核心模块的设计边界，如 auto-director、章节生产、Creative Hub、任务中心、RAG 和 Prompt Registry。
- 重要架构决策及其原因。
- 运行时状态契约、阶段转换规则、恢复规则、重试规则和失败处理规则。
- AI 调用约定，如 Prompt Schema、结构化输出、JSON 修复和上下文组装。
- 模块归属、依赖方向和禁止跨层调用的边界。
- 反复出现的失败模式、调试结论和推荐诊断路径。
- 帮助新手完成完整小说的产品原则和 UX 决策。

### 不应记录什么

不添加以下 Wiki 条目：

- 没有长期价值的小改动。
- 按提交的文件修改列表。
- 临时 TODO。
- 纯 release note 内容。
- 可能很快被丢弃的实现细节。
- 仅叙述当前任务改了什么的内容。

### 编写风格

- 默认使用中文，除非周围文档明显是纯英文。
- 为未来的开发者和未来的 AI 代理编写。
- 解释决策背后的原因，而非仅记录决策本身。
- 优先使用以下章节结构：`背景 / 决策 / 当前规则 / 示例 / 失败模式 / 相关模块 / 来源文档`。
- 保持条目稳定、清晰、可操作。
- 避免模糊措辞，如”后续优化”、”妥善处理”或”改进此处”。
- 如果规则影响 auto-director、章节生产、Prompt、RAG、任务状态或前端投影，需明确说明影响范围。

### 推荐存放位置

- `docs/wiki/architecture/`：架构设计、模块边界、依赖方向。
- `docs/wiki/workflows/`：auto-director、章节生产、恢复链、任务中心等工作流。
- `docs/wiki/prompts/`：Prompt Registry、结构化输出、JSON 修复、schema 约定。
- `docs/wiki/rag/`：embedding、向量检索、上下文组装、知识库规则。
- `docs/wiki/debugging/`：反复出现的失败、诊断路径、恢复方法。
- `docs/wiki/product/`：新手优先决策、完整小说完成、UX 原理。

### 何时更新 Wiki

完成以下任何一项前，检查工作是否产出了稳定的、值得 Wiki 记录的知识：

- 一个开发阶段。
- 一个重要的 bug 修复。
- 一次架构调整。
- 一个核心工作流变更。
- Prompt Schema、运行时状态、任务恢复或章节生产链的变更。
- 一次提交、推送或 PR。

如果引入或澄清了稳定知识，在阶段完成前更新相关 Wiki 页面。

如果不需要 Wiki 更新，明确说明该变更没有长期 Wiki 价值，应仅保留在代码或 release notes 中。

### Wiki 与 Release Notes 边界

- Wiki 记录持久的项目知识。
- Release Notes 记录用户可见的产品变更。
- README 最新更新仅显示最新的面向用户的摘要。
- 不要把 Wiki 写成变更日志。
- 不要把 release notes 复制到 Wiki。
- 如果变更同时影响用户行为和长期架构，同时更新 release notes 和相关 Wiki 页面。

### 小说生产 Wiki 优先级

以下领域的 Wiki 积累优先级最高：

1. Auto-director 运行时、恢复、检查点和恢复行为。
2. 章节生产链，包括草稿生成、审核、修复、保存和重试规则。
3. 后端、任务中心和前端投影之间的运行时状态契约。
4. Prompt Registry 规则、结构化输出 schema 和 JSON 修复边界。
5. Creative Hub 边界：它能创建什么、何时应交给 auto-director、何时应避免变成通用聊天。
6. 世界观、角色、章节、风格和连贯性的 RAG 和上下文组装规则。
7. 减少认知负荷并帮助用户完成完整小说的新手优先产品决策。

## 写作边界

Wiki 应写：

- 长期架构决策和原因。
- 自动导演、章节生产、Creative Hub、Prompt、RAG、任务状态等核心链路的边界。
- 可重复使用的调试结论和排查路径。
- 新手优先、整本完成、低认知负担等产品原则如何影响实现。

Wiki 不应写：

- 单次提交的文件修改清单。
- 临时 TODO。
- 发布说明复制。
- 很快会废弃的实现细节。
- 只描述”本次改了什么”的流水账。

## 与其他 docs 目录的关系

- `docs/wiki/`：稳定知识和原因。
- `docs/plans/`：仍有执行价值的方案和任务拆解。
- `docs/checkpoints/`：阶段性进度、迁移里程碑和审计记录。
- `docs/design/`：系统设计、领域模型和产品机制。
- `docs/releases/`：用户可见更新历史。
- `README.md`：对外入口和最新公开摘要。
