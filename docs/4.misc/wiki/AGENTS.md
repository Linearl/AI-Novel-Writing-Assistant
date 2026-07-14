<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# docs/wiki

## Purpose
持久化的项目知识库,记录架构决策、工作流契约、Prompt 治理、RAG 装配规则、调试经验、产品设计原理。这是面向"未来的开发者与 AI agent"的稳定资产,不是变更日志。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `architecture/` | 架构设计、模块边界、依赖方向(章节身份、世界上下文网关、事件边界、模型选择、读路径性能等) |
| `workflows/` | 工作流契约(auto-director 运行时/世界准备、章节生产链、Creative Hub 边界、短剧/漫画工作流、质量债归因、快照保留等) |
| `prompts/` | Prompt Registry、structured output、JSON repair、生成质量守卫 |
| `rag/` | 知识库与上下文装配规则 |
| `debugging/` | 反复出现的失败模式、诊断路径、恢复方法 |
| `product/` | 新手优先的整本完成决策、设置就绪度、世界骨架生成 |

## Key Files
| File | Description |
|------|-------------|
| `README.md` | Wiki 编写规范与定位说明 |
| `entry-template.md` | Wiki 条目模板 |

## For AI Agents

### Writing Conventions
- 默认中文;语义段落用 `Background / Decision / Current Rule / Examples / Failure Modes / Related Modules / Source Documents` 七段式
- 解释"为什么这样决定",不只是"做了什么"
- 列出失败模式与诊断路径,便于下次快速恢复
- 影响 auto-director / 章节生产 / Prompt / RAG / 任务状态 / 前端投影 时,明确指出受影响范围
- 避免"以后优化""妥善处理""改进此处"等空话

### Priority Areas (从根 AGENTS.md 继承)
1. Auto-director 运行时 / 恢复 / checkpoint / resume
2. 章节生产链(draft、review、repair、save、retry)
3. 后端 / 任务中心 / 前端投影之间的运行时状态契约
4. Prompt Registry 规则、structured output schema、JSON repair 边界
5. Creative Hub 边界(能创建什么、何时交给 auto-director、何时避免成为通用聊天)
6. RAG 与上下文装配规则(世界/角色/章节/写法/连续性)
7. 新手优先的产品决策(降低认知负担,帮助完成整本)

## Dependencies

### Internal
- 根 `AGENTS.md` 的"Project Development Wiki Rules"为权威规范
- 与 `docs/releases/release-notes.md` 严格区分:Wiki 写长期知识,Release Notes 写用户可见变化