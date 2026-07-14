---
description: "REQ-7016 内联 Prompt 提取与模板引擎 — 决策留痕"
---

# REQ-7016 决策留痕

## 决策记录

### D-01：YAML 存放目录选 `server/src/prompts/` 而非 `server/src/prompting/prompts/`

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-09 |
| 决策者 | 用户确认 |
| 决策内容 | YAML 文件存放在 `server/src/prompts/`，与已有 `server/src/prompting/` 目录区分 |
| 决策理由 | `prompting/` 是 Prompt Registry 系统（PromptAsset），本任务的模板引擎是独立轻量方案，两者共存不冲突 |
| 备选方案 | 放入 `prompting/prompts/` — 会与已有 PromptAsset 文件混在一起 |

### D-02：变量语法用 `{varName}` 而非 `${varName}` 或 `{{varName}}`

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-09 |
| 决策者 | AI 建议 |
| 决策内容 | 变量占位符用 `{varName}` |
| 决策理由 | 与 LangChain PromptTemplate 语法一致，未来可无缝对接 |
| 备选方案 | `{{varName}}`（Handlebars 风格）— 与 LangChain 不兼容 |

### D-03：提取标准定为"纯静态 + 中文>100字/行数>10行"

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-09 |
| 决策者 | 用户确认 |
| 决策内容 | 只提取纯静态且体量足够大的 prompt |
| 决策理由 | 含变量的 prompt 需要模板引擎就绪后才能提取；体量太小的 prompt 提取收益不大 |
| 备选方案 | 提取所有 prompt（含变量的）— 模板引擎复杂度高，风险大 |
