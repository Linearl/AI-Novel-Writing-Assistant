---
description: "REQ-7016 内联 Prompt 提取与模板引擎"
---

# REQ-7016 内联 Prompt 提取与模板引擎

> 状态：⏳ 进行中

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7016 |
| 优先级 | P2 |
| 来源 | 2026-07-09 内联 Prompt 诊断报告 |
| 关联需求 | 无 |

---

## 1. 背景与问题

项目 CLAUDE.md 明确规定"新增产品级 prompt 只能进入 `server/src/prompting/`"，但诊断发现 3 处 service 层代码直接内联了大段 systemPrompt，违反 Prompt Governance 规则。同时项目缺少通用的 prompt 模板引擎，导致含变量的 prompt（~11 处）无法逐步迁移。

不改的后果：prompt 散落在各 service 文件中，无法统一版本管理、A/B 测试或跨环境切换。

---

## 2. 目标与范围

### 2.1 目标

1. 开发通用 Prompt 模板引擎，支持 YAML 文件加载 + `{variable}` 变量渲染
2. 将 3 处符合条件的内联 prompt 提取为 YAML 文件
3. 改造原调用方使用模板引擎

### 2.2 In Scope

**后端**：
- `server/src/data/prompts/` — 新建 YAML prompt 文件目录
- `server/src/data/prompts/loader.ts` — YAML 加载器（读取 + 解析 + 缓存）
- `server/src/data/prompts/renderer.ts` — 变量渲染器（`{var}` 替换）
- `server/src/data/prompts/index.ts` — 统一导出 facade

**原文件改造**：
- `server/src/services/novel/novelCoreCharacterService.ts` — 提取角色信息提取 prompt
- `server/src/llm/structuredInvokeRepair.ts` — 提取 JSON 修复器 prompt
- `server/src/services/novel/characterPrep/characterPreparationSupplemental.ts` — 提取角色微调 prompt

### 2.3 Out of Scope

- 不改造含变量的 prompt（intentPromptSupport、novelOutlineGraph 等，留待后续）
- 不修改 `server/src/prompting/` 已有的 PromptAsset 系统
- 不新增 npm 依赖（使用已有依赖解析 YAML）

---

## 3. 需求详情

### 3.1 Prompt 模板引擎

WHEN 需要加载一个外部化 prompt，THE SYSTEM SHALL 从 `server/src/prompts/` 目录读取 YAML 文件，解析 system/user 字段，并支持 `{variable}` 变量替换。

YAML 格式：
```yaml
id: "novel.characterExtraction"
version: "1"
system: |
  你是角色信息提取器...
  （纯静态 prompt 内容）
variables: []  # 纯静态则为空数组
```

对于含变量的 prompt（未来扩展）：
```yaml
id: "graph.outline.themeAnalysis"
version: "1"
system: |
  你是小说主题分析专家。
user: |
  标题：{novelTitle}
  类型：{genre}
variables:
  - novelTitle
  - genre
```

### 3.2 提取标准

- 纯静态（无 `${}` 模板变量）
- 中文字符 > 100 个 OR 行数 > 10 行

### 3.3 待提取 prompt 清单

| # | 文件 | prompt 变量 | 行数 | 中文字符 |
|---|------|------------|------|---------|
| 1 | `novelCoreCharacterService.ts` | systemPrompt | 27 | ~500 |
| 2 | `structuredInvokeRepair.ts` | repairSystem | 13 | ~400 |
| 3 | `characterPreparationSupplemental.ts` | systemPrompt（角色微调） | 9 | ~120 |

---

## 4. 验收标准

- [ ] `server/src/data/prompts/` 目录下有 3 个 YAML 文件
- [ ] `server/src/data/prompts/loader.ts` 可加载 YAML 并返回 system/user 字符串
- [ ] `server/src/data/prompts/renderer.ts` 可执行 `{variable}` 替换
- [ ] 3 处原文件的内联 prompt 已替换为模板引擎调用
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] 提取前后 prompt 内容完全一致（diff 验证）

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| YAML 解析引入新依赖 | 使用 `js-yaml`（项目可能已有）或 Node.js 内置 JSON.parse + 自定义格式 |
| 提取后 prompt 内容变化 | 提取前后做逐字 diff 验证 |
| 缓存导致 prompt 更新不生效 | 开发环境禁用缓存，生产环境用文件 mtime 判断 |

---

## 6. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-09 | 创建 | 基于诊断报告生成需求文档 |
