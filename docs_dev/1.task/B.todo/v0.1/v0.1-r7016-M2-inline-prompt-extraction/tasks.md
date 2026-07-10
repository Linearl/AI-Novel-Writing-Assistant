---
description: "REQ-7016 内联 Prompt 提取与模板引擎 — 任务拆解"
---

# REQ-7016 任务拆解

> 状态：⏳ 进行中

## 任务概述

### 1. 来源

2026-07-09 内联 Prompt 诊断报告。3 处 service 层代码直接内联大段 systemPrompt，违反 Prompt Governance 规则。

### 2. 问题

prompt 散落在各 service 文件中，无法统一版本管理、A/B 测试或跨环境切换。同时缺少通用模板引擎，导致含变量的 prompt 无法逐步迁移。

### 3. 需求

开发 Prompt 模板引擎 + 提取 3 处内联 prompt + 改造调用方。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 开发 Prompt 模板引擎 | P0 | 2h | ⬜ 待开始 |
| T2 | 提取 3 处内联 prompt 为 YAML | P0 | 1h | ⬜ 待开始 |
| T3 | 改造原调用方接入模板引擎 | P1 | 1h | ⬜ 待开始 |
| T4 | 全量验证 | P0 | 30min | ⬜ 待开始 |

---

## 逐项展开

### T1: 开发 Prompt 模板引擎

**目标**: 创建 `server/src/data/prompts/` 目录，实现 YAML 加载器 + 变量渲染器。

**改动点**:
- `server/src/data/prompts/loader.ts` — 从 `server/src/prompts/` 读取 YAML 文件，解析为 `{system, user, variables}` 结构
- `server/src/data/prompts/renderer.ts` — 接收模板字符串 + 变量 map，执行 `{varName}` 替换
- `server/src/data/prompts/index.ts` — facade，导出 `loadPrompt(id)` + `renderPrompt(template, vars)`
- `server/src/prompts/` — 存放 YAML prompt 文件的目录

**YAML 格式**:
```yaml
id: "novel.characterExtraction"
version: "1"
system: |
  你是角色信息提取器...
variables: []
```

**技术要点**:
- 检查项目是否已有 `js-yaml` 依赖，没有则用 Node.js 内置方案
- loader 应支持按 id 查找（id 映射到文件路径）
- renderer 仅做简单 `{var}` 替换，不引入模板引擎依赖
- 开发环境每次重新加载，生产环境可用 mtime 缓存

---

### T2: 提取 3 处内联 prompt 为 YAML

**目标**: 将 3 处符合条件的 prompt 文本从 TS 文件提取为 YAML 文件。

**改动点**:
- `server/src/prompts/novel-character-extraction.yaml` — 来自 `novelCoreCharacterService.ts:385-412`
- `server/src/prompts/json-repair.yaml` — 来自 `structuredInvokeRepair.ts:162-175`
- `server/src/prompts/character-refine.yaml` — 来自 `characterPreparationSupplemental.ts:632-641`

**验证**: 提取前后 prompt 内容逐字 diff 一致。

---

### T3: 改造原调用方接入模板引擎

**目标**: 3 个原文件改为从模板引擎加载 prompt。

**改动点**:
- `server/src/services/novel/novelCoreCharacterService.ts` — `loadPrompt("novel-character-extraction").system`
- `server/src/llm/structuredInvokeRepair.ts` — `loadPrompt("json-repair").system`
- `server/src/services/novel/characterPrep/characterPreparationSupplemental.ts` — `loadPrompt("character-refine").system`

---

### T4: 全量验证

**目标**: typecheck + 相关测试通过。

**改动点**:
- `pnpm typecheck`
- `pnpm test`
- 验证 3 处调用方加载的 prompt 内容与原始内联一致

---

## DoD

- Prompt 模板引擎可正常加载 YAML 并渲染变量
- 3 处内联 prompt 已提取为 YAML 文件
- 原调用方改为使用模板引擎
- typecheck + test 通过
- 提取前后 prompt 内容完全一致

---

## 验证步骤

1. `pnpm typecheck` — 零错误
2. `pnpm test` — 全量通过
3. 手动对比 3 个 YAML 文件内容与原代码中的 prompt 文本，逐字一致

---

## 完成判定

- T1~T4 全部完成且 DoD 全部满足后，REQ-7016 达到"已完成"状态。
