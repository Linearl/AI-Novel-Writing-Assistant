---
description: "REQ-7016 内联 Prompt 提取与模板引擎 — 方案设计"
---

# REQ-7016 方案设计

## 1. 方案概述

在 `server/src/data/prompts/` 下实现轻量级 prompt 模板引擎，支持从 YAML 文件加载 prompt + `{variable}` 变量替换。YAML 文件存放在 `server/src/prompts/` 目录。改造 3 处原调用方接入引擎。

### 1.1 设计目标

1. 不引入新 npm 依赖（或复用已有依赖）
2. 与已有 `server/src/prompting/` PromptAsset 系统共存，不冲突
3. 支持未来扩展到含变量的 prompt

### 1.2 关键决策

1. **YAML 解析用 `js-yaml`**：检查项目依赖，如已有则直接用；如无则用 JSON 格式替代
2. **YAML 存放目录 `server/src/prompts/`**：与 `server/src/prompting/`（Prompt Registry）区分
3. **变量语法 `{varName}`**：与 LangChain PromptTemplate 语法一致，未来可无缝对接
4. **loader 按 id 查找**：id 格式 `category.name`，映射到 `category-name.yaml`

### 1.3 不在范围

- 不改造 `server/src/prompting/` 已有系统
- 不提取含变量的 prompt

## 2. 实现细节

### 2.1 文件结构

```
server/src/
├── data/
│   └── prompts/
│       ├── index.ts       # facade: loadPrompt(), renderPrompt()
│       ├── loader.ts      # YAML 文件读取 + 解析
│       ├── renderer.ts    # {variable} 替换引擎
│       └── types.ts       # PromptDefinition 接口
├── prompts/               # YAML prompt 文件目录
│   ├── novel-character-extraction.yaml
│   ├── json-repair.yaml
│   └── character-refine.yaml
```

### 2.2 loader.ts

```typescript
interface PromptDefinition {
  id: string;
  version: string;
  system: string;
  user?: string;
  variables: string[];
}

function loadPrompt(id: string): PromptDefinition {
  // 从 server/src/prompts/{id}.yaml 读取
  // 解析 YAML 返回 PromptDefinition
  // 开发环境不缓存，生产环境按 mtime 缓存
}
```

### 2.3 renderer.ts

```typescript
function renderPrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}
```

### 2.4 调用方改造示例

```typescript
// 改造前
const systemPrompt = [
  "你是角色信息提取器...",
  // 27 行
].join("\n");

// 改造后
import { loadPrompt } from "@/data/prompts";
const { system: systemPrompt } = loadPrompt("novel-character-extraction");
```

## 3. 接口定义

无新增 API 接口。

## 4. 数据模型

无数据库变更。

## 5. 异常处理

| 错误码 | 场景 | 处理方式 |
| ---- | ---- | -------- |
| ENOENT | YAML 文件不存在 | 抛出明确错误，包含文件路径 |
| YAML_PARSE | YAML 解析失败 | 抛出明确错误，包含原始内容 |

## 6. 验证策略

1. 单元测试：loader 加载 + renderer 渲染
2. 集成测试：3 处调用方加载 prompt 内容与原始内联一致
3. typecheck + 全量测试
