<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-08 | Updated: 2026-08-08 -->

# server/src/data

## Purpose
静态规则数据 — YAML 规则文件,供 AI 写作质量规则(antiAiRules 等)加载。不属于代码逻辑,是给 LLM 提示注入的规则素材。

## Key Files
| File | Description |
|------|-------------|
| `antiAiRules/*.yaml` | 反 AI 味写作规则(禁止陈词滥调开头、禁止说教、鼓励生活噪音/现实落差等),按规则名一个文件 |

## For AI Agents

### Working In This Directory
- 新增规则 = 新增 YAML 文件,遵循现有命名风格(动词/行为描述式)
- 规则内容面向 LLM 注入,语言用中文、表述具体可执行
- 加载规则的服务端代码在 `services/` 或 `data/` 相关模块中,改动规则后检查引用方

## Dependencies

### Internal
- 消费方:`server/src/prompting/`(注入)与相关 services

### External
- 无(纯 YAML 数据)
